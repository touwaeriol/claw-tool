# Gateway Runbook

Source: https://docs.openclaw.ai/gateway

---

Gateway

# Gateway Runbook

# [​
](#gateway-runbook)
Gateway runbook

Use this page for day-1 startup and day-2 operations of the Gateway service.

## Deep troubleshooting

Symptom-first diagnostics with exact command ladders and log signatures.

## Configuration

Task-oriented setup guide + full configuration reference.

## Secrets management

SecretRef contract, runtime snapshot behavior, and migrate/reload operations.

## Secrets plan contract

Exact `secrets apply` target/path rules and ref-only auth-profile behavior.

## [​
](#5-minute-local-startup)
5-minute local startup

1
[
](#)

Start the Gateway

Copy

```
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force

```

2
[
](#)

Verify service health

Copy

```
openclaw gateway status
openclaw status
openclaw logs --follow

```

Healthy baseline: `Runtime: running` and `RPC probe: ok`.

3
[
](#)

Validate channel readiness

Copy

```
openclaw channels status --probe

```

Gateway config reload watches the active config file path (resolved from profile/state defaults, or `OPENCLAW_CONFIG_PATH` when set).
Default mode is `gateway.reload.mode="hybrid"`.

## [​
](#runtime-model)
Runtime model

- One always-on process for routing, control plane, and channel connections.

- Single multiplexed port for:

WebSocket control/RPC

- HTTP APIs (OpenAI-compatible, Responses, tools invoke)

- Control UI and hooks

- Default bind mode: `loopback`.

- Auth is required by default (`gateway.auth.token` / `gateway.auth.password`, or `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

### [​
](#port-and-bind-precedence)
Port and bind precedence

SettingResolution orderGateway port`--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789`Bind modeCLI/override → `gateway.bind` → `loopback`

### [​
](#hot-reload-modes)
Hot reload modes

`gateway.reload.mode`Behavior`off`No config reload`hot`Apply only hot-safe changes`restart`Restart on reload-required changes`hybrid` (default)Hot-apply when safe, restart when required

## [​
](#operator-command-set)
Operator command set

Copy

```
openclaw gateway status
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor

```

## [​
](#remote-access)
Remote access

Preferred: Tailscale/VPN.
Fallback: SSH tunnel.
Copy

```
ssh -N -L 18789:127.0.0.1:18789 user@host

```

Then connect clients to `ws://127.0.0.1:18789` locally.

If gateway auth is configured, clients still must send auth (`token`/`password`) even over SSH tunnels.

See: [Remote Gateway](/gateway/remote), [Authentication](/gateway/authentication), [Tailscale](/gateway/tailscale).

## [​
](#supervision-and-service-lifecycle)
Supervision and service lifecycle

Use supervised runs for production-like reliability.
-  macOS (launchd)

-  Linux (systemd user)

-  Linux (system service)

Copy

```
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop

```

LaunchAgent labels are `ai.openclaw.gateway` (default) or `ai.openclaw.<profile>` (named profile). `openclaw doctor` audits and repairs service config drift.
Copy

```
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status

```

For persistence after logout, enable lingering:Copy

```
sudo loginctl enable-linger <user>

```

Use a system unit for multi-user/always-on hosts.Copy

```
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service

```

## [​
](#multiple-gateways-on-one-host)
Multiple gateways on one host

Most setups should run **one** Gateway.
Use multiple only for strict isolation/redundancy (for example a rescue profile).
Checklist per instance:

- Unique `gateway.port`

- Unique `OPENCLAW_CONFIG_PATH`

- Unique `OPENCLAW_STATE_DIR`

- Unique `agents.defaults.workspace`

Example:
Copy

```
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002

```

See: [Multiple gateways](/gateway/multiple-gateways).

### [​
](#dev-profile-quick-path)
Dev profile quick path

Copy

```
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status

```

Defaults include isolated state/config and base gateway port `19001`.

## [​
](#protocol-quick-reference-operator-view)
Protocol quick reference (operator view)

- First client frame must be `connect`.

- Gateway returns `hello-ok` snapshot (`presence`, `health`, `stateVersion`, `uptimeMs`, limits/policy).

- Requests: `req(method, params)` → `res(ok/payload|error)`.

- Common events: `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Agent runs are two-stage:

- Immediate accepted ack (`status:"accepted"`)

- Final completion response (`status:"ok"|"error"`), with streamed `agent` events in between.

See full protocol docs: [Gateway Protocol](/gateway/protocol).

## [​
](#operational-checks)
Operational checks

### [​
](#liveness)
Liveness

- Open WS and send `connect`.

- Expect `hello-ok` response with snapshot.

### [​
](#readiness)
Readiness

Copy

```
openclaw gateway status
openclaw channels status --probe
openclaw health

```

### [​
](#gap-recovery)
Gap recovery

Events are not replayed. On sequence gaps, refresh state (`health`, `system-presence`) before continuing.

## [​
](#common-failure-signatures)
Common failure signatures

SignatureLikely issue`refusing to bind gateway ... without auth`Non-loopback bind without token/password`another gateway instance is already listening` / `EADDRINUSE`Port conflict`Gateway start blocked: set gateway.mode=local`Config set to remote mode`unauthorized` during connectAuth mismatch between client and gateway

For full diagnosis ladders, use [Gateway Troubleshooting](/gateway/troubleshooting).

## [​
](#safety-guarantees)
Safety guarantees

- Gateway protocol clients fail fast when Gateway is unavailable (no implicit direct-channel fallback).

- Invalid/non-connect first frames are rejected and closed.

- Graceful shutdown emits `shutdown` event before socket close.

Related:

- [Troubleshooting](/gateway/troubleshooting)

- [Background Process](/gateway/background-process)

- [Configuration](/gateway/configuration)

- [Health](/gateway/health)

- [Doctor](/gateway/doctor)

- [Authentication](/gateway/authentication)

[Configuration](/gateway/configuration)
⌘I