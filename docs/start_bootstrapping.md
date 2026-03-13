# Agent Bootstrapping

Source: https://docs.openclaw.ai/start/bootstrapping

---

Bootstrapping

# Agent Bootstrapping

# [​
](#agent-bootstrapping)
Agent Bootstrapping

Bootstrapping is the **first‑run** ritual that prepares an agent workspace and
collects identity details. It happens after onboarding, when the agent starts
for the first time.

## [​
](#what-bootstrapping-does)
What bootstrapping does

On the first agent run, OpenClaw bootstraps the workspace (default
`~/.openclaw/workspace`):

- Seeds `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.

- Runs a short Q&A ritual (one question at a time).

- Writes identity + preferences to `IDENTITY.md`, `USER.md`, `SOUL.md`.

- Removes `BOOTSTRAP.md` when finished so it only runs once.

## [​
](#where-it-runs)
Where it runs

Bootstrapping always runs on the **gateway host**. If the macOS app connects to
a remote Gateway, the workspace and bootstrapping files live on that remote
machine.

When the Gateway runs on another machine, edit workspace files on the gateway
host (for example, `user@gateway-host:~/.openclaw/workspace`).

## [​
](#related-docs)
Related docs

- macOS app onboarding: [Onboarding](/start/onboarding)

- Workspace layout: [Agent workspace](/concepts/agent-workspace)

[OAuth](/concepts/oauth)[Session Management](/concepts/session)
⌘I