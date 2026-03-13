# doctor

Source: https://docs.openclaw.ai/cli/doctor

---

CLI commands

# doctor

# [​
](#openclaw-doctor)
`openclaw doctor`

Health checks + quick fixes for the gateway and channels.
Related:

- Troubleshooting: [Troubleshooting](/gateway/troubleshooting)

- Security audit: [Security](/gateway/security)

## [​
](#examples)
Examples

Copy

```
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep

```

Notes:

- Interactive prompts (like keychain/OAuth fixes) only run when stdin is a TTY and `--non-interactive` is **not** set. Headless runs (cron, Telegram, no terminal) will skip prompts.

- `--fix` (alias for `--repair`) writes a backup to `~/.openclaw/openclaw.json.bak` and drops unknown config keys, listing each removal.

- State integrity checks now detect orphan transcript files in the sessions directory and can archive them as `.deleted.<timestamp>` to reclaim space safely.

- Doctor also scans `~/.openclaw/cron/jobs.json` (or `cron.store`) for legacy cron job shapes and can rewrite them in place before the scheduler has to auto-normalize them at runtime.

- Doctor includes a memory-search readiness check and can recommend `openclaw configure --section model` when embedding credentials are missing.

- If sandbox mode is enabled but Docker is unavailable, doctor reports a high-signal warning with remediation (`install Docker` or `openclaw config set agents.defaults.sandbox.mode off`).

## [​
](#macos-launchctl-env-overrides)
macOS: `launchctl` env overrides

If you previously ran `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (or `...PASSWORD`), that value overrides your config file and can cause persistent “unauthorized” errors.
Copy

```
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD

```

[docs](/cli/docs)[gateway](/cli/gateway)
⌘I