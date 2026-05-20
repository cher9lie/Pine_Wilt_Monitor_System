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
        <span class="top-link" @click="showAbout = true">平台简介</span>
        <span class="top-link" @click="showSupport = true">技术支持</span>
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

    <!-- ══════ 平台简介弹窗 ══════ -->
    <div v-if="showAbout" class="modal-overlay" @click.self="showAbout = false">
      <div class="modal-card">
        <div class="modal-header">
          <img src="/logo.png" alt="logo" class="modal-logo" />
          <div>
            <h2 class="modal-title">松海护航</h2>
            <p class="modal-subtitle">松材线虫监测预警平台</p>
          </div>
          <button class="modal-close" @click="showAbout = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="about-section">
            <h4>平台概述</h4>
            <p>松海护航是一套面向林业主管部门、护林员、科研院所和政府部门的全栈 Web GIS 智能监测预警平台。系统以空天地一体化数据采集为基础，融合深度学习遥感识别、RBAC 空间权限管控和全链条业务闭环，为松材线虫病的早期发现、精准定位和高效处置提供技术支撑。</p>
          </div>
          <div class="about-features">
            <div class="af-item"><span class="af-icon">🛰️</span><div><strong>多源遥感监测</strong><p>支持高分二号、Sentinel-2、无人机DOM等多源影像接入，实现大范围松林健康状态周期性普查。</p></div></div>
            <div class="af-item"><span class="af-icon">🤖</span><div><strong>AI 智能识别</strong><p>基于 YOLOv8 深度学习模型，实现单木级变色树冠实例分割，识别精度达 91%+，支持 ARM64 CPU 部署。</p></div></div>
            <div class="af-item"><span class="af-icon">🗺️</span><div><strong>空间态势大屏</strong><p>MapLibre GL JS 驱动的 WebGIS 大屏，实时展示疫木分布、预警等级、巡查轨迹和处置进度。</p></div></div>
            <div class="af-item"><span class="af-icon">🔐</span><div><strong>多级权限管控</strong><p>基于 RBAC 的五层权限体系，支持林场管理员、护林员、林业局领导等 15 种角色的精细化权限隔离。</p></div></div>
            <div class="af-item"><span class="af-icon">📋</span><div><strong>全链条业务闭环</strong><p>从预警发现到工单派发、现场核查、处置验收，实现松材线虫病防治全流程数字化管理。</p></div></div>
            <div class="af-item"><span class="af-icon">📊</span><div><strong>智能报告生成</strong><p>自动生成周报、月报、年鉴，支持地图集制作和多维财务审计，大幅降低人工统计工作量。</p></div></div>
          </div>
          <div class="about-version">
            <span>版本：v1.0.0</span>
            <span>|</span>
            <span>部署架构：ARM64 aarch64</span>
            <span>|</span>
            <span>数据库：PostgreSQL 15 + PostGIS 3.4</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════ 技术支持弹窗 ══════ -->
    <div v-if="showSupport" class="modal-overlay" @click.self="showSupport = false">
      <div class="modal-card modal-card-sm">
        <div class="modal-header">
          <h2 class="modal-title">技术支持</h2>
          <button class="modal-close" @click="showSupport = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="support-list">
            <div class="sl-item"><span class="sl-icon">📞</span><div><strong>服务热线</strong><p>400-8888-6789（工作日 9:00–18:00）</p></div></div>
            <div class="sl-item"><span class="sl-icon">📧</span><div><strong>技术邮箱</strong><p>service@pinewilt-guard.cn</p></div></div>
            <div class="sl-item"><span class="sl-icon">🏢</span><div><strong>运营单位</strong><p>松海护航（赣州）生态科技有限公司</p></div></div>
            <div class="sl-item"><span class="sl-icon">📍</span><div><strong>地址</strong><p>江西省赣州市章贡区林业科技园 A栋 8楼</p></div></div>
            <div class="sl-item"><span class="sl-icon">📖</span><div><strong>用户手册</strong><p>登录后点击右上角「帮助」查看完整操作文档</p></div></div>
            <div class="sl-item"><span class="sl-icon">🔧</span><div><strong>系统维护</strong><p>每周日 02:00–04:00 为例行维护时间，期间服务可能短暂中断</p></div></div>
          </div>
        </div>
      </div>
    </div>
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
const showAbout = ref(false)
const showSupport = ref(false)

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

/* ══════ 弹窗样式（与首页深色主题一致）══════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-card {
  background: #0f1629;
  border: 1px solid #1e3a5f;
  border-radius: 10px;
  width: 680px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-card-sm { width: 480px; }

.modal-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #1e3a5f;
  position: sticky;
  top: 0;
  background: #0f1629;
  z-index: 1;
}

.modal-logo { width: 40px; height: 40px; object-fit: contain; }

.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #00d4ff;
  text-shadow: 0 0 12px rgba(0, 212, 255, 0.4);
}

.modal-subtitle { font-size: 12px; color: #8bacc8; margin-top: 2px; }

.modal-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #4a6a8a;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: color 0.2s;
}
.modal-close:hover { color: #e8f4fd; }

.modal-body { padding: 20px 24px 24px; }

/* 平台简介 */
.about-section { margin-bottom: 18px; }
.about-section h4 { font-size: 14px; font-weight: 600; color: #00d4ff; margin-bottom: 8px; }
.about-section p { font-size: 13px; color: #8bacc8; line-height: 1.7; }

.about-features { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px; }
.af-item { display: flex; gap: 10px; padding: 12px; background: #141e35; border: 1px solid #1e3a5f; border-radius: 6px; }
.af-icon { font-size: 22px; flex-shrink: 0; }
.af-item strong { font-size: 13px; color: #e8f4fd; display: block; margin-bottom: 4px; }
.af-item p { font-size: 12px; color: #8bacc8; line-height: 1.5; margin: 0; }

.about-version { display: flex; gap: 12px; font-size: 11px; color: #4a6a8a; padding-top: 12px; border-top: 1px solid #1e3a5f; }

/* 技术支持 */
.support-list { display: flex; flex-direction: column; gap: 12px; }
.sl-item { display: flex; gap: 12px; padding: 12px; background: #141e35; border: 1px solid #1e3a5f; border-radius: 6px; }
.sl-icon { font-size: 22px; flex-shrink: 0; }
.sl-item strong { font-size: 13px; color: #e8f4fd; display: block; margin-bottom: 3px; }
.sl-item p { font-size: 12px; color: #8bacc8; margin: 0; }
</style>
