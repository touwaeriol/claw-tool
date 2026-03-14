<script setup lang="ts">
  /**
   * 仪表盘页面
   * 运行状态概览、快速操作卡片、健康检查、最近日志
   */
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useRouter } from 'vue-router'
  import { ElMessage } from 'element-plus'
  import { useInstanceStore } from '../stores/instance.js'
  import { useServiceStore } from '../stores/service.js'
  import { useConfigStore } from '../stores/config.js'
  import { getBackend } from '../utils/nw-bridge'

  const router = useRouter()
  const instanceStore = useInstanceStore()
  const serviceStore = useServiceStore()
  const configStore = useConfigStore()

  const backend = getBackend()
  const monitor = backend?.monitor ?? null
  const openclawUpdater = backend?.openclawUpdater ?? null

  // 状态数据
  const statusLoading = ref(false)
  const openclawVersion = ref('--')
  const uptime = ref('--')
  const gatewayReachable = ref(false)
  const statusRaw = ref('')
  const lastRefreshed = ref('')

  // 健康检查
  const healthItems = ref([
    { label: 'Node.js', status: 'unknown', detail: '检测中...' },
    { label: 'OpenClaw', status: 'unknown', detail: '检测中...' },
    { label: 'Gateway', status: 'unknown', detail: '检测中...' },
    { label: '配置文件', status: 'unknown', detail: '检测中...' },
  ])

  // OpenClaw 更新状态
  const latestVersion = ref(null)
  const hasUpdate = ref(false)
  const updateChecking = ref(false)
  const updating = ref(false)
  const updateLog = ref('')

  // 最近日志
  const recentLogs = ref([{ time: '--:--:--', level: 'info', message: '等待加载...' }])

  // 当前实例名称
  const currentInstanceName = computed(() => {
    return instanceStore.activeInstance?.name || '本地实例'
  })

  // 通道定义（与 ChannelsView 一致）
  const channelDefs = [
    { id: 'telegram', name: 'Telegram', icon: 'https://cdn.simpleicons.org/telegram/26A5E4' },
    { id: 'discord', name: 'Discord', icon: 'https://cdn.simpleicons.org/discord/5865F2' },
    { id: 'slack', name: 'Slack', icon: '/icons/slack.svg' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'https://cdn.simpleicons.org/whatsapp/25D366' },
    { id: 'signal', name: 'Signal', icon: 'https://cdn.simpleicons.org/signal/3A76F0' },
    { id: 'line', name: 'LINE', icon: 'https://cdn.simpleicons.org/line/00C300' },
    { id: 'matrix', name: 'Matrix', icon: 'https://cdn.simpleicons.org/matrix/000000' },
    { id: 'irc', name: 'IRC', icon: '/icons/irc.svg' },
    {
      id: 'googlechat',
      name: 'Google Chat',
      icon: 'https://cdn.simpleicons.org/googlechat/00AC47',
    },
    { id: 'mattermost', name: 'Mattermost', icon: 'https://cdn.simpleicons.org/mattermost/0058CC' },
    { id: 'feishu', name: '飞书', icon: '/icons/feishu.svg' },
    { id: 'msteams', name: 'MS Teams', icon: '/icons/msteams.svg' },
    { id: 'nostr', name: 'Nostr', icon: '/icons/nostr.svg' },
  ]

  // 已启用的通道列表
  const enabledChannels = computed(() => {
    const channelsCfg = configStore.channels || {}
    return channelDefs.filter((def) => channelsCfg[def.id]?.enabled === true)
  })

  // 供应商及模型列表
  const providerList = computed(() => {
    const providers = configStore.providers || {}
    return Object.entries(providers).map(([name, config]) => ({
      name,
      apiType: config.apiType || config.api_type || '--',
      models: Array.isArray(config.models) ? config.models : [],
    }))
  })

  // 轮询定时器
  let refreshTimer = null

  onMounted(() => {
    refreshAll()
    refreshTimer = setInterval(refreshAll, 15000)
  })

  onUnmounted(() => {
    if (refreshTimer) clearInterval(refreshTimer)
  })

  /**
   * 获取当前活跃执行器
   */
  function getExecutor() {
    return instanceStore.getActiveExecutor()
  }

  /**
   * 刷新所有状态
   */
  async function refreshAll() {
    const executor = getExecutor()
    if (!executor || !monitor) return

    statusLoading.value = true
    try {
      const [status, version, portOk] = await Promise.all([
        monitor.getStatus(executor),
        monitor.getVersion(executor),
        monitor.testGatewayPort(executor, serviceStore.gatewayPort),
      ])

      serviceStore.gatewayRunning = status.running
      statusRaw.value = status.raw || ''
      openclawVersion.value = version || '--'
      gatewayReachable.value = portOk
      lastRefreshed.value = new Date().toLocaleTimeString()

      // 更新健康检查项
      await refreshHealthCheck(executor)
    } catch (err) {
      console.error('刷新状态失败:', err)
    } finally {
      statusLoading.value = false
    }
  }

  /**
   * 刷新健康检查
   */
  async function refreshHealthCheck(executor) {
    if (!executor) return

    // Node.js 检测
    try {
      const nodeResult = await executor.exec('node --version', { timeout: 5000 })
      if (nodeResult.exitCode === 0) {
        healthItems.value[0] = { label: 'Node.js', status: 'ok', detail: nodeResult.stdout.trim() }
      } else {
        healthItems.value[0] = { label: 'Node.js', status: 'error', detail: '未安装' }
      }
    } catch {
      healthItems.value[0] = { label: 'Node.js', status: 'error', detail: '检测失败' }
    }

    // OpenClaw 检测
    healthItems.value[1] = {
      label: 'OpenClaw',
      status: openclawVersion.value !== '--' ? 'ok' : 'error',
      detail: openclawVersion.value !== '--' ? openclawVersion.value : '未安装',
    }

    // Gateway 状态
    healthItems.value[2] = {
      label: 'Gateway',
      status: serviceStore.gatewayRunning ? 'ok' : 'warn',
      detail: serviceStore.gatewayRunning
        ? gatewayReachable.value
          ? `端口 ${serviceStore.gatewayPort} 可达`
          : '运行中但端口不可达'
        : '未运行',
    }

    // 配置文件检测
    try {
      const homeDir = await executor.getHomeDir()
      const configExists = await executor.exists(`${homeDir}/.openclaw/openclaw.json`)
      healthItems.value[3] = {
        label: '配置文件',
        status: configExists ? 'ok' : 'warn',
        detail: configExists ? '已找到' : '不存在',
      }
    } catch {
      healthItems.value[3] = { label: '配置文件', status: 'warn', detail: '检测失败' }
    }
  }

  /**
   * 启动/停止 Gateway
   */
  async function toggleService() {
    const executor = getExecutor()
    if (!executor) return

    try {
      if (serviceStore.gatewayRunning) {
        await executor.exec('openclaw daemon stop', { timeout: 15000 })
        ElMessage.success('Gateway 已停止')
      } else {
        await executor.exec('openclaw daemon start', { timeout: 15000 })
        ElMessage.success('Gateway 已启动')
      }
      setTimeout(refreshAll, 1500)
    } catch (err) {
      ElMessage.error(`操作失败: ${err.message}`)
    }
  }

  /**
   * 重启服务
   */
  async function handleRestart() {
    const executor = getExecutor()
    if (!executor) return
    try {
      await executor.exec('openclaw daemon restart', { timeout: 20000 })
      ElMessage.success('Gateway 已重启')
      setTimeout(refreshAll, 1500)
    } catch (err) {
      ElMessage.error(`重启失败: ${err.message}`)
    }
  }

  function goLogs() {
    router.push('/logs')
  }

  function goTest() {
    router.push('/test')
  }

  /**
   * 检查 OpenClaw 更新
   */
  async function checkOpenclawUpdate() {
    const executor = getExecutor()
    if (!executor || !openclawUpdater) return

    updateChecking.value = true
    try {
      const result = await openclawUpdater.checkForUpdate(executor)
      hasUpdate.value = result.hasUpdate
      latestVersion.value = result.latestVersion
      if (result.hasUpdate) {
        ElMessage.info(`OpenClaw 有新版本可用: ${result.latestVersion}`)
      }
    } catch (err) {
      console.warn('检查 OpenClaw 更新失败:', err.message)
    } finally {
      updateChecking.value = false
    }
  }

  /**
   * 执行 OpenClaw 更新
   */
  async function performOpenclawUpdate() {
    const executor = getExecutor()
    if (!executor || !openclawUpdater) return

    updating.value = true
    updateLog.value = ''
    try {
      const result = await openclawUpdater.performUpdate(executor, null, (progress) => {
        updateLog.value += progress.message + '\n'
      })
      if (result.success) {
        ElMessage.success(result.message)
        openclawVersion.value = result.version || openclawVersion.value
        hasUpdate.value = false
      } else {
        ElMessage.error(result.message)
      }
    } catch (err) {
      ElMessage.error(`更新失败: ${err.message}`)
    } finally {
      updating.value = false
    }
  }
</script>

<template>
  <div class="dashboard-view">
    <!-- 顶部状态卡片 -->
    <div class="status-cards">
      <el-card class="status-card hover-card" shadow="never">
        <div class="card-header">
          <el-icon :size="20" color="var(--ct-primary)"><ElIconMonitor /></el-icon>
          <span>服务状态</span>
        </div>
        <div class="card-value">
          <span
            class="status-dot"
            :class="serviceStore.gatewayRunning ? 'status-dot--running' : 'status-dot--stopped'"
          />
          <span :class="serviceStore.gatewayRunning ? 'text-success' : 'text-danger'">
            {{ serviceStore.gatewayRunning ? '运行中' : '已停止' }}
          </span>
        </div>
        <div class="card-footer">
          端口 {{ serviceStore.gatewayPort }}
          <span v-if="lastRefreshed" class="refresh-hint"> | 更新于 {{ lastRefreshed }}</span>
        </div>
      </el-card>

      <el-card class="status-card hover-card" shadow="never">
        <div class="card-header">
          <el-icon :size="20" color="var(--ct-success)"><ElIconTimer /></el-icon>
          <span>OpenClaw 版本</span>
          <el-tag
            v-if="hasUpdate"
            type="warning"
            size="small"
            effect="plain"
            style="margin-left: auto"
          >
            有更新
          </el-tag>
        </div>
        <div class="card-value">{{ openclawVersion }}</div>
        <div class="card-footer">
          <template v-if="hasUpdate && latestVersion">
            最新: {{ latestVersion }}
            <el-button
              type="primary"
              size="small"
              link
              :loading="updating"
              @click="performOpenclawUpdate"
              style="margin-left: 8px"
            >
              立即更新
            </el-button>
          </template>
          <template v-else>
            实例: {{ currentInstanceName }}
            <el-button
              size="small"
              link
              :loading="updateChecking"
              @click="checkOpenclawUpdate"
              style="margin-left: 8px"
            >
              检查更新
            </el-button>
          </template>
        </div>
      </el-card>

      <el-card class="status-card hover-card" shadow="never">
        <div class="card-header">
          <el-icon :size="20" color="var(--ct-warning)"><ElIconChatDotRound /></el-icon>
          <span>活跃通道</span>
        </div>
        <div class="card-value">{{ serviceStore.activeChannels.length }}</div>
        <div class="card-footer">
          {{
            serviceStore.activeChannels.length > 0
              ? serviceStore.activeChannels.join(', ')
              : '无活跃通道'
          }}
        </div>
      </el-card>
    </div>

    <!-- 快捷操作 + 健康检查 -->
    <div class="dashboard-middle">
      <el-card class="quick-actions" shadow="never">
        <template #header>
          <span class="section-title">快速操作</span>
        </template>
        <div class="action-buttons">
          <el-button
            :type="serviceStore.gatewayRunning ? 'danger' : 'primary'"
            size="large"
            @click="toggleService"
          >
            <el-icon>
              <ElIconVideoPlay v-if="!serviceStore.gatewayRunning" />
              <ElIconVideoPause v-else />
            </el-icon>
            {{ serviceStore.gatewayRunning ? '停止服务' : '启动服务' }}
          </el-button>
          <el-button size="large" @click="handleRestart">
            <el-icon><ElIconRefresh /></el-icon>
            重启服务
          </el-button>
          <el-button size="large" @click="goLogs">
            <el-icon><ElIconDocument /></el-icon>
            查看日志
          </el-button>
          <el-button size="large" @click="goTest">
            <el-icon><ElIconChatLineSquare /></el-icon>
            发送测试
          </el-button>
          <el-button size="large" :loading="statusLoading" @click="refreshAll">
            <el-icon><ElIconRefresh /></el-icon>
            刷新状态
          </el-button>
        </div>
      </el-card>

      <el-card class="health-check" shadow="never">
        <template #header>
          <span class="section-title">健康检查</span>
        </template>
        <div class="health-list">
          <div v-for="item in healthItems" :key="item.label" class="health-item">
            <el-icon
              :size="16"
              :color="
                item.status === 'ok'
                  ? 'var(--ct-success)'
                  : item.status === 'warn'
                    ? 'var(--ct-warning)'
                    : item.status === 'error'
                      ? 'var(--ct-danger)'
                      : 'var(--ct-info)'
              "
            >
              <ElIconCircleCheck v-if="item.status === 'ok'" />
              <ElIconWarning v-else-if="item.status === 'warn'" />
              <ElIconCircleClose v-else-if="item.status === 'error'" />
              <ElIconLoading v-else />
            </el-icon>
            <span class="health-label">{{ item.label }}</span>
            <span class="health-detail">{{ item.detail }}</span>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 状态详情 -->
    <el-card v-if="statusRaw" class="recent-logs" shadow="never">
      <template #header>
        <span class="section-title">状态详情</span>
      </template>
      <pre class="status-output selectable">{{ statusRaw }}</pre>
    </el-card>

    <!-- 通道概览 -->
    <el-card class="overview-card" shadow="never">
      <template #header>
        <span class="section-title">通道概览</span>
        <el-tag size="small" type="info" effect="plain" style="margin-left: 8px">
          {{ enabledChannels.length }} 个已启用
        </el-tag>
      </template>
      <div v-if="enabledChannels.length > 0" class="channel-tags">
        <div v-for="ch in enabledChannels" :key="ch.id" class="channel-tag-item">
          <img :src="ch.icon" :alt="ch.name" class="channel-icon" />
          <span>{{ ch.name }}</span>
          <el-icon :size="12" color="var(--ct-success)"><ElIconCircleCheck /></el-icon>
        </div>
      </div>
      <el-empty v-else description="暂无已启用的通道" :image-size="48" />
    </el-card>

    <!-- 供应商 & 模型 -->
    <el-card class="overview-card" shadow="never">
      <template #header>
        <span class="section-title">供应商 & 模型</span>
        <el-tag size="small" type="info" effect="plain" style="margin-left: 8px">
          {{ providerList.length }} 个供应商
        </el-tag>
      </template>
      <div v-if="providerList.length > 0" class="provider-list">
        <div v-for="provider in providerList" :key="provider.name" class="provider-group">
          <div class="provider-header">
            <el-icon :size="16" color="var(--ct-primary)"><ElIconCoin /></el-icon>
            <span class="provider-name">{{ provider.name }}</span>
            <el-tag size="small" effect="plain" type="info">{{ provider.apiType }}</el-tag>
            <el-tag size="small" effect="plain" style="margin-left: 4px">
              {{ provider.models.length }} 模型
            </el-tag>
          </div>
          <div v-if="provider.models.length > 0" class="model-list">
            <el-table
              :data="provider.models"
              size="small"
              :show-header="true"
              stripe
              :header-cell-style="{
                background: 'var(--ct-bg-base)',
                color: 'var(--ct-text-secondary)',
              }"
              :cell-style="{ background: 'transparent', color: 'var(--ct-text-regular)' }"
            >
              <el-table-column prop="id" label="模型 ID" min-width="200" />
              <el-table-column prop="name" label="名称" min-width="200">
                <template #default="{ row }">
                  {{ row.name || row.id }}
                </template>
              </el-table-column>
            </el-table>
          </div>
          <div v-else class="no-models">暂无模型配置</div>
        </div>
      </div>
      <el-empty v-else description="暂无供应商配置" :image-size="48" />
    </el-card>
  </div>
</template>

<style scoped>
  .dashboard-view {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .status-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  .status-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--ct-text-secondary);
    font-size: 13px;
    margin-bottom: 12px;
  }

  .card-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--ct-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .card-footer {
    font-size: 12px;
    color: var(--ct-text-secondary);
  }

  .refresh-hint {
    color: var(--ct-text-placeholder);
  }

  .text-success {
    color: var(--ct-success);
  }
  .text-danger {
    color: var(--ct-danger);
  }

  .dashboard-middle {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 16px;
  }

  .section-title {
    font-weight: 600;
    color: var(--ct-text-primary);
  }

  .action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .health-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .health-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .health-label {
    color: var(--ct-text-primary);
    font-size: 13px;
    min-width: 80px;
  }

  .health-detail {
    color: var(--ct-text-secondary);
    font-size: 12px;
  }

  .status-output {
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--ct-text-regular);
    background: var(--ct-bg-base);
    padding: 12px;
    border-radius: var(--ct-radius-sm);
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 300px;
    overflow-y: auto;
  }

  .overview-card {
    background: var(--ct-bg-card);
    border-color: var(--ct-border);
  }

  .overview-card :deep(.el-card__header) {
    display: flex;
    align-items: center;
  }

  /* 通道标签 */
  .channel-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .channel-tag-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--ct-bg-base);
    border: 1px solid var(--ct-border);
    border-radius: var(--ct-radius-sm);
    font-size: 13px;
    color: var(--ct-text-primary);
  }

  .channel-icon {
    width: 18px;
    height: 18px;
    object-fit: contain;
  }

  /* 供应商列表 */
  .provider-list {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .provider-group {
    border: 1px solid var(--ct-border);
    border-radius: var(--ct-radius-sm);
    overflow: hidden;
  }

  .provider-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--ct-bg-base);
    border-bottom: 1px solid var(--ct-border);
  }

  .provider-name {
    font-weight: 600;
    font-size: 14px;
    color: var(--ct-text-primary);
  }

  .model-list {
    padding: 0;
  }

  .model-list :deep(.el-table) {
    --el-table-bg-color: transparent;
    --el-table-tr-bg-color: transparent;
    --el-table-header-bg-color: var(--ct-bg-base);
    --el-table-border-color: var(--ct-border);
    --el-table-text-color: var(--ct-text-regular);
    --el-table-header-text-color: var(--ct-text-secondary);
    --el-table-row-hover-bg-color: var(--ct-bg-hover);
  }

  .no-models {
    padding: 12px 14px;
    font-size: 12px;
    color: var(--ct-text-placeholder);
  }

  @media (max-width: 900px) {
    .status-cards {
      grid-template-columns: 1fr;
    }
    .dashboard-middle {
      grid-template-columns: 1fr;
    }
  }
</style>
