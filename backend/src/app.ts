import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import rateLimit from 'express-rate-limit'

import { config } from './config/env'
import { logger } from './shared/logger'
import { checkDbHealth } from './shared/db/pool'
import { checkRedisHealth, redisClient } from './shared/redis/client'
import { traceIdMiddleware } from './middleware/traceId'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

// 路由
import { authRouter } from './modules/auth/auth.router'
import { ingestRouter } from './modules/ingest/ingest.router'
import { dataRouter } from './modules/ingest/data.router'
import { rbacRouter } from './modules/rbac/rbac.router'
import { alertRouter } from './modules/alert/alert.router'
import { patrolRouter } from './modules/patrol/patrol.router'

const app = express()

// ============================================================
// 基础中间件
// ============================================================
app.use(helmet())
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Trace-ID'],
}))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(traceIdMiddleware)
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}))

// 全局限流（每 IP 每分钟 200 次）
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMIT_EXCEEDED', message: '请求过于频繁，请稍后重试' },
}))

// ============================================================
// 路由注册
// ============================================================
app.use('/api/auth', authRouter)
app.use('/api', ingestRouter)
app.use('/api/data', dataRouter)
app.use('/api/system', rbacRouter)
app.use('/api/alerts', alertRouter)
app.use('/api/patrol', patrolRouter)

// 静态文件服务：uploads 目录（供前端下载/预览）
app.use('/uploads', express.static(
  require('path').resolve(__dirname, '../uploads'),
  { maxAge: '1d' }
))

// 健康检查（不需要认证）
app.get('/health', async (_req, res) => {
  const [dbOk, redisOk] = await Promise.all([checkDbHealth(), checkRedisHealth()])
  const status = dbOk && redisOk ? 'ok' : 'degraded'
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    services: {
      database: dbOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error',
    },
  })
})

// ============================================================
// 错误处理（必须在路由之后）
// ============================================================
app.use(notFoundHandler)
app.use(errorHandler)

// ============================================================
// 全局未捕获异常处理
// ============================================================
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack })
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { reason })
  process.exit(1)
})

// ============================================================
// 启动服务器
// ============================================================
async function bootstrap() {
  // 尝试连接 Redis（可选，连接失败时降级为内存存储）
  await redisClient.connect()

  // 验证数据库连接
  const dbOk = await checkDbHealth()
  if (!dbOk) {
    logger.error('Database connection failed, exiting...')
    process.exit(1)
  }

  app.listen(config.port, () => {
    logger.info(`🌲 松海护航后端服务启动`, {
      port: config.port,
      env: config.nodeEnv,
    })
  })
}

bootstrap().catch((err) => {
  logger.error('Bootstrap failed', { error: err.message })
  process.exit(1)
})

export default app
