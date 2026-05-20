import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { query, queryOne } from '../../shared/db/pool'
import { authenticate, requireRole } from '../../middleware/authenticate'
import { logger } from '../../shared/logger'

export const patrolRouter = Router()
patrolRouter.use(authenticate)

// ============================================================
// 工单管理
// ============================================================

/**
 * GET /api/patrol/workorders - 工单列表
 */
patrolRouter.get('/workorders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '20', 10), 100)
    const status = req.query.status as string | undefined
    const type = req.query.type as string | undefined
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let idx = 1

    if (status) { where += ` AND wo.status = $${idx}`; params.push(status); idx++ }
    if (type) { where += ` AND wo.type = $${idx}`; params.push(type); idx++ }

    // 护林员只能看到分配给自己的工单
    const userRoles = req.user!.roles
    if (!userRoles.includes('admin') && !userRoles.includes('forest_manager')) {
      where += ` AND wo.assignee_id = $${idx}`
      params.push(req.user!.userId)
      idx++
    }

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT wo.id, wo.type, wo.status, wo.priority, wo.title, wo.description,
                wo.deadline, wo.completed_at, wo.created_at,
                u_assignee.username AS assignee_name, u_assignee.real_name AS assignee_real_name,
                u_creator.username AS creator_name
         FROM work_orders wo
         LEFT JOIN users u_assignee ON wo.assignee_id = u_assignee.id
         LEFT JOIN users u_creator ON wo.created_by = u_creator.id
         ${where}
         ORDER BY wo.priority DESC, wo.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM work_orders wo ${where}`, params),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)

    // 无数据时返回模拟工单
    if (total === 0 && !status && !type) {
      return res.json({ code: 'SUCCESS', data: { items: getMockWorkorders(), pagination: { page: 1, page_size: 20, total: 6, total_pages: 1 }, is_mock: true } })
    }

    res.json({ code: 'SUCCESS', data: { items: rows, pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) } } })
  } catch (err) { next(err) }
})

/**
 * POST /api/patrol/workorders - 创建工单
 */
const createWOSchema = z.object({
  type: z.enum(['patrol', 'treatment', 'verification', 'maintenance']),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  priority: z.number().min(1).max(4).default(2),
  assignee_id: z.string().uuid().optional(),
  deadline: z.string().optional(),
})

patrolRouter.post('/workorders', requireRole('admin', 'forest_manager'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createWOSchema.parse(req.body)
    const row = await queryOne<{ id: string }>(
      `INSERT INTO work_orders (type, title, description, priority, assignee_id, deadline, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [body.type, body.title, body.description, body.priority, body.assignee_id, body.deadline, req.user!.userId, body.assignee_id ? 'assigned' : 'pending']
    )
    logger.info('Workorder created', { id: row!.id, type: body.type, by: req.user!.username })
    res.status(201).json({ code: 'SUCCESS', data: { id: row!.id } })
  } catch (err) { next(err) }
})

/**
 * PATCH /api/patrol/workorders/:id/status - 工单状态流转
 */
patrolRouter.patch('/workorders/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const validTransitions: Record<string, string[]> = {
      pending: ['assigned', 'cancelled'],
      assigned: ['in_progress', 'cancelled'],
      in_progress: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    }

    const current = await queryOne<{ status: string }>('SELECT status FROM work_orders WHERE id = $1', [id])
    if (!current) return res.status(404).json({ code: 'NOT_FOUND', message: '工单不存在' })

    if (!validTransitions[current.status]?.includes(status)) {
      return res.status(400).json({ code: 'INVALID_TRANSITION', message: `不能从 ${current.status} 转为 ${status}` })
    }

    const completedAt = status === 'completed' ? 'NOW()' : 'NULL'
    await query(
      `UPDATE work_orders SET status = $1, updated_at = NOW(), completed_at = ${completedAt} WHERE id = $2`,
      [status, id]
    )
    res.json({ code: 'SUCCESS', message: '工单状态已更新' })
  } catch (err) { next(err) }
})

// ============================================================
// 巡查轨迹
// ============================================================

/**
 * GET /api/patrol/tracks - 巡查轨迹列表
 */
patrolRouter.get('/tracks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '20', 10), 100)
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let idx = 1

    // 护林员只看自己的轨迹
    const userRoles = req.user!.roles
    if (!userRoles.includes('admin') && !userRoles.includes('forest_manager')) {
      where += ` AND pt.user_id = $${idx}`
      params.push(req.user!.userId)
      idx++
    }

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT pt.id, pt.started_at, pt.ended_at, pt.distance_km, pt.point_count,
                u.username, u.real_name,
                ST_AsGeoJSON(ST_Transform(pt.track, 4326))::json AS track_geojson
         FROM patrol_tracks pt
         LEFT JOIN users u ON pt.user_id = u.id
         ${where}
         ORDER BY pt.started_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      queryOne<{ count: string }>(`SELECT COUNT(*) as count FROM patrol_tracks pt ${where}`, params),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)

    if (total === 0) {
      return res.json({ code: 'SUCCESS', data: { items: getMockTracks(), pagination: { page: 1, page_size: 20, total: 4, total_pages: 1 }, is_mock: true } })
    }

    res.json({ code: 'SUCCESS', data: { items: rows, pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) } } })
  } catch (err) { next(err) }
})

/**
 * GET /api/patrol/stats - 巡护统计概览
 */
patrolRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) as total_orders,
         COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
         COUNT(*) FILTER (WHERE status = 'in_progress') as active_orders,
         COUNT(*) FILTER (WHERE status = 'pending' OR status = 'assigned') as pending_orders
       FROM work_orders`
    )

    if (!stats || parseInt(stats.total_orders) === 0) {
      return res.json({
        code: 'SUCCESS',
        data: { total_orders: 6, completed_orders: 2, active_orders: 2, pending_orders: 2, total_tracks: 4, total_distance_km: 47.8, is_mock: true },
      })
    }

    res.json({ code: 'SUCCESS', data: stats })
  } catch (err) { next(err) }
})

// ============================================================
// 模拟数据
// ============================================================
function getMockWorkorders() {
  return [
    { id: 'wo-001', type: 'patrol', status: 'in_progress', priority: 4, title: '黄坌镇重点疫区紧急巡查', description: '红色预警区域，需48小时内完成全域踏查，统计枯死松树数量', assignee_real_name: '张伟', assignee_name: 'patrol_zhangwei', creator_name: 'manager', deadline: '2025-01-20T00:00:00Z', completed_at: null, created_at: '2025-01-15T08:00:00Z' },
    { id: 'wo-002', type: 'treatment', status: 'in_progress', priority: 3, title: '横石塘镇疫木清理伐除', description: '对已确认的145株枯死松树进行伐除和销毁处理', assignee_real_name: '李强', assignee_name: 'patrol_liqiang', creator_name: 'manager', deadline: '2025-01-25T00:00:00Z', completed_at: null, created_at: '2025-01-12T09:30:00Z' },
    { id: 'wo-003', type: 'verification', status: 'assigned', priority: 3, title: '星子镇疑似变色木复核', description: '对AI识别的91株变色木进行现场核实，判断是否为松材线虫病', assignee_real_name: '王芳', assignee_name: 'patrol_wangfang', creator_name: 'engineer', deadline: '2025-01-22T00:00:00Z', completed_at: null, created_at: '2025-01-14T10:00:00Z' },
    { id: 'wo-004', type: 'patrol', status: 'pending', priority: 2, title: '太和镇春季普查巡护', description: '按照五年攻坚计划要求，开展春季松材线虫病普查巡护', assignee_real_name: null, assignee_name: null, creator_name: 'manager', deadline: '2025-03-31T00:00:00Z', completed_at: null, created_at: '2025-01-18T14:00:00Z' },
    { id: 'wo-005', type: 'treatment', status: 'completed', priority: 3, title: '吉田镇疫木伐除复查验收', description: '对已完成清理的吉田林场进行复查验收，确认枯死松树全部清除', assignee_real_name: '赵敏', assignee_name: 'patrol_zhaomin', creator_name: 'manager', deadline: '2024-11-30T00:00:00Z', completed_at: '2024-11-28T16:30:00Z', created_at: '2024-11-01T08:00:00Z' },
    { id: 'wo-006', type: 'maintenance', status: 'completed', priority: 1, title: '大坪镇诱捕器电池更换', description: '3台松墨天牛诱捕器电池衰减严重（<20%），需更换', assignee_real_name: '张伟', assignee_name: 'patrol_zhangwei', creator_name: 'admin', deadline: '2025-01-10T00:00:00Z', completed_at: '2025-01-08T11:00:00Z', created_at: '2025-01-05T09:00:00Z' },
  ]
}

function getMockTracks() {
  return [
    { id: 'tr-001', username: 'patrol_zhangwei', real_name: '张伟', started_at: '2025-01-16T08:30:00Z', ended_at: '2025-01-16T14:20:00Z', distance_km: 12.4, point_count: 856, track_geojson: { type: 'LineString', coordinates: [[112.62,24.46],[112.63,24.47],[112.64,24.48],[112.63,24.49],[112.62,24.48]] } },
    { id: 'tr-002', username: 'patrol_liqiang', real_name: '李强', started_at: '2025-01-15T07:45:00Z', ended_at: '2025-01-15T12:30:00Z', distance_km: 8.7, point_count: 612, track_geojson: { type: 'LineString', coordinates: [[113.21,24.17],[113.22,24.18],[113.23,24.19],[113.22,24.20]] } },
    { id: 'tr-003', username: 'patrol_wangfang', real_name: '王芳', started_at: '2025-01-14T09:00:00Z', ended_at: '2025-01-14T15:45:00Z', distance_km: 15.3, point_count: 1024, track_geojson: { type: 'LineString', coordinates: [[112.37,24.77],[112.38,24.78],[112.39,24.79],[112.38,24.80],[112.37,24.79]] } },
    { id: 'tr-004', username: 'patrol_zhaomin', real_name: '赵敏', started_at: '2024-11-25T08:00:00Z', ended_at: '2024-11-25T16:00:00Z', distance_km: 11.4, point_count: 943, track_geojson: { type: 'LineString', coordinates: [[112.07,24.56],[112.08,24.57],[112.09,24.58],[112.08,24.59]] } },
  ]
}
