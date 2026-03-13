import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setTheme } from '../styles/theme.js'

/**
 * 应用全局状态
 */
export const useAppStore = defineStore('app', () => {
  // 是否首次运行
  const isFirstRun = ref(true)
  // OpenClaw 是否已安装
  const openclawInstalled = ref(false)
  // Node.js 版本
  const nodeVersion = ref(null)
  // OpenClaw 版本
  const openclawVersion = ref(null)
  // 主题模式：'light' | 'dark' | 'system'
  const theme = ref(localStorage.getItem('claw-tool-theme') || 'dark')
  // 语言
  const locale = ref(localStorage.getItem('claw-tool-locale') || 'zh-CN')

  /**
   * 切换主题模式并应用
   */
  function changeTheme(mode) {
    theme.value = mode
    setTheme(mode)
  }

  return {
    isFirstRun,
    openclawInstalled,
    nodeVersion,
    openclawVersion,
    theme,
    locale,
    changeTheme,
  }
})
