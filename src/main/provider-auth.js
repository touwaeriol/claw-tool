/**
 * provider-auth.js — OAuth 认证流程模块
 *
 * 实现以下认证流程：
 * 1. GitHub Copilot Device Flow
 * 2. OpenAI Codex PKCE OAuth Flow
 * 3. Google Gemini CLI PKCE OAuth Flow
 * 4. Token 存储（~/.openclaw/agents/default/agent/auth-profiles.json）
 *
 * CommonJS 格式，供 NW.js 主进程使用。
 */

const crypto = require('crypto')
const http = require('http')
const path = require('path')
const fs = require('fs')
const os = require('os')

// ---------------------------------------------------------------------------
// .env 加载（NW.js 主进程没有 dotenv，手动解析）
// ---------------------------------------------------------------------------

function loadEnvFile() {
  try {
    // 尝试从项目根目录和 nw.App.dataPath 加载 .env
    const candidates = [
      path.join(process.cwd(), '.env'),
      path.join(__dirname, '..', '..', '.env'),
    ]
    for (const envPath of candidates) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8')
        for (const line of content.split('\n')) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith('#')) continue
          const eqIdx = trimmed.indexOf('=')
          if (eqIdx === -1) continue
          const key = trimmed.slice(0, eqIdx).trim()
          const val = trimmed.slice(eqIdx + 1).trim()
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
        break
      }
    }
  } catch { /* .env 不存在也不影响运行 */ }
}
loadEnvFile()

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const AUTH_PROFILE_FILENAME = 'auth-profiles.json'

// GitHub Copilot Device Flow 常量
const GH_CLIENT_ID = process.env.GH_CLIENT_ID || ''
const GH_DEVICE_CODE_URL = 'https://github.com/login/device/code'
const GH_ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'

// OpenAI Codex PKCE OAuth 常量
const OPENAI_CLIENT_ID = process.env.OPENAI_CLIENT_ID || ''
const OPENAI_AUTHORIZE_URL = 'https://auth.openai.com/oauth/authorize'
const OPENAI_TOKEN_URL = 'https://auth.openai.com/oauth/token'
const OPENAI_REDIRECT_URI = 'http://localhost:1455/auth/callback'
const OPENAI_SCOPE = 'openid profile email offline_access'
const OPENAI_JWT_CLAIM_PATH = 'https://api.openai.com/auth'

// Google Gemini CLI PKCE OAuth 常量
const GEMINI_CLIENT_ID = process.env.GEMINI_CLIENT_ID_B64
  ? Buffer.from(process.env.GEMINI_CLIENT_ID_B64, 'base64').toString('utf-8')
  : ''
const GEMINI_CLIENT_SECRET = process.env.GEMINI_CLIENT_SECRET_B64
  ? Buffer.from(process.env.GEMINI_CLIENT_SECRET_B64, 'base64').toString('utf-8')
  : ''
const GEMINI_REDIRECT_URI = 'http://localhost:8085/oauth2callback'
const GEMINI_SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]
const GEMINI_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GEMINI_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GEMINI_CODE_ASSIST_ENDPOINT = 'https://cloudcode-pa.googleapis.com'

// 成功页面 HTML
const SUCCESS_HTML = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Authentication successful</title></head>
<body><p>Authentication successful. You can close this window and return to the application.</p></body>
</html>`

// ---------------------------------------------------------------------------
// PKCE 工具
// ---------------------------------------------------------------------------

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url')
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

// ---------------------------------------------------------------------------
// Auth Profiles 存储路径
// ---------------------------------------------------------------------------

function resolveAuthStorePath() {
  const homeDir = os.homedir()
  // 遵循 OpenClaw 的目录结构：~/.openclaw/agents/main/agent/auth-profiles.json
  return path.join(homeDir, '.openclaw', 'agents', 'main', 'agent', AUTH_PROFILE_FILENAME)
}

function ensureParentDir(filePath) {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

// ---------------------------------------------------------------------------
// Auth Profiles CRUD
// ---------------------------------------------------------------------------

/**
 * 加载 auth-profiles.json
 * @returns {{ version: number, profiles: Record<string, object>, order?: object, lastGood?: object, usageStats?: object }}
 */
function loadAuthProfiles() {
  const storePath = resolveAuthStorePath()
  try {
    if (!fs.existsSync(storePath)) {
      return { version: 1, profiles: {} }
    }
    const content = fs.readFileSync(storePath, 'utf-8')
    const data = JSON.parse(content)
    if (!data || typeof data !== 'object') {
      return { version: 1, profiles: {} }
    }
    return {
      version: data.version || 1,
      profiles: data.profiles && typeof data.profiles === 'object' ? data.profiles : {},
      order: data.order,
      lastGood: data.lastGood,
      usageStats: data.usageStats,
    }
  } catch (err) {
    console.warn('[provider-auth] loadAuthProfiles failed:', err.message)
    return { version: 1, profiles: {} }
  }
}

/**
 * 保存/更新一个 auth profile
 * @param {string} profileId — 例如 "github-copilot:github"
 * @param {object} credential — { type, provider, token, ... }
 */
function saveAuthProfile(profileId, credential) {
  const storePath = resolveAuthStorePath()
  ensureParentDir(storePath)
  const store = loadAuthProfiles()
  store.profiles[profileId] = credential
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8')
}

/**
 * 获取特定 profile
 * @param {string} profileId
 * @returns {object|null}
 */
function getAuthProfile(profileId) {
  const store = loadAuthProfiles()
  return store.profiles[profileId] || null
}

/**
 * 移除一个 profile
 * @param {string} profileId
 */
function removeAuthProfile(profileId) {
  const storePath = resolveAuthStorePath()
  const store = loadAuthProfiles()
  if (profileId in store.profiles) {
    delete store.profiles[profileId]
    ensureParentDir(storePath)
    fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8')
  }
}

/**
 * 检查某个 provider 是否已认证
 * @param {string} providerId — 例如 "github-copilot", "openai-codex", "google-gemini-cli"
 * @returns {{ authenticated: boolean, profileIds: string[], profiles: object[] }}
 */
function getAuthStatus(providerId) {
  const store = loadAuthProfiles()
  const normalizedProvider = providerId.toLowerCase().replace(/[\s_]+/g, '-')
  const matched = Object.entries(store.profiles).filter(([, cred]) => {
    const credProvider = (cred.provider || '').toLowerCase().replace(/[\s_]+/g, '-')
    return credProvider === normalizedProvider
  })
  return {
    authenticated: matched.length > 0,
    profileIds: matched.map(([id]) => id),
    profiles: matched.map(([, cred]) => cred),
  }
}

// ---------------------------------------------------------------------------
// GitHub Copilot — Device Flow
// ---------------------------------------------------------------------------

/**
 * 发起 GitHub Copilot Device Flow 认证
 * @returns {Promise<{ userCode: string, verificationUri: string, deviceCode: string, expiresIn: number, interval: number, promise: Promise<string> }>}
 */
async function startGitHubCopilotAuth() {
  // Step 1: 请求 device code
  const body = new URLSearchParams({
    client_id: GH_CLIENT_ID,
    scope: 'read:user',
  })

  const res = await fetch(GH_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    throw new Error(`GitHub device code request failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  if (!json.device_code || !json.user_code || !json.verification_uri) {
    throw new Error('GitHub device code response missing required fields')
  }

  const deviceCode = json.device_code
  const userCode = json.user_code
  const verificationUri = json.verification_uri
  const expiresIn = json.expires_in || 900
  const interval = json.interval || 5

  // Step 2: 返回包含轮询 promise 的结果
  const expiresAt = Date.now() + expiresIn * 1000
  const intervalMs = Math.max(1000, interval * 1000)

  let _cancelled = false
  const cancel = () => { _cancelled = true }

  const promise = (async () => {
    const bodyBase = new URLSearchParams({
      client_id: GH_CLIENT_ID,
      device_code: deviceCode,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
    })

    while (Date.now() < expiresAt && !_cancelled) {
      const tokenRes = await fetch(GH_ACCESS_TOKEN_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyBase,
      })

      if (!tokenRes.ok) {
        throw new Error(`GitHub token poll failed: HTTP ${tokenRes.status}`)
      }

      const tokenJson = await tokenRes.json()

      if ('access_token' in tokenJson && typeof tokenJson.access_token === 'string') {
        // 自动保存到 auth profiles
        const profileId = 'github-copilot:github'
        saveAuthProfile(profileId, {
          type: 'token',
          provider: 'github-copilot',
          token: tokenJson.access_token,
        })
        return tokenJson.access_token
      }

      const err = tokenJson.error || 'unknown'

      if (err === 'authorization_pending') {
        await new Promise((r) => setTimeout(r, intervalMs))
        continue
      }
      if (err === 'slow_down') {
        await new Promise((r) => setTimeout(r, intervalMs + 2000))
        continue
      }
      if (err === 'expired_token') {
        throw new Error('GitHub device code expired; please run login again')
      }
      if (err === 'access_denied') {
        throw new Error('GitHub login was cancelled by the user')
      }
      throw new Error(`GitHub device flow error: ${err}`)
    }

    if (_cancelled) throw new Error('GitHub device flow cancelled')
    throw new Error('GitHub device code expired; please run login again')
  })()

  return {
    userCode,
    verificationUri,
    deviceCode,
    expiresIn,
    interval,
    cancel,
    promise,
  }
}

// ---------------------------------------------------------------------------
// OpenAI Codex — PKCE OAuth Flow
// ---------------------------------------------------------------------------

function _decodeJwt(token) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
    return JSON.parse(payload)
  } catch {
    return null
  }
}

function _parseAuthorizationInput(input) {
  const value = (input || '').trim()
  if (!value) return {}
  try {
    const url = new URL(value)
    return {
      code: url.searchParams.get('code') || undefined,
      state: url.searchParams.get('state') || undefined,
    }
  } catch { /* not a URL */ }
  if (value.includes('code=')) {
    const params = new URLSearchParams(value)
    return {
      code: params.get('code') || undefined,
      state: params.get('state') || undefined,
    }
  }
  return { code: value }
}

/**
 * 创建本地 OAuth 回调服务器
 * @param {number} port
 * @param {string} callbackPath — e.g. "/auth/callback"
 * @param {string} expectedState
 * @returns {Promise<{ server: http.Server, port: number, waitForCode: () => Promise<{code:string}|null>, cancelWait: () => void, close: () => void }>}
 */
function _startCallbackServer(port, callbackPath, expectedState) {
  return new Promise((resolve) => {
    let lastCode = null
    let cancelled = false

    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url || '', `http://localhost:${port}`)
        if (url.pathname !== callbackPath) {
          res.statusCode = 404
          res.end('Not found')
          return
        }
        if (expectedState && url.searchParams.get('state') !== expectedState) {
          res.statusCode = 400
          res.end('State mismatch')
          return
        }
        const code = url.searchParams.get('code')
        if (!code) {
          res.statusCode = 400
          res.end('Missing authorization code')
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(SUCCESS_HTML)
        lastCode = code
      } catch {
        res.statusCode = 500
        res.end('Internal error')
      }
    })

    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        port,
        close: () => { try { server.close() } catch {} },
        cancelWait: () => { cancelled = true },
        waitForCode: async () => {
          for (let i = 0; i < 1200; i++) { // 最多等 2 分钟
            if (lastCode) return { code: lastCode }
            if (cancelled) return null
            await new Promise((r) => setTimeout(r, 100))
          }
          return null
        },
      })
    })

    server.on('error', (err) => {
      console.warn(`[provider-auth] Failed to bind port ${port}:`, err.code)
      resolve({
        server,
        port,
        close: () => { try { server.close() } catch {} },
        cancelWait: () => {},
        waitForCode: async () => null,
      })
    })
  })
}

/**
 * 发起 OpenAI Codex PKCE OAuth 认证
 * @returns {Promise<{ authUrl: string, state: string, promise: Promise<object>, cancel: () => void }>}
 */
async function startOpenAICodexAuth() {
  const { verifier, challenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('hex')

  // 构造授权 URL
  const url = new URL(OPENAI_AUTHORIZE_URL)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', OPENAI_CLIENT_ID)
  url.searchParams.set('redirect_uri', OPENAI_REDIRECT_URI)
  url.searchParams.set('scope', OPENAI_SCOPE)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)
  url.searchParams.set('id_token_add_organizations', 'true')
  url.searchParams.set('codex_cli_simplified_flow', 'true')

  // 启动本地回调服务器
  const callbackServer = await _startCallbackServer(1455, '/auth/callback', state)

  let _cancelled = false
  const cancel = () => {
    _cancelled = true
    callbackServer.cancelWait()
    callbackServer.close()
  }

  const promise = (async () => {
    try {
      // 等待浏览器回调
      const result = await callbackServer.waitForCode()

      let code
      if (result?.code) {
        code = result.code
      }

      if (!code) {
        throw new Error('No authorization code received. You can paste the redirect URL manually.')
      }

      // 用 authorization code 换取 token
      const tokenRes = await fetch(OPENAI_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: OPENAI_CLIENT_ID,
          code,
          code_verifier: verifier,
          redirect_uri: OPENAI_REDIRECT_URI,
        }),
      })

      if (!tokenRes.ok) {
        const text = await tokenRes.text().catch(() => '')
        throw new Error(`OpenAI token exchange failed: HTTP ${tokenRes.status} ${text}`)
      }

      const tokenJson = await tokenRes.json()
      if (!tokenJson.access_token || !tokenJson.refresh_token || typeof tokenJson.expires_in !== 'number') {
        throw new Error('OpenAI token response missing required fields')
      }

      // 从 JWT 提取 accountId
      const payload = _decodeJwt(tokenJson.access_token)
      const auth = payload?.[OPENAI_JWT_CLAIM_PATH]
      const accountId = auth?.chatgpt_account_id
      if (!accountId) {
        throw new Error('Failed to extract accountId from OpenAI token')
      }

      const credential = {
        type: 'oauth',
        provider: 'openai-codex',
        access: tokenJson.access_token,
        refresh: tokenJson.refresh_token,
        expires: Date.now() + tokenJson.expires_in * 1000,
        accountId,
      }

      // 自动保存
      const profileId = 'openai-codex:default'
      saveAuthProfile(profileId, credential)

      return credential
    } finally {
      callbackServer.close()
    }
  })()

  return {
    authUrl: url.toString(),
    state,
    cancel,
    promise,
  }
}

/**
 * 使用手动粘贴的重定向 URL 完成 OpenAI OAuth
 * @param {string} input — redirect URL or code
 * @param {string} verifier — PKCE verifier (来自 startOpenAICodexAuth 时保存)
 * @param {string} expectedState
 */
async function completeOpenAICodexWithManualInput(input, verifier, expectedState) {
  const parsed = _parseAuthorizationInput(input)
  if (parsed.state && parsed.state !== expectedState) {
    throw new Error('State mismatch')
  }
  const code = parsed.code
  if (!code) throw new Error('Missing authorization code')

  const tokenRes = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OPENAI_CLIENT_ID,
      code,
      code_verifier: verifier,
      redirect_uri: OPENAI_REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    const text = await tokenRes.text().catch(() => '')
    throw new Error(`OpenAI token exchange failed: HTTP ${tokenRes.status} ${text}`)
  }

  const tokenJson = await tokenRes.json()
  if (!tokenJson.access_token || !tokenJson.refresh_token) {
    throw new Error('OpenAI token response missing required fields')
  }

  const payload = _decodeJwt(tokenJson.access_token)
  const accountId = payload?.[OPENAI_JWT_CLAIM_PATH]?.chatgpt_account_id

  const credential = {
    type: 'oauth',
    provider: 'openai-codex',
    access: tokenJson.access_token,
    refresh: tokenJson.refresh_token,
    expires: Date.now() + (tokenJson.expires_in || 3600) * 1000,
    accountId: accountId || undefined,
  }

  saveAuthProfile('openai-codex:codex-cli', credential)
  return credential
}

/**
 * 刷新 OpenAI Codex token
 * @param {string} refreshToken
 */
async function refreshOpenAICodexToken(refreshToken) {
  const res = await fetch(OPENAI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: OPENAI_CLIENT_ID,
    }),
  })

  if (!res.ok) {
    throw new Error(`OpenAI token refresh failed: HTTP ${res.status}`)
  }

  const json = await res.json()
  if (!json.access_token || !json.refresh_token) {
    throw new Error('OpenAI token refresh response missing fields')
  }

  const payload = _decodeJwt(json.access_token)
  const accountId = payload?.[OPENAI_JWT_CLAIM_PATH]?.chatgpt_account_id

  const credential = {
    type: 'oauth',
    provider: 'openai-codex',
    access: json.access_token,
    refresh: json.refresh_token,
    expires: Date.now() + (json.expires_in || 3600) * 1000,
    accountId: accountId || undefined,
  }

  saveAuthProfile('openai-codex:codex-cli', credential)
  return credential
}

// ---------------------------------------------------------------------------
// Google Gemini CLI — PKCE OAuth Flow
// ---------------------------------------------------------------------------

/**
 * 发起 Google Gemini CLI PKCE OAuth 认证
 * @returns {Promise<{ authUrl: string, promise: Promise<object>, cancel: () => void }>}
 */
async function startGeminiCliAuth() {
  const { verifier, challenge } = generatePKCE()

  // 构造授权 URL
  const authParams = new URLSearchParams({
    client_id: GEMINI_CLIENT_ID,
    response_type: 'code',
    redirect_uri: GEMINI_REDIRECT_URI,
    scope: GEMINI_SCOPES.join(' '),
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: verifier, // Gemini CLI 用 verifier 作为 state
    access_type: 'offline',
    prompt: 'consent',
  })
  const authUrl = `${GEMINI_AUTH_URL}?${authParams.toString()}`

  // 启动本地回调服务器
  const callbackServer = await _startCallbackServer(8085, '/oauth2callback', verifier)

  let _cancelled = false
  const cancel = () => {
    _cancelled = true
    callbackServer.cancelWait()
    callbackServer.close()
  }

  const promise = (async () => {
    try {
      const result = await callbackServer.waitForCode()

      let code
      if (result?.code) {
        code = result.code
      }

      if (!code) {
        throw new Error('No authorization code received from Google')
      }

      // 用 code 换取 tokens
      const tokenRes = await fetch(GEMINI_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GEMINI_CLIENT_ID,
          client_secret: GEMINI_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: GEMINI_REDIRECT_URI,
          code_verifier: verifier,
        }),
      })

      if (!tokenRes.ok) {
        const error = await tokenRes.text()
        throw new Error(`Google token exchange failed: ${error}`)
      }

      const tokenData = await tokenRes.json()
      if (!tokenData.refresh_token) {
        throw new Error('No refresh token received from Google. Please try again.')
      }

      // 获取用户邮箱
      let email
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json()
          email = userInfo.email
        }
      } catch { /* email is optional */ }

      // 发现/配置 Cloud Code Assist 项目
      let projectId
      try {
        projectId = await _discoverGeminiProject(tokenData.access_token)
      } catch (err) {
        console.warn('[provider-auth] Gemini project discovery failed:', err.message)
        // projectId 不是必须的，可以先不设置
      }

      const expiresAt = Date.now() + tokenData.expires_in * 1000 - 5 * 60 * 1000

      const credential = {
        type: 'oauth',
        provider: 'google-gemini-cli',
        access: tokenData.access_token,
        refresh: tokenData.refresh_token,
        expires: expiresAt,
        projectId,
        email,
      }

      // 自动保存
      const profileId = `google-gemini-cli:${email || 'default'}`
      saveAuthProfile(profileId, credential)

      return credential
    } finally {
      callbackServer.close()
    }
  })()

  return {
    authUrl,
    cancel,
    promise,
  }
}

/**
 * 发现或配置 Google Cloud Code Assist 项目
 */
async function _discoverGeminiProject(accessToken) {
  const envProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': 'google-api-nodejs-client/9.15.1',
    'X-Goog-Api-Client': 'gl-node/22.17.0',
  }

  const loadRes = await fetch(`${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:loadCodeAssist`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      cloudaicompanionProject: envProjectId,
      metadata: {
        ideType: 'IDE_UNSPECIFIED',
        platform: 'PLATFORM_UNSPECIFIED',
        pluginType: 'GEMINI',
        duetProject: envProjectId,
      },
    }),
  })

  if (!loadRes.ok) {
    if (envProjectId) return envProjectId
    throw new Error(`loadCodeAssist failed: ${loadRes.status}`)
  }

  const data = await loadRes.json()

  if (data.currentTier) {
    if (data.cloudaicompanionProject) return data.cloudaicompanionProject
    if (envProjectId) return envProjectId
    throw new Error('Google Cloud project required. Set GOOGLE_CLOUD_PROJECT env var.')
  }

  // 需要 onboard
  const tierId = data.allowedTiers?.find((t) => t.isDefault)?.id || 'free-tier'

  const onboardBody = {
    tierId,
    metadata: {
      ideType: 'IDE_UNSPECIFIED',
      platform: 'PLATFORM_UNSPECIFIED',
      pluginType: 'GEMINI',
    },
  }

  if (tierId !== 'free-tier' && envProjectId) {
    onboardBody.cloudaicompanionProject = envProjectId
    onboardBody.metadata.duetProject = envProjectId
  }

  const onboardRes = await fetch(`${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal:onboardUser`, {
    method: 'POST',
    headers,
    body: JSON.stringify(onboardBody),
  })

  if (!onboardRes.ok) {
    if (envProjectId) return envProjectId
    throw new Error(`onboardUser failed: ${onboardRes.status}`)
  }

  let lroData = await onboardRes.json()

  // 轮询长时间运行的操作
  if (!lroData.done && lroData.name) {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((r) => setTimeout(r, 5000))
      const pollRes = await fetch(`${GEMINI_CODE_ASSIST_ENDPOINT}/v1internal/${lroData.name}`, {
        method: 'GET',
        headers,
      })
      if (!pollRes.ok) break
      lroData = await pollRes.json()
      if (lroData.done) break
    }
  }

  const projectId = lroData.response?.cloudaicompanionProject?.id
  if (projectId) return projectId
  if (envProjectId) return envProjectId

  throw new Error('Could not discover or provision a Google Cloud project')
}

/**
 * 刷新 Google Gemini CLI token
 * @param {string} refreshToken
 * @param {string} projectId
 */
async function refreshGeminiCliToken(refreshToken, projectId) {
  const res = await fetch(GEMINI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GEMINI_CLIENT_ID,
      client_secret: GEMINI_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    throw new Error(`Google Cloud token refresh failed: ${error}`)
  }

  const data = await res.json()

  const credential = {
    type: 'oauth',
    provider: 'google-gemini-cli',
    access: data.access_token,
    refresh: data.refresh_token || refreshToken,
    expires: Date.now() + data.expires_in * 1000 - 5 * 60 * 1000,
    projectId,
  }

  // 更新已存储的 profile
  const status = getAuthStatus('google-gemini-cli')
  if (status.profileIds.length > 0) {
    saveAuthProfile(status.profileIds[0], {
      ...status.profiles[0],
      ...credential,
    })
  }

  return credential
}

// ---------------------------------------------------------------------------
// 通用 OAuth PKCE Flow（供其他 provider 扩展使用）
// ---------------------------------------------------------------------------

/**
 * 通用 PKCE OAuth 流程
 * @param {object} config
 * @param {string} config.authorizeUrl — 授权端点
 * @param {string} config.tokenUrl — Token 端点
 * @param {string} config.clientId
 * @param {string} [config.clientSecret]
 * @param {string} config.redirectUri
 * @param {string} config.scope
 * @param {number} [config.port] — 回调服务器端口
 * @param {string} [config.callbackPath] — 回调路径，默认 "/callback"
 * @param {Record<string, string>} [config.extraParams] — 额外的授权参数
 * @returns {Promise<{ authUrl: string, verifier: string, state: string, promise: Promise<object>, cancel: () => void }>}
 */
async function startOAuthPKCE(config) {
  const { verifier, challenge } = generatePKCE()
  const state = crypto.randomBytes(16).toString('hex')

  const callbackPath = config.callbackPath || '/callback'
  const port = config.port || 0

  const url = new URL(config.authorizeUrl)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('code_challenge', challenge)
  url.searchParams.set('code_challenge_method', 'S256')
  url.searchParams.set('state', state)

  if (config.extraParams) {
    for (const [key, value] of Object.entries(config.extraParams)) {
      url.searchParams.set(key, value)
    }
  }

  const callbackServer = await _startCallbackServer(port, callbackPath, state)
  const actualPort = callbackServer.port

  let _cancelled = false
  const cancel = () => {
    _cancelled = true
    callbackServer.cancelWait()
    callbackServer.close()
  }

  const promise = (async () => {
    try {
      const result = await callbackServer.waitForCode()
      if (!result?.code) {
        throw new Error('No authorization code received')
      }

      const tokenBody = {
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code: result.code,
        code_verifier: verifier,
        redirect_uri: config.redirectUri,
      }
      if (config.clientSecret) {
        tokenBody.client_secret = config.clientSecret
      }

      const tokenRes = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenBody),
      })

      if (!tokenRes.ok) {
        const text = await tokenRes.text().catch(() => '')
        throw new Error(`Token exchange failed: HTTP ${tokenRes.status} ${text}`)
      }

      return await tokenRes.json()
    } finally {
      callbackServer.close()
    }
  })()

  return {
    authUrl: url.toString(),
    verifier,
    state,
    port: actualPort,
    cancel,
    promise,
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  // GitHub Copilot
  startGitHubCopilotAuth,

  // OpenAI Codex
  startOpenAICodexAuth,
  completeOpenAICodexWithManualInput,
  refreshOpenAICodexToken,

  // Google Gemini CLI
  startGeminiCliAuth,
  refreshGeminiCliToken,

  // 通用 PKCE
  startOAuthPKCE,

  // Auth Profiles 存储
  loadAuthProfiles,
  saveAuthProfile,
  getAuthProfile,
  removeAuthProfile,
  getAuthStatus,

  // 工具函数
  generatePKCE,
  resolveAuthStorePath,
}
