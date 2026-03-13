<script setup>
/**
 * 供应商配置页面
 * 卡片式供应商列表，支持 30+ 预设、多种认证方式（API Key / OAuth / AWS SDK）
 * 通过 configStore 读写 ~/.openclaw/openclaw.json 中的 models.providers 配置
 */
import { ref, computed, reactive, watchEffect, toRaw } from 'vue'
import { useConfigStore } from '../stores/config.js'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBackend, openExternal } from '../utils/nw-bridge'

const configStore = useConfigStore()
const backend = getBackend()
const providerAuth = backend?.providerAuth ?? null

// ========== 预设定义 ==========

const MODEL_APIS = [
  { value: 'openai-completions', label: 'OpenAI Completions' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'openai-codex-responses', label: 'OpenAI Codex Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'google-generative-ai', label: 'Google Generative AI' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
  { value: 'bedrock-converse-stream', label: 'AWS Bedrock' },
  { value: 'ollama', label: 'Ollama' },
]

const PROVIDER_PRESETS = [
  // OpenAI
  { id: 'openai', name: 'OpenAI', group: 'OpenAI', apiType: 'openai-completions', defaultBaseUrl: 'https://api.openai.com/v1', authMethod: 'api-key', envVar: 'OPENAI_API_KEY', defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'] },
  { id: 'openai-responses', name: 'OpenAI Responses', group: 'OpenAI', apiType: 'openai-responses', defaultBaseUrl: 'https://api.openai.com/v1', authMethod: 'api-key', envVar: 'OPENAI_API_KEY', defaultModels: ['gpt-4o', 'o3-mini'] },
  { id: 'openai-codex', name: 'OpenAI Codex', group: 'OpenAI', apiType: 'openai-codex-responses', defaultBaseUrl: 'https://api.openai.com/v1', authMethod: 'oauth-pkce', defaultModels: ['codex-mini'] },
  // Anthropic
  { id: 'anthropic', name: 'Anthropic', group: 'Anthropic', apiType: 'anthropic-messages', defaultBaseUrl: 'https://api.anthropic.com', authMethod: 'api-key', envVar: 'ANTHROPIC_API_KEY', defaultModels: ['claude-sonnet-4-5-20250514', 'claude-haiku-3-5-20241022'] },
  // Google
  { id: 'google-gemini', name: 'Google Gemini', group: 'Google', apiType: 'google-generative-ai', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', authMethod: 'api-key', envVar: 'GEMINI_API_KEY', defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { id: 'google-gemini-cli', name: 'Gemini CLI (OAuth)', group: 'Google', apiType: 'google-generative-ai', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta', authMethod: 'oauth-pkce', defaultModels: ['gemini-2.5-pro'] },
  // GitHub
  { id: 'github-copilot', name: 'GitHub Copilot', group: 'GitHub', apiType: 'github-copilot', defaultBaseUrl: 'https://api.individual.githubcopilot.com', authMethod: 'oauth-device', defaultModels: ['gpt-4o', 'claude-sonnet-4-5'] },
  // AWS
  { id: 'aws-bedrock', name: 'AWS Bedrock', group: 'AWS', apiType: 'bedrock-converse-stream', defaultBaseUrl: '', authMethod: 'aws-sdk', defaultModels: ['anthropic.claude-sonnet-4-5-20250514-v1:0'] },
  // 本地模型
  { id: 'ollama', name: 'Ollama', group: '本地模型', apiType: 'ollama', defaultBaseUrl: 'http://localhost:11434', authMethod: 'none', defaultModels: [] },
  { id: 'vllm', name: 'vLLM', group: '本地模型', apiType: 'openai-completions', defaultBaseUrl: 'http://localhost:8000/v1', authMethod: 'none', defaultModels: [] },
  // 其他（国际）
  { id: 'xai', name: 'xAI (Grok)', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://api.x.ai/v1', authMethod: 'api-key', envVar: 'XAI_API_KEY', defaultModels: ['grok-3', 'grok-3-mini'] },
  { id: 'mistral', name: 'Mistral', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://api.mistral.ai/v1', authMethod: 'api-key', envVar: 'MISTRAL_API_KEY', defaultModels: ['mistral-large-latest'] },
  { id: 'openrouter', name: 'OpenRouter', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://openrouter.ai/api/v1', authMethod: 'api-key', envVar: 'OPENROUTER_API_KEY', defaultModels: [] },
  { id: 'together', name: 'Together AI', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://api.together.xyz/v1', authMethod: 'api-key', envVar: 'TOGETHER_API_KEY', defaultModels: [] },
  { id: 'huggingface', name: 'Hugging Face', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://api-inference.huggingface.co/v1', authMethod: 'api-key', envVar: 'HF_TOKEN', defaultModels: [] },
  { id: 'venice', name: 'Venice AI', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'https://api.venice.ai/api/v1', authMethod: 'api-key', defaultModels: [] },
  { id: 'litellm', name: 'LiteLLM', group: '其他', apiType: 'openai-completions', defaultBaseUrl: 'http://localhost:4000', authMethod: 'api-key', defaultModels: [] },
  { id: 'cloudflare', name: 'Cloudflare AI Gateway', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', defaultModels: [] },
  { id: 'vercel', name: 'Vercel AI Gateway', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', envVar: 'AI_GATEWAY_API_KEY', defaultModels: [] },
  // 国内厂商
  { id: 'minimax', name: 'MiniMax', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://api.minimax.chat/v1', authMethod: 'api-key', defaultModels: [] },
  { id: 'moonshot', name: 'Moonshot (Kimi)', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://api.moonshot.cn/v1', authMethod: 'api-key', defaultModels: ['moonshot-v1-auto'] },
  { id: 'volcengine', name: '火山引擎', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3', authMethod: 'api-key', envVar: 'VOLCANO_ENGINE_API_KEY', defaultModels: [] },
  { id: 'byteplus', name: 'BytePlus', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://ark.ap-southeast.byteplusapi.com/api/v3', authMethod: 'api-key', envVar: 'BYTEPLUS_API_KEY', defaultModels: [] },
  { id: 'qianfan', name: '千帆 (百度)', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://qianfan.baidubce.com/v2', authMethod: 'api-key', envVar: 'QIANFAN_API_KEY', defaultModels: [] },
  { id: 'qwen', name: '通义千问 (Qwen)', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', authMethod: 'api-key', defaultModels: ['qwen-max', 'qwen-plus'] },
  { id: 'zai', name: 'Z.AI', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: 'https://api.zai.chat/v1', authMethod: 'api-key', envVar: 'ZAI_API_KEY', defaultModels: [] },
  { id: 'xiaomi', name: 'Xiaomi', group: '国内厂商', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', envVar: 'XIAOMI_API_KEY', defaultModels: [] },
  // 其他（特殊）
  { id: 'kilocode', name: 'Kilo Gateway', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', envVar: 'KILOCODE_API_KEY', defaultModels: [] },
  { id: 'synthetic', name: 'Synthetic', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', defaultModels: [] },
  { id: 'opencode', name: 'OpenCode Zen', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', envVar: 'OPENCODE_API_KEY', defaultModels: [] },
  { id: 'chutes', name: 'Chutes', group: '其他', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'oauth-pkce', defaultModels: [] },
  // 自定义
  { id: 'custom', name: '自定义', group: '自定义', apiType: 'openai-completions', defaultBaseUrl: '', authMethod: 'api-key', defaultModels: [] },
]

const PROVIDER_GROUPS = [
  { name: 'OpenAI', providers: ['openai', 'openai-responses', 'openai-codex'] },
  { name: 'Anthropic', providers: ['anthropic'] },
  { name: 'Google', providers: ['google-gemini', 'google-gemini-cli'] },
  { name: 'GitHub', providers: ['github-copilot'] },
  { name: 'AWS', providers: ['aws-bedrock'] },
  { name: '本地模型', providers: ['ollama', 'vllm'] },
  { name: '国内厂商', providers: ['minimax', 'moonshot', 'volcengine', 'byteplus', 'qianfan', 'qwen', 'zai', 'xiaomi'] },
  { name: '其他', providers: ['xai', 'mistral', 'openrouter', 'together', 'huggingface', 'venice', 'litellm', 'cloudflare', 'vercel', 'kilocode', 'synthetic', 'opencode', 'chutes'] },
  { name: '自定义', providers: ['custom'] },
]

// ========== 状态 ==========

const providerEntries = computed(() => {
  const providersObj = configStore.providers || {}
  return Object.entries(providersObj).map(([key, config]) => ({
    key,
    ...config,
  }))
})

const showAddDialog = ref(false)
const editingKey = ref('')

// 展开模型列表的 provider key 集合
const expandedProviders = ref(new Set())

function toggleModels(key) {
  const s = expandedProviders.value
  if (s.has(key)) s.delete(key)
  else s.add(key)
}

const defaultForm = () => ({
  presetId: '',
  name: '',       // 供应商名称，作为 config key，允许中文
  apiType: 'openai-completions',
  baseUrl: '',
  apiKey: '',
  awsAccessKeyId: '',
  awsSecretAccessKey: '',
  awsRegion: 'us-east-1',
  modelsList: [],  // [{ id, name }]
})

const form = ref(defaultForm())

// 连通性测试
const testing = ref(false)

// OAuth 状态
const oauthState = reactive({
  inProgress: false,
  waiting: false,
  verificationUri: '',
  userCode: '',
  completed: false,
  token: null,
})

// 默认模型
const defaultModel = ref('')

watchEffect(() => {
  defaultModel.value = configStore.raw?.agents?.defaults?.model || ''
})

function handleDefaultModelChange(modelId) {
  defaultModel.value = modelId
  configStore.setDefaultModel(modelId)
}

// ========== 计算属性 ==========

/** 当前选中预设的认证方式 */
const currentAuthMethod = computed(() => {
  if (form.value.presetId) {
    const preset = getPreset(form.value.presetId)
    if (preset) return preset.authMethod
  }
  return 'api-key'
})

/** 认证方式中文标签 */
function authMethodLabel(method) {
  const map = {
    'api-key': 'API Key',
    'oauth-device': 'OAuth 设备授权',
    'oauth-pkce': 'OAuth PKCE',
    'aws-sdk': 'AWS SDK',
    'none': '无需认证',
  }
  return map[method] || method || '--'
}

/** API 类型显示名称 */
function apiTypeLabel(type) {
  const found = MODEL_APIS.find((t) => t.value === type)
  return found ? found.label : type || '--'
}

/** API Key 脱敏显示（更长） */
function maskApiKey(key) {
  if (!key || typeof key !== 'string') return ''
  if (key.length <= 12) return '****'
  return key.slice(0, 6) + '····' + key.slice(-6)
}

/** 已展示完整 Key 的 provider key 集合 */
const revealedKeys = ref(new Set())

function toggleRevealKey(providerKey) {
  const s = revealedKeys.value
  if (s.has(providerKey)) s.delete(providerKey)
  else s.add(providerKey)
}

function copyApiKey(key) {
  if (!key) return
  navigator.clipboard.writeText(key).then(() => {
    ElMessage.success('API Key 已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

/** 根据 API 类型获取供应商图标类型 */
function getProviderIcon(apiType) {
  if (!apiType) return 'default'
  if (apiType.startsWith('openai') || apiType === 'github-copilot') return 'openai'
  if (apiType.startsWith('anthropic')) return 'anthropic'
  if (apiType.startsWith('google')) return 'gemini'
  if (apiType.startsWith('bedrock')) return 'aws'
  if (apiType === 'ollama') return 'ollama'
  return 'default'
}

/** 获取预设 */
function getPreset(id) {
  return PROVIDER_PRESETS.find((p) => p.id === id) || null
}

/** 根据 provider config 反查预设 ID */
function guessPresetId(entry) {
  const match = PROVIDER_PRESETS.find(
    (p) => p.name === entry.key || p.id === entry.key
  )
  return match ? match.id : ''
}

/** 获取 provider 的认证方式描述 */
function getProviderAuthLabel(provider) {
  if (provider.auth) return authMethodLabel(provider.auth)
  if (provider.apiKey) return 'API Key'
  return '--'
}

/** 获取 provider 的模型列表，返回 [{id, name}] */
function getProviderModels(provider) {
  if (!provider.models) return []
  if (Array.isArray(provider.models)) {
    return provider.models.map((m) => {
      if (typeof m === 'string') return { id: m, name: m }
      return { id: m.id || '', name: m.name || m.id || '' }
    })
  }
  return []
}

// ========== 操作 ==========

/** 预设变更时填充表单 */
function onPresetChange(presetId) {
  const preset = getPreset(presetId)
  if (!preset) return

  form.value.name = preset.name         // 供应商名称作为 config key
  form.value.apiType = preset.apiType
  form.value.baseUrl = preset.defaultBaseUrl || ''
  form.value.modelsList = (preset.defaultModels || []).map(id => ({ id, name: id }))

  // 重置认证字段
  form.value.apiKey = ''
  form.value.awsAccessKeyId = ''
  form.value.awsSecretAccessKey = ''
  form.value.awsRegion = 'us-east-1'
  resetOAuthState()
}

/** 打开编辑对话框 */
function handleEdit(entry) {
  editingKey.value = entry.key
  const models = getProviderModels(entry)

  form.value = {
    presetId: guessPresetId(entry),
    name: entry.key,
    apiType: entry.api || entry.apiType || 'openai-completions',
    baseUrl: entry.baseUrl || '',
    apiKey: typeof entry.apiKey === 'string' ? entry.apiKey : '',
    awsAccessKeyId: entry.awsAccessKeyId || '',
    awsSecretAccessKey: entry.awsSecretAccessKey || '',
    awsRegion: entry.awsRegion || 'us-east-1',
    modelsList: models,
  }

  resetOAuthState()
  showAddDialog.value = true
}

/** 打开添加对话框 */
function handleAdd() {
  editingKey.value = ''
  form.value = defaultForm()
  resetOAuthState()
  showAddDialog.value = true
}

/** 保存供应商 */
function handleSave() {
  const providerName = form.value.name?.trim()
  if (!providerName) {
    ElMessage.warning('请输入供应商名称')
    return
  }

  // 模型列表 — 过滤掉空行
  const models = form.value.modelsList
    .filter(m => m.id?.trim())
    .map(m => ({ id: m.id.trim(), name: (m.name?.trim() || m.id.trim()) }))

  // 构建 provider 配置对象（不含 name 字段，name 是对象键）
  const provider = {
    baseUrl: form.value.baseUrl || undefined,
    api: form.value.apiType,
    models: models.length > 0 ? models : undefined,
  }

  // 认证信息
  const authMethod = currentAuthMethod.value
  if (authMethod === 'api-key' && form.value.apiKey) {
    provider.apiKey = form.value.apiKey
    provider.auth = 'api-key'
  } else if (authMethod === 'aws-sdk') {
    provider.auth = 'aws-sdk'
    if (form.value.awsAccessKeyId) provider.awsAccessKeyId = form.value.awsAccessKeyId
    if (form.value.awsSecretAccessKey) provider.awsSecretAccessKey = form.value.awsSecretAccessKey
    if (form.value.awsRegion) provider.awsRegion = form.value.awsRegion
  } else if (authMethod === 'oauth-device' || authMethod === 'oauth-pkce') {
    provider.auth = 'oauth'
    if (oauthState.token && providerAuth) {
      try {
        // token 已在流程内部自动保存，这里不需要重复保存
      } catch (err) {
        console.warn('[ProvidersView] OAuth token 保存失败:', err)
      }
    }
  } else if (authMethod === 'none') {
    provider.auth = undefined
  }

  // 清除 undefined
  Object.keys(provider).forEach((k) => {
    if (provider[k] === undefined) delete provider[k]
  })

  // 对象操作
  const providersObj = { ...(configStore.providers || {}) }

  // 如果是编辑且名称改了，删除旧键
  if (editingKey.value && editingKey.value !== providerName) {
    delete providersObj[editingKey.value]
  }

  providersObj[providerName] = provider
  configStore.updateProviders(providersObj)
  showAddDialog.value = false
  ElMessage.success(editingKey.value ? '供应商已更新' : '供应商已添加')
}

/** 删除供应商 */
async function handleDelete(entry) {
  try {
    await ElMessageBox.confirm(
      `确定要删除供应商「${entry.key}」吗？`,
      '确认删除',
      { type: 'warning' }
    )
    const deletedModels = getProviderModels(entry)
    const providersObj = { ...(configStore.providers || {}) }
    delete providersObj[entry.key]
    configStore.updateProviders(providersObj)
    // 检查默认模型是否需要清理
    const currentDefault = configStore.raw?.agents?.defaults?.model
    if (currentDefault && deletedModels.includes(currentDefault)) {
      configStore.setDefaultModel('')
      defaultModel.value = ''
      ElMessage.info('默认模型已自动清除（所属供应商已删除）')
    }
    ElMessage.success('供应商已删除')
  } catch {
    // 用户取消
  }
}

// 连通性测试结果对话框
const testResultVisible = ref(false)
const testResult = reactive({
  success: false,
  apiType: '',
  model: '',
  baseUrl: '',
  latency: 0,
  request: '',    // 发送的内容
  response: '',   // 模型回复
  error: '',      // 错误信息
  raw: '',        // 原始响应 JSON
})

/** 测试连通性 — 使用官方 SDK，弹窗展示结果 */
async function testProvider() {
  const baseUrl = (form.value.baseUrl || '').replace(/\/$/, '')
  if (!baseUrl) {
    ElMessage.warning('请输入 API 地址')
    return
  }

  const testModel = form.value.modelsList?.[0]?.id?.trim()
  if (!testModel) {
    ElMessage.warning('请至少添加一个模型再测试')
    return
  }

  testing.value = true
  const startTime = Date.now()
  const apiType = form.value.apiType || ''
  const apiKey = form.value.apiKey || ''
  const testMessage = 'hi'

  // 重置结果
  Object.assign(testResult, {
    success: false,
    apiType,
    model: testModel,
    baseUrl,
    latency: 0,
    request: testMessage,
    response: '',
    error: '',
    raw: '',
  })

  try {
    if (apiType.startsWith('anthropic')) {
      // Anthropic SDK
      const Anthropic = nw.require('@anthropic-ai/sdk')
      const client = new Anthropic.default({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true })
      const resp = await client.messages.create({
        model: testModel,
        max_tokens: 100,
        messages: [{ role: 'user', content: testMessage }],
      })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.content?.map(c => c.text).join('') || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    } else if (apiType === 'ollama') {
      // Ollama 兼容 OpenAI 协议
      const OpenAI = nw.require('openai')
      const client = new OpenAI.default({ apiKey: apiKey || 'ollama', baseURL: `${baseUrl}/v1`, dangerouslyAllowBrowser: true })
      const resp = await client.chat.completions.create({
        model: testModel,
        max_tokens: 100,
        messages: [{ role: 'user', content: testMessage }],
      })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.choices?.[0]?.message?.content || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    } else {
      // OpenAI 兼容协议
      const OpenAI = nw.require('openai')
      let sdkBaseUrl = baseUrl
      if (!sdkBaseUrl.endsWith('/v1') && !sdkBaseUrl.endsWith('/v1/')) {
        sdkBaseUrl = `${sdkBaseUrl}/v1`
      }
      const client = new OpenAI.default({ apiKey: apiKey || 'none', baseURL: sdkBaseUrl, dangerouslyAllowBrowser: true })
      const resp = await client.chat.completions.create({
        model: testModel,
        max_tokens: 100,
        messages: [{ role: 'user', content: testMessage }],
      })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.choices?.[0]?.message?.content || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    }
  } catch (err) {
    testResult.latency = Date.now() - startTime
    testResult.success = false
    const status = err.status || err.statusCode || ''
    testResult.error = status ? `HTTP ${status}: ${err.message}` : err.message
    testResult.raw = JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
  } finally {
    testing.value = false
    testResultVisible.value = true
  }
}

/** 从列表直接测试供应商（不用打开编辑对话框） */
const testingProvider = ref('')  // 正在测试的 provider key

async function quickTestProvider(entry) {
  const baseUrl = (entry.baseUrl || '').replace(/\/$/, '')
  if (!baseUrl) {
    ElMessage.warning('该供应商未配置 API 地址')
    return
  }
  const models = getProviderModels(entry)
  const testModel = models[0]?.id?.trim()
  if (!testModel) {
    ElMessage.warning('该供应商未配置模型')
    return
  }

  testingProvider.value = entry.key
  const startTime = Date.now()
  const apiType = entry.api || entry.apiType || ''
  const apiKey = typeof entry.apiKey === 'string' ? entry.apiKey : ''
  const testMessage = 'hi'

  Object.assign(testResult, {
    success: false, apiType, model: testModel, baseUrl,
    latency: 0, request: testMessage, response: '', error: '', raw: '',
  })

  try {
    if (apiType.startsWith('anthropic')) {
      const Anthropic = nw.require('@anthropic-ai/sdk')
      const client = new Anthropic.default({ apiKey, baseURL: baseUrl, dangerouslyAllowBrowser: true })
      const resp = await client.messages.create({ model: testModel, max_tokens: 100, messages: [{ role: 'user', content: testMessage }] })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.content?.map(c => c.text).join('') || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    } else if (apiType === 'ollama') {
      const OpenAI = nw.require('openai')
      const client = new OpenAI.default({ apiKey: apiKey || 'ollama', baseURL: `${baseUrl}/v1`, dangerouslyAllowBrowser: true })
      const resp = await client.chat.completions.create({ model: testModel, max_tokens: 100, messages: [{ role: 'user', content: testMessage }] })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.choices?.[0]?.message?.content || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    } else {
      const OpenAI = nw.require('openai')
      let sdkBaseUrl = baseUrl
      if (!sdkBaseUrl.endsWith('/v1') && !sdkBaseUrl.endsWith('/v1/')) sdkBaseUrl = `${sdkBaseUrl}/v1`
      const client = new OpenAI.default({ apiKey: apiKey || 'none', baseURL: sdkBaseUrl, dangerouslyAllowBrowser: true })
      const resp = await client.chat.completions.create({ model: testModel, max_tokens: 100, messages: [{ role: 'user', content: testMessage }] })
      testResult.latency = Date.now() - startTime
      testResult.success = true
      testResult.response = resp.choices?.[0]?.message?.content || ''
      testResult.model = resp.model || testModel
      testResult.raw = JSON.stringify(resp, null, 2)
    }
  } catch (err) {
    testResult.latency = Date.now() - startTime
    testResult.success = false
    const status = err.status || err.statusCode || ''
    testResult.error = status ? `HTTP ${status}: ${err.message}` : err.message
    testResult.raw = JSON.stringify(err, Object.getOwnPropertyNames(err), 2)
  } finally {
    testingProvider.value = ''
    testResultVisible.value = true
  }
}

/** 复制测试错误信息 */
function copyTestError() {
  const text = `API 地址: ${testResult.baseUrl}\n协议类型: ${testResult.apiType}\n模型: ${testResult.model}\n\n错误: ${testResult.error}\n\n原始响应:\n${testResult.raw}`
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('错误信息已复制')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

// ========== OAuth ==========

function resetOAuthState() {
  oauthState.inProgress = false
  oauthState.waiting = false
  oauthState.verificationUri = ''
  oauthState.userCode = ''
  oauthState.completed = false
  oauthState.token = null
}

/** 开始 Device Flow 授权 (GitHub Copilot 等) */
async function startDeviceAuth() {
  if (!providerAuth) {
    ElMessage.warning('OAuth 模块未加载')
    return
  }

  oauthState.inProgress = true
  oauthState.waiting = true

  try {
    const presetId = form.value.presetId
    let result
    if (presetId === 'github-copilot') {
      result = await providerAuth.startGitHubCopilotAuth()
    } else {
      ElMessage.warning('该供应商暂不支持设备授权')
      oauthState.waiting = false
      return
    }
    oauthState.verificationUri = result.verificationUri || ''
    oauthState.userCode = result.userCode || ''
    // 等待授权完成
    const token = await result.promise
    oauthState.token = token
    oauthState.completed = true
    oauthState.waiting = false
    ElMessage.success('OAuth 授权成功')
  } catch (err) {
    oauthState.waiting = false
    ElMessage.error(`OAuth 授权失败: ${err.message}`)
  }
}

/** 开始 PKCE 授权 (OpenAI Codex, Gemini CLI 等) */
async function startPKCEAuth() {
  if (!providerAuth) {
    ElMessage.warning('OAuth 模块未加载')
    return
  }

  oauthState.inProgress = true
  oauthState.waiting = true

  try {
    const presetId = form.value.presetId
    let result
    if (presetId === 'openai-codex') {
      result = await providerAuth.startOpenAICodexAuth()
    } else if (presetId === 'google-gemini-cli') {
      result = await providerAuth.startGeminiCliAuth()
    } else {
      ElMessage.warning('该供应商暂不支持 PKCE 授权')
      oauthState.waiting = false
      return
    }
    // 打开浏览器
    if (result.authUrl) {
      openExternal(result.authUrl)
    }
    const token = await result.promise
    oauthState.token = token
    oauthState.completed = true
    oauthState.waiting = false
    ElMessage.success('OAuth 授权成功')
  } catch (err) {
    oauthState.waiting = false
    ElMessage.error(`OAuth 授权失败: ${err.message}`)
  }
}

/** 打开浏览器 */
function openBrowser(url) {
  if (url) openExternal(url)
}
</script>

<template>
  <div class="providers-view">
    <!-- 工具栏 -->
    <div class="page-toolbar">
      <h3 class="page-heading">供应商配置</h3>
      <div class="toolbar-actions">
        <el-tag v-if="configStore.isDirty" type="warning" size="small" effect="plain">
          有未保存的修改
        </el-tag>
        <el-tag type="info" effect="plain">{{ providerEntries.length }} 个供应商</el-tag>
        <el-button type="primary" @click="handleAdd">
          <el-icon><ElIconPlus /></el-icon>
          添加供应商
        </el-button>
      </div>
    </div>

    <!-- 默认模型选择 -->
    <div v-if="providerEntries.length > 0" class="default-model-bar">
      <span class="default-model-label">默认模型</span>
      <el-select v-model="defaultModel" placeholder="选择默认模型" size="small" clearable style="width: 240px" @change="handleDefaultModelChange">
        <el-option-group v-for="entry in providerEntries" :key="entry.key" :label="entry.key">
          <el-option
            v-for="model in getProviderModels(entry)"
            :key="entry.key + ':' + model"
            :label="model"
            :value="model"
          />
        </el-option-group>
      </el-select>
    </div>

    <!-- 供应商列表 -->
    <div class="provider-list">
      <div
        v-for="entry in providerEntries"
        :key="entry.key"
        class="provider-item"
      >
        <!-- 主行 -->
        <div class="provider-header">
          <!-- 供应商图标 -->
          <div class="provider-avatar" :class="'avatar-' + getProviderIcon(entry.api || entry.apiType)">
            <!-- OpenAI -->
            <svg v-if="getProviderIcon(entry.api || entry.apiType) === 'openai'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>
            <!-- Anthropic / Claude -->
            <svg v-else-if="getProviderIcon(entry.api || entry.apiType) === 'anthropic'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.304 3.541h-3.483l6.196 16.918h3.483L17.304 3.541zm-10.608 0L.5 20.459h3.544l1.26-3.474h6.392l1.26 3.474h3.544L10.304 3.541H6.696zm-.342 10.651L8.5 8.269l2.146 5.923H6.354z"/></svg>
            <!-- Google Gemini -->
            <svg v-else-if="getProviderIcon(entry.api || entry.apiType) === 'gemini'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 24A14.304 14.304 0 0 0 0 12 14.304 14.304 0 0 0 12 0a14.305 14.305 0 0 0 12 12 14.305 14.305 0 0 0-12 12z"/></svg>
            <!-- AWS -->
            <svg v-else-if="getProviderIcon(entry.api || entry.apiType) === 'aws'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.032-.863.104-.296.072-.583.16-.863.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.152c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.264-.168.312a.549.549 0 0 1-.312.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.216-.151-.248-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.415-.287-.806-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415a3.48 3.48 0 0 1 1.005-.144c.176 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.694 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167z"/><path d="M21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.27-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.385.607z"/><path d="M22.792 14.961c-.336-.43-2.23-.207-3.089-.104-.255.032-.295-.192-.063-.36 1.517-1.062 4.003-.754 4.291-.399.287.36-.08 2.826-1.493 4.003-.216.184-.423.088-.327-.151.319-.79 1.021-2.556.68-2.989z"/></svg>
            <!-- Ollama -->
            <svg v-else-if="getProviderIcon(entry.api || entry.apiType) === 'ollama'" viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            <!-- 默认 -->
            <span v-else class="avatar-letter">{{ (entry.key || '?')[0] }}</span>
          </div>
          <div class="provider-info">
            <div class="provider-name">{{ entry.key }}</div>
            <div class="provider-meta">
              <el-tag size="small" effect="plain">{{ apiTypeLabel(entry.api || entry.apiType) }}</el-tag>
              <!-- API Key：长显示 + 复制 + 查看 -->
              <span v-if="entry.apiKey" class="apikey-bar">
                <el-icon :size="12" class="apikey-icon"><ElIconKey /></el-icon>
                <span class="apikey-text">{{ revealedKeys.has(entry.key) ? entry.apiKey : maskApiKey(entry.apiKey) }}</span>
                <el-button text size="small" class="apikey-btn" @click.stop="toggleRevealKey(entry.key)" :title="revealedKeys.has(entry.key) ? '隐藏' : '查看'">
                  <el-icon :size="12"><ElIconView v-if="!revealedKeys.has(entry.key)" /><ElIconHide v-else /></el-icon>
                </el-button>
                <el-button text size="small" class="apikey-btn" @click.stop="copyApiKey(entry.apiKey)" title="复制">
                  <el-icon :size="12"><ElIconCopyDocument /></el-icon>
                </el-button>
              </span>
            </div>
          </div>
          <div class="provider-actions">
            <el-button text size="small" type="success" @click="quickTestProvider(entry)" :loading="testingProvider === entry.key" title="测试连通性">
              <el-icon v-if="testingProvider !== entry.key"><ElIconConnection /></el-icon>
            </el-button>
            <el-button text size="small" type="primary" @click="handleEdit(entry)" title="编辑">
              <el-icon><ElIconEdit /></el-icon>
            </el-button>
            <el-button text size="small" type="danger" @click="handleDelete(entry)" title="删除">
              <el-icon><ElIconDelete /></el-icon>
            </el-button>
          </div>
        </div>

        <!-- URL 行 -->
        <div v-if="entry.baseUrl" class="provider-url" :title="entry.baseUrl">
          <el-icon :size="12"><ElIconLink /></el-icon>
          {{ entry.baseUrl }}
        </div>

        <!-- 模型展开栏 -->
        <div class="provider-models-bar" @click="toggleModels(entry.key)">
          <span class="models-bar-left">
            <el-icon :size="14"><ElIconCoin /></el-icon>
            <span>{{ getProviderModels(entry).length }} 个模型</span>
          </span>
          <el-icon :size="14" class="models-bar-arrow" :class="{ 'is-expanded': expandedProviders.has(entry.key) }">
            <ElIconArrowDown />
          </el-icon>
        </div>

        <!-- 模型列表（展开） -->
        <div v-show="expandedProviders.has(entry.key)" class="provider-models-list">
          <div v-if="getProviderModels(entry).length === 0" class="models-empty">暂无模型</div>
          <div v-for="model in getProviderModels(entry)" :key="model.id" class="models-list-row">
            <span class="models-list-id">{{ model.id }}</span>
            <span v-if="model.name && model.name !== model.id" class="models-list-name">{{ model.name }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <el-empty v-if="providerEntries.length === 0" description="暂未配置任何供应商，点击「添加供应商」开始" />

    <!-- 添加/编辑对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingKey ? '编辑供应商' : '添加供应商'"
      width="640px"
      destroy-on-close
    >
      <el-form label-position="top">
        <!-- Provider 预设选择 -->
        <el-form-item label="供应商预设">
          <el-select v-model="form.presetId" filterable clearable placeholder="选择预设或自定义" @change="onPresetChange" style="width: 100%">
            <el-option-group v-for="group in PROVIDER_GROUPS" :key="group.name" :label="group.name">
              <el-option
                v-for="pid in group.providers"
                :key="pid"
                :label="getPreset(pid)?.name || pid"
                :value="pid"
              />
            </el-option-group>
          </el-select>
        </el-form-item>

        <!-- 供应商名称 -->
        <el-form-item label="供应商名称" required>
          <el-input v-model="form.name" placeholder="如 OpenAI、我的供应商、my-anthropic" />
          <div class="form-tip">作为配置文件中的唯一键名，支持中英文</div>
        </el-form-item>

        <!-- API 类型 -->
        <el-form-item label="API 类型">
          <el-select v-model="form.apiType" style="width: 100%">
            <el-option v-for="api in MODEL_APIS" :key="api.value" :label="api.label" :value="api.value" />
          </el-select>
        </el-form-item>

        <!-- API 地址 -->
        <el-form-item label="API 地址 (baseUrl)">
          <el-input v-model="form.baseUrl" placeholder="https://api.openai.com/v1" />
        </el-form-item>

        <!-- API Key 认证 -->
        <el-form-item v-if="currentAuthMethod === 'api-key'" label="API Key">
          <el-input v-model="form.apiKey" type="password" show-password placeholder="sk-..." />
          <div v-if="getPreset(form.presetId)?.envVar" class="form-tip">
            也可通过环境变量 {{ getPreset(form.presetId).envVar }} 配置
          </div>
        </el-form-item>

        <!-- OAuth Device Flow (GitHub Copilot) -->
        <div v-if="currentAuthMethod === 'oauth-device'" class="oauth-section">
          <el-form-item label="OAuth 设备授权">
            <div v-if="!oauthState.inProgress">
              <el-button type="primary" @click="startDeviceAuth">开始授权</el-button>
            </div>
            <div v-else class="device-flow-ui">
              <template v-if="oauthState.userCode">
                <p class="oauth-hint">请访问以下链接完成授权：</p>
                <el-link type="primary" :href="oauthState.verificationUri" target="_blank">
                  {{ oauthState.verificationUri }}
                </el-link>
                <div class="device-code">{{ oauthState.userCode }}</div>
                <el-button size="small" @click="openBrowser(oauthState.verificationUri)">打开浏览器</el-button>
              </template>
              <div v-if="oauthState.waiting" class="oauth-waiting">
                <el-icon class="is-loading"><ElIconLoading /></el-icon>
                <span>等待授权完成...</span>
              </div>
              <el-tag v-if="oauthState.completed" type="success" effect="plain">授权成功</el-tag>
            </div>
          </el-form-item>
        </div>

        <!-- OAuth PKCE (OpenAI Codex, Gemini CLI) -->
        <div v-if="currentAuthMethod === 'oauth-pkce'" class="oauth-section">
          <el-form-item label="OAuth 浏览器授权">
            <div v-if="!oauthState.inProgress">
              <el-button type="primary" @click="startPKCEAuth">浏览器授权</el-button>
            </div>
            <div v-else>
              <div v-if="oauthState.waiting" class="oauth-waiting">
                <el-icon class="is-loading"><ElIconLoading /></el-icon>
                <span>等待浏览器授权回调...</span>
              </div>
              <el-tag v-if="oauthState.completed" type="success" effect="plain">授权成功</el-tag>
            </div>
          </el-form-item>
        </div>

        <!-- AWS SDK 认证 -->
        <template v-if="currentAuthMethod === 'aws-sdk'">
          <el-form-item label="Access Key ID">
            <el-input v-model="form.awsAccessKeyId" placeholder="AKIA..." />
          </el-form-item>
          <el-form-item label="Secret Access Key">
            <el-input v-model="form.awsSecretAccessKey" type="password" show-password />
          </el-form-item>
          <el-form-item label="Region">
            <el-select v-model="form.awsRegion" filterable style="width: 100%">
              <el-option label="us-east-1 (弗吉尼亚)" value="us-east-1" />
              <el-option label="us-west-2 (俄勒冈)" value="us-west-2" />
              <el-option label="eu-west-1 (爱尔兰)" value="eu-west-1" />
              <el-option label="eu-central-1 (法兰克福)" value="eu-central-1" />
              <el-option label="ap-northeast-1 (东京)" value="ap-northeast-1" />
              <el-option label="ap-southeast-1 (新加坡)" value="ap-southeast-1" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 无需认证提示 -->
        <el-form-item v-if="currentAuthMethod === 'none'" label="认证">
          <el-tag type="info" effect="plain">无需认证（本地服务）</el-tag>
        </el-form-item>

        <!-- 模型列表 -->
        <el-form-item label="模型列表">
          <div class="models-table">
            <div class="models-header">
              <span class="models-col-id">模型 ID</span>
              <span class="models-col-name">显示名称</span>
              <span class="models-col-action"></span>
            </div>
            <div v-for="(model, idx) in form.modelsList" :key="idx" class="models-row">
              <el-input v-model="model.id" size="small" placeholder="模型 ID，如 gpt-4o" class="models-col-id" />
              <el-input v-model="model.name" size="small" placeholder="显示名称（可选）" class="models-col-name" />
              <el-button text size="small" type="danger" @click="form.modelsList.splice(idx, 1)" class="models-col-action">删除</el-button>
            </div>
            <el-button size="small" @click="form.modelsList.push({ id: '', name: '' })" style="margin-top: 6px">
              + 添加模型
            </el-button>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button @click="testProvider" :loading="testing">测试连通性</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>

    <!-- 连通性测试结果对话框 -->
    <el-dialog
      v-model="testResultVisible"
      :title="testResult.success ? '连通性测试成功' : '连通性测试失败'"
      width="600px"
      append-to-body
    >
      <!-- 状态概览 -->
      <div class="test-result-summary">
        <div class="test-result-badge" :class="testResult.success ? 'badge-success' : 'badge-error'">
          <el-icon :size="24">
            <ElIconSuccessFilled v-if="testResult.success" />
            <ElIconCircleCloseFilled v-else />
          </el-icon>
          <span>{{ testResult.success ? '连通成功' : '连通失败' }}</span>
        </div>
        <span class="test-result-latency">{{ testResult.latency }}ms</span>
      </div>

      <!-- 请求信息 -->
      <div class="test-result-section">
        <div class="test-result-label">请求信息</div>
        <div class="test-result-meta">
          <div class="meta-row"><span class="meta-key">API 地址</span><span class="meta-val">{{ testResult.baseUrl }}</span></div>
          <div class="meta-row"><span class="meta-key">协议类型</span><span class="meta-val">{{ testResult.apiType }}</span></div>
          <div class="meta-row"><span class="meta-key">模型</span><span class="meta-val">{{ testResult.model }}</span></div>
        </div>
      </div>

      <!-- 对话记录 -->
      <div class="test-result-section">
        <div class="test-result-label">对话</div>
        <div class="test-chat">
          <div class="chat-bubble chat-user">
            <span class="chat-role">User</span>
            <span class="chat-text">{{ testResult.request }}</span>
          </div>
          <div v-if="testResult.success" class="chat-bubble chat-assistant">
            <span class="chat-role">Assistant</span>
            <span class="chat-text">{{ testResult.response }}</span>
          </div>
          <div v-else class="chat-bubble chat-error">
            <div class="chat-error-header">
              <span class="chat-role">Error</span>
              <el-button text size="small" class="chat-copy-btn" @click="copyTestError" title="复制错误信息">
                <el-icon :size="12"><ElIconCopyDocument /></el-icon> 复制
              </el-button>
            </div>
            <span class="chat-text">{{ testResult.error }}</span>
          </div>
        </div>
      </div>

      <!-- 原始响应（折叠） -->
      <el-collapse class="test-result-raw-collapse">
        <el-collapse-item title="原始响应">
          <pre class="test-result-raw">{{ testResult.raw }}</pre>
        </el-collapse-item>
      </el-collapse>
    </el-dialog>
  </div>
</template>

<style scoped>
.providers-view {
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

.default-model-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.default-model-label {
  font-size: 13px;
  color: var(--ct-text-secondary);
  white-space: nowrap;
}

/* 供应商列表 */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid var(--ct-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--ct-bg-card);
}

.provider-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--ct-border);
  transition: background 0.15s;
}

.provider-item:last-child {
  border-bottom: none;
}

.provider-item:hover {
  background: rgba(64, 158, 255, 0.03);
}

.provider-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.provider-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409EFF, #337ecc);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
  user-select: none;
}

.provider-avatar.avatar-openai { background: linear-gradient(135deg, #10a37f, #0d8c6d); }
.provider-avatar.avatar-anthropic { background: linear-gradient(135deg, #d4a27f, #c4886a); }
.provider-avatar.avatar-gemini { background: linear-gradient(135deg, #4285f4, #886aea); }
.provider-avatar.avatar-aws { background: linear-gradient(135deg, #ff9900, #e68a00); }
.provider-avatar.avatar-ollama { background: linear-gradient(135deg, #888, #555); }
.provider-avatar.avatar-default { background: linear-gradient(135deg, #409EFF, #337ecc); }

.avatar-letter {
  font-weight: 700;
  font-size: 18px;
}

.provider-info {
  flex: 1;
  min-width: 0;
}

.provider-name {
  font-weight: 700;
  font-size: 15px;
  color: var(--ct-text-primary);
  line-height: 1.3;
}

.provider-meta {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 4px;
  align-items: center;
}

/* API Key 栏 */
.apikey-bar {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(230, 162, 60, 0.08);
  border: 1px solid rgba(230, 162, 60, 0.25);
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 12px;
  color: var(--ct-text-secondary);
  max-width: 320px;
}

.apikey-icon {
  color: #e6a23c;
  flex-shrink: 0;
}

.apikey-text {
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: all;
}

.apikey-btn {
  padding: 0 2px !important;
  height: auto !important;
  color: var(--ct-text-placeholder) !important;
}

.apikey-btn:hover {
  color: var(--ct-text-primary) !important;
}

.provider-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.form-tip {
  font-size: 11px;
  color: var(--ct-text-secondary);
  margin-top: 4px;
  line-height: 1.4;
}

.provider-url {
  font-size: 12px;
  color: var(--ct-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 8px 0 0 52px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
}

/* 模型展开栏 */
.provider-models-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 0 52px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--ct-bg-base, rgba(0,0,0,0.02));
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
}

.provider-models-bar:hover {
  background: var(--ct-bg-base, rgba(0,0,0,0.05));
}

.models-bar-left {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ct-text-secondary);
}

.models-bar-arrow {
  transition: transform 0.2s;
  color: var(--ct-text-placeholder);
}

.models-bar-arrow.is-expanded {
  transform: rotate(180deg);
}

/* 模型列表展开区 */
.provider-models-list {
  margin: 6px 0 0 52px;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--ct-bg-base, rgba(0,0,0,0.02));
}

.models-empty {
  font-size: 12px;
  color: var(--ct-text-placeholder);
}

.models-list-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  font-size: 12px;
  border-bottom: 1px solid var(--ct-border);
}

.models-list-row:last-child {
  border-bottom: none;
}

.models-list-id {
  font-family: 'Cascadia Code', 'Consolas', monospace;
  color: var(--ct-text-primary);
}

.models-list-name {
  color: var(--ct-text-secondary);
}

.oauth-section {
  margin-bottom: 8px;
}

.oauth-hint {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--ct-text-secondary);
}

.device-flow-ui {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.device-code {
  font-family: monospace;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
  color: var(--ct-text-primary);
  background: var(--ct-bg-card);
  border: 1px solid var(--ct-border);
  border-radius: 6px;
  padding: 12px 16px;
  text-align: center;
  user-select: all;
}

.oauth-waiting {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--ct-text-secondary);
}

.models-table {
  width: 100%;
}

.models-header {
  display: flex;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ct-border);
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ct-text-secondary);
}

.models-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 4px;
}

.models-col-id {
  flex: 1;
}

.models-col-name {
  flex: 1;
}

.models-col-action {
  width: 50px;
  flex-shrink: 0;
}

/* 连通性测试结果对话框 */
.test-result-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.test-result-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
}

.test-result-badge.badge-success { color: var(--ct-success, #67c23a); }
.test-result-badge.badge-error { color: var(--ct-danger, #f56c6c); }

.test-result-latency {
  font-size: 14px;
  font-weight: 600;
  color: var(--ct-text-secondary);
  font-family: 'Cascadia Code', 'Consolas', monospace;
}

.test-result-section {
  margin-bottom: 16px;
}

.test-result-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ct-text-secondary);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.test-result-meta {
  background: var(--ct-bg-base, rgba(0,0,0,0.03));
  border-radius: 6px;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-row {
  display: flex;
  gap: 12px;
  font-size: 13px;
}

.meta-key {
  color: var(--ct-text-secondary);
  min-width: 70px;
  flex-shrink: 0;
}

.meta-val {
  color: var(--ct-text-primary);
  word-break: break-all;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 12px;
}

.test-chat {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-bubble {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.chat-role {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.chat-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.chat-user {
  background: rgba(64, 158, 255, 0.08);
  border: 1px solid rgba(64, 158, 255, 0.2);
}
.chat-user .chat-role { color: #409EFF; }
.chat-user .chat-text { color: var(--ct-text-primary); }

.chat-assistant {
  background: rgba(103, 194, 58, 0.08);
  border: 1px solid rgba(103, 194, 58, 0.2);
}
.chat-assistant .chat-role { color: #67c23a; }
.chat-assistant .chat-text { color: var(--ct-text-primary); }

.chat-error-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-copy-btn {
  color: #f56c6c !important;
  font-size: 12px !important;
  padding: 0 4px !important;
  height: auto !important;
}

.chat-copy-btn:hover {
  opacity: 0.8;
}

.chat-error {
  background: rgba(245, 108, 108, 0.08);
  border: 1px solid rgba(245, 108, 108, 0.2);
}
.chat-error .chat-role { color: #f56c6c; }
.chat-error .chat-text { color: #f56c6c; }

.test-result-raw-collapse {
  margin-top: 8px;
}

.test-result-raw {
  max-height: 200px;
  overflow-y: auto;
  background: #1e1e2e;
  color: #cdd6f4;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Cascadia Code', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}
</style>
