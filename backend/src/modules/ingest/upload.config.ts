import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

/**
 * TIFF 文件本地存储物理路径
 * 绝对路径：<project_root>/backend/uploads/tiffs/
 */
export const TIFF_UPLOAD_DIR = path.resolve(__dirname, '../../../uploads/tiffs')

// 确保目录存在
if (!fs.existsSync(TIFF_UPLOAD_DIR)) {
  fs.mkdirSync(TIFF_UPLOAD_DIR, { recursive: true })
}

/**
 * Multer 磁盘存储配置
 * 文件命名规则：{uuid}_{原始文件名}
 * 存储位置：backend/uploads/tiffs/
 */
const tiffStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TIFF_UPLOAD_DIR)
  },
  filename: (_req, file, cb) => {
    // 保留原始文件名，前缀 UUID 防止冲突
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${uuidv4()}_${safeName}`)
  },
})

/**
 * 文件类型过滤：只允许 GeoTIFF / TIFF
 */
function tiffFileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  const allowedMimes = ['image/tiff', 'image/geotiff', 'application/octet-stream']
  const allowedExts = ['.tif', '.tiff', '.geotiff']
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件类型：${file.mimetype}，仅接受 GeoTIFF 格式`))
  }
}

/**
 * 导出 multer 实例
 * 单文件上传，最大 2GB（遥感影像通常较大）
 */
export const tiffUpload = multer({
  storage: tiffStorage,
  fileFilter: tiffFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2 GB
    files: 1,
  },
})
