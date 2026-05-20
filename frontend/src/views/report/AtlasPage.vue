<template>
  <div class="atlas-page">
    <div class="page-header"><h2>地图集制作</h2><el-button type="primary" size="small"><el-icon><Plus /></el-icon> 新建图集</el-button></div>

    <!-- 向导模板选择 -->
    <div class="template-section">
      <div class="section-title">选择制图模板</div>
      <div class="template-grid">
        <div v-for="tpl in templates" :key="tpl.id" class="tpl-card" :class="{ active: selectedTpl === tpl.id }" @click="selectedTpl = tpl.id">
          <div class="tpl-icon">{{ tpl.icon }}</div>
          <div class="tpl-name">{{ tpl.name }}</div>
          <div class="tpl-desc">{{ tpl.desc }}</div>
        </div>
      </div>
    </div>

    <!-- 已生成图集列表 -->
    <div class="section-title">已生成图集</div>
    <el-table :data="atlases" size="small" stripe>
      <el-table-column prop="name" label="图集名称" min-width="240" />
      <el-table-column prop="template" label="模板类型" width="120"><template #default="{ row }"><el-tag size="small">{{ row.template }}</el-tag></template></el-table-column>
      <el-table-column prop="region" label="覆盖区域" width="140" />
      <el-table-column prop="pages" label="页数" width="60" />
      <el-table-column prop="dpi" label="分辨率" width="80" />
      <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small" :type="row.status === 'ready' ? 'success' : 'info'">{{ row.status === 'ready' ? '已完成' : '生成中' }}</el-tag></template></el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="120" />
      <el-table-column label="操作" width="130"><template #default><el-button size="small" text type="primary">预览</el-button><el-button size="small" text>下载PDF</el-button></template></el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Plus } from '@element-plus/icons-vue'

const selectedTpl = ref('status')

const templates = ref([
  { id: 'status', icon: '🗺️', name: '疫情现状图集', desc: '单一时相疫木分布与等级划分' },
  { id: 'evolution', icon: '📈', name: '疫情演变图集', desc: '多时相/跨年度扩散趋势对比' },
  { id: 'effect', icon: '✅', name: '防治成效图集', desc: '清前清后林相指标空间对比' },
  { id: 'risk', icon: '⚠️', name: '风险评估图集', desc: '四色预警分级区域空间渲染' },
])

const atlases = ref([
  { name: '2024年秋季清远市松材线虫病现状图集', template: '疫情现状', region: '清远市全域', pages: 12, dpi: '300 DPI', status: 'ready', created_at: '2024-12-20' },
  { name: '阳山县黄坌镇疫情演变对比图集(2023-2024)', template: '疫情演变', region: '黄坌镇', pages: 8, dpi: '300 DPI', status: 'ready', created_at: '2025-01-05' },
  { name: '吉田林场防治成效对比图集', template: '防治成效', region: '吉田林场', pages: 6, dpi: '600 DPI', status: 'ready', created_at: '2025-01-12' },
  { name: '2025年1月清远市风险评估图集', template: '风险评估', region: '清远市全域', pages: 10, dpi: '300 DPI', status: 'generating', created_at: '2025-01-18' },
])
</script>

<style scoped>
.atlas-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.template-section { margin-bottom: 24px; }
.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 10px; }
.template-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.tpl-card { padding: 16px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; text-align: center; transition: all 0.2s; }
.tpl-card:hover { border-color: var(--color-accent); }
.tpl-card.active { border-color: var(--color-accent); background: rgba(0,212,255,0.06); box-shadow: 0 0 0 1px var(--color-accent); }
.tpl-icon { font-size: 32px; margin-bottom: 8px; }
.tpl-name { font-size: 13px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px; }
.tpl-desc { font-size: 11px; color: var(--color-text-muted); }
</style>
