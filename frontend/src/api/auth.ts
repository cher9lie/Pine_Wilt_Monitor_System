import http from './http'
import type { ApiResponse, TokenPair, User } from '@/types'

export const authApi = {
  login: (username: string, password: string) =>
    http.post<ApiResponse<{ user: User; tokens: TokenPair }>>('/auth/login', {
      username,
      password,
    }),

  register: (data: { username: string; password: string; real_name?: string; email?: string }) =>
    http.post<ApiResponse<{ id: string; username: string; role: string }>>('/auth/register', data),

  refresh: (refreshToken: string) =>
    http.post<ApiResponse<{ tokens: TokenPair }>>('/auth/refresh', { refreshToken }),

  logout: () => http.post('/auth/logout'),

  me: () => http.get<ApiResponse<User>>('/auth/me'),
}
