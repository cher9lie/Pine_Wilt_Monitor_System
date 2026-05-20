<template>
  <div class="plan-page">
    <div class="page-header"><h2>日常巡护规划</h2></div>

    <div class="plan-grid">
      <!-- 网格分配概览 -->
      <div class="plan-card">
        <div class="pc-title">巡护网格分配</div>
        <el-table :data="grids" size="small" stripe>
          <el-table-column prop="grid_name" label="网格/林班" width="140" />
          <el-table-column prop="assignee" label="责任人" width="90" />
          <el-table-column label="风险评分" width="100">
            <template #default="{ row }">
              <div class="risk-bar"><div class="risk-fill" :style="{ width: `${row.risk_score}%`, background: riskColor(row.risk_score) }" /></div>
              <span class="risk-num" :style="{ color: riskColor(row.risk_score) }">{{ row.risk_score }}</span>
            </template>
          </el-table-column>
          <el-table-column label="巡护频次" width="100"><template #default="{ row }">{{ row.frequency }}</template></el-table-column>
          <el-table-column label="打卡点" width="70"><template #default="{ row }">{{ row.checkpoints }} 个</template></el-table-column>
          <el-table-column label="上次巡护" width="110"><template #default="{ row }">{{ row.last_patrol }}</template></el-table-column>
        </el-table>
      </div>

      <!-- 频次计算说明 -->
      <div class="plan-card side-card">
        <div class="pc-title">巡护频次计算规则</div>
        <div class="rule-list">
          <div class="rule-item"><span class="rule-badge danger">风险 ≥ 80</span><span>每天巡护</span></div>
          <div class="rule-item"><span class="rule-badge warning">风险 60-79</span><span>每2天一次</span></div>
          <div class="rule-item"><span class="rule-badge info">风险 40-59</span><span>每周两次</span></div>
          <div class="rule-item"><span class="rule-badge success">风险 &lt; 40</span><span>每周一次</span></div>
        </div>
        <div class="rule-note">
          <p>风险评分依据：</p>
          <ul>
            <li>历史疫木数量 (40%)</li>
            <li>气象适宜度 (20%)</li>
            <li>松林面积占比 (20%)</li>
            <li>邻近疫区距离 (20%)</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const grids = ref([
  { grid_name: '黄坌镇1-5号林班', assignee: '张伟', risk_score: 92, frequency: '每天', checkpoints: 8, last_patrol: '2025-01-18' },
  { grid_name: '黄坌镇6-10号林班', assignee: '张伟', risk_score: 85, frequency: '每天', checkpoints: 6, last_patrol: '2025-01-17' },
  { grid_name: '横石塘1-4号林班', assignee: '李强', risk_score: 72, frequency: '每2天', checkpoints: 5, last_patrol: '2025-01-17' },
  { grid_name: '星子镇核心区', assignee: '王芳', risk_score: 65, frequency: '每2天', checkpoints: 4, last_patrol: '2025-01-16' },
  { grid_name: '太和镇监测区', assignee: '赵敏', risk_score: 48, frequency: '每周2次', checkpoints: 3, last_patrol: '2025-01-15' },
  { grid_name: '汤塘镇松林带', assignee: '赵敏', risk_score: 38, frequency: '每周1次', checkpoints: 2, last_patrol: '2025-01-12' },
  { grid_name: '大坪镇边缘区', assignee: '王芳', risk_score: 25, frequency: '每周1次', checkpoints: 2, last_patrol: '2025-01-10' },
])

function riskColor(score: number) { if (score >= 80) return '#f44336'; if (score >= 60) return '#ff9800'; if (score >= 40) return '#ffeb3b'; return '#00e676' }
</script>

<style scoped>
.plan-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.plan-grid { display: grid; grid-template-columns: 1fr 300px; gap: 14px; }
.plan-card { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 16px; }
.pc-title { font-size: 14px; font-weight: 600; color: var(--color-text-secondary); margin-bottom: 12px; }
.risk-bar { display: inline-block; width: 50px; height: 6px; background: var(--color-bg-card); border-radius: 3px; overflow: hidden; vertical-align: middle; margin-right: 6px; }
.risk-fill { height: 100%; border-radius: 3px; }
.risk-num { font-size: 12px; font-weight: 600; }
.side-card { }
.rule-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.rule-item { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--color-text-primary); }
.rule-badge { padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
.rule-badge.danger { background: rgba(244,67,54,0.15); color: #f44336; }
.rule-badge.warning { background: rgba(255,152,0,0.15); color: #ff9800; }
.rule-badge.info { background: rgba(255,235,59,0.15); color: #c8b900; }
.rule-badge.success { background: rgba(0,230,118,0.15); color: #00e676; }
.rule-note { font-size: 12px; color: var(--color-text-muted); }
.rule-note ul { padding-left: 16px; margin-top: 4px; }
.rule-note li { margin: 3px 0; }
</style>
