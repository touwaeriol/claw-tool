# WSL2 + Windows + remote Chrome CDP troubleshooting

Source: https://docs.openclaw.ai/tools/browser-wsl2-windows-remote-cdp-troubleshooting

---

Browser

# WSL2 + Windows + remote Chrome CDP troubleshooting

# [​
](#wsl2-+-windows-+-remote-chrome-cdp-troubleshooting)
WSL2 + Windows + remote Chrome CDP troubleshooting

This guide covers the common split-host setup where:

- OpenClaw Gateway runs inside WSL2

- Chrome runs on Windows

- browser control must cross the WSL2/Windows boundary

It also covers the layered failure pattern from [issue #39369](https://github.com/openclaw/openclaw/issues/39369): several independent problems can show up at once, which makes the wrong layer look broken first.

## [​
](#choose-the-right-browser-mode-first)
Choose the right browser mode first

You have two valid patterns:

### [​
](#option-1-raw-remote-cdp)
Option 1: Raw remote CDP

Use a remote browser profile that points from WSL2 to a Windows Chrome CDP endpoint.
Choose this when:

- you only need browser control

- you are comfortable exposing Chrome remote debugging to WSL2

- you do not need the Chrome extension relay

### [​
](#option-2-chrome-extension-relay)
Option 2: Chrome extension relay

Use the built-in `chrome` profile plus the OpenClaw Chrome extension.
Choose this when:

- you want to attach to an existing Windows Chrome tab with the toolbar button

- you want extension-based control instead of raw `--remote-debugging-port`

- the relay itself must be reachable across the WSL2/Windows boundary

If you use the extension relay across namespaces, `browser.relayBindHost` is the important setting introduced in [Browser](/tools/browser) and [Chrome extension](/tools/chrome-extension).

## [​
](#working-architecture)
Working architecture

Reference shape:

- WSL2 runs the Gateway on `127.0.0.1:18789`

- Windows opens the Control UI in a normal browser at `http://127.0.0.1:18789/`

- Windows Chrome exposes a CDP endpoint on port `9222`

- WSL2 can reach that Windows CDP endpoint

- OpenClaw points a browser profile at the address that is reachable from WSL2

## [​
](#why-this-setup-is-confusing)
Why this setup is confusing

Several failures can overlap:

- WSL2 cannot reach the Windows CDP endpoint

- the Control UI is opened from a non-secure origin

- `gateway.controlUi.allowedOrigins` does not match the page origin

- token or pairing is missing

- the browser profile points at the wrong address

- the extension relay is still loopback-only when you actually need cross-namespace access

Because of that, fixing one layer can still leave a different error visible.

## [​
](#critical-rule-for-the-control-ui)
Critical rule for the Control UI

When the UI is opened from Windows, use Windows localhost unless you have a deliberate HTTPS setup.
Use:
`http://127.0.0.1:18789/`
Do not default to a LAN IP for the Control UI. Plain HTTP on a LAN or tailnet address can trigger insecure-origin/device-auth behavior that is unrelated to CDP itself. See [Control UI](/web/control-ui).

## [​
](#validate-in-layers)
Validate in layers

Work top to bottom. Do not skip ahead.

### [​
](#layer-1-verify-chrome-is-serving-cdp-on-windows)
Layer 1: Verify Chrome is serving CDP on Windows

Start Chrome on Windows with remote debugging enabled:
Copy

```
chrome.exe --remote-debugging-port=9222

```

From Windows, verify Chrome itself first:
Copy

```
curl http://127.0.0.1:9222/json/version
curl http://127.0.0.1:9222/json/list

```

If this fails on Windows, OpenClaw is not the problem yet.

### [​
](#layer-2-verify-wsl2-can-reach-that-windows-endpoint)
Layer 2: Verify WSL2 can reach that Windows endpoint

From WSL2, test the exact address you plan to use in `cdpUrl`:
Copy

```
curl http://WINDOWS_HOST_OR_IP:9222/json/version
curl http://WINDOWS_HOST_OR_IP:9222/json/list

```

Good result:

- `/json/version` returns JSON with Browser / Protocol-Version metadata

- `/json/list` returns JSON (empty array is fine if no pages are open)

If this fails:

- Windows is not exposing the port to WSL2 yet

- the address is wrong for the WSL2 side

- firewall / port forwarding / local proxying is still missing

Fix that before touching OpenClaw config.

### [​
](#layer-3-configure-the-correct-browser-profile)
Layer 3: Configure the correct browser profile

For raw remote CDP, point OpenClaw at the address that is reachable from WSL2:
Copy

```
{
  browser: {
    enabled: true,
    defaultProfile: "remote",
    profiles: {
      remote: {
        cdpUrl: "http://WINDOWS_HOST_OR_IP:9222",
        attachOnly: true,
        color: "#00AA00",
      },
    },
  },
}

```

Notes:

- use the WSL2-reachable address, not whatever only works on Windows

- keep `attachOnly: true` for externally managed browsers

- test the same URL with `curl` before expecting OpenClaw to succeed

### [​
](#layer-4-if-you-use-the-chrome-extension-relay-instead)
Layer 4: If you use the Chrome extension relay instead

If the browser machine and the Gateway are separated by a namespace boundary, the relay may need a non-loopback bind address.
Example:
Copy

```
{
  browser: {
    enabled: true,
    defaultProfile: "chrome",
    relayBindHost: "0.0.0.0",
  },
}

```

Use this only when needed:

- default behavior is safer because the relay stays loopback-only

- `0.0.0.0` expands exposure surface

- keep Gateway auth, node pairing, and the surrounding network private

If you do not need the extension relay, prefer the raw remote CDP profile above.

### [​
](#layer-5-verify-the-control-ui-layer-separately)
Layer 5: Verify the Control UI layer separately

Open the UI from Windows:
`http://127.0.0.1:18789/`
Then verify:

- the page origin matches what `gateway.controlUi.allowedOrigins` expects

- token auth or pairing is configured correctly

- you are not debugging a Control UI auth problem as if it were a browser problem

Helpful page:

- [Control UI](/web/control-ui)

### [​
](#layer-6-verify-end-to-end-browser-control)
Layer 6: Verify end-to-end browser control

From WSL2:
Copy

```
openclaw browser open https://example.com --browser-profile remote
openclaw browser tabs --browser-profile remote

```

For the extension relay:
Copy

```
openclaw browser tabs --browser-profile chrome

```

Good result:

- the tab opens in Windows Chrome

- `openclaw browser tabs` returns the target

- later actions (`snapshot`, `screenshot`, `navigate`) work from the same profile

## [​
](#common-misleading-errors)
Common misleading errors

Treat each message as a layer-specific clue:

- `control-ui-insecure-auth`

UI origin / secure-context problem, not a CDP transport problem

- `token_missing`

auth configuration problem

- `pairing required`

device approval problem

- `Remote CDP for profile "remote" is not reachable`

WSL2 cannot reach the configured `cdpUrl`

- `gateway timeout after 1500ms`

often still CDP reachability or a slow/unreachable remote endpoint

- `Chrome extension relay is running, but no tab is connected`

extension relay profile selected, but no attached tab exists yet

## [​
](#fast-triage-checklist)
Fast triage checklist

- Windows: does `curl http://127.0.0.1:9222/json/version` work?

- WSL2: does `curl http://WINDOWS_HOST_OR_IP:9222/json/version` work?

- OpenClaw config: does `browser.profiles.<name>.cdpUrl` use that exact WSL2-reachable address?

- Control UI: are you opening `http://127.0.0.1:18789/` instead of a LAN IP?

- Extension relay only: do you actually need `browser.relayBindHost`, and if so is it set explicitly?

## [​
](#practical-takeaway)
Practical takeaway

The setup is usually viable. The hard part is that browser transport, Control UI origin security, token/pairing, and extension-relay topology can each fail independently while looking similar from the user side.
When in doubt:

- verify the Windows Chrome endpoint locally first

- verify the same endpoint from WSL2 second

- only then debug OpenClaw config or Control UI auth

[Browser Troubleshooting](/tools/browser-linux-troubleshooting)[Agent Send](/tools/agent-send)
⌘I