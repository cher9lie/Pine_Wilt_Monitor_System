import { Router, Request, Response, NextFunction } from 'express'
import path from 'path'
import type { FeatureCollection, Geometry, Feature } from 'geojson'
import { tiffUpload, TIFF_UPLOAD_DIR } from './upload.config'
import {
  saveImageRecord,
  triggerInference,
  persistDetections,
  listImages,
} from './ingest.service'
import { authenticate, requireRole, spatialPermission } from '../../middleware/authenticate'
import { logger } from '../../shared/logger'

export const ingestRouter = Router()

// 所有路由需要认证 + 空间权限过滤
ingestRouter.use(authenticate)
ingestRouter.use(spatialPermission)

/**
 * POST /api/upload/tiff
 *
 * 接收县级市遥感 TIFF 图像上传
 * 存储物理路径：backend/uploads/tiffs/{uuid}_{filename}.tif
 *
 * 请求：multipart/form-data
 *   - file: TIFF 文件（必填）
 *   - source_type: 影像来源（可选，默认 'other'）
 *
 * 响应：
 *   - image_id: 数据库记录 ID
 *   - local_path: 服务器本地绝对路径
 *   - relative_path: 相对路径（前端展示用）
 */
ingestRouter.post(
  '/upload/tiff',
  requireRole('admin', 'forest_manager', 'analyst'),
  tiffUpload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ code: 'NO_FILE', message: '请上传 TIFF 文件' })
      }

      const sourceType = (req.body.source_type as string) ?? 'other'
      const uploadedBy = req.user!.userId

      // 1. 保存元数据到数据库
      const imageRecord = await saveImageRecord({
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        sourceType,
        uploadedBy,
      })

      logger.info('TIFF uploaded successfully', {
        imageId: imageRecord.id,
        originalName: req.file.originalname,
        storedAs: req.file.filename,
        // 明确标注本地物理存储路径
        physicalPath: path.join(TIFF_UPLOAD_DIR, req.file.filename),
        size: req.file.size,
      })

      res.status(201).json({
        code: 'SUCCESS',
        message: 'TIFF 上传成功',
        data: {
          image_id: imageRecord.id,
          filename: req.file.originalname,
          stored_filename: req.file.filename,
          // 服务器本地绝对路径（供 AI 服务读取）
          local_path: path.join(TIFF_UPLOAD_DIR, req.file.filename),
          // 相对路径（前端展示/下载用）
          relative_path: `uploads/tiffs/${req.file.filename}`,
          source_type: sourceType,
          size_bytes: req.file.size,
          status: 'uploaded',
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * POST /api/images/:id/infer
 *
 * 触发指定影像的 AI 推理
 * 1. 调用 Python FastAPI POST /infer
 * 2. 将识别结果写入 PostGIS disease_trees 表
 * 3. 返回 GeoJSON 点位数据
 */
ingestRouter.post(
  '/images/:id/infer',
  requireRole('admin', 'forest_manager', 'analyst'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params
      const { queryOne } = await import('../../shared/db/pool')

      // 查询影像记录
      const image = await queryOne<{ id: string; minio_path: string; status: string }>(
        'SELECT id, minio_path, status FROM remote_sensing_images WHERE id = $1',
        [id]
      )

      if (!image) {
        return res.status(404).json({ code: 'NOT_FOUND', message: '影像记录不存在' })
      }

      if (image.status === 'inferred') {
        return res.status(409).json({ code: 'ALREADY_INFERRED', message: '该影像已完成推理' })
      }

      // 触发推理（minio_path 在本地模式下存储的是本地绝对路径）
      const result = await triggerInference(id, image.minio_path)

      // 将 GeoJSON 点位写入 PostGIS
      const insertCount = await persistDetections(id, result.geojson, req.user!.userId)

      res.json({
        code: 'SUCCESS',
        message: `推理完成，识别到 ${result.detection_count} 个疑似病死木`,
        data: {
          image_id: id,
          detection_count: result.detection_count,
          persisted_count: insertCount,
          bbox: result.bbox,
          geojson: result.geojson,
        },
      })
    } catch (err) {
      next(err)
    }
  }
)

/**
 * GET /api/images
 * 查询影像列表（分页）
 */
ingestRouter.get('/images', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string ?? '1', 10)
    const pageSize = Math.min(parseInt(req.query.page_size as string ?? '20', 10), 100)
    const status = req.query.status as string | undefined

    const { rows, total } = await listImages({ page, pageSize, status })

    res.json({
      code: 'SUCCESS',
      data: {
        items: rows,
        pagination: { page, page_size: pageSize, total, total_pages: Math.ceil(total / pageSize) },
      },
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/images/:id/detections
 * 查询指定影像的病死木检测结果（GeoJSON）
 */
ingestRouter.get('/images/:id/detections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const { query: dbQuery } = await import('../../shared/db/pool')

    // 空间权限过滤
    const spatialWhere = req.spatialFilter ? `AND ${req.spatialFilter}` : ''

    const rows = await dbQuery(
      `SELECT
         id,
         ST_AsGeoJSON(
           ST_Transform(geom, 4326)  -- 转回 WGS84 供前端 MapLibre 使用
         )::json AS geometry,
         confidence,
         class_label,
         severity,
         status,
         detected_at
       FROM disease_trees
       WHERE image_id = $1 ${spatialWhere}
       ORDER BY confidence DESC`,
      [id]
    )

    const geojson: FeatureCollection = {
      type: 'FeatureCollection',
      features: rows.map((row: Record<string, unknown>) => ({
        type: 'Feature' as const,
        geometry: row.geometry as Geometry,
        properties: {
          id: row.id,
          confidence: row.confidence,
          class_label: row.class_label,
          severity: row.severity,
          status: row.status,
          detected_at: row.detected_at,
        },
      })),
    }

    res.json({ code: 'SUCCESS', data: geojson })
  } catch (err) {
    next(err)
  }
})
