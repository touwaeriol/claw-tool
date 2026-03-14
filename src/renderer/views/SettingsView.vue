<script setup>
/**
 * 系统设置页面
 * 使用 el-tabs 组织：外观、系统行为、网络代理、更新设置、日志配置、远程测试、配置文件、关于
 */
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '../stores/app.js'
import { useConfigStore } from '../stores/config.js'
import { ElMessage } from 'element-plus'
import { getBackend, openExternal } from '../utils/nw-bridge'

const backend = getBackend()

const { t, locale: i18nLocale } = useI18n()

const appStore = useAppStore()
const configStore = useConfigStore()

// 当前 Tab
const activeTab = ref('appearance')

// HTTP 服务模块
const httpServerModule = backend?.httpServer ?? null

// 代理管理器模块
const proxyManager = backend?.proxyManager ?? null

// 应用更新模块
const appUpdater = backend?.appUpdater ?? null

// HTTP 服务运行状态
const httpServerRunning = ref(false)
// Token 正在重新生成
const regeneratingToken = ref(false)

/* 代理配置 */
const proxyForm = ref({
  type: 'none',
  host: '',
  port: '',
  username: '',
  password: '',
  noProxy: 'localhost,127.0.0.1',
})

// 代理测试状态
const proxyTesting = ref(false)
const proxyTestResult = ref(null)

// 是否显示代理密码
const showProxyPassword = ref(false)

// 加载代理配置
async function loadProxyConfig() {
  if (!proxyManager) return
  try {
    const config = await proxyManager.loadProxyConfig()
    proxyForm.value = { ...proxyForm.value, ...config }
  } catch (err) {
    console.warn('加载代理配置失败:', err.message)
  }
}

// 保存代理配置
async function saveProxyConfig() {
  if (!proxyManager) {
    ElMessage.warning('代理管理模块未加载')
    return
  }
  try {
    await proxyManager.saveProxyConfig({ ...proxyForm.value })
    ElMessage.success(t('settings.proxyConfigSaved'))
    proxyTestResult.value = null
  } catch (err) {
    ElMessage.error(`保存代理配置失败: ${err.message}`)
  }
}

// 测试代理连通性
async function testProxyConnection() {
  if (!proxyManager) {
    ElMessage.warning('代理管理模块未加载')
    return
  }
  proxyTesting.value = true
  proxyTestResult.value = null
  try {
    const result = await proxyManager.testProxy({ ...proxyForm.value })
    proxyTestResult.value = result
    if (result.success) {
      ElMessage.success(result.message)
    } else {
      ElMessage.error(result.message)
    }
  } catch (err) {
    proxyTestResult.value = { success: false, message: err.message }
    ElMessage.error(`测试失败: ${err.message}`)
  } finally {
    proxyTesting.value = false
  }
}

// 重置代理配置
function resetProxyConfig() {
  proxyForm.value = {
    type: 'none',
    host: '',
    port: '',
    username: '',
    password: '',
    noProxy: 'localhost,127.0.0.1',
  }
  proxyTestResult.value = null
}

/* 应用设置 */
const settings = ref({
  theme: appStore.theme || 'dark',
  language: appStore.locale || 'zh-CN',
  autoStart: false,
  minimizeToTray: true,
  autoStartGateway: false,
  remoteTestEnabled: false,
  remoteTestPort: 18790,
  remoteTestBind: '127.0.0.1',
  remoteTestToken: '',
})

/* 更新设置（从后端读取持久化值） */
const updateSettings = ref({
  autoCheckOpenClaw: true,
  autoCheckApp: true,
  checkFrequency: 'daily',
  updateChannel: 'stable',
  useProxyForUpdate: false,
})

// 加载后端持久化的更新设置
if (appUpdater?.getUpdateSettings) {
  const saved = appUpdater.getUpdateSettings()
  updateSettings.value.autoCheckApp = saved.autoCheckApp
  updateSettings.value.checkFrequency = saved.checkFrequency
  if (saved.useProxyForUpdate !== undefined) updateSettings.value.useProxyForUpdate = saved.useProxyForUpdate
}

// 监听更新设置变更，同步到后端
watch(() => [updateSettings.value.autoCheckApp, updateSettings.value.checkFrequency, updateSettings.value.useProxyForUpdate], ([autoCheck, freq, useProxy]) => {
  if (appUpdater?.updateSettings) {
    appUpdater.updateSettings({ autoCheckApp: autoCheck, checkFrequency: freq, useProxyForUpdate: useProxy })
  }
})

/* 检查频率选项 */
const checkFrequencies = [
  { value: 'startup', labelKey: 'settings.freqStartup' },
  { value: 'daily', labelKey: 'settings.freqDaily' },
  { value: 'weekly', labelKey: 'settings.freqWeekly' },
  { value: 'monthly', labelKey: 'settings.freqMonthly' },
]

/* 日志配置（来自 openclaw.json） */
const logForm = ref({
  level: 'info',
  filePath: '',
  maxFiles: 5,
  maxSize: '10m',
})

// 从 configStore 同步日志配置
watch(
  () => configStore.logConfig,
  (log) => {
    if (!log) return
    logForm.value.level = log.level || 'info'
    logForm.value.filePath = log.filePath || ''
    logForm.value.maxFiles = log.maxFiles || 5
    logForm.value.maxSize = log.maxSize || '10m'
  },
  { immediate: true }
)

/* 语言选项 */
const languages = [
  { value: 'zh-CN', label: '简体中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
]

/* 主题选项 */
const themes = [
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
  { value: 'system', labelKey: 'settings.themeSystem' },
]

/* 日志级别选项 */
const logLevels = [
  { value: 'debug', label: 'Debug' },
  { value: 'info', label: 'Info' },
  { value: 'warn', label: 'Warn' },
  { value: 'error', label: 'Error' },
]

/* 加载 HTTP 服务 Token */
async function loadToken() {
  if (!httpServerModule) return
  try {
    await httpServerModule.loadServerConfig()
    const status = httpServerModule.getServerStatus()
    settings.value.remoteTestToken = status.token || ''
  } catch (err) {
    console.warn('加载 Token 失败:', err.message)
  }
}

// 页面加载时获取 Token 和代理配置
loadToken()
loadProxyConfig()

/* 切换远程测试服务开关 */
async function toggleRemoteTest(enabled) {
  if (!httpServerModule) {
    ElMessage.warning('HTTP 服务模块未加载')
    settings.value.remoteTestEnabled = false
    return
  }

  try {
    if (enabled) {
      await httpServerModule.startServer(
        settings.value.remoteTestPort,
        settings.value.remoteTestBind
      )
      httpServerRunning.value = true
      const status = httpServerModule.getServerStatus()
      settings.value.remoteTestToken = status.token || ''
      ElMessage.success(t('settings.remoteStarted'))
    } else {
      await httpServerModule.stopServer()
      httpServerRunning.value = false
      ElMessage.success(t('settings.remoteStopped'))
    }
  } catch (err) {
    settings.value.remoteTestEnabled = !enabled
    ElMessage.error(`操作失败: ${err.message}`)
  }
}

/* 重新生成 Token */
async function handleRegenerateToken() {
  if (!httpServerModule) return
  regeneratingToken.value = true
  try {
    const newToken = await httpServerModule.regenerateToken()
    settings.value.remoteTestToken = newToken
    ElMessage.success(t('settings.tokenRegenerated'))
  } catch (err) {
    ElMessage.error(`重新生成失败: ${err.message}`)
  } finally {
    regeneratingToken.value = false
  }
}

/* 保存自定义 Token */
async function handleSaveToken() {
  if (!httpServerModule) return
  try {
    const token = settings.value.remoteTestToken.trim()
    if (!token) {
      ElMessage.warning(t('settings.tokenEmpty'))
      return
    }
    await httpServerModule.setToken(token)
    ElMessage.success(t('settings.tokenUpdated'))
  } catch (err) {
    ElMessage.error(`保存 Token 失败: ${err.message}`)
  }
}

/* 复制 Token 到剪贴板 */
function copyToken() {
  if (!settings.value.remoteTestToken) return
  navigator.clipboard.writeText(settings.value.remoteTestToken).then(() => {
    ElMessage.success(t('settings.tokenCopied'))
  }).catch(() => {
    ElMessage.warning('复制失败，请手动复制')
  })
}

/* 复制完整 URL */
function copyAccessUrl() {
  const host = settings.value.remoteTestBind === '0.0.0.0' ? 'localhost' : settings.value.remoteTestBind
  const url = `http://${host}:${settings.value.remoteTestPort}/?token=${settings.value.remoteTestToken}`
  navigator.clipboard.writeText(url).then(() => {
    ElMessage.success(t('settings.urlCopied'))
  }).catch(() => {
    ElMessage.warning('复制失败')
  })
}

/* 主题实时切换 */
function onThemeChange(mode) {
  appStore.changeTheme(mode)
  localStorage.setItem('claw-tool-theme', mode)
}

/* 语言实时切换 */
function onLanguageChange(lang) {
  i18nLocale.value = lang
  appStore.locale = lang
  localStorage.setItem('claw-tool-locale', lang)
}

/* 保存应用设置 */
function handleSave() {
  appStore.changeTheme(settings.value.theme)
  appStore.locale = settings.value.language
  i18nLocale.value = settings.value.language
  ElMessage.success(t('settings.settingsSaved'))
}

/* 保存日志配置到 openclaw.json */
function saveLogConfig() {
  const cfg = { level: logForm.value.level }
  if (logForm.value.filePath) cfg.filePath = logForm.value.filePath
  if (logForm.value.maxFiles) cfg.maxFiles = logForm.value.maxFiles
  if (logForm.value.maxSize) cfg.maxSize = logForm.value.maxSize
  configStore.updateLogConfig(cfg)
  ElMessage.success(t('settings.logConfigUpdated'))
}

/* 重置设置 */
function handleReset() {
  settings.value = {
    theme: 'dark',
    language: 'zh-CN',
    autoStart: false,
    minimizeToTray: true,
    autoStartGateway: false,
    remoteTestEnabled: false,
    remoteTestPort: 18790,
    remoteTestBind: '127.0.0.1',
    remoteTestToken: '',
  }
  updateSettings.value = {
    autoCheckOpenClaw: true,
    autoCheckApp: true,
    checkFrequency: 'daily',
    updateChannel: 'stable',
  }
}

/* 应用更新状态 */
const appUpdateChecking = ref(false)
const appUpdateInfo = ref(null)
const appDownloading = ref(false)
const appDownloadPercent = ref(0)

/* 检查应用更新 */
async function checkUpdate() {
  if (!appUpdater) {
    ElMessage.info('更新模块未加载')
    return
  }
  appUpdateChecking.value = true
  try {
    const result = await appUpdater.checkForAppUpdate()
    appUpdateInfo.value = result
    if (result.hasUpdate) {
      ElMessage.success(`${t('settings.newVersionFound')}: ${result.latestVersion}`)
    } else {
      ElMessage.info(t('settings.latestVersion'))
    }
  } catch (err) {
    ElMessage.error(`检查更新失败: ${err.message}`)
  } finally {
    appUpdateChecking.value = false
  }
}

/* 下载并安装更新 */
async function downloadAndInstallUpdate() {
  if (!appUpdater || !appUpdateInfo.value?.asset) return
  appDownloading.value = true
  appDownloadPercent.value = 0
  try {
    const filePath = await appUpdater.downloadUpdate(
      appUpdateInfo.value.asset.url,
      appUpdateInfo.value.asset.name,
      (progress) => { appDownloadPercent.value = progress.percent }
    )
    ElMessage.success('下载完成，正在启动安装...')
    appUpdater.launchInstaller(filePath)
  } catch (err) {
    ElMessage.error(`下载失败: ${err.message}`)
  } finally {
    appDownloading.value = false
  }
}

/* 跳过此版本 */
function skipThisVersion() {
  if (!appUpdater || !appUpdateInfo.value) return
  appUpdater.skipVersion(appUpdateInfo.value.latestVersion)
  appUpdateInfo.value = null
  ElMessage.info(t('settings.versionSkipped'))
}

/* 打开项目链接 */
function openProjectLink() {
  openExternal('https://github.com/nicepkg/openclaw')
}

/* 监听主进程自动检查到的更新事件 */
const eventBus = backend?.eventBus ?? null
let _updateListener = null

onMounted(() => {
  if (eventBus && appUpdater?.AppUpdateEvents) {
    _updateListener = (data) => {
      appUpdateInfo.value = {
        hasUpdate: true,
        currentVersion: data.currentVersion,
        latestVersion: data.latestVersion,
        releaseNotes: data.releaseNotes,
        asset: data.asset,
      }
    }
    eventBus.on(appUpdater.AppUpdateEvents.APP_UPDATE_AVAILABLE, _updateListener)
  }

  // 如果后端已有缓存的检查结果，直接读取
  if (appUpdater?.getCachedRelease) {
    const cached = appUpdater.getCachedRelease()
    if (cached.release && cached.lastCheckTime > 0) {
      const currentVersion = appUpdater.getCurrentAppVersion()
      const tag = cached.release.tag_name
      const latestVersion = tag ? tag.replace(/^v/, '') : null
      if (latestVersion && appUpdater.findPlatformAsset) {
        const asset = appUpdater.findPlatformAsset(cached.release)
        // 简单比较版本号
        const c = currentVersion.split('.').map(Number)
        const l = latestVersion.split('.').map(Number)
        let isNewer = false
        for (let i = 0; i < 3; i++) {
          if ((l[i] || 0) > (c[i] || 0)) { isNewer = true; break }
          if ((l[i] || 0) < (c[i] || 0)) break
        }
        if (isNewer) {
          appUpdateInfo.value = {
            hasUpdate: true,
            currentVersion,
            latestVersion,
            releaseNotes: cached.release.body || '',
            asset,
          }
        }
      }
    }
  }
})

onUnmounted(() => {
  if (eventBus && _updateListener && appUpdater?.AppUpdateEvents) {
    eventBus.off(appUpdater.AppUpdateEvents.APP_UPDATE_AVAILABLE, _updateListener)
  }
})
</script>

<template>
  <div class="settings-view">
    <h3 class="page-heading">{{ $t('settings.title') }}</h3>

    <el-tabs v-model="activeTab" class="settings-tabs">
      <!-- 外观 -->
      <el-tab-pane :label="$t('settings.appearance')" name="appearance">
        <el-form label-position="left" label-width="160px" class="tab-form">
          <el-form-item :label="$t('settings.theme')">
            <el-radio-group v-model="settings.theme" @change="onThemeChange">
              <el-radio-button v-for="th in themes" :key="th.value" :value="th.value">{{ $t(th.labelKey) }}</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="$t('settings.language')">
            <el-select v-model="settings.language" style="width: 200px" @change="onLanguageChange">
              <el-option v-for="l in languages" :key="l.value" :label="l.label" :value="l.value" />
            </el-select>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 系统行为 -->
      <el-tab-pane :label="$t('settings.systemBehavior')" name="behavior">
        <el-form label-position="left" label-width="200px" class="tab-form">
          <el-form-item :label="$t('settings.autoStart')">
            <el-switch v-model="settings.autoStart" />
          </el-form-item>
          <el-form-item :label="$t('settings.minimizeToTray')">
            <el-switch v-model="settings.minimizeToTray" />
          </el-form-item>
          <el-form-item :label="$t('settings.autoStartGateway')">
            <el-switch v-model="settings.autoStartGateway" />
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 网络代理 -->
      <el-tab-pane :label="$t('settings.networkProxy')" name="proxy">
        <el-form label-position="left" label-width="160px" class="tab-form">
          <el-form-item :label="$t('settings.proxyType')">
            <el-select v-model="proxyForm.type" style="width: 200px" @change="proxyTestResult = null">
              <el-option :label="$t('settings.proxyNone')" value="none" />
              <el-option :label="$t('settings.proxyHttp')" value="http" />
              <el-option :label="$t('settings.proxyHttps')" value="https" />
              <el-option :label="$t('settings.proxySocks5')" value="socks5" />
            </el-select>
          </el-form-item>

          <template v-if="proxyForm.type !== 'none'">
            <el-form-item :label="$t('settings.proxyAddress')">
              <el-input v-model="proxyForm.host" placeholder="127.0.0.1" style="width: 300px" />
            </el-form-item>
            <el-form-item :label="$t('settings.proxyPort')">
              <el-input-number v-model.number="proxyForm.port" :min="1" :max="65535" :controls="false" style="width: 120px" />
            </el-form-item>
            <el-form-item :label="$t('settings.proxyUsername')">
              <el-input v-model="proxyForm.username" style="width: 300px" />
            </el-form-item>
            <el-form-item :label="$t('settings.proxyPassword')">
              <el-input
                v-model="proxyForm.password"
                :type="showProxyPassword ? 'text' : 'password'"
                style="width: 300px"
              >
                <template #suffix>
                  <el-icon style="cursor: pointer" @click="showProxyPassword = !showProxyPassword">
                    <ElIconView v-if="!showProxyPassword" />
                    <ElIconHide v-else />
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
            <el-form-item :label="$t('settings.noProxyAddresses')">
              <el-input v-model="proxyForm.noProxy" style="width: 400px" />
              <div class="form-tip">{{ $t('settings.noProxyHelp') }}</div>
            </el-form-item>

            <el-form-item v-if="proxyTestResult" :label="$t('settings.testResult')">
              <el-alert
                :type="proxyTestResult.success ? 'success' : 'error'"
                :title="proxyTestResult.message"
                :closable="false"
                show-icon
                style="width: 400px"
              />
            </el-form-item>
          </template>

          <el-form-item>
            <div class="action-row">
              <el-button type="primary" size="small" @click="saveProxyConfig">{{ $t('settings.saveProxy') }}</el-button>
              <el-button
                v-if="proxyForm.type !== 'none'"
                size="small"
                :loading="proxyTesting"
                @click="testProxyConnection"
              >
                {{ $t('settings.testConnection') }}
              </el-button>
              <el-button size="small" text type="warning" @click="resetProxyConfig">{{ $t('common.reset') }}</el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 更新设置 -->
      <el-tab-pane :label="$t('settings.updateSettings')" name="update">
        <el-form label-position="left" label-width="200px" class="tab-form">
          <el-form-item :label="$t('settings.autoCheckOpenClaw')">
            <el-switch v-model="updateSettings.autoCheckOpenClaw" />
          </el-form-item>
          <el-form-item :label="$t('settings.autoCheckApp')">
            <el-switch v-model="updateSettings.autoCheckApp" />
          </el-form-item>
          <el-form-item :label="$t('settings.checkFrequency')">
            <el-select v-model="updateSettings.checkFrequency" style="width: 200px">
              <el-option
                v-for="f in checkFrequencies"
                :key="f.value"
                :label="$t(f.labelKey)"
                :value="f.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('settings.updateChannel')">
            <el-radio-group v-model="updateSettings.updateChannel">
              <el-radio value="stable">{{ $t('settings.channelStable') }}</el-radio>
              <el-radio value="beta">{{ $t('settings.channelBeta') }}</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="$t('settings.useProxyForUpdate')">
            <el-switch v-model="updateSettings.useProxyForUpdate" />
            <span style="margin-left: 8px; font-size: 12px; color: #909399">{{ $t('settings.useProxyForUpdateTip') }}</span>
          </el-form-item>
          <el-form-item>
            <div class="action-row">
              <el-button :loading="appUpdateChecking" @click="checkUpdate">{{ $t('settings.manualCheckApp') }}</el-button>
            </div>
          </el-form-item>

          <!-- 更新信息 -->
          <template v-if="appUpdateInfo && appUpdateInfo.hasUpdate">
            <el-form-item>
              <el-alert
                type="warning"
                :closable="false"
                show-icon
                style="width: 100%"
              >
                <template #title>
                  {{ $t('settings.newVersionFound') }} {{ appUpdateInfo.latestVersion }}
                  <span v-if="appUpdateInfo.asset" style="font-weight: normal; margin-left: 8px; font-size: 12px">
                    ({{ (appUpdateInfo.asset.size / 1024 / 1024).toFixed(1) }} MB)
                  </span>
                </template>
                <template #default>
                  <div v-if="appDownloading" style="margin-top: 8px">
                    <el-progress :percentage="appDownloadPercent" :stroke-width="16" :text-inside="true" />
                  </div>
                  <div style="margin-top: 8px; display: flex; gap: 8px">
                    <el-button
                      v-if="appUpdateInfo.asset"
                      type="primary"
                      size="small"
                      :loading="appDownloading"
                      @click="downloadAndInstallUpdate"
                    >
                      {{ $t('settings.downloadAndInstall') }}
                    </el-button>
                    <el-button size="small" @click="skipThisVersion">{{ $t('settings.skipVersion') }}</el-button>
                  </div>
                </template>
              </el-alert>
            </el-form-item>
          </template>
        </el-form>
      </el-tab-pane>

      <!-- 日志配置 -->
      <el-tab-pane :label="$t('settings.logConfig')" name="log">
        <el-form label-position="left" label-width="160px" class="tab-form">
          <el-form-item :label="$t('settings.logLevel')">
            <el-select v-model="logForm.level" style="width: 200px">
              <el-option v-for="l in logLevels" :key="l.value" :label="l.label" :value="l.value" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('settings.logFilePath')">
            <el-input v-model="logForm.filePath" :placeholder="$t('settings.logFilePathPlaceholder')" style="width: 350px" />
          </el-form-item>
          <el-form-item :label="$t('settings.maxFiles')">
            <el-input-number v-model="logForm.maxFiles" :min="1" :max="50" />
          </el-form-item>
          <el-form-item :label="$t('settings.maxFileSize')">
            <el-input v-model="logForm.maxSize" placeholder="10m" style="width: 120px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" @click="saveLogConfig">{{ $t('settings.saveLogConfig') }}</el-button>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 远程测试服务 -->
      <el-tab-pane :label="$t('settings.remoteTest')" name="remote">
        <el-form label-position="left" label-width="160px" class="tab-form">
          <el-form-item :label="$t('settings.enableRemoteTest')">
            <el-switch
              v-model="settings.remoteTestEnabled"
              @change="toggleRemoteTest"
            />
            <el-tag v-if="httpServerRunning" type="success" size="small" effect="plain" style="margin-left: 8px">
              {{ $t('status.running') }}
            </el-tag>
          </el-form-item>
          <el-form-item :label="$t('settings.listenPort')">
            <el-input-number
              v-model="settings.remoteTestPort"
              :min="1024"
              :max="65535"
              :disabled="!settings.remoteTestEnabled"
            />
          </el-form-item>
          <el-form-item :label="$t('settings.bindAddress')">
            <el-select v-model="settings.remoteTestBind" :disabled="!settings.remoteTestEnabled" style="width: 200px">
              <el-option :label="$t('settings.localOnly')" value="127.0.0.1" />
              <el-option :label="$t('settings.allInterfaces')" value="0.0.0.0" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('settings.authToken')">
            <div class="token-field">
              <el-input
                v-model="settings.remoteTestToken"
                type="password"
                show-password
                style="width: 300px"
              />
              <el-button size="small" @click="copyToken">{{ $t('common.copy') }}</el-button>
              <el-button size="small" @click="handleSaveToken">{{ $t('common.save') }}</el-button>
              <el-button size="small" :loading="regeneratingToken" @click="handleRegenerateToken">{{ $t('settings.regenerateToken') }}</el-button>
            </div>
            <div class="form-tip">{{ $t('settings.tokenHelp') }}</div>
          </el-form-item>
          <el-form-item v-if="httpServerRunning" :label="$t('settings.accessUrl')">
            <div class="token-field">
              <el-input
                :model-value="`http://${settings.remoteTestBind === '0.0.0.0' ? 'localhost' : settings.remoteTestBind}:${settings.remoteTestPort}/?token=...`"
                readonly
                style="width: 400px"
              />
              <el-button size="small" @click="copyAccessUrl">{{ $t('settings.copyFullUrl') }}</el-button>
            </div>
          </el-form-item>
        </el-form>
      </el-tab-pane>

      <!-- 配置文件 -->
      <el-tab-pane :label="$t('settings.configFile')" name="config">
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">{{ $t('settings.configPath') }}</span>
            <span class="info-value mono-text">{{ configStore.filePath || $t('settings.notLoaded') }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.lastLoaded') }}</span>
            <span class="info-value">
              {{ configStore.lastLoaded ? new Date(configStore.lastLoaded).toLocaleString() : '--' }}
            </span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.modifyStatus') }}</span>
            <el-tag :type="configStore.isDirty ? 'warning' : 'success'" size="small" effect="plain">
              {{ configStore.isDirty ? $t('common.unsavedChanges') : $t('status.synced') }}
            </el-tag>
          </div>
        </div>
      </el-tab-pane>

      <!-- 关于 -->
      <el-tab-pane :label="$t('settings.about')" name="about">
        <div class="info-list">
          <div class="info-item">
            <span class="info-label">{{ $t('settings.appVersion') }}</span>
            <span class="info-value">0.1.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.nwjsVersion') }}</span>
            <span class="info-value">--</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.nodeVersion') }}</span>
            <span class="info-value">{{ appStore.nodeVersion || '--' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.openclawVersion') }}</span>
            <span class="info-value">{{ appStore.openclawVersion || '--' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.license') }}</span>
            <span class="info-value">MIT</span>
          </div>
          <div class="info-item">
            <span class="info-label">{{ $t('settings.projectLink') }}</span>
            <span class="info-value">
              <el-link type="primary" @click="openProjectLink">
                github.com/nicepkg/openclaw
              </el-link>
            </span>
          </div>
        </div>

        <div class="about-actions">
          <el-button :loading="appUpdateChecking" @click="checkUpdate">{{ $t('settings.checkUpdate') }}</el-button>
          <el-button type="primary" @click="handleSave">{{ $t('settings.saveSettings') }}</el-button>
          <el-button text type="warning" @click="handleReset">{{ $t('common.restoreDefault') }}</el-button>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 860px;
}

.page-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--ct-text-primary);
  margin: 0;
}

.settings-tabs {
  --el-tabs-header-height: 40px;
}

.settings-tabs :deep(.el-tabs__content) {
  padding: 16px 4px;
}

.tab-form {
  max-width: 700px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  gap: 16px;
  align-items: center;
}

.info-label {
  color: var(--ct-text-secondary);
  min-width: 140px;
  flex-shrink: 0;
}

.info-value {
  color: var(--ct-text-primary);
  font-weight: 500;
}

.mono-text {
  font-family: monospace;
  font-size: 13px;
}

.token-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-tip {
  font-size: 12px;
  color: var(--ct-text-secondary);
  margin-top: 4px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.about-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--ct-border);
}
</style>
