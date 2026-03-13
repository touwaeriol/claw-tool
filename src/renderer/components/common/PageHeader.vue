<script setup lang="ts">
/**
 * 页面标题头部组件
 * 统一的页面标题 + 右侧操作区布局
 */
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="page-header">
    <div class="page-header-left">
      <h3 class="page-title">{{ title }}</h3>
      <p v-if="description" class="page-description">{{ description }}</p>
    </div>
    <div class="page-header-right">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--ct-text-primary, var(--el-text-color-primary));
  margin: 0;
}

.page-description {
  font-size: 13px;
  color: var(--ct-text-secondary, var(--el-text-color-secondary));
  margin-top: 4px;
}

.page-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
