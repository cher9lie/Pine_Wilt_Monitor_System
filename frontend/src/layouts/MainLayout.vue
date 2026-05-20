<template>
  <div class="main-layout">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-left">
        <span class="logo-text"><img src="/logo.png" alt="logo" class="logo-img" /> 松海护航</span>
        <span class="system-name">松材线虫监测预警平台</span>
      </div>
      <div class="header-center">
        <span class="current-time">{{ currentTime }}</span>
      </div>
      <div class="header-right">
        <el-dropdown @command="handleCommand">
          <div class="user-info">
            <el-avatar :size="28" class="user-avatar">
              {{ authStore.user?.real_name?.[0] ?? authStore.user?.username?.[0] ?? 'U' }}
            </el-avatar>
            <span class="username">{{ authStore.user?.real_name ?? authStore.user?.username }}</span>
            <el-icon><ArrowDown /></el-icon>
          </div>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile">
                <el-icon><User /></el-icon> 个人中心
              </el-dropdown-item>
              <el-dropdown-item divided command="logout">
                <el-icon><SwitchButton /></el-icon> 退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <div class="main-body">
      <!-- 左侧导航菜单 -->
      <aside class="sidebar" :class="{ collapsed: isCollapsed }">
        <el-menu
          :default-active="activeMenu"
          :collapse="isCollapsed"
          :router="true"
          background-color="#0f1629"
          text-color="#8bacc8"
          active-text-color="#00d4ff"
          class="side-menu"
        >
          <el-menu-item index="/dashboard" v-if="hasMenuAccess('/dashboard')">
            <el-icon><Monitor /></el-icon>
            <template #title>态势大屏</template>
          </el-menu-item>

          <el-sub-menu index="monitoring" v-if="hasSubMenuAccess(['/monitoring/upload','/monitoring/alerts','/monitoring/annotation','/monitoring/assessment'])">
            <template #title>
              <el-icon><View /></el-icon>
              <span>监测预警</span>
            </template>
            <el-menu-item index="/monitoring/upload" v-if="hasMenuAccess('/monitoring/upload')">影像上传与识别</el-menu-item>
            <el-menu-item index="/monitoring/alerts" v-if="hasMenuAccess('/monitoring/alerts')">预警管理</el-menu-item>
            <el-menu-item index="/monitoring/annotation" v-if="hasMenuAccess('/monitoring/annotation')">病死木标绘</el-menu-item>
            <el-menu-item index="/monitoring/assessment" v-if="hasMenuAccess('/monitoring/assessment')">灾情评估</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="data" v-if="hasSubMenuAccess(['/data/images','/data/ground','/data/iot','/data/quality'])">
            <template #title>
              <el-icon><Folder /></el-icon>
              <span>数据管理</span>
            </template>
            <el-menu-item index="/data/images" v-if="hasMenuAccess('/data/images')">遥感影像库</el-menu-item>
            <el-menu-item index="/data/ground" v-if="hasMenuAccess('/data/ground')">地面监测数据</el-menu-item>
            <el-menu-item index="/data/iot" v-if="hasMenuAccess('/data/iot')">IoT设备管理</el-menu-item>
            <el-menu-item index="/data/quality" v-if="hasMenuAccess('/data/quality')">数据质量控制</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="biz" v-if="hasSubMenuAccess(['/biz/tasks','/biz/report-disaster','/biz/resources'])">
            <template #title>
              <el-icon><Tickets /></el-icon>
              <span>业务管理</span>
            </template>
            <el-menu-item index="/biz/tasks" v-if="hasMenuAccess('/biz/tasks')">巡查任务分配</el-menu-item>
            <el-menu-item index="/biz/report-disaster" v-if="hasMenuAccess('/biz/report-disaster')">灾情上报</el-menu-item>
            <el-menu-item index="/biz/resources" v-if="hasMenuAccess('/biz/resources')">资源调度</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="patrol" v-if="hasSubMenuAccess(['/patrol/plan','/patrol/tracks','/patrol/workorders'])">
            <template #title>
              <el-icon><MapLocation /></el-icon>
              <span>巡护巡查</span>
            </template>
            <el-menu-item index="/patrol/plan" v-if="hasMenuAccess('/patrol/plan')">日常巡护规划</el-menu-item>
            <el-menu-item index="/patrol/tracks" v-if="hasMenuAccess('/patrol/tracks')">轨迹记录</el-menu-item>
            <el-menu-item index="/patrol/workorders" v-if="hasMenuAccess('/patrol/workorders')">工单管理</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="finance" v-if="hasSubMenuAccess(['/finance/purchase','/finance/budget','/finance/audit'])">
            <template #title>
              <el-icon><Money /></el-icon>
              <span>财务管理</span>
            </template>
            <el-menu-item index="/finance/purchase" v-if="hasMenuAccess('/finance/purchase')">采购管理</el-menu-item>
            <el-menu-item index="/finance/budget" v-if="hasMenuAccess('/finance/budget')">预算控制</el-menu-item>
            <el-menu-item index="/finance/audit" v-if="hasMenuAccess('/finance/audit')">审计报表</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="report" v-if="hasSubMenuAccess(['/report/datasets','/report/atlas','/report/periodic'])">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>出图报告</span>
            </template>
            <el-menu-item index="/report/datasets" v-if="hasMenuAccess('/report/datasets')">数据集管理</el-menu-item>
            <el-menu-item index="/report/atlas" v-if="hasMenuAccess('/report/atlas')">地图集制作</el-menu-item>
            <el-menu-item index="/report/periodic" v-if="hasMenuAccess('/report/periodic')">周期报告</el-menu-item>
          </el-sub-menu>

          <el-sub-menu index="system" v-if="hasSubMenuAccess(['/system/users','/system/roles','/system/logs','/system/settings'])">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/system/users" v-if="hasMenuAccess('/system/users')">用户管理</el-menu-item>
            <el-menu-item index="/system/roles" v-if="hasMenuAccess('/system/roles')">角色权限</el-menu-item>
            <el-menu-item index="/system/logs" v-if="hasMenuAccess('/system/logs')">日志审计</el-menu-item>
            <el-menu-item index="/system/settings" v-if="hasMenuAccess('/system/settings')">系统设置</el-menu-item>
          </el-sub-menu>
        </el-menu>

        <!-- 折叠按钮 -->
        <div class="collapse-btn" @click="isCollapsed = !isCollapsed">
          <el-icon>
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="main-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  ArrowDown, User, SwitchButton, Monitor, View, Folder,
  Tickets, MapLocation, Money, Document, Setting,
  Fold, Expand,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const currentTime = ref('')
const isCollapsed = ref(false)
let timer: ReturnType<typeof setInterval>

const activeMenu = computed(() => route.path)

// 动态权限过滤：根据 user.allowedMenus 控制菜单可见性
function hasMenuAccess(path: string): boolean {
  const menus = authStore.user?.allowedMenus
  if (!menus || menus.length === 0) {
    // 如果 allowedMenus 还没加载（或为空），admin 角色默认全部显示
    return authStore.user?.roles?.includes('admin') ?? false
  }
  if (menus.includes('*')) return true  // admin 全部可见
  return menus.includes(path)
}

// 子菜单组是否有至少一个可见项
function hasSubMenuAccess(paths: string[]): boolean {
  // admin 角色直接全部显示
  if (authStore.user?.roles?.includes('admin')) return true
  return paths.some(p => hasMenuAccess(p))
}

function updateTime() {
  currentTime.value = new Date().toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

async function handleCommand(cmd: string) {
  if (cmd === 'logout') {
    await authStore.logout()
    ElMessage.success('已退出登录')
    router.push('/login')
  } else if (cmd === 'profile') {
    router.push('/profile')
  }
}

onMounted(() => { updateTime(); timer = setInterval(updateTime, 1000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.main-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.top-header {
  height: var(--header-height);
  background: var(--color-bg-panel);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 100;
}

.header-left { display: flex; align-items: center; gap: 12px; }
.logo-text { font-size: 18px; font-weight: 700; color: var(--color-accent); text-shadow: 0 0 10px var(--color-accent-glow); display: flex; align-items: center; gap: 8px; }
.system-name { font-size: 14px; color: var(--color-text-secondary); border-left: 1px solid var(--color-border); padding-left: 12px; }

:deep(.logo-img) { width: 28px; height: 28px; object-fit: contain; }
.header-center { font-size: 13px; color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.header-right { display: flex; align-items: center; }
.user-info { display: flex; align-items: center; gap: 8px; cursor: pointer; color: var(--color-text-primary); padding: 4px 8px; border-radius: 4px; }
.user-info:hover { background: var(--color-bg-hover); }
.user-avatar { background: var(--color-accent); color: #000; font-weight: 700; font-size: 12px; }
.username { font-size: 13px; }

.main-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 侧边栏 */
.sidebar {
  width: var(--sidebar-width);
  background: var(--color-bg-panel);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  flex-shrink: 0;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.side-menu {
  flex: 1;
  border-right: none !important;
  overflow-y: auto;
  overflow-x: hidden;
}

:deep(.el-menu) {
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 42px;
  line-height: 42px;
  font-size: 13px;
}

:deep(.el-menu-item.is-active) {
  background: rgba(0, 212, 255, 0.1) !important;
  border-right: 3px solid var(--color-accent);
}

:deep(.el-sub-menu .el-menu-item) {
  padding-left: 52px !important;
  font-size: 12px;
  height: 38px;
  line-height: 38px;
}

.collapse-btn {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-muted);
  border-top: 1px solid var(--color-border);
  transition: color 0.2s;
}

.collapse-btn:hover {
  color: var(--color-accent);
}

/* 主内容区 */
.main-content {
  flex: 1;
  overflow: auto;
  background: var(--color-bg-base);
}
</style>
