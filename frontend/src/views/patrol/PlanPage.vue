<template>
  <PageSkeleton title="日常巡护规划" description="地图网格切分、风险评分、巡护频次计算、打卡点布设" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '🗺️', name: '网格切分', desc: '按林班/小班自动划分巡护网格' },
  { icon: '⚡', name: '风险评分', desc: '历史疫情+环境因子综合打分' },
  { icon: '🔄', name: '频次计算', desc: '根据风险等级自动计算巡护频率' },
  { icon: '📌', name: '打卡点布设', desc: '关键点位设置必达打卡点' },
]
</script>
