<template>
  <div class="login-page">
    <div class="login-card">
      <!-- Logo 区域 -->
      <div class="login-header">
        <div class="logo-icon"><img src="/logo.png" alt="松海护航" class="login-logo" /></div>
        <h1 class="system-title">松海护航</h1>
        <p class="system-subtitle">松材线虫监测预警平台</p>
      </div>

      <!-- 登录表单 -->
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @keyup.enter="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="login-btn"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </el-button>
      </el-form>

      <p class="login-hint">示例账号（点击快速填入）：</p>
      <div class="demo-accounts">
        <div class="demo-row" v-for="acc in demoAccounts" :key="acc.username" @click="fillDemo(acc)">
          <span class="demo-user">{{ acc.username }}</span>
          <span class="demo-role">{{ acc.label }}</span>
        </div>
      </div>
      <div class="register-link">
        <span>没有账号？</span>
        <router-link to="/register">立即注册</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({ username: '', password: '' })

const demoAccounts = [
  { username: 'admin',      password: 'Admin@2024', label: '系统管理员（全部权限）' },
  { username: 'engineer',   password: 'Test@2024',  label: '遥感工程师（监测+数据）' },
  { username: 'manager',    password: 'Test@2024',  label: '林场管理员（业务+巡护）' },
  { username: 'leader',     password: 'Test@2024',  label: '林业局领导（决策+报告）' },
  { username: 'researcher', password: 'Test@2024',  label: '科研人员（脱敏数据）' },
]

function fillDemo(acc: typeof demoAccounts[0]) {
  form.username = acc.username
  form.password = acc.password
}

const rules: FormRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form.username, form.password)
    ElMessage.success('登录成功')
    await router.push('/dashboard')
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? '登录失败，请检查用户名和密码'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-base);
  background-image:
    radial-gradient(ellipse at 20% 50%, rgba(0, 212, 255, 0.06) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(0, 100, 200, 0.08) 0%, transparent 50%);
}

.login-card {
  width: 380px;
  padding: 40px 36px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-icon {
  margin-bottom: 8px;
}

.login-logo {
  width: 64px;
  height: 64px;
  object-fit: contain;
}

.system-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow: 0 0 16px var(--color-accent-glow);
  letter-spacing: 2px;
}

.system-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.login-btn {
  width: 100%;
  margin-top: 8px;
  height: 44px;
  font-size: 16px;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #00b4d8, #0077b6);
  border: none;
}

.login-hint {
  text-align: center;
  color: var(--color-text-muted);
  font-size: 12px;
  margin-top: 16px;
  margin-bottom: 8px;
}

.demo-accounts {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.demo-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 12px;
}

.demo-row:hover {
  border-color: var(--color-accent);
  background: rgba(0, 212, 255, 0.06);
}

.demo-user {
  color: var(--color-accent);
  font-weight: 600;
  font-family: monospace;
}

.demo-role {
  color: var(--color-text-muted);
  font-size: 11px;
}

.register-link {
  text-align: center;
  margin-top: 10px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.register-link a {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 4px;
}

.register-link a:hover {
  text-decoration: underline;
}

/* Element Plus 输入框深色适配 */
:deep(.el-input__wrapper) {
  background: var(--color-bg-card);
  border-color: var(--color-border);
  box-shadow: none;
}
:deep(.el-input__inner) {
  color: var(--color-text-primary);
}
:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 1px var(--color-accent) !important;
}
</style>
