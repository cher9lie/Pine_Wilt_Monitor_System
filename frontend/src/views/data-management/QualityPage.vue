<template>
  <div class="quality-page">
    <div class="page-header"><h2>数据质量控制</h2><el-button size="small" type="primary">生成质量报告</el-button></div>

    <!-- 质量概览 -->
    <div class="quality-stats">
      <div class="qs-card"><div class="qs-icon">✅</div><div class="qs-info"><span class="qs-val">97.3%</span><span class="qs-label">坐标一致性</span></div></div>
      <div class="qs-card"><div class="qs-icon">📋</div><div class="qs-info"><span class="qs-val">99.1%</span><span class="qs-label">字段完整率</span></div></div>
      <div class="qs-card"><div class="qs-icon">🔗</div><div class="qs-info"><span class="qs-val">98.5%</span><span class="qs-label">拓扑正确率</span></div></div>
      <div class="qs-card warn"><div class="qs-icon">⚠️</div><div class="qs-info"><span class="qs-val">12</span><span class="qs-label">异常记录</span></div></div>
    </div>

    <!-- 质量检查结果 -->
    <div class="section-title">最近检查结果</div>
    <el-table :data="checks" size="small" stripe>
      <el-table-column prop="check_time" label="检查时间" width="160" />
      <el-table-column prop="check_type" label="检查类型" width="140" />
      <el-table-column prop="target" label="检查对象" min-width="180" />
      <el-table-column label="结果" width="80"><template #default="{ row }"><el-tag size="small" :type="row.passed ? 'success' : 'danger'">{{ row.passed ? '通过' : '异常' }}</el-tag></template></el-table-column>
      <el-table-column prop="detail" label="详情" min-width="220" show-overflow-tooltip><template #default="{ row }"><span class="detail-text">{{ row.detail }}</span></template></el-table-column>
    </el-table>

    <!-- 坐标系统一校验 -->
    <div class="section-title" style="margin-top:20px">坐标系统一校验（WGS84 → CGCS2000）</div>
    <el-table :data="crsChecks" size="small" stripe>
      <el-table-column prop="table_name" label="数据表" width="180" />
      <el-table-column prop="total_records" label="总记录数" width="100" />
      <el-table-column prop="srid_correct" label="SRID=4490" width="100"><template #default="{ row }"><span class="text-green">{{ row.srid_correct }}</span></template></el-table-column>
      <el-table-column prop="srid_wrong" label="SRID异常" width="100"><template #default="{ row }"><span :class="row.srid_wrong > 0 ? 'text-red' : ''">{{ row.srid_wrong }}</span></template></el-table-column>
      <el-table-column label="一致率" width="100"><template #default="{ row }"><span class="text-green">{{ ((row.srid_correct / row.total_records) * 100).toFixed(1) }}%</span></template></el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const checks = ref([
  { check_time: '2025-01-18 06:00', check_type: '坐标系统一', target: 'disease_trees 表', passed: true, detail: '全部 1847 条记录 SRID=4490，校验通过' },
  { check_time: '2025-01-18 06:00', check_type: '字段完整性', target: 'disease_trees 表', passed: true, detail: '必填字段(geom/confidence/class_label)完整率 100%' },
  { check_time: '2025-01-18 06:00', check_type: '拓扑检查', target: 'forest_plots 表', passed: true, detail: '所有小班多边形闭合且无自相交' },
  { check_time: '2025-01-18 06:00', check_type: '异常值检测', target: 'disease_trees.confidence', passed: false, detail: '发现 12 条记录 confidence=0，可能为推理异常' },
  { check_time: '2025-01-17 06:00', check_type: '时间连续性', target: 'patrol_tracks 表', passed: true, detail: '所有轨迹 started_at < ended_at，时序合法' },
  { check_time: '2025-01-17 06:00', check_type: '空间范围', target: 'iot_devices 表', passed: false, detail: '设备 TRAP-DP-002 坐标超出清远市行政边界' },
])

const crsChecks = ref([
  { table_name: 'disease_trees', total_records: 1847, srid_correct: 1847, srid_wrong: 0 },
  { table_name: 'forest_plots', total_records: 156, srid_correct: 156, srid_wrong: 0 },
  { table_name: 'forest_farms', total_records: 8, srid_correct: 8, srid_wrong: 0 },
  { table_name: 'alert_zones', total_records: 8, srid_correct: 8, srid_wrong: 0 },
  { table_name: 'patrol_tracks', total_records: 47, srid_correct: 47, srid_wrong: 0 },
  { table_name: 'iot_devices', total_records: 12, srid_correct: 11, srid_wrong: 1 },
])
</script>

<style scoped>
.quality-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.quality-stats { display: flex; gap: 12px; margin-bottom: 18px; }
.qs-card { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; flex: 1; }
.qs-card.warn { border-color: #ff9800; }
.qs-icon { font-size: 24px; }
.qs-info { display: flex; flex-direction: column; }
.qs-val { font-size: 18px; font-weight: 700; color: var(--color-text-primary); }
.qs-label { font-size: 11px; color: var(--color-text-muted); }
.section-title { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 10px; }
.detail-text { font-size: 12px; color: var(--color-text-muted); }
.text-green { color: #00e676; font-weight: 600; }
.text-red { color: #f44336; font-weight: 600; }
</style>
