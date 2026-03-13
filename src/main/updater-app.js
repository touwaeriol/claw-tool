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

// 跳过的版本（用户选择"跳过此版本"）
let skippedVersion = null
// 缓存的检查结果
let cachedRelease = null
let lastCheckTime = 0

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
 * 发送 HTTPS 请求（支持代理）
 * @param {string} url - 请求 URL
 * @param {object} [options] - 请求选项
 * @returns {Promise<{statusCode: number, headers: object, body: string}>}
 */
function httpsGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url)
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': `claw-tool/${getCurrentAppVersion()}`,
        'Accept': 'application/vnd.github.v3+json',
        ...options.headers,
      },
      timeout: options.timeout || 15000,
    }

    const req = https.request(reqOptions, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpsGet(res.headers.location, options).then(resolve).catch(reject)
        return
      }

      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        })
      })
    })

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('请求超时'))
    })

    req.on('error', reject)
    req.end()
  })
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
      return { platform: 'win', arch: 'arm64', patterns: [/win.*arm64.*\.exe$/i, /arm64.*\.exe$/i] }
    }
    return { platform: 'win', arch: 'x64', patterns: [/win.*x64.*\.exe$/i, /x64.*\.exe$/i, /setup.*\.exe$/i] }
  }

  if (platform === 'darwin') {
    return { platform: 'mac', arch: 'arm64', patterns: [/mac.*arm64.*\.dmg$/i, /arm64.*\.dmg$/i, /\.dmg$/i] }
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
    const asset = release.assets.find(a => pattern.test(a.name))
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
    return { hasUpdate: false, currentVersion, latestVersion, releaseNotes: release.body || '', asset: null, skipped: true }
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

    const doDownload = (downloadUrl) => {
      const parsed = new URL(downloadUrl)
      const protocol = parsed.protocol === 'https:' ? https : http

      const req = protocol.get(downloadUrl, {
        headers: {
          'User-Agent': `claw-tool/${getCurrentAppVersion()}`,
        },
        timeout: 30000,
      }, (res) => {
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
      })

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
    // Windows：启动 .exe 安装包
    exec(`start "" "${filePath}"`, { windowsHide: false })
  } else if (platform === 'darwin') {
    // macOS：打开 .dmg
    exec(`open "${filePath}"`)
  }
}

/**
 * 跳过指定版本
 * @param {string} version - 要跳过的版本号
 */
function skipVersion(version) {
  skippedVersion = version
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

module.exports = {
  getCurrentAppVersion,
  checkLatestRelease,
  checkForAppUpdate,
  downloadUpdate,
  launchInstaller,
  skipVersion,
  getCachedRelease,
  findPlatformAsset,
  AppUpdateEvents,
}
