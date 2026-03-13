# Xiaomi MiMo

Source: https://docs.openclaw.ai/providers/xiaomi

---

Providers

# Xiaomi MiMo

# [​
](#xiaomi-mimo)
Xiaomi MiMo

Xiaomi MiMo is the API platform for **MiMo** models. It provides REST APIs compatible with
OpenAI and Anthropic formats and uses API keys for authentication. Create your API key in
the [Xiaomi MiMo console](https://platform.xiaomimimo.com/#/console/api-keys). OpenClaw uses
the `xiaomi` provider with a Xiaomi MiMo API key.

## [​
](#model-overview)
Model overview

- **mimo-v2-flash**: 262144-token context window, Anthropic Messages API compatible.

- Base URL: `https://api.xiaomimimo.com/anthropic`

- Authorization: `Bearer $XIAOMI_API_KEY`

## [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice xiaomi-api-key
# or non-interactive
openclaw onboard --auth-choice xiaomi-api-key --xiaomi-api-key "$XIAOMI_API_KEY"

```

## [​
](#config-snippet)
Config snippet

Copy

```
{
  env: { XIAOMI_API_KEY: "your-key" },
  agents: { defaults: { model: { primary: "xiaomi/mimo-v2-flash" } } },
  models: {
    mode: "merge",
    providers: {
      xiaomi: {
        baseUrl: "https://api.xiaomimimo.com/anthropic",
        api: "anthropic-messages",
        apiKey: "XIAOMI_API_KEY",
        models: [
          {
            id: "mimo-v2-flash",
            name: "Xiaomi MiMo V2 Flash",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 262144,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}

```

## [​
](#notes)
Notes

- Model ref: `xiaomi/mimo-v2-flash`.

- The provider is injected automatically when `XIAOMI_API_KEY` is set (or an auth profile exists).

- See [/concepts/model-providers](/concepts/model-providers) for provider rules.

[vLLM](/providers/vllm)[Z.AI](/providers/zai)
⌘I