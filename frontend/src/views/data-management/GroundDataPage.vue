<template>
  <div class="ground-page">
    <div class="page-header">
      <h2>地面监测数据</h2>
      <el-tag type="info" size="small">近7天汇总 · 演示数据</el-tag>
    </div>

    <!-- 概览卡片 -->
    <div class="overview-grid">
      <div class="gd-card">
        <div class="gd-header">🪲 虫情监测</div>
        <div class="gd-body">
          <div class="gd-metric"><span class="gd-val">{{ data.trap_summary.total_captures_7d }}</span><span class="gd-unit">只/7天</span></div>
          <div class="gd-sub">日均 {{ data.trap_summary.avg_daily }} 只 · 峰值 {{ data.trap_summary.peak_count }} 只 ({{ data.trap_summary.peak_day?.slice(5) }})</div>
          <div class="gd-trend" :class="data.trap_summary.trend">
            {{ data.trap_summary.trend === 'rising' ? '↑ 上升趋势' : data.trap_summary.trend === 'declining' ? '↓ 下降趋势' : '→ 平稳' }}
          </div>
        </div>
        <!-- 趋势小图 -->
        <div ref="trapChartEl" class="gd-chart" />
      </div>

      <div class="gd-card">
        <div class="gd-header">🌡️ 气象数据</div>
        <div class="gd-body">
          <div class="gd-row"><span class="gd-label">平均气温</span><span class="gd-value">{{ data.weather_summary.avg_temp }}°C</span></div>
          <div class="gd-row"><span class="gd-label">平均湿度</span><span class="gd-value">{{ data.weather_summary.avg_humidity }}%</span></div>
          <div class="gd-row"><span class="gd-label">累计降水</span><span class="gd-value">{{ data.weather_summary.total_rainfall_mm }} mm</span></div>
          <div class="gd-row"><span class="gd-label">平均风速</span><span class="gd-value">{{ data.weather_summary.avg_wind_speed }} m/s</span></div>
          <div class="gd-row"><span class="gd-label">日照时数</span><span class="gd-value">{{ data.weather_summary.sunshine_hours }} h</span></div>
        </div>
      </div>

      <div class="gd-card">
        <div class="gd-header">🌱 土壤监测</div>
        <div class="gd-body">
          <div class="gd-row"><span class="gd-label">pH 值</span><span class="gd-value">{{ data.soil_summary.avg_ph }}</span></div>
          <div class="gd-row"><span class="gd-label">含水率</span><span class="gd-value">{{ data.soil_summary.avg_moisture }}%</span></div>
          <div class="gd-row"><span class="gd-label">养分状况</span><span class="gd-value">{{ data.soil_summary.avg_nutrient === 'medium' ? '中等' : data.soil_summary.avg_nutrient }}</span></div>
        </div>
      </div>

      <div class="gd-card">
        <div class="gd-header">📝 人工巡查</div>
        <div class="gd-body">
          <div class="gd-row"><span class="gd-label">巡查记录</span><span class="gd-value">{{ data.patrol_records.total_7d }} 条</span></div>
          <div class="gd-row"><span class="gd-label">上传照片</span><span class="gd-value">{{ data.patrol_records.photos_uploaded }} 张</span></div>
          <div class="gd-row"><span class="gd-label">异常上报</span><span class="gd-value warn">{{ data.patrol_records.anomalies_reported }} 条</span></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import http from '@/api/http'

echarts.use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const trapChartEl = ref<HTMLDivElement>()

const data = reactive({
  trap_summary: { total_captures_7d: 0, avg_daily: 0, peak_day: '', peak_count: 0, trend: 'stable' },
  weather_summary: { avg_temp: 0, avg_humidity: 0, total_rainfall_mm: 0, avg_wind_speed: 0, sunshine_hours: 0 },
  soil_summary: { avg_ph: 0, avg_moisture: 0, avg_nutrient: '' },
  patrol_records: { total_7d: 0, photos_uploaded: 0, anomalies_reported: 0 },
  daily_captures: [] as { date: string; count: number }[],
})

async function load() {
  try {
    const res = await http.get('/data/ground-monitoring')
    Object.assign(data, res.data.data)
    await nextTick()
    renderTrapChart()
  } catch { /* ignore */ }
}

function renderTrapChart() {
  if (!trapChartEl.value || data.daily_captures.length === 0) return
  const chart = echarts.init(trapChartEl.value)
  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(10,20,40,0.9)', borderColor: '#1e3a5f', textStyle: { color: '#e8f4fd' } },
    grid: { left: 30, right: 10, top: 10, bottom: 20 },
    xAxis: { type: 'category', data: data.daily_captures.map(d => d.date.slice(5)), axisLabel: { color: '#8bacc8', fontSize: 10 }, axisLine: { lineStyle: { color: '#1e3a5f' } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#1e3a5f', type: 'dashed' } }, axisLabel: { color: '#8bacc8', fontSize: 10 } },
    series: [{ type: 'bar', data: data.daily_captures.map(d => d.count), itemStyle: { color: '#ff9800', borderRadius: [3, 3, 0, 0] }, barWidth: '60%' }],
  })
}

onMounted(load)
</script>

<style scoped>
.ground-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.overview-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }

.gd-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 16px; display: flex; flex-direction: column; }
.gd-header { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--color-border); }
.gd-body { flex: 1; }
.gd-metric { margin-bottom: 6px; }
.gd-val { font-size: 32px; font-weight: 700; color: var(--color-accent); }
.gd-unit { font-size: 13px; color: var(--color-text-muted); margin-left: 4px; }
.gd-sub { font-size: 12px; color: var(--color-text-muted); }
.gd-trend { font-size: 12px; font-weight: 600; margin-top: 6px; }
.gd-trend.rising { color: #f44336; }
.gd-trend.declining { color: #00e676; }
.gd-trend.stable { color: #8bacc8; }

.gd-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed var(--color-border); font-size: 13px; }
.gd-row:last-child { border-bottom: none; }
.gd-label { color: var(--color-text-muted); }
.gd-value { color: var(--color-text-primary); font-weight: 500; }
.gd-value.warn { color: #ff9800; }

.gd-chart { height: 120px; margin-top: 10px; }
</style>
