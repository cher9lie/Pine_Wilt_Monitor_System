import http from './http'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface AlertItem {
  id: string
  name: string
  level: 'green' | 'yellow' | 'orange' | 'red'
  disease_count: number
  affected_area: number
  status: 'active' | 'resolved' | 'archived'
  triggered_at: string
  resolved_at: string | null
  farm_name?: string
  geojson?: { type: string; coordinates: number[] }
}

export interface AlertStats {
  active_count: number
  red_count: number
  orange_count: number
  yellow_count: number
  green_count: number
  total_disease_trees: number
  total_affected_area: number
  is_mock?: boolean
}

export interface AssessmentItem {
  farm_name: string
  admin_code: string
  disease_count: number
  dead_tree_count: number
  discolored_count: number
  confirmed_count: number
  total_area_ha: number
  risk_level: number
  ndvi_change: number
  status?: string
}

export const alertsApi = {
  getAlerts: (params?: { page?: number; page_size?: number; level?: string; status?: string }) =>
    http.get<ApiResponse<PaginatedResponse<AlertItem> & { is_mock?: boolean }>>('/alerts', { params }),

  getStats: () =>
    http.get<ApiResponse<AlertStats>>('/alerts/stats'),

  getAssessment: () =>
    http.get<ApiResponse<AssessmentItem[]>>('/alerts/assessment'),
}
