import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * 服务运行状态管理
 * 管理 OpenClaw Gateway 的生命周期状态
 */
export const useServiceStore = defineStore('service', () => {
  // Gateway 是否运行中
  const gatewayRunning = ref(false)
  // Gateway 进程 PID
  const gatewayPid = ref(null)
  // Gateway 端口
  const gatewayPort = ref(18789)
  // Daemon 是否已安装为系统服务
  const daemonInstalled = ref(false)
  // 运行时长（秒）
  const uptime = ref(0)
  // 已连接的通道列表
  const activeChannels = ref([])
  // 启动时间戳
  const startedAt = ref(null)
  // 当前运行模式: 'foreground' | 'daemon' | null
  const runMode = ref(null)
  // 操作加载状态
  const loading = ref(false)
  // 错误信息
  const error = ref(null)
  // 是否开机自启
  const autoStartEnabled = ref(false)
  // 环境检测结果（缓存，避免切换页面重复检测）
  const envCache = ref(null) // { node, npm, openclaw }
  // uptime 更新定时器
  let uptimeTimer = null

  /**
   * 状态文本（返回 i18n key，消费端使用 t() 翻译）
   */
  const statusText = computed(() => {
    if (loading.value) return 'status.processing'
    if (error.value) return 'status.error'
    if (gatewayRunning.value) return 'status.running'
    return 'status.stopped'
  })

  /**
   * 状态类型（用于 UI 样式）
   */
  const statusType = computed(() => {
    if (error.value) return 'danger'
    if (gatewayRunning.value) return 'success'
    return 'info'
  })

  /**
   * 格式化运行时长
   */
  const uptimeText = computed(() => {
    if (!gatewayRunning.value || uptime.value === 0) return '--'
    const s = uptime.value
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const seconds = s % 60
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`
    }
    return `${seconds}s`
  })

  /**
   * 从进程管理器状态更新 store
   */
  function updateFromStatus(status) {
    gatewayRunning.value = status.running
    gatewayPid.value = status.pid || null
    startedAt.value = status.startedAt || null
    uptime.value = status.uptime || 0
    error.value = null

    // 运行中时启动 uptime 计时器
    if (status.running) {
      _startUptimeTimer()
    } else {
      _stopUptimeTimer()
    }
  }

  /**
   * 设置加载状态
   */
  function setLoading(value) {
    loading.value = value
    if (value) error.value = null
  }

  /**
   * 设置错误
   */
  function setError(msg) {
    error.value = msg
    loading.value = false
  }

  /**
   * 重置状态
   */
  function reset() {
    gatewayRunning.value = false
    gatewayPid.value = null
    uptime.value = 0
    startedAt.value = null
    runMode.value = null
    loading.value = false
    error.value = null
    activeChannels.value = []
    _stopUptimeTimer()
  }

  /**
   * 启动 uptime 计时器
   */
  function _startUptimeTimer() {
    _stopUptimeTimer()
    uptimeTimer = setInterval(() => {
      if (startedAt.value) {
        uptime.value = Math.floor((Date.now() - startedAt.value) / 1000)
      }
    }, 1000)
  }

  /**
   * 停止 uptime 计时器
   */
  function _stopUptimeTimer() {
    if (uptimeTimer) {
      clearInterval(uptimeTimer)
      uptimeTimer = null
    }
  }

  return {
    gatewayRunning,
    gatewayPid,
    gatewayPort,
    daemonInstalled,
    uptime,
    activeChannels,
    startedAt,
    runMode,
    loading,
    error,
    autoStartEnabled,
    envCache,
    statusText,
    statusType,
    uptimeText,
    updateFromStatus,
    setLoading,
    setError,
    reset,
  }
})
