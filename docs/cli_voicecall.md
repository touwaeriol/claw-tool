# voicecall

Source: https://docs.openclaw.ai/cli/voicecall

---

CLI commands

# voicecall

# [​
](#openclaw-voicecall)
`openclaw voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.
Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## [​
](#common-commands)
Common commands

Copy

```
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall end --call-id <id>

```

## [​
](#exposing-webhooks-tailscale)
Exposing webhooks (Tailscale)

Copy

```
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off

```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
[update](/cli/update)[webhooks](/cli/webhooks)
⌘I