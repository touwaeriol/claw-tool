# Zalo Personal Plugin

Source: https://docs.openclaw.ai/plugins/zalouser

---

Extensions

# Zalo Personal Plugin

# [​
](#zalo-personal-plugin)
Zalo Personal (plugin)

Zalo Personal support for OpenClaw via a plugin, using native `zca-js` to automate a normal Zalo user account.

**Warning:** Unofficial automation may lead to account suspension/ban. Use at your own risk.

## [​
](#naming)
Naming

Channel id is `zalouser` to make it explicit this automates a **personal Zalo user account** (unofficial). We keep `zalo` reserved for a potential future official Zalo API integration.

## [​
](#where-it-runs)
Where it runs

This plugin runs **inside the Gateway process**.
If you use a remote Gateway, install/configure it on the **machine running the Gateway**, then restart the Gateway.
No external `zca`/`openzca` CLI binary is required.

## [​
](#install)
Install

### [​
](#option-a-install-from-npm)
Option A: install from npm

Copy

```
openclaw plugins install @openclaw/zalouser

```

Restart the Gateway afterwards.

### [​
](#option-b-install-from-a-local-folder-dev)
Option B: install from a local folder (dev)

Copy

```
openclaw plugins install ./extensions/zalouser
cd ./extensions/zalouser && pnpm install

```

Restart the Gateway afterwards.

## [​
](#config)
Config

Channel config lives under `channels.zalouser` (not `plugins.entries.*`):
Copy

```
{
  channels: {
    zalouser: {
      enabled: true,
      dmPolicy: "pairing",
    },
  },
}

```

## [​
](#cli)
CLI

Copy

```
openclaw channels login --channel zalouser
openclaw channels logout --channel zalouser
openclaw channels status --probe
openclaw message send --channel zalouser --target <threadId> --message "Hello from OpenClaw"
openclaw directory peers list --channel zalouser --query "name"

```

## [​
](#agent-tool)
Agent tool

Tool name: `zalouser`
Actions: `send`, `image`, `link`, `friends`, `groups`, `me`, `status`
Channel message actions also support `react` for message reactions.
[Voice Call Plugin](/plugins/voice-call)[Plugin Manifest](/plugins/manifest)
⌘I