<template>
  <PageSkeleton title="资源调度" description="防治物资与人员台账管理，周边资源距离计算，调拨单状态追踪" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '📦', name: '物资台账', desc: '药剂/诱捕器/设备库存实时查询' },
  { icon: '👷', name: '人员台账', desc: '护林员/采伐队/飞防公司信息' },
  { icon: '📏', name: '距离计算', desc: '就近资源推荐，路径可达性分析' },
  { icon: '🚚', name: '调拨追踪', desc: '物资调拨单状态全流程可视化' },
]
</script>
