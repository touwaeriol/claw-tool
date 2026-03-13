# Tlon

Source: https://docs.openclaw.ai/channels/tlon

---

Messaging platforms

# Tlon

# [​
](#tlon-plugin)
Tlon (plugin)

Tlon is a decentralized messenger built on Urbit. OpenClaw connects to your Urbit ship and can
respond to DMs and group chat messages. Group replies require an @ mention by default and can
be further restricted via allowlists.
Status: supported via plugin. DMs, group mentions, thread replies, rich text formatting, and
image uploads are supported. Reactions and polls are not yet supported.

## [​
](#plugin-required)
Plugin required

Tlon ships as a plugin and is not bundled with the core install.
Install via CLI (npm registry):
Copy

```
openclaw plugins install @openclaw/tlon

```

Local checkout (when running from a git repo):
Copy

```
openclaw plugins install ./extensions/tlon

```

Details: [Plugins](/tools/plugin)

## [​
](#setup)
Setup

- Install the Tlon plugin.

- Gather your ship URL and login code.

- Configure `channels.tlon`.

- Restart the gateway.

- DM the bot or mention it in a group channel.

Minimal config (single account):
Copy

```
{
  channels: {
    tlon: {
      enabled: true,
      ship: "~sampel-palnet",
      url: "https://your-ship-host",
      code: "lidlut-tabwed-pillex-ridrup",
      ownerShip: "~your-main-ship", // recommended: your ship, always allowed
    },
  },
}

```

## [​
](#private/lan-ships)
Private/LAN ships

By default, OpenClaw blocks private/internal hostnames and IP ranges for SSRF protection.
If your ship is running on a private network (localhost, LAN IP, or internal hostname),
you must explicitly opt in:
Copy

```
{
  channels: {
    tlon: {
      url: "http://localhost:8080",
      allowPrivateNetwork: true,
    },
  },
}

```

This applies to URLs like:

- `http://localhost:8080`

- `http://192.168.x.x:8080`

- `http://my-ship.local:8080`

⚠️ Only enable this if you trust your local network. This setting disables SSRF protections
for requests to your ship URL.

## [​
](#group-channels)
Group channels

Auto-discovery is enabled by default. You can also pin channels manually:
Copy

```
{
  channels: {
    tlon: {
      groupChannels: ["chat/~host-ship/general", "chat/~host-ship/support"],
    },
  },
}

```

Disable auto-discovery:
Copy

```
{
  channels: {
    tlon: {
      autoDiscoverChannels: false,
    },
  },
}

```

## [​
](#access-control)
Access control

DM allowlist (empty = no DMs allowed, use `ownerShip` for approval flow):
Copy

```
{
  channels: {
    tlon: {
      dmAllowlist: ["~zod", "~nec"],
    },
  },
}

```

Group authorization (restricted by default):
Copy

```
{
  channels: {
    tlon: {
      defaultAuthorizedShips: ["~zod"],
      authorization: {
        channelRules: {
          "chat/~host-ship/general": {
            mode: "restricted",
            allowedShips: ["~zod", "~nec"],
          },
          "chat/~host-ship/announcements": {
            mode: "open",
          },
        },
      },
    },
  },
}

```

## [​
](#owner-and-approval-system)
Owner and approval system

Set an owner ship to receive approval requests when unauthorized users try to interact:
Copy

```
{
  channels: {
    tlon: {
      ownerShip: "~your-main-ship",
    },
  },
}

```

The owner ship is **automatically authorized everywhere** — DM invites are auto-accepted and
channel messages are always allowed. You don’t need to add the owner to `dmAllowlist` or
`defaultAuthorizedShips`.
When set, the owner receives DM notifications for:

- DM requests from ships not in the allowlist

- Mentions in channels without authorization

- Group invite requests

## [​
](#auto-accept-settings)
Auto-accept settings

Auto-accept DM invites (for ships in dmAllowlist):
Copy

```
{
  channels: {
    tlon: {
      autoAcceptDmInvites: true,
    },
  },
}

```

Auto-accept group invites:
Copy

```
{
  channels: {
    tlon: {
      autoAcceptGroupInvites: true,
    },
  },
}

```

## [​
](#delivery-targets-cli/cron)
Delivery targets (CLI/cron)

Use these with `openclaw message send` or cron delivery:

- DM: `~sampel-palnet` or `dm/~sampel-palnet`

- Group: `chat/~host-ship/channel` or `group:~host-ship/channel`

## [​
](#bundled-skill)
Bundled skill

The Tlon plugin includes a bundled skill ([`@tloncorp/tlon-skill`](https://github.com/tloncorp/tlon-skill))
that provides CLI access to Tlon operations:

- **Contacts**: get/update profiles, list contacts

- **Channels**: list, create, post messages, fetch history

- **Groups**: list, create, manage members

- **DMs**: send messages, react to messages

- **Reactions**: add/remove emoji reactions to posts and DMs

- **Settings**: manage plugin permissions via slash commands

The skill is automatically available when the plugin is installed.

## [​
](#capabilities)
Capabilities

FeatureStatusDirect messages✅ SupportedGroups/channels✅ Supported (mention-gated by default)Threads✅ Supported (auto-replies in thread)Rich text✅ Markdown converted to Tlon formatImages✅ Uploaded to Tlon storageReactions✅ Via [bundled skill](#bundled-skill)Polls❌ Not yet supportedNative commands✅ Supported (owner-only by default)

## [​
](#troubleshooting)
Troubleshooting

Run this ladder first:
Copy

```
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor

```

Common failures:

- **DMs ignored**: sender not in `dmAllowlist` and no `ownerShip` configured for approval flow.

- **Group messages ignored**: channel not discovered or sender not authorized.

- **Connection errors**: check ship URL is reachable; enable `allowPrivateNetwork` for local ships.

- **Auth errors**: verify login code is current (codes rotate).

## [​
](#configuration-reference)
Configuration reference

Full configuration: [Configuration](/gateway/configuration)
Provider options:

- `channels.tlon.enabled`: enable/disable channel startup.

- `channels.tlon.ship`: bot’s Urbit ship name (e.g. `~sampel-palnet`).

- `channels.tlon.url`: ship URL (e.g. `https://sampel-palnet.tlon.network`).

- `channels.tlon.code`: ship login code.

- `channels.tlon.allowPrivateNetwork`: allow localhost/LAN URLs (SSRF bypass).

- `channels.tlon.ownerShip`: owner ship for approval system (always authorized).

- `channels.tlon.dmAllowlist`: ships allowed to DM (empty = none).

- `channels.tlon.autoAcceptDmInvites`: auto-accept DMs from allowlisted ships.

- `channels.tlon.autoAcceptGroupInvites`: auto-accept all group invites.

- `channels.tlon.autoDiscoverChannels`: auto-discover group channels (default: true).

- `channels.tlon.groupChannels`: manually pinned channel nests.

- `channels.tlon.defaultAuthorizedShips`: ships authorized for all channels.

- `channels.tlon.authorization.channelRules`: per-channel auth rules.

- `channels.tlon.showModelSignature`: append model name to messages.

## [​
](#notes)
Notes

- Group replies require a mention (e.g. `~your-bot-ship`) to respond.

- Thread replies: if the inbound message is in a thread, OpenClaw replies in-thread.

- Rich text: Markdown formatting (bold, italic, code, headers, lists) is converted to Tlon’s native format.

- Images: URLs are uploaded to Tlon storage and embedded as image blocks.

[Telegram](/channels/telegram)[Twitch](/channels/twitch)
⌘I