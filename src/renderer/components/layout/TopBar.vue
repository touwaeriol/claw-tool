<script setup>
  /**
   * 顶部栏组件
   * 显示应用标题、实例选择器、OpenClaw 状态、主题/语言切换和设置按钮
   */
  import { computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { useServiceStore } from '../../stores/service.js'
  import { useInstanceStore } from '../../stores/instance.js'
  import { useAppStore } from '../../stores/app.js'

  const { t, locale: i18nLocale } = useI18n()

  const router = useRouter()
  const serviceStore = useServiceStore()
  const instanceStore = useInstanceStore()
  const appStore = useAppStore()

  onMounted(() => {
    instanceStore.loadInstances()
  })

  function handleInstanceChange(id) {
    instanceStore.setActiveInstance(id)
  }

  function goSettings() {
    router.push('/settings')
  }

  /* 获取状态标签类型 */
  function getStatusType(id) {
    const status = instanceStore.connectionStatus[id]
    if (status === 'connected') return 'success'
    if (status === 'connecting') return 'warning'
    if (status === 'error') return 'danger'
    return 'info'
  }

  /* 主题切换 */
  const isDark = computed(
    () =>
      appStore.theme === 'dark' ||
      (appStore.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches),
  )

  function toggleTheme() {
    const newTheme = isDark.value ? 'light' : 'dark'
    appStore.changeTheme(newTheme)
    localStorage.setItem('claw-tool-theme', newTheme)
  }

  /* 语言切换 */
  const localeLabels = {
    'zh-CN': '中',
    en: 'EN',
    ja: '日',
    ko: '한',
  }

  const localeOptions = [
    { value: 'zh-CN', label: '简体中文' },
    { value: 'en', label: 'English' },
    { value: 'ja', label: '日本語' },
    { value: 'ko', label: '한국어' },
  ]

  const currentLocaleLabel = computed(() => localeLabels[appStore.locale] || '中')

  function handleLocaleChange(lang) {
    i18nLocale.value = lang
    appStore.locale = lang
    localStorage.setItem('claw-tool-locale', lang)
  }
</script>

<template>
  <el-header class="topbar" height="48px">
    <div class="topbar-left">
      <span class="topbar-title">Claw Tool</span>
    </div>

    <!-- 实例选择器 -->
    <div class="topbar-center">
      <el-select
        :model-value="instanceStore.activeInstanceId"
        class="instance-selector"
        :placeholder="t('topbar.selectInstance')"
        size="default"
        @change="handleInstanceChange"
      >
        <el-option
          v-for="inst in instanceStore.instances"
          :key="inst.id"
          :label="inst.name"
          :value="inst.id"
        >
          <div class="instance-option">
            <span
              class="status-dot"
              :class="{
                'status-dot--running': instanceStore.connectionStatus[inst.id] === 'connected',
                'status-dot--stopped': instanceStore.connectionStatus[inst.id] !== 'connected',
              }"
            />
            <span>{{ inst.name }}</span>
            <el-tag size="small" :type="inst.type === 'local' ? 'info' : 'warning'" effect="plain">
              {{ inst.type === 'local' ? t('topbar.local') : t('topbar.ssh') }}
            </el-tag>
          </div>
        </el-option>
      </el-select>
    </div>

    <div class="topbar-right">
      <el-tag :type="serviceStore.gatewayRunning ? 'success' : 'info'" size="small">
        {{ serviceStore.gatewayRunning ? t('topbar.running') : t('topbar.stopped') }}
      </el-tag>

      <!-- 主题切换按钮 -->
      <el-tooltip
        :content="isDark ? t('settings.themeLight') : t('settings.themeDark')"
        placement="bottom"
      >
        <el-button text size="small" class="topbar-icon-btn" @click="toggleTheme">
          <!-- 暗色时显示太阳(切到亮色)，亮色时显示月亮(切到暗色) -->
          <el-icon :size="18">
            <svg v-if="isDark" viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
              <!-- Sun icon -->
              <path
                d="M12 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm0 16a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm8-8a1 1 0 011 1 1 1 0 01-1 1h-1a1 1 0 110-2h1zM5 11a1 1 0 110 2H4a1 1 0 110-2h1zm14.07-6.36a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zM7.05 16.95a1 1 0 010 1.41l-.71.71a1 1 0 11-1.41-1.41l.71-.71a1 1 0 011.41 0zm12.02.71a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zM7.05 7.05a1 1 0 01-1.41 0l-.71-.71a1 1 0 111.41-1.41l.71.71a1 1 0 010 1.41zM12 8a4 4 0 100 8 4 4 0 000-8z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
              <!-- Moon icon -->
              <path
                d="M12.1 22c-5.5 0-10-4.5-10-10 0-4.8 3.4-8.8 8.1-9.8.4-.1.8 0 1.1.3.3.3.3.7.2 1.1-.5 1.2-.7 2.5-.7 3.9 0 5 4 9 9 9 1.3 0 2.6-.3 3.8-.8.4-.2.9-.1 1.1.2.3.3.3.7.2 1.1-1.1 4.7-5.1 8-9.8 8z"
              />
            </svg>
          </el-icon>
        </el-button>
      </el-tooltip>

      <!-- 语言切换下拉 -->
      <el-dropdown trigger="click" @command="handleLocaleChange">
        <el-button text size="small" class="topbar-icon-btn topbar-locale-btn">
          {{ currentLocaleLabel }}
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              v-for="opt in localeOptions"
              :key="opt.value"
              :command="opt.value"
              :class="{ 'is-active': appStore.locale === opt.value }"
            >
              {{ opt.label }}
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>

      <el-button text size="small" @click="goSettings">
        {{ t('topbar.settings') }}
      </el-button>
    </div>
  </el-header>
</template>

<style scoped>
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--ct-border, var(--el-border-color));
    padding: 0 16px;
    background: var(--ct-header-bg, var(--el-bg-color));
    -webkit-app-region: drag;
    user-select: none;
  }

  /* 让交互元素不拦截窗口拖动 */
  .topbar .el-select,
  .topbar .el-button,
  .topbar .el-tag,
  .topbar .el-dropdown {
    -webkit-app-region: no-drag;
  }

  .topbar-left {
    flex: 1;
  }

  .topbar-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ct-text-primary, var(--el-text-color-primary));
  }

  .topbar-center {
    flex: 0 0 auto;
  }

  .instance-selector {
    width: 220px;
  }

  .instance-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .topbar-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .topbar-icon-btn {
    padding: 4px 8px;
    min-width: unset;
  }

  .topbar-locale-btn {
    font-weight: 600;
    font-size: 13px;
    min-width: 32px;
  }
</style>
