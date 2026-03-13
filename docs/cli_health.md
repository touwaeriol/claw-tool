# health

Source: https://docs.openclaw.ai/cli/health

---

CLI commands

# health

# [​
](#openclaw-health)
`openclaw health`

Fetch health from the running Gateway.
Copy

```
openclaw health
openclaw health --json
openclaw health --verbose

```

Notes:

- `--verbose` runs live probes and prints per-account timings when multiple accounts are configured.

- Output includes per-agent session stores when multiple agents are configured.

[gateway](/cli/gateway)[hooks](/cli/hooks)
⌘I