<template>
  <div class="audit-page">
    <div class="page-header">
      <h2>财务审计报表</h2>
      <el-button size="small"><el-icon><Download /></el-icon> 导出 Excel</el-button>
    </div>

    <!-- ROI 概览 -->
    <div class="roi-row">
      <div class="roi-card">
        <div class="roi-title">年度防治总投入</div>
        <div class="roi-val">¥168.5 万</div>
      </div>
      <div class="roi-card">
        <div class="roi-title">病死树下降量</div>
        <div class="roi-val positive">-324 株</div>
      </div>
      <div class="roi-card">
        <div class="roi-title">单株防治成本</div>
        <div class="roi-val">¥5,200</div>
      </div>
      <div class="roi-card">
        <div class="roi-title">防治 ROI</div>
        <div class="roi-val positive">1:3.8</div>
        <div class="roi-sub">（挽回木材价值/防治投入）</div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="charts-row">
      <div class="chart-card">
        <div class="chart-title">各林场经费消耗对比</div>
        <div ref="barEl" class="chart-body" />
      </div>
      <div class="chart-card">
        <div class="chart-title">费用科目占比</div>
        <div ref="pieEl" class="chart-body" />
      </div>
    </div>

    <!-- 交叉稽核表 -->
    <div class="section-title">业务成效交叉稽核</div>
    <el-table :data="auditRecords" size="small" stripe>
      <el-table-column prop="farm_name" label="林场" width="140" />
      <el-table-column prop="claimed_count" label="报账伐除(株)" width="120" />
      <el-table-column prop="actual_count" label="现场核实(株)" width="120" />
      <el-table-column label="偏差" width="90">
        <template #default="{ row }">
          <span :class="row.diff > 0 ? 'text-warn' : 'text-ok'">{{ row.diff > 0 ? '+' : '' }}{{ row.diff }}</span>
        </template>
      </el-table-column>
      <el-table-column label="稽核结论" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="row.diff > 5 ? 'danger' : 'success'">{{ row.diff > 5 ? '异常' : '通过' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="expense" label="报销金额" width="120"><template #default="{ row }">¥{{ row.expense.toLocaleString() }}</template></el-table-column>
      <el-table-column prop="note" label="备注" min-width="180"><template #default="{ row }"><span class="note-text">{{ row.note }}</span></template></el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Download } from '@element-plus/icons-vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([BarChart, PieChart, GridComponent, TooltipComponent, CanvasRenderer])

const barEl = ref<HTMLDivElement>()
const pieEl = ref<HTMLDivElement>()

const auditRecords = ref([
  { farm_name: '黄坌国有林场', claimed_count: 312, actual_count: 308, diff: 4, expense: 523000, note: '偏差在合理范围内' },
  { farm_name: '横石塘林场', claimed_count: 145, actual_count: 142, diff: 3, expense: 348000, note: '已核销' },
  { farm_name: '星子林场', claimed_count: 98, actual_count: 95, diff: 3, expense: 245000, note: '已核销' },
  { farm_name: '太和林场', claimed_count: 34, actual_count: 33, diff: 1, expense: 132000, note: '已核销' },
  { farm_name: '吉田林场', claimed_count: 156, actual_count: 148, diff: 8, expense: 275000, note: '⚠️ 偏差超限，已拦截并转人工复核' },
])

onMounted(() => {
  if (barEl.value) {
    const chart = echarts.init(barEl.value)
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,20,40,0.9)', borderColor: '#1e3a5f', textStyle: { color: '#e8f4fd' } },
      grid: { left: 90, right: 20, top: 10, bottom: 30 },
      yAxis: { type: 'category', data: ['黄坌', '横石塘', '星子', '吉田', '太和', '汤塘', '大坪'], axisLabel: { color: '#8bacc8' }, axisLine: { lineStyle: { color: '#1e3a5f' } } },
      xAxis: { type: 'value', axisLabel: { color: '#8bacc8', formatter: (v: number) => `${v/10000}万` }, splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } } },
      series: [{ type: 'bar', data: [523000, 348000, 245000, 275000, 132000, 89000, 45000], itemStyle: { color: '#00d4ff', borderRadius: [0, 3, 3, 0] } }],
    })
  }
  if (pieEl.value) {
    const chart = echarts.init(pieEl.value)
    chart.setOption({
      backgroundColor: 'transparent',
      tooltip: { trigger: 'item', backgroundColor: 'rgba(10,20,40,0.9)', borderColor: '#1e3a5f', textStyle: { color: '#e8f4fd' } },
      series: [{ type: 'pie', radius: ['35%', '65%'], data: [
        { name: '疫木伐除', value: 82, itemStyle: { color: '#f44336' } },
        { name: '药剂防治', value: 45, itemStyle: { color: '#ff9800' } },
        { name: '无人机巡查', value: 18, itemStyle: { color: '#00d4ff' } },
        { name: '设备维护', value: 8, itemStyle: { color: '#00e676' } },
        { name: '人工巡查', value: 15.5, itemStyle: { color: '#8bacc8' } },
      ], label: { color: '#8bacc8', fontSize: 11 } }],
    })
  }
})
</script>

<style scoped>
.audit-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.roi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 18px; }
.roi-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; text-align: center; }
.roi-title { font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.roi-val { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.roi-val.positive { color: #00e676; }
.roi-sub { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

.charts-row { display: grid; grid-template-columns: 3fr 2fr; gap: 14px; margin-bottom: 18px; }
.chart-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; }
.chart-title { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 8px; }
.chart-body { height: 200px; }

.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 10px; }
.text-warn { color: #ff9800; font-weight: 600; } .text-ok { color: #00e676; }
.note-text { font-size: 12px; color: var(--color-text-muted); }
</style>
