/**
 * OpenClaw 发现模块
 * 扫描系统中已安装的 openclaw 命令和服务，兼容所有官方安装方式
 *
 * 统一 API：
 *   findOpenClaw()        → { found, binPath, binDir, method }
 *   findOpenClawService() → { installed, method, detail }
 *   getDiscoveredDirs()   → string[]  (已发现的 openclaw 所在目录列表)
 *
 * 平台实现：
 *   Windows: 注册表自启、npm global(%APPDATA%\npm)、.claw-tool、.local\bin、.openclaw\bin
 *   macOS:   launchd plist、Homebrew、npm global、.claw-tool、.local/bin、.openclaw/bin
 */

const path = require('path')
const fs = require('fs')
const os = require('os')
const { execSync } = require('child_process')

// 缓存扫描结果
let _cachedResult = null
let _cachedService = null

/**
 * 获取 openclaw 可执行文件名（平台相关）
 */
function getOpenClawExeName() {
  return process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw'
}

// ─── Windows 平台扫描 ────────────────────────────────────

function _scanWindows() {
  const home = os.homedir()
  const exeName = 'openclaw.cmd'
  const candidates = [
    // Claw-Tool 内置 npm 全局安装
    {
      dir: path.join(home, '.claw-tool', 'node_global'),
      method: 'claw-tool',
    },
    // npm 全局安装（标准位置）
    {
      dir: path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm'),
      method: 'npm-global',
    },
    // 官方 install.ps1 (git 模式)
    {
      dir: path.join(home, '.local', 'bin'),
      method: 'install-script-git',
    },
    // 官方 install-cli（如果在 Windows 上使用 WSL 安装后手动复制）
    {
      dir: path.join(home, '.openclaw', 'bin'),
      method: 'install-cli',
    },
  ]

  // 也检查 .mjs 入口（pnpm link / 源码构建）
  const altNames = ['openclaw.cmd', 'openclaw.ps1', 'openclaw']

  for (const { dir, method } of candidates) {
    for (const name of altNames) {
      const binPath = path.join(dir, name)
      try {
        if (fs.existsSync(binPath)) {
          return { found: true, binPath, binDir: dir, method }
        }
      } catch {
        /* 目录不可访问 */
      }
    }
  }

  // 最后通过 PATH 查找（where 命令）
  try {
    const result = execSync('where openclaw', {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    const firstLine = result.split('\n')[0].trim()
    if (firstLine && fs.existsSync(firstLine)) {
      return {
        found: true,
        binPath: firstLine,
        binDir: path.dirname(firstLine),
        method: 'system-path',
      }
    }
  } catch {
    /* where 找不到 */
  }

  return { found: false, binPath: null, binDir: null, method: null }
}

/**
 * Windows: 检测 openclaw 系统服务/自启配置
 */
function _findServiceWindows() {
  // 检查注册表开机自启
  try {
    const regKey = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'
    const result = execSync(`reg query "${regKey}" /v OpenClawDaemon`, {
      encoding: 'utf-8',
      timeout: 5000,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    if (result.includes('OpenClawDaemon')) {
      // 提取路径
      const match = result.match(/REG_SZ\s+(.+)/)
      const detail = match ? match[1].trim() : ''
      return { installed: true, method: 'registry-autostart', detail }
    }
  } catch {
    /* 注册表项不存在 */
  }

  return { installed: false, method: null, detail: null }
}

// ─── macOS 平台扫描 ──────────────────────────────────────

function _scanMacOS() {
  const home = os.homedir()
  const exeName = 'openclaw'
  const candidates = [
    // Claw-Tool 内置 npm 全局安装
    {
      dir: path.join(home, '.claw-tool', 'node_global', 'bin'),
      method: 'claw-tool',
    },
    // Homebrew (Apple Silicon)
    {
      dir: '/opt/homebrew/bin',
      method: 'homebrew',
    },
    // Homebrew (Intel) / npm 官方 pkg 安装
    {
      dir: '/usr/local/bin',
      method: 'npm-global',
    },
    // 官方 install.sh (git 模式)
    {
      dir: path.join(home, '.local', 'bin'),
      method: 'install-script-git',
    },
    // 官方 install-cli.sh
    {
      dir: path.join(home, '.openclaw', 'bin'),
      method: 'install-cli',
    },
  ]

  for (const { dir, method } of candidates) {
    const binPath = path.join(dir, exeName)
    try {
      if (fs.existsSync(binPath)) {
        return { found: true, binPath, binDir: dir, method }
      }
    } catch {
      /* 目录不可访问 */
    }
  }

  // 最后通过 PATH 查找（which 命令）
  try {
    const result = execSync('which openclaw', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim()
    if (result && fs.existsSync(result)) {
      return {
        found: true,
        binPath: result,
        binDir: path.dirname(result),
        method: 'system-path',
      }
    }
  } catch {
    /* which 找不到 */
  }

  return { found: false, binPath: null, binDir: null, method: null }
}

/**
 * macOS: 检测 openclaw launchd 服务
 */
function _findServiceMacOS() {
  const home = os.homedir()

  // 用户级 LaunchAgent
  const userPlist = path.join(home, 'Library', 'LaunchAgents', 'com.openclaw.daemon.plist')
  if (fs.existsSync(userPlist)) {
    return { installed: true, method: 'launchd-user', detail: userPlist }
  }

  // 系统级 LaunchDaemon
  const sysPlist = '/Library/LaunchDaemons/com.openclaw.daemon.plist'
  if (fs.existsSync(sysPlist)) {
    return { installed: true, method: 'launchd-system', detail: sysPlist }
  }

  return { installed: false, method: null, detail: null }
}

// ─── 统一 API ────────────────────────────────────────────

/**
 * 扫描系统中已安装的 openclaw 命令
 * @param {boolean} [forceRefresh=false] - 强制重新扫描（忽略缓存）
 * @returns {{ found: boolean, binPath: string|null, binDir: string|null, method: string|null }}
 *   method: 'claw-tool' | 'npm-global' | 'homebrew' | 'install-script-git' | 'install-cli' | 'system-path'
 */
function findOpenClaw(forceRefresh = false) {
  if (_cachedResult && !forceRefresh) return _cachedResult

  if (process.platform === 'win32') {
    _cachedResult = _scanWindows()
  } else if (process.platform === 'darwin') {
    _cachedResult = _scanMacOS()
  } else {
    _cachedResult = { found: false, binPath: null, binDir: null, method: null }
  }

  return _cachedResult
}

/**
 * 检测 openclaw 系统服务/自启配置
 * @param {boolean} [forceRefresh=false] - 强制重新检测
 * @returns {{ installed: boolean, method: string|null, detail: string|null }}
 *   method: 'registry-autostart' | 'launchd-user' | 'launchd-system'
 */
function findOpenClawService(forceRefresh = false) {
  if (_cachedService && !forceRefresh) return _cachedService

  if (process.platform === 'win32') {
    _cachedService = _findServiceWindows()
  } else if (process.platform === 'darwin') {
    _cachedService = _findServiceMacOS()
  } else {
    _cachedService = { installed: false, method: null, detail: null }
  }

  return _cachedService
}

/**
 * 获取所有应加入 PATH 的 openclaw 相关目录
 * 基于实际扫描结果，而非盲目添加候选路径
 * @returns {string[]} 已确认包含 openclaw 的目录
 */
function getDiscoveredDirs() {
  const dirs = []
  const result = findOpenClaw()
  if (result.found && result.binDir) {
    dirs.push(result.binDir)
  }
  return dirs
}

/**
 * 清除缓存（用于安装/卸载后重新检测）
 */
function clearCache() {
  _cachedResult = null
  _cachedService = null
}

module.exports = {
  findOpenClaw,
  findOpenClawService,
  getDiscoveredDirs,
  getOpenClawExeName,
  clearCache,
}
