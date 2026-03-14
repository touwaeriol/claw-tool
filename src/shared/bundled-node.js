/**
 * 内嵌 Node.js 路径发现模块
 * 检测应用安装目录中的 bundled Node.js，构造 PATH 和环境变量
 */

const path = require('path')
const fs = require('fs')
const os = require('os')

// 缓存结果，避免重复检测
let _cached = null

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
 * 获取增强的环境变量（PATH + NPM_CONFIG_PREFIX）
 * @returns {object} 需要注入的环境变量
 */
function getEnhancedEnv() {
  const bundled = getBundledNodePaths()
  if (!bundled.found) return {}

  const globalPrefix = getGlobalPrefix()
  const globalBin = getGlobalBinDir()
  const currentPath = process.env.PATH || process.env.Path || ''
  const newPath = `${bundled.nodeDir}${path.delimiter}${globalBin}${path.delimiter}${currentPath}`

  // 确保全局前缀目录存在
  try {
    if (!fs.existsSync(globalPrefix)) {
      fs.mkdirSync(globalPrefix, { recursive: true })
    }
  } catch { /* 忽略 */ }

  return {
    PATH: newPath,
    Path: newPath,
    NPM_CONFIG_PREFIX: globalPrefix,
  }
}

module.exports = {
  getBundledNodePaths,
  getGlobalPrefix,
  getGlobalBinDir,
  getEnhancedEnv,
}
