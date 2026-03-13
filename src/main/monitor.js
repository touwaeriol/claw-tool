/**
 * 状态监控服务
 * 定时轮询 OpenClaw 状态，通过 executor 抽象层支持本地和远程监控
 */

const { eventBus, Events } = require('../shared/ipc')

// 轮询间隔（毫秒）
const POLL_INTERVAL = 10000

let pollTimer = null

/**
 * 查询 OpenClaw 运行状态
 * @param {object} executor - 执行器实例（LocalExecutor 或 SshExecutor）
 * @returns {Promise<object>} 状态信息
 */
async function getStatus(executor) {
  try {
    const result = await executor.exec('openclaw status', { timeout: 10000 })
    if (result.exitCode === 0) {
      // 尝试解析 JSON 输出
      try {
        return { running: true, raw: result.stdout.trim(), parsed: JSON.parse(result.stdout) }
      } catch {
        return { running: true, raw: result.stdout.trim(), parsed: null }
      }
    }
    return { running: false, raw: result.stderr || result.stdout, parsed: null }
  } catch (err) {
    return { running: false, raw: err.message, parsed: null, error: true }
  }
}

/**
 * 查询 OpenClaw 健康信息
 * @param {object} executor - 执行器实例
 * @returns {Promise<object>}
 */
async function getHealth(executor) {
  try {
    const result = await executor.exec('openclaw doctor', { timeout: 30000 })
    return {
      exitCode: result.exitCode,
      output: result.stdout + result.stderr,
      healthy: result.exitCode === 0,
    }
  } catch (err) {
    return { exitCode: 1, output: err.message, healthy: false }
  }
}

/**
 * 测试 Gateway 端口连通性
 * @param {object} executor - 执行器实例
 * @param {number} port - Gateway 端口
 * @returns {Promise<boolean>}
 */
async function testGatewayPort(executor, port = 18789) {
  try {
    // 使用 curl 或 wget 测试端口
    const result = await executor.exec(
      `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${port}/health 2>/dev/null || echo "fail"`,
      { timeout: 5000 }
    )
    const code = result.stdout.trim()
    return code !== 'fail' && code !== '' && code !== '000'
  } catch {
    return false
  }
}

/**
 * 获取 OpenClaw 版本信息
 * @param {object} executor - 执行器实例
 * @returns {Promise<string|null>}
 */
async function getVersion(executor) {
  try {
    const result = await executor.exec('openclaw --version', { timeout: 10000 })
    if (result.exitCode === 0) {
      return result.stdout.trim()
    }
    return null
  } catch {
    return null
  }
}

/**
 * 执行诊断
 * @param {object} executor - 执行器实例
 * @param {boolean} [fix=false] - 是否自动修复
 * @returns {Promise<object>}
 */
async function runDoctor(executor, fix = false) {
  const cmd = fix ? 'openclaw doctor --fix' : 'openclaw doctor'
  try {
    const result = await executor.exec(cmd, { timeout: 60000 })
    return {
      exitCode: result.exitCode,
      output: result.stdout + result.stderr,
      success: result.exitCode === 0,
    }
  } catch (err) {
    return { exitCode: 1, output: err.message, success: false }
  }
}

/**
 * 启动定时状态轮询
 * @param {function} getExecutor - 获取当前执行器的函数
 */
function startPolling(getExecutor) {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      const executor = getExecutor()
      if (!executor) return
      const status = await getStatus(executor)
      eventBus.emit(Events.SERVICE_STATUS_CHANGED, status)
    } catch (err) {
      console.error('[监控] 状态轮询出错:', err.message)
    }
  }, POLL_INTERVAL)
}

/**
 * 停止定时轮询
 */
function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

module.exports = {
  getStatus,
  getHealth,
  testGatewayPort,
  getVersion,
  runDoctor,
  startPolling,
  stopPolling,
}
