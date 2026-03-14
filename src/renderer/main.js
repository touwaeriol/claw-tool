import { createApp } from 'vue'
import { createPinia } from 'pinia'
// Element Plus 按需导入（组件由 unplugin-vue-components 自动注册）
import 'element-plus/es/components/message/style/css'
import 'element-plus/es/components/message-box/style/css'
import router from './router/index.js'
import i18n from './i18n/index.js'
import App from './App.vue'
import './styles/global.css'
import { initTheme } from './styles/theme.js'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// 初始化主题（从 localStorage 读取，默认跟随系统）
const savedTheme = localStorage.getItem('claw-tool-theme') || 'system'
initTheme(savedTheme)

app.mount('#app')
