<script setup lang="ts">
  /**
   * 日志流组件
   * 实时显示日志内容，支持自动滚动和级别过滤
   */
  import { ref, watch, nextTick, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { t } = useI18n()

  const props = defineProps<{
    lines: string[]
    maxLines?: number
    autoScroll?: boolean
  }>()

  const containerRef = ref<HTMLElement | null>(null)

  /* 自动滚动到底部 */
  async function scrollToBottom() {
    if (props.autoScroll === false) return
    await nextTick()
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  }

  watch(
    () => props.lines.length,
    () => {
      scrollToBottom()
    },
  )

  onMounted(() => {
    scrollToBottom()
  })
</script>

<template>
  <div ref="containerRef" class="log-stream">
    <div v-for="(line, i) in lines" :key="i" class="log-line">
      <span class="line-no">{{ i + 1 }}</span>
      <span
        class="line-text"
        :class="{
          'line-error': line.includes('[ERROR]') || line.includes('[error]'),
          'line-warn': line.includes('[WARN]') || line.includes('[warn]'),
          'line-info': line.includes('[INFO]') || line.includes('[info]'),
        }"
        >{{ line }}</span
      >
    </div>
    <div v-if="lines.length === 0" class="log-empty">{{ t('service.noLogs') }}</div>
  </div>
</template>

<style scoped>
  .log-stream {
    background: var(--ct-bg-base, #0a0c10);
    border: 1px solid var(--ct-border, #2a2d3a);
    border-radius: 4px;
    padding: 8px;
    overflow-y: auto;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.7;
    min-height: 100px;
  }

  .log-line {
    display: flex;
    gap: 10px;
  }

  .line-no {
    color: var(--ct-text-placeholder, #5a5e68);
    min-width: 28px;
    text-align: right;
    flex-shrink: 0;
    user-select: none;
  }

  .line-text {
    color: var(--ct-text-regular, #cfd3dc);
    word-break: break-all;
  }

  .line-error {
    color: var(--ct-danger, #f56c6c);
  }

  .line-warn {
    color: var(--ct-warning, #e6a23c);
  }

  .line-info {
    color: var(--ct-text-regular, #cfd3dc);
  }

  .log-empty {
    color: var(--ct-text-placeholder, #5a5e68);
    text-align: center;
    padding: 20px 0;
  }
</style>
