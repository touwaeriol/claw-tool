/**
 * 守护进程管理
 * 封装 openclaw daemon 命令，支持系统服务注册
 * Windows: 注册表/任务计划程序
 * macOS: launchctl plist
 */

const path = require('path')
const fs = require('fs').promises
const os = require('os')

class DaemonManager {
  constructor() {
    this._platform = process.platform
  }

  /**
   * 启动 daemon
   * @param {object} executor - 执行器实例
   */
  async start(executor) {
    const result = await executor.exec('openclaw daemon start')
    return {
      success: result.exitCode === 0,
      output: result.stdout + result.stderr,
    }
  }

  /**
   * 停止 daemon
   * @param {object} executor - 执行器实例
   */
  async stop(executor) {
    const result = await executor.exec('openclaw daemon stop')
    return {
      success: result.exitCode === 0,
      output: result.stdout + result.stderr,
    }
  }

  /**
   * 重启 daemon
   * @param {object} executor - 执行器实例
   */
  async restart(executor) {
    const result = await executor.exec('openclaw daemon restart')
    return {
      success: result.exitCode === 0,
      output: result.stdout + result.stderr,
    }
  }

  /**
   * 查询 daemon 状态
   * @param {object} executor - 执行器实例
   */
  async status(executor) {
    const result = await executor.exec('openclaw daemon status', { timeout: 10000 })
    const output = result.stdout + result.stderr

    return {
      running: result.exitCode === 0 && !output.includes('not running'),
      output,
      exitCode: result.exitCode,
    }
  }

  /**
   * 安装为系统服务
   * @param {object} executor - 执行器实例
   */
  async install(executor) {
    const result = await executor.exec('openclaw daemon install')
    return {
      success: result.exitCode === 0,
      output: result.stdout + result.stderr,
    }
  }

  /**
   * 卸载系统服务
   * @param {object} executor - 执行器实例
   */
  async uninstall(executor) {
    const result = await executor.exec('openclaw daemon uninstall')
    return {
      success: result.exitCode === 0,
      output: result.stdout + result.stderr,
    }
  }

  /**
   * 配置开机自启动
   * @param {object} executor - 执行器实例
   * @param {boolean} enable - 是否启用
   */
  async setAutoStart(executor, enable) {
    if (this._platform === 'win32') {
      return this._setAutoStartWindows(executor, enable)
    } else if (this._platform === 'darwin') {
      return this._setAutoStartMacOS(executor, enable)
    }
    return { success: false, output: { key: 'service.unsupportedOs' } }
  }

  /**
   * 检查是否已配置开机自启
   * @param {object} executor - 执行器实例
   */
  async isAutoStartEnabled(executor) {
    if (this._platform === 'win32') {
      return this._checkAutoStartWindows(executor)
    } else if (this._platform === 'darwin') {
      return this._checkAutoStartMacOS(executor)
    }
    return false
  }

  /**
   * Windows: 通过注册表设置开机自启
   */
  async _setAutoStartWindows(executor, enable) {
    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    const valueName = 'OpenClawDaemon'

    if (enable) {
      // 获取 openclaw 路径
      const whichResult = await executor.exec('where openclaw')
      const openclawPath = whichResult.stdout.trim().split('\n')[0]
      if (!openclawPath) {
        return { success: false, output: { key: 'service.openclawCmdNotFound' } }
      }
      const cmd = `reg add "${regKey}" /v ${valueName} /t REG_SZ /d "\\"${openclawPath}\\" daemon start" /f`
      const result = await executor.exec(cmd)
      return { success: result.exitCode === 0, output: result.stdout + result.stderr }
    } else {
      const cmd = `reg delete "${regKey}" /v ${valueName} /f`
      const result = await executor.exec(cmd)
      return { success: result.exitCode === 0, output: result.stdout + result.stderr }
    }
  }

  /**
   * Windows: 检查注册表中是否有自启项
   */
  async _checkAutoStartWindows(executor) {
    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    const valueName = 'OpenClawDaemon'
    const result = await executor.exec(`reg query "${regKey}" /v ${valueName}`)
    return result.exitCode === 0
  }

  /**
   * macOS: 通过 launchctl plist 设置开机自启
   */
  async _setAutoStartMacOS(executor, enable) {
    const homeDir = await executor.getHomeDir()
    const plistDir = path.join(homeDir, 'Library', 'LaunchAgents')
    const plistPath = path.join(plistDir, 'com.openclaw.daemon.plist')

    if (enable) {
      // 获取 openclaw 路径
      const whichResult = await executor.exec('which openclaw')
      const openclawPath = whichResult.stdout.trim()
      if (!openclawPath) {
        return { success: false, output: { key: 'service.openclawCmdNotFound' } }
      }

      const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.daemon</string>
    <key>ProgramArguments</key>
    <array>
        <string>${openclawPath}</string>
        <string>daemon</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <false/>
    <key>StandardOutPath</key>
    <string>${homeDir}/.openclaw/logs/daemon-stdout.log</string>
    <key>StandardErrorPath</key>
    <string>${homeDir}/.openclaw/logs/daemon-stderr.log</string>
</dict>
</plist>`

      await executor.writeFile(plistPath, plistContent)
      const result = await executor.exec(`launchctl load "${plistPath}"`)
      return { success: result.exitCode === 0, output: result.stdout + result.stderr }
    } else {
      const unloadResult = await executor.exec(`launchctl unload "${plistPath}"`)
      // 删除 plist 文件
      await executor.exec(`rm -f "${plistPath}"`)
      return {
        success: unloadResult.exitCode === 0,
        output: unloadResult.stdout + unloadResult.stderr,
      }
    }
  }

  /**
   * macOS: 检查 plist 文件是否存在
   */
  async _checkAutoStartMacOS(executor) {
    const homeDir = await executor.getHomeDir()
    const plistPath = path.join(homeDir, 'Library', 'LaunchAgents', 'com.openclaw.daemon.plist')
    return executor.exists(plistPath)
  }
}

// 导出单例
const daemonManager = new DaemonManager()

module.exports = { DaemonManager, daemonManager }
