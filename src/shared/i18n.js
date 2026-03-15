/**
 * 轻量 i18n 模块（主进程专用）
 * 不依赖 vue-i18n，供 tray.js 等主进程模块使用
 */

const messages = {
  'zh-CN': {
    // 托盘菜单
    'tray.showWindow': '显示主窗口',
    'tray.gateway': 'Gateway',
    'tray.startGateway': '启动 Gateway',
    'tray.stopGateway': '停止 Gateway',
    'tray.restartGateway': '重启 Gateway',
    'tray.checkUpdate': '检查更新',
    'tray.quit': '退出 Claw Tool',
    'tray.gatewayRunning': 'Gateway: 运行中',
    'tray.gatewayStopped': 'Gateway: 已停止',
    'tray.gatewayStarting': 'Gateway: 启动中...',
    'tray.gatewayStopping': 'Gateway: 停止中...',
    'tray.gatewayError': 'Gateway: 错误',
    'tray.openclawUpdate': 'OpenClaw 有新版本: {version}',
    'tray.appUpdate': 'Claw Tool 有新版本: {version}',
    'tray.tooltip': 'Claw Tool - OpenClaw 管理工具 ({status})',
  },

  en: {
    'tray.showWindow': 'Show Main Window',
    'tray.gateway': 'Gateway',
    'tray.startGateway': 'Start Gateway',
    'tray.stopGateway': 'Stop Gateway',
    'tray.restartGateway': 'Restart Gateway',
    'tray.checkUpdate': 'Check for Updates',
    'tray.quit': 'Quit Claw Tool',
    'tray.gatewayRunning': 'Gateway: Running',
    'tray.gatewayStopped': 'Gateway: Stopped',
    'tray.gatewayStarting': 'Gateway: Starting...',
    'tray.gatewayStopping': 'Gateway: Stopping...',
    'tray.gatewayError': 'Gateway: Error',
    'tray.openclawUpdate': 'OpenClaw update available: {version}',
    'tray.appUpdate': 'Claw Tool update available: {version}',
    'tray.tooltip': 'Claw Tool - OpenClaw Manager ({status})',
  },

  ja: {
    'tray.showWindow': 'メインウィンドウを表示',
    'tray.gateway': 'Gateway',
    'tray.startGateway': 'Gateway を開始',
    'tray.stopGateway': 'Gateway を停止',
    'tray.restartGateway': 'Gateway を再起動',
    'tray.checkUpdate': '更新を確認',
    'tray.quit': 'Claw Tool を終了',
    'tray.gatewayRunning': 'Gateway: 実行中',
    'tray.gatewayStopped': 'Gateway: 停止',
    'tray.gatewayStarting': 'Gateway: 起動中...',
    'tray.gatewayStopping': 'Gateway: 停止中...',
    'tray.gatewayError': 'Gateway: エラー',
    'tray.openclawUpdate': 'OpenClaw の新バージョン: {version}',
    'tray.appUpdate': 'Claw Tool の新バージョン: {version}',
    'tray.tooltip': 'Claw Tool - OpenClaw マネージャー ({status})',
  },

  ko: {
    'tray.showWindow': '메인 창 표시',
    'tray.gateway': 'Gateway',
    'tray.startGateway': 'Gateway 시작',
    'tray.stopGateway': 'Gateway 중지',
    'tray.restartGateway': 'Gateway 재시작',
    'tray.checkUpdate': '업데이트 확인',
    'tray.quit': 'Claw Tool 종료',
    'tray.gatewayRunning': 'Gateway: 실행 중',
    'tray.gatewayStopped': 'Gateway: 중지됨',
    'tray.gatewayStarting': 'Gateway: 시작 중...',
    'tray.gatewayStopping': 'Gateway: 중지 중...',
    'tray.gatewayError': 'Gateway: 오류',
    'tray.openclawUpdate': 'OpenClaw 새 버전: {version}',
    'tray.appUpdate': 'Claw Tool 새 버전: {version}',
    'tray.tooltip': 'Claw Tool - OpenClaw 관리 도구 ({status})',
  },
}

let currentLocale = 'zh-CN'

/**
 * 设置当前语言
 * @param {string} lang - 语言代码，如 'zh-CN', 'en', 'ja', 'ko'
 */
function setLocale(lang) {
  if (messages[lang]) {
    currentLocale = lang
  }
}

/**
 * 获取当前语言
 * @returns {string}
 */
function getLocale() {
  return currentLocale
}

/**
 * 翻译指定 key
 * @param {string} key - 翻译 key
 * @param {object} [params={}] - 插值参数，如 { version: '1.2.3' }
 * @returns {string}
 */
function t(key, params = {}) {
  const msg =
    (messages[currentLocale] && messages[currentLocale][key]) ||
    (messages['zh-CN'] && messages['zh-CN'][key]) ||
    key
  return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, v), msg)
}

module.exports = { setLocale, getLocale, t }
