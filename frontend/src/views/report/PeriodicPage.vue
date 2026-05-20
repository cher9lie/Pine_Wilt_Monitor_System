<template>
  <div class="periodic-page">
    <div class="page-header">
      <h2>周期报告</h2>
      <el-button type="primary" size="small"><el-icon><Document /></el-icon> 立即生成</el-button>
    </div>

    <el-table :data="reports" size="small" stripe>
      <el-table-column prop="title" label="报告名称" min-width="260" />
      <el-table-column label="类型" width="120"><template #default="{ row }"><el-tag size="small" :type="reportTypeTag(row.type)">{{ row.type }}</el-tag></template></el-table-column>
      <el-table-column prop="period" label="周期" width="180" />
      <el-table-column prop="author" label="生成人" width="100" />
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small" :type="row.status === 'published' ? 'success' : 'warning'">{{ row.status === 'published' ? '已发布' : '草稿' }}</el-tag></template></el-table-column>
      <el-table-column label="生成时间" width="140"><template #default="{ row }">{{ row.created_at }}</template></el-table-column>
      <el-table-column label="操作" width="160">
        <template #default><el-button size="small" text type="primary">查看</el-button><el-button size="small" text>导出PDF</el-button></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Document } from '@element-plus/icons-vue'

const reports = ref([
  { title: '2025年第2周松材线虫病监测简报', type: '周报', period: '2025-01-06 ~ 2025-01-12', author: '系统', status: 'published', created_at: '2025-01-13' },
  { title: '2025年第3周松材线虫病监测简报', type: '周报', period: '2025-01-13 ~ 2025-01-19', author: '系统', status: 'draft', created_at: '2025-01-18' },
  { title: '2024年12月阶段性灾情评估报告', type: '月报', period: '2024-12-01 ~ 2024-12-31', author: '森防站', status: 'published', created_at: '2025-01-03' },
  { title: '阳山县黄坌镇重大疫情预警通报', type: '预警通报', period: '2024-11-15', author: '森防站', status: 'published', created_at: '2024-11-15' },
  { title: '2024年度清远市松材线虫病防治年鉴（草稿）', type: '年鉴', period: '2024-01-01 ~ 2024-12-31', author: '林业局', status: 'draft', created_at: '2025-01-15' },
])

function reportTypeTag(t: string) { return { '周报': 'info', '月报': '', '预警通报': 'danger', '年鉴': 'warning' }[t] as any ?? 'info' }
</script>

<style scoped>
.periodic-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
</style>
