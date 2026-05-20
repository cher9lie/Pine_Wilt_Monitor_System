import { Router, Request, Response, NextFunction } from 'express'
import { query, queryOne } from '../../shared/db/pool'
import { authenticate } from '../../middleware/authenticate'

export const dataRouter = Router()
dataRouter.use(authenticate)

/**
 * GET /api/data/iot-devices - IoT 设备列表（含模拟数据兜底）
 */
dataRouter.get('/iot-devices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rows = await query(
      `SELECT id, device_code, device_type, name, status, battery_pct,
              signal_strength, firmware_ver, last_heartbeat,
              ST_AsGeoJSON(ST_Transform(geom, 4326))::json AS geojson
       FROM iot_devices ORDER BY last_heartbeat DESC NULLS LAST`
    )
    if (!rows || rows.length === 0) {
      return res.json({ code: 'SUCCESS', data: getMockIotDevices(), is_mock: true })
    }
    res.json({ code: 'SUCCESS', data: rows })
  } catch (err) { next(err) }
})

/**
 * GET /api/data/iot-devices/stats - IoT 设备统计
 */
dataRouter.get('/iot-devices/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await queryOne<Record<string, string>>(
      `SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE status='online') as online,
              COUNT(*) FILTER (WHERE status='offline') as offline,
              COUNT(*) FILTER (WHERE status='fault') as fault,
              AVG(battery_pct) FILTER (WHERE battery_pct IS NOT NULL) as avg_battery
       FROM iot_devices`
    )
    if (!stats || parseInt(stats.total) === 0) {
      return res.json({ code: 'SUCCESS', data: { total: 12, online: 9, offline: 2, fault: 1, avg_battery: 67.3, is_mock: true } })
    }
    res.json({ code: 'SUCCESS', data: stats })
  } catch (err) { next(err) }
})

/**
 * GET /api/data/ground-monitoring - 地面监测数据（模拟）
 */
dataRouter.get('/ground-monitoring', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ code: 'SUCCESS', data: getMockGroundData(), is_mock: true })
  } catch (err) { next(err) }
})

// ============================================================
// 模拟数据
// ============================================================
function getMockIotDevices() {
  return [
    { id: 'd-001', device_code: 'TRAP-HB-001', device_type: 'trap', name: '黄坌镇1号诱捕器', status: 'online', battery_pct: 82, signal_strength: -67, firmware_ver: 'v2.1.4', last_heartbeat: '2025-01-18T10:30:00Z', geojson: { type: 'Point', coordinates: [112.63, 24.47] } },
    { id: 'd-002', device_code: 'TRAP-HB-002', device_type: 'trap', name: '黄坌镇2号诱捕器', status: 'online', battery_pct: 45, signal_strength: -78, firmware_ver: 'v2.1.4', last_heartbeat: '2025-01-18T10:28:00Z', geojson: { type: 'Point', coordinates: [112.64, 24.48] } },
    { id: 'd-003', device_code: 'TRAP-HST-001', device_type: 'trap', name: '横石塘1号诱捕器', status: 'online', battery_pct: 91, signal_strength: -55, firmware_ver: 'v2.1.4', last_heartbeat: '2025-01-18T10:32:00Z', geojson: { type: 'Point', coordinates: [113.22, 24.18] } },
    { id: 'd-004', device_code: 'WS-HB-001', device_type: 'weather', name: '黄坌镇气象站', status: 'online', battery_pct: 100, signal_strength: -42, firmware_ver: 'v3.0.1', last_heartbeat: '2025-01-18T10:35:00Z', geojson: { type: 'Point', coordinates: [112.62, 24.46] } },
    { id: 'd-005', device_code: 'WS-XZ-001', device_type: 'weather', name: '星子镇气象站', status: 'online', battery_pct: 98, signal_strength: -51, firmware_ver: 'v3.0.1', last_heartbeat: '2025-01-18T10:33:00Z', geojson: { type: 'Point', coordinates: [112.38, 24.78] } },
    { id: 'd-006', device_code: 'SOIL-HB-001', device_type: 'soil', name: '黄坌镇土壤传感器', status: 'online', battery_pct: 73, signal_strength: -72, firmware_ver: 'v1.5.2', last_heartbeat: '2025-01-18T10:20:00Z', geojson: { type: 'Point', coordinates: [112.635, 24.465] } },
    { id: 'd-007', device_code: 'TRAP-DP-001', device_type: 'trap', name: '大坪镇1号诱捕器', status: 'offline', battery_pct: 12, signal_strength: -95, firmware_ver: 'v2.1.3', last_heartbeat: '2025-01-15T08:10:00Z', geojson: { type: 'Point', coordinates: [112.28, 24.52] } },
    { id: 'd-008', device_code: 'TRAP-DP-002', device_type: 'trap', name: '大坪镇2号诱捕器', status: 'offline', battery_pct: 8, signal_strength: null, firmware_ver: 'v2.1.3', last_heartbeat: '2025-01-14T16:40:00Z', geojson: { type: 'Point', coordinates: [112.29, 24.53] } },
    { id: 'd-009', device_code: 'TRAP-TH-001', device_type: 'trap', name: '太和镇1号诱捕器', status: 'online', battery_pct: 56, signal_strength: -68, firmware_ver: 'v2.1.4', last_heartbeat: '2025-01-18T10:25:00Z', geojson: { type: 'Point', coordinates: [113.01, 23.73] } },
    { id: 'd-010', device_code: 'WS-TH-001', device_type: 'weather', name: '太和镇气象站', status: 'online', battery_pct: 100, signal_strength: -48, firmware_ver: 'v3.0.1', last_heartbeat: '2025-01-18T10:34:00Z', geojson: { type: 'Point', coordinates: [113.02, 23.74] } },
    { id: 'd-011', device_code: 'TRAP-TT-001', device_type: 'trap', name: '汤塘镇诱捕器', status: 'online', battery_pct: 64, signal_strength: -71, firmware_ver: 'v2.1.4', last_heartbeat: '2025-01-18T10:22:00Z', geojson: { type: 'Point', coordinates: [113.53, 23.88] } },
    { id: 'd-012', device_code: 'TRAP-HB-003', device_type: 'trap', name: '黄坌镇3号诱捕器(故障)', status: 'fault', battery_pct: 0, signal_strength: null, firmware_ver: 'v2.1.2', last_heartbeat: '2025-01-10T09:00:00Z', geojson: { type: 'Point', coordinates: [112.65, 24.49] } },
  ]
}

function getMockGroundData() {
  // 最近7天的虫情/气象/土壤监测汇总
  return {
    trap_summary: {
      total_captures_7d: 234,
      avg_daily: 33.4,
      peak_day: '2025-01-16',
      peak_count: 58,
      trend: 'rising',  // rising/stable/declining
    },
    weather_summary: {
      avg_temp: 12.3,
      avg_humidity: 78.5,
      total_rainfall_mm: 18.2,
      avg_wind_speed: 2.1,
      sunshine_hours: 32.4,
    },
    soil_summary: {
      avg_ph: 5.8,
      avg_moisture: 42.3,
      avg_nutrient: 'medium',
    },
    patrol_records: {
      total_7d: 18,
      photos_uploaded: 47,
      anomalies_reported: 5,
    },
    daily_captures: [
      { date: '2025-01-12', count: 28 },
      { date: '2025-01-13', count: 31 },
      { date: '2025-01-14', count: 35 },
      { date: '2025-01-15', count: 42 },
      { date: '2025-01-16', count: 58 },
      { date: '2025-01-17', count: 22 },
      { date: '2025-01-18', count: 18 },
    ],
  }
}
