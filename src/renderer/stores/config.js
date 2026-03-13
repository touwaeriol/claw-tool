import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

/**
 * OpenClaw 配置状态
 * 管理 ~/.openclaw/openclaw.json 的读写和状态
 */
export const useConfigStore = defineStore('config', () => {
  // 原始 JSON5 配置对象
  const raw = ref(null)
  // 配置文件路径
  const filePath = ref('')
  // 上次加载时间戳
  const lastLoaded = ref(0)
  // 是否有未保存的修改
  const isDirty = ref(false)
  // 验证错误列表
  const validationErrors = ref([])
  // 是否正在加载
  const loading = ref(false)
  // 是否正在保存
  const saving = ref(false)
  // 内部持有的 configManager 引用（loadConfig 时保存）
  let _configManager = null

  // === 计算属性：按模块提取配置 ===

  // 供应商列表
  const providers = computed(() => {
    return raw.value?.models?.providers || {}
  })

  // 通道配置
  const channels = computed(() => {
    return raw.value?.channels || {}
  })

  // Gateway 配置
  const gateway = computed(() => {
    return raw.value?.gateway || {}
  })

  // Agent 配置
  const agents = computed(() => {
    return raw.value?.agents || {}
  })

  // 日志配置
  const logConfig = computed(() => {
    return raw.value?.log || {}
  })

  // 内存/记忆配置
  const memory = computed(() => {
    return raw.value?.memory || {}
  })

  // === Actions ===

  /**
   * 加载配置文件
   * @param {object} configManager - 配置管理器实例
   */
  async function loadConfig(configManager) {
    loading.value = true
    _configManager = configManager
    try {
      const result = await configManager.readConfig()
      raw.value = result.config
      filePath.value = result.filePath
      lastLoaded.value = Date.now()
      isDirty.value = false
      validationErrors.value = []
    } catch (err) {
      console.error('[configStore] 加载配置失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存配置文件
   * @param {object} configManager - 配置管理器实例
   */
  async function saveConfig(configManager) {
    if (!raw.value) return
    saving.value = true
    try {
      await configManager.writeConfig(raw.value)
      isDirty.value = false
      lastLoaded.value = Date.now()
    } catch (err) {
      console.error('[configStore] 保存配置失败:', err)
      throw err
    } finally {
      saving.value = false
    }
  }

  /**
   * 内部自动保存：标记 dirty 后自动持久化到磁盘
   * 使用防抖避免频繁写入
   */
  let _saveTimer = null
  function _autoSave() {
    isDirty.value = true
    if (!_configManager) return
    if (_saveTimer) clearTimeout(_saveTimer)
    _saveTimer = setTimeout(async () => {
      try {
        await saveConfig(_configManager)
      } catch (err) {
        console.error('[configStore] 自动保存失败:', err)
      }
    }, 300)
  }

  /**
   * 更新供应商配置对象
   * @param {object} providersObj - 新的供应商对象（键为供应商名，值为配置）
   */
  function updateProviders(providersObj) {
    if (!raw.value) raw.value = {}
    if (!raw.value.models) raw.value.models = {}
    raw.value.models.providers = providersObj
    _autoSave()
  }

  /**
   * 更新单个通道配置
   * @param {string} channelName - 通道名称
   * @param {object} channelConfig - 通道配置
   */
  function updateChannel(channelName, channelConfig) {
    if (!raw.value) raw.value = {}
    if (!raw.value.channels) raw.value.channels = {}
    raw.value.channels[channelName] = channelConfig
    _autoSave()
  }

  /**
   * 更新 Gateway 配置
   * @param {object} gatewayConfig - Gateway 配置
   */
  function updateGateway(gatewayConfig) {
    if (!raw.value) raw.value = {}
    raw.value.gateway = gatewayConfig
    _autoSave()
  }

  /**
   * 更新 Agent 配置
   * @param {object} agentConfig - Agent 配置
   */
  function updateAgents(agentConfig) {
    if (!raw.value) raw.value = {}
    raw.value.agents = agentConfig
    _autoSave()
  }

  /**
   * 更新日志配置
   * @param {object} logCfg - 日志配置
   */
  function updateLogConfig(logCfg) {
    // 日志配置不保存到 openclaw.json（OpenClaw 不识别根级 log 键）
    // 仅保持内存状态供 UI 使用，不触发 autoSave
    // 同时清理历史遗留的 log 键
    if (raw.value && raw.value.log) {
      delete raw.value.log
      _autoSave()
    }
  }

  /**
   * 设置默认模型
   * @param {string} modelId - 模型 ID，空字符串表示清除
   */
  function setDefaultModel(modelId) {
    if (!raw.value) raw.value = {}
    if (!raw.value.agents) raw.value.agents = {}
    if (!raw.value.agents.defaults) raw.value.agents.defaults = {}
    raw.value.agents.defaults.model = modelId || undefined
    _autoSave()
  }

  /**
   * 重置配置（重新加载）
   */
  function resetDirty() {
    isDirty.value = false
  }

  return {
    // 状态
    raw,
    filePath,
    lastLoaded,
    isDirty,
    validationErrors,
    loading,
    saving,
    // 计算属性
    providers,
    channels,
    gateway,
    agents,
    logConfig,
    memory,
    // Actions
    loadConfig,
    saveConfig,
    updateProviders,
    updateChannel,
    updateGateway,
    updateAgents,
    updateLogConfig,
    setDefaultModel,
    resetDirty,
  }
})
