# Model Provider Quickstart

Source: https://docs.openclaw.ai/providers/models

---

Overview

# Model Provider Quickstart

# [​
](#model-providers)
Model Providers

OpenClaw can use many LLM providers. Pick one, authenticate, then set the default
model as `provider/model`.

## [​
](#quick-start-two-steps)
Quick start (two steps)

- Authenticate with the provider (usually via `openclaw onboard`).

- Set the default model:

Copy

```
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}

```

## [​
](#supported-providers-starter-set)
Supported providers (starter set)

- [OpenAI (API + Codex)](/providers/openai)

- [Anthropic (API + Claude Code CLI)](/providers/anthropic)

- [OpenRouter](/providers/openrouter)

- [Vercel AI Gateway](/providers/vercel-ai-gateway)

- [Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)

- [Moonshot AI (Kimi + Kimi Coding)](/providers/moonshot)

- [Mistral](/providers/mistral)

- [Synthetic](/providers/synthetic)

- [OpenCode Zen](/providers/opencode)

- [Z.AI](/providers/zai)

- [GLM models](/providers/glm)

- [MiniMax](/providers/minimax)

- [Venice (Venice AI)](/providers/venice)

- [Amazon Bedrock](/providers/bedrock)

- [Qianfan](/providers/qianfan)

For the full provider catalog (xAI, Groq, Mistral, etc.) and advanced configuration,
see [Model providers](/concepts/model-providers).
[Model Providers](/providers)[Models CLI](/concepts/models)
⌘I