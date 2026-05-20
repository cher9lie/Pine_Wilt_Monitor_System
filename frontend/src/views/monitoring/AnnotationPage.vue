<template>
  <div class="annotation-page">
    <div class="page-header"><h2>病死木交互式标绘</h2><el-tag type="info" size="small">标注工具</el-tag></div>

    <div class="anno-layout">
      <!-- 左侧工具栏 -->
      <div class="tool-panel">
        <div class="tp-title">标绘工具</div>
        <div class="tool-group">
          <button class="tool-btn" :class="{ active: activeTool === 'point' }" @click="activeTool = 'point'">📍 标记点</button>
          <button class="tool-btn" :class="{ active: activeTool === 'polygon' }" @click="activeTool = 'polygon'">🔷 绘制面</button>
          <button class="tool-btn" :class="{ active: activeTool === 'select' }" @click="activeTool = 'select'">🖱️ 选择</button>
          <button class="tool-btn" :class="{ active: activeTool === 'delete' }" @click="activeTool = 'delete'">🗑️ 删除</button>
        </div>

        <div class="tp-title">病害属性</div>
        <el-form label-width="60px" size="small" class="attr-form">
          <el-form-item label="类型">
            <el-select v-model="attrForm.type" style="width:100%">
              <el-option label="枯死木" value="dead_tree" />
              <el-option label="变色木" value="discolored" />
              <el-option label="疑似" value="suspected" />
            </el-select>
          </el-form-item>
          <el-form-item label="严重度">
            <el-radio-group v-model="attrForm.severity">
              <el-radio :value="1">轻</el-radio>
              <el-radio :value="2">中</el-radio>
              <el-radio :value="3">重</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="树种">
            <el-input v-model="attrForm.species" placeholder="马尾松" />
          </el-form-item>
          <el-form-item label="审核意见">
            <el-input v-model="attrForm.note" type="textarea" :rows="2" />
          </el-form-item>
        </el-form>

        <div class="tp-title">标注统计</div>
        <div class="stat-list">
          <div class="sl-item"><span>标注总数</span><span class="sl-val">{{ annotations.length }}</span></div>
          <div class="sl-item"><span>枯死木</span><span class="sl-val text-red">{{ annotations.filter(a => a.type === 'dead_tree').length }}</span></div>
          <div class="sl-item"><span>变色木</span><span class="sl-val text-orange">{{ annotations.filter(a => a.type === 'discolored').length }}</span></div>
          <div class="sl-item"><span>疑似</span><span class="sl-val">{{ annotations.filter(a => a.type === 'suspected').length }}</span></div>
        </div>

        <el-button type="primary" size="small" class="save-btn">保存标注 → 样本库</el-button>
      </div>

      <!-- 右侧地图/影像区域 -->
      <div class="map-area">
        <div class="map-placeholder">
          <div class="mp-text">
            <p>🗺️ 正射影像标绘画布</p>
            <p class="mp-hint">加载正射影像后，使用左侧工具在影像上标记病死木位置</p>
            <p class="mp-hint">支持点标注（单株定位）和面标注（群落勾绘）</p>
          </div>
        </div>
        <!-- 底部模拟标注列表 -->
        <div class="anno-list">
          <div v-for="(anno, idx) in annotations" :key="idx" class="anno-item">
            <span class="anno-idx">#{{ idx + 1 }}</span>
            <el-tag size="small" :type="anno.type === 'dead_tree' ? 'danger' : anno.type === 'discolored' ? 'warning' : 'info'">{{ typeLabel(anno.type) }}</el-tag>
            <span class="anno-coord">{{ anno.lng.toFixed(5) }}, {{ anno.lat.toFixed(5) }}</span>
            <span class="anno-conf">{{ (anno.confidence * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'

const activeTool = ref('select')
const attrForm = reactive({ type: 'dead_tree', severity: 2, species: '马尾松', note: '' })

// 模拟已有标注（来自AI识别结果）
const annotations = ref([
  { type: 'dead_tree', lng: 112.6312, lat: 24.4723, confidence: 0.93, severity: 3 },
  { type: 'dead_tree', lng: 112.6325, lat: 24.4718, confidence: 0.87, severity: 3 },
  { type: 'discolored', lng: 112.6298, lat: 24.4731, confidence: 0.72, severity: 2 },
  { type: 'discolored', lng: 112.6341, lat: 24.4709, confidence: 0.68, severity: 2 },
  { type: 'suspected', lng: 112.6356, lat: 24.4742, confidence: 0.54, severity: 1 },
])

function typeLabel(t: string) { return { dead_tree: '枯死木', discolored: '变色木', suspected: '疑似' }[t] ?? t }
</script>

<style scoped>
.annotation-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.anno-layout { flex: 1; display: flex; gap: 14px; min-height: 0; }
.tool-panel { width: 260px; flex-shrink: 0; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.tp-title { font-size: 12px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; }
.tool-group { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.tool-btn { padding: 8px; background: var(--color-bg-card); border: 1px solid var(--color-border); border-radius: 4px; color: var(--color-text-primary); cursor: pointer; font-size: 12px; transition: all 0.2s; }
.tool-btn:hover { border-color: var(--color-accent); }
.tool-btn.active { border-color: var(--color-accent); background: rgba(0,212,255,0.1); color: var(--color-accent); }
.stat-list { display: flex; flex-direction: column; gap: 4px; }
.sl-item { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-secondary); padding: 3px 0; }
.sl-val { font-weight: 600; color: var(--color-text-primary); }
.text-red { color: #f44336 !important; } .text-orange { color: #ff9800 !important; }
.save-btn { margin-top: auto; width: 100%; }
.map-area { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.map-placeholder { flex: 1; background: var(--color-bg-card); border: 1px dashed var(--color-border-light); border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.mp-text { text-align: center; }
.mp-text p { color: var(--color-text-secondary); font-size: 14px; }
.mp-hint { font-size: 12px !important; color: var(--color-text-muted) !important; margin-top: 4px; }
.anno-list { max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.anno-item { display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 4px; font-size: 12px; }
.anno-idx { color: var(--color-text-muted); font-weight: 600; }
.anno-coord { font-family: monospace; color: var(--color-text-muted); flex: 1; }
.anno-conf { color: var(--color-accent); font-weight: 600; }
:deep(.attr-form .el-form-item) { margin-bottom: 8px; }
</style>
