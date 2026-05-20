import { Router, Request, Response, NextFunction } from 'express'
import { query, queryOne } from '../../shared/db/pool'
import { authenticate } from '../../middleware/authenticate'
import { logger } from '../../shared/logger'

export const alertRouter = Router()
alertRouter.use(authenticate)

/**
 * GET /api/alerts - 预警列表（含模拟数据兜底）
 */
alertRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '20', 10), 100)
    const level = req.query.level as string | undefined
    const status = req.query.status as string | undefined
    const offset = (page - 1) * pageSize

    let where = 'WHERE 1=1'
    const params: unknown[] = []
    let idx = 1

    if (level) { where += ` AND level = $${idx}`; params.push(level); idx++ }
    if (status) { where += ` AND status = $${idx}`; params.push(status); idx++ }

    const [rows, countResult] = await Promise.all([
      query(
        `SELECT id, name, level, disease_count, affected_area, status,
                triggered_at, resolved_at, forest_farm_id,
                ST_AsGeoJSON(ST_Transform(geom, 4326))::json AS geojson
         FROM alert_zones
         ${where}
         ORDER BY triggered_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, pageSize, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM alert_zones ${where}`, params
      ),
    ])

    const total = parseInt(countResult?.count ?? '0', 10)

    // 如果数据库为空，返回模拟数据
    if (total === 0 && !level && !status) {
      return res.json({ code: 'SUCCESS', data: { items: getMockAlerts(), pagination: { page: 1, page_size: 20, total: 8, total_pages: 1 }, is_mock: true } })
    }

    res.json({
      code: 'SUCCESS',
      data: { items: rows, pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) } },
    })
  } catch (err) { next(err) }
})

/**
 * GET /api/alerts/stats - 预警统计概览
 */
alertRouter.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await queryOne<Record<string, string>>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'active') AS active_count,
         COUNT(*) FILTER (WHERE level = 'red' AND status = 'active') AS red_count,
         COUNT(*) FILTER (WHERE level = 'orange' AND status = 'active') AS orange_count,
         COUNT(*) FILTER (WHERE level = 'yellow' AND status = 'active') AS yellow_count,
         COUNT(*) FILTER (WHERE level = 'green' AND status = 'active') AS green_count,
         COALESCE(SUM(disease_count) FILTER (WHERE status = 'active'), 0) AS total_disease_trees,
         COALESCE(SUM(affected_area) FILTER (WHERE status = 'active'), 0) AS total_affected_area
       FROM alert_zones`
    )

    // 若无数据返回模拟统计
    if (!stats || parseInt(stats.active_count) === 0) {
      return res.json({
        code: 'SUCCESS',
        data: { active_count: 8, red_count: 1, orange_count: 2, yellow_count: 3, green_count: 2, total_disease_trees: 1847, total_affected_area: 234.6, is_mock: true },
      })
    }

    res.json({ code: 'SUCCESS', data: stats })
  } catch (err) { next(err) }
})

/**
 * GET /api/alerts/assessment - 灾情评估数据（各林场统计）
 */
alertRouter.get('/assessment', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query(
      `SELECT ff.name AS farm_name, ff.admin_code,
              COUNT(dt.id) AS disease_count,
              COUNT(dt.id) FILTER (WHERE dt.class_label = 'dead_tree') AS dead_tree_count,
              COUNT(dt.id) FILTER (WHERE dt.class_label = 'discolored') AS discolored_count,
              COUNT(dt.id) FILTER (WHERE dt.status = 'confirmed') AS confirmed_count,
              COALESCE(SUM(fp.area_ha), 0) AS total_area_ha
       FROM forest_farms ff
       LEFT JOIN forest_plots fp ON fp.forest_farm_id = ff.id
       LEFT JOIN disease_trees dt ON dt.forest_plot_id = fp.id
       GROUP BY ff.id
       ORDER BY disease_count DESC`
    )

    // 若无数据返回模拟灾情评估
    if (!rows || rows.length === 0) {
      return res.json({ code: 'SUCCESS', data: getMockAssessment(), is_mock: true })
    }

    res.json({ code: 'SUCCESS', data: rows })
  } catch (err) { next(err) }
})

// ============================================================
// 模拟数据（基于广东省清远市松材线虫病真实场景）
// ============================================================
function getMockAlerts() {
  return [
    {
      id: 'mock-001', name: '阳山县黄坌镇重度疫区', level: 'red',
      disease_count: 487, affected_area: 52.3, status: 'active',
      triggered_at: '2024-11-15T08:30:00Z', resolved_at: null,
      farm_name: '黄坌国有林场',
      geojson: { type: 'Point', coordinates: [112.63, 24.47] },
    },
    {
      id: 'mock-002', name: '英德市横石塘镇中度疫区', level: 'orange',
      disease_count: 256, affected_area: 38.7, status: 'active',
      triggered_at: '2024-11-20T10:15:00Z', resolved_at: null,
      farm_name: '横石塘林场',
      geojson: { type: 'Point', coordinates: [113.22, 24.18] },
    },
    {
      id: 'mock-003', name: '连州市星子镇中度疫区', level: 'orange',
      disease_count: 189, affected_area: 28.4, status: 'active',
      triggered_at: '2024-12-01T09:00:00Z', resolved_at: null,
      farm_name: '星子林场',
      geojson: { type: 'Point', coordinates: [112.38, 24.78] },
    },
    {
      id: 'mock-004', name: '清新区太和镇轻度疫区', level: 'yellow',
      disease_count: 78, affected_area: 12.1, status: 'active',
      triggered_at: '2024-12-10T14:20:00Z', resolved_at: null,
      farm_name: '太和林场',
      geojson: { type: 'Point', coordinates: [113.01, 23.73] },
    },
    {
      id: 'mock-005', name: '佛冈县汤塘镇轻度疫区', level: 'yellow',
      disease_count: 64, affected_area: 9.8, status: 'active',
      triggered_at: '2024-12-15T11:00:00Z', resolved_at: null,
      farm_name: '汤塘林场',
      geojson: { type: 'Point', coordinates: [113.53, 23.88] },
    },
    {
      id: 'mock-006', name: '连南县大坪镇观察区', level: 'yellow',
      disease_count: 35, affected_area: 5.2, status: 'active',
      triggered_at: '2025-01-05T08:45:00Z', resolved_at: null,
      farm_name: '大坪林场',
      geojson: { type: 'Point', coordinates: [112.28, 24.52] },
    },
    {
      id: 'mock-007', name: '清城区源潭镇', level: 'green',
      disease_count: 12, affected_area: 2.1, status: 'active',
      triggered_at: '2025-01-10T09:30:00Z', resolved_at: null,
      farm_name: '源潭林场',
      geojson: { type: 'Point', coordinates: [113.08, 23.68] },
    },
    {
      id: 'mock-008', name: '连山县吉田镇（已处置）', level: 'green',
      disease_count: 156, affected_area: 18.9, status: 'resolved',
      triggered_at: '2024-09-01T10:00:00Z', resolved_at: '2024-11-30T16:00:00Z',
      farm_name: '吉田林场',
      geojson: { type: 'Point', coordinates: [112.08, 24.57] },
    },
  ]
}

function getMockAssessment() {
  return [
    { farm_name: '黄坌国有林场', admin_code: '441823', disease_count: 487, dead_tree_count: 312, discolored_count: 175, confirmed_count: 423, total_area_ha: 1240, risk_level: 4, ndvi_change: -0.18 },
    { farm_name: '横石塘林场', admin_code: '441881', disease_count: 256, dead_tree_count: 145, discolored_count: 111, confirmed_count: 198, total_area_ha: 890, risk_level: 3, ndvi_change: -0.12 },
    { farm_name: '星子林场', admin_code: '441882', disease_count: 189, dead_tree_count: 98, discolored_count: 91, confirmed_count: 152, total_area_ha: 720, risk_level: 3, ndvi_change: -0.09 },
    { farm_name: '太和林场', admin_code: '441803', disease_count: 78, dead_tree_count: 34, discolored_count: 44, confirmed_count: 62, total_area_ha: 560, risk_level: 2, ndvi_change: -0.05 },
    { farm_name: '汤塘林场', admin_code: '441821', disease_count: 64, dead_tree_count: 28, discolored_count: 36, confirmed_count: 51, total_area_ha: 480, risk_level: 2, ndvi_change: -0.04 },
    { farm_name: '大坪林场', admin_code: '441826', disease_count: 35, dead_tree_count: 12, discolored_count: 23, confirmed_count: 28, total_area_ha: 380, risk_level: 1, ndvi_change: -0.02 },
    { farm_name: '源潭林场', admin_code: '441802', disease_count: 12, dead_tree_count: 4, discolored_count: 8, confirmed_count: 9, total_area_ha: 310, risk_level: 0, ndvi_change: 0.01 },
    { farm_name: '吉田林场', admin_code: '441825', disease_count: 156, dead_tree_count: 156, discolored_count: 0, confirmed_count: 156, total_area_ha: 650, risk_level: 0, ndvi_change: 0.08, status: 'cleared' },
  ]
}
