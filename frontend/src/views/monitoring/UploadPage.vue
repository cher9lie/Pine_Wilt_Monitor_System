<template>
  <PageSkeleton title="影像上传与AI识别" description="上传遥感GeoTIFF影像，触发YOLOv8 ONNX推理，识别疑似松材线虫病死木并在地图上标注" status="done" :features="features">
    <div class="upload-content">
      <div class="map-section">
        <MapContainer ref="mapRef" />
      </div>
      <div class="panel-section">
        <TiffUploader />
      </div>
    </div>
  </PageSkeleton>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import PageSkeleton from '@/components/common/PageSkeleton.vue'
import MapContainer from '@/components/map/MapContainer.vue'
import TiffUploader from '@/components/upload/TiffUploader.vue'

const mapRef = ref()
const features = [
  { icon: '🛰️', name: '多源影像接入', desc: '支持高分二号/七号、Sentinel-2、无人机DOM等格式' },
  { icon: '🤖', name: 'YOLOv8 ONNX推理', desc: '本地RTX3060训练，服务器ARM64 CPU推理' },
  { icon: '📍', name: '空间定位', desc: '检测结果自动转换为CGCS2000坐标并写入PostGIS' },
]
</script>

<style scoped>
.upload-content { display: flex; height: calc(100vh - 180px); gap: 16px; }
.map-section { flex: 1; border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border); }
.panel-section { width: 300px; flex-shrink: 0; }
</style>
