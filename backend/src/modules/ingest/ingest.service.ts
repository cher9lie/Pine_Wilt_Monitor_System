import path from 'path'
import axios from 'axios'
import type { FeatureCollection, Point } from 'geojson'
import { query, queryOne, withTransaction } from '../../shared/db/pool'
import { config } from '../../config/env'
import { logger } from '../../shared/logger'
import { TIFF_UPLOAD_DIR } from './upload.config'

export interface ImageRecord {
  id: string
  filename: string
  local_path: string       // 服务器本地绝对路�?
  relative_path: string    // 相对�?uploads/tiffs/ 的路径（前端可用�?
  source_type: string
  status: string
  created_at: Date
}

export interface DetectionResult {
  image_id: string
  detection_count: number
  geojson: FeatureCollection
  bbox: [number, number, number, number] | null  // [minLng, minLat, maxLng, maxLat]
}

/**
 * 保存上传�?TIFF 文件元数据到数据�?
 */
export async function saveImageRecord(params: {
  filename: string
  storedFilename: string
  sourceType: string
  uploadedBy: string
}): Promise<ImageRecord> {
  const localPath = path.join(TIFF_UPLOAD_DIR, params.storedFilename)
  const relativePath = `uploads/tiffs/${params.storedFilename}`

  const row = await queryOne<ImageRecord>(
    `INSERT INTO remote_sensing_images
       (filename, minio_path, source_type, status, uploaded_by)
     VALUES ($1, $2, $3, 'uploaded', $4)
     RETURNING id, filename, minio_path AS local_path, source_type, status, created_at`,
    [params.filename, localPath, params.sourceType, params.uploadedBy]
  )

  // relative_path 不在 SQL 中返回，手动附加
  if (row) {
    ;(row as unknown as Record<string, unknown>).relative_path = relativePath
  }

  if (!row) throw new Error('Database write failed')

  logger.info('Image record saved', {
    imageId: row.id,
    filename: params.filename,
    localPath,
  })

  return row
}

/**
 * 触发 Python AI 推理服务
 * 调用 POST http://ai_service:8000/infer
 * 返回 GeoJSON FeatureCollection（病死木点位�?
 */
export async function triggerInference(imageId: string, localPath: string): Promise<DetectionResult> {
  // 更新状态为 preprocessing
  await query(
    `UPDATE remote_sensing_images SET status = 'preprocessing', updated_at = NOW() WHERE id = $1`,
    [imageId]
  )

  try {
    logger.info('Triggering AI inference', { imageId, localPath })

    const response = await axios.post<{
      detection_count: number
      geojson: FeatureCollection
      bbox: [number, number, number, number] | null
      task_id: string
    }>(
      `${config.aiServiceUrl}/infer`,
      {
        image_id: imageId,
        image_path: localPath,
        confidence_threshold: config.inferConfidenceThreshold,
      },
      { timeout: 5 * 60 * 1000 } // 5 分钟超时（大图推理耗时较长�?
    )

    const { detection_count, geojson, bbox } = response.data

    // 更新状态为 inferred，写�?bbox
    await query(
      `UPDATE remote_sensing_images
       SET status = 'inferred',
           bbox = CASE WHEN $2::text IS NOT NULL
                  THEN ST_MakeEnvelope($3, $4, $5, $6, 4490)
                  ELSE NULL END,
           updated_at = NOW()
       WHERE id = $1`,
      [
        imageId,
        bbox ? 'set' : null,
        bbox?.[0], bbox?.[1], bbox?.[2], bbox?.[3],
      ]
    )

    logger.info('AI inference completed', { imageId, detection_count })

    return { image_id: imageId, detection_count, geojson, bbox }
  } catch (err) {
    // 推理失败，更新状�?
    await query(
      `UPDATE remote_sensing_images SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [imageId]
    )
    logger.error('AI inference failed', { imageId, error: (err as Error).message })
    throw err
  }
}

/**
 * �?AI 推理结果（GeoJSON 点位）批量写�?PostGIS disease_trees �?
 */
export async function persistDetections(
  imageId: string,
  geojson: FeatureCollection,
  uploadedBy: string
): Promise<number> {
  if (!geojson.features || geojson.features.length === 0) return 0

  return withTransaction(async (client) => {
    let insertCount = 0

    for (const feature of geojson.features) {
      if (feature.geometry.type !== 'Point') continue

      const [lng, lat] = (feature.geometry as Point).coordinates
      const props = feature.properties ?? {}

      await client.query(
        `INSERT INTO disease_trees
           (geom, confidence, class_label, severity, image_id, status)
         VALUES (
           ST_Transform(ST_SetSRID(ST_MakePoint($1, $2), 4326), 4490),
           $3, $4, $5, $6, 'pending'
         )`,
        [
          lng,
          lat,
          props.confidence ?? 0.5,
          props.class_label ?? 'suspected',
          props.severity ?? 1,
          imageId,
        ]
      )
      insertCount++
    }

    logger.info('Disease trees persisted to PostGIS', { imageId, count: insertCount })
    return insertCount
  })
}

/**
 * 查询影像列表（分页）
 */
export async function listImages(params: {
  page: number
  pageSize: number
  status?: string
  userId?: string
}): Promise<{ rows: ImageRecord[]; total: number }> {
  const offset = (params.page - 1) * params.pageSize
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.userId) {
    conditions.push(`uploaded_by = $${idx++}`)
    values.push(params.userId)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  const [rows, countResult] = await Promise.all([
    query<ImageRecord>(
      `SELECT id, filename, minio_path AS local_path, source_type, status,
              ST_AsGeoJSON(bbox) AS bbox_geojson, created_at
       FROM remote_sensing_images
       ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...values, params.pageSize, offset]
    ),
    queryOne<{ count: string }>(
      `SELECT COUNT(*) AS count FROM remote_sensing_images ${where}`,
      values
    ),
  ])

  return { rows, total: parseInt(countResult?.count ?? '0', 10) }
}
