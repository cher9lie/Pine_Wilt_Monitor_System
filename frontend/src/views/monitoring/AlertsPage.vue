<template>
  <div class="alerts-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card red">
        <div class="stat-val">{{ stats.red_count }}</div>
        <div class="stat-label">红色预警</div>
      </div>
      <div class="stat-card orange">
        <div class="stat-val">{{ stats.orange_count }}</div>
        <div class="stat-label">橙色预警</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-val">{{ stats.yellow_count }}</div>
        <div class="stat-label">黄色预警</div>
      </div>
      <div class="stat-card green">
        <div class="stat-val">{{ stats.green_count }}</div>
        <div class="stat-label">绿色/正常</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-val">{{ stats.total_disease_trees }}</div>
        <div class="stat-label">疑似疫木总数(株)</div>
      </div>
      <div class="stat-card accent">
        <div class="stat-val">{{ stats.total_affected_area.toFixed?.(1) ?? stats.total_affected_area }}</div>
        <div class="stat-label">受灾面积(公顷)</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-select v-model="filterLevel" placeholder="预警等级" size="small" clearable @change="loadAlerts" class="filter-select">
        <el-option label="红色" value="red" />
        <el-option label="橙色" value="orange" />
        <el-option label="黄色" value="yellow" />
        <el-option label="绿色" value="green" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="状态" size="small" clearable @change="loadAlerts" class="filter-select">
        <el-option label="活跃" value="active" />
        <el-option label="已处置" value="resolved" />
      </el-select>
      <el-button size="small" @click="loadAlerts">刷新</el-button>
      <el-tag v-if="isMock" type="info" size="small" class="mock-tag">演示数据</el-tag>
    </div>

    <!-- 预警列表 -->
    <el-table :data="alerts" v-loading="loading" class="alert-table" size="small" stripe @row-click="handleRowClick">
      <el-table-column label="等级" width="80">
        <template #default="{ row }">
          <span class="level-badge" :class="`level-${row.level}`">
            {{ levelLabel(row.level) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="name" label="预警区域" min-width="200" />
      <el-table-column label="林场" width="140">
        <template #default="{ row }">{{ row.farm_name ?? '-' }}</template>
      </el-table-column>
      <el-table-column prop="disease_count" label="疫木数(株)" width="110" sortable />
      <el-table-column label="受灾面积(ha)" width="120" sortable>
        <template #default="{ row }">{{ row.affected_area?.toFixed(1) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'danger' : 'success'" size="small">
            {{ row.status === 'active' ? '活跃' : '已处置' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="触发时间" width="160">
        <template #default="{ row }">
          {{ new Date(row.triggered_at).toLocaleString('zh-CN') }}
        </template>
      </el-table-column>
      <el-table-column label="位置" width="160">
        <template #default="{ row }">
          <span v-if="row.geojson" class="coord-text">
            {{ row.geojson.coordinates[0].toFixed(4) }}, {{ row.geojson.coordinates[1].toFixed(4) }}
          </span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 详情抽屉 -->
    <el-drawer v-model="showDetail" title="预警详情" size="400px">
      <div v-if="selectedAlert" class="detail-content">
        <div class="detail-header">
          <span class="level-badge large" :class="`level-${selectedAlert.level}`">{{ levelLabel(selectedAlert.level) }}</span>
          <h3>{{ selectedAlert.name }}</h3>
        </div>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="林场">{{ selectedAlert.farm_name ?? '-' }}</el-descriptions-item>
          <el-descriptions-item label="疫木数量">{{ selectedAlert.disease_count }} 株</el-descriptions-item>
          <el-descriptions-item label="受灾面积">{{ selectedAlert.affected_area }} 公顷</el-descriptions-item>
          <el-descriptions-item label="当前状态">{{ selectedAlert.status === 'active' ? '活跃中' : '已处置' }}</el-descriptions-item>
          <el-descriptions-item label="触发时间">{{ new Date(selectedAlert.triggered_at).toLocaleString('zh-CN') }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.resolved_at" label="处置完成">{{ new Date(selectedAlert.resolved_at).toLocaleString('zh-CN') }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.geojson" label="中心坐标">
            {{ selectedAlert.geojson.coordinates[0].toFixed(6) }}, {{ selectedAlert.geojson.coordinates[1].toFixed(6) }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button v-if="selectedAlert.status === 'active'" type="primary" size="small">生成巡查工单</el-button>
          <el-button size="small">导出报告</el-button>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { alertsApi, type AlertItem, type AlertStats } from '@/api/alerts'

const alerts = ref<AlertItem[]>([])
const loading = ref(false)
const isMock = ref(false)
const filterLevel = ref('')
const filterStatus = ref('')

const stats = reactive<AlertStats>({
  active_count: 0, red_count: 0, orange_count: 0, yellow_count: 0, green_count: 0,
  total_disease_trees: 0, total_affected_area: 0,
})

const showDetail = ref(false)
const selectedAlert = ref<AlertItem | null>(null)

async function loadStats() {
  try {
    const res = await alertsApi.getStats()
    Object.assign(stats, res.data.data)
  } catch { /* ignore */ }
}

async function loadAlerts() {
  loading.value = true
  try {
    const res = await alertsApi.getAlerts({
      level: filterLevel.value || undefined,
      status: filterStatus.value || undefined,
    })
    alerts.value = res.data.data.items
    isMock.value = !!(res.data.data as Record<string, unknown>).is_mock
  } catch { ElMessage.error('加载预警数据失败') }
  finally { loading.value = false }
}

function handleRowClick(row: AlertItem) {
  selectedAlert.value = row
  showDetail.value = true
}

function levelLabel(level: string): string {
  return { red: '红色', orange: '橙色', yellow: '黄色', green: '绿色' }[level] ?? level
}

onMounted(() => { loadStats(); loadAlerts() })
</script>

<style scoped>
.alerts-page { padding: 20px; height: 100%; display: flex; flex-direction: column; overflow-y: auto; }

.stats-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 18px; }
.stat-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; text-align: center; }
.stat-card.red { border-top: 3px solid #f44336; }
.stat-card.orange { border-top: 3px solid #ff9800; }
.stat-card.yellow { border-top: 3px solid #ffeb3b; }
.stat-card.green { border-top: 3px solid #00e676; }
.stat-card.accent { border-top: 3px solid #00d4ff; }
.stat-val { font-size: 26px; font-weight: 700; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.stat-label { font-size: 11px; color: var(--color-text-muted); margin-top: 4px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; }
.filter-select { width: 120px; }
.mock-tag { margin-left: auto; }

.alert-table { flex: 1; }
.level-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-weight: 600; }
.level-badge.large { font-size: 14px; padding: 4px 12px; margin-bottom: 8px; }
.level-red { background: rgba(244,67,54,0.15); color: #f44336; }
.level-orange { background: rgba(255,152,0,0.15); color: #ff9800; }
.level-yellow { background: rgba(255,235,59,0.15); color: #c8b900; }
.level-green { background: rgba(0,230,118,0.15); color: #00e676; }

.coord-text { font-family: monospace; font-size: 11px; color: var(--color-text-muted); }

.detail-content { padding: 0 4px; }
.detail-header { margin-bottom: 16px; }
.detail-header h3 { font-size: 16px; color: var(--color-text-primary); margin-top: 6px; }
.detail-actions { margin-top: 20px; display: flex; gap: 10px; }

:deep(.el-table) { --el-table-bg-color: var(--color-bg-panel); --el-table-tr-bg-color: var(--color-bg-panel); --el-table-header-bg-color: var(--color-bg-card); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
:deep(.el-table__row) { cursor: pointer; }
:deep(.el-table__row:hover td) { background: var(--color-bg-hover) !important; }
:deep(.el-select .el-input__wrapper) { background: var(--color-bg-card); border-color: var(--color-border); }
:deep(.el-drawer) { background: var(--color-bg-panel) !important; }
:deep(.el-drawer__title) { color: var(--color-text-primary) !important; }
:deep(.el-descriptions) { --el-descriptions-item-bordered-label-background: var(--color-bg-card); }
</style>
