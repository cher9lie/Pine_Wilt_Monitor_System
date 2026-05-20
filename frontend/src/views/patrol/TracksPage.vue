<template>
  <div class="tracks-page">
    <div class="page-header">
      <h2>巡查轨迹记录</h2>
      <el-tag v-if="isMock" type="info" size="small">演示数据</el-tag>
    </div>

    <div class="tracks-layout">
      <!-- 左侧轨迹列表 -->
      <div class="tracks-list">
        <div
          v-for="track in tracks" :key="track.id"
          class="track-card" :class="{ active: selectedTrack?.id === track.id }"
          @click="selectTrack(track)"
        >
          <div class="track-header">
            <span class="track-user">{{ track.real_name ?? track.username }}</span>
            <el-tag size="small" type="info">{{ formatDate(track.started_at) }}</el-tag>
          </div>
          <div class="track-meta">
            <span>🕐 {{ formatDuration(track.started_at, track.ended_at) }}</span>
            <span>📏 {{ track.distance_km?.toFixed(1) ?? '-' }} km</span>
            <span>📍 {{ track.point_count ?? 0 }} 点</span>
          </div>
        </div>
        <el-empty v-if="tracks.length === 0 && !loading" description="暂无轨迹数据" :image-size="48" />
      </div>

      <!-- 右侧地图 -->
      <div class="track-map">
        <div ref="mapEl" class="map-container" />
        <div v-if="selectedTrack" class="map-overlay">
          <div class="overlay-info">
            <span>{{ selectedTrack.real_name ?? selectedTrack.username }}</span>
            <span>{{ selectedTrack.distance_km?.toFixed(1) }} km</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import * as maplibregl from 'maplibre-gl'
import type { Map, GeoJSONSource } from 'maplibre-gl'
import { patrolApi, type TrackItem } from '@/api/patrol'

const tracks = ref<TrackItem[]>([])
const loading = ref(false)
const isMock = ref(false)
const selectedTrack = ref<TrackItem | null>(null)
const mapEl = ref<HTMLDivElement>()
let map: Map | null = null

async function loadTracks() {
  loading.value = true
  try {
    const res = await patrolApi.getTracks()
    tracks.value = res.data.data.items
    isMock.value = !!(res.data.data as Record<string, unknown>).is_mock
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function selectTrack(track: TrackItem) {
  selectedTrack.value = track
  if (map && track.track_geojson) {
    const source = map.getSource('track-line') as GeoJSONSource
    source?.setData({
      type: 'Feature',
      geometry: track.track_geojson,
      properties: {},
    })

    // FlyTo 轨迹中心
    const coords = track.track_geojson.coordinates
    if (coords.length > 0) {
      const centerIdx = Math.floor(coords.length / 2)
      map.flyTo({ center: coords[centerIdx] as [number, number], zoom: 13, duration: 1000 })
    }
  }
}

function initMap() {
  if (!mapEl.value) return
  map = new maplibregl.Map({
    container: mapEl.value,
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
          tileSize: 256, maxzoom: 19,
        },
      },
      layers: [{ id: 'satellite', type: 'raster', source: 'esri-satellite' }],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
    },
    center: [112.5, 24.5],
    zoom: 9,
  })

  map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

  map.on('load', () => {
    map!.addSource('track-line', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map!.addLayer({
      id: 'track-line-layer', type: 'line', source: 'track-line',
      paint: { 'line-color': '#00d4ff', 'line-width': 4, 'line-opacity': 0.9 },
    })
    // 起点终点标记层
    map!.addLayer({
      id: 'track-line-glow', type: 'line', source: 'track-line',
      paint: { 'line-color': '#00d4ff', 'line-width': 8, 'line-opacity': 0.3, 'line-blur': 4 },
    })
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return '进行中'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  const hours = Math.floor(ms / 3600000)
  const mins = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${mins}m`
}

onMounted(async () => {
  await loadTracks()
  await nextTick()
  initMap()
})

onUnmounted(() => { map?.remove() })
</script>

<style scoped>
.tracks-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.tracks-layout { flex: 1; display: flex; gap: 14px; min-height: 0; }
.tracks-list { width: 320px; flex-shrink: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }

.track-card { padding: 12px 14px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; cursor: pointer; transition: all 0.2s; }
.track-card:hover { border-color: var(--color-accent); }
.track-card.active { border-color: var(--color-accent); background: rgba(0,212,255,0.06); }
.track-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.track-user { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
.track-meta { display: flex; gap: 12px; font-size: 12px; color: var(--color-text-muted); }

.track-map { flex: 1; position: relative; border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border); }
.map-container { width: 100%; height: 100%; }

.map-overlay { position: absolute; top: 12px; left: 12px; background: rgba(10,14,26,0.85); padding: 8px 14px; border-radius: 4px; border: 1px solid var(--color-border); }
.overlay-info { display: flex; gap: 16px; font-size: 13px; color: var(--color-text-primary); }
</style>
