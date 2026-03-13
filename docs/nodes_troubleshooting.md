# Node Troubleshooting

Source: https://docs.openclaw.ai/nodes/troubleshooting

---

Media and devices

# Node Troubleshooting

# [​
](#node-troubleshooting)
Node troubleshooting

Use this page when a node is visible in status but node tools fail.

## [​
](#command-ladder)
Command ladder

Copy

```
openclaw status
openclaw gateway status
openclaw logs --follow
openclaw doctor
openclaw channels status --probe

```

Then run node specific checks:
Copy

```
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>

```

Healthy signals:

- Node is connected and paired for role `node`.

- `nodes describe` includes the capability you are calling.

- Exec approvals show expected mode/allowlist.

## [​
](#foreground-requirements)
Foreground requirements

`canvas.*`, `camera.*`, and `screen.*` are foreground only on iOS/Android nodes.
Quick check and fix:
Copy

```
openclaw nodes describe --node <idOrNameOrIp>
openclaw nodes canvas snapshot --node <idOrNameOrIp>
openclaw logs --follow

```

If you see `NODE_BACKGROUND_UNAVAILABLE`, bring the node app to the foreground and retry.

## [​
](#permissions-matrix)
Permissions matrix

CapabilityiOSAndroidmacOS node appTypical failure code`camera.snap`, `camera.clip`Camera (+ mic for clip audio)Camera (+ mic for clip audio)Camera (+ mic for clip audio)`*_PERMISSION_REQUIRED``screen.record`Screen Recording (+ mic optional)Screen capture prompt (+ mic optional)Screen Recording`*_PERMISSION_REQUIRED``location.get`While Using or Always (depends on mode)Foreground/Background location based on modeLocation permission`LOCATION_PERMISSION_REQUIRED``system.run`n/a (node host path)n/a (node host path)Exec approvals required`SYSTEM_RUN_DENIED`

## [​
](#pairing-versus-approvals)
Pairing versus approvals

These are different gates:

- **Device pairing**: can this node connect to the gateway?

- **Exec approvals**: can this node run a specific shell command?

Quick checks:
Copy

```
openclaw devices list
openclaw nodes status
openclaw approvals get --node <idOrNameOrIp>
openclaw approvals allowlist add --node <idOrNameOrIp> "/usr/bin/uname"

```

If pairing is missing, approve the node device first.
If pairing is fine but `system.run` fails, fix exec approvals/allowlist.

## [​
](#common-node-error-codes)
Common node error codes

- `NODE_BACKGROUND_UNAVAILABLE` → app is backgrounded; bring it foreground.

- `CAMERA_DISABLED` → camera toggle disabled in node settings.

- `*_PERMISSION_REQUIRED` → OS permission missing/denied.

- `LOCATION_DISABLED` → location mode is off.

- `LOCATION_PERMISSION_REQUIRED` → requested location mode not granted.

- `LOCATION_BACKGROUND_UNAVAILABLE` → app is backgrounded but only While Using permission exists.

- `SYSTEM_RUN_DENIED: approval required` → exec request needs explicit approval.

- `SYSTEM_RUN_DENIED: allowlist miss` → command blocked by allowlist mode.
On Windows node hosts, shell-wrapper forms like `cmd.exe /c ...` are treated as allowlist misses in
allowlist mode unless approved via ask flow.

## [​
](#fast-recovery-loop)
Fast recovery loop

Copy

```
openclaw nodes status
openclaw nodes describe --node <idOrNameOrIp>
openclaw approvals get --node <idOrNameOrIp>
openclaw logs --follow

```

If still stuck:

- Re-approve device pairing.

- Re-open node app (foreground).

- Re-grant OS permissions.

- Recreate/adjust exec approval policy.

Related:

- [/nodes/index](/nodes/index)

- [/nodes/camera](/nodes/camera)

- [/nodes/location-command](/nodes/location-command)

- [/tools/exec-approvals](/tools/exec-approvals)

- [/gateway/pairing](/gateway/pairing)

[Nodes](/nodes)[Media Understanding](/nodes/media-understanding)
⌘I