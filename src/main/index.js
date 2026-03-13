/**
 * NW.js 主进程入口（node-main）
 * 负责初始化后台服务：系统托盘、Express HTTP 服务、进程管理等
 */

const { initTray, updateTrayStatus } = require('./tray')
const { createServer, startServer, stopServer } = require('./server')
const { processManager } = require('./process-manager')
const { localExecutor } = require('../executor/executor-factory')
const { eventBus, Events } = require('../shared/ipc')
const { loadProxyConfig } = require('./proxy-manager')
const { checkForAppUpdate, AppUpdateEvents } = require('./updater-app')
const { startAutoCheck: startOpenClawAutoCheck } = require('./updater-openclaw')

// 等待 NW.js 窗口就绪后初始化
function init() {
  console.log('[主进程] Claw Tool 启动')

  // 加载代理配置
  loadProxyConfig().catch(err => {
    console.warn('[主进程] 加载代理配置失败:', err.message)
  })

  // 初始化系统托盘
  initTray()

  // 创建并启动 Express HTTP 远程服务（端口 5678）
  createServer()
  startServer().catch(err => {
    console.warn('[主进程] HTTP 远程服务启动失败:', err.message)
  })

  // 启动 OpenClaw 自动版本检查
  startOpenClawAutoCheck(() => localExecutor)

  // 延迟 10 秒后检查应用自身更新
  setTimeout(async () => {
    try {
      await checkForAppUpdate()
    } catch (err) {
      console.warn('[主进程] 检查应用更新失败:', err.message)
    }
  }, 10000)

  // 监听托盘菜单的 Gateway 操作
  eventBus.on('tray:start-gateway', async () => {
    try {
      await processManager.startForeground(localExecutor)
    } catch (err) {
      console.error('[主进程] 托盘启动 Gateway 失败:', err.message)
    }
  })

  eventBus.on('tray:stop-gateway', async () => {
    try {
      await processManager.stop(localExecutor)
    } catch (err) {
      console.error('[主进程] 托盘停止 Gateway 失败:', err.message)
    }
  })

  eventBus.on('tray:restart-gateway', async () => {
    try {
      await processManager.restart(localExecutor)
    } catch (err) {
      console.error('[主进程] 托盘重启 Gateway 失败:', err.message)
    }
  })

  // 监听退出事件
  eventBus.on(Events.TRAY_QUIT, async () => {
    await processManager.dispose()
    await stopServer()
  })

  // 注册应用退出时的清理逻辑
  process.on('exit', () => {
    processManager.dispose()
    stopServer()
  })
}

// NW.js node-main 在窗口创建前执行
// 使用 nw.Window.get() 需等待窗口就绪
init()
