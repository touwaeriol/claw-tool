# IRC

Source: https://docs.openclaw.ai/channels/irc

---

Messaging platforms

# IRC

Connect OpenClaw to IRC channels and direct messages.

Use IRC when you want OpenClaw in classic channels (`#room`) and direct messages.
IRC ships as an extension plugin, but it is configured in the main config under `channels.irc`.

## [​
](#quick-start)
Quick start

- Enable IRC config in `~/.openclaw/openclaw.json`.

- Set at least:

Copy

```
{
  "channels": {
    "irc": {
      "enabled": true,
      "host": "irc.libera.chat",
      "port": 6697,
      "tls": true,
      "nick": "openclaw-bot",
      "channels": ["#openclaw"]
    }
  }
}

```

- Start/restart gateway:

Copy

```
openclaw gateway run

```

## [​
](#security-defaults)
Security defaults

- `channels.irc.dmPolicy` defaults to `"pairing"`.

- `channels.irc.groupPolicy` defaults to `"allowlist"`.

- With `groupPolicy="allowlist"`, set `channels.irc.groups` to define allowed channels.

- Use TLS (`channels.irc.tls=true`) unless you intentionally accept plaintext transport.

## [​
](#access-control)
Access control

There are two separate “gates” for IRC channels:

- **Channel access** (`groupPolicy` + `groups`): whether the bot accepts messages from a channel at all.

- **Sender access** (`groupAllowFrom` / per-channel `groups["#channel"].allowFrom`): who is allowed to trigger the bot inside that channel.

Config keys:

- DM allowlist (DM sender access): `channels.irc.allowFrom`

- Group sender allowlist (channel sender access): `channels.irc.groupAllowFrom`

- Per-channel controls (channel + sender + mention rules): `channels.irc.groups["#channel"]`

- `channels.irc.groupPolicy="open"` allows unconfigured channels (**still mention-gated by default**)

Allowlist entries should use stable sender identities (`nick!user@host`).
Bare nick matching is mutable and only enabled when `channels.irc.dangerouslyAllowNameMatching: true`.

### [​
](#common-gotcha-allowfrom-is-for-dms-not-channels)
Common gotcha: `allowFrom` is for DMs, not channels

If you see logs like:

- `irc: drop group sender alice!ident@host (policy=allowlist)`

…it means the sender wasn’t allowed for **group/channel** messages. Fix it by either:

- setting `channels.irc.groupAllowFrom` (global for all channels), or

- setting per-channel sender allowlists: `channels.irc.groups["#channel"].allowFrom`

Example (allow anyone in `#tuirc-dev` to talk to the bot):
Copy

```
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": { allowFrom: ["*"] },
      },
    },
  },
}

```

## [​
](#reply-triggering-mentions)
Reply triggering (mentions)

Even if a channel is allowed (via `groupPolicy` + `groups`) and the sender is allowed, OpenClaw defaults to **mention-gating** in group contexts.
That means you may see logs like `drop channel … (missing-mention)` unless the message includes a mention pattern that matches the bot.
To make the bot reply in an IRC channel **without needing a mention**, disable mention gating for that channel:
Copy

```
{
  channels: {
    irc: {
      groupPolicy: "allowlist",
      groups: {
        "#tuirc-dev": {
          requireMention: false,
          allowFrom: ["*"],
        },
      },
    },
  },
}

```

Or to allow **all** IRC channels (no per-channel allowlist) and still reply without mentions:
Copy

```
{
  channels: {
    irc: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: false, allowFrom: ["*"] },
      },
    },
  },
}

```

## [​
](#security-note-recommended-for-public-channels)
Security note (recommended for public channels)

If you allow `allowFrom: ["*"]` in a public channel, anyone can prompt the bot.
To reduce risk, restrict tools for that channel.

### [​
](#same-tools-for-everyone-in-the-channel)
Same tools for everyone in the channel

Copy

```
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          tools: {
            deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
          },
        },
      },
    },
  },
}

```

### [​
](#different-tools-per-sender-owner-gets-more-power)
Different tools per sender (owner gets more power)

Use `toolsBySender` to apply a stricter policy to `"*"` and a looser one to your nick:
Copy

```
{
  channels: {
    irc: {
      groups: {
        "#tuirc-dev": {
          allowFrom: ["*"],
          toolsBySender: {
            "*": {
              deny: ["group:runtime", "group:fs", "gateway", "nodes", "cron", "browser"],
            },
            "id:eigen": {
              deny: ["gateway", "nodes", "cron"],
            },
          },
        },
      },
    },
  },
}

```

Notes:

- `toolsBySender` keys should use `id:` for IRC sender identity values:
`id:eigen` or `id:eigen!~eigen@174.127.248.171` for stronger matching.

- Legacy unprefixed keys are still accepted and matched as `id:` only.

- The first matching sender policy wins; `"*"` is the wildcard fallback.

For more on group access vs mention-gating (and how they interact), see: [/channels/groups](/channels/groups).

## [​
](#nickserv)
NickServ

To identify with NickServ after connect:
Copy

```
{
  "channels": {
    "irc": {
      "nickserv": {
        "enabled": true,
        "service": "NickServ",
        "password": "your-nickserv-password"
      }
    }
  }
}

```

Optional one-time registration on connect:
Copy

```
{
  "channels": {
    "irc": {
      "nickserv": {
        "register": true,
        "registerEmail": "bot@example.com"
      }
    }
  }
}

```

Disable `register` after the nick is registered to avoid repeated REGISTER attempts.

## [​
](#environment-variables)
Environment variables

Default account supports:

- `IRC_HOST`

- `IRC_PORT`

- `IRC_TLS`

- `IRC_NICK`

- `IRC_USERNAME`

- `IRC_REALNAME`

- `IRC_PASSWORD`

- `IRC_CHANNELS` (comma-separated)

- `IRC_NICKSERV_PASSWORD`

- `IRC_NICKSERV_REGISTER_EMAIL`

## [​
](#troubleshooting)
Troubleshooting

- If the bot connects but never replies in channels, verify `channels.irc.groups` **and** whether mention-gating is dropping messages (`missing-mention`). If you want it to reply without pings, set `requireMention:false` for the channel.

- If login fails, verify nick availability and server password.

- If TLS fails on a custom network, verify host/port and certificate setup.

[iMessage](/channels/imessage)[LINE](/channels/line)
⌘I