import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { InferResponse, VegetationIndexPoint } from '@/types'

export const useMapStore = defineStore('map', () => {
  // MapLibre 实例（shallowRef 避免深度响应式代理）
  const mapInstance = shallowRef<MapLibreMap | null>(null)

  // 当前加载的影像 ID
  const activeImageId = ref<string | null>(null)

  // 当前推理结果
  const inferResult = ref<InferResponse | null>(null)

  // 植被指数时序数据（用于 ECharts 图表）
  const vegetationTimeSeries = ref<VegetationIndexPoint[]>([])

  // 图层可见性控制
  const layerVisibility = ref({
    diseaseTrees: true,   // 病死木点位
    alertZones: true,     // 预警区域
    forestPlots: false,   // 林业小班
    iotDevices: false,    // IoT 设备
    imageBbox: true,      // 影像范围框
  })

  // 底图类型
  const basemapType = ref<'satellite' | 'street'>('satellite')

  function setMap(map: MapLibreMap) {
    mapInstance.value = map
  }

  function setInferResult(result: InferResponse) {
    inferResult.value = result
    activeImageId.value = result.image_id
  }

  function clearDetections() {
    inferResult.value = null
    activeImageId.value = null
  }

  function toggleLayer(layer: keyof typeof layerVisibility.value) {
    layerVisibility.value[layer] = !layerVisibility.value[layer]
  }

  return {
    mapInstance, activeImageId, inferResult,
    vegetationTimeSeries, layerVisibility, basemapType,
    setMap, setInferResult, clearDetections, toggleLayer,
  }
})
