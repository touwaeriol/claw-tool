# update

Source: https://docs.openclaw.ai/cli/update

---

CLI commands

# update

# [​
](#openclaw-update)
`openclaw update`

Safely update OpenClaw and switch between stable/beta/dev channels.
If you installed via **npm/pnpm** (global install, no git metadata), updates happen via the package manager flow in [Updating](/install/updating).

## [​
](#usage)
Usage

Copy

```
openclaw update
openclaw update status
openclaw update wizard
openclaw update --channel beta
openclaw update --channel dev
openclaw update --tag beta
openclaw update --dry-run
openclaw update --no-restart
openclaw update --json
openclaw --update

```

## [​
](#options)
Options

- `--no-restart`: skip restarting the Gateway service after a successful update.

- `--channel <stable|beta|dev>`: set the update channel (git + npm; persisted in config).

- `--tag <dist-tag|version>`: override the npm dist-tag or version for this update only.

- `--dry-run`: preview planned update actions (channel/tag/target/restart flow) without writing config, installing, syncing plugins, or restarting.

- `--json`: print machine-readable `UpdateRunResult` JSON.

- `--timeout <seconds>`: per-step timeout (default is 1200s).

Note: downgrades require confirmation because older versions can break configuration.

## [​
](#update-status)
`update status`

Show the active update channel + git tag/branch/SHA (for source checkouts), plus update availability.
Copy

```
openclaw update status
openclaw update status --json
openclaw update status --timeout 10

```

Options:

- `--json`: print machine-readable status JSON.

- `--timeout <seconds>`: timeout for checks (default is 3s).

## [​
](#update-wizard)
`update wizard`

Interactive flow to pick an update channel and confirm whether to restart the Gateway
after updating (default is to restart). If you select `dev` without a git checkout, it
offers to create one.

## [​
](#what-it-does)
What it does

When you switch channels explicitly (`--channel ...`), OpenClaw also keeps the
install method aligned:

- `dev` → ensures a git checkout (default: `~/openclaw`, override with `OPENCLAW_GIT_DIR`),
updates it, and installs the global CLI from that checkout.

- `stable`/`beta` → installs from npm using the matching dist-tag.

The Gateway core auto-updater (when enabled via config) reuses this same update path.

## [​
](#git-checkout-flow)
Git checkout flow

Channels:

- `stable`: checkout the latest non-beta tag, then build + doctor.

- `beta`: checkout the latest `-beta` tag, then build + doctor.

- `dev`: checkout `main`, then fetch + rebase.

High-level:

- Requires a clean worktree (no uncommitted changes).

- Switches to the selected channel (tag or branch).

- Fetches upstream (dev only).

- Dev only: preflight lint + TypeScript build in a temp worktree; if the tip fails, walks back up to 10 commits to find the newest clean build.

- Rebases onto the selected commit (dev only).

- Installs deps (pnpm preferred; npm fallback).

- Builds + builds the Control UI.

- Runs `openclaw doctor` as the final “safe update” check.

- Syncs plugins to the active channel (dev uses bundled extensions; stable/beta uses npm) and updates npm-installed plugins.

## [​
](#update-shorthand)
`--update` shorthand

`openclaw --update` rewrites to `openclaw update` (useful for shells and launcher scripts).

## [​
](#see-also)
See also

- `openclaw doctor` (offers to run update first on git checkouts)

- [Development channels](/install/development-channels)

- [Updating](/install/updating)

- [CLI reference](/cli)

[uninstall](/cli/uninstall)[voicecall](/cli/voicecall)
⌘I