/**
 * 进程间通信（NW.js 共享上下文）
 *
 * NW.js 的 mixed-context 模式下，主进程和渲染进程共享 Node.js 上下文，
 * 使用 EventEmitter 作为事件总线进行通信。
 */

const { EventEmitter } = require('events')

// 全局事件总线单例
const eventBus = new EventEmitter()

// 提高最大监听器数量（避免内存泄漏警告）
eventBus.setMaxListeners(50)

// 事件名称常量
const Events = {
  // 服务状态变化
  SERVICE_STATUS_CHANGED: 'service:status-changed',
  // 日志新增
  LOG_ENTRY: 'log:entry',
  // 配置文件变化
  CONFIG_CHANGED: 'config:changed',
  // 托盘操作
  TRAY_SHOW_WINDOW: 'tray:show-window',
  TRAY_QUIT: 'tray:quit',
  // 实例切换
  INSTANCE_CHANGED: 'instance:changed',
  INSTANCE_CONNECTION_STATUS: 'instance:connection-status',
  // 安装模块事件
  INSTALLER_PROGRESS: 'installer:progress',
  INSTALLER_LOG: 'installer:log',
  INSTALLER_COMPLETE: 'installer:complete',
  INSTALLER_ERROR: 'installer:error',
  // OpenClaw 更新事件
  OPENCLAW_UPDATE_AVAILABLE: 'openclaw:update-available',
  OPENCLAW_UPDATE_PROGRESS: 'openclaw:update-progress',
  OPENCLAW_UPDATE_COMPLETE: 'openclaw:update-complete',
  OPENCLAW_UPDATE_ERROR: 'openclaw:update-error',
  // 应用自身更新事件
  APP_UPDATE_AVAILABLE: 'app:update-available',
  APP_DOWNLOAD_PROGRESS: 'app:download-progress',
  APP_DOWNLOAD_COMPLETE: 'app:download-complete',
  APP_UPDATE_ERROR: 'app:update-error',
  // 托盘检查更新
  TRAY_CHECK_UPDATE: 'tray:check-update',
}

module.exports = { eventBus, Events }
