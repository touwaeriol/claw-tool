# Troubleshooting

Source: https://docs.openclaw.ai/help/troubleshooting

---

Help

# Troubleshooting

# [​
](#troubleshooting)
Troubleshooting

If you only have 2 minutes, use this page as a triage front door.

## [​
](#first-60-seconds)
First 60 seconds

Run this exact ladder in order:
Copy

```
openclaw status
openclaw status --all
openclaw gateway probe
openclaw gateway status
openclaw doctor
openclaw channels status --probe
openclaw logs --follow

```

Good output in one line:

- `openclaw status` → shows configured channels and no obvious auth errors.

- `openclaw status --all` → full report is present and shareable.

- `openclaw gateway probe` → expected gateway target is reachable.

- `openclaw gateway status` → `Runtime: running` and `RPC probe: ok`.

- `openclaw doctor` → no blocking config/service errors.

- `openclaw channels status --probe` → channels report `connected` or `ready`.

- `openclaw logs --follow` → steady activity, no repeating fatal errors.

## [​
](#anthropic-long-context-429)
Anthropic long context 429

If you see:
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`,
go to [/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context](/gateway/troubleshooting#anthropic-429-extra-usage-required-for-long-context).

## [​
](#plugin-install-fails-with-missing-openclaw-extensions)
Plugin install fails with missing openclaw extensions

If install fails with `package.json missing openclaw.extensions`, the plugin package
is using an old shape that OpenClaw no longer accepts.
Fix in the plugin package:

- Add `openclaw.extensions` to `package.json`.

- Point entries at built runtime files (usually `./dist/index.js`).

- Republish the plugin and run `openclaw plugins install <npm-spec>` again.

Example:
Copy

```
{
  "name": "@openclaw/my-plugin",
  "version": "1.2.3",
  "openclaw": {
    "extensions": ["./dist/index.js"]
  }
}

```

Reference: [/tools/plugin#distribution-npm](/tools/plugin#distribution-npm)

## [​
](#decision-tree)
Decision tree

No replies

Copy

```
openclaw status
openclaw gateway status
openclaw channels status --probe
openclaw pairing list --channel <channel> [--account <id>]
openclaw logs --follow

```

Good output looks like:
- `Runtime: running`

- `RPC probe: ok`

- Your channel shows connected/ready in `channels status --probe`

- Sender appears approved (or DM policy is open/allowlist)

Common log signatures:
- `drop guild message (mention required` → mention gating blocked the message in Discord.

- `pairing request` → sender is unapproved and waiting for DM pairing approval.

- `blocked` / `allowlist` in channel logs → sender, room, or group is filtered.

Deep pages:
- [/gateway/troubleshooting#no-replies](/gateway/troubleshooting#no-replies)

- [/channels/troubleshooting](/channels/troubleshooting)

- [/channels/pairing](/channels/pairing)

Dashboard or Control UI will not connect

Copy

```
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe

```

Good output looks like:
- `Dashboard: http://...` is shown in `openclaw gateway status`

- `RPC probe: ok`

- No auth loop in logs

Common log signatures:
- `device identity required` → HTTP/non-secure context cannot complete device auth.

- `unauthorized` / reconnect loop → wrong token/password or auth mode mismatch.

- `gateway connect failed:` → UI is targeting the wrong URL/port or unreachable gateway.

Deep pages:
- [/gateway/troubleshooting#dashboard-control-ui-connectivity](/gateway/troubleshooting#dashboard-control-ui-connectivity)

- [/web/control-ui](/web/control-ui)

- [/gateway/authentication](/gateway/authentication)

Gateway will not start or service installed but not running

Copy

```
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe

```

Good output looks like:
- `Service: ... (loaded)`

- `Runtime: running`

- `RPC probe: ok`

Common log signatures:
- `Gateway start blocked: set gateway.mode=local` → gateway mode is unset/remote.

- `refusing to bind gateway ... without auth` → non-loopback bind without token/password.

- `another gateway instance is already listening` or `EADDRINUSE` → port already taken.

Deep pages:
- [/gateway/troubleshooting#gateway-service-not-running](/gateway/troubleshooting#gateway-service-not-running)

- [/gateway/background-process](/gateway/background-process)

- [/gateway/configuration](/gateway/configuration)

Channel connects but messages do not flow

Copy

```
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe

```

Good output looks like:
- Channel transport is connected.

- Pairing/allowlist checks pass.

- Mentions are detected where required.

Common log signatures:
- `mention required` → group mention gating blocked processing.

- `pairing` / `pending` → DM sender is not approved yet.

- `not_in_channel`, `missing_scope`, `Forbidden`, `401/403` → channel permission token issue.

Deep pages:
- [/gateway/troubleshooting#channel-connected-messages-not-flowing](/gateway/troubleshooting#channel-connected-messages-not-flowing)

- [/channels/troubleshooting](/channels/troubleshooting)

Cron or heartbeat did not fire or did not deliver

Copy

```
openclaw status
openclaw gateway status
openclaw cron status
openclaw cron list
openclaw cron runs --id <jobId> --limit 20
openclaw logs --follow

```

Good output looks like:
- `cron.status` shows enabled with a next wake.

- `cron runs` shows recent `ok` entries.

- Heartbeat is enabled and not outside active hours.

Common log signatures:
- `cron: scheduler disabled; jobs will not run automatically` → cron is disabled.

- `heartbeat skipped` with `reason=quiet-hours` → outside configured active hours.

- `requests-in-flight` → main lane busy; heartbeat wake was deferred.

- `unknown accountId` → heartbeat delivery target account does not exist.

Deep pages:
- [/gateway/troubleshooting#cron-and-heartbeat-delivery](/gateway/troubleshooting#cron-and-heartbeat-delivery)

- [/automation/troubleshooting](/automation/troubleshooting)

- [/gateway/heartbeat](/gateway/heartbeat)

Node is paired but tool fails camera canvas screen exec

Copy

```
openclaw status
openclaw gateway status
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw logs --follow

```

Good output looks like:
- Node is listed as connected and paired for role `node`.

- Capability exists for the command you are invoking.

- Permission state is granted for the tool.

Common log signatures:
- `NODE_BACKGROUND_UNAVAILABLE` → bring node app to foreground.

- `*_PERMISSION_REQUIRED` → OS permission was denied/missing.

- `SYSTEM_RUN_DENIED: approval required` → exec approval is pending.

- `SYSTEM_RUN_DENIED: allowlist miss` → command not on exec allowlist.

Deep pages:
- [/gateway/troubleshooting#node-paired-tool-fails](/gateway/troubleshooting#node-paired-tool-fails)

- [/nodes/troubleshooting](/nodes/troubleshooting)

- [/tools/exec-approvals](/tools/exec-approvals)

Browser tool fails

Copy

```
openclaw status
openclaw gateway status
openclaw browser status
openclaw logs --follow
openclaw doctor

```

Good output looks like:
- Browser status shows `running: true` and a chosen browser/profile.

- `openclaw` profile starts or `chrome` relay has an attached tab.

Common log signatures:
- `Failed to start Chrome CDP on port` → local browser launch failed.

- `browser.executablePath not found` → configured binary path is wrong.

- `Chrome extension relay is running, but no tab is connected` → extension not attached.

- `Browser attachOnly is enabled ... not reachable` → attach-only profile has no live CDP target.

Deep pages:
- [/gateway/troubleshooting#browser-tool-fails](/gateway/troubleshooting#browser-tool-fails)

- [/tools/browser-linux-troubleshooting](/tools/browser-linux-troubleshooting)

- [/tools/browser-wsl2-windows-remote-cdp-troubleshooting](/tools/browser-wsl2-windows-remote-cdp-troubleshooting)

- [/tools/chrome-extension](/tools/chrome-extension)

[Help](/help)[FAQ](/help/faq)
⌘I