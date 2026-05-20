<template>
  <div class="purchase-page">
    <div class="page-header">
      <h2>采购管理</h2>
      <el-tag type="info" size="small">演示数据</el-tag>
    </div>

    <!-- 统计 -->
    <div class="stats-row">
      <div class="fin-stat"><span class="fs-val">{{ suppliers.length }}</span><span class="fs-label">供应商</span></div>
      <div class="fin-stat"><span class="fs-val">{{ orders.length }}</span><span class="fs-label">采购单</span></div>
      <div class="fin-stat"><span class="fs-val">¥{{ totalAmount.toLocaleString() }}</span><span class="fs-label">总金额</span></div>
      <div class="fin-stat"><span class="fs-val">{{ completedOrders }}</span><span class="fs-label">已入库</span></div>
    </div>

    <!-- Tab 切换 -->
    <el-tabs v-model="activeTab" class="fin-tabs">
      <el-tab-pane label="采购订单" name="orders">
        <el-table :data="orders" size="small" stripe>
          <el-table-column prop="order_no" label="订单号" width="140"><template #default="{ row }"><span class="code-text">{{ row.order_no }}</span></template></el-table-column>
          <el-table-column prop="supplier_name" label="供应商" width="140" />
          <el-table-column prop="item_name" label="物资名称" min-width="180" />
          <el-table-column label="数量" width="80"><template #default="{ row }">{{ row.quantity }} {{ row.unit }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }"><span class="amount">¥{{ row.amount.toLocaleString() }}</span></template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small" :type="orderStatusTag(row.status)">{{ orderStatusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="交付日期" width="110"><template #default="{ row }">{{ row.delivery_date }}</template></el-table-column>
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="供应商档案" name="suppliers">
        <el-table :data="suppliers" size="small" stripe>
          <el-table-column prop="name" label="供应商名称" min-width="180" />
          <el-table-column prop="credit_code" label="统一社会信用代码" width="200"><template #default="{ row }"><span class="code-text">{{ row.credit_code }}</span></template></el-table-column>
          <el-table-column label="信用评分" width="100">
            <template #default="{ row }">
              <span :class="row.credit_score >= 80 ? 'score-good' : row.credit_score >= 60 ? 'score-ok' : 'score-bad'">{{ row.credit_score }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80"><template #default="{ row }"><el-tag size="small" :type="row.blacklisted ? 'danger' : 'success'">{{ row.blacklisted ? '黑名单' : '正常' }}</el-tag></template></el-table-column>
          <el-table-column prop="category" label="主营类目" width="120" />
          <el-table-column prop="contract_count" label="合同数" width="80" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const activeTab = ref('orders')

const orders = ref([
  { order_no: 'PO-2025-001', supplier_name: '清远绿盾生物', item_name: '噻虫啉微胶囊悬浮剂(2.5%)', quantity: 500, unit: '瓶', amount: 37500, status: 'delivered', delivery_date: '2025-01-10' },
  { order_no: 'PO-2025-002', supplier_name: '赣州林安设备', item_name: '松墨天牛APF-I诱捕器', quantity: 80, unit: '台', amount: 24000, status: 'delivered', delivery_date: '2025-01-08' },
  { order_no: 'PO-2025-003', supplier_name: '深圳无人机科技', item_name: '大疆M350RTK无人机租赁(月)', quantity: 2, unit: '架次', amount: 18000, status: 'in_progress', delivery_date: '2025-01-31' },
  { order_no: 'PO-2025-004', supplier_name: '清远绿盾生物', item_name: '甲维盐烟剂(5kg/箱)', quantity: 200, unit: '箱', amount: 56000, status: 'ordered', delivery_date: '2025-02-15' },
  { order_no: 'PO-2025-005', supplier_name: '江西伐木公司', item_name: '专业采伐队伍调配(20人/天)', quantity: 30, unit: '天', amount: 135000, status: 'in_progress', delivery_date: '2025-02-28' },
])

const suppliers = ref([
  { name: '清远绿盾生物科技有限公司', credit_code: '91440100MA5CY8KH9L', credit_score: 92, blacklisted: false, category: '生物药剂', contract_count: 8 },
  { name: '赣州林安防治设备有限公司', credit_code: '91360700MA35L6NX4P', credit_score: 87, blacklisted: false, category: '监测设备', contract_count: 5 },
  { name: '深圳极飞无人机科技有限公司', credit_code: '91440300MA5D2RTQ3B', credit_score: 95, blacklisted: false, category: '无人机服务', contract_count: 3 },
  { name: '江西赣森伐木服务有限公司', credit_code: '91360700MA38K9QH2R', credit_score: 78, blacklisted: false, category: '采伐服务', contract_count: 4 },
  { name: '广东某农药经销商(已拉黑)', credit_code: '91440000MA5CRR7B6J', credit_score: 35, blacklisted: true, category: '药剂', contract_count: 1 },
])

const totalAmount = computed(() => orders.value.reduce((s, o) => s + o.amount, 0))
const completedOrders = computed(() => orders.value.filter(o => o.status === 'delivered').length)

function orderStatusLabel(s: string) { return { ordered: '已下单', in_progress: '执行中', delivered: '已入库', cancelled: '已取消' }[s] ?? s }
function orderStatusTag(s: string) { return { ordered: 'info', in_progress: 'warning', delivered: 'success', cancelled: 'danger' }[s] as any ?? 'info' }
</script>

<style scoped>
.purchase-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
.stats-row { display: flex; gap: 12px; margin-bottom: 16px; }
.fin-stat { background: var(--color-bg-panel); border: 1px solid var(--color-border); border-radius: 6px; padding: 12px 20px; text-align: center; min-width: 120px; }
.fs-val { display: block; font-size: 20px; font-weight: 700; color: var(--color-accent); }
.fs-label { font-size: 11px; color: var(--color-text-muted); }
.code-text { font-family: monospace; font-size: 12px; color: var(--color-accent); }
.amount { font-weight: 600; color: var(--color-text-primary); }
.score-good { color: #00e676; font-weight: 600; } .score-ok { color: #ffab40; font-weight: 600; } .score-bad { color: #f44336; font-weight: 600; }
:deep(.el-tabs__item) { color: var(--color-text-secondary) !important; }
:deep(.el-tabs__item.is-active) { color: var(--color-accent) !important; }
:deep(.el-tabs__active-bar) { background-color: var(--color-accent) !important; }
</style>
