# Oracle Cloud

Source: https://docs.openclaw.ai/platforms/oracle

---

Platforms overview

# Oracle Cloud

# [​
](#openclaw-on-oracle-cloud-oci)
OpenClaw on Oracle Cloud (OCI)

## [​
](#goal)
Goal

Run a persistent OpenClaw Gateway on Oracle Cloud’s **Always Free** ARM tier.
Oracle’s free tier can be a great fit for OpenClaw (especially if you already have an OCI account), but it comes with tradeoffs:

- ARM architecture (most things work, but some binaries may be x86-only)

- Capacity and signup can be finicky

## [​
](#cost-comparison-2026)
Cost Comparison (2026)

ProviderPlanSpecsPrice/moNotesOracle CloudAlways Free ARMup to 4 OCPU, 24GB RAM$0ARM, limited capacityHetznerCX222 vCPU, 4GB RAM~ $4Cheapest paid optionDigitalOceanBasic1 vCPU, 1GB RAM$6Easy UI, good docsVultrCloud Compute1 vCPU, 1GB RAM$6Many locationsLinodeNanode1 vCPU, 1GB RAM$5Now part of Akamai

## [​
](#prerequisites)
Prerequisites

- Oracle Cloud account ([signup](https://www.oracle.com/cloud/free/)) — see [community signup guide](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) if you hit issues

- Tailscale account (free at [tailscale.com](https://tailscale.com))

- ~30 minutes

## [​
](#1-create-an-oci-instance)
1) Create an OCI Instance

- Log into [Oracle Cloud Console](https://cloud.oracle.com/)

- Navigate to **Compute → Instances → Create Instance**

- Configure:

**Name:** `openclaw`

- **Image:** Ubuntu 24.04 (aarch64)

- **Shape:** `VM.Standard.A1.Flex` (Ampere ARM)

- **OCPUs:** 2 (or up to 4)

- **Memory:** 12 GB (or up to 24 GB)

- **Boot volume:** 50 GB (up to 200 GB free)

- **SSH key:** Add your public key

- Click **Create**

- Note the public IP address

**Tip:** If instance creation fails with “Out of capacity”, try a different availability domain or retry later. Free tier capacity is limited.

## [​
](#2-connect-and-update)
2) Connect and Update

Copy

```
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential

```

**Note:** `build-essential` is required for ARM compilation of some dependencies.

## [​
](#3-configure-user-and-hostname)
3) Configure User and Hostname

Copy

```
# Set hostname
sudo hostnamectl set-hostname openclaw

# Set password for ubuntu user
sudo passwd ubuntu

# Enable lingering (keeps user services running after logout)
sudo loginctl enable-linger ubuntu

```

## [​
](#4-install-tailscale)
4) Install Tailscale

Copy

```
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw

```

This enables Tailscale SSH, so you can connect via `ssh openclaw` from any device on your tailnet — no public IP needed.
Verify:
Copy

```
tailscale status

```

**From now on, connect via Tailscale:** `ssh ubuntu@openclaw` (or use the Tailscale IP).

## [​
](#5-install-openclaw)
5) Install OpenClaw

Copy

```
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc

```

When prompted “How do you want to hatch your bot?”, select **“Do this later”**.

Note: If you hit ARM-native build issues, start with system packages (e.g. `sudo apt install -y build-essential`) before reaching for Homebrew.

## [​
](#6-configure-gateway-loopback-+-token-auth-and-enable-tailscale-serve)
6) Configure Gateway (loopback + token auth) and enable Tailscale Serve

Use token auth as the default. It’s predictable and avoids needing any “insecure auth” Control UI flags.
Copy

```
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies &#x27;["127.0.0.1"]&#x27;

systemctl --user restart openclaw-gateway

```

## [​
](#7-verify)
7) Verify

Copy

```
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789

```

## [​
](#8-lock-down-vcn-security)
8) Lock Down VCN Security

Now that everything is working, lock down the VCN to block all traffic except Tailscale. OCI’s Virtual Cloud Network acts as a firewall at the network edge — traffic is blocked before it reaches your instance.

- Go to **Networking → Virtual Cloud Networks** in the OCI Console

- Click your VCN → **Security Lists** → Default Security List

- **Remove** all ingress rules except:

`0.0.0.0/0 UDP 41641` (Tailscale)

- Keep default egress rules (allow all outbound)

This blocks SSH on port 22, HTTP, HTTPS, and everything else at the network edge. From now on, you can only connect via Tailscale.

## [​
](#access-the-control-ui)
Access the Control UI

From any device on your Tailscale network:
Copy

```
https://openclaw.<tailnet-name>.ts.net/

```

Replace `<tailnet-name>` with your tailnet name (visible in `tailscale status`).
No SSH tunnel needed. Tailscale provides:

- HTTPS encryption (automatic certs)

- Authentication via Tailscale identity

- Access from any device on your tailnet (laptop, phone, etc.)

## [​
](#security-vcn-+-tailscale-recommended-baseline)
Security: VCN + Tailscale (recommended baseline)

With the VCN locked down (only UDP 41641 open) and the Gateway bound to loopback, you get strong defense-in-depth: public traffic is blocked at the network edge, and admin access happens over your tailnet.
This setup often removes the *need* for extra host-based firewall rules purely to stop Internet-wide SSH brute force — but you should still keep the OS updated, run `openclaw security audit`, and verify you aren’t accidentally listening on public interfaces.

### [​
](#what’s-already-protected)
What’s Already Protected

Traditional StepNeeded?WhyUFW firewallNoVCN blocks before traffic reaches instancefail2banNoNo brute force if port 22 blocked at VCNsshd hardeningNoTailscale SSH doesn’t use sshdDisable root loginNoTailscale uses Tailscale identity, not system usersSSH key-only authNoTailscale authenticates via your tailnetIPv6 hardeningUsually notDepends on your VCN/subnet settings; verify what’s actually assigned/exposed

### [​
](#still-recommended)
Still Recommended

- **Credential permissions:** `chmod 700 ~/.openclaw`

- **Security audit:** `openclaw security audit`

- **System updates:** `sudo apt update && sudo apt upgrade` regularly

- **Monitor Tailscale:** Review devices in [Tailscale admin console](https://login.tailscale.com/admin)

### [​
](#verify-security-posture)
Verify Security Posture

Copy

```
# Confirm no public ports listening
sudo ss -tlnp | grep -v &#x27;127.0.0.1\|::1&#x27;

# Verify Tailscale SSH is active
tailscale status | grep -q &#x27;offers: ssh&#x27; && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh

```

## [​
](#fallback-ssh-tunnel)
Fallback: SSH Tunnel

If Tailscale Serve isn’t working, use an SSH tunnel:
Copy

```
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw

```

Then open `http://localhost:18789`.

## [​
](#troubleshooting)
Troubleshooting

### [​
](#instance-creation-fails-“out-of-capacity”)
Instance creation fails (“Out of capacity”)

Free tier ARM instances are popular. Try:

- Different availability domain

- Retry during off-peak hours (early morning)

- Use the “Always Free” filter when selecting shape

### [​
](#tailscale-won’t-connect)
Tailscale won’t connect

Copy

```
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset

```

### [​
](#gateway-won’t-start)
Gateway won’t start

Copy

```
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway -n 50

```

### [​
](#can’t-reach-control-ui)
Can’t reach Control UI

Copy

```
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway

```

### [​
](#arm-binary-issues)
ARM binary issues

Some tools may not have ARM builds. Check:
Copy

```
uname -m  # Should show aarch64

```

Most npm packages work fine. For binaries, look for `linux-arm64` or `aarch64` releases.

## [​
](#persistence)
Persistence

All state lives in:

- `~/.openclaw/` — config, credentials, session data

- `~/.openclaw/workspace/` — workspace (SOUL.md, memory, artifacts)

Back up periodically:
Copy

```
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace

```

## [​
](#see-also)
See Also

- [Gateway remote access](/gateway/remote) — other remote access patterns

- [Tailscale integration](/gateway/tailscale) — full Tailscale docs

- [Gateway configuration](/gateway/configuration) — all config options

- [DigitalOcean guide](/platforms/digitalocean) — if you want paid + easier signup

- [Hetzner guide](/install/hetzner) — Docker-based alternative

[DigitalOcean](/platforms/digitalocean)[Raspberry Pi](/platforms/raspberry-pi)
⌘I