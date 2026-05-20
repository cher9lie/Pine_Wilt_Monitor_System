<template>
  <PageSkeleton title="病死木交互式标绘" description="Web端病死木人工标绘工具，查看AI识别结果、核验修正边界、补充属性标签并沉淀为训练样本" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '✏️', name: '交互标绘', desc: '点/线/面绘制工具，修正AI识别边界' },
  { icon: '🏷️', name: '属性标注', desc: '病害类型、树种、严重程度、审核意见' },
  { icon: '📦', name: '样本沉淀', desc: '标注结果自动导出为模型训练样本' },
  { icon: '🔄', name: '版本追踪', desc: '每次修正保留版本记录，便于回溯' },
]
</script>
