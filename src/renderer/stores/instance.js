import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getBackend } from '../utils/nw-bridge'

/**
 * 实例管理状态
 * 管理本地和远程实例列表、连接状态、当前活跃实例
 */
export const useInstanceStore = defineStore('instance', () => {
  // 获取 Node.js 模块（NW.js 环境）
  const backend = getBackend()
  const instancesManager = backend?.instancesManager ?? null
  const executorFactory = backend
    ? {
        getExecutor: backend.getExecutor,
        removeExecutor: backend.removeExecutor,
        localExecutor: backend.localExecutor,
      }
    : null

  // 所有实例列表
  const instances = ref([])
  // 当前选中的实例 ID
  const activeInstanceId = ref('local')
  // 各实例连接状态
  const connectionStatus = ref({})
  // 正在加载
  const loading = ref(false)
  // 正在测试连接
  const testing = ref(false)

  // 当前活跃的实例对象
  const activeInstance = computed(() => {
    return instances.value.find((i) => i.id === activeInstanceId.value) || instances.value[0]
  })

  /**
   * 加载实例列表
   */
  async function loadInstances() {
    if (!instancesManager) return
    loading.value = true
    try {
      instances.value = await instancesManager.loadInstances()
      // 初始化连接状态
      for (const inst of instances.value) {
        if (!(inst.id in connectionStatus.value)) {
          connectionStatus.value[inst.id] = inst.type === 'local' ? 'connected' : 'disconnected'
        }
      }
    } catch (err) {
      console.error('加载实例列表失败:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * 添加远程实例
   * @param {object} config - 实例配置
   */
  async function addInstance(config) {
    if (!instancesManager) return null
    const instance = await instancesManager.addInstance(config)
    instances.value.push(instance)
    connectionStatus.value[instance.id] = 'disconnected'
    return instance
  }

  /**
   * 删除实例
   * @param {string} id - 实例 ID
   */
  async function deleteInstance(id) {
    if (!instancesManager) return
    await instancesManager.deleteInstance(id)
    // 断开连接
    if (executorFactory) {
      await executorFactory.removeExecutor(id)
    }
    instances.value = instances.value.filter((i) => i.id !== id)
    delete connectionStatus.value[id]
    // 如果删除的是当前活跃实例，切回本地
    if (activeInstanceId.value === id) {
      activeInstanceId.value = 'local'
    }
  }

  /**
   * 测试 SSH 连接
   * @param {object} config - 连接配置（明文密码）
   * @returns {Promise<{success: boolean, message: string, info?: object}>}
   */
  async function testConnection(config) {
    if (!instancesManager) return { success: false, message: '运行环境不可用' }
    testing.value = true
    try {
      return await instancesManager.testConnection(config)
    } finally {
      testing.value = false
    }
  }

  /**
   * 连接到远程实例
   * @param {string} id - 实例 ID
   */
  async function connectInstance(id) {
    if (!instancesManager || !executorFactory) return
    const instance = instances.value.find((i) => i.id === id)
    if (!instance || instance.type === 'local') return

    connectionStatus.value[id] = 'connecting'
    try {
      const config = await instancesManager.getDecryptedConfig(instance)
      const executor = executorFactory.getExecutor(instance, config)
      await executor.connect()
      connectionStatus.value[id] = 'connected'
    } catch (err) {
      connectionStatus.value[id] = 'error'
      throw err
    }
  }

  /**
   * 断开远程实例连接
   * @param {string} id - 实例 ID
   */
  async function disconnectInstance(id) {
    if (!executorFactory) return
    await executorFactory.removeExecutor(id)
    connectionStatus.value[id] = 'disconnected'
  }

  /**
   * 切换活跃实例
   * @param {string} id - 实例 ID
   */
  async function setActiveInstance(id) {
    activeInstanceId.value = id
    // 如果是 SSH 实例且未连接，自动连接
    const instance = instances.value.find((i) => i.id === id)
    if (instance && instance.type === 'ssh' && connectionStatus.value[id] !== 'connected') {
      try {
        await connectInstance(id)
      } catch (err) {
        console.error('自动连接实例失败:', err)
      }
    }
  }

  /**
   * 获取当前活跃实例的执行器
   */
  function getActiveExecutor() {
    if (!executorFactory) return null
    const instance = activeInstance.value
    if (!instance || instance.type === 'local') {
      return executorFactory.localExecutor
    }
    return executorFactory.getExecutor(instance)
  }

  return {
    instances,
    activeInstanceId,
    connectionStatus,
    loading,
    testing,
    activeInstance,
    loadInstances,
    addInstance,
    deleteInstance,
    testConnection,
    connectInstance,
    disconnectInstance,
    setActiveInstance,
    getActiveExecutor,
  }
})
