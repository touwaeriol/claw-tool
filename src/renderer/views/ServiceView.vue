<script setup>
  /**
   * 服务管理页面
   * 环境检测 + 启停控制 + 实时日志终端
   */
  import { ref, onMounted, onUnmounted, nextTick, computed, reactive, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useServiceStore } from '../stores/service'
  import { useLogsStore } from '../stores/logs'
  import { useConfigStore } from '../stores/config'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getBackend } from '../utils/nw-bridge'

  const { t } = useI18n()

  const serviceStore = useServiceStore()
  const logsStore = useLogsStore()
  const configStore = useConfigStore()

  // 加载后端模块
  const backend = getBackend()
  const processManager = backend?.processManager ?? null
  const daemonManager = backend?.daemonManager ?? null
  const executor = backend?.localExecutor ?? null
  const eventBus = backend?.eventBus ?? null
  const Events = backend?.Events ?? null
  const installer = backend?.installer ?? null

  // 后端是否可用
  const backendReady = !!backend

  // 日志容器引用
  const logTerminal = ref(null)

  // 运行模式选择
  const runMode = ref('foreground')
  // 自动重启开关
  const autoRestart = ref(true)
  // 同步 autoRestart 设置给 processManager
  watch(autoRestart, (val) => {
    if (processManager) processManager.setAutoRestart(val)
  })

  // ========== 环境检测 ==========
  const env = reactive({
    checking: false,
    checked: false,
    node: { installed: false, version: null, meetsRequirement: false },
    npm: { installed: false, version: null },
    openclaw: { installed: false, version: null },
  })
  // Node.js MSI 下载状态
  const nodeDownloading = ref(false)
  const nodeDownloadProgress = ref(0) // 0-100
  const nodeDownloadStatus = ref('') // 状态文字
  // OpenClaw 安装状态
  const installStep = ref(0) // 0~3: 检测环境 / 下载安装 / 验证安装 / 完成
  const installStatus = ref('idle') // idle | running | success | error | cancelled
  const installMessage = ref('')
  const installAbort = ref(null) // AbortController 实例
  // 安装日志
  const installLogs = ref([])
  // npm registry
  const npmRegistry = ref('')

  // 从 store 缓存恢复环境检测结果
  if (serviceStore.envCache) {
    env.node = serviceStore.envCache.node
    env.npm = serviceStore.envCache.npm
    env.openclaw = serviceStore.envCache.openclaw
    env.checked = true
  }

  /**
   * 执行环境检测
   */
  async function checkEnvironment() {
    if (!installer || !executor) return

    env.checking = true
    try {
      const result = await installer.checkEnvironment(executor)
      env.node = result.node
      env.npm = result.npm
      env.openclaw = result.openclaw
      env.checked = true
      // 缓存到 store，避免切换页面重复检测
      serviceStore.envCache = { node: result.node, npm: result.npm, openclaw: result.openclaw }
    } catch (err) {
      ElMessage.error(t('service.envCheckFailed', { error: err.message }))
    } finally {
      env.checking = false
    }
  }

  /**
   * 环境是否满足要求
   */
  const envReady = computed(() => {
    return env.node.meetsRequirement && env.openclaw.installed
  })

  /**
   * 下载 Node.js 安装包并打开
   */
  async function handleInstallNode() {
    if (!installer) return

    nodeDownloading.value = true
    nodeDownloadProgress.value = 0
    nodeDownloadStatus.value = t('service.gettingVersionInfo')

    try {
      // 1. 下载安装包到 ~/Downloads
      const result = await installer.downloadNodeInstaller({
        onProgress: (percent, downloaded, total) => {
          nodeDownloadProgress.value = percent
          nodeDownloadStatus.value = t('service.downloadingProgress', { downloaded, total })
        },
        onLog: (msg) => {
          nodeDownloadStatus.value = msg
        },
      })

      if (!result.success) {
        nodeDownloadStatus.value = t('service.downloadFailed', { error: result.error })
        ElMessage.error(t('service.downloadFailed', { error: result.error }))
        return
      }

      // 2. 打开安装包
      const openResult = installer.openNodeInstaller(result.installerPath)
      if (openResult.success) {
        nodeDownloadStatus.value = t('service.installerOpened')
        ElMessage.success(t('service.nodeInstallerOpenedMsg', { version: result.version }))
      } else {
        nodeDownloadStatus.value = t('service.openInstallerFailed', { error: openResult.error })
        ElMessage.error(t('service.openInstallerFailed', { error: openResult.error }))
      }
    } catch (err) {
      nodeDownloadStatus.value = t('service.error', { error: err.message })
      ElMessage.error(err.message)
    } finally {
      nodeDownloading.value = false
    }
  }

  /**
   * 一键安装 OpenClaw（带步骤指示 + 取消）
   */
  async function handleInstallOpenClaw() {
    if (!installer || !executor) return

    installStep.value = 0
    installStatus.value = 'running'
    installMessage.value = ''
    installLogs.value = []
    const controller = new AbortController()
    installAbort.value = controller

    try {
      const opts = {
        onLog: (text) => installLogs.value.push(text),
        onStep: (step, msg) => {
          installStep.value = step
          installMessage.value = msg
        },
        signal: controller.signal,
      }
      if (npmRegistry.value) {
        opts.registry = npmRegistry.value
      }
      const result = await installer.installOpenClaw(executor, opts)
      if (result.success) {
        installStep.value = 3
        installStatus.value = 'success'
        installMessage.value = t('service.installSuccess', { version: result.version })
        ElMessage.success(t('service.installSuccess', { version: result.version }))
        await checkEnvironment()
      } else if (controller.signal.aborted) {
        installStatus.value = 'cancelled'
        installMessage.value = t('service.installCancelled')
      } else {
        installStatus.value = 'error'
        installMessage.value = result.error || t('service.installFailed')
        ElMessage.error(t('service.installFailedMsg', { error: result.error }))
      }
    } catch (err) {
      if (controller.signal.aborted) {
        installStatus.value = 'cancelled'
        installMessage.value = t('service.installCancelled')
      } else {
        installStatus.value = 'error'
        installMessage.value = err.message
        ElMessage.error(err.message)
      }
    }
  }

  /**
   * 取消安装 OpenClaw
   */
  function cancelInstallOpenClaw() {
    if (installAbort.value) {
      installAbort.value.abort()
    }
  }

  // ========== 服务控制 ==========

  /**
   * 启动 Gateway
   */
  async function startService() {
    if (!processManager || !executor) {
      ElMessage.warning(t('service.mainProcessNotLoaded'))
      return
    }

    // 环境检查
    if (!envReady.value) {
      ElMessage.warning(t('service.envNotReady'))
      return
    }

    serviceStore.setLoading(true)
    logsStore.addEntry({ text: t('service.startingGateway'), type: 'system', level: 'info' })

    try {
      if (runMode.value === 'daemon') {
        await daemonManager.start(executor)
        serviceStore.runMode = 'daemon'
        await processManager.refreshStatus(executor)
      } else {
        await processManager.startForeground(executor, {
          onLog: (type, text) => {
            logsStore.addText(text, type)
            scrollToBottom()
          },
        })
        serviceStore.runMode = 'foreground'
      }
      serviceStore.updateFromStatus(processManager.status)
      ElMessage.success(t('service.gatewayStarted'))
    } catch (err) {
      serviceStore.setError(err.message)
      logsStore.addEntry({
        text: t('service.startFailed', { error: err.message }),
        type: 'system',
        level: 'error',
      })
      ElMessage.error(t('service.startFailed', { error: err.message }))
    } finally {
      serviceStore.setLoading(false)
    }
  }

  /**
   * 停止 Gateway
   */
  async function stopService() {
    if (!processManager || !executor) return

    serviceStore.setLoading(true)
    logsStore.addEntry({ text: t('service.stoppingGateway'), type: 'system', level: 'info' })

    try {
      await processManager.stop(executor)
      serviceStore.updateFromStatus(processManager.status)
      logsStore.addEntry({ text: t('service.gatewayStopped'), type: 'system', level: 'info' })
      ElMessage.success(t('service.gatewayStopped'))
    } catch (err) {
      serviceStore.setError(err.message)
      ElMessage.error(t('service.stopFailed', { error: err.message }))
    } finally {
      serviceStore.setLoading(false)
    }
  }

  /**
   * 重启 Gateway
   */
  async function restartService() {
    if (!processManager || !executor) return

    serviceStore.setLoading(true)
    logsStore.addEntry({ text: t('service.restartingGateway'), type: 'system', level: 'info' })

    try {
      if (runMode.value === 'daemon') {
        await daemonManager.restart(executor)
        await processManager.refreshStatus(executor)
      } else {
        await processManager.restart(executor, {
          onLog: (type, text) => {
            logsStore.addText(text, type)
            scrollToBottom()
          },
        })
      }
      serviceStore.updateFromStatus(processManager.status)
      ElMessage.success(t('service.gatewayRestarted'))
    } catch (err) {
      serviceStore.setError(err.message)
      ElMessage.error(t('service.restartFailed', { error: err.message }))
    } finally {
      serviceStore.setLoading(false)
    }
  }

  /**
   * 安装系统服务
   */
  async function installDaemon() {
    if (!daemonManager || !executor) return

    try {
      const result = await daemonManager.install(executor)
      if (result.success) {
        serviceStore.daemonInstalled = true
        ElMessage.success(t('service.daemonInstalled'))
      } else {
        ElMessage.error(t('service.daemonInstallFailed', { error: result.output }))
      }
    } catch (err) {
      ElMessage.error(err.message)
    }
  }

  /**
   * 卸载系统服务
   */
  async function uninstallDaemon() {
    if (!daemonManager || !executor) return

    try {
      await ElMessageBox.confirm(t('service.confirmUninstallDaemon'), t('common.confirm'))
      const result = await daemonManager.uninstall(executor)
      if (result.success) {
        serviceStore.daemonInstalled = false
        ElMessage.success(t('service.daemonUninstalled'))
      } else {
        ElMessage.error(t('service.daemonUninstallFailed', { error: result.output }))
      }
    } catch (err) {
      if (err !== 'cancel') {
        ElMessage.error(err.message)
      }
    }
  }

  /**
   * 切换开机自启
   */
  async function handleAutoStart(val) {
    if (!daemonManager || !executor) return

    try {
      const result = await daemonManager.setAutoStart(executor, val)
      if (result.success) {
        serviceStore.autoStartEnabled = val
        ElMessage.success(val ? t('service.autoStartEnabled') : t('service.autoStartDisabled'))
      } else {
        serviceStore.autoStartEnabled = !val
        ElMessage.error(t('service.autoStartFailed', { error: result.output }))
      }
    } catch (err) {
      serviceStore.autoStartEnabled = !val
      ElMessage.error(err.message)
    }
  }

  // ========== 日志 ==========

  function scrollToBottom() {
    if (!logsStore.autoScroll || !logTerminal.value) return
    nextTick(() => {
      const el = logTerminal.value
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  function clearLogs() {
    logsStore.clear()
    if (processManager) processManager.clearLogBuffer()
  }

  function getLineClass(line) {
    if (typeof line === 'object') {
      if (line.level === 'error' || line.type === 'stderr') return 'line-error'
      if (line.level === 'warn') return 'line-warn'
      if (line.type === 'system') return 'line-system'
    }
    return ''
  }

  function getLineText(entry) {
    if (typeof entry === 'string') return entry
    const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', { hour12: false })
    return `[${time}] ${entry.text || ''}`
  }

  const displayLogs = computed(() => logsStore.filteredEntries)

  // ========== 通道测试 ==========

  // 通道探测状态
  const channelProbe = reactive({
    running: false,
    results: [], // { channel, status, message }
  })

  // 消息发送测试
  const msgTest = reactive({
    channel: '',
    target: '',
    message: 'Hello from Claw Tool',
    sending: false,
    result: null,
  })

  // 已启用的通道列表（从配置中读取）
  const enabledChannels = computed(() => {
    const channels = configStore.channels || {}
    return Object.entries(channels)
      .filter(([, cfg]) => cfg.enabled)
      .map(([id]) => id)
  })

  /**
   * 执行 openclaw channels status --probe
   */
  async function handleChannelProbe() {
    if (!executor) return
    channelProbe.running = true
    channelProbe.results = []
    try {
      const result = await executor.exec('openclaw channels status --probe', { timeout: 30000 })
      if (result.exitCode === 0) {
        // 解析输出，每行一个通道状态
        const lines = (result.stdout || '').split('\n').filter(Boolean)
        channelProbe.results = lines.map((line) => {
          // 尝试解析为 JSON 行，或者当作纯文本
          try {
            return JSON.parse(line)
          } catch {
            return { channel: 'output', message: line, status: 'info' }
          }
        })
        ElMessage.success(t('service.channelProbeComplete'))
      } else {
        channelProbe.results = [
          {
            channel: 'error',
            status: 'error',
            message: result.stderr || result.stdout || t('service.probeFailed'),
          },
        ]
        ElMessage.error(t('service.channelProbeFailed'))
      }
    } catch (err) {
      channelProbe.results = [{ channel: 'error', status: 'error', message: err.message }]
      ElMessage.error(t('service.probeError', { error: err.message }))
    } finally {
      channelProbe.running = false
    }
  }

  /**
   * 通过 openclaw message send 发送测试消息
   */
  async function handleSendTestMessage() {
    if (!executor) return
    if (!msgTest.target) {
      ElMessage.warning(t('service.targetRequired'))
      return
    }
    msgTest.sending = true
    msgTest.result = null
    try {
      // 构建命令
      const args = ['openclaw', 'message', 'send']
      if (msgTest.channel) {
        args.push('--channel', msgTest.channel)
      }
      args.push('--target', msgTest.target)
      args.push('--message', JSON.stringify(msgTest.message))
      const cmd = args.join(' ')
      const result = await executor.exec(cmd, { timeout: 30000 })
      if (result.exitCode === 0) {
        msgTest.result = { success: true, message: result.stdout || t('service.msgSendSuccess') }
        ElMessage.success(t('service.testMsgSent'))
      } else {
        msgTest.result = {
          success: false,
          message: result.stderr || result.stdout || t('service.sendFailed'),
        }
        ElMessage.error(t('service.msgSendFailed'))
      }
    } catch (err) {
      msgTest.result = { success: false, message: err.message }
      ElMessage.error(t('service.sendError', { error: err.message }))
    } finally {
      msgTest.sending = false
    }
  }

  // ========== API 快速测试 ==========

  // 所有已配置模型（从 providers 中提取）
  const allModels = computed(() => {
    const providers = configStore.providers || {}
    const result = []
    for (const [providerKey, cfg] of Object.entries(providers)) {
      const models = cfg.models || []
      for (const m of models) {
        const modelId = typeof m === 'string' ? m : m.id
        const modelName = typeof m === 'string' ? m : m.name || m.id
        result.push({ id: modelId, name: modelName, provider: providerKey })
      }
    }
    return result
  })

  const apiTest = reactive({
    model: '',
    message: '你好，请用一句话介绍你自己',
    sending: false,
    response: null, // { success, text, latency }
  })

  /**
   * 直接调用 Gateway HTTP API 测试
   */
  async function handleApiTest() {
    if (!executor) return
    if (!apiTest.model) {
      ElMessage.warning(t('service.selectModelRequired'))
      return
    }

    apiTest.sending = true
    apiTest.response = null
    const startTime = Date.now()

    try {
      const port = serviceStore.gatewayPort || 18789
      const body = JSON.stringify({
        model: apiTest.model,
        messages: [{ role: 'user', content: apiTest.message || 'hello' }],
        stream: false,
      })
      // 通过后端 curl 避免浏览器 CORS
      const cmd = `curl -s -w "\\n__HTTP_CODE__:%{http_code}" -X POST http://127.0.0.1:${port}/v1/chat/completions -H "Content-Type: application/json" -d ${JSON.stringify(body)}`
      const result = await executor.exec(cmd, { timeout: 60000 })
      const latency = Date.now() - startTime

      const output = result.stdout || ''
      // 分离 HTTP 状态码
      const codeMatch = output.match(/__HTTP_CODE__:(\d+)/)
      const httpCode = codeMatch ? parseInt(codeMatch[1]) : 0
      const jsonStr = output.replace(/__HTTP_CODE__:\d+/, '').trim()

      if (httpCode >= 200 && httpCode < 300) {
        try {
          const data = JSON.parse(jsonStr)
          const text = data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2)
          apiTest.response = { success: true, text, latency, model: data.model }
        } catch {
          apiTest.response = { success: true, text: jsonStr, latency }
        }
        ElMessage.success(t('service.modelResponseSuccess', { latency }))
      } else {
        apiTest.response = { success: false, text: jsonStr || `HTTP ${httpCode}`, latency }
        ElMessage.error(t('service.requestFailed', { code: httpCode }))
      }
    } catch (err) {
      apiTest.response = { success: false, text: err.message, latency: Date.now() - startTime }
      ElMessage.error(t('service.testError', { error: err.message }))
    } finally {
      apiTest.sending = false
    }
  }

  // ========== 生命周期 ==========
  let logListener = null
  let statusListener = null

  onMounted(async () => {
    // 自动执行环境检测（仅首次，有缓存时跳过）
    if (installer && executor && !serviceStore.envCache) {
      await checkEnvironment()
    }

    // 监听日志事件
    if (eventBus && Events) {
      logListener = (entry) => {
        logsStore.addEntry(entry)
        scrollToBottom()
      }
      eventBus.on(Events.LOG_ENTRY, logListener)

      statusListener = (status) => {
        serviceStore.updateFromStatus(status)
      }
      eventBus.on(Events.SERVICE_STATUS_CHANGED, statusListener)
    }

    // 刷新状态
    if (processManager && executor) {
      // 同步 autoRestart 设置
      processManager.setAutoRestart(autoRestart.value)

      await processManager.refreshStatus(executor)
      serviceStore.updateFromStatus(processManager.status)

      const buffer = processManager.getLogBuffer()
      for (const entry of buffer) {
        logsStore.addEntry(entry)
      }
      scrollToBottom()

      processManager.startPolling(executor, 10000)
    }

    // 检查开机自启状态
    if (daemonManager && executor) {
      try {
        serviceStore.autoStartEnabled = await daemonManager.isAutoStartEnabled(executor)
      } catch {
        /* ignore */
      }
    }
  })

  onUnmounted(() => {
    if (eventBus && Events) {
      if (logListener) eventBus.off(Events.LOG_ENTRY, logListener)
      if (statusListener) eventBus.off(Events.SERVICE_STATUS_CHANGED, statusListener)
    }
    if (processManager) {
      processManager.stopPolling()
    }
  })
</script>

<template>
  <div class="service-view">
    <h3 class="page-heading">{{ $t('service.title') }}</h3>

    <!-- 后端不可用提示 -->
    <el-alert
      v-if="!backendReady"
      :title="$t('service.backendUnavailable')"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <!-- 环境检测区域 -->
    <el-card class="env-check-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">{{ $t('service.envCheck') }}</span>
          <el-button size="small" :loading="env.checking" @click="checkEnvironment">
            <el-icon v-if="!env.checking"><ElIconRefresh /></el-icon>
            {{ env.checking ? $t('service.checking') : $t('service.recheck') }}
          </el-button>
        </div>
      </template>

      <div v-if="!env.checked && !env.checking" class="env-hint">
        <el-icon :size="16"><ElIconInfoFilled /></el-icon>
        <span>{{ $t('service.autoChecking') }}</span>
      </div>

      <div v-else class="env-items">
        <!-- Node.js -->
        <div class="env-item">
          <div class="env-item-left">
            <el-icon :size="20" :class="env.node.meetsRequirement ? 'text-success' : 'text-danger'">
              <ElIconSuccessFilled v-if="env.node.meetsRequirement" />
              <ElIconCircleCloseFilled v-else />
            </el-icon>
            <div class="env-item-info">
              <span class="env-item-name">Node.js</span>
              <span class="env-item-detail" v-if="env.node.installed">
                v{{ env.node.version }}
                <el-tag v-if="env.node.meetsRequirement" type="success" size="small">{{
                  $t('service.meetsRequirement')
                }}</el-tag>
                <el-tag v-else type="danger" size="small">{{ $t('service.versionTooLow') }}</el-tag>
                <el-tag v-if="env.node.nodeSource === 'system'" type="success" size="small">{{
                  $t('service.sourceSystem')
                }}</el-tag>
                <el-tag v-else-if="env.node.nodeSource === 'bundled'" type="warning" size="small">{{
                  $t('service.sourceBundled')
                }}</el-tag>
              </span>
              <span class="env-item-path" v-if="env.node.nodePath">{{ env.node.nodePath }}</span>
              <span class="env-item-detail text-danger" v-else>{{
                $t('service.notInstalled')
              }}</span>
            </div>
          </div>
          <div v-if="!env.node.meetsRequirement && env.checked" class="node-install-area">
            <el-button
              type="primary"
              size="small"
              :loading="nodeDownloading"
              @click="handleInstallNode"
            >
              {{ nodeDownloading ? $t('service.downloading') : $t('service.downloadInstallNode') }}
            </el-button>
            <!-- 下载进度 -->
            <div v-if="nodeDownloading || nodeDownloadStatus" class="node-download-progress">
              <el-progress
                v-if="nodeDownloading"
                :percentage="nodeDownloadProgress"
                :stroke-width="6"
                style="width: 200px"
              />
              <span class="node-download-status">{{ nodeDownloadStatus }}</span>
            </div>
          </div>
        </div>

        <!-- npm -->
        <div class="env-item">
          <div class="env-item-left">
            <el-icon :size="20" :class="env.npm.installed ? 'text-success' : 'text-warning'">
              <ElIconSuccessFilled v-if="env.npm.installed" />
              <ElIconWarningFilled v-else />
            </el-icon>
            <div class="env-item-info">
              <span class="env-item-name">npm</span>
              <span class="env-item-detail" v-if="env.npm.installed">v{{ env.npm.version }}</span>
              <span class="env-item-detail text-warning" v-else>{{
                $t('service.npmNotInstalled')
              }}</span>
            </div>
          </div>
        </div>

        <!-- OpenClaw -->
        <div class="env-item">
          <div class="env-item-left">
            <el-icon :size="20" :class="env.openclaw.installed ? 'text-success' : 'text-danger'">
              <ElIconSuccessFilled v-if="env.openclaw.installed" />
              <ElIconCircleCloseFilled v-else />
            </el-icon>
            <div class="env-item-info">
              <span class="env-item-name">OpenClaw</span>
              <span class="env-item-detail" v-if="env.openclaw.installed">{{
                env.openclaw.version
              }}</span>
              <span class="env-item-detail text-danger" v-else>{{
                $t('service.notInstalled')
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- OpenClaw 安装面板 -->
      <div
        v-if="!env.openclaw.installed && env.checked && env.node.meetsRequirement"
        class="install-panel"
      >
        <!-- 步骤指示器 -->
        <el-steps :active="installStep" finish-status="success" size="small" class="install-steps">
          <el-step :title="$t('service.stepCheckEnv')" />
          <el-step :title="$t('service.stepDownloadInstall')" />
          <el-step :title="$t('service.stepVerify')" />
        </el-steps>

        <!-- 步骤消息 -->
        <div v-if="installMessage" class="install-step-message">
          <el-icon v-if="installStatus === 'running'" class="is-loading"><ElIconLoading /></el-icon>
          <el-icon v-else-if="installStatus === 'success'" class="text-success"
            ><ElIconCircleCheck
          /></el-icon>
          <el-icon v-else-if="installStatus === 'error'" class="text-danger"
            ><ElIconCircleClose
          /></el-icon>
          <el-icon v-else-if="installStatus === 'cancelled'" class="text-warning"
            ><ElIconWarning
          /></el-icon>
          <span>{{ installMessage }}</span>
        </div>

        <!-- npm 镜像源 -->
        <div class="install-registry-row">
          <span class="install-registry-label">{{ $t('service.npmRegistry') }}:</span>
          <el-input
            v-model="npmRegistry"
            size="small"
            :placeholder="$t('service.npmRegistryPlaceholder')"
            clearable
            style="width: 320px"
            :disabled="installStatus === 'running'"
          />
        </div>

        <!-- 按钮区 -->
        <div class="install-actions-row">
          <el-button
            v-if="installStatus === 'running'"
            type="danger"
            size="small"
            @click="cancelInstallOpenClaw"
          >
            {{ $t('service.cancelInstall') }}
          </el-button>
          <el-button
            type="primary"
            size="small"
            :loading="installStatus === 'running'"
            :disabled="installStatus === 'running'"
            @click="handleInstallOpenClaw"
          >
            {{
              installStatus === 'running'
                ? $t('service.installing')
                : installStatus === 'error' || installStatus === 'cancelled'
                  ? $t('service.reinstall')
                  : $t('service.startInstall')
            }}
          </el-button>
        </div>

        <!-- 安装日志 -->
        <div v-if="installLogs.length > 0" class="install-log">
          <div class="install-log-header">{{ $t('service.installLog') }}</div>
          <div class="install-log-content">
            <div v-for="(line, i) in installLogs" :key="i" class="install-log-line">
              {{ line }}
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 服务控制区 -->
    <el-card class="service-status-card" shadow="never">
      <div class="status-display">
        <div
          class="status-indicator"
          :class="serviceStore.gatewayRunning ? 'is-running' : 'is-stopped'"
        >
          <span
            class="status-dot"
            :class="serviceStore.gatewayRunning ? 'status-dot--running' : 'status-dot--stopped'"
          />
        </div>
        <div class="status-info">
          <div class="status-label">{{ $t('service.gatewayService') }}</div>
          <div
            class="status-value"
            :class="serviceStore.gatewayRunning ? 'text-success' : 'text-danger'"
          >
            {{ serviceStore.statusText }}
          </div>
        </div>
        <!-- 运行模式选择 -->
        <div class="mode-selector">
          <el-radio-group v-model="runMode" size="small" :disabled="serviceStore.gatewayRunning">
            <el-radio-button value="foreground">{{ $t('service.foregroundMode') }}</el-radio-button>
            <el-radio-button value="daemon">{{ $t('service.daemonMode') }}</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="status-meta">
        <div class="meta-item">
          <span class="meta-label">PID</span>
          <span class="meta-value">{{ serviceStore.gatewayPid ?? '--' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('service.uptime') }}</span>
          <span class="meta-value">{{ serviceStore.uptimeText }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Daemon</span>
          <span class="meta-value">{{
            serviceStore.daemonInstalled ? $t('status.installed') : $t('status.notInstalled')
          }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">{{ $t('service.port') }}</span>
          <span class="meta-value">{{ serviceStore.gatewayPort }}</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="control-buttons">
        <el-button
          :type="serviceStore.gatewayRunning ? 'danger' : 'primary'"
          :loading="serviceStore.loading"
          :disabled="!envReady"
          @click="serviceStore.gatewayRunning ? stopService() : startService()"
        >
          <el-icon v-if="!serviceStore.loading">
            <ElIconVideoPlay v-if="!serviceStore.gatewayRunning" />
            <ElIconVideoPause v-else />
          </el-icon>
          {{ serviceStore.gatewayRunning ? $t('service.stop') : $t('service.start') }}
        </el-button>
        <el-button
          :disabled="!serviceStore.gatewayRunning || serviceStore.loading"
          @click="restartService"
        >
          <el-icon><ElIconRefresh /></el-icon>
          {{ $t('service.restart') }}
        </el-button>
        <el-divider direction="vertical" />
        <el-button
          v-if="!serviceStore.daemonInstalled"
          type="info"
          plain
          :disabled="!envReady"
          @click="installDaemon"
        >
          {{ $t('service.installDaemon') }}
        </el-button>
        <el-button v-else type="warning" plain @click="uninstallDaemon">
          {{ $t('service.uninstallDaemon') }}
        </el-button>
      </div>

      <!-- 选项区 -->
      <div class="service-options">
        <el-checkbox v-model="autoRestart">{{ $t('service.autoRestart') }}</el-checkbox>
        <div class="auto-start-option">
          <span>{{ $t('service.autoStart') }}</span>
          <el-switch
            :model-value="serviceStore.autoStartEnabled"
            @change="handleAutoStart"
            size="small"
          />
        </div>
      </div>

      <!-- 环境未就绪提示 -->
      <el-alert
        v-if="env.checked && !envReady"
        :title="$t('service.envNotReadyAlert')"
        type="warning"
        show-icon
        :closable="false"
        style="margin-top: 12px"
      />

      <!-- 错误信息 -->
      <el-alert
        v-if="serviceStore.error"
        :title="serviceStore.error"
        type="error"
        show-icon
        closable
        style="margin-top: 12px"
        @close="serviceStore.error = null"
      />
    </el-card>

    <!-- API 快速测试 -->
    <el-card v-if="envReady && serviceStore.gatewayRunning" class="api-test-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">{{ $t('service.apiQuickTest') }}</span>
          <el-tag size="small" effect="plain" type="info">
            http://localhost:{{ serviceStore.gatewayPort }}/v1/chat/completions
          </el-tag>
        </div>
      </template>

      <div class="api-test-form">
        <el-select
          v-model="apiTest.model"
          size="small"
          :placeholder="$t('service.selectModel')"
          filterable
          style="width: 240px"
        >
          <el-option
            v-for="m in allModels"
            :key="m.id"
            :label="`${m.name} (${m.provider})`"
            :value="m.id"
          />
        </el-select>
        <el-input
          v-model="apiTest.message"
          size="small"
          :placeholder="$t('service.inputTestMsg')"
          style="flex: 1"
          @keyup.enter="handleApiTest"
        />
        <el-button
          type="primary"
          size="small"
          :loading="apiTest.sending"
          :disabled="!apiTest.model"
          @click="handleApiTest"
        >
          {{ apiTest.sending ? $t('service.requesting') : $t('service.sendTest') }}
        </el-button>
      </div>

      <!-- 响应结果 -->
      <div
        v-if="apiTest.response"
        class="api-test-result"
        :class="apiTest.response.success ? 'result-success' : 'result-error'"
      >
        <div class="result-header">
          <el-tag :type="apiTest.response.success ? 'success' : 'danger'" size="small">
            {{ apiTest.response.success ? $t('common.success') : $t('common.failed') }}
          </el-tag>
          <span class="result-latency">{{ apiTest.response.latency }}ms</span>
          <span v-if="apiTest.response.model" class="result-model">{{
            apiTest.response.model
          }}</span>
        </div>
        <div class="result-body">{{ apiTest.response.text }}</div>
      </div>
    </el-card>

    <!-- 通道测试区域 -->
    <el-card
      v-if="envReady && serviceStore.gatewayRunning"
      class="channel-test-card"
      shadow="never"
    >
      <template #header>
        <div class="card-header">
          <span class="section-title">{{ $t('service.channelTest') }}</span>
          <el-button size="small" :loading="channelProbe.running" @click="handleChannelProbe">
            <el-icon v-if="!channelProbe.running"><ElIconConnection /></el-icon>
            {{ channelProbe.running ? $t('service.probing') : $t('service.probeAllChannels') }}
          </el-button>
        </div>
      </template>

      <!-- 探测结果 -->
      <div v-if="channelProbe.results.length > 0" class="probe-results">
        <div v-for="(item, i) in channelProbe.results" :key="i" class="probe-item">
          <el-icon
            :size="16"
            :class="
              item.status === 'error'
                ? 'text-danger'
                : item.status === 'ok' || item.status === 'info'
                  ? 'text-success'
                  : 'text-warning'
            "
          >
            <ElIconCircleCloseFilled v-if="item.status === 'error'" />
            <ElIconSuccessFilled v-else-if="item.status === 'ok'" />
            <ElIconInfoFilled v-else />
          </el-icon>
          <span class="probe-channel">{{ item.channel }}</span>
          <span class="probe-message">{{ item.message }}</span>
        </div>
      </div>

      <!-- 发送测试消息 -->
      <el-divider content-position="left">{{ $t('service.sendTestMsg') }}</el-divider>
      <div class="msg-test-form">
        <el-select
          v-model="msgTest.channel"
          size="small"
          :placeholder="$t('service.channelOptional')"
          clearable
          style="width: 140px"
        >
          <el-option v-for="ch in enabledChannels" :key="ch" :label="ch" :value="ch" />
        </el-select>
        <el-input
          v-model="msgTest.target"
          size="small"
          :placeholder="$t('service.targetPlaceholder')"
          style="flex: 1"
        />
        <el-input
          v-model="msgTest.message"
          size="small"
          :placeholder="$t('service.testMsgContent')"
          style="width: 200px"
        />
        <el-button
          type="primary"
          size="small"
          :loading="msgTest.sending"
          :disabled="!msgTest.target"
          @click="handleSendTestMessage"
        >
          {{ $t('testPanel.send') }}
        </el-button>
      </div>
      <!-- 发送结果 -->
      <el-alert
        v-if="msgTest.result"
        :title="msgTest.result.message"
        :type="msgTest.result.success ? 'success' : 'error'"
        show-icon
        closable
        style="margin-top: 12px"
        @close="msgTest.result = null"
      />
    </el-card>

    <!-- 实时日志终端 -->
    <el-card class="log-terminal-card" shadow="never">
      <template #header>
        <div class="terminal-header">
          <span class="section-title">{{ $t('service.realtimeLogs') }}</span>
          <div class="terminal-controls">
            <el-select v-model="logsStore.level" size="small" style="width: 100px">
              <el-option label="Debug" value="debug" />
              <el-option label="Info" value="info" />
              <el-option label="Warn" value="warn" />
              <el-option label="Error" value="error" />
            </el-select>
            <el-input
              v-model="logsStore.searchKeyword"
              size="small"
              :placeholder="$t('common.search')"
              clearable
              style="width: 150px"
            />
            <el-button
              :type="logsStore.paused ? 'warning' : 'default'"
              size="small"
              @click="logsStore.togglePause()"
            >
              {{ logsStore.paused ? $t('service.resume') : $t('service.pause') }}
            </el-button>
            <el-checkbox v-model="logsStore.autoScroll" size="small">{{
              $t('service.autoScroll')
            }}</el-checkbox>
            <el-button text size="small" @click="clearLogs">{{ $t('common.clear') }}</el-button>
            <el-text size="small" type="info">
              {{ logsStore.filteredCount }} / {{ logsStore.totalCount }}
            </el-text>
          </div>
        </div>
      </template>
      <div ref="logTerminal" class="log-terminal" contenteditable="false">
        <div
          v-for="(entry, i) in displayLogs"
          :key="entry.id ?? i"
          class="terminal-line"
          :class="getLineClass(entry)"
        >
          <span class="line-number">{{ i + 1 }}</span>
          <span class="line-content">{{ getLineText(entry) }}</span>
        </div>
        <div v-if="displayLogs.length === 0" class="terminal-empty">{{ $t('service.noLogs') }}</div>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
  .service-view {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .page-heading {
    font-size: 18px;
    font-weight: 600;
    color: var(--ct-text-primary);
  }

  .text-success {
    color: var(--ct-success, #67c23a);
  }
  .text-danger {
    color: var(--ct-danger, #f56c6c);
  }
  .text-warning {
    color: var(--ct-warning, #e6a23c);
  }

  /* 环境检测卡片 */
  .env-check-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .env-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ct-text-secondary);
    padding: 12px 0;
  }

  .env-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .env-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: var(--ct-bg-base, rgba(0, 0, 0, 0.02));
    border-radius: 6px;
    border: 1px solid var(--ct-border);
  }

  .env-item-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .env-item-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .env-item-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--ct-text-primary);
  }

  .env-item-detail {
    font-size: 12px;
    color: var(--ct-text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .env-item-path {
    font-size: 11px;
    color: var(--ct-text-placeholder);
    font-family: 'Consolas', 'Monaco', monospace;
    word-break: break-all;
  }

  .node-install-area {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  .node-download-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .node-download-status {
    font-size: 11px;
    color: var(--ct-text-secondary);
    white-space: nowrap;
  }

  /* 安装面板 */
  .install-panel {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid var(--ct-border);
    border-radius: var(--ct-radius-md, 8px);
    background: var(--ct-bg-elevated, var(--ct-bg-card));
  }

  .install-steps {
    margin-bottom: 16px;
  }

  .install-step-message {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--ct-text-regular);
    margin-bottom: 12px;
  }

  .install-registry-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .install-registry-label {
    font-size: 13px;
    color: var(--ct-text-secondary);
    white-space: nowrap;
  }

  .install-actions-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  /* 安装日志 */
  .install-log {
    border-top: 1px solid var(--ct-border);
    padding-top: 12px;
  }

  .install-log-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--ct-text-secondary);
    margin-bottom: 6px;
  }

  .install-log-content {
    max-height: 150px;
    overflow-y: auto;
    background: #1e1e2e;
    border-radius: 4px;
    padding: 8px;
    font-family: 'Cascadia Code', 'Consolas', monospace;
    font-size: 11px;
  }

  .install-log-line {
    color: #cdd6f4;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* 服务状态卡片 */
  .service-status-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .status-display {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
  }

  .status-indicator {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .status-indicator.is-running {
    background: rgba(103, 194, 58, 0.15);
  }

  .status-indicator.is-stopped {
    background: rgba(245, 108, 108, 0.15);
  }

  .status-indicator .status-dot {
    width: 16px;
    height: 16px;
  }

  .status-label {
    font-size: 13px;
    color: var(--ct-text-secondary);
  }

  .status-value {
    font-size: 20px;
    font-weight: 700;
  }

  .mode-selector {
    margin-left: auto;
  }

  .status-meta {
    display: flex;
    gap: 32px;
    margin-bottom: 20px;
    padding: 12px 0;
    border-top: 1px solid var(--ct-border);
    border-bottom: 1px solid var(--ct-border);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .meta-label {
    font-size: 12px;
    color: var(--ct-text-secondary);
  }

  .meta-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--ct-text-primary);
  }

  .control-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .service-options {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--ct-text-secondary);
    font-size: 13px;
  }

  .auto-start-option {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* 日志终端 */
  .log-terminal-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
    flex: 1;
  }

  .terminal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .section-title {
    font-weight: 600;
    color: var(--ct-text-primary);
  }

  .terminal-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .log-terminal {
    height: 300px;
    background: var(--ct-bg-base);
    border: 1px solid var(--ct-border);
    border-radius: var(--ct-radius-sm, 4px);
    padding: 8px;
    overflow-y: auto;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.6;
    user-select: text;
    cursor: default;
  }

  .terminal-line {
    display: flex;
    gap: 12px;
  }

  .line-number {
    color: var(--ct-text-placeholder);
    min-width: 30px;
    text-align: right;
    flex-shrink: 0;
    user-select: none;
  }

  .line-content {
    color: var(--ct-text-regular);
    white-space: pre-wrap;
    word-break: break-all;
  }

  .terminal-line.line-error .line-content {
    color: #f44747;
  }
  .terminal-line.line-warn .line-content {
    color: #cca700;
  }
  .terminal-line.line-system .line-content {
    color: #569cd6;
    font-style: italic;
  }

  .terminal-empty {
    color: var(--ct-text-placeholder);
    text-align: center;
    padding: 40px 0;
  }

  /* API 测试卡片 */
  .api-test-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .api-test-form {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .api-test-result {
    margin-top: 12px;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid var(--ct-border);
  }

  .api-test-result.result-success {
    background: rgba(103, 194, 58, 0.05);
    border-color: rgba(103, 194, 58, 0.3);
  }

  .api-test-result.result-error {
    background: rgba(245, 108, 108, 0.05);
    border-color: rgba(245, 108, 108, 0.3);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .result-latency {
    font-size: 12px;
    color: var(--ct-text-secondary);
    font-family: 'Cascadia Code', 'Consolas', monospace;
  }

  .result-model {
    font-size: 12px;
    color: var(--ct-text-placeholder);
  }

  .result-body {
    font-size: 13px;
    color: var(--ct-text-primary);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 200px;
    overflow-y: auto;
  }

  /* 通道测试卡片 */
  .channel-test-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .probe-results {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
  }

  .probe-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--ct-bg-base, rgba(0, 0, 0, 0.02));
    border-radius: 4px;
    border: 1px solid var(--ct-border);
    font-size: 13px;
  }

  .probe-channel {
    font-weight: 600;
    color: var(--ct-text-primary);
    min-width: 80px;
  }

  .probe-message {
    color: var(--ct-text-secondary);
    flex: 1;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .msg-test-form {
    display: flex;
    align-items: center;
    gap: 8px;
  }
</style>
