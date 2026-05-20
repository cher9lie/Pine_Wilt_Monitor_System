<template>
  <div class="page-skeleton">
    <div class="page-header">
      <div class="page-title-row">
        <h2 class="page-title">{{ title }}</h2>
        <el-tag v-if="status" :type="status === 'done' ? 'success' : 'info'" size="small">
          {{ status === 'done' ? '已完成' : '开发中' }}
        </el-tag>
      </div>
      <p class="page-desc">{{ description }}</p>
    </div>

    <div class="page-body">
      <slot>
        <!-- 默认内容：功能列表 -->
        <div v-if="features.length" class="feature-grid">
          <div v-for="(feat, idx) in features" :key="idx" class="feature-card">
            <div class="feature-icon">{{ feat.icon }}</div>
            <div class="feature-info">
              <h4 class="feature-name">{{ feat.name }}</h4>
              <p class="feature-desc">{{ feat.desc }}</p>
            </div>
          </div>
        </div>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
  description: string
  status?: 'done' | 'dev'
  features?: Array<{ icon: string; name: string; desc: string }>
}>()
</script>

<style scoped>
.page-skeleton {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.page-desc {
  font-size: 13px;
  color: var(--color-text-muted);
  line-height: 1.6;
}

.page-body {
  flex: 1;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.feature-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  background: var(--color-bg-panel);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: border-color 0.2s;
}

.feature-card:hover {
  border-color: var(--color-accent);
}

.feature-icon {
  font-size: 28px;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 212, 255, 0.08);
  border-radius: 8px;
}

.feature-info { flex: 1; }

.feature-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: var(--color-text-muted);
  line-height: 1.5;
}
</style>
