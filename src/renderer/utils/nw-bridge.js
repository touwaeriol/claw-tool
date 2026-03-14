/**
 * NW.js 桥接模块
 * 使用 nw.require 加载 Node.js 主进程模块，绕过 Vite 编译
 * 所有对 Node.js 后端的访问都通过此模块
 */

let _cache = null
let _root = null

/**
 * 获取项目根目录（package.json 所在目录）
 */
function getRoot() {
  if (_root) return _root
  if (typeof nw === 'undefined') return null
  const path = nw.require('path')
  _root = nw.__dirname
  return _root
}

/**
 * 安全加载模块
 */
function safeRequire(modulePath) {
  try {
    const path = nw.require('path')
    return nw.require(path.resolve(getRoot(), modulePath))
  } catch (err) {
    console.warn(`[nw-bridge] 加载失败: ${modulePath}`, err.message)
    return null
  }
}

/**
 * 获取后端模块（懒加载 + 缓存）
 * @returns {object|null} 后端模块集合
 */
export function getBackend() {
  if (_cache) return _cache

  if (typeof nw === 'undefined' || !nw.require) {
    console.warn('[nw-bridge] 非 NW.js 环境，后端模块不可用')
    return null
  }

  try {
    // 核心模块
    const pmMod = safeRequire('src/main/process-manager')
    const dmMod = safeRequire('src/main/daemon')
    const efMod = safeRequire('src/executor/executor-factory')
    const ipcMod = safeRequire('src/shared/ipc')
    const installerMod = safeRequire('src/main/installer')

    // 功能模块
    const serverMod = safeRequire('src/main/server')
    const proxyMod = safeRequire('src/main/proxy-manager')
    const monitorMod = safeRequire('src/main/monitor')
    const channelTesterMod = safeRequire('src/main/channel-tester')
    const skillManagerMod = safeRequire('src/main/skill-manager')
    const instancesMgrMod = safeRequire('src/main/instances-manager')
    const configMgrMod = safeRequire('src/main/config-manager')
    // 用 localExecutor 创建 ConfigManager 实例
    const configManagerInstance = (configMgrMod?.ConfigManager && efMod?.localExecutor)
      ? new configMgrMod.ConfigManager(efMod.localExecutor)
      : null
    const appUpdaterMod = safeRequire('src/main/updater-app')
    const openclawUpdaterMod = safeRequire('src/main/updater-openclaw')
    const providerAuthMod = safeRequire('src/main/provider-auth')
    const channelTestRecordsMod = safeRequire('src/main/channel-test-records')
    const workspaceManagerMod = safeRequire('src/main/workspace-manager')

    // npm 包
    let markdownIt = null
    try { markdownIt = nw.require('markdown-it') } catch { /* optional */ }

    _cache = {
      // 核心
      processManager: pmMod?.processManager ?? null,
      daemonManager: dmMod?.daemonManager ?? null,
      localExecutor: efMod?.localExecutor ?? null,
      getExecutor: efMod?.getExecutor ?? null,
      removeExecutor: efMod?.removeExecutor ?? null,
      eventBus: ipcMod?.eventBus ?? null,
      Events: ipcMod?.Events ?? null,
      installer: installerMod,

      // 功能
      httpServer: serverMod,
      proxyManager: proxyMod,
      monitor: monitorMod,
      channelTester: channelTesterMod,
      skillManager: skillManagerMod,
      instancesManager: instancesMgrMod,
      configManager: configManagerInstance,
      appUpdater: appUpdaterMod,
      openclawUpdater: openclawUpdaterMod,
      providerAuth: providerAuthMod,
      channelTestRecords: channelTestRecordsMod,
      workspaceManager: workspaceManagerMod,

      // npm 包
      MarkdownIt: markdownIt,

      // Node.js 内置模块
      os: nw.require('os'),
      fs: nw.require('fs').promises,
      fsSync: nw.require('fs'),
      path: nw.require('path'),
      childProcess: nw.require('child_process'),
      crypto: nw.require('crypto'),
    }

    console.log('[nw-bridge] 后端模块加载成功')
    return _cache
  } catch (err) {
    console.error('[nw-bridge] 后端模块加载失败:', err)
    return null
  }
}

/**
 * 检查是否在 NW.js 环境中
 */
export function isNwjs() {
  return typeof nw !== 'undefined'
}

/**
 * 获取 NW.js 应用根目录
 */
export function getAppRoot() {
  return getRoot() || ''
}

/**
 * 打开外部链接
 */
export function openExternal(url) {
  if (typeof nw !== 'undefined' && nw.Shell) {
    nw.Shell.openExternal(url)
  } else {
    window.open(url, '_blank')
  }
}
