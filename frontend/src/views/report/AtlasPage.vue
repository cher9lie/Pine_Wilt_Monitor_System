<template>
  <PageSkeleton title="地图集制作" description="灾情疫情时空地图集向导模板选择、可视化配置、整饰与高清打印输出" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '📐', name: '模板向导', desc: '疫情现状/演变/成效/风险四类模板' },
  { icon: '🎨', name: '符号化配置', desc: '分级设色/热力图/核密度在线渲染' },
  { icon: '🖨️', name: '高清出图', desc: '150/300/600 DPI PDF/TIFF导出' },
  { icon: '📖', name: '多页图集', desc: '封面/目录/正文自动排版' },
]
</script>
