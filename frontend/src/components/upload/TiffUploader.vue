<template>
  <div class="tiff-uploader">
    <div class="uploader-header">
      <span class="uploader-title">📡 遥感影像上传</span>
    </div>

    <!-- 上传区域 -->
    <el-upload
      ref="uploadRef"
      class="upload-dragger"
      drag
      :auto-upload="false"
      :limit="1"
      accept=".tif,.tiff,.geotiff"
      :on-change="handleFileChange"
      :on-exceed="handleExceed"
      :show-file-list="false"
    >
      <div class="upload-inner">
        <el-icon class="upload-icon"><Upload /></el-icon>
        <div class="upload-text">
          <p class="upload-main">拖拽 GeoTIFF 文件至此</p>
          <p class="upload-sub">或点击选择文件（支持 .tif / .tiff）</p>
        </div>
      </div>
    </el-upload>

    <!-- 已选文件信息 -->
    <div v-if="selectedFile" class="file-info">
      <el-icon class="file-icon"><Document /></el-icon>
      <div class="file-detail">
        <span class="file-name">{{ selectedFile.name }}</span>
        <span class="file-size">{{ formatSize(selectedFile.size) }}</span>
      </div>
      <el-icon class="file-remove" @click="clearFile"><Close /></el-icon>
    </div>

    <!-- 影像来源选择 -->
    <div v-if="selectedFile" class="source-select">
      <span class="source-label">影像来源</span>
      <el-select v-model="sourceType" size="small" class="source-dropdown">
        <el-option label="高分二号 (2m)" value="satellite_gf2" />
        <el-option label="高分七号 (0.8m)" value="satellite_gf7" />
        <el-option label="Sentinel-2 (10m)" value="sentinel2" />
        <el-option label="无人机正射 DOM" value="uav_dom" />
        <el-option label="其他" value="other" />
      </el-select>
    </div>

    <!-- 上传进度 -->
    <div v-if="uploadState === 'uploading'" class="progress-area">
      <div class="progress-label">
        <span>上传中...</span>
        <span>{{ uploadProgress }}%</span>
      </div>
      <el-progress
        :percentage="uploadProgress"
        :stroke-width="6"
        color="#00d4ff"
        :show-text="false"
      />
    </div>

    <!-- 推理进度 -->
    <div v-if="uploadState === 'inferring'" class="progress-area">
      <div class="progress-label">
        <span>AI 推理中（CPU 模式）...</span>
        <el-icon class="spin"><Loading /></el-icon>
      </div>
      <el-progress
        :percentage="100"
        status="striped"
        striped-flow
        :stroke-width="6"
        color="#00d4ff"
        :show-text="false"
      />
      <p class="infer-hint">YOLOv8 ONNX 推理中，大图可能需要 1-3 分钟</p>
    </div>

    <!-- 推理结果摘要 -->
    <div v-if="uploadState === 'done' && lastResult" class="result-summary">
      <div class="result-header">
        <el-icon class="result-icon-ok"><CircleCheck /></el-icon>
        <span>推理完成</span>
      </div>
      <div class="result-stats">
        <div class="stat-item">
          <span class="stat-val">{{ lastResult.detection_count }}</span>
          <span class="stat-label">识别点位</span>
        </div>
        <div class="stat-item">
          <span class="stat-val">{{ lastResult.persisted_count }}</span>
          <span class="stat-label">写入数据库</span>
        </div>
      </div>
      <p class="result-hint">地图已自动飞越至目标区域 ↗</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-msg">
      <el-icon><Warning /></el-icon>
      <span>{{ errorMsg }}</span>
    </div>

    <!-- 操作按钮 -->
    <div class="action-btns">
      <el-button
        v-if="selectedFile && uploadState === 'idle'"
        type="primary"
        size="small"
        :loading="false"
        class="upload-btn"
        @click="handleUploadAndInfer"
      >
        上传并分析
      </el-button>
      <el-button
        v-if="uploadState === 'done'"
        size="small"
        class="reset-btn"
        @click="reset"
      >
        重新上传
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, type UploadInstance, type UploadFile } from 'element-plus'
import {
  Upload, Document, Close, Loading,
  CircleCheck, Warning,
} from '@element-plus/icons-vue'
import { imagesApi } from '@/api/images'
import { useMapStore } from '@/stores/map'
import type { InferResponse } from '@/types'

const mapStore = useMapStore()
const uploadRef = ref<UploadInstance>()

const selectedFile = ref<File | null>(null)
const sourceType = ref('other')
const uploadProgress = ref(0)
const uploadState = ref<'idle' | 'uploading' | 'inferring' | 'done' | 'error'>('idle')
const lastResult = ref<InferResponse | null>(null)
const errorMsg = ref('')

function handleFileChange(file: UploadFile) {
  selectedFile.value = file.raw ?? null
  uploadState.value = 'idle'
  errorMsg.value = ''
  lastResult.value = null
}

function handleExceed() {
  ElMessage.warning('每次只能上传一个 TIFF 文件')
}

function clearFile() {
  selectedFile.value = null
  uploadRef.value?.clearFiles()
  uploadState.value = 'idle'
  errorMsg.value = ''
}

function reset() {
  clearFile()
  lastResult.value = null
  mapStore.clearDetections()
}

async function handleUploadAndInfer() {
  if (!selectedFile.value) return

  errorMsg.value = ''
  uploadProgress.value = 0

  try {
    // ── Step 1: 上传 TIFF ──────────────────────────────────
    uploadState.value = 'uploading'

    const uploadRes = await imagesApi.uploadTiff(
      selectedFile.value,
      sourceType.value,
      (pct) => { uploadProgress.value = pct }
    )

    const imageId = uploadRes.data.data.image_id
    ElMessage.success(`上传成功：${uploadRes.data.data.filename}`)

    // ── Step 2: 触发 AI 推理 ───────────────────────────────
    uploadState.value = 'inferring'

    const inferRes = await imagesApi.triggerInfer(imageId)
    const result = inferRes.data.data

    // ── Step 3: 更新地图 ───────────────────────────────────
    mapStore.setInferResult(result)
    lastResult.value = result
    uploadState.value = 'done'

    ElMessage.success(
      `推理完成！识别到 ${result.detection_count} 个疑似病死木，地图已定位`
    )
  } catch (err: unknown) {
    uploadState.value = 'error'
    const msg = (err as { response?: { data?: { message?: string; detail?: string } } })
      ?.response?.data?.message
      ?? (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      ?? '操作失败，请检查网络或联系管理员'
    errorMsg.value = msg
    ElMessage.error(msg)
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}
</script>

<style scoped>
.tiff-uploader {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.uploader-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.uploader-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
}

/* 上传拖拽区 */
:deep(.upload-dragger .el-upload-dragger) {
  background: var(--color-bg-card);
  border: 1px dashed var(--color-border-light);
  border-radius: 6px;
  height: 90px;
  transition: border-color 0.2s;
}

:deep(.upload-dragger .el-upload-dragger:hover) {
  border-color: var(--color-accent);
  background: rgba(0, 212, 255, 0.04);
}

.upload-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 6px;
}

.upload-icon {
  font-size: 24px;
  color: var(--color-accent);
}

.upload-main {
  font-size: 13px;
  color: var(--color-text-primary);
}

.upload-sub {
  font-size: 11px;
  color: var(--color-text-muted);
}

/* 文件信息 */
.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.file-icon {
  color: var(--color-accent);
  font-size: 16px;
  flex-shrink: 0;
}

.file-detail {
  flex: 1;
  min-width: 0;
}

.file-name {
  display: block;
  font-size: 12px;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-size {
  font-size: 11px;
  color: var(--color-text-muted);
}

.file-remove {
  cursor: pointer;
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: color 0.2s;
}

.file-remove:hover {
  color: var(--color-danger);
}

/* 来源选择 */
.source-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.source-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.source-dropdown {
  flex: 1;
}

:deep(.source-dropdown .el-input__wrapper) {
  background: var(--color-bg-card);
  border-color: var(--color-border);
}

/* 进度区域 */
.progress-area {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.infer-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  text-align: center;
}

/* 结果摘要 */
.result-summary {
  padding: 10px;
  background: rgba(0, 230, 118, 0.06);
  border: 1px solid rgba(0, 230, 118, 0.3);
  border-radius: 4px;
}

.result-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-success);
  margin-bottom: 8px;
}

.result-icon-ok {
  font-size: 16px;
}

.result-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-val {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.result-hint {
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 6px;
}

/* 错误提示 */
.error-msg {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(244, 67, 54, 0.08);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  font-size: 12px;
  color: var(--color-danger);
}

/* 操作按钮 */
.action-btns {
  display: flex;
  gap: 8px;
}

.upload-btn {
  flex: 1;
  background: linear-gradient(135deg, #00b4d8, #0077b6);
  border: none;
  font-weight: 600;
}

.reset-btn {
  flex: 1;
  background: var(--color-bg-card);
  border-color: var(--color-border);
  color: var(--color-text-secondary);
}
</style>
