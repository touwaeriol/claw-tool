/**
 * 内嵌 Node.js 路径发现模块
 * 检测应用安装目录中的 bundled Node.js，构造 PATH 和环境变量
 *
 * 优先级策略：
 *   1. 系统已安装的 Node.js（用户自行安装的）
 *   2. 内置 Node.js（作为兜底，放在 PATH 末尾）
 *
 * 这样可以：
 *   - 兼容用户已有的 Node.js + OpenClaw 环境
 *   - 没有系统 Node.js 时自动 fallback 到内置版本
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

// 缓存结果，避免重复检测
let _cached = null
let _hasSystemNode = null

/**
 * 检测 bundled Node.js 的路径
 * @returns {{ found: boolean, nodeDir: string|null }}
 */
function getBundledNodePaths() {
  if (_cached) return _cached

  const platform = process.platform
  let nodeDir = null

  if (platform === 'win32') {
    // Windows: node/ 与 claw-tool.exe 同级
    nodeDir = path.join(path.dirname(process.execPath), 'node')
    const nodeExe = path.join(nodeDir, 'node.exe')
    if (fs.existsSync(nodeExe)) {
      _cached = { found: true, nodeDir }
      return _cached
    }
  } else if (platform === 'darwin') {
    // macOS: .app/Contents/MacOS/nwjs → .app/Contents/Resources/node/bin/
    const resourcesNode = path.resolve(path.dirname(process.execPath), '..', 'Resources', 'node')
    const nodeBin = path.join(resourcesNode, 'bin', 'node')
    if (fs.existsSync(nodeBin)) {
      nodeDir = path.join(resourcesNode, 'bin')
      _cached = { found: true, nodeDir }
      return _cached
    }
  }

  _cached = { found: false, nodeDir: null }
  return _cached
}

/**
 * 检测系统是否已安装 Node.js（不含内置版本）
 * 遍历原始 PATH 中的目录，查找 node 可执行文件
 * @returns {boolean}
 */
function hasSystemNode() {
  if (_hasSystemNode !== null) return _hasSystemNode

  const bundled = getBundledNodePaths()
  const currentPath = process.env.PATH || process.env.Path || ''
  const dirs = currentPath.split(path.delimiter)
  const nodeExe = process.platform === 'win32' ? 'node.exe' : 'node'

  for (const dir of dirs) {
    if (!dir) continue
    // 跳过内置 node 所在目录
    if (bundled.found && path.resolve(dir) === path.resolve(bundled.nodeDir)) continue
    try {
      if (fs.existsSync(path.join(dir, nodeExe))) {
        _hasSystemNode = true
        return true
      }
    } catch {
      /* 忽略不可访问的目录 */
    }
  }

  _hasSystemNode = false
  return false
}

/**
 * 获取 npm 全局安装前缀目录（用户可写）
 * @returns {string}
 */
function getGlobalPrefix() {
  return path.join(os.homedir(), '.claw-tool', 'node_global')
}

/**
 * 获取 npm 全局 bin 目录
 * @returns {string}
 */
function getGlobalBinDir() {
  const prefix = getGlobalPrefix()
  return process.platform === 'win32' ? prefix : path.join(prefix, 'bin')
}

/**
 * 获取 OpenClaw 官方安装脚本可能使用的路径
 * 覆盖 install.sh / install-cli.sh / install.ps1 的各种安装方式
 * @returns {string[]} 可能包含 openclaw 的目录列表
 */
function getOpenClawSearchPaths() {
  const home = os.homedir()
  const paths = []

  // install-cli.sh 默认安装路径: ~/.openclaw/bin
  const openclawBin = path.join(home, '.openclaw', 'bin')
  if (fs.existsSync(openclawBin)) paths.push(openclawBin)

  // install.sh / install.ps1 (git 模式): ~/.local/bin
  const localBin = path.join(home, '.local', 'bin')
  if (fs.existsSync(localBin)) paths.push(localBin)

  return paths
}

/**
 * 获取增强的环境变量（PATH + NPM_CONFIG_PREFIX）
 *
 * 策略：
 *   - 系统有 Node.js → 内置 node 放 PATH 末尾（兜底），不设 NPM_CONFIG_PREFIX
 *   - 系统无 Node.js → 内置 node 放 PATH 末尾，设 NPM_CONFIG_PREFIX 避免权限问题
 *
 * @returns {object} 需要注入的环境变量
 */
function getEnhancedEnv() {
  const bundled = getBundledNodePaths()
  const globalBin = getGlobalBinDir()
  const currentPath = process.env.PATH || process.env.Path || ''
  const openclawPaths = getOpenClawSearchPaths()

  // 即使没有 bundled node，也需要将官方安装路径加入 PATH
  const extraPaths = [globalBin, ...openclawPaths]
  if (bundled.found) {
    extraPaths.push(bundled.nodeDir)
  }

  // 跳过已在 PATH 中的目录，避免重复
  const existingDirs = new Set(currentPath.split(path.delimiter).map((d) => path.resolve(d)))
  const newDirs = extraPaths.filter((d) => d && !existingDirs.has(path.resolve(d)))

  if (newDirs.length === 0 && bundled.found) {
    // 无需修改 PATH，但可能需要设 NPM_CONFIG_PREFIX
  } else if (newDirs.length === 0) {
    return {}
  }

  const newPath =
    newDirs.length > 0
      ? `${currentPath}${path.delimiter}${newDirs.join(path.delimiter)}`
      : currentPath

  const env = {
    PATH: newPath,
    Path: newPath,
  }

  // 仅在没有系统 Node.js 时设置自定义 npm 全局前缀
  // 有系统 Node.js 时让 npm 使用默认位置（通常已在系统 PATH 中）
  if (!hasSystemNode()) {
    const globalPrefix = getGlobalPrefix()
    env.NPM_CONFIG_PREFIX = globalPrefix

    // 确保全局前缀目录存在
    try {
      if (!fs.existsSync(globalPrefix)) {
        fs.mkdirSync(globalPrefix, { recursive: true })
      }
    } catch {
      /* 忽略 */
    }
  }

  return env
}

module.exports = {
  getBundledNodePaths,
  hasSystemNode,
  getGlobalPrefix,
  getGlobalBinDir,
  getOpenClawSearchPaths,
  getEnhancedEnv,
}
