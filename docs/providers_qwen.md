# Qwen

Source: https://docs.openclaw.ai/providers/qwen

---

Providers

# Qwen

# [​
](#qwen)
Qwen

Qwen provides a free-tier OAuth flow for Qwen Coder and Qwen Vision models
(2,000 requests/day, subject to Qwen rate limits).

## [​
](#enable-the-plugin)
Enable the plugin

Copy

```
openclaw plugins enable qwen-portal-auth

```

Restart the Gateway after enabling.

## [​
](#authenticate)
Authenticate

Copy

```
openclaw models auth login --provider qwen-portal --set-default

```

This runs the Qwen device-code OAuth flow and writes a provider entry to your
`models.json` (plus a `qwen` alias for quick switching).

## [​
](#model-ids)
Model IDs

- `qwen-portal/coder-model`

- `qwen-portal/vision-model`

Switch models with:
Copy

```
openclaw models set qwen-portal/coder-model

```

## [​
](#reuse-qwen-code-cli-login)
Reuse Qwen Code CLI login

If you already logged in with the Qwen Code CLI, OpenClaw will sync credentials
from `~/.qwen/oauth_creds.json` when it loads the auth store. You still need a
`models.providers.qwen-portal` entry (use the login command above to create one).

## [​
](#notes)
Notes

- Tokens auto-refresh; re-run the login command if refresh fails or access is revoked.

- Default base URL: `https://portal.qwen.ai/v1` (override with
`models.providers.qwen-portal.baseUrl` if Qwen provides a different endpoint).

- See [Model providers](/concepts/model-providers) for provider-wide rules.

[Qianfan](/providers/qianfan)[Synthetic](/providers/synthetic)
⌘I