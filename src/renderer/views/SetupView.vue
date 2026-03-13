<script setup>
/**
 * 安装向导页面
 * 步骤式引导：环境检测 -> 安装 Node.js -> 安装 OpenClaw -> 完成
 * 所有操作通过 executor 抽象层执行，支持本地和远程实例
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app.js'
import { ElMessage } from 'element-plus'
import { getBackend } from '../utils/nw-bridge'

const router = useRouter()
const appStore = useAppStore()

/* 当前步骤（0-3） */
const currentStep = ref(0)

/* 各步骤状态 */
const steps = ref([
  { status: 'pending', message: '等待检测...' },
  { status: 'pending', message: '等待安装...' },
  { status: 'pending', message: '等待安装...' },
  { status: 'pending', message: '准备就绪' },
])

/* 环境检测结果 */
const envCheck = ref({
  nodeInstalled: false,
  nodeVersion: '',
  nodeMeetsRequirement: false,
  npmInstalled: false,
  npmVersion: '',
  openclawInstalled: false,
  openclawVersion: '',
})

/* 安装日志输出 */
const installLog = ref([])

/* 是否正在执行操作 */
const isProcessing = ref(false)

/* Node.js 安装指引 */
const nodeInstallGuide = ref(null)

/* npm 镜像源 */
const npmRegistry = ref('')

/* Node.js 安装路径 */
const nodeInstallDir = ref('C:\\Program Files\\nodejs')

/* Node.js 自动下载状态 */
const nodeDownloading = ref(false)
const nodeDownloadProgress = ref(0)
const nodeDownloadStatus = ref('')  // '', 'downloading', 'done', 'error'
const nodeDownloadError = ref('')
const nodeDownloadVersion = ref('')

/* 步骤标题 */
const stepTitles = ['环境检测', '安装 Node.js', '安装 OpenClaw', '完成']

/* 当前步骤是否可以继续 */
const canProceed = computed(() => {
  return steps.value[currentStep.value]?.status === 'success'
})

/* 获取执行器（通过 nw-bridge） */
function getExecutor() {
  const backend = getBackend()
  return backend?.localExecutor ?? null
}

/* 获取 installer 模块 */
function getInstaller() {
  const backend = getBackend()
  return backend?.installer ?? null
}

/* 添加日志行 */
function addLog(message) {
  installLog.value.push(message)
}

/* 开始环境检测 */
async function startEnvCheck() {
  const executor = getExecutor()
  const installer = getInstaller()

  isProcessing.value = true
  steps.value[0].status = 'running'
  steps.value[0].message = '正在检测环境...'
  installLog.value = []

  if (!executor || !installer) {
    addLog('[提示] 非 NW.js 环境，使用模拟数据')
    steps.value[0].status = 'success'
    steps.value[0].message = '检测完成（模拟）'
    isProcessing.value = false
    return
  }

  // 监听安装日志事件
  const eventBus = getBackend()?.eventBus
  const { InstallerEvents } = installer
  const logHandler = (data) => addLog(data.message)
  eventBus.on(InstallerEvents.LOG, logHandler)

  try {
    // 检测 Node.js
    const nodeResult = await installer.checkNode(executor)
    envCheck.value.nodeInstalled = nodeResult.installed
    envCheck.value.nodeVersion = nodeResult.version ? `v${nodeResult.version}` : ''
    envCheck.value.nodeMeetsRequirement = nodeResult.meetsRequirement

    // 检测 npm
    const npmResult = await installer.checkNpm(executor)
    envCheck.value.npmInstalled = npmResult.installed
    envCheck.value.npmVersion = npmResult.version ? `v${npmResult.version}` : ''

    // 检测 OpenClaw
    const openclawResult = await installer.checkOpenClaw(executor)
    envCheck.value.openclawInstalled = openclawResult.installed
    envCheck.value.openclawVersion = openclawResult.version || ''

    // 更新 appStore
    appStore.nodeVersion = nodeResult.version
    appStore.openclawVersion = openclawResult.version
    appStore.openclawInstalled = openclawResult.installed

    // 获取 Node.js 安装指引
    nodeInstallGuide.value = await installer.getNodeInstallGuide(executor)

    // 更新步骤状态
    steps.value[0].status = 'success'
    steps.value[0].message = '检测完成'

    // 根据检测结果自动标记已完成步骤
    if (nodeResult.meetsRequirement && npmResult.installed) {
      steps.value[1].status = 'success'
      steps.value[1].message = `Node.js ${envCheck.value.nodeVersion} 已就绪`
    }
    if (openclawResult.installed) {
      steps.value[2].status = 'success'
      steps.value[2].message = `OpenClaw ${openclawResult.version} 已安装`
    }

    // 根据检测结果自动跳转到合适的步骤
    if (nodeResult.meetsRequirement && npmResult.installed && openclawResult.installed) {
      currentStep.value = 3
      steps.value[3].status = 'success'
    } else if (nodeResult.meetsRequirement && npmResult.installed) {
      currentStep.value = 2
    } else {
      currentStep.value = 1
    }
  } finally {
    eventBus.off(InstallerEvents.LOG, logHandler)
    isProcessing.value = false
  }
}

/* 全自动下载 + 静默安装 Node.js */
async function autoDownloadNode() {
  const installer = getInstaller()
  if (!installer || nodeDownloading.value) return

  nodeDownloading.value = true
  nodeDownloadProgress.value = 0
  nodeDownloadStatus.value = 'downloading'
  nodeDownloadError.value = ''

  try {
    const result = await installer.installNodeSilent(null, {
      installDir: nodeInstallDir.value || undefined,
      onProgress: (percent, downloaded, total) => {
        nodeDownloadProgress.value = percent
      },
      onLog: (msg) => addLog(msg),
    })

    if (result.success) {
      nodeDownloadStatus.value = 'done'
      nodeDownloadVersion.value = result.version || ''
      addLog(`Node.js v${result.version} 已自动安装到 ${result.installDir}`)

      // 自动重新检测并跳到下一步
      const executor = getExecutor()
      if (executor) {
        const nodeResult = await installer.checkNode(executor)
        envCheck.value.nodeInstalled = nodeResult.installed
        envCheck.value.nodeVersion = nodeResult.version ? `v${nodeResult.version}` : ''
        envCheck.value.nodeMeetsRequirement = nodeResult.meetsRequirement
        appStore.nodeVersion = nodeResult.version

        const npmResult = await installer.checkNpm(executor)
        envCheck.value.npmInstalled = npmResult.installed
        envCheck.value.npmVersion = npmResult.version ? `v${npmResult.version}` : ''

        if (nodeResult.meetsRequirement && npmResult.installed) {
          steps.value[1].status = 'success'
          steps.value[1].message = `Node.js ${envCheck.value.nodeVersion} 已就绪`
          ElMessage.success('Node.js 自动安装成功！')
          currentStep.value = 2
        }
      }
    } else {
      nodeDownloadStatus.value = 'error'
      nodeDownloadError.value = result.error
    }
  } catch (err) {
    nodeDownloadStatus.value = 'error'
    nodeDownloadError.value = err.message
    addLog(`安装失败: ${err.message}`)
  } finally {
    nodeDownloading.value = false
  }
}

/* 当进入步骤1且Node未安装时，自动开始下载 */
watch(currentStep, (step) => {
  if (step === 1 && !envCheck.value.nodeMeetsRequirement && nodeDownloadStatus.value === '') {
    // 判断是否 Windows 平台（有 downloadNodeMsi）
    const installer = getInstaller()
    if (installer?.downloadNodeMsi) {
      autoDownloadNode()
    }
  }
})

/* 重新检测 Node.js（用户安装完 MSI 后点击） */
async function recheckNode() {
  const executor = getExecutor()
  const installer = getInstaller()
  if (!executor || !installer) return

  isProcessing.value = true
  addLog('正在重新检测 Node.js...')

  const nodeResult = await installer.checkNode(executor)
  envCheck.value.nodeInstalled = nodeResult.installed
  envCheck.value.nodeVersion = nodeResult.version ? `v${nodeResult.version}` : ''
  envCheck.value.nodeMeetsRequirement = nodeResult.meetsRequirement
  appStore.nodeVersion = nodeResult.version

  const npmResult = await installer.checkNpm(executor)
  envCheck.value.npmInstalled = npmResult.installed
  envCheck.value.npmVersion = npmResult.version ? `v${npmResult.version}` : ''

  if (nodeResult.meetsRequirement && npmResult.installed) {
    steps.value[1].status = 'success'
    steps.value[1].message = `Node.js ${envCheck.value.nodeVersion} 已就绪`
    ElMessage.success('Node.js 检测通过！')
    currentStep.value = 2
  } else if (nodeResult.installed) {
    ElMessage.warning(`Node.js ${envCheck.value.nodeVersion} 版本过低，需要 >= 22.12.0`)
  } else {
    ElMessage.warning('未检测到 Node.js，请先完成安装后再点击检测')
  }

  isProcessing.value = false
}

/* 安装 Node.js（自动方式） */
async function handleInstallNode(method) {
  const executor = getExecutor()
  const installer = getInstaller()
  if (!executor || !installer) return

  isProcessing.value = true
  steps.value[1].status = 'running'
  steps.value[1].message = '正在安装 Node.js...'

  const result = await installer.installNode(executor, method, {
    onLog: (data) => addLog(data.trim()),
  })

  if (result.success) {
    // 重新检测
    const nodeResult = await installer.checkNode(executor)
    envCheck.value.nodeInstalled = nodeResult.installed
    envCheck.value.nodeVersion = nodeResult.version ? `v${nodeResult.version}` : ''
    envCheck.value.nodeMeetsRequirement = nodeResult.meetsRequirement
    appStore.nodeVersion = nodeResult.version

    const npmResult = await installer.checkNpm(executor)
    envCheck.value.npmInstalled = npmResult.installed
    envCheck.value.npmVersion = npmResult.version ? `v${npmResult.version}` : ''

    steps.value[1].status = 'success'
    steps.value[1].message = `Node.js ${envCheck.value.nodeVersion} 安装成功`
    ElMessage.success('Node.js 安装成功！')
    currentStep.value = 2
  } else {
    steps.value[1].status = 'error'
    steps.value[1].message = result.error
    ElMessage.error(`Node.js 安装失败: ${result.error}`)
  }

  isProcessing.value = false
}

/* 安装 OpenClaw */
async function handleInstallOpenClaw() {
  const executor = getExecutor()
  const installer = getInstaller()
  if (!executor || !installer) return

  isProcessing.value = true
  steps.value[2].status = 'running'
  steps.value[2].message = '正在安装 OpenClaw...'

  const options = {
    onLog: (data) => addLog(data.trim()),
  }
  if (npmRegistry.value) {
    options.registry = npmRegistry.value
  }

  const result = await installer.installOpenClaw(executor, options)

  if (result.success) {
    envCheck.value.openclawInstalled = true
    envCheck.value.openclawVersion = result.version || ''
    appStore.openclawInstalled = true
    appStore.openclawVersion = result.version

    steps.value[2].status = 'success'
    steps.value[2].message = `OpenClaw ${result.version} 安装成功`
    ElMessage.success('OpenClaw 安装成功！')
    currentStep.value = 3
    steps.value[3].status = 'success'
  } else {
    steps.value[2].status = 'error'
    steps.value[2].message = result.error
    ElMessage.error(`OpenClaw 安装失败: ${result.error}`)
  }

  isProcessing.value = false
}

/* 下一步 */
function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

/* 上一步 */
function prevStep() {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

/* 完成安装，进入主界面 */
async function finishSetup() {
  const executor = getExecutor()
  const installer = getInstaller()

  if (executor && installer && envCheck.value.openclawInstalled) {
    isProcessing.value = true
    addLog('正在运行 OpenClaw 环境诊断...')
    await installer.runOnboard(executor)
    isProcessing.value = false
  }

  appStore.isFirstRun = false
  router.push('/dashboard')
}

/* 跳过安装向导 */
function skipSetup() {
  appStore.isFirstRun = false
  router.push('/dashboard')
}

onMounted(async () => {
  startEnvCheck()
  // 根据地区自动填充 npm 镜像源
  const installer = getInstaller()
  if (installer?.getRecommendedRegistry) {
    try {
      const registry = await installer.getRecommendedRegistry()
      if (registry && !npmRegistry.value) {
        npmRegistry.value = registry
      }
    } catch { /* ignore */ }
  }
})
</script>

<template>
  <div class="setup-view">
    <!-- 背景装饰 -->
    <div class="setup-bg-pattern" />

    <!-- 主卡片 -->
    <div class="setup-card">
      <!-- 标题区 -->
      <div class="setup-header">
        <div class="setup-logo">
          <el-icon :size="48" color="var(--ct-primary)"><ElIconMonitor /></el-icon>
        </div>
        <h1 class="setup-title">欢迎使用 Claw Tool</h1>
        <p class="setup-subtitle">OpenClaw 桌面管理工具 - 只需几步即可开始</p>
      </div>

      <!-- 步骤指示器 -->
      <el-steps :active="currentStep" finish-status="success" align-center class="setup-steps">
        <el-step v-for="(title, index) in stepTitles" :key="index" :title="title" />
      </el-steps>

      <!-- 步骤内容区 -->
      <div class="setup-content">
        <!-- 步骤 0：环境检测 -->
        <div v-if="currentStep === 0" class="step-panel">
          <div class="env-check-grid">
            <div class="check-item">
              <el-icon :size="24" :color="envCheck.nodeInstalled ? 'var(--ct-success)' : 'var(--ct-text-secondary)'">
                <ElIconCircleCheck v-if="envCheck.nodeInstalled" />
                <ElIconRemove v-else />
              </el-icon>
              <div class="check-info">
                <span class="check-label">Node.js</span>
                <span class="check-detail">{{ envCheck.nodeVersion || '未检测' }}</span>
              </div>
            </div>
            <div class="check-item">
              <el-icon :size="24" :color="envCheck.npmInstalled ? 'var(--ct-success)' : 'var(--ct-text-secondary)'">
                <ElIconCircleCheck v-if="envCheck.npmInstalled" />
                <ElIconRemove v-else />
              </el-icon>
              <div class="check-info">
                <span class="check-label">npm</span>
                <span class="check-detail">{{ envCheck.npmVersion || '未检测' }}</span>
              </div>
            </div>
            <div class="check-item">
              <el-icon :size="24" :color="envCheck.openclawInstalled ? 'var(--ct-success)' : 'var(--ct-text-secondary)'">
                <ElIconCircleCheck v-if="envCheck.openclawInstalled" />
                <ElIconRemove v-else />
              </el-icon>
              <div class="check-info">
                <span class="check-label">OpenClaw</span>
                <span class="check-detail">{{ envCheck.openclawVersion || '未检测' }}</span>
              </div>
            </div>
          </div>
          <el-button type="primary" :loading="isProcessing" @click="startEnvCheck">
            开始检测
          </el-button>
        </div>

        <!-- 步骤 1：安装 Node.js -->
        <div v-if="currentStep === 1" class="step-panel">
          <div class="install-info">
            <el-icon :size="40" color="var(--ct-warning)"><ElIconDownload /></el-icon>
            <h3>安装 Node.js</h3>
            <p>OpenClaw 需要 Node.js >= 22.12.0 运行环境</p>
          </div>

          <!-- 已安装 -->
          <div v-if="envCheck.nodeMeetsRequirement" class="already-installed">
            <el-result icon="success" title="Node.js 已安装" :sub-title="'版本: ' + envCheck.nodeVersion" />
          </div>

          <!-- 未安装：自动下载 + 手动选项 -->
          <template v-else>
            <!-- 安装路径 -->
            <div v-if="nodeDownloadStatus === '' || nodeDownloadStatus === 'error'" class="node-install-dir">
              <el-form-item label="安装路径" label-width="auto" style="margin-bottom: 0">
                <el-input v-model="nodeInstallDir" placeholder="C:\Program Files\nodejs" style="width: 360px" />
              </el-form-item>
            </div>

            <!-- 下载 + 安装进度区 -->
            <div v-if="nodeDownloadStatus === 'downloading'" class="node-download-section">
              <div class="download-status-text">
                <el-icon class="is-loading"><ElIconLoading /></el-icon>
                <span>{{ nodeDownloadProgress < 100 ? '正在下载 Node.js 安装包...' : '正在静默安装 Node.js...' }}</span>
              </div>
              <el-progress :percentage="nodeDownloadProgress" :stroke-width="10" style="width: 100%" />
              <div class="install-log" style="margin-top: 12px">
                <div v-for="(line, i) in installLog" :key="i" class="log-line">{{ line }}</div>
              </div>
            </div>

            <!-- 安装完成 -->
            <div v-else-if="nodeDownloadStatus === 'done'" class="node-download-section">
              <el-result icon="success" title="Node.js 安装成功" :sub-title="'Node.js v' + nodeDownloadVersion + ' 已自动安装并配置环境变量'">
                <template #extra>
                  <div class="recheck-actions">
                    <el-button type="primary" :loading="isProcessing" @click="recheckNode">
                      <el-icon><ElIconRefresh /></el-icon> 重新检测
                    </el-button>
                  </div>
                </template>
              </el-result>
            </div>

            <!-- 下载失败 -->
            <div v-else-if="nodeDownloadStatus === 'error'" class="node-download-section">
              <el-result icon="error" title="下载失败" :sub-title="nodeDownloadError">
                <template #extra>
                  <el-button type="primary" @click="autoDownloadNode">重试下载</el-button>
                </template>
              </el-result>
            </div>

            <!-- 初始/备选安装方式 -->
            <div v-else class="install-actions">
              <template v-if="nodeInstallGuide">
                <el-button
                  v-for="method in nodeInstallGuide.methods.filter(m => m.command)"
                  :key="method.name"
                  type="primary"
                  :loading="isProcessing"
                  @click="handleInstallNode(method.command.includes('brew') ? 'brew' : 'nvm')"
                >
                  {{ method.name }}
                </el-button>
                <el-button
                  v-for="method in nodeInstallGuide.methods.filter(m => m.url)"
                  :key="method.name + '-url'"
                  text
                  @click="typeof nw !== 'undefined' && nw.Shell.openExternal(method.url)"
                >
                  {{ method.name }}
                </el-button>
              </template>
              <el-button v-else type="primary" :loading="isProcessing" disabled>
                自动安装 Node.js
              </el-button>
            </div>
          </template>
        </div>

        <!-- 步骤 2：安装 OpenClaw -->
        <div v-if="currentStep === 2" class="step-panel">
          <div class="install-info">
            <el-icon :size="40" color="var(--ct-primary)"><ElIconBox /></el-icon>
            <h3>安装 OpenClaw</h3>
            <p>将通过 npm 全局安装 OpenClaw</p>
          </div>
          <div class="install-command">
            <code>npm install -g openclaw@latest</code>
          </div>
          <el-form style="margin: 12px 0; width: 100%;">
            <el-form-item label="npm 镜像源（可选）" label-width="auto">
              <el-input
                v-model="npmRegistry"
                placeholder="例如 https://registry.npmmirror.com"
                clearable
                style="max-width: 400px"
              />
            </el-form-item>
          </el-form>
          <!-- 安装日志 -->
          <div class="install-log">
            <div v-for="(line, i) in installLog" :key="i" class="log-line">{{ line }}</div>
            <div v-if="installLog.length === 0" class="log-placeholder">点击安装开始...</div>
          </div>
          <el-button type="primary" :loading="isProcessing" @click="handleInstallOpenClaw">开始安装</el-button>
        </div>

        <!-- 步骤 3：完成 -->
        <div v-if="currentStep === 3" class="step-panel">
          <el-result
            icon="success"
            title="安装完成"
            sub-title="OpenClaw 已准备就绪，点击下方按钮进入主界面"
          >
            <template #extra>
              <el-button type="primary" size="large" @click="finishSetup">开始使用</el-button>
            </template>
          </el-result>
        </div>
      </div>

      <!-- 底部导航按钮 -->
      <div class="setup-footer">
        <el-button v-if="currentStep > 0 && currentStep < 3" text @click="prevStep">上一步</el-button>
        <el-button text @click="skipSetup">跳过向导</el-button>
        <div class="flex-spacer" />
        <el-button
          v-if="currentStep < 3"
          type="primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          下一步
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setup-view {
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ct-bg-base);
  position: relative;
  overflow: hidden;
}

/* 背景装饰 */
.setup-bg-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(64, 158, 255, 0.08), transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(103, 194, 58, 0.05), transparent 50%);
  pointer-events: none;
}

/* 主卡片 */
.setup-card {
  position: relative;
  width: 680px;
  max-width: 90vw;
  background: var(--ct-bg-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-radius-lg);
  padding: 40px;
  box-shadow: var(--ct-shadow-lg);
}

.setup-header {
  text-align: center;
  margin-bottom: 32px;
}

.setup-logo {
  margin-bottom: 16px;
}

.setup-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--ct-text-primary);
  margin-bottom: 8px;
}

.setup-subtitle {
  font-size: 14px;
  color: var(--ct-text-secondary);
}

.setup-steps {
  margin-bottom: 32px;
}

.setup-content {
  min-height: 200px;
}

.step-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

/* 环境检测网格 */
.env-check-grid {
  width: 100%;
  display: flex;
  gap: 16px;
  justify-content: center;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--ct-bg-elevated);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-radius-md);
  min-width: 160px;
}

.check-info {
  display: flex;
  flex-direction: column;
}

.check-label {
  font-weight: 600;
  color: var(--ct-text-primary);
}

.check-detail {
  font-size: 12px;
  color: var(--ct-text-secondary);
}

.install-info {
  text-align: center;
}

.install-info h3 {
  margin-top: 12px;
  font-size: 18px;
  color: var(--ct-text-primary);
}

.install-info p {
  margin-top: 6px;
  color: var(--ct-text-secondary);
}

.install-command {
  padding: 10px 20px;
  background: var(--ct-bg-base);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-radius-sm);
}

.install-command code {
  color: var(--ct-success);
  font-family: 'Cascadia Code', 'Fira Code', monospace;
}

.install-actions {
  display: flex;
  gap: 12px;
}

.node-install-dir {
  width: 100%;
  margin-bottom: 8px;
}

/* Node 自动下载区 */
.node-download-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.download-status-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ct-text-secondary);
}

.recheck-actions {
  display: flex;
  gap: 12px;
}

.already-installed {
  width: 100%;
}

.install-log {
  width: 100%;
  height: 120px;
  background: var(--ct-bg-base);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-radius-sm);
  padding: 10px;
  overflow-y: auto;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  font-size: 12px;
}

.log-line {
  color: var(--ct-text-regular);
  line-height: 1.6;
}

.log-placeholder {
  color: var(--ct-text-placeholder);
}

.setup-footer {
  display: flex;
  align-items: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--ct-border);
}

.flex-spacer {
  flex: 1;
}
</style>
