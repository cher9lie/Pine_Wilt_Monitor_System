import axios, { type AxiosInstance, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

// ── 请求拦截器：自动注入 Bearer Token ──────────────────────────
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 直接读取，避免循环依赖
    const token = localStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // 链路追踪 ID
    config.headers['X-Trace-ID'] = crypto.randomUUID()
    return config
  },
  (error) => Promise.reject(error)
)

// ── 响应拦截器：处理 401 自动刷新 Token ───────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorCode = error.response?.data?.code

      // Token 过期，尝试静默刷新
      if (errorCode === 'TOKEN_EXPIRED') {
        originalRequest._retry = true

        if (isRefreshing) {
          // 等待刷新完成后重试
          return new Promise((resolve) => {
            refreshQueue.push((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(http(originalRequest))
            })
          })
        }

        isRefreshing = true
        try {
          const authStore = useAuthStore()
          const newToken = await authStore.silentRefresh()
          refreshQueue.forEach((cb) => cb(newToken))
          refreshQueue = []
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return http(originalRequest)
        } catch {
          // 刷新失败，跳转登录
          const authStore = useAuthStore()
          authStore.clearAuth()
          window.location.href = '/login'
          return Promise.reject(error)
        } finally {
          isRefreshing = false
        }
      }

      // 其他 401（Token 无效/已吊销），直接跳转登录
      const authStore = useAuthStore()
      authStore.clearAuth()
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

export default http
