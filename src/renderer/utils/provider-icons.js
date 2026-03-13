// Provider 图标映射
// CDN 可用的用 Simple Icons CDN，不可用的用本地 SVG
export const PROVIDER_ICONS = {
  // === CDN 可用 (Simple Icons) ===
  'anthropic': 'https://cdn.simpleicons.org/anthropic/D97757',
  'google': 'https://cdn.simpleicons.org/google/4285F4',
  'github-copilot': 'https://cdn.simpleicons.org/githubcopilot/000000',
  'ollama': 'https://cdn.simpleicons.org/ollama/000000',
  'xai': 'https://cdn.simpleicons.org/x/000000',
  'mistral': 'https://cdn.simpleicons.org/mistralai/FF7000',
  'openrouter': 'https://cdn.simpleicons.org/openrouter/6366F1',
  'huggingface': 'https://cdn.simpleicons.org/huggingface/FFD21E',
  'cloudflare': 'https://cdn.simpleicons.org/cloudflare/F38020',
  'vercel': 'https://cdn.simpleicons.org/vercel/000000',
  'xiaomi': 'https://cdn.simpleicons.org/xiaomi/FF6900',
  'minimax': 'https://cdn.simpleicons.org/minimax/000000',

  // === 本地 SVG (CDN 不可用) ===
  'openai': './icons/providers/openai.svg',
  'aws-bedrock': './icons/providers/aws-bedrock.svg',
  'together': './icons/providers/together.svg',
  'venice': './icons/providers/venice.svg',
  'litellm': './icons/providers/litellm.svg',
  'volcengine': './icons/providers/volcengine.svg',
  'byteplus': './icons/providers/byteplus.svg',
  'qianfan': './icons/providers/qianfan.svg',
  'qwen': './icons/providers/qwen.svg',
  'zai': './icons/providers/zai.svg',
  'kilocode': './icons/providers/kilocode.svg',
  'synthetic': './icons/providers/synthetic.svg',
  'opencode': './icons/providers/opencode.svg',
  'chutes': './icons/providers/chutes.svg',
  'vllm': './icons/providers/vllm.svg',
  'kimi': './icons/providers/kimi.svg',
  'moonshot': './icons/providers/moonshot.svg',
  'custom': './icons/providers/custom.svg',
}

export function getProviderIcon(providerId) {
  return PROVIDER_ICONS[providerId] || PROVIDER_ICONS['custom']
}
