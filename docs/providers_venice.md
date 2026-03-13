# Venice AI

Source: https://docs.openclaw.ai/providers/venice

---

Providers

# Venice AI

# [​
](#venice-ai-venice-highlight)
Venice AI (Venice highlight)

**Venice** is our highlight Venice setup for privacy-first inference with optional anonymized access to proprietary models.
Venice AI provides privacy-focused AI inference with support for uncensored models and access to major proprietary models through their anonymized proxy. All inference is private by default—no training on your data, no logging.

## [​
](#why-venice-in-openclaw)
Why Venice in OpenClaw

- **Private inference** for open-source models (no logging).

- **Uncensored models** when you need them.

- **Anonymized access** to proprietary models (Opus/GPT/Gemini) when quality matters.

- OpenAI-compatible `/v1` endpoints.

## [​
](#privacy-modes)
Privacy Modes

Venice offers two privacy levels — understanding this is key to choosing your model:
ModeDescriptionModels**Private**Fully private. Prompts/responses are **never stored or logged**. Ephemeral.Llama, Qwen, DeepSeek, Kimi, MiniMax, Venice Uncensored, etc.**Anonymized**Proxied through Venice with metadata stripped. The underlying provider (OpenAI, Anthropic, Google, xAI) sees anonymized requests.Claude, GPT, Gemini, Grok

## [​
](#features)
Features

- **Privacy-focused**: Choose between “private” (fully private) and “anonymized” (proxied) modes

- **Uncensored models**: Access to models without content restrictions

- **Major model access**: Use Claude, GPT, Gemini, and Grok via Venice’s anonymized proxy

- **OpenAI-compatible API**: Standard `/v1` endpoints for easy integration

- **Streaming**: ✅ Supported on all models

- **Function calling**: ✅ Supported on select models (check model capabilities)

- **Vision**: ✅ Supported on models with vision capability

- **No hard rate limits**: Fair-use throttling may apply for extreme usage

## [​
](#setup)
Setup

### [​
](#1-get-api-key)
1. Get API Key

- Sign up at [venice.ai](https://venice.ai)

- Go to **Settings → API Keys → Create new key**

- Copy your API key (format: `vapi_xxxxxxxxxxxx`)

### [​
](#2-configure-openclaw)
2. Configure OpenClaw

**Option A: Environment Variable**
Copy

```
export VENICE_API_KEY="vapi_xxxxxxxxxxxx"

```

**Option B: Interactive Setup (Recommended)**
Copy

```
openclaw onboard --auth-choice venice-api-key

```

This will:

- Prompt for your API key (or use existing `VENICE_API_KEY`)

- Show all available Venice models

- Let you pick your default model

- Configure the provider automatically

**Option C: Non-interactive**
Copy

```
openclaw onboard --non-interactive \
  --auth-choice venice-api-key \
  --venice-api-key "vapi_xxxxxxxxxxxx"

```

### [​
](#3-verify-setup)
3. Verify Setup

Copy

```
openclaw agent --model venice/kimi-k2-5 --message "Hello, are you working?"

```

## [​
](#model-selection)
Model Selection

After setup, OpenClaw shows all available Venice models. Pick based on your needs:

- **Default model**: `venice/kimi-k2-5` for strong private reasoning plus vision.

- **High-capability option**: `venice/claude-opus-4-6` for the strongest anonymized Venice path.

- **Privacy**: Choose “private” models for fully private inference.

- **Capability**: Choose “anonymized” models to access Claude, GPT, Gemini via Venice’s proxy.

Change your default model anytime:
Copy

```
openclaw models set venice/kimi-k2-5
openclaw models set venice/claude-opus-4-6

```

List all available models:
Copy

```
openclaw models list | grep venice

```

## [​
](#configure-via-openclaw-configure)
Configure via `openclaw configure`

- Run `openclaw configure`

- Select **Model/auth**

- Choose **Venice AI**

## [​
](#which-model-should-i-use)
Which Model Should I Use?

Use CaseRecommended ModelWhy**General chat (default)**`kimi-k2-5`Strong private reasoning plus vision**Best overall quality**`claude-opus-4-6`Strongest anonymized Venice option**Privacy + coding**`qwen3-coder-480b-a35b-instruct`Private coding model with large context**Private vision**`kimi-k2-5`Vision support without leaving private mode**Fast + cheap**`qwen3-4b`Lightweight reasoning model**Complex private tasks**`deepseek-v3.2`Strong reasoning, but no Venice tool support**Uncensored**`venice-uncensored`No content restrictions

## [​
](#available-models-41-total)
Available Models (41 Total)

### [​
](#private-models-26-—-fully-private-no-logging)
Private Models (26) — Fully Private, No Logging

Model IDNameContextFeatures`kimi-k2-5`Kimi K2.5256kDefault, reasoning, vision`kimi-k2-thinking`Kimi K2 Thinking256kReasoning`llama-3.3-70b`Llama 3.3 70B128kGeneral`llama-3.2-3b`Llama 3.2 3B128kGeneral`hermes-3-llama-3.1-405b`Hermes 3 Llama 3.1 405B128kGeneral, tools disabled`qwen3-235b-a22b-thinking-2507`Qwen3 235B Thinking128kReasoning`qwen3-235b-a22b-instruct-2507`Qwen3 235B Instruct128kGeneral`qwen3-coder-480b-a35b-instruct`Qwen3 Coder 480B256kCoding`qwen3-coder-480b-a35b-instruct-turbo`Qwen3 Coder 480B Turbo256kCoding`qwen3-5-35b-a3b`Qwen3.5 35B A3B256kReasoning, vision`qwen3-next-80b`Qwen3 Next 80B256kGeneral`qwen3-vl-235b-a22b`Qwen3 VL 235B (Vision)256kVision`qwen3-4b`Venice Small (Qwen3 4B)32kFast, reasoning`deepseek-v3.2`DeepSeek V3.2160kReasoning, tools disabled`venice-uncensored`Venice Uncensored (Dolphin-Mistral)32kUncensored, tools disabled`mistral-31-24b`Venice Medium (Mistral)128kVision`google-gemma-3-27b-it`Google Gemma 3 27B Instruct198kVision`openai-gpt-oss-120b`OpenAI GPT OSS 120B128kGeneral`nvidia-nemotron-3-nano-30b-a3b`NVIDIA Nemotron 3 Nano 30B128kGeneral`olafangensan-glm-4.7-flash-heretic`GLM 4.7 Flash Heretic128kReasoning`zai-org-glm-4.6`GLM 4.6198kGeneral`zai-org-glm-4.7`GLM 4.7198kReasoning`zai-org-glm-4.7-flash`GLM 4.7 Flash128kReasoning`zai-org-glm-5`GLM 5198kReasoning`minimax-m21`MiniMax M2.1198kReasoning`minimax-m25`MiniMax M2.5198kReasoning

### [​
](#anonymized-models-15-—-via-venice-proxy)
Anonymized Models (15) — Via Venice Proxy

Model IDNameContextFeatures`claude-opus-4-6`Claude Opus 4.6 (via Venice)1MReasoning, vision`claude-opus-4-5`Claude Opus 4.5 (via Venice)198kReasoning, vision`claude-sonnet-4-6`Claude Sonnet 4.6 (via Venice)1MReasoning, vision`claude-sonnet-4-5`Claude Sonnet 4.5 (via Venice)198kReasoning, vision`openai-gpt-54`GPT-5.4 (via Venice)1MReasoning, vision`openai-gpt-53-codex`GPT-5.3 Codex (via Venice)400kReasoning, vision, coding`openai-gpt-52`GPT-5.2 (via Venice)256kReasoning`openai-gpt-52-codex`GPT-5.2 Codex (via Venice)256kReasoning, vision, coding`openai-gpt-4o-2024-11-20`GPT-4o (via Venice)128kVision`openai-gpt-4o-mini-2024-07-18`GPT-4o Mini (via Venice)128kVision`gemini-3-1-pro-preview`Gemini 3.1 Pro (via Venice)1MReasoning, vision`gemini-3-pro-preview`Gemini 3 Pro (via Venice)198kReasoning, vision`gemini-3-flash-preview`Gemini 3 Flash (via Venice)256kReasoning, vision`grok-41-fast`Grok 4.1 Fast (via Venice)1MReasoning, vision`grok-code-fast-1`Grok Code Fast 1 (via Venice)256kReasoning, coding

## [​
](#model-discovery)
Model Discovery

OpenClaw automatically discovers models from the Venice API when `VENICE_API_KEY` is set. If the API is unreachable, it falls back to a static catalog.
The `/models` endpoint is public (no auth needed for listing), but inference requires a valid API key.

## [​
](#streaming-&-tool-support)
Streaming & Tool Support

FeatureSupport**Streaming**✅ All models**Function calling**✅ Most models (check `supportsFunctionCalling` in API)**Vision/Images**✅ Models marked with “Vision” feature**JSON mode**✅ Supported via `response_format`

## [​
](#pricing)
Pricing

Venice uses a credit-based system. Check [venice.ai/pricing](https://venice.ai/pricing) for current rates:

- **Private models**: Generally lower cost

- **Anonymized models**: Similar to direct API pricing + small Venice fee

## [​
](#comparison-venice-vs-direct-api)
Comparison: Venice vs Direct API

AspectVenice (Anonymized)Direct API**Privacy**Metadata stripped, anonymizedYour account linked**Latency**+10-50ms (proxy)Direct**Features**Most features supportedFull features**Billing**Venice creditsProvider billing

## [​
](#usage-examples)
Usage Examples

Copy

```
# Use the default private model
openclaw agent --model venice/kimi-k2-5 --message "Quick health check"

# Use Claude Opus via Venice (anonymized)
openclaw agent --model venice/claude-opus-4-6 --message "Summarize this task"

# Use uncensored model
openclaw agent --model venice/venice-uncensored --message "Draft options"

# Use vision model with image
openclaw agent --model venice/qwen3-vl-235b-a22b --message "Review attached image"

# Use coding model
openclaw agent --model venice/qwen3-coder-480b-a35b-instruct --message "Refactor this function"

```

## [​
](#troubleshooting)
Troubleshooting

### [​
](#api-key-not-recognized)
API key not recognized

Copy

```
echo $VENICE_API_KEY
openclaw models list | grep venice

```

Ensure the key starts with `vapi_`.

### [​
](#model-not-available)
Model not available

The Venice model catalog updates dynamically. Run `openclaw models list` to see currently available models. Some models may be temporarily offline.

### [​
](#connection-issues)
Connection issues

Venice API is at `https://api.venice.ai/api/v1`. Ensure your network allows HTTPS connections.

## [​
](#config-file-example)
Config file example

Copy

```
{
  env: { VENICE_API_KEY: "vapi_..." },
  agents: { defaults: { model: { primary: "venice/kimi-k2-5" } } },
  models: {
    mode: "merge",
    providers: {
      venice: {
        baseUrl: "https://api.venice.ai/api/v1",
        apiKey: "${VENICE_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "kimi-k2-5",
            name: "Kimi K2.5",
            reasoning: true,
            input: ["text", "image"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 256000,
            maxTokens: 65536,
          },
        ],
      },
    },
  },
}

```

## [​
](#links)
Links

- [Venice AI](https://venice.ai)

- [API Documentation](https://docs.venice.ai)

- [Pricing](https://venice.ai/pricing)

- [Status](https://status.venice.ai)

[Vercel AI Gateway](/providers/vercel-ai-gateway)[vLLM](/providers/vllm)
⌘I