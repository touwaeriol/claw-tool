/**
 * 主题管理模块
 * 支持亮色、暗色、跟随系统三种模式
 */

// 系统主题媒体查询
const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

// 系统主题变化监听回调
let mediaListener = null

/**
 * 根据当前模式获取实际应用的主题（light / dark）
 */
function resolveTheme(mode) {
  if (mode === 'system') {
    return darkMediaQuery.matches ? 'dark' : 'light'
  }
  return mode === 'dark' ? 'dark' : 'light'
}

/**
 * 将主题应用到 HTML 根元素
 * Element Plus 暗色模式通过 html.dark class 切换
 */
function applyTheme(theme) {
  const html = document.documentElement
  html.classList.remove('light', 'dark')
  html.classList.add(theme)
}

/**
 * 设置主题模式
 * @param {'light' | 'dark' | 'system'} mode 主题模式
 */
export function setTheme(mode) {
  // 持久化主题偏好
  localStorage.setItem('claw-tool-theme', mode)

  // 移除旧的系统主题监听
  if (mediaListener) {
    darkMediaQuery.removeEventListener('change', mediaListener)
    mediaListener = null
  }

  // 应用主题
  const theme = resolveTheme(mode)
  applyTheme(theme)

  // 跟随系统模式时，监听系统主题变化
  if (mode === 'system') {
    mediaListener = () => {
      const newTheme = resolveTheme('system')
      applyTheme(newTheme)
    }
    darkMediaQuery.addEventListener('change', mediaListener)
  }
}

/**
 * 初始化主题（应用启动时调用）
 * @param {'light' | 'dark' | 'system'} mode 存储的主题模式
 */
export function initTheme(mode = 'system') {
  setTheme(mode)
}
