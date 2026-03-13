# Nostr

Source: https://docs.openclaw.ai/channels/nostr

---

Messaging platforms

# Nostr

# [​
](#nostr)
Nostr

**Status:** Optional plugin (disabled by default).
Nostr is a decentralized protocol for social networking. This channel enables OpenClaw to receive and respond to encrypted direct messages (DMs) via NIP-04.

## [​
](#install-on-demand)
Install (on demand)

### [​
](#onboarding-recommended)
Onboarding (recommended)

- The onboarding wizard (`openclaw onboard`) and `openclaw channels add` list optional channel plugins.

- Selecting Nostr prompts you to install the plugin on demand.

Install defaults:

- **Dev channel + git checkout available:** uses the local plugin path.

- **Stable/Beta:** downloads from npm.

You can always override the choice in the prompt.

### [​
](#manual-install)
Manual install

Copy

```
openclaw plugins install @openclaw/nostr

```

Use a local checkout (dev workflows):
Copy

```
openclaw plugins install --link <path-to-openclaw>/extensions/nostr

```

Restart the Gateway after installing or enabling plugins.

## [​
](#quick-setup)
Quick setup

- Generate a Nostr keypair (if needed):

Copy

```
# Using nak
nak key generate

```

- Add to config:

Copy

```
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}"
    }
  }
}

```

- Export the key:

Copy

```
export NOSTR_PRIVATE_KEY="nsec1..."

```

- Restart the Gateway.

## [​
](#configuration-reference)
Configuration reference

KeyTypeDefaultDescription`privateKey`stringrequiredPrivate key in `nsec` or hex format`relays`string[]`[&#x27;wss://relay.damus.io&#x27;, &#x27;wss://nos.lol&#x27;]`Relay URLs (WebSocket)`dmPolicy`string`pairing`DM access policy`allowFrom`string[]`[]`Allowed sender pubkeys`enabled`boolean`true`Enable/disable channel`name`string-Display name`profile`object-NIP-01 profile metadata

## [​
](#profile-metadata)
Profile metadata

Profile data is published as a NIP-01 `kind:0` event. You can manage it from the Control UI (Channels -> Nostr -> Profile) or set it directly in config.
Example:
Copy

```
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "profile": {
        "name": "openclaw",
        "displayName": "OpenClaw",
        "about": "Personal assistant DM bot",
        "picture": "https://example.com/avatar.png",
        "banner": "https://example.com/banner.png",
        "website": "https://example.com",
        "nip05": "openclaw@example.com",
        "lud16": "openclaw@example.com"
      }
    }
  }
}

```

Notes:

- Profile URLs must use `https://`.

- Importing from relays merges fields and preserves local overrides.

## [​
](#access-control)
Access control

### [​
](#dm-policies)
DM policies

- **pairing** (default): unknown senders get a pairing code.

- **allowlist**: only pubkeys in `allowFrom` can DM.

- **open**: public inbound DMs (requires `allowFrom: ["*"]`).

- **disabled**: ignore inbound DMs.

### [​
](#allowlist-example)
Allowlist example

Copy

```
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "dmPolicy": "allowlist",
      "allowFrom": ["npub1abc...", "npub1xyz..."]
    }
  }
}

```

## [​
](#key-formats)
Key formats

Accepted formats:

- **Private key:** `nsec...` or 64-char hex

- **Pubkeys (`allowFrom`):** `npub...` or hex

## [​
](#relays)
Relays

Defaults: `relay.damus.io` and `nos.lol`.
Copy

```
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["wss://relay.damus.io", "wss://relay.primal.net", "wss://nostr.wine"]
    }
  }
}

```

Tips:

- Use 2-3 relays for redundancy.

- Avoid too many relays (latency, duplication).

- Paid relays can improve reliability.

- Local relays are fine for testing (`ws://localhost:7777`).

## [​
](#protocol-support)
Protocol support

NIPStatusDescriptionNIP-01SupportedBasic event format + profile metadataNIP-04SupportedEncrypted DMs (`kind:4`)NIP-17PlannedGift-wrapped DMsNIP-44PlannedVersioned encryption

## [​
](#testing)
Testing

### [​
](#local-relay)
Local relay

Copy

```
# Start strfry
docker run -p 7777:7777 ghcr.io/hoytech/strfry

```

Copy

```
{
  "channels": {
    "nostr": {
      "privateKey": "${NOSTR_PRIVATE_KEY}",
      "relays": ["ws://localhost:7777"]
    }
  }
}

```

### [​
](#manual-test)
Manual test

- Note the bot pubkey (npub) from logs.

- Open a Nostr client (Damus, Amethyst, etc.).

- DM the bot pubkey.

- Verify the response.

## [​
](#troubleshooting)
Troubleshooting

### [​
](#not-receiving-messages)
Not receiving messages

- Verify the private key is valid.

- Ensure relay URLs are reachable and use `wss://` (or `ws://` for local).

- Confirm `enabled` is not `false`.

- Check Gateway logs for relay connection errors.

### [​
](#not-sending-responses)
Not sending responses

- Check relay accepts writes.

- Verify outbound connectivity.

- Watch for relay rate limits.

### [​
](#duplicate-responses)
Duplicate responses

- Expected when using multiple relays.

- Messages are deduplicated by event ID; only the first delivery triggers a response.

## [​
](#security)
Security

- Never commit private keys.

- Use environment variables for keys.

- Consider `allowlist` for production bots.

## [​
](#limitations-mvp)
Limitations (MVP)

- Direct messages only (no group chats).

- No media attachments.

- NIP-04 only (NIP-17 gift-wrap planned).

[Nextcloud Talk](/channels/nextcloud-talk)[Signal](/channels/signal)
⌘I