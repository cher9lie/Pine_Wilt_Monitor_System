import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'
import type { User, TokenPair } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))

  const isLoggedIn = computed(() => !!accessToken.value)
  const isAdmin = computed(() => user.value?.roles.includes('admin') ?? false)

  function setTokens(tokens: TokenPair) {
    accessToken.value = tokens.accessToken
    refreshToken.value = tokens.refreshToken
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
  }

  function clearAuth() {
    user.value = null
    accessToken.value = null
    refreshToken.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password)
    const { user: u, tokens } = res.data.data
    setTokens(tokens)
    // 登录后立即获取完整用户信息（含 allowedMenus）
    await fetchMe()
    return user.value
  }

  async function logout() {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuth()
  }

  async function fetchMe() {
    const res = await authApi.me()
    user.value = res.data.data
    return user.value
  }

  async function silentRefresh(): Promise<string> {
    const rt = refreshToken.value
    if (!rt) throw new Error('No refresh token')
    const res = await authApi.refresh(rt)
    const { tokens } = res.data.data
    setTokens(tokens)
    return tokens.accessToken
  }

  return {
    user, accessToken, refreshToken,
    isLoggedIn, isAdmin,
    login, logout, fetchMe, silentRefresh, clearAuth, setTokens,
  }
})
