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

    return { installed: true, version, meetsRequirement }
  } catch (err) {
    emitLog(`Node.js 检测失败: ${err.message}`, 'error')
    emitProgress('node-check', 'failed', err.message)
    return { installed: false, version: null, meetsRequirement: false }
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
          command: 'brew install node@22',
          description: '使用 Homebrew 包管理器安装',
        },
        {
          name: '官方安装包',
          url: 'https://nodejs.org/dist/latest-v22.x/',
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
        url: 'https://nodejs.org/dist/latest-v22.x/',
        description: '下载 .msi 安装包，双击运行即可',
      },
      {
        name: 'nvm-windows',
        command: 'nvm install 22',
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
      command = 'brew install node@22'
    } else if (method === 'nvm') {
      command = 'nvm install 22 && nvm use 22'
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
      return { success: true, version: check.version }
    }

    throw new Error('安装完成但验证失败')
  } catch (err) {
    emitLog(`OpenClaw 安装失败: ${err.message}`, 'error')
    emitProgress('openclaw-install', 'failed', err.message)
    return { success: false, error: err.message }
  }
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
 * 从镜像下载 Node.js MSI 安装包（支持断点续传）
 * @param {object} executor - 执行器实例（可为 null）
 * @param {object} [options] - 选项
 * @param {function} [options.onProgress] - 进度回调 (percent: number, downloaded: string, total: string)
 * @param {function} [options.onLog] - 日志回调
 * @returns {Promise<{success: boolean, msiPath?: string, version?: string, error?: string}>}
 */
async function downloadNodeMsi(executor, options = {}) {
  const https = require('https')
  const http = require('http')
  const fs = require('fs')
  const path = require('path')
  const os = require('os')
  const onProgress = options.onProgress || (() => {})
  const onLog = options.onLog || (() => {})

  const arch = os.arch() === 'x64' ? 'x64' : os.arch() === 'arm64' ? 'arm64' : 'x86'

  emitLog('正在检测网络环境...')
  onLog('正在检测网络环境...')

  try {
    // 根据地区选择镜像
    const mirror = await getNodeMirror()
    const mirrorBase = mirror.base
    emitLog(`使用 ${mirror.label}: ${mirrorBase}`)
    onLog(`使用 ${mirror.label}`)

    // 1. 获取最新 v22.x 版本号
    const indexUrl = `${mirrorBase}/latest-v22.x/`
    const html = await httpGet(indexUrl)

    // 从目录页面解析 .msi 文件名
    const msiPattern = new RegExp(`node-v([\\d.]+)-${arch}\\.msi`, 'i')
    const match = html.match(msiPattern)
    if (!match) {
      throw new Error(`未找到适合当前架构 (${arch}) 的 MSI 安装包`)
    }

    const msiFilename = match[0]
    const nodeVersion = match[1]
    const downloadUrl = `${mirrorBase}/latest-v22.x/${msiFilename}`

    // 2. 准备下载目录
    const tempDir = path.join(os.tmpdir(), 'claw-tool-node-install')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const msiPath = path.join(tempDir, msiFilename)

    // 3. 获取远程文件大小
    const remoteSize = await getContentLength(downloadUrl).catch(() => 0)

    // 4. 检查已有文件，判断是否需要下载
    let existingSize = 0
    if (fs.existsSync(msiPath)) {
      existingSize = fs.statSync(msiPath).size
      if (remoteSize > 0 && existingSize === remoteSize) {
        emitLog(`已存在完整的 ${msiFilename}，跳过下载`)
        onLog(`已存在安装包，跳过下载`)
        onProgress(100, formatBytes(existingSize), formatBytes(remoteSize))
        return { success: true, msiPath, version: nodeVersion }
      }
      if (existingSize > 0 && remoteSize > 0 && existingSize < remoteSize) {
        emitLog(`发现未完成的下载 (${formatBytes(existingSize)}/${formatBytes(remoteSize)})，将断点续传`)
        onLog(`断点续传: 已下载 ${formatBytes(existingSize)}`)
      } else if (existingSize > 0) {
        // 文件比远程大或无法验证，删除重新下载
        fs.unlinkSync(msiPath)
        existingSize = 0
      }
    }

    emitLog(`开始下载 Node.js v${nodeVersion} ${msiFilename} (${remoteSize > 0 ? formatBytes(remoteSize) : '未知大小'})`)
    onLog(`正在下载 Node.js v${nodeVersion} ${msiFilename}...`)

    // 5. 下载（支持断点续传）
    await new Promise((resolve, reject) => {
      function doDownload(url, resumeFrom) {
        const parsedUrl = new URL(url)
        const reqModule = parsedUrl.protocol === 'https:' ? https : http
        const reqOptions = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port,
          path: parsedUrl.pathname + parsedUrl.search,
          headers: {},
        }
        // 设置 Range 头实现续传
        if (resumeFrom > 0) {
          reqOptions.headers['Range'] = `bytes=${resumeFrom}-`
        }

        reqModule.get(reqOptions, (res) => {
          // 跟随重定向
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            doDownload(res.headers.location, resumeFrom)
            return
          }

          // 200 = 全量下载，206 = 续传成功
          if (res.statusCode !== 200 && res.statusCode !== 206) {
            reject(new Error(`下载失败，HTTP ${res.statusCode}`))
            return
          }

          // 如果服务器不支持续传（返回 200 而非 206），从头开始
          let startOffset = resumeFrom
          if (resumeFrom > 0 && res.statusCode === 200) {
            emitLog('服务器不支持断点续传，将从头下载')
            onLog('服务器不支持断点续传，从头下载')
            startOffset = 0
          }

          // 计算总大小
          let totalSize
          if (res.statusCode === 206) {
            // Content-Range: bytes 12345-67890/67891
            const rangeHeader = res.headers['content-range'] || ''
            const rangeMatch = rangeHeader.match(/\/(\d+)$/)
            totalSize = rangeMatch ? parseInt(rangeMatch[1], 10) : 0
          } else {
            totalSize = parseInt(res.headers['content-length'] || '0', 10)
          }

          let downloaded = startOffset
          // 续传用 append 模式，全新下载用 write 模式
          const file = fs.createWriteStream(msiPath, startOffset > 0 ? { flags: 'a' } : {})

          file.on('error', (err) => {
            res.destroy()
            reject(new Error(`写入文件失败: ${err.message}`))
          })

          // 发送初始进度（续传时立即显示已有进度）
          if (totalSize > 0 && startOffset > 0) {
            onProgress(Math.round((startOffset / totalSize) * 100), formatBytes(startOffset), formatBytes(totalSize))
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
              // 验证下载完整性
              if (totalSize > 0 && downloaded !== totalSize) {
                reject(new Error(`下载不完整: 预期 ${formatBytes(totalSize)}，实际 ${formatBytes(downloaded)}`))
                return
              }
              emitLog(`下载完成: ${msiPath} (${formatBytes(downloaded)})`)
              onLog(`下载完成！(${formatBytes(downloaded)})`)
              onProgress(100, formatBytes(downloaded), formatBytes(totalSize || downloaded))
              resolve()
            })
          })

          res.on('error', (err) => {
            file.end()
            reject(err)
          })
        }).on('error', reject)
      }
      doDownload(downloadUrl, existingSize)
    })

    return { success: true, msiPath, version: nodeVersion }
  } catch (err) {
    emitLog(`Node.js MSI 下载失败: ${err.message}`, 'error')
    onLog(`下载失败: ${err.message}`)
    return { success: false, error: err.message }
  }
}

/**
 * 静默安装 Node.js MSI（自动配置 PATH）
 * @param {object} executor - 执行器实例（可为 null，将使用 child_process）
 * @param {object} [options] - 选项
 * @param {string} [options.installDir] - 自定义安装目录，默认 C:\Program Files\nodejs
 * @param {function} [options.onProgress] - 进度回调
 * @param {function} [options.onLog] - 日志回调
 * @returns {Promise<{success: boolean, version?: string, installDir?: string, error?: string}>}
 */
async function installNodeSilent(executor, options = {}) {
  const { execFile } = require('child_process')
  const path = require('path')
  const onLog = options.onLog || (() => {})
  const onProgress = options.onProgress || (() => {})

  try {
    // 1. 下载 MSI
    onLog('步骤 1/3: 下载 Node.js 安装包...')
    emitLog('开始自动安装 Node.js...')
    const dlResult = await downloadNodeMsi(executor, { onProgress, onLog })
    if (!dlResult.success) {
      return { success: false, error: dlResult.error }
    }

    const msiPath = dlResult.msiPath
    const nodeVersion = dlResult.version
    const installDir = options.installDir || 'C:\\Program Files\\nodejs'

    // 2. 静默安装（msiexec /i ... /qn 全自动，不弹窗）
    onLog(`步骤 2/3: 正在静默安装 Node.js v${nodeVersion} 到 ${installDir}...`)
    emitLog(`正在静默安装: msiexec /i "${msiPath}" /qn INSTALLDIR="${installDir}"`)

    await new Promise((resolve, reject) => {
      const args = ['/i', msiPath, '/qn', '/norestart', `INSTALLDIR=${installDir}`]
      const child = execFile('msiexec', args, { timeout: 300000 }, (err, stdout, stderr) => {
        if (err) {
          // msiexec 返回 3010 表示需要重启但安装成功
          if (err.code === 3010) {
            onLog('安装完成（建议重启系统以确保 PATH 生效）')
            resolve()
          } else {
            reject(new Error(`msiexec 安装失败 (code ${err.code}): ${stderr || err.message}`))
          }
          return
        }
        resolve()
      })
    })

    onLog(`步骤 3/3: 验证安装...`)
    emitLog('MSI 安装完成，正在验证...')

    // 3. 验证：直接用绝对路径检查，因为新进程可能还没有更新的 PATH
    const nodeBin = path.join(installDir, 'node.exe')
    const fs = require('fs')
    if (fs.existsSync(nodeBin)) {
      // 获取版本号
      const version = await new Promise((resolve) => {
        execFile(nodeBin, ['--version'], { timeout: 5000 }, (err, stdout) => {
          resolve(err ? nodeVersion : stdout.trim().replace(/^v/, ''))
        })
      })

      emitLog(`Node.js v${version} 安装成功！位置: ${installDir}`)
      onLog(`Node.js v${version} 安装成功！`)

      // 确保 PATH 中包含 nodejs 目录（当前进程立即生效）
      if (!process.env.PATH.includes(installDir)) {
        process.env.PATH = `${installDir};${process.env.PATH}`
        emitLog(`已将 ${installDir} 添加到当前进程 PATH`)
      }

      return { success: true, version, installDir }
    }

    throw new Error('安装完成但未找到 node.exe，请检查安装目录')
  } catch (err) {
    emitLog(`Node.js 自动安装失败: ${err.message}`, 'error')
    onLog(`安装失败: ${err.message}`)
    return { success: false, error: err.message }
  }
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
      res.on('data', (chunk) => { data += chunk })
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
    const req = reqModule.request({
      method: 'HEAD',
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
    }, (res) => {
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
    })
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
  installNodeSilent,
  installOpenClaw,
  runOnboard,
  downloadNodeMsi,
  detectRegion,
  getRecommendedRegistry,
}
