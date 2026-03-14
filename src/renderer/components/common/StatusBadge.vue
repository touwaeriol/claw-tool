<script setup lang="ts">
  /**
   * 状态指示徽章组件
   * 用于显示服务运行状态、连接状态等
   */
  defineProps<{
    status: 'running' | 'stopped' | 'error' | 'unknown' | 'connecting'
    label?: string
    showDot?: boolean
  }>()

  /* 状态映射 */
  const statusMap: Record<string, { text: string; type: string; dotClass: string }> = {
    running: { text: '运行中', type: 'success', dotClass: 'status-dot--running' },
    stopped: { text: '已停止', type: 'danger', dotClass: 'status-dot--stopped' },
    error: { text: '错误', type: 'danger', dotClass: 'status-dot--stopped' },
    unknown: { text: '未知', type: 'info', dotClass: 'status-dot--unknown' },
    connecting: { text: '连接中', type: 'warning', dotClass: 'status-dot--unknown' },
  }
</script>

<template>
  <span class="status-badge">
    <span v-if="showDot !== false" class="status-dot" :class="statusMap[status]?.dotClass" />
    <el-tag :type="(statusMap[status]?.type as any) || 'info'" size="small" effect="dark">
      {{ label || statusMap[status]?.text || status }}
    </el-tag>
  </span>
</template>

<style scoped>
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
</style>
