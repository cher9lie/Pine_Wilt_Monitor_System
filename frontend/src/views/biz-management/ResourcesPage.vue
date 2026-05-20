<template>
  <div class="resources-page">
    <div class="page-header"><h2>资源调度</h2></div>

    <el-tabs v-model="activeTab" class="res-tabs">
      <el-tab-pane label="人员台账" name="personnel">
        <el-table :data="personnel" size="small" stripe>
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="role" label="岗位" width="100" />
          <el-table-column prop="department" label="所属林场" width="140" />
          <el-table-column prop="phone" label="联系电话" width="130" />
          <el-table-column label="当前状态" width="100"><template #default="{ row }"><el-tag size="small" :type="row.busy ? 'warning' : 'success'">{{ row.busy ? '任务中' : '待命' }}</el-tag></template></el-table-column>
          <el-table-column label="今日任务" width="80"><template #default="{ row }">{{ row.tasks_today }} 个</template></el-table-column>
          <el-table-column prop="cert" label="资质" min-width="120" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="物资台账" name="materials">
        <el-table :data="materials" size="small" stripe>
          <el-table-column prop="name" label="物资名称" min-width="180" />
          <el-table-column prop="category" label="类别" width="100" />
          <el-table-column prop="stock" label="库存" width="80" />
          <el-table-column prop="unit" label="单位" width="60" />
          <el-table-column label="库存状态" width="100"><template #default="{ row }"><el-tag size="small" :type="row.stock < row.min_stock ? 'danger' : 'success'">{{ row.stock < row.min_stock ? '不足' : '充足' }}</el-tag></template></el-table-column>
          <el-table-column prop="location" label="存放位置" width="140" />
        </el-table>
      </el-tab-pane>

      <el-tab-pane label="设备台账" name="equipment">
        <el-table :data="equipment" size="small" stripe>
          <el-table-column prop="name" label="设备名称" min-width="180" />
          <el-table-column prop="model" label="型号" width="130" />
          <el-table-column prop="count" label="数量" width="60" />
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag size="small" :type="row.available ? 'success' : 'warning'">{{ row.available ? '可用' : '使用中' }}</el-tag></template></el-table-column>
          <el-table-column prop="assigned_to" label="当前分配" width="120" />
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const activeTab = ref('personnel')

const personnel = ref([
  { name: '张伟', role: '护林员', department: '黄坌国有林场', phone: '138****1234', busy: true, tasks_today: 2, cert: '农药操作证、GPS操作' },
  { name: '李强', role: '护林员', department: '横石塘林场', phone: '139****5678', busy: true, tasks_today: 1, cert: '伐木证' },
  { name: '王芳', role: '护林员', department: '星子林场', phone: '137****9012', busy: false, tasks_today: 0, cert: '农药操作证' },
  { name: '赵敏', role: '护林员', department: '太和林场', phone: '136****3456', busy: false, tasks_today: 0, cert: '无人机驾驶证' },
  { name: '刘洋', role: '采伐队长', department: '外包服务队', phone: '135****7890', busy: true, tasks_today: 1, cert: '特种作业证' },
])

const materials = ref([
  { name: '噻虫啉微胶囊悬浮剂(2.5%)', category: '药剂', stock: 320, unit: '瓶', min_stock: 100, location: '黄坌镇物资库' },
  { name: '甲维盐烟剂(5kg/箱)', category: '药剂', stock: 85, unit: '箱', min_stock: 50, location: '中心仓库' },
  { name: 'APF-I型诱捕器', category: '设备', stock: 42, unit: '台', min_stock: 20, location: '设备间' },
  { name: '诱捕器引诱剂', category: '耗材', stock: 156, unit: '瓶', min_stock: 80, location: '中心仓库' },
  { name: '油锯链条', category: '配件', stock: 8, unit: '条', min_stock: 15, location: '设备间' },
  { name: '防护服', category: '劳保', stock: 24, unit: '套', min_stock: 10, location: '黄坌镇物资库' },
])

const equipment = ref([
  { name: '大疆 M350 RTK 无人机', model: 'DJI M350', count: 2, available: true, assigned_to: '-' },
  { name: '油锯', model: 'STIHL MS261', count: 6, available: false, assigned_to: '采伐队(横石塘)' },
  { name: '粉碎机', model: 'BC-800', count: 2, available: true, assigned_to: '-' },
  { name: '喷雾器(电动)', model: 'WS-20', count: 8, available: true, assigned_to: '-' },
  { name: '北斗定位终端', model: 'BD-T100', count: 12, available: false, assigned_to: '全体护林员' },
])
</script>

<style scoped>
.resources-page { padding: 20px; height: 100%; overflow-y: auto; }
.page-header { margin-bottom: 16px; }
.page-header h2 { font-size: 18px; color: var(--color-text-primary); }
:deep(.el-tabs__item) { color: var(--color-text-secondary) !important; }
:deep(.el-tabs__item.is-active) { color: var(--color-accent) !important; }
:deep(.el-tabs__active-bar) { background-color: var(--color-accent) !important; }
</style>
