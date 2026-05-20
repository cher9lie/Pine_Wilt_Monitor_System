<template>
  <div ref="mapEl" class="map-container" />
</template>

<script setup lang="ts">
/**
 * MapLibre GL JS 地图容器
 *
 * 底图：Esri World Imagery（免费公共卫星瓦片）
 * 备用：OpenStreetMap（街道图）
 *
 * 业务图层：
 *  - disease-trees-layer  病死木红色圆点（含发光特效）
 *  - image-bbox-layer     影像范围框（蓝色虚线）
 *  - alert-zones-layer    预警区域（四色填充）
 */
import { ref, onMounted, onUnmounted, watch } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type { Map, GeoJSONSource } from 'maplibre-gl'
import { useMapStore } from '@/stores/map'

const mapEl = ref<HTMLDivElement>()
const mapStore = useMapStore()
let map: Map | null = null

const DEMO_OFFSET_DISTANCE_KM = 30
const DEMO_OFFSET_BEARING_DEG = 135
const DEMO_BASE_CENTER: [number, number] = [114.935, 25.831]
const EARTH_RADIUS_METERS = 6371000
const DEG_TO_RAD = Math.PI / 180
const FULL_CIRCLE_DEG = 360
const HALF_CIRCLE_DEG = 180
const DEMO_ZONES: { name: string; coordinates: [number, number][][] }[] = [
  {
    name: '章贡区水西松林监测区',
    coordinates: [[
      [114.908, 25.852], [114.932, 25.858], [114.951, 25.847],
      [114.958, 25.831], [114.948, 25.815], [114.927, 25.809],
      [114.908, 25.818], [114.901, 25.835], [114.908, 25.852],
    ]],
  },
  {
    name: '章贡区东部林场监测区',
    coordinates: [[
      [114.962, 25.862], [114.978, 25.869], [114.991, 25.861],
      [114.994, 25.848], [114.983, 25.839], [114.967, 25.843],
      [114.960, 25.852], [114.962, 25.862],
    ]],
  },
]

// ── 底图样式定义 ──────────────────────────────────────────────
const BASEMAP_STYLES = {
  satellite: {
    version: 8 as const,
    name: 'Esri World Imagery',
    sources: {
      'esri-satellite': {
        type: 'raster' as const,
        // Esri World Imagery 免费公共瓦片服务
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        ],
        tileSize: 256,
        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
        maxzoom: 19,
      },
      // 卫星图上叠加 OSM 道路/地名标注（半透明）
      'osm-labels': {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'esri-satellite-layer',
        type: 'raster' as const,
        source: 'esri-satellite',
        minzoom: 0,
        maxzoom: 22,
      },
      {
        id: 'osm-labels-layer',
        type: 'raster' as const,
        source: 'osm-labels',
        minzoom: 0,
        maxzoom: 22,
        paint: { 'raster-opacity': 0.25 },  // 半透明叠加，保留地名
      },
    ],
    glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    sprite: '',
  },
}

// ── 初始化地图 ────────────────────────────────────────────────
onMounted(() => {
  if (!mapEl.value) return

  map = new maplibregl.Map({
    container: mapEl.value,
    style: BASEMAP_STYLES.satellite,
    center: offsetLngLat(DEMO_BASE_CENTER),  // 赣州市章贡区中心（整体东南偏移）
    zoom: 11,
    minZoom: 3,
    maxZoom: 20,
    attributionControl: false,
  })

  // 添加导航控件
  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
  map.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    'bottom-right'
  )

  map.on('load', () => {
    initBusinessLayers()
    initDemoLayers()   // 赣州示例数据
    mapStore.setMap(map!)
  })
})

onUnmounted(() => {
  map?.remove()
  map = null
})

// ── 初始化业务图层（空数据源，等待数据填充）────────────────────
function initBusinessLayers() {
  if (!map) return

  // 1. 影像范围框数据源（BBox 矩形）
  map.addSource('image-bbox', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  // 影像范围框：蓝色虚线边框
  map.addLayer({
    id: 'image-bbox-fill',
    type: 'fill',
    source: 'image-bbox',
    paint: {
      'fill-color': '#00d4ff',
      'fill-opacity': 0.05,
    },
  })
  map.addLayer({
    id: 'image-bbox-outline',
    type: 'line',
    source: 'image-bbox',
    paint: {
      'line-color': '#00d4ff',
      'line-width': 2,
      'line-dasharray': [4, 2],
      'line-opacity': 0.8,
    },
  })

  // 2. 病死木点位数据源
  map.addSource('disease-trees', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40,
  })

  // 聚合圆（缩放级别低时显示聚合数量）
  map.addLayer({
    id: 'disease-trees-cluster',
    type: 'circle',
    source: 'disease-trees',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'step', ['get', 'point_count'],
        '#ff9800', 10,   // < 10 个：橙色
        '#f44336', 50,   // < 50 个：红色
        '#b71c1c',       // >= 50 个：深红
      ],
      'circle-radius': [
        'step', ['get', 'point_count'],
        16, 10, 22, 50, 30,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#fff',
    },
  })

  // 聚合数量标签
  map.addLayer({
    id: 'disease-trees-cluster-count',
    type: 'symbol',
    source: 'disease-trees',
    filter: ['has', 'point_count'],
    layout: {
      'text-field': '{point_count_abbreviated}',
      'text-size': 12,
      'text-font': ['Open Sans Bold'],
    },
    paint: {
      'text-color': '#ffffff',
    },
  })

  // 单点：红色发光圆点（病死木）
  map.addLayer({
    id: 'disease-trees-point',
    type: 'circle',
    source: 'disease-trees',
    filter: ['!', ['has', 'point_count']],
    paint: {
      // 按严重程度分级设色
      'circle-color': [
        'match', ['get', 'class_label'],
        'dead_tree',  '#f44336',   // 枯死木：鲜红
        'discolored', '#ff9800',   // 变色木：橙色
        'suspected',  '#ffeb3b',   // 疑似：黄色
        '#ff5252',                 // 默认：红色
      ],
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 4,
        14, 8,
        18, 14,
      ],
      'circle-opacity': 0.9,
      // 发光描边效果
      'circle-stroke-width': [
        'interpolate', ['linear'], ['zoom'],
        10, 1,
        14, 3,
      ],
      'circle-stroke-color': [
        'match', ['get', 'class_label'],
        'dead_tree',  'rgba(244, 67, 54, 0.5)',
        'discolored', 'rgba(255, 152, 0, 0.5)',
        'suspected',  'rgba(255, 235, 59, 0.5)',
        'rgba(255, 82, 82, 0.5)',
      ],
      'circle-stroke-opacity': 0.6,
    },
  })

  // 3. 预警区域数据源
  map.addSource('alert-zones', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: 'alert-zones-fill',
    type: 'fill',
    source: 'alert-zones',
    paint: {
      'fill-color': [
        'match', ['get', 'level'],
        'red',    'rgba(244, 67, 54, 0.25)',
        'orange', 'rgba(255, 152, 0, 0.20)',
        'yellow', 'rgba(255, 235, 59, 0.15)',
        'green',  'rgba(0, 230, 118, 0.10)',
        'rgba(0, 212, 255, 0.10)',
      ],
    },
  })

  map.addLayer({
    id: 'alert-zones-outline',
    type: 'line',
    source: 'alert-zones',
    paint: {
      'line-color': [
        'match', ['get', 'level'],
        'red',    '#f44336',
        'orange', '#ff9800',
        'yellow', '#ffeb3b',
        'green',  '#00e676',
        '#00d4ff',
      ],
      'line-width': 2,
      'line-opacity': 0.8,
    },
  })

  // 点击病死木点位弹出信息
  map.on('click', 'disease-trees-point', (e) => {
    if (!e.features?.length) return
    const props = e.features[0].properties
    const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]

    new maplibregl.Popup({ className: 'disease-popup', maxWidth: '280px' })
      .setLngLat(coords)
      .setHTML(`
        <div class="popup-content">
          <div class="popup-title">🌲 疑似病死木</div>
          <div class="popup-row">
            <span class="popup-label">类型</span>
            <span class="popup-value">${getLabelText(props.class_label)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">置信度</span>
            <span class="popup-value">${(props.confidence * 100).toFixed(1)}%</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">严重程度</span>
            <span class="popup-value">${getSeverityText(props.severity)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">状态</span>
            <span class="popup-value">${getStatusText(props.status)}</span>
          </div>
          <div class="popup-row">
            <span class="popup-label">检测时间</span>
            <span class="popup-value">${new Date(props.detected_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      `)
      .addTo(map!)
  })

  map.on('mouseenter', 'disease-trees-point', () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'disease-trees-point', () => {
    if (map) map.getCanvas().style.cursor = ''
  })
}

// ── 对外暴露的方法 ────────────────────────────────────────────

/**
 * 加载病死木 GeoJSON 点位到地图
 * 同时根据 BBox 飞越到目标区域
 */
function loadDetections(
  geojson: GeoJSON.FeatureCollection,
  bbox: [number, number, number, number] | null
) {
  if (!map) return

  // 更新病死木数据源
  const source = map.getSource('disease-trees') as GeoJSONSource
  source?.setData(geojson)

  // 更新影像范围框
  if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = bbox
    const bboxSource = map.getSource('image-bbox') as GeoJSONSource
    bboxSource?.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [minLng, minLat],
            [maxLng, minLat],
            [maxLng, maxLat],
            [minLng, maxLat],
            [minLng, minLat],
          ]],
        },
        properties: {},
      }],
    })

    // 飞越到影像范围（FlyTo）
    map.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding: 60, duration: 1800, maxZoom: 16 }
    )
  }
}

/**
 * 清除所有业务图层数据
 */
function clearLayers() {
  if (!map) return
  const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  ;(map.getSource('disease-trees') as GeoJSONSource)?.setData(empty)
  ;(map.getSource('image-bbox') as GeoJSONSource)?.setData(empty)
}

/**
 * 飞越到指定坐标
 */
function flyTo(lng: number, lat: number, zoom = 12) {
  map?.flyTo({ center: [lng, lat], zoom, duration: 1500 })
}

/**
 * 飞越到示例中心点（整体东南偏移）
 */
function flyToDemoCenter(zoom = 11) {
  const [lng, lat] = offsetLngLat(DEMO_BASE_CENTER)
  map?.flyTo({ center: [lng, lat], zoom, duration: 1500 })
}

// 监听 store 中的推理结果变化，自动更新地图
watch(
  () => mapStore.inferResult,
  (result) => {
    if (result) {
      loadDetections(result.geojson, result.bbox ?? null)
    }
  }
)

// 监听图层可见性
watch(
  () => mapStore.layerVisibility.diseaseTrees,
  (visible) => {
    if (!map) return
    const vis = visible ? 'visible' : 'none'
    map.setLayoutProperty('disease-trees-point', 'visibility', vis)
    map.setLayoutProperty('disease-trees-cluster', 'visibility', vis)
    map.setLayoutProperty('disease-trees-cluster-count', 'visibility', vis)
  }
)

watch(
  () => mapStore.layerVisibility.imageBbox,
  (visible) => {
    if (!map) return
    const vis = visible ? 'visible' : 'none'
    map.setLayoutProperty('image-bbox-fill', 'visibility', vis)
    map.setLayoutProperty('image-bbox-outline', 'visibility', vis)
  }
)

// ── 赣州示例数据：监测区多边形 + 病木黄色点 ─────────────────────
function initDemoLayers() {
  if (!map) return

  // 赣州市章贡区郊区松林监测区多边形（半透明绿色）
  map.addSource('demo-zone', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: DEMO_ZONES.map(zone => ({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: offsetPolygon(zone.coordinates),
        },
        properties: { name: zone.name },
      })),
    },
  })

  map.addLayer({
    id: 'demo-zone-fill',
    type: 'fill',
    source: 'demo-zone',
    paint: {
      'fill-color': '#00e676',
      'fill-opacity': 0.18,
    },
  })

  map.addLayer({
    id: 'demo-zone-outline',
    type: 'line',
    source: 'demo-zone',
    paint: {
      'line-color': '#00e676',
      'line-width': 2,
      'line-opacity': 0.7,
      'line-dasharray': [3, 2],
    },
  })

  // 随机生成病木黄色点（在多边形范围内）
  const demoPoints = generateDemoPoints()
  map.addSource('demo-disease-points', {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: demoPoints },
  })

  map.addLayer({
    id: 'demo-disease-points-layer',
    type: 'circle',
    source: 'demo-disease-points',
    paint: {
      'circle-color': '#ffeb3b',
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        10, 3, 14, 6, 18, 10,
      ],
      'circle-opacity': 0.85,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#ff9800',
      'circle-stroke-opacity': 0.6,
    },
  })

  // 点击病木点弹窗
  map.on('click', 'demo-disease-points-layer', (e) => {
    if (!e.features?.length) return
    const props = e.features[0].properties
    const coords = (e.features[0].geometry as GeoJSON.Point).coordinates as [number, number]
    new maplibregl.Popup({ className: 'disease-popup', maxWidth: '240px' })
      .setLngLat(coords)
      .setHTML(`
        <div class="popup-content">
          <div class="popup-title">🌲 疑似病死木（示例）</div>
          <div class="popup-row"><span class="popup-label">类型</span><span class="popup-value">${props?.type_label ?? '变色木'}</span></div>
          <div class="popup-row"><span class="popup-label">置信度</span><span class="popup-value">${props?.confidence ?? '87.3'}%</span></div>
          <div class="popup-row"><span class="popup-label">来源</span><span class="popup-value">示例演示数据</span></div>
        </div>
      `)
      .addTo(map!)
  })

  map.on('mouseenter', 'demo-disease-points-layer', () => {
    if (map) map.getCanvas().style.cursor = 'pointer'
  })
  map.on('mouseleave', 'demo-disease-points-layer', () => {
    if (map) map.getCanvas().style.cursor = ''
  })
}

// 在赣州郊区多边形范围内随机生成病木点
function generateDemoPoints(): GeoJSON.Feature[] {
  const types = [
    { type: 'discolored', label: '变色木', conf: () => (82 + Math.random() * 12).toFixed(1) },
    { type: 'dead_tree',  label: '枯死木', conf: () => (88 + Math.random() * 10).toFixed(1) },
    { type: 'suspected',  label: '疑似',   conf: () => (65 + Math.random() * 20).toFixed(1) },
  ]

  // 两个区域的边界框
  const zones = [
    { minLng: 114.905, maxLng: 114.958, minLat: 25.810, maxLat: 25.858, count: 38 },
    { minLng: 114.960, maxLng: 114.994, minLat: 25.839, maxLat: 25.869, count: 22 },
  ]

  const features: GeoJSON.Feature[] = []
  zones.forEach(zone => {
    for (let i = 0; i < zone.count; i++) {
      const lng = zone.minLng + Math.random() * (zone.maxLng - zone.minLng)
      const lat = zone.minLat + Math.random() * (zone.maxLat - zone.minLat)
      const [offsetLng, offsetLat] = offsetLngLat([lng, lat])
      const t = types[Math.floor(Math.random() * types.length)]
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [offsetLng, offsetLat] },
        properties: {
          type: t.type,
          type_label: t.label,
          confidence: t.conf(),
        },
      })
    }
  })
  return features
}

/**
 * 对 GeoJSON Polygon 的多环坐标进行统一偏移。
 */
function offsetPolygon(coordinates: [number, number][][]): [number, number][][] {
  return coordinates.map(ring => ring.map(offsetLngLat))
}

/**
 * 采用球面测地线终点公式，将经纬度按指定方位与距离偏移。
 */
function offsetLngLat([lng, lat]: [number, number]): [number, number] {
  const distanceMeters = DEMO_OFFSET_DISTANCE_KM * 1000
  const bearingRad = DEMO_OFFSET_BEARING_DEG * DEG_TO_RAD
  const latRad = lat * DEG_TO_RAD
  const lngRad = lng * DEG_TO_RAD
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS
  const sinLat = Math.sin(latRad)
  const cosLat = Math.cos(latRad)
  const sinAngular = Math.sin(angularDistance)
  const cosAngular = Math.cos(angularDistance)
  // 目标纬度（球面测地线终点公式）
  const sinLat2 = sinLat * cosAngular + cosLat * sinAngular * Math.cos(bearingRad)
  const lat2 = Math.asin(sinLat2)
  const y = Math.sin(bearingRad) * sinAngular * cosLat
  const x = cosAngular - sinLat * sinLat2
  // 目标经度（结合起点经度）
  const lng2 = lngRad + Math.atan2(y, x)
  return [normalizeLng((lng2 * 180) / Math.PI), (lat2 * 180) / Math.PI]
}

function normalizeLng(lngDeg: number): number {
  // 先包裹到 [0, 360) 再平移到 [-180, 180)
  const wrapped = ((lngDeg + HALF_CIRCLE_DEG) % FULL_CIRCLE_DEG + FULL_CIRCLE_DEG) % FULL_CIRCLE_DEG
  return wrapped - HALF_CIRCLE_DEG
}

// 暴露方法给父组件
defineExpose({ loadDetections, clearLayers, flyTo, flyToDemoCenter })

// ── 工具函数 ──────────────────────────────────────────────────
function getLabelText(label: string) {
  const labelMap: Record<string, string> = {
    dead_tree: '枯死木',
    discolored: '变色木',
    suspected: '疑似病木',
  }
  return labelMap[label] ?? label
}

function getSeverityText(severity: number) {
  return ['', '轻度', '中度', '重度'][severity] ?? '未知'
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    pending: '待核实',
    confirmed: '已确认',
    false_positive: '误报',
    cleared: '已清除',
  }
  return statusMap[status] ?? status
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
/* 弹窗全局样式（非 scoped） */
.disease-popup .maplibregl-popup-content {
  background: rgba(10, 20, 40, 0.95);
  border: 1px solid #1e3a5f;
  border-radius: 6px;
  padding: 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

.disease-popup .maplibregl-popup-tip {
  border-top-color: rgba(10, 20, 40, 0.95);
}

.popup-content {
  padding: 12px 14px;
  min-width: 200px;
}

.popup-title {
  font-size: 14px;
  font-weight: 600;
  color: #00d4ff;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #1e3a5f;
}

.popup-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 0;
}

.popup-label {
  font-size: 12px;
  color: #8bacc8;
}

.popup-value {
  font-size: 12px;
  color: #e8f4fd;
  font-weight: 500;
}
</style>
