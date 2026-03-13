/**
 * 全局代理管理器
 * 管理 HTTP/HTTPS/SOCKS5 代理配置，为 child_process 和 HTTP 请求提供代理支持
 * 配置存储在 ~/.claw-tool/settings.json
 */

const fs = require('fs').promises
const path = require('path')
const os = require('os')
const http = require('http')
const https = require('https')
const { URL } = require('url')

// 配置文件路径
const SETTINGS_DIR = path.join(os.homedir(), '.claw-tool')
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json')

// 默认代理配置
const DEFAULT_PROXY_CONFIG = {
  // 代理类型: 'none' | 'http' | 'https' | 'socks5'
  type: 'none',
  // 代理地址
  host: '',
  // 代理端口
  port: '',
  // 用户名（可选）
  username: '',
  // 密码（可选）
  password: '',
  // 不走代理的地址白名单，逗号分隔
  noProxy: 'localhost,127.0.0.1',
}

// 当前代理配置（内存缓存）
let currentConfig = { ...DEFAULT_PROXY_CONFIG }

/**
 * 加载代理配置
 * @returns {Promise<object>} 代理配置
 */
async function loadProxyConfig() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true })
    const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const settings = JSON.parse(data)
    if (settings.proxy) {
      currentConfig = { ...DEFAULT_PROXY_CONFIG, ...settings.proxy }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.warn('[代理管理器] 加载配置失败:', err.message)
    }
    // 文件不存在时使用默认配置
    currentConfig = { ...DEFAULT_PROXY_CONFIG }
  }
  return { ...currentConfig }
}

/**
 * 保存代理配置
 * @param {object} config - 代理配置
 */
async function saveProxyConfig(config) {
  currentConfig = { ...DEFAULT_PROXY_CONFIG, ...config }

  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true })

    // 读取现有配置文件，合并代理配置
    let settings = {}
    try {
      const data = await fs.readFile(SETTINGS_FILE, 'utf-8')
      settings = JSON.parse(data)
    } catch {
      // 文件不存在，使用空对象
    }

    settings.proxy = { ...currentConfig }
    await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    console.log('[代理管理器] 配置已保存')
  } catch (err) {
    console.error('[代理管理器] 保存配置失败:', err.message)
    throw err
  }
}

/**
 * 获取当前代理配置
 * @returns {object} 代理配置
 */
function getProxyConfig() {
  return { ...currentConfig }
}

/**
 * 构建代理 URL 字符串
 * @param {object} [config] - 代理配置，默认使用当前配置
 * @returns {string|null} 代理 URL 或 null（无代理）
 */
function buildProxyUrl(config) {
  const cfg = config || currentConfig
  if (!cfg || cfg.type === 'none' || !cfg.host || !cfg.port) {
    return null
  }

  const protocol = cfg.type === 'socks5' ? 'socks5' : cfg.type
  let auth = ''
  if (cfg.username) {
    auth = cfg.password
      ? `${encodeURIComponent(cfg.username)}:${encodeURIComponent(cfg.password)}@`
      : `${encodeURIComponent(cfg.username)}@`
  }

  return `${protocol}://${auth}${cfg.host}:${cfg.port}`
}

/**
 * 获取 child_process 需要的代理环境变量
 * @param {object} [config] - 代理配置
 * @returns {object} 环境变量对象
 */
function getProxyEnv(config) {
  const proxyUrl = buildProxyUrl(config)
  if (!proxyUrl) return {}

  const cfg = config || currentConfig
  const env = {}

  // HTTP/HTTPS 代理设置
  if (cfg.type === 'http' || cfg.type === 'https') {
    env.HTTP_PROXY = proxyUrl
    env.HTTPS_PROXY = proxyUrl
    env.http_proxy = proxyUrl
    env.https_proxy = proxyUrl
  } else if (cfg.type === 'socks5') {
    // SOCKS5 代理也通过这些变量传递（npm 和 curl 支持）
    env.HTTP_PROXY = proxyUrl
    env.HTTPS_PROXY = proxyUrl
    env.http_proxy = proxyUrl
    env.https_proxy = proxyUrl
    // 部分工具使用 ALL_PROXY
    env.ALL_PROXY = proxyUrl
    env.all_proxy = proxyUrl
  }

  // 不走代理的地址
  if (cfg.noProxy) {
    env.NO_PROXY = cfg.noProxy
    env.no_proxy = cfg.noProxy
  }

  return env
}

/**
 * 获取 npm 代理命令参数
 * @returns {string} npm 代理参数字符串
 */
function getNpmProxyArgs() {
  const proxyUrl = buildProxyUrl()
  if (!proxyUrl) return ''
  return `--proxy ${proxyUrl} --https-proxy ${proxyUrl}`
}

/**
 * 测试代理连通性
 * @param {object} [config] - 要测试的代理配置，默认使用当前配置
 * @param {string} [testUrl] - 测试目标 URL
 * @returns {Promise<{success: boolean, latency: number, message: string}>}
 */
async function testProxy(config, testUrl = 'https://registry.npmjs.org/') {
  const cfg = config || currentConfig

  if (cfg.type === 'none') {
    return { success: true, latency: 0, message: '未配置代理，直连模式' }
  }

  if (!cfg.host || !cfg.port) {
    return { success: false, latency: 0, message: '代理地址或端口为空' }
  }

  const proxyUrl = buildProxyUrl(cfg)
  const startTime = Date.now()

  try {
    // 使用 HTTP CONNECT 方法测试代理
    const result = await testProxyConnect(proxyUrl, testUrl, cfg)
    const latency = Date.now() - startTime
    return {
      success: true,
      latency,
      message: `代理连接成功 (${latency}ms)`,
    }
  } catch (err) {
    const latency = Date.now() - startTime
    return {
      success: false,
      latency,
      message: `代理连接失败: ${err.message}`,
    }
  }
}

/**
 * 通过 HTTP 代理测试连通性
 */
function testProxyConnect(proxyUrl, targetUrl, config) {
  return new Promise((resolve, reject) => {
    const target = new URL(targetUrl)
    const proxy = new URL(proxyUrl.replace('socks5://', 'http://'))

    const options = {
      host: proxy.hostname,
      port: parseInt(proxy.port),
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || (target.protocol === 'https:' ? 443 : 80)}`,
      timeout: 10000,
    }

    // 代理认证
    if (config.username) {
      const auth = Buffer.from(`${config.username}:${config.password || ''}`).toString('base64')
      options.headers = {
        'Proxy-Authorization': `Basic ${auth}`,
      }
    }

    const req = http.request(options)

    req.on('connect', (res) => {
      if (res.statusCode === 200) {
        resolve({ statusCode: 200 })
      } else {
        reject(new Error(`代理返回状态码 ${res.statusCode}`))
      }
      // 关闭连接
      req.destroy()
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('连接超时 (10s)'))
    })

    req.on('error', (err) => {
      reject(new Error(`连接失败: ${err.message}`))
    })

    req.end()
  })
}

module.exports = {
  loadProxyConfig,
  saveProxyConfig,
  getProxyConfig,
  getProxyEnv,
  buildProxyUrl,
  getNpmProxyArgs,
  testProxy,
  DEFAULT_PROXY_CONFIG,
}
