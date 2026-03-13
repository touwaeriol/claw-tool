/**
 * 配置管理器
 * 通过 executor 抽象层读写 ~/.openclaw/openclaw.json
 * 支持本地和远程（SSH）配置操作
 */

let JSON5
try {
  JSON5 = require('json5')
} catch {
  // 开发模式下可能需要动态加载
  JSON5 = JSON
}

class ConfigManager {
  /**
   * @param {object} executor - IExecutor 实例（本地或 SSH）
   */
  constructor(executor) {
    this.executor = executor
    this._configPath = null
  }

  /**
   * 获取配置文件路径
   */
  async getConfigPath() {
    if (this._configPath) return this._configPath
    const homeDir = await this.executor.getHomeDir()
    // 统一使用正斜杠（兼容远程 Linux）
    this._configPath = `${homeDir}/.openclaw/openclaw.json`
    return this._configPath
  }

  /**
   * 读取配置文件
   * @returns {{ config: object, filePath: string }}
   */
  async readConfig() {
    const configPath = await this.getConfigPath()
    const exists = await this.executor.exists(configPath)

    if (!exists) {
      // 配置文件不存在，返回默认空配置
      return {
        config: this._defaultConfig(),
        filePath: configPath,
      }
    }

    const content = await this.executor.readFile(configPath, 'utf-8')
    const config = JSON5.parse(content)

    return {
      config,
      filePath: configPath,
    }
  }

  /**
   * 写入配置文件
   * @param {object} config - 配置对象
   */
  async writeConfig(config) {
    const configPath = await this.getConfigPath()

    // 写入前先备份
    await this._backup(configPath)

    const content = JSON5.stringify(config, null, 2)
    await this.executor.writeFile(configPath, content)
  }

  /**
   * 验证配置（通过 openclaw CLI）
   * @returns {{ valid: boolean, errors: string[] }}
   */
  async validateConfig() {
    try {
      const result = await this.executor.exec('openclaw configure --validate', { timeout: 10000 })
      if (result.exitCode === 0) {
        return { valid: true, errors: [] }
      }
      const errors = (result.stderr || result.stdout).split('\n').filter(Boolean)
      return { valid: false, errors }
    } catch (err) {
      return { valid: false, errors: [err.message] }
    }
  }

  /**
   * 备份配置文件
   * @param {string} configPath - 配置文件路径
   */
  async _backup(configPath) {
    try {
      const exists = await this.executor.exists(configPath)
      if (!exists) return

      const bakPath = configPath + '.bak'
      const content = await this.executor.readFile(configPath, 'utf-8')
      await this.executor.writeFile(bakPath, content)
    } catch (err) {
      console.warn('[ConfigManager] 备份失败:', err.message)
    }
  }

  /**
   * 从备份恢复
   */
  async restoreFromBackup() {
    const configPath = await this.getConfigPath()
    const bakPath = configPath + '.bak'

    const exists = await this.executor.exists(bakPath)
    if (!exists) {
      throw new Error('备份文件不存在')
    }

    const content = await this.executor.readFile(bakPath, 'utf-8')
    // 验证备份内容有效
    JSON5.parse(content)
    await this.executor.writeFile(configPath, content)
  }

  /**
   * 测试供应商连通性
   * @param {object} provider - 供应商配置
   * @returns {{ ok: boolean, message: string, latencyMs: number }}
   */
  async testProviderConnection(provider) {
    const startTime = Date.now()
    try {
      // 根据 API 类型构造简单的请求来测试连通性
      const baseUrl = (provider.baseUrl || '').replace(/\/$/, '')
      if (!baseUrl) {
        return { ok: false, message: '未配置 baseUrl', latencyMs: 0 }
      }

      // 使用 curl 测试连通性（通过 executor 执行，兼容远程）
      const curlCmd = `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "${baseUrl}/models" -H "Authorization: Bearer ${provider.apiKey || ''}"`
      const result = await this.executor.exec(curlCmd, { timeout: 10000 })
      const statusCode = parseInt(result.stdout.trim(), 10)
      const latencyMs = Date.now() - startTime

      if (statusCode >= 200 && statusCode < 500) {
        return { ok: true, message: `HTTP ${statusCode}`, latencyMs }
      }
      return { ok: false, message: `HTTP ${statusCode}`, latencyMs }
    } catch (err) {
      return { ok: false, message: err.message, latencyMs: Date.now() - startTime }
    }
  }

  /**
   * 默认空配置
   */
  _defaultConfig() {
    return {
      models: {
        providers: {},
      },
      channels: {},
      gateway: {
        port: 18789,
        bind: 'auto',
      },
      agents: {},
      log: {
        level: 'info',
      },
    }
  }
}

module.exports = { ConfigManager }
