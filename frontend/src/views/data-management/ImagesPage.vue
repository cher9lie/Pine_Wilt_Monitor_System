<template>
  <div class="images-page">
    <div class="page-header">
      <h2>遥感影像库</h2>
      <el-button type="primary" size="small" @click="$router.push('/monitoring/upload')">
        <el-icon><Upload /></el-icon> 上传影像
      </el-button>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <el-select v-model="filterSource" placeholder="影像来源" size="small" clearable @change="load" class="fw-140">
        <el-option label="高分二号 (2m)" value="satellite_gf2" />
        <el-option label="高分七号 (0.8m)" value="satellite_gf7" />
        <el-option label="Sentinel-2 (10m)" value="sentinel2" />
        <el-option label="无人机 DOM" value="uav_dom" />
      </el-select>
      <el-select v-model="filterStatus" placeholder="处理状态" size="small" clearable @change="load" class="fw-120">
        <el-option label="已上传" value="uploaded" />
        <el-option label="预处理中" value="preprocessing" />
        <el-option label="就绪" value="ready" />
        <el-option label="已推理" value="inferred" />
        <el-option label="失败" value="failed" />
      </el-select>
      <el-button size="small" @click="load">刷新</el-button>
      <el-tag v-if="isMock" type="info" size="small">演示数据</el-tag>
    </div>

    <!-- 影像表格 -->
    <el-table :data="images" v-loading="loading" size="small" stripe>
      <el-table-column prop="filename" label="文件名" min-width="200" show-overflow-tooltip>
        <template #default="{ row }"><span class="filename-text">{{ row.filename }}</span></template>
      </el-table-column>
      <el-table-column label="来源" width="120">
        <template #default="{ row }">
          <el-tag size="small">{{ sourceLabel(row.source_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分辨率" width="90">
        <template #default="{ row }">{{ row.resolution_m ? `${row.resolution_m}m` : '-' }}</template>
      </el-table-column>
      <el-table-column label="云量" width="70">
        <template #default="{ row }">{{ row.cloud_cover != null ? `${(row.cloud_cover*100).toFixed(0)}%` : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="imgStatusTag(row.status)">{{ imgStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="NDVI" width="70">
        <template #default="{ row }"><span :class="row.ndvi_path ? 'has-vi' : 'no-vi'">{{ row.ndvi_path ? '✓' : '-' }}</span></template>
      </el-table-column>
      <el-table-column label="采集时间" width="140">
        <template #default="{ row }">{{ row.captured_at ? new Date(row.captured_at).toLocaleDateString('zh-CN') : '-' }}</template>
      </el-table-column>
      <el-table-column label="上传时间" width="140">
        <template #default="{ row }">{{ new Date(row.created_at).toLocaleString('zh-CN') }}</template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar">
      <el-pagination v-model:current-page="currentPage" :page-size="20" :total="total" layout="total, prev, pager, next" small @current-change="load" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Upload } from '@element-plus/icons-vue'
import { imagesApi } from '@/api/images'
import type { ImageRecord } from '@/types'

const images = ref<(ImageRecord & { resolution_m?: number; cloud_cover?: number; ndvi_path?: string; captured_at?: string })[]>([])
const loading = ref(false)
const isMock = ref(false)
const currentPage = ref(1)
const total = ref(0)
const filterSource = ref('')
const filterStatus = ref('')

async function load() {
  loading.value = true
  try {
    const res = await imagesApi.list({ page: currentPage.value, page_size: 20, status: filterStatus.value || undefined })
    images.value = res.data.data.items
    total.value = res.data.data.pagination.total
    isMock.value = false

    // 若无数据展示模拟
    if (images.value.length === 0) {
      images.value = getMockImages()
      total.value = images.value.length
      isMock.value = true
    }
  } catch { isMock.value = true; images.value = getMockImages(); total.value = images.value.length }
  finally { loading.value = false }
}

function sourceLabel(s: string) { return { satellite_gf2: '高分二号', satellite_gf7: '高分七号', sentinel2: 'Sentinel-2', uav_dom: '无人机DOM', other: '其他' }[s] ?? s }
function imgStatusLabel(s: string) { return { uploaded: '已上传', preprocessing: '处理中', ready: '就绪', inferred: '已推理', failed: '失败' }[s] ?? s }
function imgStatusTag(s: string) { return { uploaded: 'info', preprocessing: 'warning', ready: 'success', inferred: 'success', failed: 'danger' }[s] as any ?? 'info' }

function getMockImages() {
  return [
    { id: 'img-001', filename: 'GF2_PMS_20241115_HB_2m.tif', source_type: 'satellite_gf2', resolution_m: 2, cloud_cover: 0.05, status: 'inferred', ndvi_path: '/vegetation-index/ndvi/img-001.tif', captured_at: '2024-11-15T03:20:00Z', created_at: '2024-11-16T08:00:00Z' },
    { id: 'img-002', filename: 'GF7_PAN_20241120_HST_08m.tif', source_type: 'satellite_gf7', resolution_m: 0.8, cloud_cover: 0.12, status: 'inferred', ndvi_path: null, captured_at: '2024-11-20T02:45:00Z', created_at: '2024-11-21T09:30:00Z' },
    { id: 'img-003', filename: 'S2B_MSIL2A_20241201_XZ_10m.tif', source_type: 'sentinel2', resolution_m: 10, cloud_cover: 0.18, status: 'ready', ndvi_path: '/vegetation-index/ndvi/img-003.tif', captured_at: '2024-12-01T03:10:00Z', created_at: '2024-12-02T10:00:00Z' },
    { id: 'img-004', filename: 'UAV_DOM_20241210_TH_005m.tif', source_type: 'uav_dom', resolution_m: 0.05, cloud_cover: 0, status: 'inferred', ndvi_path: '/vegetation-index/ndvi/img-004.tif', captured_at: '2024-12-10T06:30:00Z', created_at: '2024-12-10T14:00:00Z' },
    { id: 'img-005', filename: 'GF2_PMS_20250105_DP_2m.tif', source_type: 'satellite_gf2', resolution_m: 2, cloud_cover: 0.32, status: 'failed', ndvi_path: null, captured_at: '2025-01-05T03:15:00Z', created_at: '2025-01-06T08:00:00Z' },
    { id: 'img-006', filename: 'UAV_DOM_20250115_HB_003m.tif', source_type: 'uav_dom', resolution_m: 0.03, cloud_cover: 0, status: 'uploaded', ndvi_path: null, captured_at: '2025-01-15T07:00:00Z', created_at: '2025-01-15T15:30:00Z' },
  ] as any[]
}

onMounted(load)
</script>

<style scoped>
.images-page { padding: 20px; height: 100%; display: flex; flex-direction: column; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.filter-bar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; }
.fw-140 { width: 140px; } .fw-120 { width: 120px; }
.filename-text { font-family: monospace; font-size: 12px; color: var(--color-text-primary); }
.has-vi { color: #00e676; font-weight: 600; } .no-vi { color: var(--color-text-muted); }
.pagination-bar { margin-top: 12px; display: flex; justify-content: flex-end; }
</style>
