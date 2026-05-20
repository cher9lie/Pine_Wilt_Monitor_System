import { Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { logger } from '../shared/logger'

export interface AppError extends Error {
  statusCode?: number
  code?: string
}

/**
 * 全局错误处理中间件（必须放在所有路由之后）
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod 校验错误
  if (err instanceof ZodError) {
    res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: '请求参数校验失败',
      traceId: req.traceId,
      timestamp: new Date().toISOString(),
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    })
    return
  }

  const statusCode = err.statusCode ?? 500
  const code = err.code ?? 'INTERNAL_ERROR'

  // 5xx 错误记录完整堆栈
  if (statusCode >= 500) {
    logger.error('Internal server error', {
      traceId: req.traceId,
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
    })
  } else {
    logger.warn('Client error', {
      traceId: req.traceId,
      path: req.path,
      statusCode,
      code,
      message: err.message,
    })
  }

  res.status(statusCode).json({
    code,
    message: statusCode >= 500 ? '服务器内部错误，请稍后重试' : err.message,
    traceId: req.traceId,
    timestamp: new Date().toISOString(),
  })
}

/**
 * 404 处理中间件
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `接口不存在：${req.method} ${req.path}`,
    traceId: req.traceId,
    timestamp: new Date().toISOString(),
  })
}
