<template>
  <div class="report-page">
    <div class="page-header">
      <h2>灾情上报</h2>
      <el-button type="primary" size="small" @click="showForm = true"><el-icon><Plus /></el-icon> 新建上报</el-button>
    </div>

    <el-table :data="reports" size="small" stripe>
      <el-table-column prop="report_no" label="编号" width="130"><template #default="{ row }"><span class="code-text">{{ row.report_no }}</span></template></el-table-column>
      <el-table-column prop="title" label="上报标题" min-width="200" />
      <el-table-column prop="reporter" label="上报人" width="90" />
      <el-table-column prop="location" label="位置" width="140" />
      <el-table-column label="病害类型" width="100"><template #default="{ row }"><el-tag size="small" :type="row.severity === '重' ? 'danger' : row.severity === '中' ? 'warning' : 'info'">{{ row.disease_type }}</el-tag></template></el-table-column>
      <el-table-column label="疫木数(株)" width="100"><template #default="{ row }">{{ row.tree_count }}</template></el-table-column>
      <el-table-column label="附件" width="70"><template #default="{ row }">{{ row.attachments }} 张</template></el-table-column>
      <el-table-column label="审批状态" width="100"><template #default="{ row }"><el-tag size="small" :type="approvalTag(row.approval)">{{ row.approval }}</el-tag></template></el-table-column>
      <el-table-column prop="reported_at" label="上报时间" width="140" />
    </el-table>

    <!-- 新建上报对话框 -->
    <el-dialog v-model="showForm" title="灾情上报" width="520px">
      <el-form label-width="80px" size="small">
        <el-form-item label="标题"><el-input v-model="form.title" placeholder="简述灾情" /></el-form-item>
        <el-form-item label="位置"><el-input v-model="form.location" placeholder="林场/小班/GPS坐标" /></el-form-item>
        <el-form-item label="病害类型"><el-select v-model="form.type" style="width:100%"><el-option label="枯死木" value="dead" /><el-option label="变色木" value="discolored" /><el-option label="疑似" value="suspected" /></el-select></el-form-item>
        <el-form-item label="疫木数量"><el-input-number v-model="form.count" :min="1" /></el-form-item>
        <el-form-item label="现场照片"><el-upload action="#" :auto-upload="false" list-type="picture-card" :limit="9"><el-icon><Plus /></el-icon></el-upload></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.note" type="textarea" :rows="2" /></el-form-item>
      </el-form>
      <template #footer><el-button size="small" @click="showForm = false">取消</el-button><el-button type="primary" size="small" @click="showForm = false">提交上报</el-button></template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const showForm = ref(false)
const form = reactive({ title: '', location: '', type: 'dead', count: 1, note: '' })

const reports = ref([
  { report_no: 'DR-2025-001', title: '黄坌镇松林大面积枯死', reporter: '张伟', location: '黄坌镇7号林班', disease_type: '枯死木', severity: '重', tree_count: 87, attachments: 12, approval: '已通过', reported_at: '2025-01-16 09:30' },
  { report_no: 'DR-2025-002', title: '横石塘变色松树新增', reporter: '李强', location: '横石塘3号小班', disease_type: '变色木', severity: '中', tree_count: 23, attachments: 6, approval: '已通过', reported_at: '2025-01-17 14:20' },
  { report_no: 'DR-2025-003', title: '星子镇疑似病害点', reporter: '王芳', location: '星子镇12号小班', disease_type: '疑似', severity: '轻', tree_count: 5, attachments: 3, approval: '审核中', reported_at: '2025-01-18 10:15' },
  { report_no: 'DR-2025-004', title: '太和镇边缘新发现', reporter: '赵敏', location: '太和镇北部', disease_type: '变色木', severity: '中', tree_count: 11, attachments: 4, approval: '待审核', reported_at: '2025-01-18 16:40' },
])

function approvalTag(s: string) { return { '已通过': 'success', '审核中': 'warning', '待审核': 'info', '已驳回': 'danger' }[s] as any ?? 'info' }
</script>

<style scoped>
.report-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.code-text { font-family: monospace; color: var(--color-accent); font-size: 12px; }
</style>
