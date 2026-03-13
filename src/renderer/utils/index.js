/**
 * 工具函数
 */

/**
 * 判断当前是否在 NW.js 环境中运行
 */
export function isNwjs() {
  return typeof nw !== 'undefined'
}

/**
 * 安全地执行 Node.js require（仅在 NW.js 环境中可用）
 * 使用 nw.require 绕过 Vite 的模块解析
 */
export function nodeRequire(moduleName) {
  // nw.require 不会被 Vite 编译，运行时由 NW.js 提供
  if (typeof nw !== 'undefined' && nw.require) {
    return nw.require(moduleName)
  }
  // 降级：使用全局 require（开发模式直接运行时）
  if (typeof globalThis.__nw_require !== 'undefined') {
    return globalThis.__nw_require(moduleName)
  }
  console.warn(`[工具] 无法加载 Node.js 模块: ${moduleName}（非 NW.js 环境）`)
  return null
}

/**
 * 获取 NW.js 应用根目录
 */
export function getAppRoot() {
  if (typeof nw !== 'undefined') {
    return nw.__dirname || ''
  }
  return ''
}
