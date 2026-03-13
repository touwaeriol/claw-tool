# Twitch

Source: https://docs.openclaw.ai/channels/twitch

---

Messaging platforms

# Twitch

# [​
](#twitch-plugin)
Twitch (plugin)

Twitch chat support via IRC connection. OpenClaw connects as a Twitch user (bot account) to receive and send messages in channels.

## [​
](#plugin-required)
Plugin required

Twitch ships as a plugin and is not bundled with the core install.
Install via CLI (npm registry):
Copy

```
openclaw plugins install @openclaw/twitch

```

Local checkout (when running from a git repo):
Copy

```
openclaw plugins install ./extensions/twitch

```

Details: [Plugins](/tools/plugin)

## [​
](#quick-setup-beginner)
Quick setup (beginner)

- Create a dedicated Twitch account for the bot (or use an existing account).

- Generate credentials: [Twitch Token Generator](https://twitchtokengenerator.com/)

Select **Bot Token**

- Verify scopes `chat:read` and `chat:write` are selected

- Copy the **Client ID** and **Access Token**

- Find your Twitch user ID: [https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/)

- Configure the token:

Env: `OPENCLAW_TWITCH_ACCESS_TOKEN=...` (default account only)

- Or config: `channels.twitch.accessToken`

- If both are set, config takes precedence (env fallback is default-account only).

- Start the gateway.

**⚠️ Important:** Add access control (`allowFrom` or `allowedRoles`) to prevent unauthorized users from triggering the bot. `requireMention` defaults to `true`.
Minimal config:
Copy

```
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw", // Bot&#x27;s Twitch account
      accessToken: "oauth:abc123...", // OAuth Access Token (or use OPENCLAW_TWITCH_ACCESS_TOKEN env var)
      clientId: "xyz789...", // Client ID from Token Generator
      channel: "vevisk", // Which Twitch channel&#x27;s chat to join (required)
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only - get it from https://www.streamweasels.com/tools/convert-twitch-username-to-user-id/
    },
  },
}

```

## [​
](#what-it-is)
What it is

- A Twitch channel owned by the Gateway.

- Deterministic routing: replies always go back to Twitch.

- Each account maps to an isolated session key `agent:<agentId>:twitch:<accountName>`.

- `username` is the bot’s account (who authenticates), `channel` is which chat room to join.

## [​
](#setup-detailed)
Setup (detailed)

### [​
](#generate-credentials)
Generate credentials

Use [Twitch Token Generator](https://twitchtokengenerator.com/):

- Select **Bot Token**

- Verify scopes `chat:read` and `chat:write` are selected

- Copy the **Client ID** and **Access Token**

No manual app registration needed. Tokens expire after several hours.

### [​
](#configure-the-bot)
Configure the bot

**Env var (default account only):**
Copy

```
OPENCLAW_TWITCH_ACCESS_TOKEN=oauth:abc123...

```

**Or config:**
Copy

```
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
    },
  },
}

```

If both env and config are set, config takes precedence.

### [​
](#access-control-recommended)
Access control (recommended)

Copy

```
{
  channels: {
    twitch: {
      allowFrom: ["123456789"], // (recommended) Your Twitch user ID only
    },
  },
}

```

Prefer `allowFrom` for a hard allowlist. Use `allowedRoles` instead if you want role-based access.
**Available roles:** `"moderator"`, `"owner"`, `"vip"`, `"subscriber"`, `"all"`.
**Why user IDs?** Usernames can change, allowing impersonation. User IDs are permanent.
Find your Twitch user ID: [https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/](https://www.streamweasels.com/tools/convert-twitch-username-%20to-user-id/) (Convert your Twitch username to ID)

## [​
](#token-refresh-optional)
Token refresh (optional)

Tokens from [Twitch Token Generator](https://twitchtokengenerator.com/) cannot be automatically refreshed - regenerate when expired.
For automatic token refresh, create your own Twitch application at [Twitch Developer Console](https://dev.twitch.tv/console) and add to config:
Copy

```
{
  channels: {
    twitch: {
      clientSecret: "your_client_secret",
      refreshToken: "your_refresh_token",
    },
  },
}

```

The bot automatically refreshes tokens before expiration and logs refresh events.

## [​
](#multi-account-support)
Multi-account support

Use `channels.twitch.accounts` with per-account tokens. See [`gateway/configuration`](/gateway/configuration) for the shared pattern.
Example (one bot account in two channels):
Copy

```
{
  channels: {
    twitch: {
      accounts: {
        channel1: {
          username: "openclaw",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "vevisk",
        },
        channel2: {
          username: "openclaw",
          accessToken: "oauth:def456...",
          clientId: "uvw012...",
          channel: "secondchannel",
        },
      },
    },
  },
}

```

**Note:** Each account needs its own token (one token per channel).

## [​
](#access-control)
Access control

### [​
](#role-based-restrictions)
Role-based restrictions

Copy

```
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator", "vip"],
        },
      },
    },
  },
}

```

### [​
](#allowlist-by-user-id-most-secure)
Allowlist by User ID (most secure)

Copy

```
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowFrom: ["123456789", "987654321"],
        },
      },
    },
  },
}

```

### [​
](#role-based-access-alternative)
Role-based access (alternative)

`allowFrom` is a hard allowlist. When set, only those user IDs are allowed.
If you want role-based access, leave `allowFrom` unset and configure `allowedRoles` instead:
Copy

```
{
  channels: {
    twitch: {
      accounts: {
        default: {
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}

```

### [​
](#disable-@mention-requirement)
Disable @mention requirement

By default, `requireMention` is `true`. To disable and respond to all messages:
Copy

```
{
  channels: {
    twitch: {
      accounts: {
        default: {
          requireMention: false,
        },
      },
    },
  },
}

```

## [​
](#troubleshooting)
Troubleshooting

First, run diagnostic commands:
Copy

```
openclaw doctor
openclaw channels status --probe

```

### [​
](#bot-doesn’t-respond-to-messages)
Bot doesn’t respond to messages

**Check access control:** Ensure your user ID is in `allowFrom`, or temporarily remove
`allowFrom` and set `allowedRoles: ["all"]` to test.
**Check the bot is in the channel:** The bot must join the channel specified in `channel`.

### [​
](#token-issues)
Token issues

**“Failed to connect” or authentication errors:**

- Verify `accessToken` is the OAuth access token value (typically starts with `oauth:` prefix)

- Check token has `chat:read` and `chat:write` scopes

- If using token refresh, verify `clientSecret` and `refreshToken` are set

### [​
](#token-refresh-not-working)
Token refresh not working

**Check logs for refresh events:**
Copy

```
Using env token source for mybot
Access token refreshed for user 123456 (expires in 14400s)

```

If you see “token refresh disabled (no refresh token)”:

- Ensure `clientSecret` is provided

- Ensure `refreshToken` is provided

## [​
](#config)
Config

**Account config:**

- `username` - Bot username

- `accessToken` - OAuth access token with `chat:read` and `chat:write`

- `clientId` - Twitch Client ID (from Token Generator or your app)

- `channel` - Channel to join (required)

- `enabled` - Enable this account (default: `true`)

- `clientSecret` - Optional: For automatic token refresh

- `refreshToken` - Optional: For automatic token refresh

- `expiresIn` - Token expiry in seconds

- `obtainmentTimestamp` - Token obtained timestamp

- `allowFrom` - User ID allowlist

- `allowedRoles` - Role-based access control (`"moderator" | "owner" | "vip" | "subscriber" | "all"`)

- `requireMention` - Require @mention (default: `true`)

**Provider options:**

- `channels.twitch.enabled` - Enable/disable channel startup

- `channels.twitch.username` - Bot username (simplified single-account config)

- `channels.twitch.accessToken` - OAuth access token (simplified single-account config)

- `channels.twitch.clientId` - Twitch Client ID (simplified single-account config)

- `channels.twitch.channel` - Channel to join (simplified single-account config)

- `channels.twitch.accounts.<accountName>` - Multi-account config (all account fields above)

Full example:
Copy

```
{
  channels: {
    twitch: {
      enabled: true,
      username: "openclaw",
      accessToken: "oauth:abc123...",
      clientId: "xyz789...",
      channel: "vevisk",
      clientSecret: "secret123...",
      refreshToken: "refresh456...",
      allowFrom: ["123456789"],
      allowedRoles: ["moderator", "vip"],
      accounts: {
        default: {
          username: "mybot",
          accessToken: "oauth:abc123...",
          clientId: "xyz789...",
          channel: "your_channel",
          enabled: true,
          clientSecret: "secret123...",
          refreshToken: "refresh456...",
          expiresIn: 14400,
          obtainmentTimestamp: 1706092800000,
          allowFrom: ["123456789", "987654321"],
          allowedRoles: ["moderator"],
        },
      },
    },
  },
}

```

## [​
](#tool-actions)
Tool actions

The agent can call `twitch` with action:

- `send` - Send a message to a channel

Example:
Copy

```
{
  action: "twitch",
  params: {
    message: "Hello Twitch!",
    to: "#mychannel",
  },
}

```

## [​
](#safety-&-ops)
Safety & ops

- **Treat tokens like passwords** - Never commit tokens to git

- **Use automatic token refresh** for long-running bots

- **Use user ID allowlists** instead of usernames for access control

- **Monitor logs** for token refresh events and connection status

- **Scope tokens minimally** - Only request `chat:read` and `chat:write`

- **If stuck**: Restart the gateway after confirming no other process owns the session

## [​
](#limits)
Limits

- **500 characters** per message (auto-chunked at word boundaries)

- Markdown is stripped before chunking

- No rate limiting (uses Twitch’s built-in rate limits)

[Tlon](/channels/tlon)[WhatsApp](/channels/whatsapp)
⌘I