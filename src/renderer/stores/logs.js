import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 日志状态管理
 * 管理 Gateway 运行日志的收集、过滤和展示
 */
export const useLogsStore = defineStore('logs', () => {
  // 日志条目
  const entries = ref([])
  // 过滤级别
  const level = ref('info')
  // 搜索关键词
  const searchKeyword = ref('')
  // 是否自动滚动到底部
  const autoScroll = ref(true)
  // 最大日志条目数
  const maxEntries = 5000
  // 是否暂停接收
  const paused = ref(false)

  /**
   * 日志级别优先级
   */
  const levelPriority = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  }

  /**
   * 过滤后的日志条目
   */
  const filteredEntries = computed(() => {
    let result = entries.value

    // 按级别过滤
    const minLevel = levelPriority[level.value] || 0
    result = result.filter((entry) => {
      const entryLevel = levelPriority[entry.level] ?? levelPriority.info
      return entryLevel >= minLevel
    })

    // 按关键词过滤
    if (searchKeyword.value) {
      const kw = searchKeyword.value.toLowerCase()
      result = result.filter((entry) => {
        return (entry.text || '').toLowerCase().includes(kw)
      })
    }

    return result
  })

  /**
   * 日志总条数
   */
  const totalCount = computed(() => entries.value.length)

  /**
   * 过滤后条数
   */
  const filteredCount = computed(() => filteredEntries.value.length)

  /**
   * 添加日志条目
   * @param {object} entry - 日志条目
   * @param {string} entry.text - 日志文本
   * @param {string} [entry.type] - 来源类型: stdout/stderr/system
   * @param {string} [entry.level] - 日志级别: debug/info/warn/error
   */
  function addEntry(entry) {
    if (paused.value) return

    // 自动推断日志级别
    let entryLevel = entry.level
    if (!entryLevel) {
      const text = (entry.text || '').toLowerCase()
      if (entry.type === 'stderr' || text.includes('error') || text.includes('ERR')) {
        entryLevel = 'error'
      } else if (text.includes('warn') || text.includes('WARN')) {
        entryLevel = 'warn'
      } else if (text.includes('debug') || text.includes('DEBUG')) {
        entryLevel = 'debug'
      } else {
        entryLevel = 'info'
      }
    }

    entries.value.push({
      id: entries.value.length,
      timestamp: Date.now(),
      level: entryLevel,
      ...entry,
    })

    // 限制条目数量
    if (entries.value.length > maxEntries) {
      entries.value = entries.value.slice(-maxEntries)
    }
  }

  /**
   * 批量添加日志
   * @param {string} text - 多行文本
   * @param {string} [type] - 来源类型
   */
  function addText(text, type = 'stdout') {
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.trim()) {
        addEntry({ text: line, type })
      }
    }
  }

  /**
   * 清空日志
   */
  function clear() {
    entries.value = []
  }

  /**
   * 暂停/恢复日志接收
   */
  function togglePause() {
    paused.value = !paused.value
  }

  return {
    entries,
    level,
    searchKeyword,
    autoScroll,
    paused,
    filteredEntries,
    totalCount,
    filteredCount,
    addEntry,
    addText,
    clear,
    togglePause,
  }
})
