import http from './http'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface WorkorderItem {
  id: string
  type: 'patrol' | 'treatment' | 'verification' | 'maintenance'
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled'
  priority: 1 | 2 | 3 | 4
  title: string
  description: string | null
  assignee_name: string | null
  assignee_real_name: string | null
  creator_name: string | null
  deadline: string | null
  completed_at: string | null
  created_at: string
}

export interface TrackItem {
  id: string
  username: string
  real_name: string | null
  started_at: string
  ended_at: string | null
  distance_km: number | null
  point_count: number | null
  track_geojson: GeoJSON.LineString | null
}

export interface PatrolStats {
  total_orders: number
  completed_orders: number
  active_orders: number
  pending_orders: number
  total_tracks?: number
  total_distance_km?: number
  is_mock?: boolean
}

export const patrolApi = {
  getWorkorders: (params?: { page?: number; page_size?: number; status?: string; type?: string }) =>
    http.get<ApiResponse<PaginatedResponse<WorkorderItem> & { is_mock?: boolean }>>('/patrol/workorders', { params }),

  createWorkorder: (data: { type: string; title: string; description?: string; priority?: number; assignee_id?: string; deadline?: string }) =>
    http.post<ApiResponse<{ id: string }>>('/patrol/workorders', data),

  updateWorkorderStatus: (id: string, status: string) =>
    http.patch<ApiResponse<null>>(`/patrol/workorders/${id}/status`, { status }),

  getTracks: (params?: { page?: number; page_size?: number }) =>
    http.get<ApiResponse<PaginatedResponse<TrackItem> & { is_mock?: boolean }>>('/patrol/tracks', { params }),

  getStats: () =>
    http.get<ApiResponse<PatrolStats>>('/patrol/stats'),
}
