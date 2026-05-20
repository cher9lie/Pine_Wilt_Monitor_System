// ============================================================
// 全局类型定义
// ============================================================

export interface User {
  id: string
  username: string
  real_name: string | null
  email: string | null
  phone: string | null
  department: string | null
  roles: string[]
  data_level: 1 | 2 | 3
  spatial_boundary: GeoJSON.Polygon | null
  allowedMenus: string[]  // ['*'] = all, or ['/dashboard', '/monitoring/upload', ...]
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// 影像记录
export interface ImageRecord {
  id: string
  filename: string
  local_path: string
  relative_path: string
  source_type: string
  status: 'uploaded' | 'preprocessing' | 'ready' | 'inferred' | 'failed'
  bbox_geojson: string | null
  created_at: string
}

// 上传响应
export interface UploadResponse {
  image_id: string
  filename: string
  stored_filename: string
  local_path: string
  relative_path: string
  source_type: string
  size_bytes: number
  status: string
}

// 推理响应
export interface InferResponse {
  image_id: string
  detection_count: number
  persisted_count: number
  bbox: [number, number, number, number] | null  // [minLng, minLat, maxLng, maxLat]
  geojson: GeoJSON.FeatureCollection
}

// 病死木检测点属性
export interface DiseaseTreeProperties {
  id: string
  confidence: number
  class_label: 'dead_tree' | 'discolored' | 'suspected'
  severity: 1 | 2 | 3
  status: 'pending' | 'confirmed' | 'false_positive' | 'cleared'
  detected_at: string
}

// 预警等级
export type AlertLevel = 'green' | 'yellow' | 'orange' | 'red'

// 植被指数数据点（时序）
export interface VegetationIndexPoint {
  date: string
  ndvi?: number
  lai?: number
  sr?: number
}

// API 统一响应格式
export interface ApiResponse<T = unknown> {
  code: string
  message?: string
  data: T
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    page_size: number
    total: number
    total_pages: number
  }
}
