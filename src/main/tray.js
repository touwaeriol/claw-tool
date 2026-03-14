/**
 * 系统托盘管理
 * 提供托盘图标（根据状态变色）、右键菜单和窗口最小化到托盘功能
 * 使用 NW.js 的 nw.Tray API
 */

const { eventBus, Events } = require('../shared/ipc')

let tray = null
// 当前服务状态：'running' | 'stopped' | 'error'
let currentStatus = 'stopped'
// OpenClaw 是否有可用更新
let openclawUpdateAvailable = false
let openclawLatestVersion = ''
let appUpdateAvailable = false
let appLatestVersion = ''

/**
 * 初始化系统托盘
 */
function initTray() {
  // NW.js 环境检测
  if (typeof nw === 'undefined') {
    console.log('[托盘] 非 NW.js 环境，跳过托盘初始化')
    return
  }

  // 创建托盘菜单
  const menu = buildMenu()

  tray = new nw.Tray({
    title: 'Claw Tool',
    tooltip: 'Claw Tool - OpenClaw 管理工具 (已停止)',
    menu: menu,
  })

  // 点击托盘图标显示窗口
  tray.on('click', () => {
    showWindow()
  })

  // 监听服务状态变化，更新托盘
  eventBus.on(Events.SERVICE_STATUS_CHANGED, (status) => {
    updateTrayStatus(status.running ? 'running' : 'stopped')
  })

  // 监听 OpenClaw 更新可用事件
  eventBus.on('openclaw:update-available', (info) => {
    openclawUpdateAvailable = true
    openclawLatestVersion = info.latestVersion || ''
    // 重建菜单以显示更新提示
    if (tray) tray.menu = buildMenu()
  })

  // 更新完成后清除提示
  eventBus.on('openclaw:update-complete', () => {
    openclawUpdateAvailable = false
    openclawLatestVersion = ''
    if (tray) tray.menu = buildMenu()
  })

  // 监听应用自身更新可用事件
  eventBus.on('app:update-available', (info) => {
    appUpdateAvailable = true
    appLatestVersion = info.latestVersion || ''
    if (tray) tray.menu = buildMenu()
  })

  // 拦截窗口关闭事件，最小化到托盘而非退出
  setupCloseToTray()

  console.log('[托盘] 系统托盘已初始化')
}

/**
 * 构建右键菜单
 */
function buildMenu() {
  const menu = new nw.Menu()

  // 显示/隐藏窗口
  menu.append(
    new nw.MenuItem({
      label: '显示主窗口',
      click: () => showWindow(),
    }),
  )

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // Gateway 状态（只读显示）
  menu.append(
    new nw.MenuItem({
      label: `Gateway: ${getStatusLabel()}`,
      enabled: false,
    }),
  )

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // Gateway 启停控制
  menu.append(
    new nw.MenuItem({
      label: '启动 Gateway',
      click: () => {
        eventBus.emit('tray:start-gateway')
      },
    }),
  )

  menu.append(
    new nw.MenuItem({
      label: '停止 Gateway',
      click: () => {
        eventBus.emit('tray:stop-gateway')
      },
    }),
  )

  menu.append(
    new nw.MenuItem({
      label: '重启 Gateway',
      click: () => {
        eventBus.emit('tray:restart-gateway')
      },
    }),
  )

  // 更新提示
  if (openclawUpdateAvailable || appUpdateAvailable) {
    menu.append(new nw.MenuItem({ type: 'separator' }))
    if (openclawUpdateAvailable && openclawLatestVersion) {
      menu.append(
        new nw.MenuItem({
          label: `OpenClaw 有新版本: ${openclawLatestVersion}`,
          click: () => showWindow(),
        }),
      )
    }
    if (appUpdateAvailable && appLatestVersion) {
      menu.append(
        new nw.MenuItem({
          label: `Claw Tool 有新版本: ${appLatestVersion}`,
          click: () => showWindow(),
        }),
      )
    }
  }

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // 检查更新
  menu.append(
    new nw.MenuItem({
      label: '检查更新',
      click: () => {
        showWindow()
        eventBus.emit('tray:check-update')
      },
    }),
  )

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // 退出
  menu.append(
    new nw.MenuItem({
      label: '退出 Claw Tool',
      click: () => {
        // 发送退出事件让主进程清理资源
        eventBus.emit(Events.TRAY_QUIT)
        // 延迟退出确保清理完成
        setTimeout(() => {
          nw.App.quit()
        }, 500)
      },
    }),
  )

  return menu
}

/**
 * 获取状态标签文本
 */
function getStatusLabel() {
  switch (currentStatus) {
    case 'running':
      return '运行中'
    case 'error':
      return '异常'
    default:
      return '已停止'
  }
}

/**
 * 更新托盘状态（图标颜色、tooltip、菜单）
 * @param {'running'|'stopped'|'error'} status
 */
function updateTrayStatus(status) {
  currentStatus = status
  if (!tray) return

  // 更新 tooltip
  const statusLabel = getStatusLabel()
  tray.tooltip = `Claw Tool - OpenClaw 管理工具 (${statusLabel})`

  // 重建菜单以更新状态显示
  tray.menu = buildMenu()
}

/**
 * 显示主窗口
 */
function showWindow() {
  if (typeof nw === 'undefined') return
  const win = nw.Window.get()
  if (win) {
    win.show()
    win.focus()
  }
}

/**
 * 隐藏主窗口（最小化到托盘）
 */
function hideWindow() {
  if (typeof nw === 'undefined') return
  const win = nw.Window.get()
  if (win) {
    win.hide()
  }
}

/**
 * 设置关闭窗口时最小化到托盘
 */
function setupCloseToTray() {
  if (typeof nw === 'undefined') return

  const win = nw.Window.get()
  if (!win) return

  win.on('close', function () {
    // 最小化到托盘而非退出
    hideWindow()
    // 注意：不调用 this.close(true)，这样窗口只是隐藏
  })
}

/**
 * 销毁托盘
 */
function destroyTray() {
  if (tray) {
    tray.remove()
    tray = null
  }
}

/**
 * 获取当前托盘实例
 */
function getTray() {
  return tray
}

module.exports = {
  initTray,
  destroyTray,
  getTray,
  updateTrayStatus,
  showWindow,
  hideWindow,
}
