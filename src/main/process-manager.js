/**
 * 进程管理器
 * 负责 OpenClaw Gateway 进程的启动、停止、重启和状态监控
 * 通过 executor 抽象层支持本地和远程操作
 */

const { spawn } = require('child_process')
const { EventEmitter } = require('events')
const { eventBus, Events } = require('../shared/ipc')

// 注入代理环境变量
function getEnvWithProxy() {
  const env = { ...process.env }
  try {
    const { getProxyEnv } = require('./proxy-manager')
    const proxyEnv = getProxyEnv()
    Object.assign(env, proxyEnv)
  } catch { /* proxy-manager 不可用时忽略 */ }
  return env
}

class ProcessManager extends EventEmitter {
  constructor() {
    super()
    // 当前 Gateway 子进程（前台模式时）
    this._process = null
    // 进程 PID
    this._pid = null
    // 运行状态
    this._running = false
    // 启动时间戳
    this._startedAt = null
    // 状态轮询定时器
    this._pollTimer = null
    // 日志缓冲
    this._logBuffer = []
    // 最大日志条目数
    this._maxLogEntries = 5000
  }

  /**
   * 获取当前状态
   */
  get status() {
    return {
      running: this._running,
      pid: this._pid,
      startedAt: this._startedAt,
      uptime: this._startedAt ? Math.floor((Date.now() - this._startedAt) / 1000) : 0,
    }
  }

  /**
   * 通过 executor 启动 Gateway（前台模式，用于本地）
   * @param {object} executor - 执行器实例
   * @param {object} [options] - 选项
   * @param {function} [options.onLog] - 日志回调
   */
  async startForeground(executor, options = {}) {
    if (this._running) {
      throw new Error('Gateway 已在运行中')
    }

    // 使用 executor 的 execStream 方法（LocalExecutor 支持）
    if (typeof executor.execStream === 'function') {
      return this._startLocalForeground(executor, options)
    }

    // 远程模式：通过 daemon 启动
    return this.startDaemon(executor)
  }

  /**
   * 本地前台模式启动 Gateway
   */
  _startLocalForeground(executor, options = {}) {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32'
      const shell = isWin ? 'cmd.exe' : '/bin/sh'
      const shellArgs = isWin ? ['/c', 'openclaw gateway'] : ['-c', 'openclaw gateway']

      const child = spawn(shell, shellArgs, {
        windowsHide: true,
        env: getEnvWithProxy(),
      })

      this._process = child
      this._pid = child.pid
      this._running = true
      this._startedAt = Date.now()

      // 通知状态变化
      this._emitStatus()

      child.stdout.on('data', (data) => {
        const text = data.toString()
        this._appendLog('stdout', text)
        if (options.onLog) options.onLog('stdout', text)
      })

      child.stderr.on('data', (data) => {
        const text = data.toString()
        this._appendLog('stderr', text)
        if (options.onLog) options.onLog('stderr', text)
      })

      child.on('close', (code) => {
        this._process = null
        this._pid = null
        this._running = false
        this._emitStatus()
        this._appendLog('system', `Gateway 进程已退出，退出码: ${code}`)
      })

      child.on('error', (err) => {
        this._running = false
        this._process = null
        this._pid = null
        this._emitStatus()
        this._appendLog('system', `Gateway 启动失败: ${err.message}`)
      })

      // 短暂延迟后检查进程是否仍在运行
      setTimeout(() => {
        if (this._running) {
          resolve({ pid: this._pid })
        } else {
          reject(new Error('Gateway 进程启动后立即退出'))
        }
      }, 1000)
    })
  }

  /**
   * 通过 daemon 模式启动
   * @param {object} executor - 执行器实例
   */
  async startDaemon(executor) {
    const result = await executor.exec('openclaw daemon start')
    if (result.exitCode !== 0) {
      throw new Error(`启动 daemon 失败: ${result.stderr || result.stdout}`)
    }
    // 启动后刷新状态
    await this.refreshStatus(executor)
    return result
  }

  /**
   * 停止 Gateway
   * @param {object} executor - 执行器实例
   */
  async stop(executor) {
    // 前台模式：直接终止子进程
    if (this._process) {
      return this._stopLocalProcess()
    }

    // daemon 模式：通过命令停止
    const result = await executor.exec('openclaw daemon stop')
    this._running = false
    this._pid = null
    this._startedAt = null
    this._emitStatus()
    return result
  }

  /**
   * 终止本地前台进程
   */
  _stopLocalProcess() {
    return new Promise((resolve) => {
      if (!this._process) {
        resolve()
        return
      }

      const child = this._process

      child.on('close', () => {
        this._process = null
        this._pid = null
        this._running = false
        this._startedAt = null
        this._emitStatus()
        resolve()
      })

      // Windows 上使用 taskkill，其他平台发送 SIGTERM
      if (process.platform === 'win32') {
        spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
          windowsHide: true,
        })
      } else {
        child.kill('SIGTERM')
        // 5秒后强制终止
        setTimeout(() => {
          if (this._process) {
            child.kill('SIGKILL')
          }
        }, 5000)
      }
    })
  }

  /**
   * 重启 Gateway
   * @param {object} executor - 执行器实例
   * @param {object} [options] - 启动选项
   */
  async restart(executor, options = {}) {
    await this.stop(executor)
    // 等待进程完全退出
    await new Promise((r) => setTimeout(r, 1000))
    return this.startForeground(executor, options)
  }

  /**
   * 刷新服务状态（通过 openclaw daemon status）
   * @param {object} executor - 执行器实例
   */
  async refreshStatus(executor) {
    try {
      const result = await executor.exec('openclaw daemon status', { timeout: 10000 })
      const output = result.stdout + result.stderr

      // 解析状态输出
      const isRunning = output.includes('running') || result.exitCode === 0
      const pidMatch = output.match(/pid[:\s]+(\d+)/i)

      this._running = isRunning
      this._pid = pidMatch ? parseInt(pidMatch[1]) : null

      if (isRunning && !this._startedAt) {
        this._startedAt = Date.now()
      } else if (!isRunning) {
        this._startedAt = null
      }

      this._emitStatus()
      return this.status
    } catch (err) {
      this._running = false
      this._pid = null
      this._emitStatus()
      return this.status
    }
  }

  /**
   * 启动状态轮询
   * @param {object} executor - 执行器实例
   * @param {number} [intervalMs=5000] - 轮询间隔
   */
  startPolling(executor, intervalMs = 5000) {
    this.stopPolling()
    this._pollTimer = setInterval(() => {
      this.refreshStatus(executor)
    }, intervalMs)
  }

  /**
   * 停止状态轮询
   */
  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer)
      this._pollTimer = null
    }
  }

  /**
   * 发送状态变化事件
   */
  _emitStatus() {
    const status = this.status
    this.emit('status', status)
    eventBus.emit(Events.SERVICE_STATUS_CHANGED, status)
  }

  /**
   * 添加日志条目
   */
  _appendLog(type, text) {
    const entry = {
      timestamp: Date.now(),
      type,
      text,
    }
    this._logBuffer.push(entry)

    // 限制日志缓冲大小
    if (this._logBuffer.length > this._maxLogEntries) {
      this._logBuffer = this._logBuffer.slice(-this._maxLogEntries)
    }

    // 通过事件总线发送日志
    eventBus.emit(Events.LOG_ENTRY, entry)
  }

  /**
   * 获取日志缓冲
   */
  getLogBuffer() {
    return [...this._logBuffer]
  }

  /**
   * 清空日志缓冲
   */
  clearLogBuffer() {
    this._logBuffer = []
  }

  /**
   * 清理资源
   */
  async dispose() {
    this.stopPolling()
    if (this._process) {
      await this._stopLocalProcess()
    }
  }
}

// 导出单例
const processManager = new ProcessManager()

module.exports = { ProcessManager, processManager }
