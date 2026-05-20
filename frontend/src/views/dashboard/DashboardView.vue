<template>
  <div class="dashboard">

    <!-- ── 左侧控制面板 ─────────────────────────────────────── -->
    <aside class="left-panel">

      <!-- 系统状态卡片 -->
      <div class="panel-section">
        <div class="section-title">系统状态</div>
        <div class="status-grid">
          <div class="status-item">
            <span class="status-dot" :class="aiStatus === 'ok' ? 'dot-green' : 'dot-red'" />
            <span class="status-label">AI 推理服务</span>
            <span class="status-val" :class="aiStatus === 'ok' ? 'text-green' : 'text-red'">
              {{ aiStatus === 'ok' ? '在线' : '离线' }}
            </span>
          </div>
          <div class="status-item">
            <span class="status-dot dot-green" />
            <span class="status-label">数据库</span>
            <span class="status-val text-green">正常</span>
          </div>
        </div>
      </div>

      <!-- TIFF 上传组件 -->
      <div class="panel-section">
        <TiffUploader />
      </div>

      <!-- 图层控制 -->
      <div class="panel-section">
        <div class="section-title">图层控制</div>
        <div class="layer-controls">
          <label
            v-for="layer in layerList"
            :key="layer.key"
            class="layer-item"
          >
            <el-switch
              v-model="mapStore.layerVisibility[layer.key]"
              size="small"
              :active-color="layer.color"
            />
            <span class="layer-dot" :style="{ background: layer.color }" />
            <span class="layer-name">{{ layer.label }}</span>
          </label>
        </div>
      </div>

      <!-- 统计数据 -->
      <div class="panel-section">
        <div class="section-title">本次分析结果</div>
        <div v-if="mapStore.inferResult" class="stats-grid">
          <div class="stat-card">
            <div class="stat-number">{{ mapStore.inferResult.detection_count }}</div>
            <div class="stat-desc">识别点位</div>
          </div>
          <div class="stat-card">
            <div class="stat-number text-orange">
              {{ deadTreeCount }}
            </div>
            <div class="stat-desc">枯死木</div>
          </div>
          <div class="stat-card">
            <div class="stat-number text-yellow">
              {{ discoloredCount }}
            </div>
            <div class="stat-desc">变色木</div>
          </div>
          <div class="stat-card">
            <div class="stat-number text-accent">
              {{ suspectedCount }}
            </div>
            <div class="stat-desc">疑似病木</div>
          </div>
        </div>
        <div v-else class="no-result">
          <p>暂无分析结果</p>
          <p class="hint">上传遥感影像后显示</p>
        </div>
      </div>

    </aside>

    <!-- ── 主地图区域 ───────────────────────────────────────── -->
    <main class="map-area">
      <MapContainer ref="mapRef" />

      <!-- 地图右上角工具栏 -->
      <div class="map-toolbar">
        <el-tooltip content="重置视图" placement="left">
          <button class="tool-btn" @click="resetView">
            <el-icon><Aim /></el-icon>
          </button>
        </el-tooltip>
        <el-tooltip content="清除图层" placement="left">
          <button class="tool-btn" @click="clearAll">
            <el-icon><Delete /></el-icon>
          </button>
        </el-tooltip>
      </div>

      <!-- 地图左下角图例 -->
      <div v-if="mapStore.inferResult" class="map-legend">
        <div class="legend-title">病死木类型</div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#f44336" />
          <span>枯死木</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#ff9800" />
          <span>变色木</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot" style="background:#ffeb3b" />
          <span>疑似病木</span>
        </div>
      </div>
    </main>

    <!-- ── 右侧植被指数面板 ────────────────────────────────── -->
    <aside class="right-panel">
      <div class="panel-section vi-section">
        <VegetationIndexChart />
      </div>

      <!-- 影像信息 -->
      <div v-if="mapStore.inferResult" class="panel-section">
        <div class="section-title">影像信息</div>
        <div class="image-info">
          <div class="info-row">
            <span class="info-label">影像 ID</span>
            <span class="info-val mono">{{ mapStore.inferResult.image_id.slice(0, 8) }}...</span>
          </div>
          <div v-if="mapStore.inferResult.bbox" class="info-row">
            <span class="info-label">地理范围</span>
            <span class="info-val mono">
              {{ mapStore.inferResult.bbox[0].toFixed(4) }},
              {{ mapStore.inferResult.bbox[1].toFixed(4) }}
            </span>
          </div>
        </div>
      </div>

      <!-- 操作提示 -->
      <div class="panel-section tips-section">
        <div class="section-title">操作提示</div>
        <ul class="tips-list">
          <li>上传 GeoTIFF 后点击「上传并分析」</li>
          <li>地图自动飞越至影像区域</li>
          <li>红色圆点为疑似病死木点位</li>
          <li>点击圆点查看详细信息</li>
          <li>滚轮缩放，拖拽平移地图</li>
        </ul>
      </div>
    </aside>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Aim, Delete } from '@element-plus/icons-vue'
import MapContainer from '@/components/map/MapContainer.vue'
import TiffUploader from '@/components/upload/TiffUploader.vue'
import VegetationIndexChart from '@/components/charts/VegetationIndexChart.vue'
import { useMapStore } from '@/stores/map'
import http from '@/api/http'

const mapStore = useMapStore()
const mapRef = ref<InstanceType<typeof MapContainer>>()
const aiStatus = ref<'ok' | 'error'>('error')

// 图层列表配置
const layerList = [
  { key: 'diseaseTrees' as const, label: '病死木点位', color: '#f44336' },
  { key: 'alertZones'   as const, label: '预警区域',   color: '#ff9800' },
  { key: 'imageBbox'    as const, label: '影像范围框',  color: '#00d4ff' },
]

// 统计数据（从推理结果 GeoJSON 计算）
const deadTreeCount = computed(() => {
  if (!mapStore.inferResult) return 0
  return mapStore.inferResult.geojson.features.filter(
    f => f.properties?.class_label === 'dead_tree'
  ).length
})

const discoloredCount = computed(() => {
  if (!mapStore.inferResult) return 0
  return mapStore.inferResult.geojson.features.filter(
    f => f.properties?.class_label === 'discolored'
  ).length
})

const suspectedCount = computed(() => {
  if (!mapStore.inferResult) return 0
  return mapStore.inferResult.geojson.features.filter(
    f => f.properties?.class_label === 'suspected'
  ).length
})

function resetView() {
  mapRef.value?.flyTo(113.0, 23.7, 7)
}

function clearAll() {
  mapRef.value?.clearLayers()
  mapStore.clearDetections()
  ElMessage.info('已清除地图图层')
}

// 检查 AI 服务健康状态（通过后端 /health 代理判断整体状态）
async function checkAiHealth() {
  try {
    const res = await http.get('/health', { baseURL: '' })
    const services = (res.data as { services?: { database?: string } })?.services
    // 后端健康检查成功意味着基础设施在线
    aiStatus.value = services?.database === 'ok' ? 'ok' : 'error'
  } catch {
    aiStatus.value = 'error'
  }
}

onMounted(() => {
  checkAiHealth()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--color-bg-base);
}

/* ── 左侧面板 ─────────────────────────────────────────────── */
.left-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--color-bg-panel);
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── 右侧面板 ─────────────────────────────────────────────── */
.right-panel {
  width: 280px;
  flex-shrink: 0;
  background: var(--color-bg-panel);
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* ── 面板通用 section ─────────────────────────────────────── */
.panel-section {
  padding: 14px 14px;
  border-bottom: 1px solid var(--color-border);
}

.section-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}

/* ── 主地图区域 ───────────────────────────────────────────── */
.map-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* ── 地图工具栏 ───────────────────────────────────────────── */
.map-toolbar {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}

.tool-btn {
  width: 32px;
  height: 32px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
}

.tool-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

/* ── 地图图例 ─────────────────────────────────────────────── */
.map-legend {
  position: absolute;
  bottom: 40px;
  left: 12px;
  background: rgba(10, 14, 26, 0.85);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 10px 12px;
  z-index: 10;
  backdrop-filter: blur(4px);
}

.legend-title {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-bottom: 6px;
  font-weight: 600;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
  padding: 2px 0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── 状态网格 ─────────────────────────────────────────────── */
.status-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green { background: var(--color-success); box-shadow: 0 0 6px var(--color-success); }
.dot-red   { background: var(--color-danger);  box-shadow: 0 0 6px var(--color-danger); }

.status-label { flex: 1; color: var(--color-text-secondary); }
.status-val   { font-weight: 600; }
.text-green   { color: var(--color-success); }
.text-red     { color: var(--color-danger); }

/* ── 图层控制 ─────────────────────────────────────────────── */
.layer-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.layer-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}

.layer-name { flex: 1; }

/* ── 统计卡片 ─────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.stat-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 10px 8px;
  text-align: center;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.stat-desc {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 4px;
}

.text-orange { color: var(--color-warning); }
.text-yellow { color: #ffeb3b; }
.text-accent { color: var(--color-accent); }

.no-result {
  text-align: center;
  padding: 12px 0;
}

.no-result p { font-size: 13px; color: var(--color-text-muted); }
.hint { font-size: 11px !important; margin-top: 4px; }

/* ── 植被指数图表区域 ─────────────────────────────────────── */
.vi-section {
  height: 220px;
  display: flex;
  flex-direction: column;
}

/* ── 影像信息 ─────────────────────────────────────────────── */
.image-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.info-label { color: var(--color-text-muted); }
.info-val   { color: var(--color-text-secondary); }
.mono       { font-family: monospace; font-size: 11px; }

/* ── 操作提示 ─────────────────────────────────────────────── */
.tips-section { flex: 1; }

.tips-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tips-list li {
  font-size: 12px;
  color: var(--color-text-muted);
  padding-left: 12px;
  position: relative;
  line-height: 1.5;
}

.tips-list li::before {
  content: '›';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}
</style>
