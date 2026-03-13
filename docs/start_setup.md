# Setup

Source: https://docs.openclaw.ai/start/setup

---

Developer setup

# Setup

# [​
](#setup)
Setup

If you are setting up for the first time, start with [Getting Started](/start/getting-started).
For wizard details, see [Onboarding Wizard](/start/wizard).

Last updated: 2026-01-01

## [​
](#tldr)
TL;DR

- **Tailoring lives outside the repo:** `~/.openclaw/workspace` (workspace) + `~/.openclaw/openclaw.json` (config).

- **Stable workflow:** install the macOS app; let it run the bundled Gateway.

- **Bleeding edge workflow:** run the Gateway yourself via `pnpm gateway:watch`, then let the macOS app attach in Local mode.

## [​
](#prereqs-from-source)
Prereqs (from source)

- Node `>=22`

- `pnpm`

- Docker (optional; only for containerized setup/e2e — see [Docker](/install/docker))

## [​
](#tailoring-strategy-so-updates-don’t-hurt)
Tailoring strategy (so updates don’t hurt)

If you want “100% tailored to me” *and* easy updates, keep your customization in:

- **Config:** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)

- **Workspace:** `~/.openclaw/workspace` (skills, prompts, memories; make it a private git repo)

Bootstrap once:
Copy

```
openclaw setup

```

From inside this repo, use the local CLI entry:
Copy

```
openclaw setup

```

If you don’t have a global install yet, run it via `pnpm openclaw setup`.

## [​
](#run-the-gateway-from-this-repo)
Run the Gateway from this repo

After `pnpm build`, you can run the packaged CLI directly:
Copy

```
node openclaw.mjs gateway --port 18789 --verbose

```

## [​
](#stable-workflow-macos-app-first)
Stable workflow (macOS app first)

- Install + launch **OpenClaw.app** (menu bar).

- Complete the onboarding/permissions checklist (TCC prompts).

- Ensure Gateway is **Local** and running (the app manages it).

- Link surfaces (example: WhatsApp):

Copy

```
openclaw channels login

```

- Sanity check:

Copy

```
openclaw health

```

If onboarding is not available in your build:

- Run `openclaw setup`, then `openclaw channels login`, then start the Gateway manually (`openclaw gateway`).

## [​
](#bleeding-edge-workflow-gateway-in-a-terminal)
Bleeding edge workflow (Gateway in a terminal)

Goal: work on the TypeScript Gateway, get hot reload, keep the macOS app UI attached.

### [​
](#0-optional-run-the-macos-app-from-source-too)
0) (Optional) Run the macOS app from source too

If you also want the macOS app on the bleeding edge:
Copy

```
./scripts/restart-mac.sh

```

### [​
](#1-start-the-dev-gateway)
1) Start the dev Gateway

Copy

```
pnpm install
pnpm gateway:watch

```

`gateway:watch` runs the gateway in watch mode and reloads on TypeScript changes.

### [​
](#2-point-the-macos-app-at-your-running-gateway)
2) Point the macOS app at your running Gateway

In **OpenClaw.app**:

- Connection Mode: **Local**
The app will attach to the running gateway on the configured port.

### [​
](#3-verify)
3) Verify

- In-app Gateway status should read **“Using existing gateway …”**

- Or via CLI:

Copy

```
openclaw health

```

### [​
](#common-footguns)
Common footguns

- **Wrong port:** Gateway WS defaults to `ws://127.0.0.1:18789`; keep app + CLI on the same port.

- **Where state lives:**

Credentials: `~/.openclaw/credentials/`

- Sessions: `~/.openclaw/agents/<agentId>/sessions/`

- Logs: `/tmp/openclaw/`

## [​
](#credential-storage-map)
Credential storage map

Use this when debugging auth or deciding what to back up:

- **WhatsApp**: `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`

- **Telegram bot token**: config/env or `channels.telegram.tokenFile`

- **Discord bot token**: config/env or SecretRef (env/file/exec providers)

- **Slack tokens**: config/env (`channels.slack.*`)

- **Pairing allowlists**:

`~/.openclaw/credentials/<channel>-allowFrom.json` (default account)

- `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (non-default accounts)

- **Model auth profiles**: `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`

- **File-backed secrets payload (optional)**: `~/.openclaw/secrets.json`

- **Legacy OAuth import**: `~/.openclaw/credentials/oauth.json`
More detail: [Security](/gateway/security#credential-storage-map).

## [​
](#updating-without-wrecking-your-setup)
Updating (without wrecking your setup)

- Keep `~/.openclaw/workspace` and `~/.openclaw/` as “your stuff”; don’t put personal prompts/config into the `openclaw` repo.

- Updating source: `git pull` + `pnpm install` (when lockfile changed) + keep using `pnpm gateway:watch`.

## [​
](#linux-systemd-user-service)
Linux (systemd user service)

Linux installs use a systemd **user** service. By default, systemd stops user
services on logout/idle, which kills the Gateway. Onboarding attempts to enable
lingering for you (may prompt for sudo). If it’s still off, run:
Copy

```
sudo loginctl enable-linger $USER

```

For always-on or multi-user servers, consider a **system** service instead of a
user service (no lingering needed). See [Gateway runbook](/gateway) for the systemd notes.

## [​
](#related-docs)
Related docs

- [Gateway runbook](/gateway) (flags, supervision, ports)

- [Gateway configuration](/gateway/configuration) (config schema + examples)

- [Discord](/channels/discord) and [Telegram](/channels/telegram) (reply tags + replyToMode settings)

- [OpenClaw assistant setup](/start/openclaw)

- [macOS app](/platforms/macos) (gateway lifecycle)

[Session Management Deep Dive](/reference/session-management-compaction)[Pi Development Workflow](/pi-dev)
⌘I