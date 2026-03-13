# OpenAI

Source: https://docs.openclaw.ai/providers/openai

---

Providers

# OpenAI

# [​
](#openai)
OpenAI

OpenAI provides developer APIs for GPT models. Codex supports **ChatGPT sign-in** for subscription
access or **API key** sign-in for usage-based access. Codex cloud requires ChatGPT sign-in.
OpenAI explicitly supports subscription OAuth usage in external tools/workflows like OpenClaw.

## [​
](#option-a-openai-api-key-openai-platform)
Option A: OpenAI API key (OpenAI Platform)

**Best for:** direct API access and usage-based billing.
Get your API key from the OpenAI dashboard.

### [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice openai-api-key
# or non-interactive
openclaw onboard --openai-api-key "$OPENAI_API_KEY"

```

### [​
](#config-snippet)
Config snippet

Copy

```
{
  env: { OPENAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "openai/gpt-5.4" } } },
}

```

OpenAI’s current API model docs list `gpt-5.4` and `gpt-5.4-pro` for direct
OpenAI API usage. OpenClaw forwards both through the `openai/*` Responses path.

## [​
](#option-b-openai-code-codex-subscription)
Option B: OpenAI Code (Codex) subscription

**Best for:** using ChatGPT/Codex subscription access instead of an API key.
Codex cloud requires ChatGPT sign-in, while the Codex CLI supports ChatGPT or API key sign-in.

### [​
](#cli-setup-codex-oauth)
CLI setup (Codex OAuth)

Copy

```
# Run Codex OAuth in the wizard
openclaw onboard --auth-choice openai-codex

# Or run OAuth directly
openclaw models auth login --provider openai-codex

```

### [​
](#config-snippet-codex-subscription)
Config snippet (Codex subscription)

Copy

```
{
  agents: { defaults: { model: { primary: "openai-codex/gpt-5.4" } } },
}

```

OpenAI’s current Codex docs list `gpt-5.4` as the current Codex model. OpenClaw
maps that to `openai-codex/gpt-5.4` for ChatGPT/Codex OAuth usage.

### [​
](#transport-default)
Transport default

OpenClaw uses `pi-ai` for model streaming. For both `openai/*` and
`openai-codex/*`, default transport is `"auto"` (WebSocket-first, then SSE
fallback).
You can set `agents.defaults.models.<provider/model>.params.transport`:

- `"sse"`: force SSE

- `"websocket"`: force WebSocket

- `"auto"`: try WebSocket, then fall back to SSE

For `openai/*` (Responses API), OpenClaw also enables WebSocket warm-up by
default (`openaiWsWarmup: true`) when WebSocket transport is used.
Related OpenAI docs:

- [Realtime API with WebSocket](https://platform.openai.com/docs/guides/realtime-websocket)

- [Streaming API responses (SSE)](https://platform.openai.com/docs/guides/streaming-responses)

Copy

```
{
  agents: {
    defaults: {
      model: { primary: "openai-codex/gpt-5.4" },
      models: {
        "openai-codex/gpt-5.4": {
          params: {
            transport: "auto",
          },
        },
      },
    },
  },
}

```

### [​
](#openai-websocket-warm-up)
OpenAI WebSocket warm-up

OpenAI docs describe warm-up as optional. OpenClaw enables it by default for
`openai/*` to reduce first-turn latency when using WebSocket transport.

### [​
](#disable-warm-up)
Disable warm-up

Copy

```
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: false,
          },
        },
      },
    },
  },
}

```

### [​
](#enable-warm-up-explicitly)
Enable warm-up explicitly

Copy

```
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            openaiWsWarmup: true,
          },
        },
      },
    },
  },
}

```

### [​
](#openai-priority-processing)
OpenAI priority processing

OpenAI’s API exposes priority processing via `service_tier=priority`. In
OpenClaw, set `agents.defaults.models["openai/<model>"].params.serviceTier` to
pass that field through on direct `openai/*` Responses requests.
Copy

```
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            serviceTier: "priority",
          },
        },
      },
    },
  },
}

```

Supported values are `auto`, `default`, `flex`, and `priority`.

### [​
](#openai-responses-server-side-compaction)
OpenAI Responses server-side compaction

For direct OpenAI Responses models (`openai/*` using `api: "openai-responses"` with
`baseUrl` on `api.openai.com`), OpenClaw now auto-enables OpenAI server-side
compaction payload hints:

- Forces `store: true` (unless model compat sets `supportsStore: false`)

- Injects `context_management: [{ type: "compaction", compact_threshold: ... }]`

By default, `compact_threshold` is `70%` of model `contextWindow` (or `80000`
when unavailable).

### [​
](#enable-server-side-compaction-explicitly)
Enable server-side compaction explicitly

Use this when you want to force `context_management` injection on compatible
Responses models (for example Azure OpenAI Responses):
Copy

```
{
  agents: {
    defaults: {
      models: {
        "azure-openai-responses/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
          },
        },
      },
    },
  },
}

```

### [​
](#enable-with-a-custom-threshold)
Enable with a custom threshold

Copy

```
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: true,
            responsesCompactThreshold: 120000,
          },
        },
      },
    },
  },
}

```

### [​
](#disable-server-side-compaction)
Disable server-side compaction

Copy

```
{
  agents: {
    defaults: {
      models: {
        "openai/gpt-5.4": {
          params: {
            responsesServerCompaction: false,
          },
        },
      },
    },
  },
}

```

`responsesServerCompaction` only controls `context_management` injection.
Direct OpenAI Responses models still force `store: true` unless compat sets
`supportsStore: false`.

## [​
](#notes)
Notes

- Model refs always use `provider/model` (see [/concepts/models](/concepts/models)).

- Auth details + reuse rules are in [/concepts/oauth](/concepts/oauth).

[Ollama](/providers/ollama)[OpenCode Zen](/providers/opencode)
⌘I