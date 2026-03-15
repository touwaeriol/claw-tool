/**
 * Provider 定义文件
 * 所有 30+ Provider 的元信息，来源于 OpenClaw 源码
 */

// ─── MODEL_APIS ───────────────────────────────────────────────
export const MODEL_APIS = [
  { value: 'openai-completions', label: 'OpenAI Completions' },
  { value: 'openai-responses', label: 'OpenAI Responses' },
  { value: 'openai-codex-responses', label: 'OpenAI Codex Responses' },
  { value: 'anthropic-messages', label: 'Anthropic Messages' },
  { value: 'google-generative-ai', label: 'Google Generative AI' },
  { value: 'github-copilot', label: 'GitHub Copilot' },
  { value: 'bedrock-converse-stream', label: 'AWS Bedrock' },
  { value: 'ollama', label: 'Ollama' },
]

// ─── AUTH_METHODS ─────────────────────────────────────────────
export const AUTH_METHODS = {
  'api-key': { label: 'providers.authApiKey', description: 'providers.authApiKeyDesc' },
  'oauth-device': {
    label: 'providers.authOAuthDevice',
    description: 'providers.authOAuthDeviceDesc',
  },
  'oauth-pkce': { label: 'providers.authOAuthPkce', description: 'providers.authOAuthPkceDesc' },
  'aws-sdk': { label: 'providers.authAwsSdk', description: 'providers.authAwsSdkDesc' },
  none: { label: 'providers.authNone', description: 'providers.authNoneDesc' },
  'setup-token': { label: 'providers.authSetupToken', description: 'providers.authSetupTokenDesc' },
}

// ─── PROVIDER_PRESETS ─────────────────────────────────────────
export const PROVIDER_PRESETS = [
  // ── OpenAI ──
  {
    id: 'openai',
    name: 'OpenAI',
    group: 'OpenAI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.openai.com/v1',
    authMethod: 'api-key',
    envVar: 'OPENAI_API_KEY',
    description: 'providers.descOpenAI',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'sk-...' },
    ],
    defaultModels: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o3-mini'],
  },
  {
    id: 'openai-codex',
    name: 'OpenAI Codex',
    group: 'OpenAI',
    apiType: 'openai-codex-responses',
    defaultBaseUrl: 'https://chatgpt.com/backend-api',
    authMethod: 'oauth-device',
    envVar: '',
    description: 'providers.descOpenAICodex',
    fields: [],
    defaultModels: ['codex-mini'],
  },

  // ── Anthropic ──
  {
    id: 'anthropic',
    name: 'Anthropic',
    group: 'Anthropic',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.anthropic.com',
    authMethod: 'api-key',
    envVar: 'ANTHROPIC_API_KEY',
    description: 'providers.descAnthropic',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-ant-...',
      },
    ],
    defaultModels: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  },
  {
    id: 'anthropic-token',
    name: 'Anthropic (Setup Token)',
    group: 'Anthropic',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.anthropic.com',
    authMethod: 'setup-token',
    envVar: 'ANTHROPIC_OAUTH_TOKEN',
    description: 'providers.descAnthropicToken',
    fields: [
      {
        key: 'token',
        label: 'Setup Token',
        type: 'password',
        required: true,
        placeholder: 'providers.placeholderSetupToken',
      },
    ],
    defaultModels: ['claude-opus-4-6', 'claude-sonnet-4-6'],
  },

  // ── Google ──
  {
    id: 'gemini',
    name: 'Google Gemini',
    group: 'Google',
    apiType: 'google-generative-ai',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    authMethod: 'api-key',
    envVar: 'GEMINI_API_KEY',
    description: 'providers.descGemini',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'AI...' },
    ],
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },
  {
    id: 'google-gemini-cli',
    name: 'Google Gemini CLI OAuth',
    group: 'Google',
    apiType: 'google-generative-ai',
    defaultBaseUrl: '',
    authMethod: 'oauth-device',
    envVar: '',
    description: 'providers.descGeminiCliOAuth',
    fields: [],
    defaultModels: ['gemini-2.5-pro', 'gemini-2.5-flash'],
  },

  // ── GitHub Copilot ──
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    group: 'Copilot',
    apiType: 'github-copilot',
    defaultBaseUrl: '',
    authMethod: 'oauth-device',
    envVar: 'COPILOT_GITHUB_TOKEN',
    description: 'providers.descCopilot',
    fields: [],
    defaultModels: ['claude-sonnet-4', 'gpt-4o'],
  },
  {
    id: 'copilot-proxy',
    name: 'Copilot Proxy',
    group: 'Copilot',
    apiType: 'github-copilot',
    defaultBaseUrl: 'http://localhost:1337',
    authMethod: 'none',
    envVar: '',
    description: 'providers.descCopilotProxy',
    fields: [
      {
        key: 'baseUrl',
        label: 'providers.labelProxyAddress',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:1337',
      },
    ],
    defaultModels: [],
  },

  // ── AWS Bedrock ──
  {
    id: 'bedrock',
    name: 'AWS Bedrock',
    group: 'AWS',
    apiType: 'bedrock-converse-stream',
    defaultBaseUrl: '',
    authMethod: 'aws-sdk',
    envVar: 'AWS_ACCESS_KEY_ID',
    description: 'providers.descBedrock',
    fields: [
      {
        key: 'accessKeyId',
        label: 'Access Key ID',
        type: 'password',
        required: true,
        placeholder: 'AKIA...',
      },
      {
        key: 'secretAccessKey',
        label: 'Secret Access Key',
        type: 'password',
        required: true,
        placeholder: '',
      },
      { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
    ],
    defaultModels: ['anthropic.claude-sonnet-4-v2@us', 'anthropic.claude-haiku-4-5-v1@us'],
  },

  // ── Ollama ──
  {
    id: 'ollama',
    name: 'Ollama',
    group: 'providers.groupLocalDeploy',
    apiType: 'ollama',
    defaultBaseUrl: 'http://localhost:11434',
    authMethod: 'none',
    envVar: '',
    description: 'providers.descOllama',
    fields: [
      {
        key: 'baseUrl',
        label: 'providers.labelServiceAddress',
        type: 'text',
        required: false,
        placeholder: 'http://localhost:11434',
      },
    ],
    defaultModels: ['llama3.1', 'codellama', 'deepseek-coder-v2'],
  },

  // ── xAI ──
  {
    id: 'xai',
    name: 'xAI (Grok)',
    group: 'xAI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.x.ai/v1',
    authMethod: 'api-key',
    envVar: 'XAI_API_KEY',
    description: 'providers.descXai',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: 'xai-...' },
    ],
    defaultModels: ['grok-4', 'grok-3'],
  },

  // ── Mistral ──
  {
    id: 'mistral',
    name: 'Mistral AI',
    group: 'Mistral',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
    authMethod: 'api-key',
    envVar: 'MISTRAL_API_KEY',
    description: 'providers.descMistral',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['mistral-large-latest', 'codestral-latest'],
  },

  // ── OpenRouter ──
  {
    id: 'openrouter',
    name: 'OpenRouter',
    group: 'OpenRouter',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    authMethod: 'api-key',
    envVar: 'OPENROUTER_API_KEY',
    description: 'providers.descOpenRouter',
    fields: [
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'password',
        required: true,
        placeholder: 'sk-or-...',
      },
    ],
    defaultModels: ['auto'],
  },

  // ── Together AI ──
  {
    id: 'together',
    name: 'Together AI',
    group: 'Together',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.together.xyz/v1',
    authMethod: 'api-key',
    envVar: 'TOGETHER_API_KEY',
    description: 'providers.descTogether',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['meta-llama/Llama-3-70b-chat-hf', 'deepseek-ai/DeepSeek-V3'],
  },

  // ── Hugging Face ──
  {
    id: 'huggingface',
    name: 'Hugging Face',
    group: 'Hugging Face',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://router.huggingface.co/v1',
    authMethod: 'api-key',
    envVar: 'HF_TOKEN',
    description: 'providers.descHuggingFace',
    fields: [
      { key: 'apiKey', label: 'HF Token', type: 'password', required: true, placeholder: 'hf_...' },
    ],
    defaultModels: [],
  },

  // ── Venice AI ──
  {
    id: 'venice',
    name: 'Venice AI',
    group: 'Venice',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.venice.ai/api/v1',
    authMethod: 'api-key',
    envVar: 'VENICE_API_KEY',
    description: 'providers.descVenice',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── LiteLLM ──
  {
    id: 'litellm',
    name: 'LiteLLM',
    group: 'LiteLLM',
    apiType: 'openai-completions',
    defaultBaseUrl: 'http://localhost:4000',
    authMethod: 'api-key',
    envVar: 'LITELLM_API_KEY',
    description: 'providers.descLiteLLM',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: '' },
      {
        key: 'baseUrl',
        label: 'providers.labelServiceAddress',
        type: 'text',
        required: false,
        placeholder: 'http://localhost:4000',
      },
    ],
    defaultModels: ['claude-opus-4-6'],
  },

  // ── Cloudflare AI Gateway ──
  {
    id: 'cloudflare-ai-gateway',
    name: 'Cloudflare AI Gateway',
    group: 'providers.groupGateway',
    apiType: 'openai-completions',
    defaultBaseUrl: '',
    authMethod: 'api-key',
    envVar: 'CLOUDFLARE_AI_GATEWAY_API_KEY',
    description: 'providers.descCloudflareAIGateway',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
      { key: 'accountId', label: 'Account ID', type: 'text', required: true, placeholder: '' },
      { key: 'gatewayId', label: 'Gateway ID', type: 'text', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── Vercel AI Gateway ──
  {
    id: 'vercel-ai-gateway',
    name: 'Vercel AI Gateway',
    group: 'providers.groupGateway',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://ai-gateway.vercel.sh',
    authMethod: 'api-key',
    envVar: 'AI_GATEWAY_API_KEY',
    description: 'providers.descVercelAIGateway',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── MiniMax ──
  {
    id: 'minimax-portal',
    name: 'MiniMax OAuth',
    group: 'MiniMax',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.minimax.io/anthropic',
    authMethod: 'oauth-device',
    envVar: 'MINIMAX_OAUTH_TOKEN',
    description: 'providers.descMiniMaxOAuth',
    fields: [],
    defaultModels: ['MiniMax-M2.5', 'MiniMax-VL-01'],
  },
  {
    id: 'minimax-api',
    name: 'MiniMax M2.5',
    group: 'MiniMax',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.minimax.io/anthropic',
    authMethod: 'api-key',
    envVar: 'MINIMAX_API_KEY',
    description: 'providers.descMiniMaxApiKey',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['MiniMax-M2.5'],
  },
  {
    id: 'minimax-api-key-cn',
    name: 'MiniMax M2.5 (CN)',
    group: 'MiniMax',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.minimaxi.com/anthropic',
    authMethod: 'api-key',
    envVar: 'MINIMAX_API_KEY',
    description: 'providers.descMiniMaxCN',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['MiniMax-M2.5'],
  },
  {
    id: 'minimax-api-lightning',
    name: 'MiniMax M2.5 Highspeed',
    group: 'MiniMax',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.minimax.io/anthropic',
    authMethod: 'api-key',
    envVar: 'MINIMAX_API_KEY',
    description: 'providers.descMiniMaxHighspeed',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['MiniMax-M2.5-highspeed'],
  },

  // ── Moonshot / Kimi ──
  {
    id: 'moonshot',
    name: 'Moonshot AI (Kimi)',
    group: 'Moonshot',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.moonshot.ai/v1',
    authMethod: 'api-key',
    envVar: 'MOONSHOT_API_KEY',
    description: 'providers.descMoonshot',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['kimi-k2.5'],
  },
  {
    id: 'moonshot-cn',
    name: 'Moonshot AI (Kimi CN)',
    group: 'Moonshot',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.moonshot.cn/v1',
    authMethod: 'api-key',
    envVar: 'MOONSHOT_API_KEY',
    description: 'providers.descMoonshotCN',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['kimi-k2.5'],
  },
  {
    id: 'kimi-code',
    name: 'Kimi Coding',
    group: 'Moonshot',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.kimi.com/coding/',
    authMethod: 'api-key',
    envVar: 'KIMI_API_KEY',
    description: 'providers.descKimiCode',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['k2p5'],
  },

  // ── 火山引擎 ──
  {
    id: 'volcengine',
    name: 'providers.nameVolcengine',
    group: 'providers.groupVolcengine',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    authMethod: 'api-key',
    envVar: 'VOLCANO_ENGINE_API_KEY',
    description: 'providers.descVolcengine',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── BytePlus ──
  {
    id: 'byteplus',
    name: 'BytePlus',
    group: 'BytePlus',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://ark.ap-southeast.bytepluses.com/api/v3',
    authMethod: 'api-key',
    envVar: 'BYTEPLUS_API_KEY',
    description: 'providers.descBytePlus',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── 千帆 ──
  {
    id: 'qianfan',
    name: 'providers.nameQianfan',
    group: 'providers.groupQianfan',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://qianfan.baidubce.com/v2',
    authMethod: 'api-key',
    envVar: 'QIANFAN_API_KEY',
    description: 'providers.descQianfan',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['deepseek-v3.2'],
  },

  // ── 通义千问 (Qwen) ──
  {
    id: 'qwen',
    name: 'providers.nameQwen',
    group: 'Qwen',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://portal.qwen.ai/v1',
    authMethod: 'oauth-device',
    envVar: 'QWEN_OAUTH_TOKEN',
    description: 'providers.descQwen',
    fields: [],
    defaultModels: ['qwen3-coder-plus'],
  },

  // ── Z.AI ──
  {
    id: 'zai-coding-global',
    name: 'Z.AI Coding (Global)',
    group: 'Z.AI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.z.ai/api/coding/paas/v4',
    authMethod: 'api-key',
    envVar: 'ZAI_API_KEY',
    description: 'GLM Coding Plan Global',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },
  {
    id: 'zai-coding-cn',
    name: 'Z.AI Coding (CN)',
    group: 'Z.AI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/coding/paas/v4',
    authMethod: 'api-key',
    envVar: 'ZAI_API_KEY',
    description: 'GLM Coding Plan CN',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },
  {
    id: 'zai-global',
    name: 'Z.AI (Global)',
    group: 'Z.AI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.z.ai/api/paas/v4',
    authMethod: 'api-key',
    envVar: 'ZAI_API_KEY',
    description: 'Z.AI Global',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },
  {
    id: 'zai-cn',
    name: 'Z.AI (CN)',
    group: 'Z.AI',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    authMethod: 'api-key',
    envVar: 'ZAI_API_KEY',
    description: 'Z.AI CN',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: [],
  },

  // ── Xiaomi ──
  {
    id: 'xiaomi',
    name: 'Xiaomi',
    group: 'Xiaomi',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.xiaomimimo.com/anthropic',
    authMethod: 'api-key',
    envVar: 'XIAOMI_API_KEY',
    description: 'providers.descXiaomi',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['mimo-v2-flash'],
  },

  // ── Kilocode ──
  {
    id: 'kilocode',
    name: 'Kilo Gateway',
    group: 'Kilocode',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.kilo.ai/api/gateway/',
    authMethod: 'api-key',
    envVar: 'KILOCODE_API_KEY',
    description: 'providers.descKilocode',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['kilo/auto'],
  },

  // ── Synthetic ──
  {
    id: 'synthetic',
    name: 'Synthetic',
    group: 'Synthetic',
    apiType: 'anthropic-messages',
    defaultBaseUrl: 'https://api.synthetic.new/anthropic',
    authMethod: 'api-key',
    envVar: 'SYNTHETIC_API_KEY',
    description: 'providers.descSynthetic',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['hf:MiniMaxAI/MiniMax-M2.5'],
  },

  // ── OpenCode Zen ──
  {
    id: 'opencode-zen',
    name: 'OpenCode Zen',
    group: 'OpenCode',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://opencode.ai/zen/v1',
    authMethod: 'api-key',
    envVar: 'OPENCODE_API_KEY',
    description: 'providers.descOpenCodeZen',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
    ],
    defaultModels: ['opencode/claude-opus-4-6'],
  },

  // ── Chutes ──
  {
    id: 'chutes',
    name: 'Chutes',
    group: 'Chutes',
    apiType: 'openai-completions',
    defaultBaseUrl: 'https://api.chutes.ai/v1',
    authMethod: 'oauth-device',
    envVar: 'CHUTES_OAUTH_TOKEN',
    description: 'providers.descChutes',
    fields: [],
    defaultModels: [],
  },

  // ── vLLM ──
  {
    id: 'vllm',
    name: 'vLLM',
    group: 'providers.groupLocalDeploy',
    apiType: 'openai-completions',
    defaultBaseUrl: 'http://localhost:8000/v1',
    authMethod: 'none',
    envVar: '',
    description: 'providers.descVLLM',
    fields: [
      {
        key: 'baseUrl',
        label: 'providers.labelServiceAddress',
        type: 'text',
        required: true,
        placeholder: 'http://localhost:8000/v1',
      },
      {
        key: 'model',
        label: 'providers.labelModelName',
        type: 'text',
        required: true,
        placeholder: '',
      },
    ],
    defaultModels: [],
  },

  // ── Custom ──
  {
    id: 'custom',
    name: 'providers.nameCustom',
    group: 'providers.groupCustom',
    apiType: 'openai-completions',
    defaultBaseUrl: '',
    authMethod: 'api-key',
    envVar: '',
    description: 'providers.descCustom',
    fields: [
      { key: 'apiKey', label: 'API Key', type: 'password', required: false, placeholder: '' },
      {
        key: 'baseUrl',
        label: 'Base URL',
        type: 'text',
        required: true,
        placeholder: 'https://...',
      },
      {
        key: 'model',
        label: 'providers.labelModelName',
        type: 'text',
        required: true,
        placeholder: '',
      },
    ],
    defaultModels: [],
  },
]

// ─── PROVIDER_GROUPS ──────────────────────────────────────────
export const PROVIDER_GROUPS = [
  { id: 'OpenAI', label: 'OpenAI', providers: ['openai', 'openai-codex'] },
  { id: 'Anthropic', label: 'Anthropic', providers: ['anthropic', 'anthropic-token'] },
  { id: 'Google', label: 'Google', providers: ['gemini', 'google-gemini-cli'] },
  { id: 'Copilot', label: 'Copilot', providers: ['github-copilot', 'copilot-proxy'] },
  { id: 'AWS', label: 'AWS Bedrock', providers: ['bedrock'] },
  { id: 'xAI', label: 'xAI (Grok)', providers: ['xai'] },
  { id: 'Mistral', label: 'Mistral AI', providers: ['mistral'] },
  {
    id: 'MiniMax',
    label: 'MiniMax',
    providers: ['minimax-portal', 'minimax-api', 'minimax-api-key-cn', 'minimax-api-lightning'],
  },
  { id: 'Moonshot', label: 'Moonshot / Kimi', providers: ['moonshot', 'moonshot-cn', 'kimi-code'] },
  { id: '火山引擎', label: 'providers.groupVolcengine', providers: ['volcengine'] },
  { id: 'BytePlus', label: 'BytePlus', providers: ['byteplus'] },
  { id: 'OpenRouter', label: 'OpenRouter', providers: ['openrouter'] },
  { id: 'Together', label: 'Together AI', providers: ['together'] },
  { id: 'Hugging Face', label: 'Hugging Face', providers: ['huggingface'] },
  { id: 'Venice', label: 'Venice AI', providers: ['venice'] },
  { id: 'Qwen', label: 'providers.nameQwen', providers: ['qwen'] },
  {
    id: 'Z.AI',
    label: 'Z.AI',
    providers: ['zai-coding-global', 'zai-coding-cn', 'zai-global', 'zai-cn'],
  },
  { id: '千帆', label: 'providers.nameQianfanFull', providers: ['qianfan'] },
  { id: 'Xiaomi', label: 'Xiaomi', providers: ['xiaomi'] },
  { id: 'Kilocode', label: 'Kilo Gateway', providers: ['kilocode'] },
  { id: 'Synthetic', label: 'Synthetic', providers: ['synthetic'] },
  { id: 'OpenCode', label: 'OpenCode Zen', providers: ['opencode-zen'] },
  { id: 'Chutes', label: 'Chutes', providers: ['chutes'] },
  { id: 'LiteLLM', label: 'LiteLLM', providers: ['litellm'] },
  {
    id: '网关',
    label: 'providers.groupGateway',
    providers: ['cloudflare-ai-gateway', 'vercel-ai-gateway'],
  },
  { id: '本地部署', label: 'providers.groupLocalDeploy', providers: ['ollama', 'vllm'] },
  { id: '自定义', label: 'providers.groupCustom', providers: ['custom'] },
]

// ─── 辅助函数 ──────────────────────────────────────────────────

const _presetMap = new Map(PROVIDER_PRESETS.map((p) => [p.id, p]))

export function getPresetById(id) {
  return _presetMap.get(id) ?? null
}

export function getDefaultFieldsForAuthMethod(method) {
  switch (method) {
    case 'api-key':
      return [
        { key: 'apiKey', label: 'API Key', type: 'password', required: true, placeholder: '' },
      ]
    case 'oauth-device':
    case 'oauth-pkce':
      return []
    case 'aws-sdk':
      return [
        {
          key: 'accessKeyId',
          label: 'Access Key ID',
          type: 'password',
          required: true,
          placeholder: '',
        },
        {
          key: 'secretAccessKey',
          label: 'Secret Access Key',
          type: 'password',
          required: true,
          placeholder: '',
        },
        { key: 'region', label: 'Region', type: 'text', required: true, placeholder: 'us-east-1' },
      ]
    case 'setup-token':
      return [
        { key: 'token', label: 'Setup Token', type: 'password', required: true, placeholder: '' },
      ]
    case 'none':
    default:
      return []
  }
}

export function getProvidersByGroup(groupId) {
  const group = PROVIDER_GROUPS.find((g) => g.id === groupId)
  if (!group) return []
  return group.providers.map((id) => getPresetById(id)).filter(Boolean)
}
