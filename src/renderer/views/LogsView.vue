<script setup>
/**
 * 日志查看页面
 * 实时日志流、级别过滤、关键词搜索
 */
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useLogsStore } from '../stores/logs.js'
import { getBackend } from '../utils/nw-bridge'

const logsStore = useLogsStore()

const backend = getBackend()
const processManager = backend?.processManager ?? null
const eventBus = backend?.eventBus ?? null
const Events = backend?.Events ?? null

// 日志容器 ref，用于自动滚动
const logContainer = ref(null)

// 级别选项
const levelOptions = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

// 级别颜色映射
const levelColors = {
  debug: '#909399',
  info: '#409EFF',
  warn: '#E6A23C',
  error: '#F56C6C',
}

/** 格式化时间戳 */
function formatTime(ts) {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const ms = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${ms}`
}

/** 获取级别标签颜色 */
function getLevelColor(level) {
  return levelColors[level] || levelColors.info
}

/** 滚动到底部 */
function scrollToBottom() {
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
}

/** 实时日志回调 */
function onLogEntry(entry) {
  logsStore.addEntry(entry)
}

// 监听过滤后的日志变化，自动滚动
watch(
  () => logsStore.filteredEntries.length,
  () => {
    if (logsStore.autoScroll) {
      nextTick(scrollToBottom)
    }
  },
)

onMounted(() => {
  // 加载历史日志
  if (processManager) {
    const buffer = processManager.getLogBuffer()
    buffer.forEach((entry) => logsStore.addEntry(entry))
  }
  // 订阅实时日志
  if (eventBus && Events) {
    eventBus.on(Events.LOG_ENTRY, onLogEntry)
  }
  // 初始滚动到底部
  nextTick(scrollToBottom)
})

onUnmounted(() => {
  if (eventBus && Events) {
    eventBus.off(Events.LOG_ENTRY, onLogEntry)
  }
})
</script>

<template>
  <div class="logs-view">
    <!-- 页面标题栏 -->
    <div class="page-toolbar">
      <h3 class="page-heading">日志</h3>
      <div class="toolbar-actions">
        <!-- 级别过滤 -->
        <el-select v-model="logsStore.level" size="small" style="width: 110px">
          <el-option
            v-for="opt in levelOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>

        <!-- 搜索 -->
        <el-input
          v-model="logsStore.searchKeyword"
          size="small"
          placeholder="搜索日志..."
          clearable
          prefix-icon="Search"
          style="width: 200px"
        />

        <!-- 暂停/恢复 -->
        <el-button
          size="small"
          :type="logsStore.paused ? 'warning' : 'default'"
          @click="logsStore.togglePause()"
        >
          {{ logsStore.paused ? '恢复' : '暂停' }}
        </el-button>

        <!-- 自动滚动 -->
        <span class="auto-scroll-label">自动滚动</span>
        <el-switch v-model="logsStore.autoScroll" size="small" />

        <!-- 清空 -->
        <el-button size="small" @click="logsStore.clear()">清空</el-button>
      </div>
    </div>

    <!-- 日志列表 -->
    <div ref="logContainer" class="log-container" contenteditable="false">
      <div v-if="logsStore.filteredEntries.length === 0" class="log-empty">
        暂无日志
      </div>
      <div
        v-for="entry in logsStore.filteredEntries"
        :key="entry.id"
        class="log-line"
      >
        <span class="log-time">{{ formatTime(entry.timestamp) }}</span>
        <span class="log-level" :style="{ color: getLevelColor(entry.level) }">
          [{{ entry.level.toUpperCase() }}]
        </span>
        <span class="log-text">{{ entry.text }}</span>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="log-status-bar">
      <el-tag size="small" effect="plain">
        共 {{ logsStore.totalCount }} 条，显示 {{ logsStore.filteredCount }} 条
      </el-tag>
      <el-tag v-if="logsStore.paused" type="warning" size="small" effect="plain">
        已暂停
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.logs-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.page-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--ct-text-primary);
  margin: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.auto-scroll-label {
  font-size: 12px;
  color: var(--ct-text-secondary);
  white-space: nowrap;
}

.log-container {
  flex: 1;
  min-height: 0;
  background: #1e1e1e;
  border: 1px solid var(--ct-border);
  border-radius: 6px;
  padding: 12px;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.log-empty {
  color: #606266;
  text-align: center;
  padding: 40px 0;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.log-time {
  color: #6a9955;
  margin-right: 8px;
}

.log-level {
  font-weight: 600;
  margin-right: 8px;
}

.log-text {
  color: #d4d4d4;
}

.log-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
</style>
