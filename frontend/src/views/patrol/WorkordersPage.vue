<template>
  <div class="workorders-page">
    <div class="page-header">
      <h2>工单管理</h2>
      <el-button type="primary" size="small" @click="showCreate = true"><el-icon><Plus /></el-icon> 新建工单</el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="wo-stat"><span class="ws-val">{{ stats.total_orders }}</span><span class="ws-label">总工单</span></div>
      <div class="wo-stat active"><span class="ws-val">{{ stats.active_orders }}</span><span class="ws-label">进行中</span></div>
      <div class="wo-stat pending"><span class="ws-val">{{ stats.pending_orders }}</span><span class="ws-label">待处理</span></div>
      <div class="wo-stat done"><span class="ws-val">{{ stats.completed_orders }}</span><span class="ws-label">已完成</span></div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="状态" size="small" clearable @change="load" class="fw-120">
        <el-option label="待处理" value="pending" />
        <el-option label="已分配" value="assigned" />
        <el-option label="进行中" value="in_progress" />
        <el-option label="已完成" value="completed" />
      </el-select>
      <el-select v-model="filterType" placeholder="类型" size="small" clearable @change="load" class="fw-120">
        <el-option label="巡查" value="patrol" />
        <el-option label="除治" value="treatment" />
        <el-option label="核实" value="verification" />
        <el-option label="维护" value="maintenance" />
      </el-select>
      <el-tag v-if="isMock" type="info" size="small">演示数据</el-tag>
    </div>

    <!-- 工单表格 -->
    <el-table :data="orders" v-loading="loading" size="small" stripe class="wo-table">
      <el-table-column label="优先级" width="70">
        <template #default="{ row }">
          <span class="priority-dot" :class="`p-${row.priority}`">{{ ['','低','中','高','急'][row.priority] }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTag(row.type)">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="statusTag(row.status)">{{ statusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行人" width="100">
        <template #default="{ row }">{{ row.assignee_real_name ?? '待分配' }}</template>
      </el-table-column>
      <el-table-column label="截止时间" width="120">
        <template #default="{ row }">
          <span :class="{ overdue: isOverdue(row) }">{{ row.deadline ? new Date(row.deadline).toLocaleDateString('zh-CN') : '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button v-if="row.status === 'assigned'" size="small" text type="primary" @click="changeStatus(row.id, 'in_progress')">开始执行</el-button>
          <el-button v-if="row.status === 'in_progress'" size="small" text type="success" @click="changeStatus(row.id, 'completed')">完成</el-button>
          <el-button v-if="['pending','assigned'].includes(row.status)" size="small" text type="danger" @click="changeStatus(row.id, 'cancelled')">取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新建工单对话框 -->
    <el-dialog v-model="showCreate" title="新建工单" width="500px">
      <el-form :model="createForm" label-width="80px" size="small">
        <el-form-item label="标题" required>
          <el-input v-model="createForm.title" placeholder="简要描述任务内容" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="createForm.type" style="width:100%">
            <el-option label="巡查" value="patrol" />
            <el-option label="除治" value="treatment" />
            <el-option label="核实" value="verification" />
            <el-option label="设备维护" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="createForm.priority">
            <el-radio :value="1">低</el-radio>
            <el-radio :value="2">中</el-radio>
            <el-radio :value="3">高</el-radio>
            <el-radio :value="4">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止时间">
          <el-date-picker v-model="createForm.deadline" type="date" style="width:100%" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="createForm.description" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button size="small" @click="showCreate = false">取消</el-button>
        <el-button type="primary" size="small" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { patrolApi, type WorkorderItem, type PatrolStats } from '@/api/patrol'

const orders = ref<WorkorderItem[]>([])
const loading = ref(false)
const isMock = ref(false)
const filterStatus = ref('')
const filterType = ref('')
const showCreate = ref(false)
const stats = reactive<PatrolStats>({ total_orders: 0, completed_orders: 0, active_orders: 0, pending_orders: 0 })

const createForm = reactive({ title: '', type: 'patrol', priority: 2, description: '', deadline: '' })

async function load() {
  loading.value = true
  try {
    const [ordersRes, statsRes] = await Promise.all([
      patrolApi.getWorkorders({ status: filterStatus.value || undefined, type: filterType.value || undefined }),
      patrolApi.getStats(),
    ])
    orders.value = ordersRes.data.data.items
    isMock.value = !!(ordersRes.data.data as Record<string, unknown>).is_mock
    Object.assign(stats, statsRes.data.data)
  } catch { ElMessage.error('加载工单失败') }
  finally { loading.value = false }
}

async function handleCreate() {
  if (!createForm.title) return ElMessage.warning('请填写标题')
  try {
    await patrolApi.createWorkorder(createForm)
    ElMessage.success('工单创建成功')
    showCreate.value = false
    Object.assign(createForm, { title: '', type: 'patrol', priority: 2, description: '', deadline: '' })
    load()
  } catch (err: any) { ElMessage.error(err.response?.data?.message ?? '创建失败') }
}

async function changeStatus(id: string, status: string) {
  if (isMock.value) return ElMessage.info('演示数据不支持状态变更')
  const label = { in_progress: '开始执行', completed: '完成', cancelled: '取消' }[status] ?? status
  await ElMessageBox.confirm(`确定将工单标记为「${label}」？`, '确认')
  try {
    await patrolApi.updateWorkorderStatus(id, status)
    ElMessage.success('状态已更新')
    load()
  } catch (err: any) { ElMessage.error(err.response?.data?.message ?? '操作失败') }
}

function isOverdue(row: WorkorderItem): boolean {
  if (!row.deadline || row.status === 'completed' || row.status === 'cancelled') return false
  return new Date(row.deadline) < new Date()
}

function typeLabel(t: string) { return { patrol: '巡查', treatment: '除治', verification: '核实', maintenance: '维护' }[t] ?? t }
function typeTag(t: string): '' | 'success' | 'warning' | 'danger' | 'info' { return { patrol: '', treatment: 'danger', verification: 'warning', maintenance: 'info' }[t] as any ?? 'info' }
function statusLabel(s: string) { return { pending: '待处理', assigned: '已分配', in_progress: '执行中', completed: '已完成', cancelled: '已取消' }[s] ?? s }
function statusTag(s: string): '' | 'success' | 'warning' | 'danger' | 'info' { return { pending: 'info', assigned: 'warning', in_progress: '', completed: 'success', cancelled: 'danger' }[s] as any ?? 'info' }

onMounted(load)
</script>

<style scoped>
.workorders-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.stats-row { display: flex; gap: 12px; margin-bottom: 14px; }
.wo-stat { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 10px 16px; text-align: center; min-width: 90px; }
.wo-stat.active { border-top: 3px solid #00d4ff; }
.wo-stat.pending { border-top: 3px solid #ff9800; }
.wo-stat.done { border-top: 3px solid #00e676; }
.ws-val { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-primary); }
.ws-label { font-size: 11px; color: var(--color-text-muted); }

.filter-bar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; }
.fw-120 { width: 120px; }

.wo-table { flex: 1; }
.priority-dot { font-size: 12px; font-weight: 600; }
.p-4 { color: #f44336; } .p-3 { color: #ff9800; } .p-2 { color: #00d4ff; } .p-1 { color: #8bacc8; }
.overdue { color: #f44336; font-weight: 600; }

:deep(.el-table) { --el-table-bg-color: var(--color-bg-panel); --el-table-tr-bg-color: var(--color-bg-panel); --el-table-header-bg-color: var(--color-bg-card); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
:deep(.el-table__row:hover td) { background: var(--color-bg-hover) !important; }
:deep(.el-dialog) { background: var(--color-bg-panel); border: 1px solid var(--color-border); }
:deep(.el-dialog__title) { color: var(--color-text-primary); }
:deep(.el-input__wrapper) { background: var(--color-bg-card); border-color: var(--color-border); }
:deep(.el-input__inner) { color: var(--color-text-primary); }
:deep(.el-textarea__inner) { background: var(--color-bg-card) !important; border-color: var(--color-border) !important; color: var(--color-text-primary) !important; }
:deep(.el-select .el-input__wrapper) { background: var(--color-bg-card); }
</style>
