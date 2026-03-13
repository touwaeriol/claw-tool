/**
 * 全局常量定义
 * 主进程和渲染进程共享
 */

// OpenClaw 默认配置路径
const os = typeof require !== 'undefined' ? require('os') : null
const path = typeof require !== 'undefined' ? require('path') : null

const HOME_DIR = os ? os.homedir() : ''

module.exports = {
  // OpenClaw 配置目录
  OPENCLAW_DIR: path ? path.join(HOME_DIR, '.openclaw') : '',
  // OpenClaw 配置文件路径
  OPENCLAW_CONFIG_PATH: path ? path.join(HOME_DIR, '.openclaw', 'openclaw.json') : '',
  // OpenClaw 日志目录
  OPENCLAW_LOGS_DIR: path ? path.join(HOME_DIR, '.openclaw', 'logs') : '',

  // Claw Tool 配置目录
  CLAW_TOOL_DIR: path ? path.join(HOME_DIR, '.claw-tool') : '',
  // 实例配置文件路径
  INSTANCES_FILE: path ? path.join(HOME_DIR, '.claw-tool', 'instances.json') : '',

  // Gateway 默认端口
  GATEWAY_DEFAULT_PORT: 18789,
  // Express 远程测试服务默认端口
  HTTP_SERVER_DEFAULT_PORT: 5678,

  // 最低 Node.js 版本要求
  MIN_NODE_VERSION: '22.12.0',

  // 应用名称
  APP_NAME: 'Claw Tool',
  APP_VERSION: '0.1.0',
}
