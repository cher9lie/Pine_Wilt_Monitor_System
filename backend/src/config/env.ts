import dotenv from 'dotenv'
import path from 'path'

// 加载根目录 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

export const config = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  // PostgreSQL
  databaseUrl: requireEnv('DATABASE_URL'),

  // Redis
  redisUrl: requireEnv('REDIS_URL'),

  // JWT
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // MinIO
  minioEndpoint: process.env.MINIO_ENDPOINT ?? 'localhost',
  minioPort: parseInt(process.env.MINIO_PORT ?? '9000', 10),
  minioUseSsl: process.env.MINIO_USE_SSL === 'true',
  minioAccessKey: requireEnv('MINIO_ACCESS_KEY'),
  minioSecretKey: requireEnv('MINIO_SECRET_KEY'),
  minioBucket: process.env.MINIO_BUCKET ?? 'pine-wilt-system',

  // AI 服务
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  inferConfidenceThreshold: parseFloat(process.env.INFER_CONFIDENCE_THRESHOLD ?? '0.5'),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  // InfluxDB
  influxdbUrl: process.env.INFLUXDB_URL ?? 'http://localhost:8086',
  influxdbToken: process.env.INFLUXDB_TOKEN ?? '',
  influxdbOrg: process.env.INFLUXDB_ORG ?? 'pine-wilt',
  influxdbBucket: process.env.INFLUXDB_BUCKET ?? 'iot-sensors',
} as const
