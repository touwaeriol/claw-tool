<script setup lang="ts">
  /**
   * 状态指示徽章组件
   * 用于显示服务运行状态、连接状态等
   */
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const props = defineProps<{
    status: 'running' | 'stopped' | 'error' | 'unknown' | 'connecting'
    label?: string
    showDot?: boolean
  }>()

  /* 状态映射 */
  const statusMap: Record<string, { textKey: string; type: string; dotClass: string }> = {
    running: { textKey: 'status.running', type: 'success', dotClass: 'status-dot--running' },
    stopped: { textKey: 'status.stopped', type: 'danger', dotClass: 'status-dot--stopped' },
    error: { textKey: 'status.error', type: 'danger', dotClass: 'status-dot--stopped' },
    unknown: { textKey: 'status.unknown', type: 'info', dotClass: 'status-dot--unknown' },
    connecting: { textKey: 'status.connecting', type: 'warning', dotClass: 'status-dot--unknown' },
  }

  const displayText = computed(() => {
    if (props.label) return props.label
    const entry = statusMap[props.status]
    return entry ? t(entry.textKey) : props.status
  })
</script>

<template>
  <span class="status-badge">
    <span v-if="showDot !== false" class="status-dot" :class="statusMap[status]?.dotClass" />
    <el-tag :type="(statusMap[status]?.type as any) || 'info'" size="small" effect="dark">
      {{ displayText }}
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
