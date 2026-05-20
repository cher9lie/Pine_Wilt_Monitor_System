<template>
  <div class="register-page">
    <div class="register-card">
      <div class="register-header">
        <div class="logo-icon"><img src="/logo.png" alt="松海护航" class="register-logo" /></div>
        <h1 class="system-title">松海护航</h1>
        <p class="system-subtitle">用户注册</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="register-form"
        @keyup.enter="handleRegister"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名（字母、数字、下划线）"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>

        <el-form-item prop="real_name">
          <el-input
            v-model="form.real_name"
            placeholder="真实姓名（选填）"
            size="large"
            :prefix-icon="UserFilled"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码（至少 6 位）"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            :prefix-icon="Lock"
            show-password
          />
        </el-form-item>

        <el-button
          type="primary"
          size="large"
          :loading="loading"
          class="register-btn"
          @click="handleRegister"
        >
          {{ loading ? '注册中...' : '注 册' }}
        </el-button>
      </el-form>

      <div class="register-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="login-link">返回登录</router-link>
      </div>

      <div class="register-tip">
        <el-icon><InfoFilled /></el-icon>
        <span>第一个注册的用户将自动成为系统管理员</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock, UserFilled, InfoFilled } from '@element-plus/icons-vue'
import { authApi } from '@/api/auth'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  real_name: '',
  password: '',
  confirmPassword: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 50, message: '用户名长度 3-50 字符', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 100, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (_rule, value, callback) => {
        if (value !== form.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

async function handleRegister() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await authApi.register({
      username: form.username,
      password: form.password,
      real_name: form.real_name || undefined,
    })
    ElMessage.success(res.data.message || '注册成功！')
    // 注册成功后跳转到登录页
    router.push('/login')
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { message?: string } } })
      ?.response?.data?.message ?? '注册失败，请稍后重试'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-page {
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

.register-card {
  width: 400px;
  padding: 36px 36px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.1);
}

.register-header {
  text-align: center;
  margin-bottom: 28px;
}

.logo-icon { margin-bottom: 6px; }

.register-logo { width: 56px; height: 56px; object-fit: contain; }

.system-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-accent);
  text-shadow: 0 0 16px var(--color-accent-glow);
}

.system-subtitle {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.register-form {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.register-btn {
  width: 100%;
  margin-top: 8px;
  height: 42px;
  font-size: 15px;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #00b4d8, #0077b6);
  border: none;
}

.register-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-text-muted);
}

.login-link {
  color: var(--color-accent);
  text-decoration: none;
  margin-left: 4px;
}

.login-link:hover {
  text-decoration: underline;
}

.register-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--color-text-muted);
  background: rgba(0, 212, 255, 0.05);
  padding: 6px 10px;
  border-radius: 4px;
  border: 1px solid rgba(0, 212, 255, 0.15);
}

/* Element Plus 输入框深色适配 */
:deep(.el-input__wrapper) {
  background: var(--color-bg-card);
  border-color: var(--color-border);
  box-shadow: none;
}
:deep(.el-input__inner) { color: var(--color-text-primary); }
:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: var(--color-accent) !important;
  box-shadow: 0 0 0 1px var(--color-accent) !important;
}
</style>
