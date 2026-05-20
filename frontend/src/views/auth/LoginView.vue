<template>
  <div class="login-page">
    <!-- ══════ 顶部白色导航条 ══════ -->
    <header class="top-bar">
      <div class="top-left">
        <img src="/logo.png" alt="logo" class="top-logo" />
        <span class="top-title">松海护航</span>
        <span class="top-subtitle">松材线虫监测预警平台</span>
      </div>
      <div class="top-right">
        <span class="top-link">平台简介</span>
        <span class="top-link">技术支持</span>
      </div>
    </header>

    <!-- ══════ 中间主体区（视频背景 + 登录框）══════ -->
    <main class="main-area">
      <!-- 背景视频（循环，静音） -->
      <video
        ref="bgVideo"
        class="bg-video"
        :src="currentVideo"
        autoplay
        muted
        loop
        playsinline
        @ended="switchVideo"
      />
      <!-- 视频叠加暗色遮罩 -->
      <div class="video-overlay" />

      <!-- 登录框（偏左放置） -->
      <div class="login-card">
        <div class="card-header">
          <h2 class="card-title">用户登录</h2>
          <p class="card-desc">欢迎使用松材线虫智能监测预警平台</p>
        </div>

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
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="form.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="rememberMe" label="记住账号" size="small" />
            <router-link to="/register" class="register-link">注册新账号</router-link>
          </div>

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

        <!-- 示例账号快捷填入 -->
        <div class="demo-section">
          <div class="demo-title">演示账号 <span class="demo-hint">（点击快速填入）</span></div>
          <div class="demo-grid">
            <div v-for="acc in demoAccounts" :key="acc.username" class="demo-item" @click="fillDemo(acc)">
              <span class="demo-name">{{ acc.username }}</span>
              <span class="demo-role">{{ acc.label }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- ══════ 底部深灰信息条 ══════ -->
    <footer class="bottom-bar">
      <div class="footer-left">
        <span>© 2025 松海护航技术团队 版权所有</span>
        <span class="footer-sep">|</span>
        <span>ICP备案号：赣ICP备2025001234号-1</span>
      </div>
      <div class="footer-right">
        <span>技术支持：400-8888-6789</span>
        <span class="footer-sep">|</span>
        <span>service@pinewilt-guard.cn</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const rememberMe = ref(false)
const bgVideo = ref<HTMLVideoElement>()

// ── 视频切换逻辑（3个视频循环） ───────────────────────────────
const videos = ['/videos/bg-video-1.mp4', '/videos/bg-video-2.mp4', '/videos/bg-video-3.mp4']
const currentVideoIdx = ref(Math.floor(Math.random() * videos.length))
const currentVideo = ref(videos[currentVideoIdx.value])

function switchVideo() {
  currentVideoIdx.value = (currentVideoIdx.value + 1) % videos.length
  currentVideo.value = videos[currentVideoIdx.value]
}

// ── 表单逻辑 ─────────────────────────────────────────────────
const form = reactive({ username: '', password: '' })

const demoAccounts = [
  { username: 'admin',      password: 'Admin@2024', label: '系统管理员' },
  { username: 'engineer',   password: 'Test@2024',  label: '遥感工程师' },
  { username: 'manager',    password: 'Test@2024',  label: '林场管理员' },
  { username: 'leader',     password: 'Test@2024',  label: '林业局领导' },
  { username: 'researcher', password: 'Test@2024',  label: '科研人员' },
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

onMounted(() => {
  // 如果视频文件不存在也不报错，背景会显示纯色兜底
})
</script>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

/* ══════ 顶部白色导航条 ══════ */
.top-bar {
  height: 60px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.top-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.top-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.top-title {
  font-size: 22px;
  font-weight: 800;
  color: #1a5c3a;
  letter-spacing: 2px;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
}

.top-subtitle {
  font-size: 13px;
  color: #666;
  border-left: 1px solid #ddd;
  padding-left: 12px;
  margin-left: 4px;
}

.top-right {
  display: flex;
  gap: 20px;
}

.top-link {
  font-size: 13px;
  color: #555;
  cursor: pointer;
  transition: color 0.2s;
}

.top-link:hover {
  color: #1a5c3a;
}

/* ══════ 中间主体区 ══════ */
.main-area {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 8%;
  overflow: hidden;
}

/* 背景视频 */
.bg-video {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 20, 10, 0.35);
  z-index: 1;
}

/* 如果视频加载失败，显示渐变背景兜底 */
.main-area::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0d3320 0%, #1a4a2e 40%, #0a2918 100%);
  z-index: -1;
}

/* ══════ 登录卡片 ══════ */
.login-card {
  position: relative;
  z-index: 5;
  width: 400px;
  background: #ffffff;
  border-radius: 12px;
  padding: 36px 32px 28px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1);
}

.card-header {
  margin-bottom: 24px;
}

.card-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.card-desc {
  font-size: 13px;
  color: #888;
}

.login-form {
  margin-bottom: 0;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.register-link {
  font-size: 13px;
  color: #1a5c3a;
  text-decoration: none;
}

.register-link:hover {
  text-decoration: underline;
}

.login-btn {
  width: 100%;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 4px;
  background: linear-gradient(135deg, #1a7a4c, #0d5c35);
  border: none;
  border-radius: 6px;
}

.login-btn:hover {
  background: linear-gradient(135deg, #1e8f58, #12704a);
}

/* 示例账号 */
.demo-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.demo-title {
  font-size: 12px;
  color: #999;
  margin-bottom: 8px;
}

.demo-hint {
  color: #bbb;
}

.demo-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.demo-item {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: #f8f9fa;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
}

.demo-item:hover {
  border-color: #1a5c3a;
  background: #f0f7f4;
}

.demo-name {
  font-size: 12px;
  font-weight: 600;
  color: #1a5c3a;
  font-family: monospace;
}

.demo-role {
  font-size: 11px;
  color: #999;
}

/* ══════ 底部深灰信息条 ══════ */
.bottom-bar {
  height: 44px;
  background: #2c2c2c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  flex-shrink: 0;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #999;
}

.footer-sep {
  color: #555;
}

/* ══════ Element Plus 白底表单样式覆盖 ══════ */
:deep(.el-input__wrapper) {
  background: #f8f9fa !important;
  border-color: #e0e0e0 !important;
  box-shadow: none !important;
}

:deep(.el-input__wrapper:hover) {
  border-color: #1a5c3a !important;
}

:deep(.el-input__wrapper.is-focus) {
  border-color: #1a5c3a !important;
  box-shadow: 0 0 0 1px rgba(26, 92, 58, 0.2) !important;
}

:deep(.el-input__inner) {
  color: #333 !important;
}

:deep(.el-input__inner::placeholder) {
  color: #bbb !important;
}

:deep(.el-checkbox__label) {
  color: #666 !important;
  font-size: 13px !important;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #1a5c3a !important;
  border-color: #1a5c3a !important;
}

:deep(.el-form-item__error) {
  color: #e53935;
}
</style>
