<template>
  <div class="profile-page">
    <div class="profile-header">
      <el-avatar :size="72" class="profile-avatar">
        {{ authStore.user?.real_name?.[0] ?? authStore.user?.username?.[0] ?? 'U' }}
      </el-avatar>
      <div class="profile-info">
        <h2>{{ authStore.user?.real_name ?? authStore.user?.username }}</h2>
        <p class="profile-role">
          <el-tag v-for="role in (authStore.user?.roles ?? [])" :key="role" size="small" type="info" class="role-tag">
            {{ roleLabel(role) }}
          </el-tag>
        </p>
        <p class="profile-meta">用户名：{{ authStore.user?.username }} | 数据级别：L{{ authStore.user?.data_level }}</p>
      </div>
    </div>

    <el-divider />

    <div class="profile-sections">
      <!-- 基本信息 -->
      <div class="section-card">
        <h3 class="section-title">📋 基本信息</h3>
        <el-form label-width="80px" class="profile-form">
          <el-form-item label="用户名">
            <el-input :model-value="authStore.user?.username" disabled />
          </el-form-item>
          <el-form-item label="真实姓名">
            <el-input v-model="profileForm.real_name" placeholder="请输入真实姓名" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="profileForm.phone" placeholder="请输入手机号" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="saveProfile">保存修改</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 修改密码 -->
      <div class="section-card">
        <h3 class="section-title">🔐 修改密码</h3>
        <el-form label-width="100px" class="profile-form">
          <el-form-item label="当前密码">
            <el-input type="password" v-model="passwordForm.current" show-password placeholder="请输入当前密码" />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input type="password" v-model="passwordForm.newPwd" show-password placeholder="请输入新密码（至少6位）" />
          </el-form-item>
          <el-form-item label="确认新密码">
            <el-input type="password" v-model="passwordForm.confirm" show-password placeholder="请再次输入新密码" />
          </el-form-item>
          <el-form-item>
            <el-button type="warning" size="small" @click="changePassword">更新密码</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 我的任务 -->
      <div class="section-card">
        <h3 class="section-title">📌 我的待办任务</h3>
        <el-empty description="暂无待办任务" :image-size="60" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const profileForm = reactive({
  real_name: authStore.user?.real_name ?? '',
  email: authStore.user?.email ?? '',
  phone: authStore.user?.phone ?? '',
})

const passwordForm = reactive({
  current: '',
  newPwd: '',
  confirm: '',
})

async function saveProfile() {
  try {
    const { default: http } = await import('@/api/http')
    await http.patch('/auth/profile', {
      real_name: profileForm.real_name || null,
      email: profileForm.email || null,
      phone: profileForm.phone || null,
    })
    const { ElMessage } = await import('element-plus')
    ElMessage.success('个人信息已更新')
    await authStore.fetchMe()
  } catch { const { ElMessage } = await import('element-plus'); ElMessage.error('保存失败') }
}

async function changePassword() {
  const { ElMessage } = await import('element-plus')
  if (!passwordForm.current || !passwordForm.newPwd) return ElMessage.warning('请填写完整')
  if (passwordForm.newPwd !== passwordForm.confirm) return ElMessage.warning('两次密码不一致')
  if (passwordForm.newPwd.length < 6) return ElMessage.warning('新密码至少6位')

  try {
    const { default: http } = await import('@/api/http')
    await http.post('/auth/change-password', {
      current_password: passwordForm.current,
      new_password: passwordForm.newPwd,
    })
    ElMessage.success('密码修改成功，下次登录使用新密码')
    Object.assign(passwordForm, { current: '', newPwd: '', confirm: '' })
  } catch (err: any) { ElMessage.error(err.response?.data?.message ?? '修改失败') }
}

function roleLabel(role: string): string {
  const map: Record<string, string> = {
    admin: '系统管理员',
    forest_manager: '林场管理员',
    patrol_officer: '护林员',
    analyst: '遥感分析师',
    viewer: '查看者',
  }
  return map[role] ?? role
}
</script>

<style scoped>
.profile-page { padding: 32px; max-width: 800px; }
.profile-header { display: flex; align-items: center; gap: 20px; }
.profile-avatar { background: var(--color-accent); color: #000; font-size: 28px; font-weight: 700; }
.profile-info h2 { font-size: 20px; color: var(--color-text-primary); }
.profile-role { margin-top: 6px; display: flex; gap: 6px; flex-wrap: wrap; }
.role-tag { font-size: 11px; }
.profile-meta { font-size: 12px; color: var(--color-text-muted); margin-top: 4px; }
.profile-sections { display: flex; flex-direction: column; gap: 20px; }
.section-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 20px; }
.section-title { font-size: 15px; color: var(--color-text-primary); margin-bottom: 16px; }
.profile-form { max-width: 400px; }
:deep(.el-input__wrapper) { background: var(--color-bg-card); border-color: var(--color-border); }
:deep(.el-input__inner) { color: var(--color-text-primary); }
:deep(.el-form-item__label) { color: var(--color-text-secondary); }
</style>
