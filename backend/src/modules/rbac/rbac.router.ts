import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query, queryOne } from '../../shared/db/pool'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { hashPassword } from '../auth/auth.service'
import { logger } from '../../shared/logger'

export const rbacRouter = Router()

// 所有路由需要认证 + admin/user_admin 角色
rbacRouter.use(authenticate)

// ============================================================
// 用户管理 CRUD
// ============================================================

/**
 * GET /api/system/users - 用户列表（分页）
 */
rbacRouter.get('/users', requireRole('admin', 'user_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '20', 10), 100)
    const search = req.query.search as string | undefined
    const status = req.query.status as string | undefined
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let idx = 1

    if (search) {
      where += ` AND (u.username ILIKE $${idx} OR u.real_name ILIKE $${idx} OR u.department ILIKE $${idx})`
      params.push(`%${search}%`)
      idx++
    }
    if (status) {
      where += ` AND u.status = $${idx}`
      params.push(status)
      idx++
    }

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT u.id, u.username, u.real_name, u.email, u.phone, u.department,
                u.status, u.data_level, u.last_login_at, u.created_at,
                COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
         FROM users u
         LEFT JOIN user_roles ur ON u.id = ur.user_id
         LEFT JOIN roles r ON ur.role_id = r.id
         ${where}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM users u ${where}`,
        params
      ),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)
    res.json({
      code: 'SUCCESS',
      data: {
        items: rows,
        pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
      },
    })
  } catch (err) { next(err) }
})

/**
 * POST /api/system/users - 创建用户
 */
const createUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  real_name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  data_level: z.number().min(1).max(3).default(1),
  role_names: z.array(z.string()).min(1),
})

rbacRouter.post('/users', requireRole('admin', 'user_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createUserSchema.parse(req.body)

    // 检查用户名是否存在
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [body.username])
    if (existing) {
      return res.status(409).json({ code: 'USER_EXISTS', message: '用户名已存在' })
    }

    const passwordHash = await hashPassword(body.password)

    // 创建用户
    const newUser = await queryOne<{ id: string }>(
      `INSERT INTO users (username, password_hash, real_name, email, phone, department, data_level, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
       RETURNING id`,
      [body.username, passwordHash, body.real_name, body.email, body.phone, body.department, body.data_level]
    )

    // 分配角色
    for (const roleName of body.role_names) {
      await query(
        `INSERT INTO user_roles (user_id, role_id, granted_by)
         SELECT $1, r.id, $2 FROM roles r WHERE r.name = $3`,
        [newUser!.id, req.user!.userId, roleName]
      )
    }

    logger.info('User created by admin', { createdUser: body.username, by: req.user!.username })
    res.status(201).json({ code: 'SUCCESS', message: '用户创建成功', data: { id: newUser!.id } })
  } catch (err) { next(err) }
})

/**
 * PATCH /api/system/users/:id/status - 修改用户状态（冻结/激活/归档）
 */
rbacRouter.patch('/users/:id/status', requireRole('admin', 'user_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { status } = req.body
    if (!['active', 'frozen', 'archived'].includes(status)) {
      return res.status(400).json({ code: 'INVALID_STATUS', message: '无效的状态值' })
    }

    await query('UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2', [status, id])
    logger.info('User status changed', { userId: id, newStatus: status, by: req.user!.username })
    res.json({ code: 'SUCCESS', message: `用户状态已更新为 ${status}` })
  } catch (err) { next(err) }
})

/**
 * PUT /api/system/users/:id/roles - 更新用户角色
 */
rbacRouter.put('/users/:id/roles', requireRole('admin', 'user_admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { role_names } = req.body as { role_names: string[] }

    if (!role_names || !Array.isArray(role_names) || role_names.length === 0) {
      return res.status(400).json({ code: 'INVALID_ROLES', message: '至少需要一个角色' })
    }

    // 删除旧角色
    await query('DELETE FROM user_roles WHERE user_id = $1', [id])

    // 插入新角色
    for (const roleName of role_names) {
      await query(
        `INSERT INTO user_roles (user_id, role_id, granted_by)
         SELECT $1, r.id, $2 FROM roles r WHERE r.name = $3`,
        [id, req.user!.userId, roleName]
      )
    }

    logger.info('User roles updated', { userId: id, roles: role_names, by: req.user!.username })
    res.json({ code: 'SUCCESS', message: '角色已更新' })
  } catch (err) { next(err) }
})

// ============================================================
// 角色管理
// ============================================================

/**
 * GET /api/system/roles - 角色列表
 */
rbacRouter.get('/roles', requireRole('admin', 'user_admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query(
      `SELECT r.id, r.name, r.description, r.is_temp, r.created_at,
              COUNT(ur.user_id) AS user_count
       FROM roles r
       LEFT JOIN user_roles ur ON r.id = ur.role_id
       GROUP BY r.id
       ORDER BY r.created_at`
    )
    res.json({ code: 'SUCCESS', data: rows })
  } catch (err) { next(err) }
})

// ============================================================
// 审计日志
// ============================================================

/**
 * GET /api/system/logs - 审计日志（分页）
 */
rbacRouter.get('/logs', requireRole('admin', 'user_admin', 'auditor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '50', 10), 200)
    const offset = (page - 1) * pageSize
    const userId = req.query.user_id as string | undefined
    const action = req.query.action as string | undefined

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let idx = 1

    if (userId) { where += ` AND al.user_id = $${idx}`; params.push(userId); idx++ }
    if (action) { where += ` AND al.action ILIKE $${idx}`; params.push(`%${action}%`); idx++ }

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT al.id, al.action, al.resource, al.ip_address, al.created_at,
                u.username, u.real_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM audit_logs al ${where}`,
        params
      ),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)
    res.json({
      code: 'SUCCESS',
      data: {
        items: rows,
        pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
      },
    })
  } catch (err) { next(err) }
})
