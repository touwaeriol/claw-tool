# Peekaboo Bridge

Source: https://docs.openclaw.ai/platforms/mac/peekaboo

---

macOS companion app

# Peekaboo Bridge

# [​
](#peekaboo-bridge-macos-ui-automation)
Peekaboo Bridge (macOS UI automation)

OpenClaw can host **PeekabooBridge** as a local, permission‑aware UI automation
broker. This lets the `peekaboo` CLI drive UI automation while reusing the
macOS app’s TCC permissions.

## [​
](#what-this-is-and-isn’t)
What this is (and isn’t)

- **Host**: OpenClaw.app can act as a PeekabooBridge host.

- **Client**: use the `peekaboo` CLI (no separate `openclaw ui ...` surface).

- **UI**: visual overlays stay in Peekaboo.app; OpenClaw is a thin broker host.

## [​
](#enable-the-bridge)
Enable the bridge

In the macOS app:

- Settings → **Enable Peekaboo Bridge**

When enabled, OpenClaw starts a local UNIX socket server. If disabled, the host
is stopped and `peekaboo` will fall back to other available hosts.

## [​
](#client-discovery-order)
Client discovery order

Peekaboo clients typically try hosts in this order:

- Peekaboo.app (full UX)

- Claude.app (if installed)

- OpenClaw.app (thin broker)

Use `peekaboo bridge status --verbose` to see which host is active and which
socket path is in use. You can override with:
Copy

```
export PEEKABOO_BRIDGE_SOCKET=/path/to/bridge.sock

```

## [​
](#security-&-permissions)
Security & permissions

- The bridge validates **caller code signatures**; an allowlist of TeamIDs is
enforced (Peekaboo host TeamID + OpenClaw app TeamID).

- Requests time out after ~10 seconds.

- If required permissions are missing, the bridge returns a clear error message
rather than launching System Settings.

## [​
](#snapshot-behavior-automation)
Snapshot behavior (automation)

Snapshots are stored in memory and expire automatically after a short window.
If you need longer retention, re‑capture from the client.

## [​
](#troubleshooting)
Troubleshooting

- If `peekaboo` reports “bridge client is not authorized”, ensure the client is
properly signed or run the host with `PEEKABOO_ALLOW_UNSIGNED_SOCKET_CLIENTS=1`
in **debug** mode only.

- If no hosts are found, open one of the host apps (Peekaboo.app or OpenClaw.app)
and confirm permissions are granted.

[Skills](/platforms/mac/skills)
⌘I