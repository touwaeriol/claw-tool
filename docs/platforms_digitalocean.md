# DigitalOcean

Source: https://docs.openclaw.ai/platforms/digitalocean

---

Platforms overview

# DigitalOcean

# [​
](#openclaw-on-digitalocean)
OpenClaw on DigitalOcean

## [​
](#goal)
Goal

Run a persistent OpenClaw Gateway on DigitalOcean for **6/month∗∗(or6/month** (or 6/month∗∗(or4/mo with reserved pricing).
If you want a $0/month option and don’t mind ARM + provider-specific setup, see the [Oracle Cloud guide](/platforms/oracle).

## [​
](#cost-comparison-2026)
Cost Comparison (2026)

ProviderPlanSpecsPrice/moNotesOracle CloudAlways Free ARMup to 4 OCPU, 24GB RAM$0ARM, limited capacity / signup quirksHetznerCX222 vCPU, 4GB RAM€3.79 (~$4)Cheapest paid optionDigitalOceanBasic1 vCPU, 1GB RAM$6Easy UI, good docsVultrCloud Compute1 vCPU, 1GB RAM$6Many locationsLinodeNanode1 vCPU, 1GB RAM$5Now part of Akamai

**Picking a provider:**

- DigitalOcean: simplest UX + predictable setup (this guide)

- Hetzner: good price/perf (see [Hetzner guide](/install/hetzner))

- Oracle Cloud: can be $0/month, but is more finicky and ARM-only (see [Oracle guide](/platforms/oracle))

## [​
](#prerequisites)
Prerequisites

- DigitalOcean account ([signup with $200 free credit](https://m.do.co/c/signup))

- SSH key pair (or willingness to use password auth)

- ~20 minutes

## [​
](#1-create-a-droplet)
1) Create a Droplet

Use a clean base image (Ubuntu 24.04 LTS). Avoid third-party Marketplace 1-click images unless you have reviewed their startup scripts and firewall defaults.

- Log into [DigitalOcean](https://cloud.digitalocean.com/)

- Click **Create → Droplets**

- Choose:

**Region:** Closest to you (or your users)

- **Image:** Ubuntu 24.04 LTS

- **Size:** Basic → Regular → **$6/mo** (1 vCPU, 1GB RAM, 25GB SSD)

- **Authentication:** SSH key (recommended) or password

- Click **Create Droplet**

- Note the IP address

## [​
](#2-connect-via-ssh)
2) Connect via SSH

Copy

```
ssh root@YOUR_DROPLET_IP

```

## [​
](#3-install-openclaw)
3) Install OpenClaw

Copy

```
# Update system
apt update && apt upgrade -y

# Install Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version

```

## [​
](#4-run-onboarding)
4) Run Onboarding

Copy

```
openclaw onboard --install-daemon

```

The wizard will walk you through:

- Model auth (API keys or OAuth)

- Channel setup (Telegram, WhatsApp, Discord, etc.)

- Gateway token (auto-generated)

- Daemon installation (systemd)

## [​
](#5-verify-the-gateway)
5) Verify the Gateway

Copy

```
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f

```

## [​
](#6-access-the-dashboard)
6) Access the Dashboard

The gateway binds to loopback by default. To access the Control UI:
**Option A: SSH Tunnel (recommended)**
Copy

```
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789

```

**Option B: Tailscale Serve (HTTPS, loopback-only)**
Copy

```
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart

```

Open: `https://<magicdns>/`
Notes:

- Serve keeps the Gateway loopback-only and authenticates Control UI/WebSocket traffic via Tailscale identity headers (tokenless auth assumes trusted gateway host; HTTP APIs still require token/password).

- To require token/password instead, set `gateway.auth.allowTailscale: false` or use `gateway.auth.mode: "password"`.

**Option C: Tailnet bind (no Serve)**
Copy

```
openclaw config set gateway.bind tailnet
openclaw gateway restart

```

Open: `http://<tailscale-ip>:18789` (token required).

## [​
](#7-connect-your-channels)
7) Connect Your Channels

### [​
](#telegram)
Telegram

Copy

```
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>

```

### [​
](#whatsapp)
WhatsApp

Copy

```
openclaw channels login whatsapp
# Scan QR code

```

See [Channels](/channels) for other providers.

## [​
](#optimizations-for-1gb-ram)
Optimizations for 1GB RAM

The $6 droplet only has 1GB RAM. To keep things running smoothly:

### [​
](#add-swap-recommended)
Add swap (recommended)

Copy

```
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo &#x27;/swapfile none swap sw 0 0&#x27; >> /etc/fstab

```

### [​
](#use-a-lighter-model)
Use a lighter model

If you’re hitting OOMs, consider:

- Using API-based models (Claude, GPT) instead of local models

- Setting `agents.defaults.model.primary` to a smaller model

### [​
](#monitor-memory)
Monitor memory

Copy

```
free -h
htop

```

## [​
](#persistence)
Persistence

All state lives in:

- `~/.openclaw/` — config, credentials, session data

- `~/.openclaw/workspace/` — workspace (SOUL.md, memory, etc.)

These survive reboots. Back them up periodically:
Copy

```
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace

```

## [​
](#oracle-cloud-free-alternative)
Oracle Cloud Free Alternative

Oracle Cloud offers **Always Free** ARM instances that are significantly more powerful than any paid option here — for $0/month.
What you getSpecs**4 OCPUs**ARM Ampere A1**24GB RAM**More than enough**200GB storage**Block volume**Forever free**No credit card charges

**Caveats:**

- Signup can be finicky (retry if it fails)

- ARM architecture — most things work, but some binaries need ARM builds

For the full setup guide, see [Oracle Cloud](/platforms/oracle). For signup tips and troubleshooting the enrollment process, see this [community guide](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd).

## [​
](#troubleshooting)
Troubleshooting

### [​
](#gateway-won’t-start)
Gateway won’t start

Copy

```
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50

```

### [​
](#port-already-in-use)
Port already in use

Copy

```
lsof -i :18789
kill <PID>

```

### [​
](#out-of-memory)
Out of memory

Copy

```
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)

```

## [​
](#see-also)
See Also

- [Hetzner guide](/install/hetzner) — cheaper, more powerful

- [Docker install](/install/docker) — containerized setup

- [Tailscale](/gateway/tailscale) — secure remote access

- [Configuration](/gateway/configuration) — full config reference

[iOS App](/platforms/ios)[Oracle Cloud](/platforms/oracle)
⌘I