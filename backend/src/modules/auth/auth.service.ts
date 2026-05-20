import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../../config/env'
import { queryOne } from '../../shared/db/pool'
import { redisClient as redis, RedisKeys } from '../../shared/redis/client'
import { logger } from '../../shared/logger'
import type { User, TokenPair, JwtPayload } from './auth.types'

const BCRYPT_ROUNDS = 12

/**
 * 用户登录：验证凭证，签发 JWT
 */
export async function login(
  username: string,
  password: string
): Promise<{ user: Omit<User, 'password_hash'>; tokens: TokenPair }> {
  // 查询用户（含角色）
  const user = await queryOne<User>(
    `SELECT u.*, 
      COALESCE(
        json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]'
      ) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.username = $1
     GROUP BY u.id`,
    [username]
  )

  if (!user) {
    throw Object.assign(new Error('用户名或密码错误'), { code: 'AUTH_FAILED', statusCode: 401 })
  }

  if (user.status === 'frozen') {
    throw Object.assign(new Error('账号已被冻结，请联系管理员'), { code: 'ACCOUNT_FROZEN', statusCode: 403 })
  }

  const passwordValid = await bcrypt.compare(password, user.password_hash)
  if (!passwordValid) {
    throw Object.assign(new Error('用户名或密码错误'), { code: 'AUTH_FAILED', statusCode: 401 })
  }

  // 签发 Token
  const tokens = await issueTokens(user)

  // 更新最后登录时间
  await queryOne('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id])

  logger.info('User logged in', { userId: user.id, username: user.username })

  const { password_hash: _, ...safeUser } = user
  return { user: safeUser, tokens }
}

/**
 * 刷新 Token
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  let payload: JwtPayload
  try {
    payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as JwtPayload
  } catch {
    throw Object.assign(new Error('Refresh Token 无效或已过期'), { code: 'TOKEN_EXPIRED', statusCode: 401 })
  }

  // 检查 Redis 中是否存在（防止重放攻击）
  const stored = await redis.get(RedisKeys.refreshToken(payload.userId))
  if (stored !== refreshToken) {
    throw Object.assign(new Error('Refresh Token 已失效'), { code: 'TOKEN_REVOKED', statusCode: 401 })
  }

  // 查询用户最新状态
  const user = await queryOne<User>(
    `SELECT u.*, 
      COALESCE(json_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '[]') AS roles
     FROM users u
     LEFT JOIN user_roles ur ON u.id = ur.user_id
     LEFT JOIN roles r ON ur.role_id = r.id
     WHERE u.id = $1 AND u.status = 'active'
     GROUP BY u.id`,
    [payload.userId]
  )

  if (!user) {
    throw Object.assign(new Error('用户不存在或已被禁用'), { code: 'AUTH_FAILED', statusCode: 401 })
  }

  // 吊销旧 Refresh Token，签发新 Token（轮换策略）
  await redis.del(RedisKeys.refreshToken(payload.userId))
  return issueTokens(user)
}

/**
 * 登出：将 Access Token 加入黑名单，删除 Refresh Token
 */
export async function logout(userId: string, jti: string, expiresAt: number): Promise<void> {
  const ttl = Math.max(0, expiresAt - Math.floor(Date.now() / 1000))
  if (ttl > 0) {
    await redis.setex(RedisKeys.jwtBlacklist(jti), ttl, '1')
  }
  await redis.del(RedisKeys.refreshToken(userId))
  logger.info('User logged out', { userId })
}

/**
 * 内部：签发 AccessToken + RefreshToken
 */
async function issueTokens(user: User): Promise<TokenPair> {
  const jti = uuidv4()

  const accessToken = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      roles: user.roles ?? [],
      dataLevel: user.data_level,
      jti,
    } satisfies Omit<JwtPayload, 'iat' | 'exp'>,
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
  )

  const refreshToken = jwt.sign(
    { userId: user.id, jti: uuidv4() },
    config.jwtRefreshSecret,
    { expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] }
  )

  // 存储 Refresh Token（7天 TTL）
  await redis.setex(RedisKeys.refreshToken(user.id), 7 * 24 * 3600, refreshToken)

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 分钟（秒）
  }
}

/**
 * 哈希密码（注册/修改密码时使用）
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}
