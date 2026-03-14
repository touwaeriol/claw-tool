/**
 * 应用自动更新模块
 * 从 GitHub Releases 检查 Claw Tool 自身的更新，下载并安装
 */

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { URL } = require('url')
const { eventBus } = require('../shared/ipc')

// GitHub 仓库信息
const GITHUB_OWNER = 'touwaeriol'
const GITHUB_REPO = 'claw-tool'
const GITHUB_API_BASE = 'https://api.github.com'

// 事件名称
const AppUpdateEvents = {
  // 应用有新版本可用
  APP_UPDATE_AVAILABLE: 'app:update-available',
  // 下载进度
  APP_DOWNLOAD_PROGRESS: 'app:download-progress',
  // 下载完成
  APP_DOWNLOAD_COMPLETE: 'app:download-complete',
  // 更新错误
  APP_UPDATE_ERROR: 'app:update-error',
}

// 跳过的版本（用户选择"跳过此版本"），持久化到文件
let skippedVersion = null
// 缓存的检查结果
let cachedRelease = null
let lastCheckTime = 0
// 自动检查定时器
let autoCheckTimer = null
// 更新设置
let _updateSettings = {
  autoCheckApp: true,
  checkFrequency: 'daily', // startup | daily | weekly | monthly
  useProxyForUpdate: false, // 是否使用代理下载更新
}

/**
 * 获取持久化配置文件路径
 */
function getSettingsPath() {
  return path.join(os.homedir(), '.claw-tool', 'update-settings.json')
}

/**
 * 加载持久化设置（skippedVersion + 更新偏好）
 */
function loadSettings() {
  try {
    const settingsPath = getSettingsPath()
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
      if (data.skippedVersion) skippedVersion = data.skippedVersion
      if (data.lastCheckTime) lastCheckTime = data.lastCheckTime
      if (data.autoCheckApp !== undefined) _updateSettings.autoCheckApp = data.autoCheckApp
      if (data.checkFrequency) _updateSettings.checkFrequency = data.checkFrequency
      if (data.useProxyForUpdate !== undefined)
        _updateSettings.useProxyForUpdate = data.useProxyForUpdate
    }
  } catch {
    /* 首次运行无文件 */
  }
}

/**
 * 保存持久化设置
 */
function saveSettings() {
  try {
    const dir = path.dirname(getSettingsPath())
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      getSettingsPath(),
      JSON.stringify(
        {
          skippedVersion,
          lastCheckTime,
          autoCheckApp: _updateSettings.autoCheckApp,
          checkFrequency: _updateSettings.checkFrequency,
          useProxyForUpdate: _updateSettings.useProxyForUpdate,
        },
        null,
        2,
      ),
      'utf-8',
    )
  } catch {
    /* 忽略写入失败 */
  }
}

// 启动时加载设置
loadSettings()

/**
 * 获取当前应用版本（从 package.json）
 * @returns {string}
 */
function getCurrentAppVersion() {
  try {
    const pkgPath = path.resolve(__dirname, '../../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '0.0.0'
  } catch {
    return '0.0.0'
  }
}

/**
 * 发送 HTTPS 请求（支持 HTTP 代理 CONNECT 隧道）
 * @param {string} url - 请求 URL
 * @param {object} [options] - 请求选项
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const headers = {
      'User-Agent': `claw-tool/${getCurrentAppVersion()}`,
      Accept: 'application/vnd.github.v3+json',
      ...options.headers,
    }
    const timeout = options.timeout || 15000

    // 仅在用户开启"使用代理下载更新"时使用代理
    let proxyUrl = null
    if (_updateSettings.useProxyForUpdate) {
      try {
        const proxyManager = require('./proxy-manager')
        proxyUrl = proxyManager.buildProxyUrl()
      } catch {
        /* 代理模块不可用 */
      }
    }

    function handleResponse(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location, options).then(resolve).catch(reject)
        return
      }
      let body = ''
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }))
    }

    if (proxyUrl && (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://'))) {
      // 通过 HTTP CONNECT 代理隧道
      const proxyParsed = new URL(proxyUrl)
      const connectHeaders = {}
      if (proxyParsed.username) {
        connectHeaders['Proxy-Authorization'] =
          'Basic ' +
          Buffer.from(
            `${decodeURIComponent(proxyParsed.username)}:${decodeURIComponent(proxyParsed.password || '')}`,
          ).toString('base64')
      }
      const connectReq = http.request({
        host: proxyParsed.hostname,
        port: parseInt(proxyParsed.port),
        method: 'CONNECT',
        path: `${parsed.hostname}:${parsed.port || 443}`,
        headers: connectHeaders,
        timeout,
      })
      connectReq.on('connect', (res, socket) => {
        if (res.statusCode !== 200) {
          reject(new Error(`代理 CONNECT 失败: ${res.statusCode}`))
          return
        }
        const req = https.request(
          {
            socket,
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers,
            servername: parsed.hostname,
            timeout,
          },
          handleResponse,
        )
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('请求超时'))
        })
        req.on('error', reject)
        req.end()
      })
      connectReq.on('timeout', () => {
        connectReq.destroy()
        reject(new Error('代理连接超时'))
      })
      connectReq.on('error', (err) => {
        // 代理失败时回退直连
        console.warn('[应用更新] 代理连接失败，尝试直连:', err.message)
        directRequest(parsed, headers, timeout, handleResponse, resolve, reject)
      })
      connectReq.end()
    } else {
      directRequest(parsed, headers, timeout, handleResponse, resolve, reject)
    }
  })
}

function directRequest(parsed, headers, timeout, handleResponse, resolve, reject) {
  const req = https.request(
    {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers,
      timeout,
    },
    handleResponse,
  )
  req.on('timeout', () => {
    req.destroy()
    reject(new Error('请求超时'))
  })
  req.on('error', reject)
  req.end()
}

/**
 * 检查 GitHub Releases 最新版本
 * @returns {Promise<object|null>} release 信息
 */
async function checkLatestRelease() {
  const url = `${GITHUB_API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

  try {
    const response = await httpsGet(url)
    if (response.statusCode !== 200) {
      console.warn(`[应用更新] GitHub API 返回 ${response.statusCode}`)
      return null
    }

    const release = JSON.parse(response.body)
    cachedRelease = release
    lastCheckTime = Date.now()
    saveSettings()
    return release
  } catch (err) {
    console.warn('[应用更新] 检查更新失败:', err.message)
    return null
  }
}

/**
 * 从 release tag 提取版本号
 * @param {string} tag - tag 名称（如 "v1.2.3"）
 * @returns {string} 版本号（如 "1.2.3"）
 */
function extractVersion(tag) {
  if (!tag) return '0.0.0'
  return tag.replace(/^v/, '')
}

/**
 * 比较版本号
 * @returns {boolean} 如果 latest 比 current 新则返回 true
 */
function isNewerVersion(current, latest) {
  const c = current.split('.').map(Number)
  const l = latest.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true
    if ((l[i] || 0) < (c[i] || 0)) return false
  }
  return false
}

/**
 * 获取当前平台对应的安装包名称模式
 * @returns {object} { platform, arch, pattern }
 */
function getPlatformAssetPattern() {
  const platform = process.platform
  const arch = process.arch

  if (platform === 'win32') {
    if (arch === 'arm64') {
      return { platform: 'win', arch: 'arm64', patterns: [/win.*arm64.*\.msi$/i, /arm64.*\.msi$/i] }
    }
    return {
      platform: 'win',
      arch: 'x64',
      patterns: [/win.*x64.*\.msi$/i, /x64.*\.msi$/i, /\.msi$/i],
    }
  }

  if (platform === 'darwin') {
    return {
      platform: 'mac',
      arch: 'arm64',
      patterns: [/mac.*arm64.*\.dmg$/i, /arm64.*\.dmg$/i, /\.dmg$/i],
    }
  }

  return { platform: 'unknown', arch, patterns: [] }
}

/**
 * 从 release assets 中找到对应平台的下载资源
 * @param {object} release - GitHub release 对象
 * @returns {object|null} { name, url, size }
 */
function findPlatformAsset(release) {
  if (!release || !release.assets || release.assets.length === 0) {
    return null
  }

  const { patterns } = getPlatformAssetPattern()

  for (const pattern of patterns) {
    const asset = release.assets.find((a) => pattern.test(a.name))
    if (asset) {
      return {
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
      }
    }
  }

  return null
}

/**
 * 检查应用更新
 * @returns {Promise<{hasUpdate: boolean, currentVersion: string, latestVersion: string, releaseNotes: string, asset: object|null}>}
 */
async function checkForAppUpdate() {
  const currentVersion = getCurrentAppVersion()
  const release = await checkLatestRelease()

  if (!release) {
    return { hasUpdate: false, currentVersion, latestVersion: null, releaseNotes: '', asset: null }
  }

  const latestVersion = extractVersion(release.tag_name)
  const hasUpdate = isNewerVersion(currentVersion, latestVersion)

  // 检查是否被用户跳过
  if (hasUpdate && skippedVersion === latestVersion) {
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion,
      releaseNotes: release.body || '',
      asset: null,
      skipped: true,
    }
  }

  const asset = hasUpdate ? findPlatformAsset(release) : null

  if (hasUpdate) {
    eventBus.emit(AppUpdateEvents.APP_UPDATE_AVAILABLE, {
      currentVersion,
      latestVersion,
      releaseNotes: release.body || '',
      asset,
    })
  }

  return {
    hasUpdate,
    currentVersion,
    latestVersion,
    releaseNotes: release.body || '',
    asset,
  }
}

/**
 * 下载更新文件
 * @param {string} url - 下载 URL
 * @param {string} filename - 文件名
 * @param {function} [onProgress] - 进度回调 ({downloaded, total, percent})
 * @returns {Promise<string>} 下载后的文件路径
 */
function downloadUpdate(url, filename, onProgress) {
  return new Promise((resolve, reject) => {
    const tmpDir = path.join(os.tmpdir(), 'claw-tool-update')

    // 同步创建目录
    try {
      fs.mkdirSync(tmpDir, { recursive: true })
    } catch {
      // 目录可能已存在
    }

    const filePath = path.join(tmpDir, filename)
    const fileStream = fs.createWriteStream(filePath)

    // 仅在用户开启"使用代理下载更新"时使用代理
    let proxyUrl = null
    if (_updateSettings.useProxyForUpdate) {
      try {
        const proxyManager = require('./proxy-manager')
        proxyUrl = proxyManager.buildProxyUrl()
      } catch {
        /* 代理模块不可用 */
      }
    }

    function handleResponse(res) {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        doDownload(res.headers.location)
        return
      }

      if (res.statusCode !== 200) {
        fileStream.close()
        reject(new Error(`下载失败: HTTP ${res.statusCode}`))
        return
      }

      const total = parseInt(res.headers['content-length'] || '0', 10)
      let downloaded = 0

      res.on('data', (chunk) => {
        downloaded += chunk.length
        const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0

        if (onProgress) {
          onProgress({ downloaded, total, percent })
        }

        eventBus.emit(AppUpdateEvents.APP_DOWNLOAD_PROGRESS, {
          downloaded,
          total,
          percent,
        })
      })

      res.pipe(fileStream)

      fileStream.on('finish', () => {
        fileStream.close()
        eventBus.emit(AppUpdateEvents.APP_DOWNLOAD_COMPLETE, { filePath })
        resolve(filePath)
      })
    }

    const doDownload = (downloadUrl) => {
      const parsed = new URL(downloadUrl)
      const requestHeaders = {
        'User-Agent': `claw-tool/${getCurrentAppVersion()}`,
      }

      if (
        proxyUrl &&
        parsed.protocol === 'https:' &&
        (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://'))
      ) {
        // 通过 HTTP CONNECT 代理隧道下载
        const proxyParsed = new URL(proxyUrl)
        const connectHeaders = {}
        if (proxyParsed.username) {
          connectHeaders['Proxy-Authorization'] =
            'Basic ' +
            Buffer.from(
              `${decodeURIComponent(proxyParsed.username)}:${decodeURIComponent(proxyParsed.password || '')}`,
            ).toString('base64')
        }
        const connectReq = http.request({
          host: proxyParsed.hostname,
          port: parseInt(proxyParsed.port),
          method: 'CONNECT',
          path: `${parsed.hostname}:${parsed.port || 443}`,
          headers: connectHeaders,
          timeout: 30000,
        })
        connectReq.on('connect', (res, socket) => {
          if (res.statusCode !== 200) {
            fileStream.close()
            reject(new Error(`代理 CONNECT 失败: ${res.statusCode}`))
            return
          }
          const req = https.request(
            {
              socket,
              hostname: parsed.hostname,
              path: parsed.pathname + parsed.search,
              method: 'GET',
              headers: requestHeaders,
              servername: parsed.hostname,
              timeout: 300000,
            },
            handleResponse,
          )
          req.on('timeout', () => {
            req.destroy()
            fileStream.close()
            reject(new Error('下载超时'))
          })
          req.on('error', (err) => {
            fileStream.close()
            reject(err)
          })
          req.end()
        })
        connectReq.on('timeout', () => {
          connectReq.destroy()
          fileStream.close()
          reject(new Error('代理连接超时'))
        })
        connectReq.on('error', () => {
          // 代理失败时回退直连
          console.warn('[应用更新] 下载代理失败，回退直连')
          doDirectDownload(downloadUrl)
        })
        connectReq.end()
      } else {
        doDirectDownload(downloadUrl)
      }
    }

    const doDirectDownload = (downloadUrl) => {
      const parsed = new URL(downloadUrl)
      const protocol = parsed.protocol === 'https:' ? https : http

      const req = protocol.get(
        downloadUrl,
        {
          headers: {
            'User-Agent': `claw-tool/${getCurrentAppVersion()}`,
          },
          timeout: 300000,
        },
        handleResponse,
      )

      req.on('timeout', () => {
        req.destroy()
        fileStream.close()
        reject(new Error('下载超时'))
      })

      req.on('error', (err) => {
        fileStream.close()
        reject(err)
      })
    }

    doDownload(url)
  })
}

/**
 * 启动安装（打开下载的安装包）
 * @param {string} filePath - 安装包路径
 */
function launchInstaller(filePath) {
  const { exec } = require('child_process')
  const platform = process.platform

  if (platform === 'win32') {
    // Windows：启动 .msi 安装包，然后退出应用以释放文件锁
    exec(`msiexec /i "${filePath}"`, { windowsHide: false })
    setTimeout(() => {
      nw.App.quit()
    }, 1000)
  } else if (platform === 'darwin') {
    // macOS：打开 .dmg，然后退出应用
    exec(`open "${filePath}"`)
    setTimeout(() => {
      nw.App.quit()
    }, 1000)
  }
}

/**
 * 跳过指定版本（持久化）
 * @param {string} version - 要跳过的版本号
 */
function skipVersion(version) {
  skippedVersion = version
  saveSettings()
}

/**
 * 获取缓存的检查结果
 */
function getCachedRelease() {
  return {
    release: cachedRelease,
    lastCheckTime,
  }
}

/**
 * 根据检查频率获取间隔毫秒数
 */
function getCheckIntervalMs(freq) {
  switch (freq) {
    case 'startup':
      return 0 // 仅启动时
    case 'daily':
      return 24 * 60 * 60 * 1000
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000
    case 'monthly':
      return 30 * 24 * 60 * 60 * 1000
    default:
      return 24 * 60 * 60 * 1000
  }
}

/**
 * 判断是否需要检查（基于上次检查时间和频率）
 */
function shouldCheck() {
  if (!_updateSettings.autoCheckApp) return false
  if (_updateSettings.checkFrequency === 'startup') return lastCheckTime === 0
  const interval = getCheckIntervalMs(_updateSettings.checkFrequency)
  return Date.now() - lastCheckTime >= interval
}

/**
 * 启动自动检查定时器
 * 启动后 10 秒执行首次检查，之后按频率轮询
 */
function startAutoCheck() {
  stopAutoCheck()

  // 延迟 10 秒首次检查
  setTimeout(async () => {
    if (shouldCheck()) {
      try {
        await checkForAppUpdate()
      } catch (err) {
        console.warn('[应用更新] 自动检查失败:', err.message)
      }
    }

    // 设置定时轮询（每小时检查一次是否到时间）
    autoCheckTimer = setInterval(
      async () => {
        if (shouldCheck()) {
          try {
            await checkForAppUpdate()
          } catch (err) {
            console.warn('[应用更新] 自动检查失败:', err.message)
          }
        }
      },
      60 * 60 * 1000,
    ) // 每小时轮询一次
  }, 10000)
}

/**
 * 停止自动检查
 */
function stopAutoCheck() {
  if (autoCheckTimer) {
    clearInterval(autoCheckTimer)
    autoCheckTimer = null
  }
}

/**
 * 更新设置并持久化
 * @param {object} newSettings - { autoCheckApp, checkFrequency }
 */
function updateSettings(newSettings) {
  if (newSettings.autoCheckApp !== undefined)
    _updateSettings.autoCheckApp = newSettings.autoCheckApp
  if (newSettings.checkFrequency) _updateSettings.checkFrequency = newSettings.checkFrequency
  if (newSettings.useProxyForUpdate !== undefined)
    _updateSettings.useProxyForUpdate = newSettings.useProxyForUpdate
  saveSettings()

  // 根据新设置重启或停止自动检查
  if (_updateSettings.autoCheckApp) {
    startAutoCheck()
  } else {
    stopAutoCheck()
  }
}

/**
 * 获取当前更新设置
 */
function getUpdateSettings() {
  return { ..._updateSettings, lastCheckTime }
}

module.exports = {
  getCurrentAppVersion,
  checkLatestRelease,
  checkForAppUpdate,
  downloadUpdate,
  launchInstaller,
  skipVersion,
  getCachedRelease,
  findPlatformAsset,
  startAutoCheck,
  stopAutoCheck,
  updateSettings,
  getUpdateSettings,
  AppUpdateEvents,
}
