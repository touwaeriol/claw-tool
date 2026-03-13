# Vercel AI Gateway

Source: https://docs.openclaw.ai/providers/vercel-ai-gateway

---

Providers

# Vercel AI Gateway

# [​
](#vercel-ai-gateway)
Vercel AI Gateway

The [Vercel AI Gateway](https://vercel.com/ai-gateway) provides a unified API to access hundreds of models through a single endpoint.

- Provider: `vercel-ai-gateway`

- Auth: `AI_GATEWAY_API_KEY`

- API: Anthropic Messages compatible

- OpenClaw auto-discovers the Gateway `/v1/models` catalog, so `/models vercel-ai-gateway`
includes current model refs such as `vercel-ai-gateway/openai/gpt-5.4`.

## [​
](#quick-start)
Quick start

- Set the API key (recommended: store it for the Gateway):

Copy

```
openclaw onboard --auth-choice ai-gateway-api-key

```

- Set a default model:

Copy

```
{
  agents: {
    defaults: {
      model: { primary: "vercel-ai-gateway/anthropic/claude-opus-4.6" },
    },
  },
}

```

## [​
](#non-interactive-example)
Non-interactive example

Copy

```
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice ai-gateway-api-key \
  --ai-gateway-api-key "$AI_GATEWAY_API_KEY"

```

## [​
](#environment-note)
Environment note

If the Gateway runs as a daemon (launchd/systemd), make sure `AI_GATEWAY_API_KEY`
is available to that process (for example, in `~/.openclaw/.env` or via
`env.shellEnv`).

## [​
](#model-id-shorthand)
Model ID shorthand

OpenClaw accepts Vercel Claude shorthand model refs and normalizes them at
runtime:

- `vercel-ai-gateway/claude-opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4.6`

- `vercel-ai-gateway/opus-4.6` -> `vercel-ai-gateway/anthropic/claude-opus-4-6`

[Together](/providers/together)[Venice AI](/providers/venice)
⌘I