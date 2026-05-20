<template>
  <PageSkeleton title="巡查任务分配" description="预警驱动的网格化巡查任务自动分配，工单生成与倒计时跟踪" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '📌', name: '预警接收', desc: '自动接收预警数据生成巡查任务' },
  { icon: '👥', name: '人员匹配', desc: '网格化就近匹配护林员分配任务' },
  { icon: '📋', name: '工单管理', desc: '生成含时限/证据要求的标准工单' },
  { icon: '⏰', name: '超时告警', desc: '任务超期未响应自动升级告警' },
]
</script>
