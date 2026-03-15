<script setup>
  /**
   * Markdown 编辑器组件
   * 左右分栏：左侧 textarea 编辑，右侧 Markdown 预览
   */
  import { ref, computed, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { getBackend } from '../../utils/nw-bridge'

  const { t } = useI18n()

  const props = defineProps({
    content: { type: String, default: '' },
    readonly: { type: Boolean, default: false },
    title: { type: String, default: '' },
    saving: { type: Boolean, default: false },
    showSave: { type: Boolean, default: true },
  })

  const emit = defineEmits(['update:content', 'save'])

  const backend = getBackend()
  const MarkdownIt = backend?.MarkdownIt ?? null
  const md = MarkdownIt ? new MarkdownIt({ html: false, linkify: true, breaks: true }) : null

  const editContent = ref(props.content)
  const previewOnly = ref(props.readonly)

  watch(
    () => props.content,
    (val) => {
      editContent.value = val
    },
  )

  const renderedHtml = computed(() => {
    if (!md) return editContent.value || ''
    try {
      return md.render(editContent.value || '')
    } catch {
      return editContent.value || ''
    }
  })

  function onInput(e) {
    editContent.value = e.target.value
    emit('update:content', editContent.value)
  }

  function handleSave() {
    emit('save', editContent.value)
  }
</script>

<template>
  <div class="md-editor">
    <!-- 工具栏 -->
    <div class="md-editor-toolbar">
      <span v-if="title" class="md-editor-title">{{ title }}</span>
      <div class="md-editor-actions">
        <el-button
          v-if="!readonly"
          size="small"
          :type="previewOnly ? 'default' : 'primary'"
          @click="previewOnly = false"
        >
          <el-icon><ElIconEdit /></el-icon>
          <span>{{ t('common.edit') }}</span>
        </el-button>
        <el-button
          size="small"
          :type="previewOnly ? 'primary' : 'default'"
          @click="previewOnly = true"
        >
          <el-icon><ElIconView /></el-icon>
          <span>Preview</span>
        </el-button>
        <el-button
          v-if="showSave && !readonly"
          size="small"
          type="success"
          :loading="saving"
          @click="handleSave"
        >
          <el-icon><ElIconCheck /></el-icon>
          <span>{{ t('common.save') }}</span>
        </el-button>
      </div>
    </div>

    <!-- 编辑/预览区 -->
    <div class="md-editor-body">
      <!-- 编辑模式：左右分栏 -->
      <template v-if="!previewOnly && !readonly">
        <div class="md-editor-pane md-editor-edit">
          <textarea
            :value="editContent"
            class="md-editor-textarea"
            spellcheck="false"
            @input="onInput"
          />
        </div>
        <div class="md-editor-divider" />
        <div class="md-editor-pane md-editor-preview">
          <div class="markdown-body" v-html="renderedHtml" />
        </div>
      </template>

      <!-- 预览模式：全宽 -->
      <template v-else>
        <div class="md-editor-pane md-editor-preview full">
          <div class="markdown-body" v-html="renderedHtml" />
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
  .md-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid var(--el-border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  .md-editor-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    border-bottom: 1px solid var(--el-border-color);
    background: var(--el-fill-color-light);
    flex-shrink: 0;
  }

  .md-editor-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .md-editor-actions {
    display: flex;
    gap: 4px;
  }

  .md-editor-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .md-editor-pane {
    flex: 1;
    overflow: auto;
    min-width: 0;
  }

  .md-editor-pane.full {
    flex: 1;
  }

  .md-editor-divider {
    width: 1px;
    background: var(--el-border-color);
    flex-shrink: 0;
  }

  .md-editor-textarea {
    width: 100%;
    height: 100%;
    border: none;
    outline: none;
    resize: none;
    padding: 12px;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 13px;
    line-height: 1.6;
    background: var(--el-bg-color);
    color: var(--el-text-color-primary);
    tab-size: 2;
  }

  .md-editor-preview {
    padding: 12px 16px;
    background: var(--el-bg-color);
  }

  /* Markdown 渲染样式 */
  .markdown-body {
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-primary);
    word-wrap: break-word;
  }

  .markdown-body :deep(h1) {
    font-size: 1.6em;
    margin: 0.5em 0;
    padding-bottom: 0.3em;
    border-bottom: 1px solid var(--el-border-color);
  }

  .markdown-body :deep(h2) {
    font-size: 1.3em;
    margin: 0.5em 0;
    padding-bottom: 0.2em;
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  .markdown-body :deep(h3) {
    font-size: 1.1em;
    margin: 0.5em 0;
  }

  .markdown-body :deep(p) {
    margin: 0.5em 0;
  }

  .markdown-body :deep(code) {
    background: var(--el-fill-color);
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.9em;
    font-family: 'SFMono-Regular', Consolas, monospace;
  }

  .markdown-body :deep(pre) {
    background: var(--el-fill-color);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
  }

  .markdown-body :deep(pre code) {
    background: none;
    padding: 0;
  }

  .markdown-body :deep(ul),
  .markdown-body :deep(ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }

  .markdown-body :deep(blockquote) {
    margin: 0.5em 0;
    padding: 0.5em 1em;
    border-left: 4px solid var(--el-color-primary);
    background: var(--el-fill-color-light);
  }

  .markdown-body :deep(hr) {
    border: none;
    border-top: 1px solid var(--el-border-color);
    margin: 1em 0;
  }

  .markdown-body :deep(a) {
    color: var(--el-color-primary);
  }

  .markdown-body :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
  }

  .markdown-body :deep(th),
  .markdown-body :deep(td) {
    border: 1px solid var(--el-border-color);
    padding: 6px 12px;
  }

  .markdown-body :deep(th) {
    background: var(--el-fill-color-light);
    font-weight: 600;
  }
</style>
