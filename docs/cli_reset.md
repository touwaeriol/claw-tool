# reset

Source: https://docs.openclaw.ai/cli/reset

---

CLI commands

# reset

# [​
](#openclaw-reset)
`openclaw reset`

Reset local config/state (keeps the CLI installed).
Copy

```
openclaw backup create
openclaw reset
openclaw reset --dry-run
openclaw reset --scope config+creds+sessions --yes --non-interactive

```

Run `openclaw backup create` first if you want a restorable snapshot before removing local state.
[qr](/cli/qr)[Sandbox CLI](/cli/sandbox)
⌘I