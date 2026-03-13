# Channel Routing

Source: https://docs.openclaw.ai/channels/channel-routing

---

Configuration

# Channel Routing

# [​
](#channels-&-routing)
Channels & routing

OpenClaw routes replies **back to the channel where a message came from**. The
model does not choose a channel; routing is deterministic and controlled by the
host configuration.

## [​
](#key-terms)
Key terms

- **Channel**: `whatsapp`, `telegram`, `discord`, `slack`, `signal`, `imessage`, `webchat`.

- **AccountId**: per‑channel account instance (when supported).

- Optional channel default account: `channels.<channel>.defaultAccount` chooses
which account is used when an outbound path does not specify `accountId`.

In multi-account setups, set an explicit default (`defaultAccount` or `accounts.default`) when two or more accounts are configured. Without it, fallback routing may pick the first normalized account ID.

- **AgentId**: an isolated workspace + session store (“brain”).

- **SessionKey**: the bucket key used to store context and control concurrency.

## [​
](#session-key-shapes-examples)
Session key shapes (examples)

Direct messages collapse to the agent’s **main** session:

- `agent:<agentId>:<mainKey>` (default: `agent:main:main`)

Groups and channels remain isolated per channel:

- Groups: `agent:<agentId>:<channel>:group:<id>`

- Channels/rooms: `agent:<agentId>:<channel>:channel:<id>`

Threads:

- Slack/Discord threads append `:thread:<threadId>` to the base key.

- Telegram forum topics embed `:topic:<topicId>` in the group key.

Examples:

- `agent:main:telegram:group:-1001234567890:topic:42`

- `agent:main:discord:channel:123456:thread:987654`

## [​
](#main-dm-route-pinning)
Main DM route pinning

When `session.dmScope` is `main`, direct messages may share one main session.
To prevent the session’s `lastRoute` from being overwritten by non-owner DMs,
OpenClaw infers a pinned owner from `allowFrom` when all of these are true:

- `allowFrom` has exactly one non-wildcard entry.

- The entry can be normalized to a concrete sender ID for that channel.

- The inbound DM sender does not match that pinned owner.

In that mismatch case, OpenClaw still records inbound session metadata, but it
skips updating the main session `lastRoute`.

## [​
](#routing-rules-how-an-agent-is-chosen)
Routing rules (how an agent is chosen)

Routing picks **one agent** for each inbound message:

- **Exact peer match** (`bindings` with `peer.kind` + `peer.id`).

- **Parent peer match** (thread inheritance).

- **Guild + roles match** (Discord) via `guildId` + `roles`.

- **Guild match** (Discord) via `guildId`.

- **Team match** (Slack) via `teamId`.

- **Account match** (`accountId` on the channel).

- **Channel match** (any account on that channel, `accountId: "*"`).

- **Default agent** (`agents.list[].default`, else first list entry, fallback to `main`).

When a binding includes multiple match fields (`peer`, `guildId`, `teamId`, `roles`), **all provided fields must match** for that binding to apply.
The matched agent determines which workspace and session store are used.

## [​
](#broadcast-groups-run-multiple-agents)
Broadcast groups (run multiple agents)

Broadcast groups let you run **multiple agents** for the same peer **when OpenClaw would normally reply** (for example: in WhatsApp groups, after mention/activation gating).
Config:
Copy

```
{
  broadcast: {
    strategy: "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"],
    "+15555550123": ["support", "logger"],
  },
}

```

See: [Broadcast Groups](/channels/broadcast-groups).

## [​
](#config-overview)
Config overview

- `agents.list`: named agent definitions (workspace, model, etc.).

- `bindings`: map inbound channels/accounts/peers to agents.

Example:
Copy

```
{
  agents: {
    list: [{ id: "support", name: "Support", workspace: "~/.openclaw/workspace-support" }],
  },
  bindings: [
    { match: { channel: "slack", teamId: "T123" }, agentId: "support" },
    { match: { channel: "telegram", peer: { kind: "group", id: "-100123" } }, agentId: "support" },
  ],
}

```

## [​
](#session-storage)
Session storage

Session stores live under the state directory (default `~/.openclaw`):

- `~/.openclaw/agents/<agentId>/sessions/sessions.json`

- JSONL transcripts live alongside the store

You can override the store path via `session.store` and `{agentId}` templating.

## [​
](#webchat-behavior)
WebChat behavior

WebChat attaches to the **selected agent** and defaults to the agent’s main
session. Because of this, WebChat lets you see cross‑channel context for that
agent in one place.

## [​
](#reply-context)
Reply context

Inbound replies include:

- `ReplyToId`, `ReplyToBody`, and `ReplyToSender` when available.

- Quoted context is appended to `Body` as a `[Replying to ...]` block.

This is consistent across channels.
[Broadcast Groups](/channels/broadcast-groups)[Channel Location Parsing](/channels/location)
⌘I