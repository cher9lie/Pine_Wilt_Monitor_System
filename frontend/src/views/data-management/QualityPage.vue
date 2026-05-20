<template>
  <PageSkeleton title="数据质量控制" description="坐标系统一校验(WGS84/CGCS2000)、数据完整性检查、异常值标记与质量报告生成" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '🎯', name: '坐标校验', desc: 'WGS84/CGCS2000统一转换，拓扑检查' },
  { icon: '✅', name: '完整性检查', desc: '必填字段/空间拓扑/时间连续性验证' },
  { icon: '⚠️', name: '异常标记', desc: '异常值自动识别与弹窗提醒' },
  { icon: '📄', name: '质量报告', desc: '缺失率/错误率/一致性指标自动生成' },
]
</script>
