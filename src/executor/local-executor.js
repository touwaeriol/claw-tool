/**
 * 本地执行器
 * 使用 child_process 和 fs 实现本地命令执行和文件操作
 */

const { exec, spawn } = require('child_process')
const fs = require('fs').promises
const os = require('os')
const path = require('path')

// 延迟加载代理管理器（避免循环依赖）
let _proxyManager = null
function getProxyManager() {
  if (!_proxyManager) {
    try {
      _proxyManager = require('../main/proxy-manager')
    } catch {
      // 代理管理器未就绪
    }
  }
  return _proxyManager
}

// 延迟加载 bundled node 路径
let _bundledEnv = null
function getBundledEnv() {
  if (_bundledEnv !== null) return _bundledEnv
  try {
    const { getEnhancedEnv } = require('../shared/bundled-node')
    _bundledEnv = getEnhancedEnv()
  } catch {
    _bundledEnv = {}
  }
  return _bundledEnv
}

class LocalExecutor {
  /**
   * 执行 shell 命令
   * @param {string} command - 要执行的命令
   * @param {object} [options] - 选项
   * @param {string} [options.cwd] - 工作目录
   * @param {number} [options.timeout] - 超时（毫秒）
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  exec(command, options = {}) {
    return new Promise((resolve, reject) => {
      // 注入 bundled node 路径和代理环境变量
      const bundledEnv = getBundledEnv()
      const pm = getProxyManager()
      const proxyEnv = pm ? pm.getProxyEnv() : {}
      const child = exec(
        command,
        {
          cwd: options.cwd,
          timeout: options.timeout || 60000,
          windowsHide: true,
          env: { ...process.env, ...bundledEnv, ...proxyEnv, ...options.env },
        },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: error ? error.code || 1 : 0,
          })
        },
      )
    })
  }

  /**
   * 以流式方式执行命令，实时回调输出
   * @param {string} command - 要执行的命令
   * @param {object} [options] - 选项
   * @param {function} [options.onStdout] - stdout 数据回调
   * @param {function} [options.onStderr] - stderr 数据回调
   * @returns {Promise<{exitCode: number}>}
   */
  execStream(command, options = {}) {
    return new Promise((resolve, reject) => {
      const isWin = process.platform === 'win32'
      const shell = isWin ? 'cmd.exe' : '/bin/sh'
      const shellArgs = isWin ? ['/c', command] : ['-c', command]

      // 注入 bundled node 路径和代理环境变量
      const bundledEnv = getBundledEnv()
      const pm = getProxyManager()
      const proxyEnv = pm ? pm.getProxyEnv() : {}
      const child = spawn(shell, shellArgs, {
        cwd: options.cwd,
        windowsHide: true,
        env: { ...process.env, ...bundledEnv, ...proxyEnv, ...options.env },
      })

      if (options.onStdout) {
        child.stdout.on('data', (data) => options.onStdout(data.toString()))
      }
      if (options.onStderr) {
        child.stderr.on('data', (data) => options.onStderr(data.toString()))
      }

      child.on('close', (code) => {
        resolve({ exitCode: code || 0 })
      })

      child.on('error', (err) => {
        reject(err)
      })

      // 支持超时
      if (options.timeout) {
        setTimeout(() => {
          child.kill()
          reject(new Error(`命令执行超时: ${command}`))
        }, options.timeout)
      }
    })
  }

  /**
   * 读取文件内容
   */
  async readFile(filePath, encoding = 'utf-8') {
    return fs.readFile(filePath, encoding)
  }

  /**
   * 写入文件
   */
  async writeFile(filePath, content) {
    // 确保目录存在
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    return fs.writeFile(filePath, content, 'utf-8')
  }

  /**
   * 检查文件/目录是否存在
   */
  async exists(filePath) {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * 获取用户 home 目录
   */
  async getHomeDir() {
    return os.homedir()
  }

  /**
   * 测试连接可用性（本地始终可用）
   */
  async ping() {
    return true
  }

  /**
   * 释放资源（本地无需操作）
   */
  async dispose() {
    // 无操作
  }
}

module.exports = { LocalExecutor }
