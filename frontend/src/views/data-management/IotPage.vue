<template>
  <div class="iot-page">
    <div class="page-header">
      <h2>IoT 设备管理</h2>
      <el-tag v-if="isMock" type="info" size="small">演示数据</el-tag>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="iot-stat"><div class="is-icon">📡</div><div class="is-data"><span class="is-val">{{ stats.total }}</span><span class="is-label">设备总数</span></div></div>
      <div class="iot-stat online"><div class="is-icon">🟢</div><div class="is-data"><span class="is-val">{{ stats.online }}</span><span class="is-label">在线</span></div></div>
      <div class="iot-stat offline"><div class="is-icon">🔴</div><div class="is-data"><span class="is-val">{{ stats.offline }}</span><span class="is-label">离线</span></div></div>
      <div class="iot-stat fault"><div class="is-icon">⚠️</div><div class="is-data"><span class="is-val">{{ stats.fault }}</span><span class="is-label">故障</span></div></div>
      <div class="iot-stat"><div class="is-icon">🔋</div><div class="is-data"><span class="is-val">{{ Number(stats.avg_battery).toFixed(0) }}%</span><span class="is-label">平均电量</span></div></div>
    </div>

    <!-- 设备表格 -->
    <el-table :data="devices" size="small" stripe class="iot-table">
      <el-table-column prop="device_code" label="设备编号" width="150">
        <template #default="{ row }"><span class="code-text">{{ row.device_code }}</span></template>
      </el-table-column>
      <el-table-column prop="name" label="设备名称" min-width="180" />
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag size="small" :type="deviceTypeTag(row.device_type)">{{ deviceTypeLabel(row.device_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <span class="status-badge" :class="`st-${row.status}`">{{ statusLabel(row.status) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="电量" width="90">
        <template #default="{ row }">
          <div class="battery-bar">
            <div class="battery-fill" :style="{ width: `${row.battery_pct}%`, background: batteryColor(row.battery_pct) }" />
          </div>
          <span class="battery-text">{{ row.battery_pct }}%</span>
        </template>
      </el-table-column>
      <el-table-column label="信号(dBm)" width="100">
        <template #default="{ row }">
          <span :class="signalClass(row.signal_strength)">{{ row.signal_strength ?? '-' }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="firmware_ver" label="固件" width="80" />
      <el-table-column label="最后心跳" width="160">
        <template #default="{ row }">
          {{ row.last_heartbeat ? new Date(row.last_heartbeat).toLocaleString('zh-CN') : '-' }}
        </template>
      </el-table-column>
      <el-table-column label="位置" width="160">
        <template #default="{ row }">
          <span v-if="row.geojson" class="coord-text">{{ row.geojson.coordinates[0].toFixed(4) }}, {{ row.geojson.coordinates[1].toFixed(4) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import http from '@/api/http'

interface IotDevice {
  id: string; device_code: string; device_type: string; name: string
  status: string; battery_pct: number; signal_strength: number | null
  firmware_ver: string; last_heartbeat: string | null
  geojson: { type: string; coordinates: number[] } | null
}

const devices = ref<IotDevice[]>([])
const isMock = ref(false)
const stats = reactive({ total: 0, online: 0, offline: 0, fault: 0, avg_battery: 0 })

async function load() {
  try {
    const [devRes, statRes] = await Promise.all([
      http.get('/data/iot-devices'),
      http.get('/data/iot-devices/stats'),
    ])
    devices.value = devRes.data.data
    isMock.value = !!devRes.data.is_mock
    Object.assign(stats, statRes.data.data)
  } catch { /* ignore */ }
}

function deviceTypeLabel(t: string) { return { trap: '诱捕器', weather: '气象站', soil: '土壤', camera: '相机' }[t] ?? t }
function deviceTypeTag(t: string) { return { trap: 'warning', weather: '', soil: 'success', camera: 'info' }[t] as any ?? 'info' }
function statusLabel(s: string) { return { online: '在线', offline: '离线', fault: '故障', maintenance: '维护中' }[s] ?? s }
function batteryColor(pct: number) { if (pct > 60) return '#00e676'; if (pct > 20) return '#ffab40'; return '#f44336' }
function signalClass(s: number | null) { if (!s) return 'sig-none'; if (s > -60) return 'sig-good'; if (s > -80) return 'sig-ok'; return 'sig-weak' }

onMounted(load)
</script>

<style scoped>
.iot-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
.iot-stat { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; min-width: 130px; }
.iot-stat.online { border-top: 3px solid #00e676; }
.iot-stat.offline { border-top: 3px solid #ff9800; }
.iot-stat.fault { border-top: 3px solid #f44336; }
.is-icon { font-size: 22px; }
.is-data { display: flex; flex-direction: column; }
.is-val { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.is-label { font-size: 11px; color: var(--color-text-muted); }

.code-text { font-family: monospace; font-size: 12px; color: var(--color-accent); }
.status-badge { font-size: 12px; font-weight: 600; }
.st-online { color: #00e676; }
.st-offline { color: #ff9800; }
.st-fault { color: #f44336; }

.battery-bar { width: 50px; height: 8px; background: var(--color-bg-card); border-radius: 4px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 6px; }
.battery-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.battery-text { font-size: 11px; color: var(--color-text-muted); }

.sig-good { color: #00e676; } .sig-ok { color: #ffab40; } .sig-weak { color: #f44336; } .sig-none { color: var(--color-text-muted); }
.coord-text { font-family: monospace; font-size: 11px; color: var(--color-text-muted); }
</style>
