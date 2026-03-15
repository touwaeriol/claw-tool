/**
 * 系统托盘管理
 * 提供托盘图标（根据状态变色）、右键菜单和窗口最小化到托盘功能
 * 使用 NW.js 的 nw.Tray API
 */

const { eventBus, Events } = require('../shared/ipc')
const { t, setLocale } = require('../shared/i18n')

let tray = null
// 当前服务状态：'running' | 'stopped' | 'error'
let currentStatus = 'stopped'
// 关闭时是否最小化到托盘（默认 true）
let _minimizeToTray = true
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
    tooltip: t('tray.tooltip', { status: t('tray.gatewayStopped') }),
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

  // 监听最小化到托盘设置变更
  eventBus.on('settings:minimize-to-tray', (value) => {
    _minimizeToTray = value
  })

  // 监听语言切换事件，重建托盘菜单
  eventBus.on(Events.LOCALE_CHANGED, (lang) => {
    setLocale(lang)
    if (tray) {
      tray.menu = buildMenu()
      tray.tooltip = t('tray.tooltip', { status: getStatusLabel() })
    }
  })

  // 监听渲染端窗口就绪后注册关闭行为
  eventBus.on('window:ready', () => {
    setupCloseToTray()
  })

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
      label: t('tray.showWindow'),
      click: () => showWindow(),
    }),
  )

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // Gateway 状态（只读显示）
  menu.append(
    new nw.MenuItem({
      label: getStatusLabel(),
      enabled: false,
    }),
  )

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // Gateway 启停控制
  menu.append(
    new nw.MenuItem({
      label: t('tray.startGateway'),
      click: () => {
        eventBus.emit('tray:start-gateway')
      },
    }),
  )

  menu.append(
    new nw.MenuItem({
      label: t('tray.stopGateway'),
      click: () => {
        eventBus.emit('tray:stop-gateway')
      },
    }),
  )

  menu.append(
    new nw.MenuItem({
      label: t('tray.restartGateway'),
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
          label: t('tray.openclawUpdate', { version: openclawLatestVersion }),
          click: () => showWindow(),
        }),
      )
    }
    if (appUpdateAvailable && appLatestVersion) {
      menu.append(
        new nw.MenuItem({
          label: t('tray.appUpdate', { version: appLatestVersion }),
          click: () => showWindow(),
        }),
      )
    }
  }

  menu.append(new nw.MenuItem({ type: 'separator' }))

  // 检查更新
  menu.append(
    new nw.MenuItem({
      label: t('tray.checkUpdate'),
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
      label: t('tray.quit'),
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
      return t('tray.gatewayRunning')
    case 'error':
      return t('tray.gatewayError')
    default:
      return t('tray.gatewayStopped')
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
  tray.tooltip = t('tray.tooltip', { status: getStatusLabel() })

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
 * 设置关闭窗口时根据用户设置决定行为
 * - minimizeToTray = true → 隐藏窗口到托盘（后台运行）
 * - minimizeToTray = false → 退出应用
 */
function setupCloseToTray() {
  if (typeof nw === 'undefined') return

  const win = nw.Window.get()
  if (!win) return

  win.on('close', function () {
    if (_minimizeToTray) {
      // 最小化到托盘，后台继续运行
      hideWindow()
    } else {
      // 真正退出应用
      eventBus.emit(Events.TRAY_QUIT)
      setTimeout(() => {
        nw.App.quit()
      }, 500)
    }
  })
}

/**
 * 设置是否关闭时最小化到托盘
 * @param {boolean} value
 */
function setMinimizeToTray(value) {
  _minimizeToTray = value
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
  setMinimizeToTray,
}
