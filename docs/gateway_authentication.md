# Authentication

Source: https://docs.openclaw.ai/gateway/authentication

---

Configuration and operations

# Authentication

# [​
](#authentication)
Authentication

OpenClaw supports OAuth and API keys for model providers. For always-on gateway
hosts, API keys are usually the most predictable option. Subscription/OAuth
flows are also supported when they match your provider account model.
See [/concepts/oauth](/concepts/oauth) for the full OAuth flow and storage
layout.
For SecretRef-based auth (`env`/`file`/`exec` providers), see [Secrets Management](/gateway/secrets).
For credential eligibility/reason-code rules used by `models status --probe`, see
[Auth Credential Semantics](/auth-credential-semantics).

## [​
](#recommended-setup-api-key-any-provider)
Recommended setup (API key, any provider)

If you’re running a long-lived gateway, start with an API key for your chosen
provider.
For Anthropic specifically, API key auth is the safe path and is recommended
over subscription setup-token auth.

- Create an API key in your provider console.

- Put it on the **gateway host** (the machine running `openclaw gateway`).

Copy

```
export <PROVIDER>_API_KEY="..."
openclaw models status

```

- If the Gateway runs under systemd/launchd, prefer putting the key in
`~/.openclaw/.env` so the daemon can read it:

Copy

```
cat >> ~/.openclaw/.env <<&#x27;EOF&#x27;
<PROVIDER>_API_KEY=...
EOF

```

Then restart the daemon (or restart your Gateway process) and re-check:
Copy

```
openclaw models status
openclaw doctor

```

If you’d rather not manage env vars yourself, the onboarding wizard can store
API keys for daemon use: `openclaw onboard`.
See [Help](/help) for details on env inheritance (`env.shellEnv`,
`~/.openclaw/.env`, systemd/launchd).

## [​
](#anthropic-setup-token-subscription-auth)
Anthropic: setup-token (subscription auth)

If you’re using a Claude subscription, the setup-token flow is supported. Run
it on the **gateway host**:
Copy

```
claude setup-token

```

Then paste it into OpenClaw:
Copy

```
openclaw models auth setup-token --provider anthropic

```

If the token was created on another machine, paste it manually:
Copy

```
openclaw models auth paste-token --provider anthropic

```

If you see an Anthropic error like:
Copy

```
This credential is only authorized for use with Claude Code and cannot be used for other API requests.

```

…use an Anthropic API key instead.

Anthropic setup-token support is technical compatibility only. Anthropic has blocked
some subscription usage outside Claude Code in the past. Use it only if you decide
the policy risk is acceptable, and verify Anthropic’s current terms yourself.

Manual token entry (any provider; writes `auth-profiles.json` + updates config):
Copy

```
openclaw models auth paste-token --provider anthropic
openclaw models auth paste-token --provider openrouter

```

Auth profile refs are also supported for static credentials:

- `api_key` credentials can use `keyRef: { source, provider, id }`

- `token` credentials can use `tokenRef: { source, provider, id }`

Automation-friendly check (exit `1` when expired/missing, `2` when expiring):
Copy

```
openclaw models status --check

```

Optional ops scripts (systemd/Termux) are documented here:
[/automation/auth-monitoring](/automation/auth-monitoring)

`claude setup-token` requires an interactive TTY.

## [​
](#checking-model-auth-status)
Checking model auth status

Copy

```
openclaw models status
openclaw doctor

```

## [​
](#api-key-rotation-behavior-gateway)
API key rotation behavior (gateway)

Some providers support retrying a request with alternative keys when an API call
hits a provider rate limit.

- Priority order:

`OPENCLAW_LIVE_<PROVIDER>_KEY` (single override)

- `<PROVIDER>_API_KEYS`

- `<PROVIDER>_API_KEY`

- `<PROVIDER>_API_KEY_*`

- Google providers also include `GOOGLE_API_KEY` as an additional fallback.

- The same key list is deduplicated before use.

- OpenClaw retries with the next key only for rate-limit errors (for example
`429`, `rate_limit`, `quota`, `resource exhausted`).

- Non-rate-limit errors are not retried with alternate keys.

- If all keys fail, the final error from the last attempt is returned.

## [​
](#controlling-which-credential-is-used)
Controlling which credential is used

### [​
](#per-session-chat-command)
Per-session (chat command)

Use `/model <alias-or-id>@<profileId>` to pin a specific provider credential for the current session (example profile ids: `anthropic:default`, `anthropic:work`).
Use `/model` (or `/model list`) for a compact picker; use `/model status` for the full view (candidates + next auth profile, plus provider endpoint details when configured).

### [​
](#per-agent-cli-override)
Per-agent (CLI override)

Set an explicit auth profile order override for an agent (stored in that agent’s `auth-profiles.json`):
Copy

```
openclaw models auth order get --provider anthropic
openclaw models auth order set --provider anthropic anthropic:default
openclaw models auth order clear --provider anthropic

```

Use `--agent <id>` to target a specific agent; omit it to use the configured default agent.

## [​
](#troubleshooting)
Troubleshooting

### [​
](#“no-credentials-found”)
“No credentials found”

If the Anthropic token profile is missing, run `claude setup-token` on the
**gateway host**, then re-check:
Copy

```
openclaw models status

```

### [​
](#token-expiring/expired)
Token expiring/expired

Run `openclaw models status` to confirm which profile is expiring. If the profile
is missing, rerun `claude setup-token` and paste the token again.

## [​
](#requirements)
Requirements

- Anthropic subscription account (for `claude setup-token`)

- Claude Code CLI installed (`claude` command available)

[Configuration Examples](/gateway/configuration-examples)[Auth credential semantics](/auth-credential-semantics)
⌘I