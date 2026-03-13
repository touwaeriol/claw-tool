# OAuth

Source: https://docs.openclaw.ai/concepts/oauth

---

Fundamentals

# OAuth

# [​
](#oauth)
OAuth

OpenClaw supports “subscription auth” via OAuth for providers that offer it (notably **OpenAI Codex (ChatGPT OAuth)**). For Anthropic subscriptions, use the **setup-token** flow. Anthropic subscription use outside Claude Code has been restricted for some users in the past, so treat it as a user-choice risk and verify current Anthropic policy yourself. OpenAI Codex OAuth is explicitly supported for use in external tools like OpenClaw. This page explains:
For Anthropic in production, API key auth is the safer recommended path over subscription setup-token auth.

- how the OAuth **token exchange** works (PKCE)

- where tokens are **stored** (and why)

- how to handle **multiple accounts** (profiles + per-session overrides)

OpenClaw also supports **provider plugins** that ship their own OAuth or API‑key
flows. Run them via:
Copy

```
openclaw models auth login --provider <id>

```

## [​
](#the-token-sink-why-it-exists)
The token sink (why it exists)

OAuth providers commonly mint a **new refresh token** during login/refresh flows. Some providers (or OAuth clients) can invalidate older refresh tokens when a new one is issued for the same user/app.
Practical symptom:

- you log in via OpenClaw *and* via Claude Code / Codex CLI → one of them randomly gets “logged out” later

To reduce that, OpenClaw treats `auth-profiles.json` as a **token sink**:

- the runtime reads credentials from **one place**

- we can keep multiple profiles and route them deterministically

## [​
](#storage-where-tokens-live)
Storage (where tokens live)

Secrets are stored **per-agent**:

- Auth profiles (OAuth + API keys + optional value-level refs): `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

- Legacy compatibility file: `~/.openclaw/agents/<agentId>/agent/auth.json`
(static `api_key` entries are scrubbed when discovered)

Legacy import-only file (still supported, but not the main store):

- `~/.openclaw/credentials/oauth.json` (imported into `auth-profiles.json` on first use)

All of the above also respect `$OPENCLAW_STATE_DIR` (state dir override). Full reference: [/gateway/configuration](/gateway/configuration#auth-storage-oauth--api-keys)
For static secret refs and runtime snapshot activation behavior, see [Secrets Management](/gateway/secrets).

## [​
](#anthropic-setup-token-subscription-auth)
Anthropic setup-token (subscription auth)

Anthropic setup-token support is technical compatibility, not a policy guarantee.
Anthropic has blocked some subscription usage outside Claude Code in the past.
Decide for yourself whether to use subscription auth, and verify Anthropic’s current terms.

Run `claude setup-token` on any machine, then paste it into OpenClaw:
Copy

```
openclaw models auth setup-token --provider anthropic

```

If you generated the token elsewhere, paste it manually:
Copy

```
openclaw models auth paste-token --provider anthropic

```

Verify:
Copy

```
openclaw models status

```

## [​
](#oauth-exchange-how-login-works)
OAuth exchange (how login works)

OpenClaw’s interactive login flows are implemented in `@mariozechner/pi-ai` and wired into the wizards/commands.

### [​
](#anthropic-setup-token)
Anthropic setup-token

Flow shape:

- run `claude setup-token`

- paste the token into OpenClaw

- store as a token auth profile (no refresh)

The wizard path is `openclaw onboard` → auth choice `setup-token` (Anthropic).

### [​
](#openai-codex-chatgpt-oauth)
OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth is explicitly supported for use outside the Codex CLI, including OpenClaw workflows.
Flow shape (PKCE):

- generate PKCE verifier/challenge + random `state`

- open `https://auth.openai.com/oauth/authorize?...`

- try to capture callback on `http://127.0.0.1:1455/auth/callback`

- if callback can’t bind (or you’re remote/headless), paste the redirect URL/code

- exchange at `https://auth.openai.com/oauth/token`

- extract `accountId` from the access token and store `{ access, refresh, expires, accountId }`

Wizard path is `openclaw onboard` → auth choice `openai-codex`.

## [​
](#refresh-+-expiry)
Refresh + expiry

Profiles store an `expires` timestamp.
At runtime:

- if `expires` is in the future → use the stored access token

- if expired → refresh (under a file lock) and overwrite the stored credentials

The refresh flow is automatic; you generally don’t need to manage tokens manually.

## [​
](#multiple-accounts-profiles-+-routing)
Multiple accounts (profiles) + routing

Two patterns:

### [​
](#1-preferred-separate-agents)
1) Preferred: separate agents

If you want “personal” and “work” to never interact, use isolated agents (separate sessions + credentials + workspace):
Copy

```
openclaw agents add work
openclaw agents add personal

```

Then configure auth per-agent (wizard) and route chats to the right agent.

### [​
](#2-advanced-multiple-profiles-in-one-agent)
2) Advanced: multiple profiles in one agent

`auth-profiles.json` supports multiple profile IDs for the same provider.
Pick which profile is used:

- globally via config ordering (`auth.order`)

- per-session via `/model ...@<profileId>`

Example (session override):

- `/model Opus@anthropic:work`

How to see what profile IDs exist:

- `openclaw channels list --json` (shows `auth[]`)

Related docs:

- [/concepts/model-failover](/concepts/model-failover) (rotation + cooldown rules)

- [/tools/slash-commands](/tools/slash-commands) (command surface)

[Agent Workspace](/concepts/agent-workspace)[Bootstrapping](/start/bootstrapping)
⌘I