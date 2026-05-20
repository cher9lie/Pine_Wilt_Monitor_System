import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { login, refreshTokens, logout, hashPassword } from './auth.service'
import { authenticate } from '../../middleware/authenticate'
import { query, queryOne } from '../../shared/db/pool'
import { logger } from '../../shared/logger'

export const authRouter = Router()

// 登录请求校验
const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(6).max(100),
})

// 注册请求校验
const registerSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6).max(100),
  real_name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
})

/**
 * POST /auth/register
 * 
 * 用户注册接口
 * - 如果数据库中没有任何用户，第一个注册的自动成为 admin
 * - 后续注册的用户默认角色为 viewer
 */
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = registerSchema.parse(req.body)

    // 检查用户名是否已存在
    const existing = await queryOne(
      'SELECT id FROM users WHERE username = $1',
      [body.username]
    )
    if (existing) {
      return res.status(409).json({ code: 'USER_EXISTS', message: '用户名已存在' })
    }

    // 哈希密码
    const passwordHash = await hashPassword(body.password)

    // 检查是否为第一个用户（自动成为 admin）
    const userCount = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users')
    const isFirstUser = parseInt(userCount?.count ?? '0', 10) === 0

    // 创建用户
    const newUser = await queryOne<{ id: string; username: string }>(
      `INSERT INTO users (username, password_hash, real_name, email, phone, status, data_level)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)
       RETURNING id, username`,
      [
        body.username,
        passwordHash,
        body.real_name ?? null,
        body.email ?? null,
        body.phone ?? null,
        isFirstUser ? 3 : 1,  // 第一个用户拥有最高数据权限
      ]
    )

    if (!newUser) {
      throw new Error('用户创建失败')
    }

    // 分配角色
    const roleName = isFirstUser ? 'admin' : 'viewer'
    await query(
      `INSERT INTO user_roles (user_id, role_id)
       SELECT $1, id FROM roles WHERE name = $2`,
      [newUser.id, roleName]
    )

    logger.info('User registered', {
      userId: newUser.id,
      username: newUser.username,
      role: roleName,
      isFirstUser,
    })

    res.status(201).json({
      code: 'SUCCESS',
      message: isFirstUser
        ? '注册成功！您是第一个用户，已自动分配管理员权限'
        : '注册成功！已分配默认查看者权限，请联系管理员提升权限',
      data: {
        id: newUser.id,
        username: newUser.username,
        role: roleName,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/login
 */
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = loginSchema.parse(req.body)
    const { user, tokens } = await login(username, password)
    res.json({
      code: 'SUCCESS',
      data: { user, tokens },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/refresh
 */
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'refreshToken 不能为空' })
    }
    const tokens = await refreshTokens(refreshToken)
    res.json({ code: 'SUCCESS', data: { tokens } })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/logout（需要认证）
 */
authRouter.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, jti, exp } = req.user!
    await logout(userId, jti, exp ?? 0)
    res.json({ code: 'SUCCESS', message: '已退出登录' })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /auth/me（获取当前用户信息 + 角色 + 可访问菜单）
 */
authRouter.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await queryOne(
      `SELECT u.id, u.username, u.email, u.phone, u.real_name, u.department,
              u.status, u.data_level, u.last_login_at,
              ST_AsGeoJSON(u.spatial_boundary) AS spatial_boundary,
              COALESCE(json_agg(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.user!.userId]
    )
    if (!user) {
      return res.status(404).json({ code: 'NOT_FOUND', message: '用户不存在' })
    }

    // 获取该用户角色对应的菜单权限
    const roles = (user as Record<string, unknown>).roles as string[]
    let allowedMenus: string[] = []

    if (roles.includes('admin')) {
      // admin 拥有所有菜单
      allowedMenus = ['*']
    } else {
      const menuRows = await query(
        `SELECT DISTINCT p.resource_key
         FROM permissions p
         JOIN roles r ON p.role_id = r.id
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1
           AND p.resource_type = 'menu'
           AND p.action = 'read'`,
        [req.user!.userId]
      )
      allowedMenus = menuRows.map((row: Record<string, unknown>) => row.resource_key as string)
    }

    res.json({
      code: 'SUCCESS',
      data: {
        ...(user as Record<string, unknown>),
        allowedMenus,
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * POST /auth/change-password（修改密码）
 */
authRouter.post('/change-password', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { current_password, new_password } = req.body
    if (!current_password || !new_password || new_password.length < 6) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: '新密码至少6位' })
    }

    const { default: bcrypt } = await import('bcrypt')

    // 验证旧密码
    const user = await queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user!.userId]
    )
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: '用户不存在' })

    const valid = await bcrypt.compare(current_password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ code: 'WRONG_PASSWORD', message: '当前密码不正确' })
    }

    // 更新密码
    const newHash = await hashPassword(new_password)
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user!.userId])

    logger.info('Password changed', { userId: req.user!.userId })
    res.json({ code: 'SUCCESS', message: '密码修改成功' })
  } catch (err) { next(err) }
})

/**
 * PATCH /auth/profile（更新个人信息）
 */
authRouter.patch('/profile', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { real_name, email, phone } = req.body
    await query(
      'UPDATE users SET real_name = COALESCE($1, real_name), email = COALESCE($2, email), phone = COALESCE($3, phone), updated_at = NOW() WHERE id = $4',
      [real_name, email, phone, req.user!.userId]
    )
    res.json({ code: 'SUCCESS', message: '个人信息已更新' })
  } catch (err) { next(err) }
})
