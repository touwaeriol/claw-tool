<script setup>
/**
 * 通道配置页面
 * 卡片式通道列表，每个通道有开关和详细配置
 * 通过 configStore 读写 ~/.openclaw/openclaw.json 中的 channels 配置
 */
import { ref, computed, reactive, onMounted, nextTick } from 'vue'
import { useConfigStore } from '../stores/config.js'
import { useInstanceStore } from '../stores/instance.js'
import { ElMessage } from 'element-plus'
import { getBackend } from '../utils/nw-bridge'

const configStore = useConfigStore()
const instanceStore = useInstanceStore()

// 通道测试模块
const backend = getBackend()
const channelTester = backend?.channelTester ?? null
const channelTestRecords = backend?.channelTestRecords ?? null

// 各通道的测试状态 { channelId: { testing, result } }
const testStates = reactive({})

// 持久化的测试记录
const savedTestRecords = reactive({})
onMounted(async () => {
  if (channelTestRecords) {
    await channelTestRecords.loadRecords()
    const all = channelTestRecords.getAllRecords()
    Object.assign(savedTestRecords, all)
  }
})

function formatTime(ts) {
  if (!ts) return ''
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return new Date(ts).toLocaleDateString()
}

// 所有支持的通道定义（元信息）
// 使用 Simple Icons CDN 获取各平台官方 Logo
const channelDefs = [
  { id: 'telegram', name: 'Telegram', icon: 'https://cdn.simpleicons.org/telegram/26A5E4', description: 'Telegram Bot 通道' },
  { id: 'discord', name: 'Discord', icon: 'https://cdn.simpleicons.org/discord/5865F2', description: 'Discord Bot 通道' },
  { id: 'slack', name: 'Slack', icon: '/icons/slack.svg', description: 'Slack App 通道' },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'https://cdn.simpleicons.org/whatsapp/25D366', description: 'WhatsApp Business 通道' },
  { id: 'signal', name: 'Signal', icon: 'https://cdn.simpleicons.org/signal/3A76F0', description: 'Signal 通道' },
  { id: 'line', name: 'LINE', icon: 'https://cdn.simpleicons.org/line/00C300', description: 'LINE Bot 通道' },
  { id: 'matrix', name: 'Matrix', icon: 'https://cdn.simpleicons.org/matrix/000000', description: 'Matrix 协议通道' },
  { id: 'irc', name: 'IRC', icon: '/icons/irc.svg', description: 'IRC 通道' },
  { id: 'googlechat', name: 'Google Chat', icon: 'https://cdn.simpleicons.org/googlechat/00AC47', description: 'Google Chat 通道' },
  { id: 'mattermost', name: 'Mattermost', icon: 'https://cdn.simpleicons.org/mattermost/0058CC', description: 'Mattermost 通道' },
  { id: 'feishu', name: '飞书', icon: '/icons/feishu.svg', description: '飞书机器人通道' },
  { id: 'msteams', name: 'MS Teams', icon: '/icons/msteams.svg', description: 'Microsoft Teams 通道' },
  { id: 'nostr', name: 'Nostr', icon: '/icons/nostr.svg', description: 'Nostr 协议通道' },
]

// 每个通道的配置字段定义
const channelFields = {
  telegram: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: '从 @BotFather 获取', required: true },
    { key: 'dmPolicy', label: 'DM 策略', type: 'select', options: ['open', 'pairing', 'allowlist', 'disabled'], placeholder: '选择私信策略' },
    { key: 'allowFrom', label: '允许的用户 ID', type: 'textarea', placeholder: '每行一个用户 ID 或逗号分隔' },
    { key: 'groups', label: '允许的群组 ID', type: 'textarea', placeholder: '每行一个群组 ID 或逗号分隔' },
  ],
  discord: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Discord Bot Token', required: true },
    { key: 'applicationId', label: 'Application ID', type: 'text', placeholder: 'Discord Application ID' },
    { key: 'dmPolicy', label: 'DM 策略', type: 'select', options: ['open', 'pairing', 'allowlist', 'disabled'] },
    { key: 'allowFrom', label: '允许的用户 ID', type: 'textarea', placeholder: '每行一个用户 ID' },
    { key: 'channels', label: '允许的频道 ID', type: 'textarea', placeholder: '每行一个频道 ID' },
  ],
  slack: [
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'xoxb-...', required: true },
    { key: 'appToken', label: 'App Token', type: 'password', placeholder: 'xapp-...' },
    { key: 'signingSecret', label: 'Signing Secret', type: 'password', placeholder: 'Slack Signing Secret' },
    { key: 'dmPolicy', label: 'DM 策略', type: 'select', options: ['open', 'pairing', 'allowlist', 'disabled'] },
    { key: 'allowFrom', label: '允许的用户 ID', type: 'textarea', placeholder: '每行一个用户 ID' },
  ],
  whatsapp: [
    { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text', placeholder: 'WhatsApp Business Phone Number ID', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Meta Graph API Access Token', required: true },
    { key: 'verifyToken', label: 'Verify Token', type: 'text', placeholder: 'Webhook Verify Token' },
    { key: 'allowFrom', label: '允许的手机号', type: 'textarea', placeholder: '每行一个手机号' },
  ],
  signal: [
    { key: 'phoneNumber', label: '手机号', type: 'text', placeholder: '+8613800138000', required: true },
    { key: 'signalCliPath', label: 'signal-cli 路径', type: 'text', placeholder: '/usr/local/bin/signal-cli' },
    { key: 'allowFrom', label: '允许的手机号', type: 'textarea', placeholder: '每行一个手机号' },
  ],
  line: [
    { key: 'channelAccessToken', label: 'Channel Access Token', type: 'password', placeholder: 'LINE Channel Access Token', required: true },
    { key: 'channelSecret', label: 'Channel Secret', type: 'password', placeholder: 'LINE Channel Secret', required: true },
    { key: 'allowFrom', label: '允许的用户 ID', type: 'textarea', placeholder: '每行一个用户 ID' },
  ],
  matrix: [
    { key: 'homeserverUrl', label: 'Homeserver URL', type: 'text', placeholder: 'https://matrix.org', required: true },
    { key: 'userId', label: '用户 ID', type: 'text', placeholder: '@bot:matrix.org', required: true },
    { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Matrix Access Token', required: true },
    { key: 'allowFrom', label: '允许的用户 ID', type: 'textarea', placeholder: '每行一个 Matrix 用户 ID' },
  ],
  irc: [
    { key: 'server', label: '服务器', type: 'text', placeholder: 'irc.libera.chat', required: true },
    { key: 'port', label: '端口', type: 'number', placeholder: '6697' },
    { key: 'nick', label: '昵称', type: 'text', placeholder: 'openclaw-bot', required: true },
    { key: 'channels', label: '频道', type: 'textarea', placeholder: '每行一个频道，如 #general' },
    { key: 'useTls', label: '使用 TLS', type: 'switch' },
  ],
  googlechat: [
    { key: 'serviceAccountKey', label: 'Service Account Key (JSON)', type: 'textarea', placeholder: '粘贴 Google Cloud Service Account JSON', required: true },
    { key: 'allowFrom', label: '允许的用户', type: 'textarea', placeholder: '每行一个邮箱地址' },
  ],
  mattermost: [
    { key: 'serverUrl', label: '服务器 URL', type: 'text', placeholder: 'https://mattermost.example.com', required: true },
    { key: 'botToken', label: 'Bot Token', type: 'password', placeholder: 'Mattermost Bot Token', required: true },
    { key: 'allowFrom', label: '允许的用户', type: 'textarea', placeholder: '每行一个用户名' },
  ],
  feishu: [
    { key: 'appId', label: 'App ID', type: 'text', placeholder: '飞书 App ID', required: true },
    { key: 'appSecret', label: 'App Secret', type: 'password', placeholder: '飞书 App Secret', required: true },
    { key: 'verificationToken', label: 'Verification Token', type: 'text', placeholder: '事件订阅验证 Token' },
    { key: 'encryptKey', label: 'Encrypt Key', type: 'password', placeholder: '事件加密密钥' },
  ],
  msteams: [
    { key: 'appId', label: 'App ID', type: 'text', placeholder: 'Microsoft App ID', required: true },
    { key: 'appPassword', label: 'App Password', type: 'password', placeholder: 'Microsoft App Password', required: true },
    { key: 'allowFrom', label: '允许的用户', type: 'textarea', placeholder: '每行一个用户 ID' },
  ],
  nostr: [
    { key: 'privateKey', label: '私钥 (nsec)', type: 'password', placeholder: 'nsec...', required: true },
    { key: 'relays', label: '中继列表', type: 'textarea', placeholder: '每行一个 relay URL\nwss://relay.damus.io' },
  ],
}

// 从 store 的 channels 配置构造视图数据
const channelList = computed(() => {
  const channelsCfg = configStore.channels || {}
  return channelDefs.map((def) => {
    const cfg = channelsCfg[def.id] || {}
    const enabled = cfg.enabled === true
    // 判断是否已配置（至少有一个必填字段有值）
    const fields = channelFields[def.id] || []
    const requiredFields = fields.filter((f) => f.required)
    const configured = requiredFields.length > 0
      ? requiredFields.some((f) => !!cfg[f.key])
      : Object.keys(cfg).length > 1 // 除了 enabled 外还有其他配置
    return { ...def, enabled, configured }
  })
})

// 已启用的通道数量
const enabledCount = computed(() => channelList.value.filter((c) => c.enabled).length)

// 抽屉控制
const drawerVisible = ref(false)
const currentChannelId = ref('')
const currentChannelName = ref('')

// 当前编辑的通道配置表单（动态字段）
const channelForm = reactive({})

/** 打开通道配置抽屉 */
function openConfig(channel) {
  currentChannelId.value = channel.id
  currentChannelName.value = channel.name

  // 从 store 加载已有配置
  const existing = configStore.channels[channel.id] || {}
  // 清空并填入
  Object.keys(channelForm).forEach((k) => delete channelForm[k])
  const fields = channelFields[channel.id] || []
  fields.forEach((f) => {
    if (f.type === 'switch') {
      channelForm[f.key] = existing[f.key] === true
    } else {
      channelForm[f.key] = existing[f.key] || ''
    }
  })

  drawerVisible.value = true
}

/** 切换通道 enabled 状态 */
function handleToggle(channel) {
  const channelsCfg = configStore.channels || {}
  const existing = channelsCfg[channel.id] || {}

  if (channel.enabled) {
    // 启用 -> 更新 store
    configStore.updateChannel(channel.id, { ...existing, enabled: true })
    // 如果未配置则打开配置
    if (!channel.configured) {
      openConfig(channel)
    }
  } else {
    // 禁用
    configStore.updateChannel(channel.id, { ...existing, enabled: false })
  }
}

/** 保存通道配置 */
function handleSaveConfig() {
  const channelId = currentChannelId.value
  const channelsCfg = configStore.channels || {}
  const existing = channelsCfg[channelId] || {}

  // 构建配置对象
  const cfg = { ...existing }
  const fields = channelFields[channelId] || []

  fields.forEach((f) => {
    const val = channelForm[f.key]
    if (f.type === 'textarea' && typeof val === 'string') {
      // 对于列表类字段，保存为数组或原始字符串（取决于 OpenClaw 的格式）
      const arr = val.split(/[,，\n]/).map((s) => s.trim()).filter(Boolean)
      cfg[f.key] = arr.length > 0 ? arr : undefined
    } else if (f.type === 'number') {
      cfg[f.key] = val ? Number(val) : undefined
    } else if (f.type === 'switch') {
      cfg[f.key] = !!val
    } else {
      cfg[f.key] = val || undefined
    }
  })

  // OpenClaw dmPolicy 与 allowFrom 联动规则：
  // - open: allowFrom 必须为 ["*"]
  // - disabled: 不需要 allowFrom
  // - allowlist: allowFrom 为具体用户列表
  // - pairing: allowFrom 为具体用户列表
  if (cfg.dmPolicy === 'open') {
    cfg.allowFrom = ['*']
  } else if (cfg.dmPolicy === 'disabled') {
    delete cfg.allowFrom
  }

  // 清除 undefined 值
  Object.keys(cfg).forEach((k) => {
    if (cfg[k] === undefined) delete cfg[k]
  })

  configStore.updateChannel(channelId, cfg)
  drawerVisible.value = false
  ElMessage.success(`${currentChannelName.value} 配置已保存`)

  // 自动测试连通性
  nextTick(() => handleTestChannel(channelId))
}

/** 获取当前通道的字段定义 */
function currentFields() {
  return channelFields[currentChannelId.value] || []
}

// 发送测试消息对话框
const msgDialogVisible = ref(false)
const msgDialogChannel = ref('')
const msgTarget = ref('')
const msgContent = ref('Hello from Claw Tool!')
const msgSending = ref(false)
const msgResult = ref(null)

// 各通道目标地址的说明和占位符
const channelTargetHints = {
  telegram: { placeholder: '用户名或 chat_id', hint: '填写用户名（如 @username）或数字 chat_id。可通过 @userinfobot 获取自己的 chat_id' },
  discord: { placeholder: '频道 ID', hint: '右键频道 → 复制频道 ID（需开启开发者模式）' },
  slack: { placeholder: '频道名称或 ID', hint: '填写 #channel-name 或频道 ID（如 C01ABCDEF）' },
  whatsapp: { placeholder: '手机号', hint: '填写完整国际手机号，如 +8613800138000' },
  signal: { placeholder: '手机号', hint: '填写完整国际手机号，如 +8613800138000' },
  line: { placeholder: '用户 ID', hint: '填写 LINE 用户 ID（U 开头的字符串）' },
  matrix: { placeholder: '用户 ID 或房间 ID', hint: '填写 @user:server 或 !roomid:server' },
  irc: { placeholder: '频道名', hint: '填写 IRC 频道名，如 #general' },
  googlechat: { placeholder: 'Space ID', hint: '填写 Google Chat Space ID（spaces/XXXXXXX）' },
  mattermost: { placeholder: '频道名称', hint: '填写频道名称或频道 ID' },
  feishu: { placeholder: 'open_id 或 chat_id', hint: '填写用户 open_id（ou_ 开头）或群聊 chat_id（oc_ 开头）。可在飞书管理后台或 API 调试工具获取' },
  msteams: { placeholder: '用户 ID 或对话 ID', hint: '填写 Teams 用户 ID 或对话 ID' },
  nostr: { placeholder: 'npub 公钥', hint: '填写目标用户的 npub 公钥' },
}

/** 获取当前通道的目标提示 */
function getMsgTargetHint() {
  return channelTargetHints[msgDialogChannel.value] || { placeholder: '目标地址', hint: '' }
}

/** 打开发送消息对话框 */
function openMsgDialog(channelId) {
  msgDialogChannel.value = channelId
  msgTarget.value = ''
  msgContent.value = 'Hello from Claw Tool!'
  msgResult.value = null
  msgDialogVisible.value = true
}

/** 通过 openclaw message send 发送测试消息 */
async function handleSendTestMsg() {
  const executor = instanceStore.getActiveExecutor()
  if (!executor) {
    ElMessage.warning('执行器不可用')
    return
  }
  if (!msgTarget.value) {
    ElMessage.warning('请输入目标地址')
    return
  }

  msgSending.value = true
  msgResult.value = null
  try {
    const channel = msgDialogChannel.value
    const target = msgTarget.value
    const message = msgContent.value || 'test'
    const cmd = `openclaw message send --channel ${channel} --target ${JSON.stringify(target)} --message ${JSON.stringify(message)}`
    const result = await executor.exec(cmd, { timeout: 30000 })
    if (result.exitCode === 0) {
      msgResult.value = { success: true, message: result.stdout || '消息发送成功' }
      ElMessage.success('测试消息已发送')
    } else {
      msgResult.value = { success: false, message: result.stderr || result.stdout || '发送失败' }
      ElMessage.error('消息发送失败')
    }
  } catch (err) {
    msgResult.value = { success: false, message: err.message }
    ElMessage.error(`发送出错: ${err.message}`)
  } finally {
    msgSending.value = false
  }
}

/** 测试通道连通性 */
async function handleTestChannel(channelId) {
  if (!channelTester) {
    ElMessage.warning('测试模块未加载')
    return
  }

  const executor = instanceStore.getActiveExecutor()
  if (!executor) {
    ElMessage.warning('执行器不可用')
    return
  }

  // 获取通道配置（从 store 或当前表单）
  let config = {}
  if (channelId === currentChannelId.value && drawerVisible.value) {
    // 使用当前表单中的值（可能尚未保存）
    config = { ...channelForm }
  } else {
    config = configStore.channels[channelId] || {}
  }

  // 初始化测试状态
  if (!testStates[channelId]) {
    testStates[channelId] = { testing: false, result: null }
  }
  testStates[channelId].testing = true
  testStates[channelId].result = null

  try {
    const result = await channelTester.testChannel(executor, channelId, config)
    testStates[channelId].result = result

    // 持久化测试记录
    if (channelTestRecords) {
      await channelTestRecords.saveRecord(channelId, {
        success: result.success,
        message: result.message,
      })
      savedTestRecords[channelId] = channelTestRecords.getRecord(channelId)
    }

    if (result.success) {
      ElMessage.success(result.message)
    } else if (result.success === false) {
      ElMessage.error(result.message)
    } else {
      ElMessage.info(result.message)
    }
  } catch (err) {
    testStates[channelId].result = { success: false, message: err.message }
    ElMessage.error(`测试出错: ${err.message}`)
  } finally {
    testStates[channelId].testing = false
  }
}
</script>

<template>
  <div class="channels-view">
    <!-- 页面标题 -->
    <div class="page-toolbar">
      <h3 class="page-heading">通道配置</h3>
      <div class="toolbar-actions">
        <el-tag v-if="configStore.isDirty" type="warning" size="small" effect="plain">
          有未保存的修改
        </el-tag>
        <el-tag type="info" effect="plain">{{ enabledCount }} / {{ channelList.length }} 已启用</el-tag>
      </div>
    </div>

    <!-- 通道卡片网格 -->
    <div class="channel-grid">
      <el-card
        v-for="channel in channelList"
        :key="channel.id"
        class="channel-card hover-card"
        shadow="never"
        :class="{ 'is-enabled': channel.enabled }"
      >
        <div class="channel-header">
          <img class="channel-icon" :src="channel.icon" :alt="channel.name" />
          <div class="channel-info">
            <span class="channel-name">{{ channel.name }}</span>
            <span class="channel-desc">{{ channel.description }}</span>
          </div>
          <el-switch
            :model-value="channel.enabled"
            size="small"
            @change="(val) => handleToggle({ ...channel, enabled: val })"
          />
        </div>
        <div class="channel-footer">
          <div class="channel-footer-tags">
            <el-tag :type="channel.configured ? 'success' : 'info'" size="small" effect="plain">
              {{ channel.configured ? '已配置' : '未配置' }}
            </el-tag>
            <el-tooltip v-if="savedTestRecords[channel.id]"
              :content="savedTestRecords[channel.id].message">
              <el-tag
                :type="savedTestRecords[channel.id].success === true ? 'success' : savedTestRecords[channel.id].success === false ? 'danger' : 'warning'"
                size="small" effect="plain">
                {{ formatTime(savedTestRecords[channel.id].timestamp) }}
              </el-tag>
            </el-tooltip>
          </div>
          <div class="channel-footer-actions">
            <el-button
              v-if="channel.configured && channel.enabled"
              text
              size="small"
              @click.stop="openMsgDialog(channel.id)"
            >
              发消息
            </el-button>
            <el-button
              v-if="channel.configured"
              text
              size="small"
              :loading="testStates[channel.id]?.testing"
              @click.stop="handleTestChannel(channel.id)"
            >
              测试
            </el-button>
            <el-button text size="small" type="primary" @click="openConfig(channel)">配置</el-button>
          </div>
        </div>
        <!-- 测试结果 -->
        <div v-if="testStates[channel.id]?.result" class="channel-test-result">
          <el-alert
            :title="testStates[channel.id].result.message"
            :type="testStates[channel.id].result.success === true ? 'success' : testStates[channel.id].result.success === false ? 'error' : 'info'"
            :closable="true"
            show-icon
            size="small"
            @close="testStates[channel.id].result = null"
          />
        </div>
      </el-card>
    </div>

    <!-- 配置抽屉 -->
    <el-drawer
      v-model="drawerVisible"
      :title="currentChannelName + ' 配置'"
      direction="rtl"
      size="480px"
      destroy-on-close
    >
      <el-form label-position="top">
        <template v-for="field in currentFields()" :key="field.key">
          <!-- 密码输入 -->
          <el-form-item v-if="field.type === 'password'" :label="field.key === 'botToken' ? field.label : field.label" :required="field.required">
            <el-input
              v-model="channelForm[field.key]"
              type="password"
              show-password
              :placeholder="field.placeholder"
            />
          </el-form-item>

          <!-- 文本输入 -->
          <el-form-item v-else-if="field.type === 'text'" :label="field.label" :required="field.required">
            <el-input v-model="channelForm[field.key]" :placeholder="field.placeholder" />
          </el-form-item>

          <!-- 数字输入 -->
          <el-form-item v-else-if="field.type === 'number'" :label="field.label" :required="field.required">
            <el-input-number v-model="channelForm[field.key]" :placeholder="field.placeholder" style="width: 100%" />
          </el-form-item>

          <!-- 下拉选择 -->
          <el-form-item v-else-if="field.type === 'select'" :label="field.label" :required="field.required">
            <el-select v-model="channelForm[field.key]" :placeholder="field.placeholder" style="width: 100%">
              <el-option v-for="opt in field.options" :key="opt" :label="opt" :value="opt" />
            </el-select>
          </el-form-item>

          <!-- 多行文本 -->
          <el-form-item v-else-if="field.type === 'textarea'" :label="field.label" :required="field.required">
            <el-input
              v-model="channelForm[field.key]"
              type="textarea"
              :rows="3"
              :placeholder="field.placeholder"
            />
            <div class="form-tip">逗号或换行分隔多个值</div>
          </el-form-item>

          <!-- 开关 -->
          <el-form-item v-else-if="field.type === 'switch'" :label="field.label">
            <el-switch v-model="channelForm[field.key]" />
          </el-form-item>
        </template>

        <el-empty v-if="currentFields().length === 0" description="该通道暂无可配置项" />
      </el-form>

      <!-- 抽屉内的测试结果 -->
      <el-alert
        v-if="testStates[currentChannelId]?.result"
        :title="testStates[currentChannelId].result.message"
        :type="testStates[currentChannelId].result.success === true ? 'success' : testStates[currentChannelId].result.success === false ? 'error' : 'info'"
        :closable="true"
        show-icon
        style="margin-bottom: 12px;"
        @close="testStates[currentChannelId].result = null"
      />

      <template #footer>
        <el-button @click="drawerVisible = false">取消</el-button>
        <el-button
          :loading="testStates[currentChannelId]?.testing"
          @click="handleTestChannel(currentChannelId)"
        >
          测试连通性
        </el-button>
        <el-button type="primary" @click="handleSaveConfig">保存配置</el-button>
      </template>
    </el-drawer>

    <!-- 发送测试消息对话框 -->
    <el-dialog
      v-model="msgDialogVisible"
      :title="`通过 ${msgDialogChannel} 发送测试消息`"
      width="460px"
      destroy-on-close
    >
      <el-form label-position="top">
        <el-form-item label="目标地址" required>
          <el-input
            v-model="msgTarget"
            :placeholder="getMsgTargetHint().placeholder"
          />
          <div class="form-tip">{{ getMsgTargetHint().hint }}</div>
        </el-form-item>
        <el-form-item label="消息内容">
          <el-input
            v-model="msgContent"
            type="textarea"
            :rows="3"
            placeholder="测试消息内容"
          />
        </el-form-item>
      </el-form>
      <el-alert
        v-if="msgResult"
        :title="msgResult.message"
        :type="msgResult.success ? 'success' : 'error'"
        show-icon
        closable
        style="margin-bottom: 12px"
        @close="msgResult = null"
      />
      <template #footer>
        <el-button @click="msgDialogVisible = false">关闭</el-button>
        <el-button
          type="primary"
          :loading="msgSending"
          :disabled="!msgTarget"
          @click="handleSendTestMsg"
        >
          发送
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.channels-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--ct-text-primary);
  margin: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.channel-card {
  background: var(--ct-bg-card);
  border-color: var(--ct-border);
  transition: border-color 0.2s;
}

.channel-card.is-enabled {
  border-color: var(--ct-primary);
}

.channel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.channel-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  object-fit: contain;
}

.channel-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.channel-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--ct-text-primary);
}

.channel-desc {
  font-size: 12px;
  color: var(--ct-text-secondary);
}

.channel-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--ct-border);
}

.channel-footer-tags {
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-footer-actions {
  display: flex;
  gap: 4px;
}

.channel-test-result {
  margin-top: 10px;
}

.form-tip {
  font-size: 12px;
  color: var(--ct-text-secondary);
  margin-top: 4px;
}
</style>
