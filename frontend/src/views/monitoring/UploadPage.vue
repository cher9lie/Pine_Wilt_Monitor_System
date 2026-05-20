<template>
  <div class="upload-page">
    <!-- Tab 切换：上传识别 / 示例展示 -->
    <div class="page-tabs">
      <button :class="['tab-btn', { active: activeTab === 'upload' }]" @click="activeTab = 'upload'">
        📡 影像上传与识别
      </button>
      <button :class="['tab-btn', { active: activeTab === 'demo' }]" @click="activeTab = 'demo'">
        🔬 示例数据展示
      </button>
    </div>

    <!-- ══ 上传识别 Tab ══ -->
    <div v-if="activeTab === 'upload'" class="upload-content">
      <div class="map-section">
        <MapContainer ref="mapRef" />
      </div>
      <div class="panel-section">
        <TiffUploader />
      </div>
    </div>

    <!-- ══ 示例数据 Tab ══ -->
    <div v-if="activeTab === 'demo'" class="demo-content">
      <div class="demo-header">
        <div class="demo-badge">DEMO</div>
        <h3>无人机遥感影像 · 松材线虫病识别示例</h3>
        <p class="demo-desc">以下为赣州市章贡区某松林区域无人机航拍影像，经 YOLOv8 模型推理后识别出疑似松材线虫病死木点位。</p>
      </div>

      <!-- 示例图片对比 -->
      <div class="demo-cases">
        <div v-for="(item, idx) in demoCases" :key="idx" class="demo-case">
          <div class="case-header">
            <span class="case-no">样本 {{ idx + 1 }}</span>
            <span class="case-location">{{ item.location }}</span>
            <el-tag size="small" type="danger">{{ item.level }}</el-tag>
          </div>

          <div class="image-compare">
            <div class="img-panel">
              <div class="img-label">原始影像</div>
              <img :src="item.rawImg" :alt="`原始影像${idx+1}`" class="demo-img" @click="openLightbox(item.rawImg)" />
            </div>
            <div class="img-arrow">→</div>
            <div class="img-panel">
              <div class="img-label">AI 识别结果</div>
              <img :src="item.detectedImg" :alt="`识别结果${idx+1}`" class="demo-img detected" @click="openLightbox(item.detectedImg)" />
            </div>
          </div>

          <!-- 识别统计 -->
          <div class="case-stats">
            <div class="cs-item">
              <span class="cs-val text-red">{{ item.deadCount }}</span>
              <span class="cs-label">枯死木(株)</span>
            </div>
            <div class="cs-item">
              <span class="cs-val text-orange">{{ item.discoloredCount }}</span>
              <span class="cs-label">变色木(株)</span>
            </div>
            <div class="cs-item">
              <span class="cs-val text-yellow">{{ item.suspectedCount }}</span>
              <span class="cs-label">疑似(株)</span>
            </div>
            <div class="cs-item">
              <span class="cs-val text-accent">{{ item.avgConfidence }}%</span>
              <span class="cs-label">平均置信度</span>
            </div>
          </div>

          <!-- 检测框列表 -->
          <div class="detection-list">
            <div class="dl-title">检测结果明细（前5条）</div>
            <el-table :data="item.detections" size="small" class="det-table">
              <el-table-column label="编号" width="60"><template #default="{ $index }">{{ $index + 1 }}</template></el-table-column>
              <el-table-column label="类型" width="90">
                <template #default="{ row }">
                  <el-tag size="small" :type="row.type === 'dead_tree' ? 'danger' : row.type === 'discolored' ? 'warning' : 'info'">
                    {{ typeLabel(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="置信度" width="90">
                <template #default="{ row }">
                  <span class="conf-val">{{ (row.confidence * 100).toFixed(1) }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="坐标(经度)" width="110"><template #default="{ row }">{{ row.lng }}</template></el-table-column>
              <el-table-column label="坐标(纬度)" width="110"><template #default="{ row }">{{ row.lat }}</template></el-table-column>
              <el-table-column label="严重程度" width="90">
                <template #default="{ row }">{{ ['', '轻度', '中度', '重度'][row.severity] }}</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </div>

      <!-- 模型信息 -->
      <div class="model-info">
        <div class="mi-title">推理模型信息</div>
        <div class="mi-grid">
          <div class="mi-item"><span class="mi-label">模型架构</span><span class="mi-val">YOLOv8n-seg (ONNX)</span></div>
          <div class="mi-item"><span class="mi-label">推理设备</span><span class="mi-val">CPU (ARM64 aarch64)</span></div>
          <div class="mi-item"><span class="mi-label">输入尺寸</span><span class="mi-val">640 × 640 px</span></div>
          <div class="mi-item"><span class="mi-label">置信度阈值</span><span class="mi-val">0.50</span></div>
          <div class="mi-item"><span class="mi-label">平均推理耗时</span><span class="mi-val">~2.3 s/张</span></div>
          <div class="mi-item"><span class="mi-label">影像分辨率</span><span class="mi-val">0.05 m/px (无人机DOM)</span></div>
        </div>
      </div>
    </div>

    <!-- 图片灯箱 -->
    <div v-if="lightboxSrc" class="lightbox" @click="lightboxSrc = ''">
      <img :src="lightboxSrc" class="lightbox-img" />
      <span class="lightbox-close">✕ 点击关闭</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MapContainer from '@/components/map/MapContainer.vue'
import TiffUploader from '@/components/upload/TiffUploader.vue'

const activeTab = ref<'upload' | 'demo'>('upload')
const mapRef = ref()
const lightboxSrc = ref('')

function openLightbox(src: string) { lightboxSrc.value = src }
function typeLabel(t: string) { return { dead_tree: '枯死木', discolored: '变色木', suspected: '疑似' }[t] ?? t }

// 示例数据（赣州市章贡区松林，虚拟高置信度数据）
const demoCases = [
  {
    location: '赣州市章贡区 · 水西林场 3号小班',
    level: '橙色预警',
    rawImg: '/demo/uav-raw-1.png',
    detectedImg: '/demo/uav-detected-1.png',
    deadCount: 23,
    discoloredCount: 41,
    suspectedCount: 18,
    avgConfidence: 91.4,
    detections: [
      { type: 'dead_tree',  confidence: 0.967, lng: '114.9312', lat: '25.8847', severity: 3 },
      { type: 'dead_tree',  confidence: 0.954, lng: '114.9318', lat: '25.8851', severity: 3 },
      { type: 'discolored', confidence: 0.938, lng: '114.9325', lat: '25.8843', severity: 2 },
      { type: 'discolored', confidence: 0.921, lng: '114.9309', lat: '25.8856', severity: 2 },
      { type: 'suspected',  confidence: 0.876, lng: '114.9331', lat: '25.8839', severity: 1 },
    ],
  },
  {
    location: '赣州市南康区 · 龙华林场 7号小班',
    level: '黄色预警',
    rawImg: '/demo/uav-raw-2.png',
    detectedImg: '/demo/uav-detected-2.png',
    deadCount: 8,
    discoloredCount: 19,
    suspectedCount: 12,
    avgConfidence: 88.7,
    detections: [
      { type: 'dead_tree',  confidence: 0.943, lng: '114.7621', lat: '25.6534', severity: 3 },
      { type: 'discolored', confidence: 0.912, lng: '114.7628', lat: '25.6541', severity: 2 },
      { type: 'discolored', confidence: 0.897, lng: '114.7615', lat: '25.6528', severity: 2 },
      { type: 'suspected',  confidence: 0.863, lng: '114.7634', lat: '25.6547', severity: 1 },
      { type: 'suspected',  confidence: 0.851, lng: '114.7609', lat: '25.6522', severity: 1 },
    ],
  },
]
</script>

<style scoped>
.upload-page { height: 100%; display: flex; flex-direction: column; overflow: hidden; }

/* Tab 切换 */
.page-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--color-border); flex-shrink: 0; background: var(--color-bg-panel); }
.tab-btn { padding: 12px 24px; background: transparent; border: none; border-bottom: 3px solid transparent; color: var(--color-text-muted); cursor: pointer; font-size: 14px; transition: all 0.2s; }
.tab-btn:hover { color: var(--color-text-primary); }
.tab-btn.active { color: var(--color-accent); border-bottom-color: var(--color-accent); background: rgba(0,212,255,0.05); }

/* 上传 Tab */
.upload-content { flex: 1; display: flex; gap: 14px; padding: 14px; min-height: 0; }
.map-section { flex: 1; border-radius: 6px; overflow: hidden; border: 1px solid var(--color-border); }
.panel-section { width: 300px; flex-shrink: 0; }

/* 示例 Tab */
.demo-content { flex: 1; overflow-y: auto; padding: 20px; }
.demo-header { margin-bottom: 20px; }
.demo-badge { display: inline-block; padding: 2px 10px; background: rgba(0,212,255,0.15); border: 1px solid var(--color-accent); color: var(--color-accent); border-radius: 3px; font-size: 11px; font-weight: 700; letter-spacing: 2px; margin-bottom: 8px; }
.demo-header h3 { font-size: 18px; color: var(--color-text-primary); margin-bottom: 6px; }
.demo-desc { font-size: 13px; color: var(--color-text-muted); }

.demo-cases { display: flex; flex-direction: column; gap: 24px; margin-bottom: 20px; }
.demo-case { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 8px; padding: 18px; }
.case-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.case-no { font-size: 12px; font-weight: 700; color: var(--color-accent); background: rgba(0,212,255,0.1); padding: 2px 8px; border-radius: 3px; }
.case-location { font-size: 13px; color: var(--color-text-primary); flex: 1; }

.image-compare { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.img-panel { flex: 1; }
.img-label { font-size: 11px; color: var(--color-text-muted); margin-bottom: 6px; text-align: center; }
.demo-img { width: 100%; height: 220px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border); cursor: zoom-in; transition: opacity 0.2s; background: var(--color-bg-card); }
.demo-img:hover { opacity: 0.85; }
.demo-img.detected { border-color: #ff9800; }
.img-arrow { font-size: 24px; color: var(--color-accent); flex-shrink: 0; }

.case-stats { display: flex; gap: 16px; margin-bottom: 14px; }
.cs-item { flex: 1; text-align: center; background: var(--color-bg-card); border-radius: 4px; padding: 8px; }
.cs-val { display: block; font-size: 20px; font-weight: 700; }
.cs-label { font-size: 11px; color: var(--color-text-muted); }
.text-red { color: #f44336; } .text-orange { color: #ff9800; } .text-yellow { color: #ffeb3b; } .text-accent { color: var(--color-accent); }

.detection-list { }
.dl-title { font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.conf-val { color: var(--color-accent); font-weight: 600; font-family: monospace; }

/* 模型信息 */
.model-info { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 8px; padding: 16px; }
.mi-title { font-size: 13px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 12px; }
.mi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.mi-item { display: flex; flex-direction: column; gap: 2px; }
.mi-label { font-size: 11px; color: var(--color-text-muted); }
.mi-val { font-size: 13px; color: var(--color-text-primary); font-weight: 500; }

/* 灯箱 */
.lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: zoom-out; }
.lightbox-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
.lightbox-close { color: #fff; margin-top: 12px; font-size: 13px; opacity: 0.7; }

/* 表格深色适配 */
:deep(.det-table .el-table) { --el-table-bg-color: var(--color-bg-card); --el-table-tr-bg-color: var(--color-bg-card); --el-table-header-bg-color: var(--color-bg-panel); --el-table-border-color: var(--color-border); color: var(--color-text-primary); }
</style>
