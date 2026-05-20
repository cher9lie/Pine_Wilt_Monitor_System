import http from './http'
import type { ApiResponse, PaginatedResponse } from '@/types'

export interface UserItem {
  id: string
  username: string
  real_name: string | null
  email: string | null
  phone: string | null
  department: string | null
  status: 'active' | 'frozen' | 'archived'
  data_level: 1 | 2 | 3
  roles: string[]
  last_login_at: string | null
  created_at: string
}

export interface RoleItem {
  id: string
  name: string
  description: string
  is_temp: boolean
  user_count: number
  created_at: string
}

export interface AuditLogItem {
  id: number
  action: string
  resource: string | null
  ip_address: string | null
  username: string | null
  real_name: string | null
  created_at: string
}

export const systemApi = {
  // 用户管理
  getUsers: (params?: { page?: number; page_size?: number; search?: string; status?: string }) =>
    http.get<ApiResponse<PaginatedResponse<UserItem>>>('/system/users', { params }),

  createUser: (data: {
    username: string; password: string; real_name?: string;
    email?: string; phone?: string; department?: string;
    data_level?: number; role_names: string[]
  }) => http.post<ApiResponse<{ id: string }>>('/system/users', data),

  updateUserStatus: (userId: string, status: 'active' | 'frozen' | 'archived') =>
    http.patch<ApiResponse<null>>(`/system/users/${userId}/status`, { status }),

  updateUserRoles: (userId: string, role_names: string[]) =>
    http.put<ApiResponse<null>>(`/system/users/${userId}/roles`, { role_names }),

  // 角色
  getRoles: () => http.get<ApiResponse<RoleItem[]>>('/system/roles'),

  // 审计日志
  getLogs: (params?: { page?: number; page_size?: number; user_id?: string; action?: string }) =>
    http.get<ApiResponse<PaginatedResponse<AuditLogItem>>>('/system/logs', { params }),
}
