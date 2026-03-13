# Skills

Source: https://docs.openclaw.ai/platforms/mac/skills

---

macOS companion app

# Skills

# [​
](#skills-macos)
Skills (macOS)

The macOS app surfaces OpenClaw skills via the gateway; it does not parse skills locally.

## [​
](#data-source)
Data source

- `skills.status` (gateway) returns all skills plus eligibility and missing requirements
(including allowlist blocks for bundled skills).

- Requirements are derived from `metadata.openclaw.requires` in each `SKILL.md`.

## [​
](#install-actions)
Install actions

- `metadata.openclaw.install` defines install options (brew/node/go/uv).

- The app calls `skills.install` to run installers on the gateway host.

- The gateway surfaces only one preferred installer when multiple are provided
(brew when available, otherwise node manager from `skills.install`, default npm).

## [​
](#env/api-keys)
Env/API keys

- The app stores keys in `~/.openclaw/openclaw.json` under `skills.entries.<skillKey>`.

- `skills.update` patches `enabled`, `apiKey`, and `env`.

## [​
](#remote-mode)
Remote mode

- Install + config updates happen on the gateway host (not the local Mac).

[macOS IPC](/platforms/mac/xpc)[Peekaboo Bridge](/platforms/mac/peekaboo)
⌘I