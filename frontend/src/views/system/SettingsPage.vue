<template>
  <div class="settings-page">
    <div class="page-header"><h2>系统设置</h2></div>

    <div class="settings-grid">
      <!-- 预警阈值配置 -->
      <div class="setting-card">
        <div class="sc-title">🚨 预警阈值配置</div>
        <el-form label-width="140px" size="small" class="setting-form">
          <el-form-item label="黄色预警(疫木数)"><el-input-number v-model="thresholds.yellow_count" :min="1" /></el-form-item>
          <el-form-item label="橙色预警(疫木数)"><el-input-number v-model="thresholds.orange_count" :min="5" /></el-form-item>
          <el-form-item label="红色预警(疫木数)"><el-input-number v-model="thresholds.red_count" :min="20" /></el-form-item>
          <el-form-item label="黄色预警(面积ha)"><el-input-number v-model="thresholds.yellow_area" :min="0.1" :step="0.1" /></el-form-item>
          <el-form-item label="橙色预警(面积ha)"><el-input-number v-model="thresholds.orange_area" :min="0.5" :step="0.5" /></el-form-item>
          <el-form-item label="红色预警(面积ha)"><el-input-number v-model="thresholds.red_area" :min="2" :step="1" /></el-form-item>
          <el-form-item><el-button type="primary" size="small">保存阈值</el-button></el-form-item>
        </el-form>
      </div>

      <!-- AI 推理配置 -->
      <div class="setting-card">
        <div class="sc-title">🤖 AI 推理配置</div>
        <el-form label-width="140px" size="small" class="setting-form">
          <el-form-item label="置信度阈值"><el-slider v-model="aiConfig.confidence" :min="0.1" :max="1" :step="0.05" show-input /></el-form-item>
          <el-form-item label="模型文件路径"><el-input v-model="aiConfig.model_path" disabled /><template #label><span>模型文件路径 <el-tag size="small" type="info">只读</el-tag></span></template></el-form-item>
          <el-form-item label="推理瓦片大小"><el-input-number v-model="aiConfig.tile_size" :min="256" :max="1024" :step="64" /></el-form-item>
          <el-form-item label="瓦片重叠像素"><el-input-number v-model="aiConfig.overlap" :min="0" :max="128" :step="16" /></el-form-item>
          <el-form-item><el-button type="primary" size="small">保存配置</el-button></el-form-item>
        </el-form>
      </div>

      <!-- 系统信息 -->
      <div class="setting-card">
        <div class="sc-title">ℹ️ 系统信息</div>
        <div class="info-list">
          <div class="info-row"><span class="info-label">系统版本</span><span class="info-val">v1.0.0</span></div>
          <div class="info-row"><span class="info-label">前端框架</span><span class="info-val">Vue 3.4 + Vite 5</span></div>
          <div class="info-row"><span class="info-label">后端框架</span><span class="info-val">Node.js 22 + Express</span></div>
          <div class="info-row"><span class="info-label">AI 引擎</span><span class="info-val">ONNX Runtime 1.18 (CPU)</span></div>
          <div class="info-row"><span class="info-label">数据库</span><span class="info-val">PostgreSQL 15 + PostGIS 3.6</span></div>
          <div class="info-row"><span class="info-label">地图引擎</span><span class="info-val">MapLibre GL JS 4.4</span></div>
          <div class="info-row"><span class="info-label">部署架构</span><span class="info-val">ARM64 aarch64 (CPU)</span></div>
          <div class="info-row"><span class="info-label">坐标系</span><span class="info-val">CGCS2000 (EPSG:4490)</span></div>
        </div>
      </div>

      <!-- 数据库运维 -->
      <div class="setting-card">
        <div class="sc-title">💾 数据库运维</div>
        <div class="ops-btns">
          <el-button size="small">空间索引重建 (REINDEX)</el-button>
          <el-button size="small">表空间收缩 (VACUUM)</el-button>
          <el-button size="small">生成数据库快照</el-button>
          <el-button size="small" type="danger" plain>清理过期缓存</el-button>
        </div>
        <div class="ops-note">上次 VACUUM：2025-01-18 02:00:00 | 数据库大小：1.2 GB</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const thresholds = reactive({ yellow_count: 5, orange_count: 20, red_count: 100, yellow_area: 0.5, orange_area: 2.0, red_area: 10.0 })
const aiConfig = reactive({ confidence: 0.5, model_path: 'ai_service/models/yolov8_pine_best.onnx', tile_size: 640, overlap: 64 })
</script>

<style scoped>
.settings-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.setting-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 18px; }
.sc-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--color-border); }
.info-list { display: flex; flex-direction: column; gap: 8px; }
.info-row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; border-bottom: 1px dashed var(--color-border); }
.info-row:last-child { border-bottom: none; }
.info-label { color: var(--color-text-muted); }
.info-val { color: var(--color-text-primary); font-weight: 500; }
.ops-btns { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.ops-note { font-size: 11px; color: var(--color-text-muted); }
:deep(.el-slider__runway) { background: var(--color-bg-card); }
:deep(.el-slider__bar) { background: var(--color-accent); }
:deep(.el-input-number) { width: 140px; }
</style>
