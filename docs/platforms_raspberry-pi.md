# Raspberry Pi

Source: https://docs.openclaw.ai/platforms/raspberry-pi

---

Platforms overview

# Raspberry Pi

# [​
](#openclaw-on-raspberry-pi)
OpenClaw on Raspberry Pi

## [​
](#goal)
Goal

Run a persistent, always-on OpenClaw Gateway on a Raspberry Pi for **~$35-80** one-time cost (no monthly fees).
Perfect for:

- 24/7 personal AI assistant

- Home automation hub

- Low-power, always-available Telegram/WhatsApp bot

## [​
](#hardware-requirements)
Hardware Requirements

Pi ModelRAMWorks?Notes**Pi 5**4GB/8GB✅ BestFastest, recommended**Pi 4**4GB✅ GoodSweet spot for most users**Pi 4**2GB✅ OKWorks, add swap**Pi 4**1GB⚠️ TightPossible with swap, minimal config**Pi 3B+**1GB⚠️ SlowWorks but sluggish**Pi Zero 2 W**512MB❌Not recommended

**Minimum specs:** 1GB RAM, 1 core, 500MB disk

**Recommended:** 2GB+ RAM, 64-bit OS, 16GB+ SD card (or USB SSD)

## [​
](#what-you’ll-need)
What You’ll Need

- Raspberry Pi 4 or 5 (2GB+ recommended)

- MicroSD card (16GB+) or USB SSD (better performance)

- Power supply (official Pi PSU recommended)

- Network connection (Ethernet or WiFi)

- ~30 minutes

## [​
](#1-flash-the-os)
1) Flash the OS

Use **Raspberry Pi OS Lite (64-bit)** — no desktop needed for a headless server.

- Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)

- Choose OS: **Raspberry Pi OS Lite (64-bit)**

- Click the gear icon (⚙️) to pre-configure:

Set hostname: `gateway-host`

- Enable SSH

- Set username/password

- Configure WiFi (if not using Ethernet)

- Flash to your SD card / USB drive

- Insert and boot the Pi

## [​
](#2-connect-via-ssh)
2) Connect via SSH

Copy

```
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x

```

## [​
](#3-system-setup)
3) System Setup

Copy

```
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone

```

## [​
](#4-install-node-js-22-arm64)
4) Install Node.js 22 (ARM64)

Copy

```
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v22.x.x
npm --version

```

## [​
](#5-add-swap-important-for-2gb-or-less)
5) Add Swap (Important for 2GB or less)

Swap prevents out-of-memory crashes:
Copy

```
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo &#x27;/swapfile none swap sw 0 0&#x27; | sudo tee -a /etc/fstab

# Optimize for low RAM (reduce swappiness)
echo &#x27;vm.swappiness=10&#x27; | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

```

## [​
](#6-install-openclaw)
6) Install OpenClaw

### [​
](#option-a-standard-install-recommended)
Option A: Standard Install (Recommended)

Copy

```
curl -fsSL https://openclaw.ai/install.sh | bash

```

### [​
](#option-b-hackable-install-for-tinkering)
Option B: Hackable Install (For tinkering)

Copy

```
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link

```

The hackable install gives you direct access to logs and code — useful for debugging ARM-specific issues.

## [​
](#7-run-onboarding)
7) Run Onboarding

Copy

```
openclaw onboard --install-daemon

```

Follow the wizard:

- **Gateway mode:** Local

- **Auth:** API keys recommended (OAuth can be finicky on headless Pi)

- **Channels:** Telegram is easiest to start with

- **Daemon:** Yes (systemd)

## [​
](#8-verify-installation)
8) Verify Installation

Copy

```
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f

```

## [​
](#9-access-the-dashboard)
9) Access the Dashboard

Since the Pi is headless, use an SSH tunnel:
Copy

```
# From your laptop/desktop
ssh -L 18789:localhost:18789 user@gateway-host

# Then open in browser
open http://localhost:18789

```

Or use Tailscale for always-on access:
Copy

```
# On the Pi
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Update config
openclaw config set gateway.bind tailnet
sudo systemctl restart openclaw

```

## [​
](#performance-optimizations)
Performance Optimizations

### [​
](#use-a-usb-ssd-huge-improvement)
Use a USB SSD (Huge Improvement)

SD cards are slow and wear out. A USB SSD dramatically improves performance:
Copy

```
# Check if booting from USB
lsblk

```

See [Pi USB boot guide](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) for setup.

### [​
](#speed-up-cli-startup-module-compile-cache)
Speed up CLI startup (module compile cache)

On lower-power Pi hosts, enable Node’s module compile cache so repeated CLI runs are faster:
Copy

```
grep -q &#x27;NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache&#x27; ~/.bashrc || cat >> ~/.bashrc <<&#x27;EOF&#x27; # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc

```

Notes:

- `NODE_COMPILE_CACHE` speeds up subsequent runs (`status`, `health`, `--help`).

- `/var/tmp` survives reboots better than `/tmp`.

- `OPENCLAW_NO_RESPAWN=1` avoids extra startup cost from CLI self-respawn.

- First run warms the cache; later runs benefit most.

### [​
](#systemd-startup-tuning-optional)
systemd startup tuning (optional)

If this Pi is mostly running OpenClaw, add a service drop-in to reduce restart
jitter and keep startup env stable:
Copy

```
sudo systemctl edit openclaw

```

Copy

```
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90

```

Then apply:
Copy

```
sudo systemctl daemon-reload
sudo systemctl restart openclaw

```

If possible, keep OpenClaw state/cache on SSD-backed storage to avoid SD-card
random-I/O bottlenecks during cold starts.
How `Restart=` policies help automated recovery:
[systemd can automate service recovery](https://www.redhat.com/en/blog/systemd-automate-recovery).

### [​
](#reduce-memory-usage)
Reduce Memory Usage

Copy

```
# Disable GPU memory allocation (headless)
echo &#x27;gpu_mem=16&#x27; | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth

```

### [​
](#monitor-resources)
Monitor Resources

Copy

```
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop

```

## [​
](#arm-specific-notes)
ARM-Specific Notes

### [​
](#binary-compatibility)
Binary Compatibility

Most OpenClaw features work on ARM64, but some external binaries may need ARM builds:
ToolARM64 StatusNotesNode.js✅Works greatWhatsApp (Baileys)✅Pure JS, no issuesTelegram✅Pure JS, no issuesgog (Gmail CLI)⚠️Check for ARM releaseChromium (browser)✅`sudo apt install chromium-browser`

If a skill fails, check if its binary has an ARM build. Many Go/Rust tools do; some don’t.

### [​
](#32-bit-vs-64-bit)
32-bit vs 64-bit

**Always use 64-bit OS.** Node.js and many modern tools require it. Check with:
Copy

```
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)

```

## [​
](#recommended-model-setup)
Recommended Model Setup

Since the Pi is just the Gateway (models run in the cloud), use API-based models:
Copy

```
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}

```

**Don’t try to run local LLMs on a Pi** — even small models are too slow. Let Claude/GPT do the heavy lifting.

## [​
](#auto-start-on-boot)
Auto-Start on Boot

The onboarding wizard sets this up, but to verify:
Copy

```
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw

```

## [​
](#troubleshooting)
Troubleshooting

### [​
](#out-of-memory-oom)
Out of Memory (OOM)

Copy

```
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi

```

### [​
](#slow-performance)
Slow Performance

- Use USB SSD instead of SD card

- Disable unused services: `sudo systemctl disable cups bluetooth avahi-daemon`

- Check CPU throttling: `vcgencmd get_throttled` (should return `0x0`)

### [​
](#service-won’t-start)
Service Won’t Start

Copy

```
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw

```

### [​
](#arm-binary-issues)
ARM Binary Issues

If a skill fails with “exec format error”:

- Check if the binary has an ARM64 build

- Try building from source

- Or use a Docker container with ARM support

### [​
](#wifi-drops)
WiFi Drops

For headless Pis on WiFi:
Copy

```
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo &#x27;wireless-power off&#x27; | sudo tee -a /etc/network/interfaces

```

## [​
](#cost-comparison)
Cost Comparison

SetupOne-Time CostMonthly CostNotes**Pi 4 (2GB)**~$45$0+ power (~$5/yr)**Pi 4 (4GB)**~$55$0Recommended**Pi 5 (4GB)**~$60$0Best performance**Pi 5 (8GB)**~$80$0Overkill but future-proofDigitalOcean$0$6/mo$72/yearHetzner$0€3.79/mo~$50/year

**Break-even:** A Pi pays for itself in ~6-12 months vs cloud VPS.

## [​
](#see-also)
See Also

- [Linux guide](/platforms/linux) — general Linux setup

- [DigitalOcean guide](/platforms/digitalocean) — cloud alternative

- [Hetzner guide](/install/hetzner) — Docker setup

- [Tailscale](/gateway/tailscale) — remote access

- [Nodes](/nodes) — pair your laptop/phone with the Pi gateway

[Oracle Cloud](/platforms/oracle)[macOS Dev Setup](/platforms/mac/dev-setup)
⌘I