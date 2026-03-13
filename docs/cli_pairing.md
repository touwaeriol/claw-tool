# pairing

Source: https://docs.openclaw.ai/cli/pairing

---

CLI commands

# pairing

# [​
](#openclaw-pairing)
`openclaw pairing`

Approve or inspect DM pairing requests (for channels that support pairing).
Related:

- Pairing flow: [Pairing](/channels/pairing)

## [​
](#commands)
Commands

Copy

```
openclaw pairing list telegram
openclaw pairing list --channel telegram --account work
openclaw pairing list telegram --json

openclaw pairing approve telegram <code>
openclaw pairing approve --channel telegram --account work <code> --notify

```

## [​
](#notes)
Notes

- Channel input: pass it positionally (`pairing list telegram`) or with `--channel <channel>`.

- `pairing list` supports `--account <accountId>` for multi-account channels.

- `pairing approve` supports `--account <accountId>` and `--notify`.

- If only one pairing-capable channel is configured, `pairing approve <code>` is allowed.

[onboard](/cli/onboard)[plugins](/cli/plugins)
⌘I