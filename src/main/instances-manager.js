/**
 * 实例管理器
 * 管理本地和远程 SSH 实例的 CRUD、加密存储和连接测试
 */

const fs = require('fs').promises
const path = require('path')
const os = require('os')
const crypto = require('crypto')
const { SshExecutor } = require('../executor/ssh-executor')

// 实例配置存储路径
const CLAW_TOOL_DIR = path.join(os.homedir(), '.claw-tool')
const INSTANCES_FILE = path.join(CLAW_TOOL_DIR, 'instances.json')
const KEYSTORE_FILE = path.join(CLAW_TOOL_DIR, '.keystore')

// 加密算法常量
const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

// 默认本地实例
const LOCAL_INSTANCE = {
  id: 'local',
  name: '本地实例',
  type: 'local',
  isDefault: true,
}

/**
 * 获取或创建加密密钥
 */
async function getEncryptionKey() {
  try {
    await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
    try {
      const keyData = await fs.readFile(KEYSTORE_FILE)
      return Buffer.from(keyData.toString('utf-8'), 'hex')
    } catch {
      // 密钥文件不存在，生成新密钥
      const key = crypto.randomBytes(KEY_LENGTH)
      await fs.writeFile(KEYSTORE_FILE, key.toString('hex'), 'utf-8')
      // 尝试设置文件权限（Windows 可能不支持）
      try {
        await fs.chmod(KEYSTORE_FILE, 0o600)
      } catch {
        // Windows 不支持 chmod，忽略
      }
      return key
    }
  } catch (err) {
    throw new Error(`无法获取加密密钥: ${err.message}`)
  }
}

/**
 * 加密密码
 * @param {string} plaintext - 明文密码
 * @returns {Promise<string>} 格式: iv:authTag:ciphertext (Base64)
 */
async function encryptPassword(plaintext) {
  if (!plaintext) return ''
  const key = await getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(plaintext, 'utf-8', 'base64')
  encrypted += cipher.final('base64')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
}

/**
 * 解密密码
 * @param {string} encrypted - 加密后的字符串 iv:authTag:ciphertext
 * @returns {Promise<string>} 明文密码
 */
async function decryptPassword(encrypted) {
  if (!encrypted) return ''
  const key = await getEncryptionKey()
  const parts = encrypted.split(':')
  if (parts.length !== 3) throw new Error('加密数据格式错误')

  const iv = Buffer.from(parts[0], 'base64')
  const authTag = Buffer.from(parts[1], 'base64')
  const ciphertext = parts[2]

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  let decrypted = decipher.update(ciphertext, 'base64', 'utf-8')
  decrypted += decipher.final('utf-8')
  return decrypted
}

/**
 * 加载实例列表
 * @returns {Promise<Array>}
 */
async function loadInstances() {
  try {
    await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
    const data = await fs.readFile(INSTANCES_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    const instances = parsed.instances || []
    // 确保本地实例始终存在
    if (!instances.find(i => i.id === 'local')) {
      instances.unshift({ ...LOCAL_INSTANCE })
    }
    return instances
  } catch {
    // 文件不存在或解析失败，返回默认列表
    return [{ ...LOCAL_INSTANCE }]
  }
}

/**
 * 保存实例列表
 * @param {Array} instances - 实例列表
 */
async function saveInstances(instances) {
  await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
  const data = JSON.stringify({ instances }, null, 2)
  await fs.writeFile(INSTANCES_FILE, data, 'utf-8')
}

/**
 * 添加远程实例
 * @param {object} config - 实例配置
 * @returns {Promise<object>} 新建的实例对象
 */
async function addInstance(config) {
  const instances = await loadInstances()

  const instance = {
    id: crypto.randomUUID(),
    name: config.name,
    type: 'ssh',
    host: config.host,
    port: config.port || 22,
    username: config.username,
    authType: config.authType || 'password',
  }

  // 加密存储密码
  if (config.authType === 'password' && config.password) {
    instance.encryptedPassword = await encryptPassword(config.password)
  }

  // 存储密钥路径
  if (config.authType === 'key' && config.privateKeyPath) {
    instance.privateKeyPath = config.privateKeyPath
    if (config.passphrase) {
      instance.encryptedPassphrase = await encryptPassword(config.passphrase)
    }
  }

  instances.push(instance)
  await saveInstances(instances)
  return instance
}

/**
 * 更新实例
 * @param {string} id - 实例 ID
 * @param {object} updates - 要更新的字段
 */
async function updateInstance(id, updates) {
  if (id === 'local') throw new Error('不能修改本地实例')
  const instances = await loadInstances()
  const idx = instances.findIndex(i => i.id === id)
  if (idx === -1) throw new Error('实例不存在')

  // 如果更新了密码，重新加密
  if (updates.password !== undefined) {
    updates.encryptedPassword = await encryptPassword(updates.password)
    delete updates.password
  }
  if (updates.passphrase !== undefined) {
    updates.encryptedPassphrase = await encryptPassword(updates.passphrase)
    delete updates.passphrase
  }

  Object.assign(instances[idx], updates)
  await saveInstances(instances)
  return instances[idx]
}

/**
 * 删除实例
 * @param {string} id - 实例 ID
 */
async function deleteInstance(id) {
  if (id === 'local') throw new Error('不能删除本地实例')
  const instances = await loadInstances()
  const filtered = instances.filter(i => i.id !== id)
  await saveInstances(filtered)
}

/**
 * 获取实例的解密连接配置（用于创建 SSH 执行器）
 * @param {object} instance - 实例对象
 * @returns {Promise<object>} 解密后的连接配置
 */
async function getDecryptedConfig(instance) {
  const config = {
    host: instance.host,
    port: instance.port || 22,
    username: instance.username,
    authType: instance.authType || 'password',
  }

  if (instance.authType === 'password' && instance.encryptedPassword) {
    config.password = await decryptPassword(instance.encryptedPassword)
  }

  if (instance.authType === 'key') {
    config.privateKeyPath = instance.privateKeyPath
    if (instance.encryptedPassphrase) {
      config.passphrase = await decryptPassword(instance.encryptedPassphrase)
    }
  }

  return config
}

/**
 * 测试 SSH 连接
 * @param {object} config - 连接配置（明文密码）
 * @returns {Promise<{success: boolean, message: string, info?: object}>}
 */
async function testConnection(config) {
  const executor = new SshExecutor(config)
  try {
    await executor.connect()

    // 获取系统信息
    const [unameResult, nodeResult, openclawResult] = await Promise.all([
      executor.exec('uname -a').catch(() => ({ stdout: '', exitCode: 1 })),
      executor.exec('node --version').catch(() => ({ stdout: '', exitCode: 1 })),
      executor.exec('openclaw --version').catch(() => ({ stdout: '', exitCode: 1 })),
    ])

    return {
      success: true,
      message: '连接成功',
      info: {
        system: unameResult.stdout.trim(),
        nodeVersion: nodeResult.exitCode === 0 ? nodeResult.stdout.trim() : null,
        openclawVersion: openclawResult.exitCode === 0 ? openclawResult.stdout.trim() : null,
      },
    }
  } catch (err) {
    return {
      success: false,
      message: `连接失败: ${err.message}`,
      info: null,
    }
  } finally {
    await executor.dispose()
  }
}

module.exports = {
  loadInstances,
  saveInstances,
  addInstance,
  updateInstance,
  deleteInstance,
  getDecryptedConfig,
  testConnection,
  encryptPassword,
  decryptPassword,
  LOCAL_INSTANCE,
}
