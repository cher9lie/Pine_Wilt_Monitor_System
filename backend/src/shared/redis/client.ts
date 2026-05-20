import Redis from 'ioredis'
import { config } from '../../config/env'
import { logger } from '../logger'

// ── Redis 连接（开发环境可选，连接失败时降级为内存存储） ──────────
let redis: Redis | null = null
let memoryStore: Map<string, { value: string; expireAt: number }> = new Map()
let useMemoryFallback = false

try {
  redis = new Redis(config.redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis 连接失败，降级为内存存储模式（仅限开发环境）')
        useMemoryFallback = true
        return null
      }
      return Math.min(times * 200, 2000)
    },
    enableOfflineQueue: false,
  })

  redis.on('connect', () => {
    useMemoryFallback = false
    logger.info('Redis connected')
  })
  redis.on('error', (err) => {
    if (!useMemoryFallback) {
      logger.warn('Redis error, falling back to memory store', { error: err.message })
      useMemoryFallback = true
    }
  })
} catch {
  logger.warn('Redis 初始化失败，使用内存存储模式')
  useMemoryFallback = true
}

// ── 统一接口（兼容 Redis 和内存降级） ──────────────────────────

export const redisClient = {
  async connect(): Promise<void> {
    if (redis && !useMemoryFallback) {
      try {
        await redis.connect()
      } catch {
        logger.warn('Redis connect failed, using memory fallback')
        useMemoryFallback = true
      }
    }
  },

  async get(key: string): Promise<string | null> {
    if (!useMemoryFallback && redis) {
      try { return await redis.get(key) } catch { useMemoryFallback = true }
    }
    // 内存降级
    const item = memoryStore.get(key)
    if (!item) return null
    if (item.expireAt > 0 && Date.now() > item.expireAt) {
      memoryStore.delete(key)
      return null
    }
    return item.value
  },

  async setex(key: string, seconds: number, value: string): Promise<void> {
    if (!useMemoryFallback && redis) {
      try { await redis.setex(key, seconds, value); return } catch { useMemoryFallback = true }
    }
    memoryStore.set(key, { value, expireAt: Date.now() + seconds * 1000 })
  },

  async del(key: string): Promise<void> {
    if (!useMemoryFallback && redis) {
      try { await redis.del(key); return } catch { useMemoryFallback = true }
    }
    memoryStore.delete(key)
  },

  async ping(): Promise<string> {
    if (!useMemoryFallback && redis) {
      try { return await redis.ping() } catch { useMemoryFallback = true }
    }
    return 'PONG'
  },
}

// Redis Key 命名规范
export const RedisKeys = {
  jwtBlacklist: (jti: string) => `jwt:blacklist:${jti}`,
  refreshToken: (userId: string) => `auth:refresh:${userId}`,
  userPermissions: (userId: string) => `rbac:permissions:${userId}`,
  rateLimit: (key: string) => `rate:${key}`,
  wsConnection: (userId: string) => `ws:conn:${userId}`,
} as const

export async function checkRedisHealth(): Promise<boolean> {
  try {
    const res = await redisClient.ping()
    return res === 'PONG'
  } catch {
    return false
  }
}

// 兼容旧代码（导出为 redis）
export { redisClient as redis }
