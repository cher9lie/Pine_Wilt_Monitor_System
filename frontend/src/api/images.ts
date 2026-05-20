import http from './http'
import type { ApiResponse, UploadResponse, InferResponse, ImageRecord, PaginatedResponse } from '@/types'

export const imagesApi = {
  /**
   * 上传 TIFF 遥感影像
   * POST /api/upload/tiff
   */
  uploadTiff: (file: File, sourceType = 'other', onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    form.append('source_type', sourceType)
    return http.post<ApiResponse<UploadResponse>>('/upload/tiff', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 10 * 60 * 1000, // 10 分钟（大文件上传）
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
  },

  /**
   * 触发 AI 推理
   * POST /api/images/:id/infer
   */
  triggerInfer: (imageId: string) =>
    http.post<ApiResponse<InferResponse>>(`/images/${imageId}/infer`),

  /**
   * 获取影像检测结果 GeoJSON
   * GET /api/images/:id/detections
   */
  getDetections: (imageId: string) =>
    http.get<ApiResponse<GeoJSON.FeatureCollection>>(`/images/${imageId}/detections`),

  /**
   * 影像列表
   * GET /api/images
   */
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    http.get<ApiResponse<PaginatedResponse<ImageRecord>>>('/images', { params }),
}
