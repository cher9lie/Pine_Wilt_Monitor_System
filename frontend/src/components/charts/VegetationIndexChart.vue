<template>
  <div class="vi-chart-wrapper">
    <div class="chart-header">
      <span class="chart-title">📊 植被指数时序曲线</span>
      <div class="index-tabs">
        <button
          v-for="idx in indexOptions"
          :key="idx.key"
          :class="['idx-tab', { active: activeIndex === idx.key }]"
          @click="activeIndex = idx.key"
        >
          {{ idx.label }}
        </button>
      </div>
    </div>

    <!-- ECharts 图表容器 -->
    <div ref="chartEl" class="chart-body" />

    <!-- 无数据占位 -->
    <div v-if="!hasData" class="no-data">
      <p>暂无植被指数数据</p>
      <p class="no-data-hint">上传并分析遥感影像后，此处将展示 NDVI / LAI / SR 时序变化</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 植被指数时序图表
 * 预留 NDVI / LAI / SR 展示接口
 * 使用 ECharts 5 渲染折线图
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  DataZoomComponent, MarkLineComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useMapStore } from '@/stores/map'
import type { VegetationIndexPoint } from '@/types'

echarts.use([
  LineChart, GridComponent, TooltipComponent,
  LegendComponent, DataZoomComponent, MarkLineComponent, CanvasRenderer,
])

const mapStore = useMapStore()
const chartEl = ref<HTMLDivElement>()
let chart: echarts.ECharts | null = null

const activeIndex = ref<'ndvi' | 'lai' | 'sr'>('ndvi')

const indexOptions = [
  { key: 'ndvi' as const, label: 'NDVI', color: '#00e676', desc: '归一化植被指数' },
  { key: 'lai'  as const, label: 'LAI',  color: '#00d4ff', desc: '叶面积指数' },
  { key: 'sr'   as const, label: 'SR',   color: '#ffab40', desc: '简单比值指数' },
]

const hasData = computed(() => mapStore.vegetationTimeSeries.length > 0)

// 模拟数据（实际由 Task 5.7 植被指数接口填充）
const mockData: VegetationIndexPoint[] = [
  { date: '2024-01', ndvi: 0.62, lai: 2.1, sr: 4.3 },
  { date: '2024-03', ndvi: 0.71, lai: 2.8, sr: 5.9 },
  { date: '2024-05', ndvi: 0.78, lai: 3.4, sr: 7.1 },
  { date: '2024-07', ndvi: 0.65, lai: 2.5, sr: 4.7 },
  { date: '2024-09', ndvi: 0.48, lai: 1.6, sr: 2.8 },  // 疫情爆发期下降
  { date: '2024-11', ndvi: 0.41, lai: 1.2, sr: 2.1 },
]

function buildChartOption(data: VegetationIndexPoint[], indexKey: 'ndvi' | 'lai' | 'sr') {
  const opt = indexOptions.find(o => o.key === indexKey)!
  const dates = data.map(d => d.date)
  const values = data.map(d => d[indexKey] ?? null)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(10, 20, 40, 0.9)',
      borderColor: '#1e3a5f',
      textStyle: { color: '#e8f4fd', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `<div style="padding:4px 8px">
          <div style="color:#8bacc8;margin-bottom:4px">${p.name}</div>
          <div><span style="color:${opt.color};font-weight:600">${opt.label}</span>
          <span style="margin-left:8px;color:#e8f4fd">${p.value?.toFixed(3) ?? 'N/A'}</span></div>
          <div style="color:#4a6a8a;font-size:11px;margin-top:2px">${opt.desc}</div>
        </div>`
      },
    },
    grid: { left: 40, right: 16, top: 20, bottom: 36 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#1e3a5f' } },
      axisLabel: { color: '#8bacc8', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } },
      axisLabel: { color: '#8bacc8', fontSize: 11 },
    },
    series: [{
      name: opt.label,
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: opt.color, width: 2 },
      itemStyle: { color: opt.color },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: hexToRgba(opt.color, 0.3) },
          { offset: 1, color: 'rgba(0,0,0,0)' },
        ]),
      },
      markLine: {
        silent: true,
        lineStyle: { color: '#ff5252', type: 'dashed', width: 1 },
        data: indexKey === 'ndvi' ? [{ yAxis: 0.5, name: '健康阈值' }] : [],
        label: { color: '#ff5252', fontSize: 10 },
      },
    }],
    dataZoom: [{
      type: 'inside',
      start: 0,
      end: 100,
    }],
  }
}

function renderChart() {
  if (!chart || !chartEl.value) return
  const data = hasData.value ? mapStore.vegetationTimeSeries : mockData
  chart.setOption(buildChartOption(data, activeIndex.value), true)
}

onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value, null, { renderer: 'canvas' })
    renderChart()
  }

  window.addEventListener('resize', () => chart?.resize())
})

onUnmounted(() => {
  chart?.dispose()
  chart = null
})

watch([activeIndex, () => mapStore.vegetationTimeSeries], renderChart)

// 十六进制颜色转 rgba 字符串
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
</script>

<style scoped>
.vi-chart-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}

.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.chart-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.index-tabs {
  display: flex;
  gap: 4px;
}

.idx-tab {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.idx-tab.active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: rgba(0, 212, 255, 0.1);
}

.chart-body {
  flex: 1;
  min-height: 0;
}

.no-data {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: rgba(10, 14, 26, 0.7);
  border-radius: 4px;
}

.no-data p {
  font-size: 13px;
  color: var(--color-text-muted);
}

.no-data-hint {
  font-size: 11px !important;
  color: var(--color-text-muted);
  text-align: center;
  max-width: 200px;
  line-height: 1.5;
}
</style>
