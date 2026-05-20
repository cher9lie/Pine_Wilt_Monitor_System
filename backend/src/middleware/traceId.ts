import { Request, Response, NextFunction } from 'express'
import { v4 as uuidv4 } from 'uuid'

/**
 * 链路追踪中间件：为每个请求注入唯一 traceId
 */
export function traceIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.traceId = (req.headers['x-trace-id'] as string) ?? uuidv4()
  res.setHeader('X-Trace-ID', req.traceId)
  next()
}
