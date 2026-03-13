# Tailscale

Source: https://docs.openclaw.ai/gateway/tailscale

---

Remote access

# Tailscale

# [​
](#tailscale-gateway-dashboard)
Tailscale (Gateway dashboard)

OpenClaw can auto-configure Tailscale **Serve** (tailnet) or **Funnel** (public) for the
Gateway dashboard and WebSocket port. This keeps the Gateway bound to loopback while
Tailscale provides HTTPS, routing, and (for Serve) identity headers.

## [​
](#modes)
Modes

- `serve`: Tailnet-only Serve via `tailscale serve`. The gateway stays on `127.0.0.1`.

- `funnel`: Public HTTPS via `tailscale funnel`. OpenClaw requires a shared password.

- `off`: Default (no Tailscale automation).

## [​
](#auth)
Auth

Set `gateway.auth.mode` to control the handshake:

- `token` (default when `OPENCLAW_GATEWAY_TOKEN` is set)

- `password` (shared secret via `OPENCLAW_GATEWAY_PASSWORD` or config)

When `tailscale.mode = "serve"` and `gateway.auth.allowTailscale` is `true`,
Control UI/WebSocket auth can use Tailscale identity headers
(`tailscale-user-login`) without supplying a token/password. OpenClaw verifies
the identity by resolving the `x-forwarded-for` address via the local Tailscale
daemon (`tailscale whois`) and matching it to the header before accepting it.
OpenClaw only treats a request as Serve when it arrives from loopback with
Tailscale’s `x-forwarded-for`, `x-forwarded-proto`, and `x-forwarded-host`
headers.
HTTP API endpoints (for example `/v1/*`, `/tools/invoke`, and `/api/channels/*`)
still require token/password auth.
This tokenless flow assumes the gateway host is trusted. If untrusted local code
may run on the same host, disable `gateway.auth.allowTailscale` and require
token/password auth instead.
To require explicit credentials, set `gateway.auth.allowTailscale: false` or
force `gateway.auth.mode: "password"`.

## [​
](#config-examples)
Config examples

### [​
](#tailnet-only-serve)
Tailnet-only (Serve)

Copy

```
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}

```

Open: `https://<magicdns>/` (or your configured `gateway.controlUi.basePath`)

### [​
](#tailnet-only-bind-to-tailnet-ip)
Tailnet-only (bind to Tailnet IP)

Use this when you want the Gateway to listen directly on the Tailnet IP (no Serve/Funnel).
Copy

```
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}

```

Connect from another Tailnet device:

- Control UI: `http://<tailscale-ip>:18789/`

- WebSocket: `ws://<tailscale-ip>:18789`

Note: loopback (`http://127.0.0.1:18789`) will **not** work in this mode.

### [​
](#public-internet-funnel-+-shared-password)
Public internet (Funnel + shared password)

Copy

```
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}

```

Prefer `OPENCLAW_GATEWAY_PASSWORD` over committing a password to disk.

## [​
](#cli-examples)
CLI examples

Copy

```
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password

```

## [​
](#notes)
Notes

- Tailscale Serve/Funnel requires the `tailscale` CLI to be installed and logged in.

- `tailscale.mode: "funnel"` refuses to start unless auth mode is `password` to avoid public exposure.

- Set `gateway.tailscale.resetOnExit` if you want OpenClaw to undo `tailscale serve`
or `tailscale funnel` configuration on shutdown.

- `gateway.bind: "tailnet"` is a direct Tailnet bind (no HTTPS, no Serve/Funnel).

- `gateway.bind: "auto"` prefers loopback; use `tailnet` if you want Tailnet-only.

- Serve/Funnel only expose the **Gateway control UI + WS**. Nodes connect over
the same Gateway WS endpoint, so Serve can work for node access.

## [​
](#browser-control-remote-gateway-+-local-browser)
Browser control (remote Gateway + local browser)

If you run the Gateway on one machine but want to drive a browser on another machine,
run a **node host** on the browser machine and keep both on the same tailnet.
The Gateway will proxy browser actions to the node; no separate control server or Serve URL needed.
Avoid Funnel for browser control; treat node pairing like operator access.

## [​
](#tailscale-prerequisites-+-limits)
Tailscale prerequisites + limits

- Serve requires HTTPS enabled for your tailnet; the CLI prompts if it is missing.

- Serve injects Tailscale identity headers; Funnel does not.

- Funnel requires Tailscale v1.38.3+, MagicDNS, HTTPS enabled, and a funnel node attribute.

- Funnel only supports ports `443`, `8443`, and `10000` over TLS.

- Funnel on macOS requires the open-source Tailscale app variant.

## [​
](#learn-more)
Learn more

- Tailscale Serve overview: [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)

- `tailscale serve` command: [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)

- Tailscale Funnel overview: [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)

- `tailscale funnel` command: [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

[Remote Gateway Setup](/gateway/remote-gateway-readme)[Formal Verification (Security Models)](/security/formal-verification)
⌘I