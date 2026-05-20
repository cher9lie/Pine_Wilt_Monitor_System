import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config/env'
import { redisClient as redis, RedisKeys } from '../shared/redis/client'
import type { JwtPayload } from '../modules/auth/auth.types'

/**
 * JWT 认证中间件
 * 验证 Authorization: Bearer <token>，将解析结果注入 req.user
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录' })
    return
  }

  const token = authHeader.slice(7)

  try {
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload

    // 检查 Token 是否在黑名单中（已登出）
    const blacklisted = await redis.get(RedisKeys.jwtBlacklist(payload.jti))
    if (blacklisted) {
      res.status(401).json({ code: 'TOKEN_REVOKED', message: 'Token 已失效，请重新登录' })
      return
    }

    req.user = payload
    next()
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token 已过期，请刷新' })
    } else {
      res.status(401).json({ code: 'TOKEN_INVALID', message: 'Token 无效' })
    }
  }
}

/**
 * 角色权限检查中间件工厂
 * 用法：requireRole('admin', 'forest_manager')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ code: 'AUTH_REQUIRED', message: '请先登录' })
      return
    }
    const hasRole = req.user.roles.some((r) => roles.includes(r))
    if (!hasRole) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: `需要以下角色之一：${roles.join(', ')}`,
      })
      return
    }
    next()
  }
}

/**
 * 空间权限过滤中间件
 * 若用户有 spatial_boundary，注入 ST_Contains 过滤条件到 req.spatialFilter
 * 业务查询中使用：WHERE ${req.spatialFilter ?? 'TRUE'}
 */
export async function spatialPermission(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next()
    return
  }

  // 从数据库获取用户的空间边界（JWT 中不存储，避免 Token 过大）
  try {
    const { pool } = await import('../shared/db/pool')
    const result = await pool.query(
      'SELECT ST_AsText(spatial_boundary) AS boundary FROM users WHERE id = $1',
      [req.user.userId]
    )
    const boundary = result.rows[0]?.boundary
    if (boundary) {
      // 注入参数化空间过滤（防 SQL 注入）
      req.spatialFilter = `ST_Contains(ST_GeomFromText('${boundary}', 4490), geom)`
    }
  } catch {
    // 空间权限获取失败时不阻断请求，记录日志
  }
  next()
}
