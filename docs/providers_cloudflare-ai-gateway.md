# Cloudflare AI Gateway

Source: https://docs.openclaw.ai/providers/cloudflare-ai-gateway

---

Providers

# Cloudflare AI Gateway

# [​
](#cloudflare-ai-gateway)
Cloudflare AI Gateway

Cloudflare AI Gateway sits in front of provider APIs and lets you add analytics, caching, and controls. For Anthropic, OpenClaw uses the Anthropic Messages API through your Gateway endpoint.

- Provider: `cloudflare-ai-gateway`

- Base URL: `https://gateway.ai.cloudflare.com/v1/<account_id>/<gateway_id>/anthropic`

- Default model: `cloudflare-ai-gateway/claude-sonnet-4-5`

- API key: `CLOUDFLARE_AI_GATEWAY_API_KEY` (your provider API key for requests through the Gateway)

For Anthropic models, use your Anthropic API key.

## [​
](#quick-start)
Quick start

- Set the provider API key and Gateway details:

Copy

```
openclaw onboard --auth-choice cloudflare-ai-gateway-api-key

```

- Set a default model:

Copy

```
{
  agents: {
    defaults: {
      model: { primary: "cloudflare-ai-gateway/claude-sonnet-4-5" },
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
  --auth-choice cloudflare-ai-gateway-api-key \
  --cloudflare-ai-gateway-account-id "your-account-id" \
  --cloudflare-ai-gateway-gateway-id "your-gateway-id" \
  --cloudflare-ai-gateway-api-key "$CLOUDFLARE_AI_GATEWAY_API_KEY"

```

## [​
](#authenticated-gateways)
Authenticated gateways

If you enabled Gateway authentication in Cloudflare, add the `cf-aig-authorization` header (this is in addition to your provider API key).
Copy

```
{
  models: {
    providers: {
      "cloudflare-ai-gateway": {
        headers: {
          "cf-aig-authorization": "Bearer <cloudflare-ai-gateway-token>",
        },
      },
    },
  },
}

```

## [​
](#environment-note)
Environment note

If the Gateway runs as a daemon (launchd/systemd), make sure `CLOUDFLARE_AI_GATEWAY_API_KEY` is available to that process (for example, in `~/.openclaw/.env` or via `env.shellEnv`).
[Amazon Bedrock](/providers/bedrock)[Claude Max API Proxy](/providers/claude-max-api-proxy)
⌘I