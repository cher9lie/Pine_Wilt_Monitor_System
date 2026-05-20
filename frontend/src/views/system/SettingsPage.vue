<template>
  <PageSkeleton title="系统设置" description="系统参数配置、数据库运维、备份恢复、AI模型管理" status="dev" :features="features" />
</template>
<script setup lang="ts">
import PageSkeleton from '@/components/common/PageSkeleton.vue'
const features = [
  { icon: '⚙️', name: '参数配置', desc: '预警阈值/推理置信度/审批时限等配置' },
  { icon: '💾', name: '数据库运维', desc: '索引重建/VACUUM/备份快照' },
  { icon: '🔄', name: '备份恢复', desc: '分级容灾/闪回/沙箱恢复验证' },
  { icon: '🤖', name: 'AI模型管理', desc: 'ONNX模型版本上传/切换/回滚' },
]
</script>
