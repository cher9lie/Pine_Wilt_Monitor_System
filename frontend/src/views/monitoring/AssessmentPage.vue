<template>
  <div class="assessment-page">
    <div class="page-header">
      <h2>灾情评估</h2>
      <el-tag type="info" size="small" v-if="isMock">演示数据 · 清远市松材线虫病</el-tag>
    </div>

    <!-- 总体概览 -->
    <div class="overview-row">
      <div class="overview-card">
        <div class="ov-icon">🌲</div>
        <div class="ov-data">
          <span class="ov-val">{{ totalStats.totalTrees }}</span>
          <span class="ov-label">疫木总数(株)</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon">💀</div>
        <div class="ov-data">
          <span class="ov-val text-red">{{ totalStats.deadTrees }}</span>
          <span class="ov-label">枯死木(株)</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon">🟡</div>
        <div class="ov-data">
          <span class="ov-val text-orange">{{ totalStats.discolored }}</span>
          <span class="ov-label">变色木(株)</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon">✅</div>
        <div class="ov-data">
          <span class="ov-val text-green">{{ totalStats.confirmed }}</span>
          <span class="ov-label">已确认(株)</span>
        </div>
      </div>
      <div class="overview-card">
        <div class="ov-icon">📐</div>
        <div class="ov-data">
          <span class="ov-val">{{ totalStats.totalArea.toFixed(0) }}</span>
          <span class="ov-label">涉及林地(ha)</span>
        </div>
      </div>
    </div>

    <!-- 图表区 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">各林场疫木数量对比</div>
        <div ref="barChartEl" class="chart-container" />
      </div>
      <div class="chart-card">
        <div class="chart-title">病害类型占比</div>
        <div ref="pieChartEl" class="chart-container" />
      </div>
    </div>

    <!-- 林场评估详表 -->
    <div class="table-section">
      <div class="table-header">
        <span class="table-title">各林场灾情评估明细</span>
      </div>
      <el-table :data="assessmentData" size="small" stripe class="assess-table">
        <el-table-column prop="farm_name" label="林场" width="160" />
        <el-table-column prop="disease_count" label="疫木总数" width="100" sortable />
        <el-table-column prop="dead_tree_count" label="枯死木" width="90" />
        <el-table-column prop="discolored_count" label="变色木" width="90" />
        <el-table-column prop="confirmed_count" label="已确认" width="90" />
        <el-table-column prop="total_area_ha" label="林地面积(ha)" width="120" />
        <el-table-column label="风险等级" width="100">
          <template #default="{ row }">
            <el-tag :type="riskType(row.risk_level)" size="small">{{ riskLabel(row.risk_level) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="NDVI变化" width="110">
          <template #default="{ row }">
            <span :class="row.ndvi_change < 0 ? 'text-red' : 'text-green'">
              {{ row.ndvi_change > 0 ? '+' : '' }}{{ (row.ndvi_change * 100).toFixed(1) }}%
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'cleared'" type="success" size="small">已清除</el-tag>
            <el-tag v-else type="warning" size="small">监测中</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { alertsApi, type AssessmentItem } from '@/api/alerts'

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

const assessmentData = ref<AssessmentItem[]>([])
const isMock = ref(false)
const barChartEl = ref<HTMLDivElement>()
const pieChartEl = ref<HTMLDivElement>()
let barChart: echarts.ECharts | null = null
let pieChart: echarts.ECharts | null = null

const totalStats = computed(() => {
  const d = assessmentData.value
  return {
    totalTrees: d.reduce((s, i) => s + i.disease_count, 0),
    deadTrees: d.reduce((s, i) => s + i.dead_tree_count, 0),
    discolored: d.reduce((s, i) => s + i.discolored_count, 0),
    confirmed: d.reduce((s, i) => s + i.confirmed_count, 0),
    totalArea: d.reduce((s, i) => s + i.total_area_ha, 0),
  }
})

async function loadData() {
  try {
    const res = await alertsApi.getAssessment()
    assessmentData.value = res.data.data as AssessmentItem[]
    isMock.value = !!(res.data as Record<string, unknown>).is_mock
    renderCharts()
  } catch { /* ignore */ }
}

function renderCharts() {
  if (!barChartEl.value || !pieChartEl.value) return
  const data = assessmentData.value.filter(d => d.status !== 'cleared')

  // 柱状图
  if (!barChart) barChart = echarts.init(barChartEl.value)
  barChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,20,40,0.9)', borderColor: '#1e3a5f', textStyle: { color: '#e8f4fd' } },
    grid: { left: 80, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: data.map(d => d.farm_name.replace('林场', '')), axisLabel: { color: '#8bacc8', fontSize: 11 }, axisLine: { lineStyle: { color: '#1e3a5f' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } }, axisLabel: { color: '#8bacc8' } },
    series: [
      { name: '枯死木', type: 'bar', stack: 'total', data: data.map(d => d.dead_tree_count), itemStyle: { color: '#f44336' } },
      { name: '变色木', type: 'bar', stack: 'total', data: data.map(d => d.discolored_count), itemStyle: { color: '#ff9800' } },
    ],
  })

  // 饼图
  if (!pieChart) pieChart = echarts.init(pieChartEl.value)
  pieChart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', backgroundColor: 'rgba(10,20,40,0.9)', borderColor: '#1e3a5f', textStyle: { color: '#e8f4fd' } },
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      data: [
        { name: '枯死木', value: totalStats.value.deadTrees, itemStyle: { color: '#f44336' } },
        { name: '变色木', value: totalStats.value.discolored, itemStyle: { color: '#ff9800' } },
        { name: '疑似(未确认)', value: totalStats.value.totalTrees - totalStats.value.confirmed, itemStyle: { color: '#ffeb3b' } },
      ],
      label: { color: '#8bacc8', fontSize: 12 },
    }],
  })
}

function riskLabel(level: number): string {
  return ['无风险', '低风险', '中风险', '高风险', '极高风险'][level] ?? '未知'
}
function riskType(level: number): '' | 'success' | 'warning' | 'danger' | 'info' {
  return ['success', 'info', 'warning', 'danger', 'danger'][level] as '' | 'success' | 'warning' | 'danger' | 'info' ?? 'info'
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', () => { barChart?.resize(); pieChart?.resize() })
})
onUnmounted(() => { barChart?.dispose(); pieChart?.dispose() })
</script>

<style scoped>
.assessment-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.overview-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
.overview-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; }
.ov-icon { font-size: 28px; }
.ov-data { display: flex; flex-direction: column; }
.ov-val { font-size: 22px; font-weight: 700; color: var(--color-text-primary); font-variant-numeric: tabular-nums; }
.ov-label { font-size: 11px; color: var(--color-text-muted); }
.text-red { color: #f44336 !important; }
.text-orange { color: #ff9800 !important; }
.text-green { color: #00e676 !important; }

.charts-row { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; margin-bottom: 20px; }
.chart-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; }
.chart-title { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
.chart-container { height: 220px; }

.table-section { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; }
.table-header { margin-bottom: 10px; }
.table-title { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); }

:deep(.el-table) { --el-table-bg-color: var(--color-bg-panel); --el-table-tr-bg-color: var(--color-bg-panel); --el-table-header-bg-color: var(--color-bg-card); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
:deep(.el-table__row:hover td) { background: var(--color-bg-hover) !important; }
</style>
