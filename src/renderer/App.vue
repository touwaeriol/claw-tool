<script setup>
/**
 * 根组件
 * 提供整体布局：侧边栏 + 主内容区域
 * Element Plus 语言包跟随 i18n 切换
 */
import { computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import ja from 'element-plus/es/locale/lang/ja'
import ko from 'element-plus/es/locale/lang/ko'
import SideBar from './components/layout/SideBar.vue'
import TopBar from './components/layout/TopBar.vue'
import { getBackend } from './utils/nw-bridge.js'
import { useConfigStore } from './stores/config.js'

const { locale } = useI18n()
const configStore = useConfigStore()

// 启动时加载配置文件
onMounted(async () => {
  const backend = getBackend()
  if (backend?.configManager) {
    try {
      await configStore.loadConfig(backend.configManager)
      console.log('[App] 配置加载成功')
    } catch (err) {
      console.error('[App] 配置加载失败:', err)
    }
  }
})

// Element Plus 语言包映射
const elLocaleMap = {
  'zh-CN': zhCn,
  en,
  ja,
  ko,
}

const elLocale = computed(() => elLocaleMap[locale.value] || zhCn)
</script>

<template>
  <el-config-provider :locale="elLocale">
    <el-container class="app-container">
      <TopBar />
      <el-container class="app-body">
        <SideBar />
        <el-main class="app-main">
          <RouterView />
        </el-main>
      </el-container>
    </el-container>
  </el-config-provider>
</template>

<style scoped>
.app-container {
  height: 100vh;
  flex-direction: column;
}

.app-body {
  flex: 1;
  overflow: hidden;
}

.app-main {
  overflow-y: auto;
  background-color: var(--el-bg-color-page);
}
</style>
