<template>
  <div class="tasks-page">
    <div class="page-header">
      <h2>巡查任务分配</h2>
      <el-button type="primary" size="small" @click="showAssign = true"><el-icon><Plus /></el-icon> 派发任务</el-button>
    </div>

    <!-- 统计 -->
    <div class="stats-row">
      <div class="ts"><span class="tv">{{ tasks.length }}</span><span class="tl">待分配任务</span></div>
      <div class="ts"><span class="tv">{{ assignedCount }}</span><span class="tl">已派发</span></div>
      <div class="ts"><span class="tv">{{ overdueCount }}</span><span class="tl text-warn">超时未接收</span></div>
    </div>

    <el-table :data="tasks" size="small" stripe>
      <el-table-column label="优先级" width="70"><template #default="{ row }"><span :class="`p-${row.priority}`">{{ ['','低','中','高','急'][row.priority] }}</span></template></el-table-column>
      <el-table-column prop="title" label="任务标题" min-width="220" show-overflow-tooltip />
      <el-table-column label="来源" width="100"><template #default="{ row }"><el-tag size="small">{{ row.source }}</el-tag></template></el-table-column>
      <el-table-column label="目标区域" width="140"><template #default="{ row }">{{ row.target_area }}</template></el-table-column>
      <el-table-column label="指派人" width="100"><template #default="{ row }">{{ row.assignee ?? '待分配' }}</template></el-table-column>
      <el-table-column label="截止时间" width="120"><template #default="{ row }"><span :class="{ overdue: isOverdue(row.deadline, row.status) }">{{ row.deadline }}</span></template></el-table-column>
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small" :type="stTag(row.status)">{{ stLabel(row.status) }}</el-tag></template></el-table-column>
    </el-table>

    <!-- 派发对话框 -->
    <el-dialog v-model="showAssign" title="派发巡查任务" width="500px">
      <el-form label-width="80px" size="small">
        <el-form-item label="任务标题"><el-input v-model="assignForm.title" placeholder="如：黄坌镇红色预警区域踏查" /></el-form-item>
        <el-form-item label="目标区域"><el-input v-model="assignForm.area" placeholder="林场/乡镇名称" /></el-form-item>
        <el-form-item label="优先级"><el-radio-group v-model="assignForm.priority"><el-radio :value="2">中</el-radio><el-radio :value="3">高</el-radio><el-radio :value="4">紧急</el-radio></el-radio-group></el-form-item>
        <el-form-item label="指派人"><el-input v-model="assignForm.assignee" placeholder="护林员姓名" /></el-form-item>
        <el-form-item label="截止日期"><el-date-picker v-model="assignForm.deadline" type="date" style="width:100%" /></el-form-item>
      </el-form>
      <template #footer><el-button size="small" @click="showAssign = false">取消</el-button><el-button type="primary" size="small" @click="showAssign = false">派发</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const showAssign = ref(false)
const assignForm = reactive({ title: '', area: '', priority: 3, assignee: '', deadline: '' })

const tasks = ref([
  { title: '黄坌镇红色预警区紧急踏查', source: '预警触发', target_area: '黄坌镇', assignee: '张伟', priority: 4, deadline: '2025-01-20', status: 'assigned' },
  { title: '横石塘镇变色木复核任务', source: 'AI识别', target_area: '横石塘镇', assignee: '李强', priority: 3, deadline: '2025-01-22', status: 'in_progress' },
  { title: '星子镇春季普查（第一轮）', source: '计划任务', target_area: '星子镇', assignee: null, priority: 2, deadline: '2025-03-15', status: 'pending' },
  { title: '太和镇诱捕器检查巡护', source: 'IoT告警', target_area: '太和镇', assignee: '王芳', priority: 2, deadline: '2025-01-25', status: 'assigned' },
  { title: '大坪镇新增疑似点核实', source: 'AI识别', target_area: '大坪镇', assignee: null, priority: 3, deadline: '2025-01-19', status: 'pending' },
  { title: '佛冈县汤塘镇边界普查', source: '计划任务', target_area: '汤塘镇', assignee: '赵敏', priority: 1, deadline: '2025-02-28', status: 'overdue' },
])

const assignedCount = computed(() => tasks.value.filter(t => t.status === 'assigned' || t.status === 'in_progress').length)
const overdueCount = computed(() => tasks.value.filter(t => t.status === 'overdue').length)

function isOverdue(deadline: string, status: string) { return status !== 'completed' && new Date(deadline) < new Date() }
function stLabel(s: string) { return { pending: '待分配', assigned: '已派发', in_progress: '执行中', completed: '已完成', overdue: '超时' }[s] ?? s }
function stTag(s: string) { return { pending: 'info', assigned: 'warning', in_progress: '', completed: 'success', overdue: 'danger' }[s] as any ?? 'info' }
</script>

<style scoped>
.tasks-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.stats-row { display: flex; gap: 12px; margin-bottom: 14px; }
.ts { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 10px 18px; text-align: center; }
.tv { display: block; font-size: 22px; font-weight: 700; color: var(--color-text-primary); }
.tl { font-size: 11px; color: var(--color-text-muted); }
.text-warn { color: #ff9800 !important; }
.p-4 { color: #f44336; font-weight: 600; } .p-3 { color: #ff9800; font-weight: 600; } .p-2 { color: var(--color-accent); } .p-1 { color: var(--color-text-muted); }
.overdue { color: #f44336; font-weight: 600; }
</style>
