<template>
  <div class="logs-page">
    <div class="page-header">
      <h2>日志审计</h2>
    </div>

    <div class="filter-bar">
      <el-input v-model="filterAction" placeholder="按操作类型筛选" size="small" clearable class="action-input" @keyup.enter="loadLogs" />
      <el-button size="small" @click="loadLogs">查询</el-button>
    </div>

    <el-table :data="logs" v-loading="loading" class="log-table" size="small" stripe>
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column label="用户" width="140">
        <template #default="{ row }">
          <span class="log-user">{{ row.real_name ?? row.username ?? '系统' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="action" label="操作" width="180">
        <template #default="{ row }">
          <el-tag size="small" :type="getActionType(row.action)">{{ row.action }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="resource" label="资源" min-width="200" />
      <el-table-column prop="ip_address" label="IP" width="140">
        <template #default="{ row }">
          <span class="ip-cell">{{ row.ip_address ?? '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="时间" width="180">
        <template #default="{ row }">
          {{ new Date(row.created_at).toLocaleString('zh-CN') }}
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="50"
        :total="totalCount"
        layout="total, prev, pager, next"
        small
        @current-change="loadLogs"
      />
    </div>

    <!-- 暂无日志时显示模拟数据说明 -->
    <div v-if="!loading && logs.length === 0" class="empty-hint">
      <el-empty description="暂无审计日志">
        <template #description>
          <p>系统运行后，用户的登录、数据操作、权限变更等行为将自动记录在此</p>
        </template>
      </el-empty>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { systemApi, type AuditLogItem } from '@/api/system'

const logs = ref<AuditLogItem[]>([])
const loading = ref(false)
const currentPage = ref(1)
const totalCount = ref(0)
const filterAction = ref('')

async function loadLogs() {
  loading.value = true
  try {
    const res = await systemApi.getLogs({
      page: currentPage.value,
      page_size: 50,
      action: filterAction.value || undefined,
    })
    logs.value = res.data.data.items
    totalCount.value = res.data.data.pagination.total
  } catch { ElMessage.error('加载日志失败') }
  finally { loading.value = false }
}

function getActionType(action: string): '' | 'success' | 'warning' | 'danger' | 'info' {
  if (action.includes('login')) return 'success'
  if (action.includes('delete') || action.includes('frozen')) return 'danger'
  if (action.includes('update') || action.includes('change')) return 'warning'
  return 'info'
}

onMounted(loadLogs)
</script>

<style scoped>
.logs-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; }
.action-input { width: 240px; }
.log-table { flex: 1; }
.log-user { font-weight: 500; color: var(--color-text-primary); }
.ip-cell { font-family: monospace; font-size: 12px; color: var(--color-text-muted); }
.pagination-bar { margin-top: 12px; display: flex; justify-content: flex-end; }
.empty-hint { flex: 1; display: flex; align-items: center; justify-content: center; }

:deep(.el-table) { --el-table-bg-color: var(--color-bg-panel); --el-table-tr-bg-color: var(--color-bg-panel); --el-table-header-bg-color: var(--color-bg-card); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
:deep(.el-table__row:hover td) { background: var(--color-bg-hover) !important; }
:deep(.el-input__wrapper) { background: var(--color-bg-card); border-color: var(--color-border); }
:deep(.el-input__inner) { color: var(--color-text-primary); }
:deep(.el-pagination) { --el-pagination-bg-color: transparent; --el-pagination-text-color: var(--color-text-secondary); }
</style>
