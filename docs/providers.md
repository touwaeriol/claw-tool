# Model Providers

Source: https://docs.openclaw.ai/providers

---

Overview

# Model Providers

# [​
](#model-providers)
Model Providers

OpenClaw can use many LLM providers. Pick a provider, authenticate, then set the
default model as `provider/model`.
Looking for chat channel docs (WhatsApp/Telegram/Discord/Slack/Mattermost (plugin)/etc.)? See [Channels](/channels).

## [​
](#quick-start)
Quick start

- Authenticate with the provider (usually via `openclaw onboard`).

- Set the default model:

Copy

```
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}

```

## [​
](#provider-docs)
Provider docs

- [Amazon Bedrock](/providers/bedrock)

- [Anthropic (API + Claude Code CLI)](/providers/anthropic)

- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)

- [GLM models](/providers/glm)

- [Hugging Face (Inference)](/providers/huggingface)

- [Kilocode](/providers/kilocode)

- [LiteLLM (unified gateway)](/providers/litellm)

- [MiniMax](/providers/minimax)

- [Mistral](/providers/mistral)

- [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)

- [NVIDIA](/providers/nvidia)

- [Ollama (local models)](/providers/ollama)

- [OpenAI (API + Codex)](/providers/openai)

- [OpenCode Zen](/providers/opencode)

- [OpenRouter](/providers/openrouter)

- [Qianfan](/providers/qianfan)

- [Qwen (OAuth)](/providers/qwen)

- [Together AI](/providers/together)

- [Vercel AI Gateway](/providers/vercel-ai-gateway)

- [Venice (Venice AI, privacy-focused)](/providers/venice)

- [vLLM (local models)](/providers/vllm)

- [Xiaomi](/providers/xiaomi)

- [Z.AI](/providers/zai)

## [​
](#transcription-providers)
Transcription providers

- [Deepgram (audio transcription)](/providers/deepgram)

## [​
](#community-tools)
Community tools

- [Claude Max API Proxy](/providers/claude-max-api-proxy) - Community proxy for Claude subscription credentials (verify Anthropic policy/terms before use)

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/concepts/model-providers).
[Model Provider Quickstart](/providers/models)
⌘I