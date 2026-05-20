import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/register',
      name: 'Register',
      component: () => import('@/views/auth/RegisterView.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      children: [
        { path: '', redirect: '/dashboard' },

        // ── 态势大屏 ──
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/dashboard/DashboardView.vue'),
          meta: { title: '态势大屏', requiresAuth: true },
        },

        // ── 监测预警 ──
        {
          path: 'monitoring/upload',
          name: 'MonitoringUpload',
          component: () => import('@/views/monitoring/UploadPage.vue'),
          meta: { title: '影像上传与识别', requiresAuth: true },
        },
        {
          path: 'monitoring/alerts',
          name: 'MonitoringAlerts',
          component: () => import('@/views/monitoring/AlertsPage.vue'),
          meta: { title: '预警管理', requiresAuth: true },
        },
        {
          path: 'monitoring/annotation',
          name: 'MonitoringAnnotation',
          component: () => import('@/views/monitoring/AnnotationPage.vue'),
          meta: { title: '病死木标绘', requiresAuth: true },
        },
        {
          path: 'monitoring/assessment',
          name: 'MonitoringAssessment',
          component: () => import('@/views/monitoring/AssessmentPage.vue'),
          meta: { title: '灾情评估', requiresAuth: true },
        },

        // ── 数据管理 ──
        {
          path: 'data/images',
          name: 'DataImages',
          component: () => import('@/views/data-management/ImagesPage.vue'),
          meta: { title: '遥感影像库', requiresAuth: true },
        },
        {
          path: 'data/ground',
          name: 'DataGround',
          component: () => import('@/views/data-management/GroundDataPage.vue'),
          meta: { title: '地面监测数据', requiresAuth: true },
        },
        {
          path: 'data/iot',
          name: 'DataIot',
          component: () => import('@/views/data-management/IotPage.vue'),
          meta: { title: 'IoT设备管理', requiresAuth: true },
        },
        {
          path: 'data/quality',
          name: 'DataQuality',
          component: () => import('@/views/data-management/QualityPage.vue'),
          meta: { title: '数据质量控制', requiresAuth: true },
        },

        // ── 业务管理 ──
        {
          path: 'biz/tasks',
          name: 'BizTasks',
          component: () => import('@/views/biz-management/TasksPage.vue'),
          meta: { title: '巡查任务分配', requiresAuth: true },
        },
        {
          path: 'biz/report-disaster',
          name: 'BizDisasterReport',
          component: () => import('@/views/biz-management/DisasterReportPage.vue'),
          meta: { title: '灾情上报', requiresAuth: true },
        },
        {
          path: 'biz/resources',
          name: 'BizResources',
          component: () => import('@/views/biz-management/ResourcesPage.vue'),
          meta: { title: '资源调度', requiresAuth: true },
        },

        // ── 巡护巡查 ──
        {
          path: 'patrol/plan',
          name: 'PatrolPlan',
          component: () => import('@/views/patrol/PlanPage.vue'),
          meta: { title: '日常巡护规划', requiresAuth: true },
        },
        {
          path: 'patrol/tracks',
          name: 'PatrolTracks',
          component: () => import('@/views/patrol/TracksPage.vue'),
          meta: { title: '轨迹记录', requiresAuth: true },
        },
        {
          path: 'patrol/workorders',
          name: 'PatrolWorkorders',
          component: () => import('@/views/patrol/WorkordersPage.vue'),
          meta: { title: '工单管理', requiresAuth: true },
        },

        // ── 财务管理 ──
        {
          path: 'finance/purchase',
          name: 'FinancePurchase',
          component: () => import('@/views/finance/PurchasePage.vue'),
          meta: { title: '采购管理', requiresAuth: true },
        },
        {
          path: 'finance/budget',
          name: 'FinanceBudget',
          component: () => import('@/views/finance/BudgetPage.vue'),
          meta: { title: '预算控制', requiresAuth: true },
        },
        {
          path: 'finance/audit',
          name: 'FinanceAudit',
          component: () => import('@/views/finance/AuditPage.vue'),
          meta: { title: '审计报表', requiresAuth: true },
        },

        // ── 出图报告 ──
        {
          path: 'report/datasets',
          name: 'ReportDatasets',
          component: () => import('@/views/report/DatasetsPage.vue'),
          meta: { title: '数据集管理', requiresAuth: true },
        },
        {
          path: 'report/atlas',
          name: 'ReportAtlas',
          component: () => import('@/views/report/AtlasPage.vue'),
          meta: { title: '地图集制作', requiresAuth: true },
        },
        {
          path: 'report/periodic',
          name: 'ReportPeriodic',
          component: () => import('@/views/report/PeriodicPage.vue'),
          meta: { title: '周期报告', requiresAuth: true },
        },

        // ── 系统管理 ──
        {
          path: 'system/users',
          name: 'SystemUsers',
          component: () => import('@/views/system/UsersPage.vue'),
          meta: { title: '用户管理', requiresAuth: true },
        },
        {
          path: 'system/roles',
          name: 'SystemRoles',
          component: () => import('@/views/system/RolesPage.vue'),
          meta: { title: '角色权限', requiresAuth: true },
        },
        {
          path: 'system/logs',
          name: 'SystemLogs',
          component: () => import('@/views/system/LogsPage.vue'),
          meta: { title: '日志审计', requiresAuth: true },
        },
        {
          path: 'system/settings',
          name: 'SystemSettings',
          component: () => import('@/views/system/SettingsPage.vue'),
          meta: { title: '系统设置', requiresAuth: true },
        },

        // ── 个人中心 ──
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/views/profile/ProfilePage.vue'),
          meta: { title: '个人中心', requiresAuth: true },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/',
    },
  ],
})

// ── 路由守卫 ──
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  // 不需要认证的页面
  if (to.meta.requiresAuth === false) {
    if (to.path === '/login' && authStore.isLoggedIn) return next('/dashboard')
    return next()
  }

  // 需要认证
  if (!authStore.isLoggedIn) return next('/login')

  // 获取用户信息
  if (!authStore.user) {
    try {
      await authStore.fetchMe()
    } catch {
      authStore.clearAuth()
      return next('/login')
    }
  }

  next()
})

export default router
