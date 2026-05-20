<template>
  <div class="datasets-page">
    <div class="page-header">
      <h2>数据集管理</h2>
      <el-button type="primary" size="small"><el-icon><Plus /></el-icon> 新建数据集</el-button>
    </div>

    <el-table :data="datasets" size="small" stripe>
      <el-table-column prop="name" label="数据集名称" min-width="220" />
      <el-table-column prop="type" label="类型" width="120"><template #default="{ row }"><el-tag size="small">{{ row.type }}</el-tag></template></el-table-column>
      <el-table-column prop="region" label="覆盖区域" width="140" />
      <el-table-column prop="time_range" label="时间范围" width="180" />
      <el-table-column label="大小" width="80"><template #default="{ row }">{{ row.size_gb }} GB</template></el-table-column>
      <el-table-column label="状态" width="90">
        <template #default="{ row }"><el-tag size="small" :type="row.status === 'ready' ? 'success' : 'info'">{{ row.status === 'ready' ? '就绪' : '打包中' }}</el-tag></template>
      </el-table-column>
      <el-table-column label="创建时间" width="140"><template #default="{ row }">{{ row.created_at }}</template></el-table-column>
      <el-table-column label="操作" width="140">
        <template #default><el-button size="small" text type="primary">预览</el-button><el-button size="small" text>下载</el-button></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const datasets = ref([
  { name: '2024年秋季普查影像集(阳山县)', type: '卫星影像', region: '阳山县全域', time_range: '2024-09-01 ~ 2024-11-30', size_gb: 12.4, status: 'ready', created_at: '2024-12-05' },
  { name: '黄坌镇无人机精查影像', type: '无人机DOM', region: '黄坌镇', time_range: '2024-11-15 ~ 2024-11-18', size_gb: 3.8, status: 'ready', created_at: '2024-11-20' },
  { name: '2024年度AI识别结果汇总', type: '矢量数据', region: '清远市全域', time_range: '2024-01-01 ~ 2024-12-31', size_gb: 0.2, status: 'ready', created_at: '2025-01-05' },
  { name: '2025年1月监测数据包', type: '综合数据', region: '清远市全域', time_range: '2025-01-01 ~ 2025-01-18', size_gb: 5.6, status: 'packing', created_at: '2025-01-18' },
  { name: '星子镇多时相NDVI对比集', type: '植被指数', region: '星子镇', time_range: '2024-03 ~ 2024-12', size_gb: 1.1, status: 'ready', created_at: '2025-01-10' },
])
</script>

<style scoped>
.datasets-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
</style>
