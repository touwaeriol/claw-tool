/**
 * OpenClaw 版本检测与更新模块
 * 检测本地版本 vs npm 最新版本，支持一键更新
 */

const { eventBus, Events } = require('../shared/ipc')

// 检查间隔（默认 24 小时）
const DEFAULT_CHECK_INTERVAL = 24 * 60 * 60 * 1000

let checkTimer = null
let cachedLatestVersion = null
let lastCheckTime = 0

// 事件名称
const UpdateEvents = {
  // OpenClaw 有新版本可用
  OPENCLAW_UPDATE_AVAILABLE: 'openclaw:update-available',
  // OpenClaw 更新进度
  OPENCLAW_UPDATE_PROGRESS: 'openclaw:update-progress',
  // OpenClaw 更新完成
  OPENCLAW_UPDATE_COMPLETE: 'openclaw:update-complete',
  // OpenClaw 更新失败
  OPENCLAW_UPDATE_ERROR: 'openclaw:update-error',
}

/**
 * 获取当前安装的 OpenClaw 版本
 * @param {object} executor - 执行器实例
 * @returns {Promise<string|null>} 版本号，如 "1.2.3"
 */
async function getCurrentVersion(executor) {
  try {
    const result = await executor.exec('openclaw --version', { timeout: 10000 })
    if (result.exitCode === 0) {
      // 提取版本号（可能格式为 "openclaw v1.2.3" 或 "1.2.3"）
      const match = result.stdout.trim().match(/(\d+\.\d+\.\d+(?:-[\w.]+)?)/)
      return match ? match[1] : result.stdout.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * 查询 npm registry 上的最新版本
 * @param {object} executor - 执行器实例
 * @param {string} [channel='latest'] - 更新通道: 'latest' | 'beta' | 'dev'
 * @returns {Promise<string|null>} 最新版本号
 */
async function getLatestVersion(executor, channel = 'latest') {
  try {
    const tag = channel === 'latest' ? 'latest' : channel
    const result = await executor.exec(`npm view openclaw@${tag} version`, { timeout: 30000 })
    if (result.exitCode === 0) {
      const version = result.stdout.trim()
      if (version && /^\d+\.\d+/.test(version)) {
        cachedLatestVersion = version
        lastCheckTime = Date.now()
        return version
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * 比较两个语义化版本号
 * @param {string} current - 当前版本
 * @param {string} latest - 最新版本
 * @returns {boolean} 如果最新版本更高，返回 true
 */
function isNewerVersion(current, latest) {
  if (!current || !latest) return false

  // 提取纯数字部分
  const cleanVersion = (v) => v.replace(/^v/, '').split('-')[0]
  const c = cleanVersion(current).split('.').map(Number)
  const l = cleanVersion(latest).split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const cv = c[i] || 0
    const lv = l[i] || 0
    if (lv > cv) return true
    if (lv < cv) return false
  }
  return false
}

/**
 * 检查 OpenClaw 是否有可用更新
 * @param {object} executor - 执行器实例
 * @param {string} [channel='latest'] - 更新通道
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string|null, latestVersion: string|null}>}
 */
async function checkForUpdate(executor, channel = 'latest') {
  const [currentVersion, latestVersion] = await Promise.all([
    getCurrentVersion(executor),
    getLatestVersion(executor, channel),
  ])

  const hasUpdate = isNewerVersion(currentVersion, latestVersion)

  if (hasUpdate) {
    eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_AVAILABLE, {
      currentVersion,
      latestVersion,
    })
  }

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
  }
}

/**
 * 执行 OpenClaw 更新
 * @param {object} executor - 执行器实例
 * @param {string} [version] - 指定版本，默认 latest
 * @param {function} [onProgress] - 进度回调
 * @returns {Promise<{success: boolean, version: string|null, message: string}>}
 */
async function performUpdate(executor, version, onProgress) {
  const targetVersion = version || 'latest'
  const command = `npm install -g openclaw@${targetVersion}`

  eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_PROGRESS, {
    stage: 'installing',
    message: `正在更新 OpenClaw 到 ${targetVersion}...`,
  })

  if (onProgress) {
    onProgress({ stage: 'installing', message: `正在执行: ${command}` })
  }

  try {
    // 使用流式执行以获取实时输出
    if (executor.execStream) {
      let output = ''
      await executor.execStream(command, {
        timeout: 120000,
        onStdout: (data) => {
          output += data
          if (onProgress) {
            onProgress({ stage: 'installing', message: data.trim() })
          }
        },
        onStderr: (data) => {
          output += data
          if (onProgress) {
            onProgress({ stage: 'installing', message: data.trim() })
          }
        },
      })

      // 验证安装结果
      const newVersion = await getCurrentVersion(executor)
      if (newVersion) {
        eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_COMPLETE, { version: newVersion })
        return { success: true, version: newVersion, message: `更新成功，当前版本: ${newVersion}` }
      }
      return { success: false, version: null, message: '更新完成但无法验证版本' }
    } else {
      // 非流式执行
      const result = await executor.exec(command, { timeout: 120000 })
      if (result.exitCode === 0) {
        const newVersion = await getCurrentVersion(executor)
        eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_COMPLETE, { version: newVersion })
        return { success: true, version: newVersion, message: `更新成功，当前版本: ${newVersion}` }
      }
      const errorMsg = result.stderr || result.stdout || '未知错误'
      eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_ERROR, { message: errorMsg })
      return { success: false, version: null, message: `更新失败: ${errorMsg}` }
    }
  } catch (err) {
    eventBus.emit(UpdateEvents.OPENCLAW_UPDATE_ERROR, { message: err.message })
    return { success: false, version: null, message: `更新失败: ${err.message}` }
  }
}

/**
 * 启动定时检查
 * @param {function} getExecutor - 获取执行器的函数
 * @param {number} [interval] - 检查间隔（毫秒）
 * @param {string} [channel='latest'] - 更新通道
 */
function startAutoCheck(getExecutor, interval = DEFAULT_CHECK_INTERVAL, channel = 'latest') {
  stopAutoCheck()

  // 首次延迟 30 秒后检查
  setTimeout(async () => {
    const executor = getExecutor()
    if (executor) {
      try {
        await checkForUpdate(executor, channel)
      } catch (err) {
        console.warn('[OpenClaw 更新] 自动检查失败:', err.message)
      }
    }
  }, 30000)

  // 定时检查
  checkTimer = setInterval(async () => {
    const executor = getExecutor()
    if (executor) {
      try {
        await checkForUpdate(executor, channel)
      } catch (err) {
        console.warn('[OpenClaw 更新] 定时检查失败:', err.message)
      }
    }
  }, interval)
}

/**
 * 停止定时检查
 */
function stopAutoCheck() {
  if (checkTimer) {
    clearInterval(checkTimer)
    checkTimer = null
  }
}

/**
 * 获取缓存的检查结果
 */
function getCachedResult() {
  return {
    latestVersion: cachedLatestVersion,
    lastCheckTime,
  }
}

module.exports = {
  getCurrentVersion,
  getLatestVersion,
  isNewerVersion,
  checkForUpdate,
  performUpdate,
  startAutoCheck,
  stopAutoCheck,
  getCachedResult,
  UpdateEvents,
}
