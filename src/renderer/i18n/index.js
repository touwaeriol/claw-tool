/**
 * 国际化初始化模块
 * 使用 vue-i18n 实现多语言支持
 */
import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.js'
import en from './locales/en.js'
import ja from './locales/ja.js'
import ko from './locales/ko.js'

const savedLocale = localStorage.getItem('claw-tool-locale') || 'zh-CN'

const i18n = createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh-CN',
  messages: {
    'zh-CN': zhCN,
    en,
    ja,
    ko,
  },
})

export default i18n
