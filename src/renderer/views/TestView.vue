<script setup lang="ts">
/**
 * 测试面板页面
 * 供应商 API 连通性测试、消息发送、Markdown 渲染、诊断工具
 */
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useInstanceStore } from '../stores/instance.js'
import { useServiceStore } from '../stores/service.js'
import { getBackend } from '../utils/nw-bridge'

const instanceStore = useInstanceStore()
const serviceStore = useServiceStore()

const backend = getBackend()
const monitor = backend?.monitor ?? null
const MarkdownIt = backend?.MarkdownIt ?? null
const md = MarkdownIt ? new MarkdownIt({ html: false, linkify: true, breaks: true }) : null

/* 消息模型 */
interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  html: string
  timestamp: string
  loading?: boolean
  latencyMs?: number
}

/* 聊天记录 */
const messages = ref<ChatMessage[]>([])
const inputMessage = ref('')
const isSending = ref(false)
const chatMessagesRef = ref<HTMLElement | null>(null)

/* 供应商和模型选择 */
const selectedProvider = ref('')
const selectedModel = ref('')
const providers = ref([
  { value: '', label: '默认' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'google', label: 'Google' },
  { value: 'ollama', label: 'Ollama' },
])

/* 消息 ID 计数器 */
let messageId = 0

/* 连通性测试 */
const testResult = ref<{ ok: boolean; latency: number; error?: string } | null>(null)
const isTesting = ref(false)

/* 诊断工具 */
const doctorOutput = ref('')
const doctorRunning = ref(false)
const doctorHealthy = ref<boolean | null>(null)

/**
 * 渲染 Markdown 为 HTML
 */
function renderMarkdown(text: string): string {
  if (!md || !text) return text || ''
  try {
    return md.render(text)
  } catch {
    return text
  }
}

/**
 * 滚动聊天区到底部
 */
async function scrollToBottom() {
  await nextTick()
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

/**
 * 发送测试消息到 Gateway
 */
async function sendMessage() {
  const content = inputMessage.value.trim()
  if (!content || isSending.value) return

  /* 添加用户消息 */
  messages.value.push({
    id: ++messageId,
    role: 'user',
    content,
    html: renderMarkdown(content),
    timestamp: new Date().toLocaleTimeString(),
  })

  inputMessage.value = ''
  isSending.value = true
  scrollToBottom()

  /* 添加 AI 占位消息 */
  const assistantMsg: ChatMessage = {
    id: ++messageId,
    role: 'assistant',
    content: '',
    html: '',
    timestamp: new Date().toLocaleTimeString(),
    loading: true,
  }
  messages.value.push(assistantMsg)
  scrollToBottom()

  const startTime = Date.now()

  try {
    const executor = instanceStore.getActiveExecutor()
    if (!executor) {
      throw new Error('执行器不可用')
    }

    // 构建请求体
    const requestBody = {
      model: selectedModel.value || 'default',
      messages: [{ role: 'user', content }],
    }

    // 通过 executor 向 Gateway 发送请求
    const port = serviceStore.gatewayPort || 18789
    const curlCmd = `curl -s -X POST http://127.0.0.1:${port}/v1/chat/completions -H "Content-Type: application/json" -d ${JSON.stringify(JSON.stringify(requestBody))}`

    const result = await executor.exec(curlCmd, { timeout: 120000 })

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || '请求 Gateway 失败')
    }

    const response = JSON.parse(result.stdout)
    const reply = response.choices?.[0]?.message?.content || response.reply || '(空回复)'

    assistantMsg.content = reply
    assistantMsg.html = renderMarkdown(reply)
    assistantMsg.loading = false
    assistantMsg.latencyMs = Date.now() - startTime
  } catch (err: any) {
    assistantMsg.content = `请求失败: ${err.message}`
    assistantMsg.html = `<p style="color: var(--ct-danger);">请求失败: ${err.message}</p>`
    assistantMsg.loading = false
    assistantMsg.latencyMs = Date.now() - startTime
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

/**
 * 连通性测试
 */
async function runConnectivityTest() {
  isTesting.value = true
  testResult.value = null

  try {
    const executor = instanceStore.getActiveExecutor()
    if (!executor) throw new Error('执行器不可用')

    const port = serviceStore.gatewayPort || 18789
    const startTime = Date.now()

    const result = await executor.exec(
      `curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:${port}/health`,
      { timeout: 10000 }
    )

    const latency = Date.now() - startTime
    const code = result.stdout.trim()

    if (code !== '000' && code !== '' && result.exitCode === 0) {
      testResult.value = { ok: true, latency }
      ElMessage.success(`Gateway 连通正常，延迟 ${latency}ms`)
    } else {
      testResult.value = { ok: false, latency: 0, error: `HTTP ${code || 'N/A'} - Gateway 可能未运行` }
    }
  } catch (err: any) {
    testResult.value = { ok: false, latency: 0, error: err.message }
  } finally {
    isTesting.value = false
  }
}

/**
 * 运行诊断
 */
async function runDoctor() {
  if (!monitor) return
  const executor = instanceStore.getActiveExecutor()
  if (!executor) return

  doctorRunning.value = true
  doctorOutput.value = ''
  doctorHealthy.value = null

  try {
    const result = await monitor.runDoctor(executor, false)
    doctorOutput.value = result.output
    doctorHealthy.value = result.success
  } catch (err: any) {
    doctorOutput.value = `诊断出错: ${err.message}`
    doctorHealthy.value = false
  } finally {
    doctorRunning.value = false
  }
}

/**
 * 运行诊断并自动修复
 */
async function runDoctorFix() {
  if (!monitor) return
  const executor = instanceStore.getActiveExecutor()
  if (!executor) return

  doctorRunning.value = true
  doctorOutput.value = ''
  doctorHealthy.value = null

  try {
    const result = await monitor.runDoctor(executor, true)
    doctorOutput.value = result.output
    doctorHealthy.value = result.success
    if (result.success) {
      ElMessage.success('诊断修复完成')
    }
  } catch (err: any) {
    doctorOutput.value = `诊断出错: ${err.message}`
    doctorHealthy.value = false
  } finally {
    doctorRunning.value = false
  }
}

/* 清除聊天记录 */
function clearMessages() {
  messages.value = []
}

/* 快捷键发送 */
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="test-view">
    <div class="page-toolbar">
      <h3 class="page-heading">测试面板</h3>
      <div class="toolbar-actions">
        <el-button :loading="isTesting" size="small" @click="runConnectivityTest">
          <el-icon><ElIconConnection /></el-icon>
          连通性测试
        </el-button>
        <el-button :loading="doctorRunning" size="small" @click="runDoctor">
          诊断
        </el-button>
        <el-button :loading="doctorRunning" size="small" @click="runDoctorFix">
          诊断并修复
        </el-button>
        <el-button size="small" text @click="clearMessages">清空记录</el-button>
      </div>
    </div>

    <!-- 连通性测试结果 -->
    <el-alert
      v-if="testResult"
      :title="testResult.ok ? '连通成功' : '连通失败'"
      :type="testResult.ok ? 'success' : 'error'"
      :description="testResult.ok ? `延迟: ${testResult.latency}ms` : testResult.error"
      show-icon
      closable
      @close="testResult = null"
    />

    <!-- 诊断结果 -->
    <el-card v-if="doctorOutput" class="doctor-card" shadow="never">
      <template #header>
        <div class="doctor-header">
          <span>诊断结果</span>
          <el-tag :type="doctorHealthy ? 'success' : 'warning'" size="small">
            {{ doctorHealthy ? '正常' : '存在问题' }}
          </el-tag>
        </div>
      </template>
      <pre class="doctor-output selectable">{{ doctorOutput }}</pre>
    </el-card>

    <!-- 聊天区域 -->
    <div class="chat-area">
      <!-- 选择供应商/模型 -->
      <div class="chat-options">
        <el-select v-model="selectedProvider" placeholder="供应商（可选）" size="small" clearable style="width: 150px">
          <el-option v-for="p in providers" :key="p.value" :label="p.label" :value="p.value" />
        </el-select>
        <el-input v-model="selectedModel" placeholder="模型别名（可选）" size="small" style="width: 150px" clearable />
      </div>

      <!-- 消息列表 -->
      <div ref="chatMessagesRef" class="chat-messages">
        <div v-if="messages.length === 0" class="chat-empty">
          <el-icon :size="48" color="var(--ct-text-placeholder)"><ElIconChatLineSquare /></el-icon>
          <p>发送一条消息开始测试</p>
        </div>

        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-item"
          :class="'message-' + msg.role"
        >
          <div class="message-avatar">
            <el-icon v-if="msg.role === 'user'" :size="20"><ElIconUser /></el-icon>
            <el-icon v-else :size="20"><ElIconMagicStick /></el-icon>
          </div>
          <div class="message-body">
            <div class="message-header">
              <span class="message-role">{{ msg.role === 'user' ? '你' : 'AI' }}</span>
              <span class="message-time">{{ msg.timestamp }}</span>
              <span v-if="msg.latencyMs" class="message-latency">{{ msg.latencyMs }}ms</span>
            </div>
            <div class="message-content selectable">
              <el-skeleton v-if="msg.loading" :rows="2" animated />
              <div v-else-if="msg.role === 'assistant'" class="markdown-body" v-html="msg.html"></div>
              <div v-else>{{ msg.content }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="2"
          placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
          resize="none"
          @keydown="handleKeydown"
        />
        <el-button
          type="primary"
          :loading="isSending"
          :disabled="!inputMessage.trim()"
          @click="sendMessage"
        >
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.test-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.page-heading {
  font-size: 18px;
  font-weight: 600;
  color: var(--ct-text-primary);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

/* 诊断结果 */
.doctor-card {
  background: var(--ct-bg-card);
  border-color: var(--ct-border);
  flex-shrink: 0;
}

.doctor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--ct-text-primary);
}

.doctor-output {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--ct-text-regular);
  background: var(--ct-bg-base);
  padding: 12px;
  border-radius: var(--ct-radius-sm);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
}

/* 聊天区域 */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--ct-bg-card);
  border: 1px solid var(--ct-border);
  border-radius: var(--ct-radius-md);
  overflow: hidden;
  min-height: 0;
}

.chat-options {
  display: flex;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ct-border);
  background: var(--ct-bg-elevated);
  flex-shrink: 0;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: var(--ct-text-placeholder);
}

/* 消息气泡 */
.message-item {
  display: flex;
  gap: 10px;
  max-width: 80%;
}

.message-user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-assistant {
  align-self: flex-start;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--ct-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--ct-text-secondary);
}

.message-user .message-avatar {
  background: rgba(64, 158, 255, 0.15);
  color: var(--ct-primary);
}

.message-body {
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-role {
  font-size: 12px;
  font-weight: 600;
  color: var(--ct-text-secondary);
}

.message-time {
  font-size: 11px;
  color: var(--ct-text-placeholder);
}

.message-latency {
  font-size: 11px;
  color: var(--ct-text-placeholder);
  font-family: monospace;
}

.message-content {
  padding: 10px 14px;
  background: var(--ct-bg-elevated);
  border-radius: var(--ct-radius-md);
  color: var(--ct-text-primary);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.message-user .message-content {
  background: rgba(64, 158, 255, 0.12);
}

/* Markdown 渲染样式 */
.markdown-body :deep(p) {
  margin: 0.5em 0;
}

.markdown-body :deep(p:first-child) {
  margin-top: 0;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  background: var(--ct-bg-base);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.markdown-body :deep(pre) {
  background: var(--ct-bg-base);
  padding: 12px;
  border-radius: var(--ct-radius-sm);
  overflow-x: auto;
  margin: 8px 0;
}

.markdown-body :deep(pre code) {
  background: none;
  padding: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.5em;
  margin: 0.5em 0;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid var(--ct-primary);
  padding-left: 12px;
  margin: 8px 0;
  color: var(--ct-text-secondary);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin-top: 0.8em;
  margin-bottom: 0.4em;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--ct-border);
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(a) {
  color: var(--ct-primary);
}

/* 输入区 */
.chat-input {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--ct-border);
  background: var(--ct-bg-elevated);
  align-items: flex-end;
  flex-shrink: 0;
}

.chat-input .el-button {
  flex-shrink: 0;
  height: 52px;
}
</style>
