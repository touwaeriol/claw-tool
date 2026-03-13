/**
 * 执行器工厂
 * 根据实例类型返回对应的执行器实例，管理 SSH 连接池
 */

const { LocalExecutor } = require('./local-executor')
const { SshExecutor } = require('./ssh-executor')

// 本地执行器单例
const localExecutor = new LocalExecutor()

// SSH 执行器连接池（按实例 ID 缓存）
const sshPool = new Map()

// 连接池空闲超时（5 分钟）
const IDLE_TIMEOUT = 5 * 60 * 1000
let healthCheckTimer = null

/**
 * 获取指定实例的执行器
 * @param {object} instance - 实例信息
 * @param {string} instance.type - 实例类型: 'local' | 'ssh'
 * @param {string} [instance.id] - 实例 ID
 * @param {object} [sshConfig] - SSH 连接配置（解密后的明文凭据）
 * @returns {LocalExecutor|SshExecutor}
 */
function getExecutor(instance, sshConfig) {
  if (!instance || instance.type === 'local') {
    return localExecutor
  }

  // 从连接池获取或创建新的 SSH 执行器
  if (sshPool.has(instance.id)) {
    return sshPool.get(instance.id)
  }

  if (!sshConfig) {
    console.warn(`[执行器工厂] 未提供 SSH 配置，回退到本地执行器`)
    return localExecutor
  }

  const executor = new SshExecutor(sshConfig)
  sshPool.set(instance.id, executor)
  return executor
}

/**
 * 从连接池移除指定实例的执行器
 * @param {string} instanceId - 实例 ID
 */
async function removeExecutor(instanceId) {
  const executor = sshPool.get(instanceId)
  if (executor) {
    await executor.dispose()
    sshPool.delete(instanceId)
  }
}

/**
 * 释放所有 SSH 连接
 */
async function disposeAll() {
  for (const executor of sshPool.values()) {
    await executor.dispose()
  }
  sshPool.clear()
  stopHealthCheck()
}

/**
 * 启动连接池心跳检查，清理空闲连接
 */
function startHealthCheck() {
  if (healthCheckTimer) return
  healthCheckTimer = setInterval(() => {
    const now = Date.now()
    for (const [id, executor] of sshPool.entries()) {
      if (now - executor.lastUsed > IDLE_TIMEOUT) {
        console.log(`[执行器工厂] 清理空闲 SSH 连接: ${id}`)
        executor.dispose()
        sshPool.delete(id)
      }
    }
  }, 60000) // 每分钟检查一次
}

/**
 * 停止心跳检查
 */
function stopHealthCheck() {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer)
    healthCheckTimer = null
  }
}

module.exports = {
  getExecutor,
  removeExecutor,
  disposeAll,
  startHealthCheck,
  stopHealthCheck,
  localExecutor,
}
