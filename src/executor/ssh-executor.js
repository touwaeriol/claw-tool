/**
 * SSH 远程执行器
 * 使用 ssh2 库建立 SSH 连接，支持命令执行和 SFTP 文件操作
 */

const { Client } = require('ssh2')
const fs = require('fs').promises

class SshExecutor {
  /**
   * @param {object} config - SSH 连接配置
   * @param {string} config.host - 主机地址
   * @param {number} [config.port=22] - SSH 端口
   * @param {string} config.username - 用户名
   * @param {string} [config.authType='password'] - 认证方式: 'password' | 'key'
   * @param {string} [config.password] - 密码
   * @param {string} [config.privateKeyPath] - 私钥文件路径
   * @param {string} [config.passphrase] - 私钥密码
   */
  constructor(config) {
    this._config = config
    this._client = null
    this._sftp = null
    this._connected = false
    this._connecting = false
    this._lastUsed = Date.now()
  }

  /**
   * 建立 SSH 连接
   */
  async connect() {
    if (this._connected && this._client) {
      this._lastUsed = Date.now()
      return
    }
    if (this._connecting) {
      // 等待正在进行的连接
      await this._waitForConnect()
      return
    }

    this._connecting = true
    try {
      this._client = new Client()
      const connectConfig = {
        host: this._config.host,
        port: this._config.port || 22,
        username: this._config.username,
        readyTimeout: 15000,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
      }

      // 根据认证方式设置凭据
      if (this._config.authType === 'key' && this._config.privateKeyPath) {
        const keyPath = this._config.privateKeyPath.replace(/^~/, require('os').homedir())
        connectConfig.privateKey = await fs.readFile(keyPath)
        if (this._config.passphrase) {
          connectConfig.passphrase = this._config.passphrase
        }
      } else if (this._config.password) {
        connectConfig.password = this._config.password
      }

      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SSH 连接超时'))
        }, 20000)

        this._client.on('ready', () => {
          clearTimeout(timeout)
          this._connected = true
          this._lastUsed = Date.now()
          resolve()
        })

        this._client.on('error', (err) => {
          clearTimeout(timeout)
          this._connected = false
          reject(err)
        })

        this._client.on('close', () => {
          this._connected = false
          this._sftp = null
        })

        this._client.on('end', () => {
          this._connected = false
          this._sftp = null
        })

        this._client.connect(connectConfig)
      })
    } finally {
      this._connecting = false
    }
  }

  /**
   * 等待正在进行的连接完成
   */
  _waitForConnect() {
    return new Promise((resolve, reject) => {
      const check = setInterval(() => {
        if (!this._connecting) {
          clearInterval(check)
          if (this._connected) {
            resolve()
          } else {
            reject(new Error('SSH 连接失败'))
          }
        }
      }, 100)
      // 最多等待 20 秒
      setTimeout(() => {
        clearInterval(check)
        reject(new Error('等待 SSH 连接超时'))
      }, 20000)
    })
  }

  /**
   * 获取 SFTP 客户端
   */
  async _getSftp() {
    await this.connect()
    if (this._sftp) return this._sftp

    return new Promise((resolve, reject) => {
      this._client.sftp((err, sftp) => {
        if (err) return reject(err)
        this._sftp = sftp
        resolve(sftp)
      })
    })
  }

  /**
   * 执行 shell 命令
   * @param {string} command - 要执行的命令
   * @param {object} [options] - 选项
   * @param {string} [options.cwd] - 工作目录
   * @param {number} [options.timeout] - 超时（毫秒）
   * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
   */
  async exec(command, options = {}) {
    await this.connect()
    this._lastUsed = Date.now()

    // 如果指定了工作目录，则在命令前加 cd
    const fullCommand = options.cwd ? `cd ${JSON.stringify(options.cwd)} && ${command}` : command

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 60000
      const timer = setTimeout(() => {
        reject(new Error(`命令执行超时: ${command}`))
      }, timeout)

      this._client.exec(fullCommand, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          return reject(err)
        }

        let stdout = ''
        let stderr = ''

        stream.on('data', (data) => {
          stdout += data.toString()
        })

        stream.stderr.on('data', (data) => {
          stderr += data.toString()
        })

        stream.on('close', (code) => {
          clearTimeout(timer)
          resolve({
            stdout,
            stderr,
            exitCode: code || 0,
          })
        })
      })
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
  async execStream(command, options = {}) {
    await this.connect()
    this._lastUsed = Date.now()

    const fullCommand = options.cwd ? `cd ${JSON.stringify(options.cwd)} && ${command}` : command

    return new Promise((resolve, reject) => {
      this._client.exec(fullCommand, (err, stream) => {
        if (err) return reject(err)

        if (options.onStdout) {
          stream.on('data', (data) => options.onStdout(data.toString()))
        }
        if (options.onStderr) {
          stream.stderr.on('data', (data) => options.onStderr(data.toString()))
        }

        stream.on('close', (code) => {
          resolve({ exitCode: code || 0 })
        })
      })

      if (options.timeout) {
        setTimeout(() => {
          reject(new Error(`命令执行超时: ${command}`))
        }, options.timeout)
      }
    })
  }

  /**
   * 读取远程文件内容
   */
  async readFile(filePath, encoding = 'utf-8') {
    const sftp = await this._getSftp()
    this._lastUsed = Date.now()

    return new Promise((resolve, reject) => {
      sftp.readFile(filePath, encoding, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  /**
   * 写入远程文件
   */
  async writeFile(filePath, content) {
    const sftp = await this._getSftp()
    this._lastUsed = Date.now()

    // 确保目录存在
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    await this.exec(`mkdir -p ${JSON.stringify(dir)}`)

    return new Promise((resolve, reject) => {
      sftp.writeFile(filePath, content, 'utf-8', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
  }

  /**
   * 检查远程文件/目录是否存在
   */
  async exists(filePath) {
    const sftp = await this._getSftp()
    this._lastUsed = Date.now()

    return new Promise((resolve) => {
      sftp.stat(filePath, (err) => {
        resolve(!err)
      })
    })
  }

  /**
   * 获取远程用户 home 目录
   */
  async getHomeDir() {
    const result = await this.exec('echo $HOME')
    return result.stdout.trim()
  }

  /**
   * 测试 SSH 连接可用性
   */
  async ping() {
    try {
      await this.connect()
      const result = await this.exec('echo ok')
      return result.stdout.trim() === 'ok'
    } catch {
      return false
    }
  }

  /**
   * 获取连接状态
   */
  get connected() {
    return this._connected
  }

  /**
   * 上次使用时间
   */
  get lastUsed() {
    return this._lastUsed
  }

  /**
   * 释放资源，关闭 SSH 连接
   */
  async dispose() {
    this._sftp = null
    this._connected = false
    if (this._client) {
      try {
        this._client.end()
      } catch {
        // 忽略关闭错误
      }
      this._client = null
    }
  }
}

module.exports = { SshExecutor }
