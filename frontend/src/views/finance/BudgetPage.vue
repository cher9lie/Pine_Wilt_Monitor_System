<template>
  <div class="budget-page">
    <div class="page-header">
      <h2>预算控制</h2>
      <el-tag type="info" size="small">2025年度 · 松材线虫防治专项经费</el-tag>
    </div>

    <!-- 总预算概览 -->
    <div class="budget-overview">
      <div class="bo-card total">
        <div class="bo-label">年度总预算</div>
        <div class="bo-val">¥{{ (totalBudget / 10000).toFixed(1) }} 万</div>
      </div>
      <div class="bo-card used">
        <div class="bo-label">已使用</div>
        <div class="bo-val">¥{{ (totalUsed / 10000).toFixed(1) }} 万</div>
        <div class="bo-pct">{{ ((totalUsed / totalBudget) * 100).toFixed(1) }}%</div>
      </div>
      <div class="bo-card remaining">
        <div class="bo-label">剩余可用</div>
        <div class="bo-val">¥{{ ((totalBudget - totalUsed) / 10000).toFixed(1) }} 万</div>
      </div>
      <div class="bo-card">
        <div class="bo-label">超限预警</div>
        <div class="bo-val warn-text">{{ warningCount }} 个网格</div>
      </div>
    </div>

    <!-- 全局进度条 -->
    <div class="global-progress">
      <div class="gp-bar">
        <div class="gp-fill" :style="{ width: `${(totalUsed / totalBudget) * 100}%` }" />
        <div class="gp-warn-line" style="left:80%" />
        <div class="gp-danger-line" style="left:95%" />
      </div>
      <div class="gp-labels">
        <span>0%</span><span class="gp-mark">80% 告警</span><span class="gp-mark danger">95% 冻结</span><span>100%</span>
      </div>
    </div>

    <!-- 各网格预算明细 -->
    <div class="grid-title">网格化林班预算分配</div>
    <el-table :data="gridBudgets" size="small" stripe>
      <el-table-column prop="farm_name" label="林场/网格" width="150" />
      <el-table-column label="总预算" width="110"><template #default="{ row }"><span>¥{{ (row.total_budget / 10000).toFixed(1) }}万</span></template></el-table-column>
      <el-table-column label="已使用" width="110"><template #default="{ row }"><span>¥{{ (row.used_budget / 10000).toFixed(1) }}万</span></template></el-table-column>
      <el-table-column label="使用率" width="180">
        <template #default="{ row }">
          <div class="usage-bar-wrap">
            <div class="usage-bar"><div class="usage-fill" :style="{ width: `${row.usage_pct}%`, background: usageColor(row.usage_pct) }" /></div>
            <span class="usage-pct" :style="{ color: usageColor(row.usage_pct) }">{{ row.usage_pct.toFixed(1) }}%</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="budgetStatusTag(row.usage_pct)">{{ budgetStatusLabel(row.usage_pct) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="主要支出" min-width="200">
        <template #default="{ row }"><span class="sub-text">{{ row.main_expense }}</span></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const gridBudgets = ref([
  { farm_name: '黄坌国有林场', total_budget: 580000, used_budget: 523000, usage_pct: 90.2, main_expense: '疫木伐除(¥38万) + 药剂(¥12万)' },
  { farm_name: '横石塘林场', total_budget: 420000, used_budget: 348000, usage_pct: 82.9, main_expense: '伐除清理(¥28万) + 无人机巡查(¥5万)' },
  { farm_name: '星子林场', total_budget: 360000, used_budget: 245000, usage_pct: 68.1, main_expense: '药剂注射(¥15万) + 人工(¥8万)' },
  { farm_name: '太和林场', total_budget: 220000, used_budget: 132000, usage_pct: 60.0, main_expense: '诱捕器布设(¥6万) + 巡查(¥5万)' },
  { farm_name: '汤塘林场', total_budget: 180000, used_budget: 89000, usage_pct: 49.4, main_expense: '预防注药(¥5万) + 监测设备(¥3万)' },
  { farm_name: '大坪林场', total_budget: 150000, used_budget: 45000, usage_pct: 30.0, main_expense: '日常巡护(¥3万) + 设备维护(¥1.5万)' },
  { farm_name: '源潭林场', total_budget: 120000, used_budget: 28000, usage_pct: 23.3, main_expense: '预防性监测(¥2万)' },
  { farm_name: '吉田林场', total_budget: 280000, used_budget: 275000, usage_pct: 98.2, main_expense: '全域伐除清理(¥25万) + 复查验收(¥2万)' },
])

const totalBudget = computed(() => gridBudgets.value.reduce((s, g) => s + g.total_budget, 0))
const totalUsed = computed(() => gridBudgets.value.reduce((s, g) => s + g.used_budget, 0))
const warningCount = computed(() => gridBudgets.value.filter(g => g.usage_pct >= 80).length)

function usageColor(pct: number) { if (pct >= 95) return '#f44336'; if (pct >= 80) return '#ff9800'; if (pct >= 60) return '#ffeb3b'; return '#00e676' }
function budgetStatusLabel(pct: number) { if (pct >= 95) return '已冻结'; if (pct >= 80) return '告警'; return '正常' }
function budgetStatusTag(pct: number) { if (pct >= 95) return 'danger'; if (pct >= 80) return 'warning'; return 'success' }
</script>

<style scoped>
.budget-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }

.budget-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.bo-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 14px; text-align: center; }
.bo-card.total { border-top: 3px solid var(--color-accent); }
.bo-card.used { border-top: 3px solid #ff9800; }
.bo-card.remaining { border-top: 3px solid #00e676; }
.bo-label { font-size: 12px; color: var(--color-text-muted); margin-bottom: 6px; }
.bo-val { font-size: 20px; font-weight: 700; color: var(--color-text-primary); }
.bo-pct { font-size: 13px; color: #ff9800; margin-top: 2px; }
.warn-text { color: #ff9800 !important; }

.global-progress { margin-bottom: 20px; }
.gp-bar { position: relative; height: 12px; background: var(--color-bg-card); border-radius: 6px; overflow: hidden; }
.gp-fill { height: 100%; background: linear-gradient(90deg, #00e676, #ffeb3b, #ff9800); border-radius: 6px; transition: width 0.5s; }
.gp-warn-line, .gp-danger-line { position: absolute; top: 0; width: 2px; height: 100%; }
.gp-warn-line { background: #ff9800; }
.gp-danger-line { background: #f44336; }
.gp-labels { display: flex; justify-content: space-between; font-size: 10px; color: var(--color-text-muted); margin-top: 4px; }
.gp-mark { color: #ff9800; } .gp-mark.danger { color: #f44336; }

.grid-title { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 10px; }

.usage-bar-wrap { display: flex; align-items: center; gap: 8px; }
.usage-bar { flex: 1; height: 8px; background: var(--color-bg-card); border-radius: 4px; overflow: hidden; }
.usage-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
.usage-pct { font-size: 12px; font-weight: 600; min-width: 40px; }
.sub-text { font-size: 12px; color: var(--color-text-muted); }
</style>
