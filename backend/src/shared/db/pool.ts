import { Pool, PoolClient } from 'pg'
import { config } from '../../config/env'
import { logger } from '../logger'

// 全局连接池（单例）
export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
})

pool.on('error', (err) => {
  logger.error('PostgreSQL pool error', { error: err.message })
})

/**
 * 执行单条查询
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const start = Date.now()
  try {
    const result = await pool.query(sql, params)
    const duration = Date.now() - start
    if (duration > 1000) {
      logger.warn('Slow query detected', { sql: sql.substring(0, 100), duration })
    }
    return result.rows as T[]
  } catch (err) {
    logger.error('Database query error', {
      sql: sql.substring(0, 200),
      error: (err as Error).message,
    })
    throw err
  }
}

/**
 * 执行单条查询，返回第一行
 */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/**
 * 在事务中执行多个操作
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * 健康检查
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
