/**
 * 安装模块
 * 负责环境检测、Node.js 安装引导、OpenClaw 安装和初始化
 * 所有命令通过 executor 抽象层执行，支持本地和远程场景
 */

const { eventBus, Events } = require('../shared/ipc')
const { MIN_NODE_VERSION } = require('../shared/constants')

// 安装事件名称
const InstallerEvents = {
  // 安装进度更新
  PROGRESS: 'installer:progress',
  // 安装日志输出
  LOG: 'installer:log',
  // 安装完成
  COMPLETE: 'installer:complete',
  // 安装失败
  ERROR: 'installer:error',
}

/**
 * 比较语义化版本号
 * @param {string} current - 当前版本 (如 "22.12.0")
 * @param {string} required - 要求的最低版本
 * @returns {boolean} current >= required
 */
function compareVersions(current, required) {
  const curParts = current.split('.').map(Number)
  const reqParts = required.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const c = curParts[i] || 0
    const r = reqParts[i] || 0
    if (c > r) return true
    if (c < r) return false
  }
  return true
}

/**
 * 发送安装日志到事件总线
 */
function emitLog(message, level = 'info') {
  eventBus.emit(InstallerEvents.LOG, { message, level, timestamp: Date.now() })
}

/**
 * 发送安装进度到事件总线
 */
function emitProgress(step, status, detail = '') {
  eventBus.emit(InstallerEvents.PROGRESS, { step, status, detail })
}

/**
 * 检测 Node.js 安装状态和版本
 * @param {object} executor - 执行器实例
 * @returns {Promise<{installed: boolean, version: string|null, meetsRequirement: boolean}>}
 */
async function checkNode(executor) {
  emitLog('正在检测 Node.js...')
  emitProgress('node-check', 'running')

  try {
    const result = await executor.exec('node --version')
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      emitLog('未检测到 Node.js', 'warn')
      emitProgress('node-check', 'failed', '未安装 Node.js')
      return { installed: false, version: null, meetsRequirement: false }
    }

    // 解析版本号，去掉 "v" 前缀
    const version = result.stdout.trim().replace(/^v/, '')
    const meetsRequirement = compareVersions(version, MIN_NODE_VERSION)

    if (meetsRequirement) {
      emitLog(`Node.js v${version} 已安装，满足版本要求 (>= ${MIN_NODE_VERSION})`)
      emitProgress('node-check', 'success', `v${version}`)
    } else {
      emitLog(`Node.js v${version} 版本过低，需要 >= ${MIN_NODE_VERSION}`, 'warn')
      emitProgress('node-check', 'failed', `v${version}，需要 >= ${MIN_NODE_VERSION}`)
    }

    // 检测是否使用 bundled node 及路径
    let bundled = false
    let nodePath = null
    try {
      const bundledNode = require('../shared/bundled-node')
      bundled = bundledNode.getBundledNodePaths().found
    } catch {
      /* 忽略 */
    }
    try {
      const isWin = process.platform === 'win32'
      const whichCmd = isWin ? 'where' : 'which'
      const pathResult = await executor.exec(`${whichCmd} node`, { timeout: 5000 })
      if (pathResult.exitCode === 0) {
        nodePath = pathResult.stdout.trim().split(/\r?\n/)[0]
      }
    } catch {
      /* 忽略 */
    }

    return { installed: true, version, meetsRequirement, bundled, nodePath }
  } catch (err) {
    emitLog(`Node.js 检测失败: ${err.message}`, 'error')
    emitProgress('node-check', 'failed', err.message)
    return { installed: false, version: null, meetsRequirement: false, bundled: false }
  }
}

/**
 * 检测 npm 安装状态
 * @param {object} executor - 执行器实例
 * @returns {Promise<{installed: boolean, version: string|null}>}
 */
async function checkNpm(executor) {
  emitLog('正在检测 npm...')
  emitProgress('npm-check', 'running')

  try {
    const result = await executor.exec('npm --version')
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      emitLog('未检测到 npm', 'warn')
      emitProgress('npm-check', 'failed', '未安装 npm')
      return { installed: false, version: null }
    }

    const version = result.stdout.trim()
    emitLog(`npm v${version} 已安装`)
    emitProgress('npm-check', 'success', `v${version}`)
    return { installed: true, version }
  } catch (err) {
    emitLog(`npm 检测失败: ${err.message}`, 'error')
    emitProgress('npm-check', 'failed', err.message)
    return { installed: false, version: null }
  }
}

/**
 * 检测 OpenClaw 安装状态
 * @param {object} executor - 执行器实例
 * @returns {Promise<{installed: boolean, version: string|null}>}
 */
async function checkOpenClaw(executor) {
  emitLog('正在检测 OpenClaw...')
  emitProgress('openclaw-check', 'running')

  try {
    const result = await executor.exec('openclaw --version')
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      emitLog('未检测到 OpenClaw', 'warn')
      emitProgress('openclaw-check', 'failed', '未安装 OpenClaw')
      return { installed: false, version: null }
    }

    const version = result.stdout.trim()
    emitLog(`OpenClaw ${version} 已安装`)
    emitProgress('openclaw-check', 'success', version)
    return { installed: true, version }
  } catch (err) {
    emitLog(`OpenClaw 检测失败: ${err.message}`, 'error')
    emitProgress('openclaw-check', 'failed', err.message)
    return { installed: false, version: null }
  }
}

/**
 * 执行完整的环境检测
 * @param {object} executor - 执行器实例
 * @returns {Promise<object>} 检测结果
 */
async function checkEnvironment(executor) {
  const node = await checkNode(executor)
  const npm = await checkNpm(executor)
  const openclaw = await checkOpenClaw(executor)

  return { node, npm, openclaw }
}

/**
 * 获取 Node.js 安装指引（根据操作系统）
 * @param {object} executor - 执行器实例
 * @returns {Promise<object>} 安装指引信息
 */
async function getNodeInstallGuide(executor) {
  const result = await executor.exec('uname -s 2>/dev/null || echo Windows')
  const platform = result.stdout.trim()

  if (platform.includes('Darwin')) {
    return {
      platform: 'macOS',
      methods: [
        {
          name: 'Homebrew（推荐）',
          command: 'brew install node@24 && brew link node@24 --force --overwrite',
          description: '使用 Homebrew 包管理器安装',
        },
        {
          name: '官方安装包',
          url: 'https://nodejs.org/dist/latest-v24.x/',
          description: '下载 .pkg 安装包手动安装',
        },
      ],
    }
  }

  // Windows 或其他
  return {
    platform: 'Windows',
    methods: [
      {
        name: '官方安装包（推荐）',
        url: 'https://nodejs.org/dist/latest-v24.x/',
        description: '下载 .msi 安装包，双击运行即可',
      },
      {
        name: 'nvm-windows',
        command: 'nvm install 24',
        url: 'https://github.com/coreybutler/nvm-windows',
        description: '使用 nvm-windows 版本管理器安装',
      },
    ],
  }
}

/**
 * 安装 Node.js（自动方式）
 * @param {object} executor - 执行器实例
 * @param {string} method - 安装方式: 'brew' | 'nvm'
 * @param {object} [options] - 选项
 * @param {function} [options.onLog] - 日志回调
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function installNode(executor, method, options = {}) {
  emitLog(`正在安装 Node.js（方式: ${method}）...`)
  emitProgress('node-install', 'running', `使用 ${method} 安装中`)

  const onLog = options.onLog || (() => {})

  try {
    let command
    if (method === 'brew') {
      command = 'brew install node@24 && brew link node@24 --force --overwrite'
    } else if (method === 'nvm') {
      command = 'nvm install 24 && nvm use 24'
    } else {
      throw new Error(`不支持的安装方式: ${method}`)
    }

    // 使用流式执行以实时输出日志
    if (executor.execStream) {
      const result = await executor.execStream(command, {
        timeout: 300000, // 5 分钟超时
        onStdout: (data) => {
          emitLog(data.trim())
          onLog(data)
        },
        onStderr: (data) => {
          emitLog(data.trim(), 'warn')
          onLog(data)
        },
      })

      if (result.exitCode !== 0) {
        throw new Error(`安装命令退出码: ${result.exitCode}`)
      }
    } else {
      const result = await executor.exec(command, { timeout: 300000 })
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `安装命令退出码: ${result.exitCode}`)
      }
      if (result.stdout) emitLog(result.stdout.trim())
    }

    // 验证安装
    const check = await checkNode(executor)
    if (check.installed && check.meetsRequirement) {
      emitLog('Node.js 安装成功！')
      emitProgress('node-install', 'success')
      return { success: true }
    }

    throw new Error('安装完成但验证失败，请检查 PATH 环境变量')
  } catch (err) {
    emitLog(`Node.js 安装失败: ${err.message}`, 'error')
    emitProgress('node-install', 'failed', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * 安装 OpenClaw
 * @param {object} executor - 执行器实例
 * @param {object} [options] - 选项
 * @param {string} [options.registry] - npm 镜像源
 * @param {function} [options.onLog] - 日志回调
 * @returns {Promise<{success: boolean, version?: string, error?: string}>}
 */
async function installOpenClaw(executor, options = {}) {
  emitLog('正在安装 OpenClaw...')
  emitProgress('openclaw-install', 'running')

  const onLog = options.onLog || (() => {})

  try {
    // 记录实际使用的 node/npm 路径
    const nodeInfo = await detectNodePaths(executor)
    if (nodeInfo.nodePath) {
      emitLog(
        `使用 Node.js: ${nodeInfo.nodePath} (v${nodeInfo.nodeVersion || '未知'})${nodeInfo.bundled ? ' [内嵌]' : ''}`,
      )
    }
    if (nodeInfo.npmPath) {
      emitLog(`使用 npm: ${nodeInfo.npmPath}`)
    }

    let command = 'npm install -g openclaw@latest'
    if (options.registry) {
      command += ` --registry=${options.registry}`
    }

    // 使用流式执行以实时输出日志
    if (executor.execStream) {
      const result = await executor.execStream(command, {
        timeout: 180000, // 3 分钟超时
        onStdout: (data) => {
          emitLog(data.trim())
          onLog(data)
        },
        onStderr: (data) => {
          // npm 的进度信息也会输出到 stderr
          emitLog(data.trim(), 'info')
          onLog(data)
        },
      })

      if (result.exitCode !== 0) {
        throw new Error(`npm install 退出码: ${result.exitCode}`)
      }
    } else {
      const result = await executor.exec(command, { timeout: 180000 })
      if (result.exitCode !== 0) {
        throw new Error(result.stderr || `npm install 退出码: ${result.exitCode}`)
      }
      if (result.stdout) emitLog(result.stdout.trim())
    }

    // 验证安装
    const check = await checkOpenClaw(executor)
    if (check.installed) {
      emitLog(`OpenClaw ${check.version} 安装成功！`)
      emitProgress('openclaw-install', 'success', check.version)
      return { success: true, version: check.version, nodeInfo }
    }

    throw new Error('安装完成但验证失败')
  } catch (err) {
    emitLog(`OpenClaw 安装失败: ${err.message}`, 'error')
    emitProgress('openclaw-install', 'failed', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * 检测当前环境中实际使用的 node/npm 路径
 * @param {object} executor - 执行器实例
 * @returns {Promise<{nodePath: string|null, npmPath: string|null, nodeVersion: string|null, bundled: boolean}>}
 */
async function detectNodePaths(executor) {
  const isWin = process.platform === 'win32'
  const whichCmd = isWin ? 'where' : 'which'
  let bundled = false

  try {
    const bundledNode = require('../shared/bundled-node')
    bundled = bundledNode.getBundledNodePaths().found
  } catch {
    /* 忽略 */
  }

  let nodePath = null
  let npmPath = null
  let nodeVersion = null

  try {
    const nodeResult = await executor.exec(`${whichCmd} node`, { timeout: 5000 })
    if (nodeResult.exitCode === 0) {
      nodePath = nodeResult.stdout.trim().split(/\r?\n/)[0]
    }
  } catch {
    /* 忽略 */
  }

  try {
    const npmResult = await executor.exec(`${whichCmd} npm`, { timeout: 5000 })
    if (npmResult.exitCode === 0) {
      npmPath = npmResult.stdout.trim().split(/\r?\n/)[0]
    }
  } catch {
    /* 忽略 */
  }

  try {
    const verResult = await executor.exec('node --version', { timeout: 5000 })
    if (verResult.exitCode === 0) {
      nodeVersion = verResult.stdout.trim().replace(/^v/, '')
    }
  } catch {
    /* 忽略 */
  }

  return { nodePath, npmPath, nodeVersion, bundled }
}

/**
 * 运行 OpenClaw 初始化（onboard）
 * @param {object} executor - 执行器实例
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function runOnboard(executor) {
  emitLog('正在执行 OpenClaw 初始化...')
  emitProgress('openclaw-onboard', 'running')

  try {
    const result = await executor.exec('openclaw doctor', { timeout: 30000 })
    if (result.stdout) emitLog(result.stdout.trim())

    emitLog('OpenClaw 环境诊断完成')
    emitProgress('openclaw-onboard', 'success')
    return { success: true }
  } catch (err) {
    emitLog(`OpenClaw 初始化失败: ${err.message}`, 'error')
    emitProgress('openclaw-onboard', 'failed', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * 下载 Node.js 安装包到用户下载目录（跨平台，支持断点续传和代理）
 * Windows 下载 .msi，macOS 下载 .pkg
 * @param {object} [options] - 选项
 * @param {function} [options.onProgress] - 进度回调 (percent, downloaded, total)
 * @param {function} [options.onLog] - 日志回调
 * @returns {Promise<{success: boolean, installerPath?: string, version?: string, error?: string}>}
 */
async function downloadNodeInstaller(options = {}) {
  const https = require('https')
  const http = require('http')
  const fs = require('fs')
  const path = require('path')
  const os = require('os')
  const onProgress = options.onProgress || (() => {})
  const onLog = options.onLog || (() => {})

  const platform = process.platform
  const arch = os.arch() === 'x64' ? 'x64' : os.arch() === 'arm64' ? 'arm64' : 'x86'
  const ext = platform === 'darwin' ? 'pkg' : 'msi'

  emitLog('正在检测网络环境...')
  onLog('正在检测网络环境...')

  try {
    // 根据地区选择镜像
    const mirror = await getNodeMirror()
    const mirrorBase = mirror.base
    emitLog(`使用 ${mirror.label}: ${mirrorBase}`)
    onLog(`使用 ${mirror.label}`)

    // 1. 获取最新 v22.x 版本号
    const indexUrl = `${mirrorBase}/latest-v24.x/`
    const html = await httpGet(indexUrl)

    // macOS pkg 文件名格式: node-v22.x.x.pkg (不含架构，通用包)
    // 也可能是 node-v22.x.x-arm64.pkg / node-v22.x.x-x64.pkg
    // Windows msi 文件名格式: node-v22.x.x-x64.msi
    let filePattern
    if (ext === 'pkg') {
      // macOS: 优先匹配带架构的 pkg，回退到通用 pkg
      filePattern = new RegExp(`node-v([\\d.]+)(?:-${arch})?\\.pkg`, 'i')
    } else {
      filePattern = new RegExp(`node-v([\\d.]+)-${arch}\\.msi`, 'i')
    }

    const match = html.match(filePattern)
    if (!match) {
      throw new Error(`未找到适合当前平台 (${platform}/${arch}) 的 .${ext} 安装包`)
    }

    const filename = match[0]
    const nodeVersion = match[1]
    const downloadUrl = `${mirrorBase}/latest-v24.x/${filename}`

    // 2. 准备下载目录（用户下载目录）
    const downloadsDir = path.join(os.homedir(), 'Downloads')
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true })
    }
    const installerPath = path.join(downloadsDir, filename)

    // 3. 获取远程文件大小
    const remoteSize = await getContentLength(downloadUrl).catch(() => 0)

    // 4. 检查已有文件，判断是否需要下载
    let existingSize = 0
    if (fs.existsSync(installerPath)) {
      existingSize = fs.statSync(installerPath).size
      if (remoteSize > 0 && existingSize === remoteSize) {
        emitLog(`已存在完整的 ${filename}，跳过下载`)
        onLog(`已存在安装包，跳过下载`)
        onProgress(100, formatBytes(existingSize), formatBytes(remoteSize))
        return { success: true, installerPath, version: nodeVersion }
      }
      if (existingSize > 0 && remoteSize > 0 && existingSize < remoteSize) {
        emitLog(
          `发现未完成的下载 (${formatBytes(existingSize)}/${formatBytes(remoteSize)})，将断点续传`,
        )
        onLog(`断点续传: 已下载 ${formatBytes(existingSize)}`)
      } else if (existingSize > 0) {
        fs.unlinkSync(installerPath)
        existingSize = 0
      }
    }

    emitLog(
      `开始下载 Node.js v${nodeVersion} ${filename} (${remoteSize > 0 ? formatBytes(remoteSize) : '未知大小'})`,
    )
    onLog(`正在下载 Node.js v${nodeVersion} ${filename}...`)

    // 5. 获取代理配置
    let proxyManager = null
    try {
      proxyManager = require('./proxy-manager')
    } catch {
      /* 代理模块不可用 */
    }
    const proxyUrl = proxyManager ? proxyManager.buildProxyUrl() : null

    // 6. 下载（支持断点续传 + HTTP 代理）
    await new Promise((resolve, reject) => {
      function doDownload(url, resumeFrom) {
        const parsedUrl = new URL(url)

        // 如果配置了 HTTP/HTTPS 代理，通过 CONNECT 隧道下载
        if (proxyUrl && (proxyUrl.startsWith('http://') || proxyUrl.startsWith('https://'))) {
          const proxyParsed = new URL(proxyUrl)
          const connectReq = http.request({
            host: proxyParsed.hostname,
            port: parseInt(proxyParsed.port),
            method: 'CONNECT',
            path: `${parsedUrl.hostname}:${parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80)}`,
            headers: proxyParsed.username
              ? {
                  'Proxy-Authorization':
                    'Basic ' +
                    Buffer.from(
                      `${decodeURIComponent(proxyParsed.username)}:${decodeURIComponent(proxyParsed.password || '')}`,
                    ).toString('base64'),
                }
              : {},
          })

          connectReq.on('connect', (res, socket) => {
            if (res.statusCode !== 200) {
              reject(new Error(`代理 CONNECT 失败: ${res.statusCode}`))
              return
            }
            // 通过隧道建立 TLS 连接
            const tlsOpts = {
              host: parsedUrl.hostname,
              socket,
              servername: parsedUrl.hostname,
              headers: {},
            }
            if (resumeFrom > 0) {
              tlsOpts.headers['Range'] = `bytes=${resumeFrom}-`
            }
            const tlsReq = https.get(
              {
                ...tlsOpts,
                path: parsedUrl.pathname + parsedUrl.search,
              },
              (tlsRes) => handleResponse(tlsRes, resumeFrom, resolve, reject),
            )
            tlsReq.on('error', reject)
          })
          connectReq.on('error', (err) => {
            emitLog(`代理连接失败，尝试直连: ${err.message}`, 'warn')
            doDirectDownload(url, resumeFrom, resolve, reject)
          })
          connectReq.end()
          return
        }

        doDirectDownload(url, resumeFrom, resolve, reject)
      }

      function doDirectDownload(url, resumeFrom, resolve, reject) {
        const parsedUrl = new URL(url)
        const reqModule = parsedUrl.protocol === 'https:' ? https : http
        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {},
        }
        if (resumeFrom > 0) {
          reqOptions.headers['Range'] = `bytes=${resumeFrom}-`
        }

        reqModule
          .get(reqOptions, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              doDownload(res.headers.location, resumeFrom)
              return
            }
            handleResponse(res, resumeFrom, resolve, reject)
          })
          .on('error', reject)
      }

      function handleResponse(res, resumeFrom, resolve, reject) {
        if (res.statusCode !== 200 && res.statusCode !== 206) {
          reject(new Error(`下载失败，HTTP ${res.statusCode}`))
          return
        }

        let startOffset = resumeFrom
        if (resumeFrom > 0 && res.statusCode === 200) {
          emitLog('服务器不支持断点续传，将从头下载')
          onLog('服务器不支持断点续传，从头下载')
          startOffset = 0
        }

        let totalSize
        if (res.statusCode === 206) {
          const rangeHeader = res.headers['content-range'] || ''
          const rangeMatch = rangeHeader.match(/\/(\d+)$/)
          totalSize = rangeMatch ? parseInt(rangeMatch[1], 10) : 0
        } else {
          totalSize = parseInt(res.headers['content-length'] || '0', 10)
        }

        let downloaded = startOffset
        const file = fs.createWriteStream(installerPath, startOffset > 0 ? { flags: 'a' } : {})

        file.on('error', (err) => {
          res.destroy()
          reject(new Error(`写入文件失败: ${err.message}`))
        })

        if (totalSize > 0 && startOffset > 0) {
          onProgress(
            Math.round((startOffset / totalSize) * 100),
            formatBytes(startOffset),
            formatBytes(totalSize),
          )
        }

        res.on('data', (chunk) => {
          downloaded += chunk.length
          file.write(chunk)
          if (totalSize > 0) {
            const percent = Math.round((downloaded / totalSize) * 100)
            onProgress(percent, formatBytes(downloaded), formatBytes(totalSize))
          }
        })

        res.on('end', () => {
          file.end(() => {
            if (totalSize > 0 && downloaded !== totalSize) {
              reject(
                new Error(
                  `下载不完整: 预期 ${formatBytes(totalSize)}，实际 ${formatBytes(downloaded)}`,
                ),
              )
              return
            }
            emitLog(`下载完成: ${installerPath} (${formatBytes(downloaded)})`)
            onLog(`下载完成！(${formatBytes(downloaded)})`)
            onProgress(100, formatBytes(downloaded), formatBytes(totalSize || downloaded))
            resolve()
          })
        })

        res.on('error', (err) => {
          file.end()
          reject(err)
        })
      }

      doDownload(downloadUrl, existingSize)
    })

    return { success: true, installerPath, version: nodeVersion }
  } catch (err) {
    emitLog(`Node.js 安装包下载失败: ${err.message}`, 'error')
    onLog(`下载失败: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * 打开已下载的 Node.js 安装包（让用户自行安装）
 * @param {string} installerPath - 安装包文件路径
 * @returns {{success: boolean, error?: string}}
 */
function openNodeInstaller(installerPath) {
  const { exec } = require('child_process')
  const fs = require('fs')

  if (!fs.existsSync(installerPath)) {
    return { success: false, error: `文件不存在: ${installerPath}` }
  }

  try {
    if (process.platform === 'win32') {
      exec(`start "" "${installerPath}"`, { windowsHide: false })
    } else if (process.platform === 'darwin') {
      exec(`open "${installerPath}"`)
    } else {
      exec(`xdg-open "${installerPath}"`)
    }
    emitLog(`已打开安装包: ${installerPath}`)
    return { success: true }
  } catch (err) {
    emitLog(`打开安装包失败: ${err.message}`, 'error')
    return { success: false, error: err.message }
  }
}

/** downloadNodeMsi 保留为别名，兼容旧调用 */
async function downloadNodeMsi(executor, options = {}) {
  return downloadNodeInstaller(options)
}

/**
 * HTTP GET 请求（自动跟随重定向，校验状态码）
 */
function httpGet(url) {
  const https = require('https')
  const http = require('http')
  return new Promise((resolve, reject) => {
    const get = url.startsWith('https') ? https.get : http.get
    get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        res.resume() // 消费响应体防止内存泄漏
        reject(new Error(`HTTP 请求失败: ${res.statusCode} ${url}`))
        return
      }
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => resolve(data))
      res.on('error', reject)
    }).on('error', reject)
  })
}

/**
 * HTTP HEAD 请求获取文件大小（跟随重定向）
 * @param {string} url - 目标 URL
 * @returns {Promise<number>} 文件大小（字节）
 */
function getContentLength(url) {
  const https = require('https')
  const http = require('http')
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url)
    const reqModule = parsedUrl.protocol === 'https:' ? https : http
    const req = reqModule.request(
      {
        method: 'HEAD',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          getContentLength(res.headers.location).then(resolve).catch(reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HEAD 请求失败: ${res.statusCode}`))
          return
        }
        const len = parseInt(res.headers['content-length'] || '0', 10)
        resolve(len)
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/** 缓存地区检测结果 */
let _regionCache = null

/**
 * 检测用户所在地区（国内/国外），用于选择下载镜像
 * 优先用 ip-api.com（免费、快），失败则回退默认国内
 * @returns {Promise<'cn'|'intl'>}
 */
async function detectRegion() {
  if (_regionCache) return _regionCache

  try {
    const data = await Promise.race([
      httpGet('http://ip-api.com/json/?fields=countryCode'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
    ])
    const json = JSON.parse(data)
    _regionCache = json.countryCode === 'CN' ? 'cn' : 'intl'
    emitLog(`地区检测: ${json.countryCode} → 使用${_regionCache === 'cn' ? '国内镜像' : '官方源'}`)
  } catch {
    // 检测失败默认国内（国内用户更多，且镜像对国外用户也可用）
    _regionCache = 'cn'
    emitLog('地区检测失败，默认使用国内镜像')
  }

  return _regionCache
}

/**
 * 根据地区获取 Node.js 下载镜像地址
 */
async function getNodeMirror() {
  const region = await detectRegion()
  if (region === 'cn') {
    return { base: 'https://npmmirror.com/mirrors/node', label: '阿里镜像' }
  }
  return { base: 'https://nodejs.org/dist', label: 'Node.js 官方' }
}

/**
 * 根据地区获取推荐的 npm registry
 */
async function getRecommendedRegistry() {
  const region = await detectRegion()
  return region === 'cn' ? 'https://registry.npmmirror.com' : ''
}

/**
 * 格式化字节数
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

module.exports = {
  InstallerEvents,
  compareVersions,
  checkNode,
  checkNpm,
  checkOpenClaw,
  checkEnvironment,
  getNodeInstallGuide,
  installNode,
  installOpenClaw,
  runOnboard,
  downloadNodeInstaller,
  openNodeInstaller,
  downloadNodeMsi, // 兼容别名
  detectRegion,
  getRecommendedRegistry,
  detectNodePaths,
}
