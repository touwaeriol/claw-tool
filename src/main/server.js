/**
 * 内嵌 Express HTTP 服务
 * 提供 REST API、SSE 日志推送、静态文件服务
 * 使用 Token 认证（URL 参数或 Bearer 头）
 */

const express = require('express')
const http = require('http')
const path = require('path')
const fs = require('fs').promises
const os = require('os')
const crypto = require('crypto')
const { eventBus, Events } = require('../shared/ipc')
const { processManager } = require('./process-manager')
const { localExecutor } = require('../executor/executor-factory')

let app = null
let httpServer = null

const DEFAULT_PORT = 5678
const DEFAULT_HOST = '0.0.0.0'

// Token 配置文件路径
const CLAW_TOOL_DIR = path.join(os.homedir(), '.claw-tool')
const SERVER_CONFIG_FILE = path.join(CLAW_TOOL_DIR, 'server.json')

// 运行时 Token 配置
let serverConfig = {
  token: '',
  port: DEFAULT_PORT,
  enabled: true,
}

/**
 * 生成随机 Token（32 字节 hex）
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * 加载或初始化 Token 配置
 * 首次启动自动生成随机 Token
 */
async function loadServerConfig() {
  try {
    await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
    const data = await fs.readFile(SERVER_CONFIG_FILE, 'utf-8')
    const parsed = JSON.parse(data)
    serverConfig.token = parsed.token || generateToken()
    serverConfig.enabled = parsed.enabled !== false
  } catch {
    // 文件不存在，生成新 Token
    serverConfig.token = generateToken()
    serverConfig.enabled = true
    await saveServerConfig()
  }
  return serverConfig
}

/**
 * 保存 Token 配置到文件
 */
async function saveServerConfig() {
  await fs.mkdir(CLAW_TOOL_DIR, { recursive: true })
  await fs.writeFile(
    SERVER_CONFIG_FILE,
    JSON.stringify({ token: serverConfig.token, enabled: serverConfig.enabled }, null, 2),
    'utf-8',
  )
}

/**
 * 获取当前 Token
 */
function getToken() {
  return serverConfig.token
}

/**
 * 设置新 Token
 * @param {string} newToken - 新 Token，为空则自动生成
 * @returns {string} 设置后的 Token
 */
async function setToken(newToken) {
  serverConfig.token = newToken || generateToken()
  await saveServerConfig()
  return serverConfig.token
}

/**
 * 重新生成 Token
 * @returns {string} 新 Token
 */
async function regenerateToken() {
  serverConfig.token = generateToken()
  await saveServerConfig()
  return serverConfig.token
}

/**
 * Token 认证中间件
 * 支持两种方式：
 * 1. URL 参数: ?token=xxx
 * 2. Authorization 头: Bearer xxx
 */
function tokenAuth(req, res, next) {
  if (!serverConfig.enabled || !serverConfig.token) {
    return next()
  }

  // 从 URL 参数获取 Token
  const urlToken = req.query.token

  // 从 Authorization 头获取 Token
  let bearerToken = null
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.slice(7)
  }

  const providedToken = urlToken || bearerToken

  if (!providedToken) {
    return res.status(401).json({
      ok: false,
      error: '需要认证，请在 URL 参数中添加 ?token=xxx 或使用 Authorization: Bearer xxx 头',
    })
  }

  // 使用 timingSafeEqual 防止时序攻击
  try {
    const expected = Buffer.from(serverConfig.token, 'utf-8')
    const provided = Buffer.from(providedToken, 'utf-8')
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return res.status(401).json({ ok: false, error: 'Token 无效' })
    }
  } catch {
    return res.status(401).json({ ok: false, error: 'Token 无效' })
  }

  next()
}

/**
 * 创建 Express 应用实例（不启动监听）
 */
function createServer() {
  app = express()

  // 中间件
  app.use(express.json())

  // CORS（允许本地开发访问）
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  // 静态文件服务（放在认证之前，允许无 Token 访问 UI 资源）
  const distPath = path.resolve(__dirname, '../../dist')
  app.use(express.static(distPath))

  // Token 认证（仅 API 路由需要）
  app.use('/api', tokenAuth)

  // ========== REST API ==========

  // 状态接口
  app.get('/api/status', async (req, res) => {
    try {
      const status = processManager.status
      const result = await localExecutor.exec('openclaw daemon status', { timeout: 5000 })
      res.json({
        ok: true,
        gateway: {
          running: status.running,
          pid: status.pid,
          uptime: status.uptime,
        },
        daemon: {
          output: result.stdout.trim(),
        },
      })
    } catch (err) {
      res.json({
        ok: true,
        gateway: processManager.status,
        error: err.message,
      })
    }
  })

  // 配置摘要接口（脱敏）
  app.get('/api/config/summary', async (req, res) => {
    try {
      const JSON5 = require('json5')
      const configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json')
      const content = await fs.readFile(configPath, 'utf-8')
      const config = JSON5.parse(content)

      // 脱敏处理：隐藏 API Key 等敏感信息
      const summary = {
        providers: [],
        channels: [],
        gateway: {},
      }

      if (config.providers) {
        summary.providers = Object.keys(config.providers).map((name) => ({
          name,
          enabled: config.providers[name].enabled !== false,
        }))
      }

      if (config.channels) {
        summary.channels = Object.keys(config.channels).map((name) => ({
          name,
          enabled: config.channels[name].enabled !== false,
        }))
      }

      if (config.gateway) {
        summary.gateway = {
          port: config.gateway.port,
          bind: config.gateway.bind,
        }
      }

      res.json({ ok: true, summary })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  // 服务控制接口
  app.post('/api/service/start', async (req, res) => {
    try {
      const result = await localExecutor.exec('openclaw daemon start')
      await processManager.refreshStatus(localExecutor)
      res.json({ ok: result.exitCode === 0, output: result.stdout + result.stderr })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  app.post('/api/service/stop', async (req, res) => {
    try {
      await processManager.stop(localExecutor)
      res.json({ ok: true })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  app.post('/api/service/restart', async (req, res) => {
    try {
      const result = await localExecutor.exec('openclaw daemon restart')
      await processManager.refreshStatus(localExecutor)
      res.json({ ok: result.exitCode === 0, output: result.stdout + result.stderr })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  // 日志接口（获取最近日志）
  app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 100
    const buffer = processManager.getLogBuffer()
    const logs = buffer.slice(-limit)
    res.json({ ok: true, logs, total: buffer.length })
  })

  // 测试消息接口
  app.post('/api/test', async (req, res) => {
    try {
      const { message, model, stream } = req.body
      if (!message) {
        return res.status(400).json({ ok: false, error: '缺少 message 参数' })
      }

      const startTime = Date.now()

      // 通过 Gateway 发送测试请求
      const gatewayPort = 18789
      const fetch = globalThis.fetch || require('node-fetch')
      const response = await fetch(`http://127.0.0.1:${gatewayPort}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model || 'default',
          messages: [{ role: 'user', content: message }],
          stream: stream || false,
        }),
      })

      const data = await response.json()
      const latencyMs = Date.now() - startTime

      res.json({
        ok: true,
        reply: data.choices?.[0]?.message?.content || '',
        usage: data.usage || {},
        latencyMs,
      })
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  // SSE 日志推送端点
  app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    // 发送已有日志缓冲
    const buffer = processManager.getLogBuffer()
    for (const entry of buffer.slice(-50)) {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }

    // 监听新日志事件
    const onLog = (entry) => {
      res.write(`data: ${JSON.stringify(entry)}\n\n`)
    }
    eventBus.on(Events.LOG_ENTRY, onLog)

    // 监听状态变化事件
    const onStatus = (status) => {
      res.write(`event: status\ndata: ${JSON.stringify(status)}\n\n`)
    }
    eventBus.on(Events.SERVICE_STATUS_CHANGED, onStatus)

    // 客户端断开时清理
    req.on('close', () => {
      eventBus.off(Events.LOG_ENTRY, onLog)
      eventBus.off(Events.SERVICE_STATUS_CHANGED, onStatus)
    })
  })

  // SPA fallback：未匹配的路由返回 index.html（静态文件已在认证前提供）
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      const distPath = path.resolve(__dirname, '../../dist')
      res.sendFile(path.join(distPath, 'index.html'))
    } else {
      res.status(404).json({ ok: false, error: '接口不存在' })
    }
  })

  console.log('[HTTP服务] Express 应用已创建，等待启用')
  return app
}

/**
 * 启动 HTTP 监听
 * @param {number} [port] - 端口号
 * @param {string} [host] - 绑定地址
 */
async function startServer(port = DEFAULT_PORT, host = DEFAULT_HOST) {
  // 加载 Token 配置
  await loadServerConfig()

  if (!app) createServer()

  return new Promise((resolve, reject) => {
    httpServer = http.createServer(app)
    httpServer.listen(port, host, () => {
      console.log(`[HTTP服务] 已启动，监听 ${host}:${port}`)
      console.log(`[HTTP服务] Token: ${serverConfig.token.slice(0, 8)}...`)
      resolve(httpServer)
    })
    httpServer.on('error', reject)
  })
}

/**
 * 停止 HTTP 监听
 */
function stopServer() {
  return new Promise((resolve) => {
    if (httpServer) {
      httpServer.close(() => {
        console.log('[HTTP服务] 已停止')
        httpServer = null
        resolve()
      })
    } else {
      resolve()
    }
  })
}

/**
 * 获取服务器状态
 */
function getServerStatus() {
  return {
    running: httpServer !== null,
    port: httpServer?.address()?.port || null,
    host: httpServer?.address()?.address || null,
    token: serverConfig.token,
    authEnabled: serverConfig.enabled,
  }
}

module.exports = {
  createServer,
  startServer,
  stopServer,
  getServerStatus,
  getToken,
  setToken,
  regenerateToken,
  loadServerConfig,
}
