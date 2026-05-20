<template>
  <PageSkeleton title="灾情上报" description="护林员现场定位采集、多媒体证据打包、多级审批工作流" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '📍', name: '现场定位', desc: 'GPS/北斗自动绑定上报位置' },
  { icon: '📷', name: '多媒体采集', desc: '照片/视频/语音证据打包上传' },
  { icon: '✍️', name: '审批流程', desc: '护林员→林场→林业局多级审批' },
  { icon: '📊', name: '统计汇总', desc: '灾情上报数量、趋势、分布统计' },
]
</script>
