# Bun (Experimental)

Source: https://docs.openclaw.ai/install/bun

---

Other install methods

# Bun (Experimental)

# [​
](#bun-experimental)
Bun (experimental)

Goal: run this repo with **Bun** (optional, not recommended for WhatsApp/Telegram)
without diverging from pnpm workflows.
⚠️ **Not recommended for Gateway runtime** (WhatsApp/Telegram bugs). Use Node for production.

## [​
](#status)
Status

- Bun is an optional local runtime for running TypeScript directly (`bun run …`, `bun --watch …`).

- `pnpm` is the default for builds and remains fully supported (and used by some docs tooling).

- Bun cannot use `pnpm-lock.yaml` and will ignore it.

## [​
](#install)
Install

Default:
Copy

```
bun install

```

Note: `bun.lock`/`bun.lockb` are gitignored, so there’s no repo churn either way. If you want *no lockfile writes*:
Copy

```
bun install --no-save

```

## [​
](#build-/-test-bun)
Build / Test (Bun)

Copy

```
bun run build
bun run vitest run

```

## [​
](#bun-lifecycle-scripts-blocked-by-default)
Bun lifecycle scripts (blocked by default)

Bun may block dependency lifecycle scripts unless explicitly trusted (`bun pm untrusted` / `bun pm trust`).
For this repo, the commonly blocked scripts are not required:

- `@whiskeysockets/baileys` `preinstall`: checks Node major >= 20 (we run Node 22+).

- `protobufjs` `postinstall`: emits warnings about incompatible version schemes (no build artifacts).

If you hit a real runtime issue that requires these scripts, trust them explicitly:
Copy

```
bun pm trust @whiskeysockets/baileys protobufjs

```

## [​
](#caveats)
Caveats

- Some scripts still hardcode pnpm (e.g. `docs:build`, `ui:*`, `protocol:check`). Run those via pnpm for now.

[Ansible](/install/ansible)[Updating](/install/updating)
⌘I