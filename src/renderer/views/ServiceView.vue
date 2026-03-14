<script setup>
  /**
   * 服务管理页面
   * 环境检测 + 启停控制 + 实时日志终端
   */
  import { ref, onMounted, onUnmounted, nextTick, computed, reactive } from 'vue'
  import { useServiceStore } from '../stores/service'
  import { useLogsStore } from '../stores/logs'
  import { useConfigStore } from '../stores/config'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import { getBackend } from '../utils/nw-bridge'

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
  // OpenClaw 安装中
  const openclawInstalling = ref(false)
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
      ElMessage.error(`环境检测失败: ${err.message}`)
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
    nodeDownloadStatus.value = '正在获取版本信息...'

    try {
      // 1. 下载安装包到 ~/Downloads
      const result = await installer.downloadNodeInstaller({
        onProgress: (percent, downloaded, total) => {
          nodeDownloadProgress.value = percent
          nodeDownloadStatus.value = `下载中 ${downloaded} / ${total}`
        },
        onLog: (msg) => {
          nodeDownloadStatus.value = msg
        },
      })

      if (!result.success) {
        nodeDownloadStatus.value = `下载失败: ${result.error}`
        ElMessage.error(`下载失败: ${result.error}`)
        return
      }

      // 2. 打开安装包
      const openResult = installer.openNodeInstaller(result.installerPath)
      if (openResult.success) {
        nodeDownloadStatus.value = '安装程序已打开，请完成安装后点击"重新检测"'
        ElMessage.success(`Node.js v${result.version} 安装包已打开，请在安装向导中完成安装`)
      } else {
        nodeDownloadStatus.value = `打开安装包失败: ${openResult.error}`
        ElMessage.error(`打开安装包失败: ${openResult.error}`)
      }
    } catch (err) {
      nodeDownloadStatus.value = `出错: ${err.message}`
      ElMessage.error(err.message)
    } finally {
      nodeDownloading.value = false
    }
  }

  /**
   * 一键安装 OpenClaw
   */
  async function handleInstallOpenClaw() {
    if (!installer || !executor) return

    openclawInstalling.value = true
    installLogs.value = []
    try {
      const opts = {
        onLog: (text) => installLogs.value.push(text),
      }
      if (npmRegistry.value) {
        opts.registry = npmRegistry.value
      }
      const result = await installer.installOpenClaw(executor, opts)
      if (result.success) {
        ElMessage.success(`OpenClaw ${result.version} 安装成功！`)
        await checkEnvironment()
      } else {
        ElMessage.error(`安装失败: ${result.error}`)
      }
    } catch (err) {
      ElMessage.error(err.message)
    } finally {
      openclawInstalling.value = false
    }
  }

  // ========== 服务控制 ==========

  /**
   * 启动 Gateway
   */
  async function startService() {
    if (!processManager || !executor) {
      ElMessage.warning('主进程模块未加载，无法操作')
      return
    }

    // 环境检查
    if (!envReady.value) {
      ElMessage.warning('请先完成环境检测，确保 Node.js 和 OpenClaw 已安装')
      return
    }

    serviceStore.setLoading(true)
    logsStore.addEntry({ text: '正在启动 Gateway 服务...', type: 'system', level: 'info' })

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
      ElMessage.success('Gateway 已启动')
    } catch (err) {
      serviceStore.setError(err.message)
      logsStore.addEntry({ text: `启动失败: ${err.message}`, type: 'system', level: 'error' })
      ElMessage.error(`启动失败: ${err.message}`)
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
    logsStore.addEntry({ text: '正在停止 Gateway 服务...', type: 'system', level: 'info' })

    try {
      await processManager.stop(executor)
      serviceStore.updateFromStatus(processManager.status)
      logsStore.addEntry({ text: 'Gateway 已停止', type: 'system', level: 'info' })
      ElMessage.success('Gateway 已停止')
    } catch (err) {
      serviceStore.setError(err.message)
      ElMessage.error(`停止失败: ${err.message}`)
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
    logsStore.addEntry({ text: '正在重启 Gateway 服务...', type: 'system', level: 'info' })

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
      ElMessage.success('Gateway 已重启')
    } catch (err) {
      serviceStore.setError(err.message)
      ElMessage.error(`重启失败: ${err.message}`)
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
        ElMessage.success('系统服务已安装')
      } else {
        ElMessage.error(`安装失败: ${result.output}`)
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
      await ElMessageBox.confirm('确定要卸载系统服务吗？', '确认')
      const result = await daemonManager.uninstall(executor)
      if (result.success) {
        serviceStore.daemonInstalled = false
        ElMessage.success('系统服务已卸载')
      } else {
        ElMessage.error(`卸载失败: ${result.output}`)
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
        ElMessage.success(val ? '已启用开机自启' : '已禁用开机自启')
      } else {
        serviceStore.autoStartEnabled = !val
        ElMessage.error(`操作失败: ${result.output}`)
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
        ElMessage.success('通道探测完成')
      } else {
        channelProbe.results = [
          {
            channel: 'error',
            status: 'error',
            message: result.stderr || result.stdout || '探测失败',
          },
        ]
        ElMessage.error('通道探测失败')
      }
    } catch (err) {
      channelProbe.results = [{ channel: 'error', status: 'error', message: err.message }]
      ElMessage.error(`探测出错: ${err.message}`)
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
      ElMessage.warning('请输入目标地址')
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
        msgTest.result = { success: true, message: result.stdout || '消息发送成功' }
        ElMessage.success('测试消息已发送')
      } else {
        msgTest.result = { success: false, message: result.stderr || result.stdout || '发送失败' }
        ElMessage.error('消息发送失败')
      }
    } catch (err) {
      msgTest.result = { success: false, message: err.message }
      ElMessage.error(`发送出错: ${err.message}`)
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
      ElMessage.warning('请选择一个模型')
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
        ElMessage.success(`模型响应成功 (${latency}ms)`)
      } else {
        apiTest.response = { success: false, text: jsonStr || `HTTP ${httpCode}`, latency }
        ElMessage.error(`请求失败: HTTP ${httpCode}`)
      }
    } catch (err) {
      apiTest.response = { success: false, text: err.message, latency: Date.now() - startTime }
      ElMessage.error(`测试出错: ${err.message}`)
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
    <h3 class="page-heading">服务管理</h3>

    <!-- 后端不可用提示 -->
    <el-alert
      v-if="!backendReady"
      title="当前不在 NW.js 环境中，服务管理功能不可用"
      type="warning"
      show-icon
      :closable="false"
      style="margin-bottom: 16px"
    />

    <!-- 环境检测区域 -->
    <el-card class="env-check-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span class="section-title">环境检测</span>
          <el-button size="small" :loading="env.checking" @click="checkEnvironment">
            <el-icon v-if="!env.checking"><ElIconRefresh /></el-icon>
            {{ env.checking ? '检测中...' : '重新检测' }}
          </el-button>
        </div>
      </template>

      <div v-if="!env.checked && !env.checking" class="env-hint">
        <el-icon :size="16"><ElIconInfoFilled /></el-icon>
        <span>正在自动检测运行环境...</span>
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
                <el-tag v-if="env.node.meetsRequirement" type="success" size="small"
                  >符合要求</el-tag
                >
                <el-tag v-else type="danger" size="small">版本过低，需要 >= 22.12.0</el-tag>
              </span>
              <span class="env-item-detail text-danger" v-else>未安装</span>
            </div>
          </div>
          <div v-if="!env.node.meetsRequirement && env.checked" class="node-install-area">
            <el-button
              type="primary"
              size="small"
              :loading="nodeDownloading"
              @click="handleInstallNode"
            >
              {{ nodeDownloading ? '下载中...' : '下载安装 Node.js' }}
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
              <span class="env-item-detail text-warning" v-else>未安装（随 Node.js 附带）</span>
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
              <span class="env-item-detail text-danger" v-else>未安装</span>
            </div>
          </div>
          <div
            v-if="!env.openclaw.installed && env.checked && env.node.meetsRequirement"
            class="install-openclaw-area"
          >
            <el-input
              v-model="npmRegistry"
              size="small"
              placeholder="npm 镜像源（可选）"
              style="width: 200px; margin-right: 8px"
              clearable
            />
            <el-button
              type="primary"
              size="small"
              :loading="openclawInstalling"
              @click="handleInstallOpenClaw"
            >
              {{ openclawInstalling ? '安装中...' : '一键安装 OpenClaw' }}
            </el-button>
          </div>
        </div>
      </div>

      <!-- 安装日志 -->
      <div v-if="installLogs.length > 0" class="install-log">
        <div class="install-log-header">安装日志</div>
        <div class="install-log-content">
          <div v-for="(line, i) in installLogs" :key="i" class="install-log-line">{{ line }}</div>
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
          <div class="status-label">Gateway 服务</div>
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
            <el-radio-button value="foreground">前台模式</el-radio-button>
            <el-radio-button value="daemon">Daemon 模式</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <div class="status-meta">
        <div class="meta-item">
          <span class="meta-label">PID</span>
          <span class="meta-value">{{ serviceStore.gatewayPid ?? '--' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">运行时间</span>
          <span class="meta-value">{{ serviceStore.uptimeText }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Daemon</span>
          <span class="meta-value">{{ serviceStore.daemonInstalled ? '已安装' : '未安装' }}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">端口</span>
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
          {{ serviceStore.gatewayRunning ? '停止' : '启动' }}
        </el-button>
        <el-button
          :disabled="!serviceStore.gatewayRunning || serviceStore.loading"
          @click="restartService"
        >
          <el-icon><ElIconRefresh /></el-icon>
          重启
        </el-button>
        <el-divider direction="vertical" />
        <el-button
          v-if="!serviceStore.daemonInstalled"
          type="info"
          plain
          :disabled="!envReady"
          @click="installDaemon"
        >
          安装系统服务
        </el-button>
        <el-button v-else type="warning" plain @click="uninstallDaemon"> 卸载系统服务 </el-button>
      </div>

      <!-- 选项区 -->
      <div class="service-options">
        <el-checkbox v-model="autoRestart">服务异常退出时自动重启</el-checkbox>
        <div class="auto-start-option">
          <span>开机自启动</span>
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
        title="环境未就绪，请先安装 Node.js 和 OpenClaw 后再启动服务"
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
          <span class="section-title">API 快速测试</span>
          <el-tag size="small" effect="plain" type="info">
            http://localhost:{{ serviceStore.gatewayPort }}/v1/chat/completions
          </el-tag>
        </div>
      </template>

      <div class="api-test-form">
        <el-select
          v-model="apiTest.model"
          size="small"
          placeholder="选择模型"
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
          placeholder="输入测试消息"
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
          {{ apiTest.sending ? '请求中...' : '发送测试' }}
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
            {{ apiTest.response.success ? '成功' : '失败' }}
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
          <span class="section-title">通道测试</span>
          <el-button size="small" :loading="channelProbe.running" @click="handleChannelProbe">
            <el-icon v-if="!channelProbe.running"><ElIconConnection /></el-icon>
            {{ channelProbe.running ? '探测中...' : '探测所有通道' }}
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
      <el-divider content-position="left">发送测试消息</el-divider>
      <div class="msg-test-form">
        <el-select
          v-model="msgTest.channel"
          size="small"
          placeholder="通道（可选）"
          clearable
          style="width: 140px"
        >
          <el-option v-for="ch in enabledChannels" :key="ch" :label="ch" :value="ch" />
        </el-select>
        <el-input
          v-model="msgTest.target"
          size="small"
          placeholder="目标地址（用户ID / 手机号 / 频道ID）"
          style="flex: 1"
        />
        <el-input
          v-model="msgTest.message"
          size="small"
          placeholder="测试消息内容"
          style="width: 200px"
        />
        <el-button
          type="primary"
          size="small"
          :loading="msgTest.sending"
          :disabled="!msgTest.target"
          @click="handleSendTestMessage"
        >
          发送
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
          <span class="section-title">实时日志</span>
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
              placeholder="搜索..."
              clearable
              style="width: 150px"
            />
            <el-button
              :type="logsStore.paused ? 'warning' : 'default'"
              size="small"
              @click="logsStore.togglePause()"
            >
              {{ logsStore.paused ? '恢复' : '暂停' }}
            </el-button>
            <el-checkbox v-model="logsStore.autoScroll" size="small">自动滚动</el-checkbox>
            <el-button text size="small" @click="clearLogs">清空</el-button>
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
        <div v-if="displayLogs.length === 0" class="terminal-empty">暂无日志输出</div>
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

  .install-openclaw-area {
    display: flex;
    align-items: center;
  }

  /* 安装日志 */
  .install-log {
    margin-top: 12px;
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
