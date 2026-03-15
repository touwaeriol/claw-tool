/**
 * 翻译主进程消息的辅助函数
 * 兼容纯字符串和 { key, params } 结构
 * @param {Function} t - vue-i18n 的 t 函数
 * @param {string|object} msg - 消息
 * @returns {string}
 */
export function translateMsg(t, msg) {
  if (!msg) return ''
  if (typeof msg === 'string') return msg
  if (typeof msg === 'object' && msg.key) {
    return t(msg.key, msg.params || {})
  }
  return String(msg)
}
