# uninstall

Source: https://docs.openclaw.ai/cli/uninstall

---

CLI commands

# uninstall

# [​
](#openclaw-uninstall)
`openclaw uninstall`

Uninstall the gateway service + local data (CLI remains).
Copy

```
openclaw backup create
openclaw uninstall
openclaw uninstall --all --yes
openclaw uninstall --dry-run

```

Run `openclaw backup create` first if you want a restorable snapshot before removing state or workspaces.
[tui](/cli/tui)[update](/cli/update)
⌘I