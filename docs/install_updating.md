# Updating

Source: https://docs.openclaw.ai/install/updating

---

Maintenance

# Updating

# [​
](#updating)
Updating

OpenClaw is moving fast (pre “1.0”). Treat updates like shipping infra: update → run checks → restart (or use `openclaw update`, which restarts) → verify.

## [​
](#recommended-re-run-the-website-installer-upgrade-in-place)
Recommended: re-run the website installer (upgrade in place)

The **preferred** update path is to re-run the installer from the website. It
detects existing installs, upgrades in place, and runs `openclaw doctor` when
needed.
Copy

```
curl -fsSL https://openclaw.ai/install.sh | bash

```

Notes:

- 
Add `--no-onboard` if you don’t want the onboarding wizard to run again.

- 
For **source installs**, use:
Copy

```
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard

```

The installer will `git pull --rebase` **only** if the repo is clean.

- 
For **global installs**, the script uses `npm install -g openclaw@latest` under the hood.

- 
Legacy note: `clawdbot` remains available as a compatibility shim.

## [​
](#before-you-update)
Before you update

- Know how you installed: **global** (npm/pnpm) vs **from source** (git clone).

- Know how your Gateway is running: **foreground terminal** vs **supervised service** (launchd/systemd).

- Snapshot your tailoring:

Config: `~/.openclaw/openclaw.json`

- Credentials: `~/.openclaw/credentials/`

- Workspace: `~/.openclaw/workspace`

## [​
](#update-global-install)
Update (global install)

Global install (pick one):
Copy

```
npm i -g openclaw@latest

```

Copy

```
pnpm add -g openclaw@latest

```

We do **not** recommend Bun for the Gateway runtime (WhatsApp/Telegram bugs).
To switch update channels (git + npm installs):
Copy

```
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable

```

Use `--tag <dist-tag|version>` for a one-off install tag/version.
See [Development channels](/install/development-channels) for channel semantics and release notes.
Note: on npm installs, the gateway logs an update hint on startup (checks the current channel tag). Disable via `update.checkOnStart: false`.

### [​
](#core-auto-updater-optional)
Core auto-updater (optional)

Auto-updater is **off by default** and is a core Gateway feature (not a plugin).
Copy

```
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}

```

Behavior:

- `stable`: when a new version is seen, OpenClaw waits `stableDelayHours` and then applies a deterministic per-install jitter in `stableJitterHours` (spread rollout).

- `beta`: checks on `betaCheckIntervalHours` cadence (default: hourly) and applies when an update is available.

- `dev`: no automatic apply; use manual `openclaw update`.

Use `openclaw update --dry-run` to preview update actions before enabling automation.
Then:
Copy

```
openclaw doctor
openclaw gateway restart
openclaw health

```

Notes:

- If your Gateway runs as a service, `openclaw gateway restart` is preferred over killing PIDs.

- If you’re pinned to a specific version, see “Rollback / pinning” below.

## [​
](#update-openclaw-update)
Update (`openclaw update`)

For **source installs** (git checkout), prefer:
Copy

```
openclaw update

```

It runs a safe-ish update flow:

- Requires a clean worktree.

- Switches to the selected channel (tag or branch).

- Fetches + rebases against the configured upstream (dev channel).

- Installs deps, builds, builds the Control UI, and runs `openclaw doctor`.

- Restarts the gateway by default (use `--no-restart` to skip).

If you installed via **npm/pnpm** (no git metadata), `openclaw update` will try to update via your package manager. If it can’t detect the install, use “Update (global install)” instead.

## [​
](#update-control-ui-/-rpc)
Update (Control UI / RPC)

The Control UI has **Update & Restart** (RPC: `update.run`). It:

- Runs the same source-update flow as `openclaw update` (git checkout only).

- Writes a restart sentinel with a structured report (stdout/stderr tail).

- Restarts the gateway and pings the last active session with the report.

If the rebase fails, the gateway aborts and restarts without applying the update.

## [​
](#update-from-source)
Update (from source)

From the repo checkout:
Preferred:
Copy

```
openclaw update

```

Manual (equivalent-ish):
Copy

```
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health

```

Notes:

- `pnpm build` matters when you run the packaged `openclaw` binary ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) or use Node to run `dist/`.

- If you run from a repo checkout without a global install, use `pnpm openclaw ...` for CLI commands.

- If you run directly from TypeScript (`pnpm openclaw ...`), a rebuild is usually unnecessary, but **config migrations still apply** → run doctor.

- Switching between global and git installs is easy: install the other flavor, then run `openclaw doctor` so the gateway service entrypoint is rewritten to the current install.

## [​
](#always-run-openclaw-doctor)
Always Run: `openclaw doctor`

Doctor is the “safe update” command. It’s intentionally boring: repair + migrate + warn.
Note: if you’re on a **source install** (git checkout), `openclaw doctor` will offer to run `openclaw update` first.
Typical things it does:

- Migrate deprecated config keys / legacy config file locations.

- Audit DM policies and warn on risky “open” settings.

- Check Gateway health and can offer to restart.

- Detect and migrate older gateway services (launchd/systemd; legacy schtasks) to current OpenClaw services.

- On Linux, ensure systemd user lingering (so the Gateway survives logout).

Details: [Doctor](/gateway/doctor)

## [​
](#start-/-stop-/-restart-the-gateway)
Start / stop / restart the Gateway

CLI (works regardless of OS):
Copy

```
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow

```

If you’re supervised:

- macOS launchd (app-bundled LaunchAgent): `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (use `ai.openclaw.<profile>`; legacy `com.openclaw.*` still works)

- Linux systemd user service: `systemctl --user restart openclaw-gateway[-<profile>].service`

- Windows (WSL2): `systemctl --user restart openclaw-gateway[-<profile>].service`

`launchctl`/`systemctl` only work if the service is installed; otherwise run `openclaw gateway install`.

Runbook + exact service labels: [Gateway runbook](/gateway)

## [​
](#rollback-/-pinning-when-something-breaks)
Rollback / pinning (when something breaks)

### [​
](#pin-global-install)
Pin (global install)

Install a known-good version (replace `<version>` with the last working one):
Copy

```
npm i -g openclaw@<version>

```

Copy

```
pnpm add -g openclaw@<version>

```

Tip: to see the current published version, run `npm view openclaw version`.
Then restart + re-run doctor:
Copy

```
openclaw doctor
openclaw gateway restart

```

### [​
](#pin-source-by-date)
Pin (source) by date

Pick a commit from a date (example: “state of main as of 2026-01-01”):
Copy

```
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"

```

Then reinstall deps + restart:
Copy

```
pnpm install
pnpm build
openclaw gateway restart

```

If you want to go back to latest later:
Copy

```
git checkout main
git pull

```

## [​
](#if-you’re-stuck)
If you’re stuck

- Run `openclaw doctor` again and read the output carefully (it often tells you the fix).

- Check: [Troubleshooting](/gateway/troubleshooting)

- Ask in Discord: [https://discord.gg/clawd](https://discord.gg/clawd)

[Bun (Experimental)](/install/bun)[Migration Guide](/install/migrating)
⌘I