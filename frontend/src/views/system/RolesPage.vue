<template>
  <div class="roles-page">
    <div class="page-header">
      <h2>角色权限管理</h2>
    </div>

    <div class="roles-grid">
      <div v-for="role in roles" :key="role.id" class="role-card" :class="getTierClass(role.name)">
        <div class="role-card-header">
          <span class="role-name">{{ getRoleLabel(role.name) }}</span>
          <el-tag size="small" :type="getTierTagType(role.name)">{{ getTierLabel(role.name) }}</el-tag>
        </div>
        <p class="role-desc">{{ role.description }}</p>
        <div class="role-stats">
          <span class="stat-item">
            <el-icon><User /></el-icon> {{ role.user_count }} 人
          </span>
          <span class="stat-item code-name">{{ role.name }}</span>
        </div>
        <div class="role-menus">
          <span class="menus-label">可访问菜单：</span>
          <div class="menus-list">
            <el-tag v-for="menu in getRoleMenus(role.name)" :key="menu" size="small" type="info" class="menu-tag">
              {{ getMenuLabel(menu) }}
            </el-tag>
            <el-tag v-if="role.name === 'admin'" size="small" type="success" class="menu-tag">全部菜单</el-tag>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { User } from '@element-plus/icons-vue'
import { systemApi, type RoleItem } from '@/api/system'

const roles = ref<RoleItem[]>([])

// 角色→菜单映射（与数据库 permissions 表一致）
const roleMenuMap: Record<string, string[]> = {
  admin: ['*'],
  rs_engineer: ['/dashboard', '/monitoring/upload', '/monitoring/alerts', '/monitoring/annotation', '/monitoring/assessment', '/data/images', '/data/ground', '/data/quality'],
  patrol_officer: ['/dashboard', '/patrol/plan', '/patrol/tracks', '/patrol/workorders', '/biz/report-disaster'],
  forest_manager: ['/dashboard', '/monitoring/alerts', '/monitoring/assessment', '/biz/tasks', '/biz/report-disaster', '/biz/resources', '/patrol/plan', '/patrol/tracks', '/patrol/workorders', '/finance/purchase', '/finance/budget', '/report/datasets', '/report/periodic', '/data/images', '/data/ground'],
  bureau_leader: ['/dashboard', '/monitoring/alerts', '/monitoring/assessment', '/report/datasets', '/report/atlas', '/report/periodic'],
  researcher: ['/dashboard', '/data/images', '/report/datasets'],
  finance_admin: ['/dashboard', '/finance/purchase', '/finance/budget', '/finance/audit'],
  user_admin: ['/dashboard', '/system/users', '/system/roles', '/system/logs', '/system/settings'],
  auditor: ['/dashboard', '/system/logs', '/finance/audit'],
}

const menuLabels: Record<string, string> = {
  '/dashboard': '态势大屏', '/monitoring/upload': '影像上传', '/monitoring/alerts': '预警管理',
  '/monitoring/annotation': '病死木标绘', '/monitoring/assessment': '灾情评估',
  '/data/images': '遥感影像库', '/data/ground': '地面监测', '/data/iot': 'IoT设备', '/data/quality': '数据质量',
  '/biz/tasks': '任务分配', '/biz/report-disaster': '灾情上报', '/biz/resources': '资源调度',
  '/patrol/plan': '巡护规划', '/patrol/tracks': '轨迹记录', '/patrol/workorders': '工单管理',
  '/finance/purchase': '采购管理', '/finance/budget': '预算控制', '/finance/audit': '审计报表',
  '/report/datasets': '数据集', '/report/atlas': '地图集', '/report/periodic': '周期报告',
  '/system/users': '用户管理', '/system/roles': '角色权限', '/system/logs': '日志审计', '/system/settings': '系统设置',
}

function getRoleMenus(name: string): string[] { return roleMenuMap[name] ?? [] }
function getMenuLabel(path: string): string { return menuLabels[path] ?? path }

function getRoleLabel(name: string): string {
  const map: Record<string, string> = {
    admin: '系统管理员', db_admin: '数据库管理员', auditor: '审计员',
    rs_engineer: '遥感工程师', uav_operator: '无人机操作员', patrol_officer: '护林员',
    forest_manager: '林场管理员', user_admin: '用户管理员', finance_admin: '财务管理员',
    trainer: '培训师', bureau_leader: '林业局领导', forestry_station: '森防站',
    insurance_company: '保险公司', researcher: '科研人员', viewer: '查看者',
  }
  return map[name] ?? name
}

function getTierLabel(name: string): string {
  if (['admin', 'db_admin', 'auditor'].includes(name)) return '管控层'
  if (['rs_engineer', 'uav_operator', 'patrol_officer'].includes(name)) return '操作层'
  if (['forest_manager', 'user_admin', 'finance_admin', 'trainer'].includes(name)) return '管理层'
  if (['bureau_leader', 'forestry_station', 'insurance_company'].includes(name)) return '决策层'
  return '访问层'
}

function getTierClass(name: string): string {
  if (['admin', 'db_admin', 'auditor'].includes(name)) return 'tier-admin'
  if (['rs_engineer', 'uav_operator', 'patrol_officer'].includes(name)) return 'tier-tech'
  if (['forest_manager', 'user_admin', 'finance_admin', 'trainer'].includes(name)) return 'tier-mgmt'
  if (['bureau_leader', 'forestry_station', 'insurance_company'].includes(name)) return 'tier-decision'
  return 'tier-access'
}

function getTierTagType(name: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  if (['admin', 'db_admin', 'auditor'].includes(name)) return 'danger'
  if (['rs_engineer', 'uav_operator', 'patrol_officer'].includes(name)) return 'success'
  if (['forest_manager', 'user_admin', 'finance_admin', 'trainer'].includes(name)) return 'warning'
  if (['bureau_leader', 'forestry_station', 'insurance_company'].includes(name)) return ''
  return 'info'
}

onMounted(async () => {
  try {
    const res = await systemApi.getRoles()
    roles.value = res.data.data
  } catch { /* ignore */ }
})
</script>

<style scoped>
.roles-page { padding: 20px; overflow-y: auto; height: 100%; }
.page-header { margin-bottom: 20px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}

.role-card {
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 16px;
  transition: border-color 0.2s;
}
.role-card:hover { border-color: var(--color-accent); }

.tier-admin { border-left: 3px solid #f44336; }
.tier-tech { border-left: 3px solid #00e676; }
.tier-mgmt { border-left: 3px solid #ff9800; }
.tier-decision { border-left: 3px solid #00d4ff; }
.tier-access { border-left: 3px solid #8bacc8; }

.role-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.role-name { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.role-desc { font-size: 12px; color: var(--color-text-muted); margin-bottom: 10px; }
.role-stats { display: flex; gap: 16px; font-size: 12px; color: var(--color-text-secondary); margin-bottom: 10px; }
.stat-item { display: flex; align-items: center; gap: 4px; }
.code-name { font-family: monospace; color: var(--color-text-muted); }
.menus-label { font-size: 11px; color: var(--color-text-muted); }
.menus-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.menu-tag { font-size: 10px; }
</style>
