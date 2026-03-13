# Remote Gateway Setup

Source: https://docs.openclaw.ai/gateway/remote-gateway-readme

---

Remote access

# Remote Gateway Setup

# [​
](#running-openclaw-app-with-a-remote-gateway)
Running OpenClaw.app with a Remote Gateway

OpenClaw.app uses SSH tunneling to connect to a remote gateway. This guide shows you how to set it up.

## [​
](#overview)
Overview

## [​
](#quick-setup)
Quick Setup

### [​
](#step-1-add-ssh-config)
Step 1: Add SSH Config

Edit `~/.ssh/config` and add:
Copy

```
Host remote-gateway
    HostName <REMOTE_IP>          # e.g., 172.27.187.184
    User <REMOTE_USER>            # e.g., jefferson
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa

```

Replace `<REMOTE_IP>` and `<REMOTE_USER>` with your values.

### [​
](#step-2-copy-ssh-key)
Step 2: Copy SSH Key

Copy your public key to the remote machine (enter password once):
Copy

```
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>

```

### [​
](#step-3-set-gateway-token)
Step 3: Set Gateway Token

Copy

```
launchctl setenv OPENCLAW_GATEWAY_TOKEN "<your-token>"

```

### [​
](#step-4-start-ssh-tunnel)
Step 4: Start SSH Tunnel

Copy

```
ssh -N remote-gateway &

```

### [​
](#step-5-restart-openclaw-app)
Step 5: Restart OpenClaw.app

Copy

```
# Quit OpenClaw.app (⌘Q), then reopen:
open /path/to/OpenClaw.app

```

The app will now connect to the remote gateway through the SSH tunnel.

## [​
](#auto-start-tunnel-on-login)
Auto-Start Tunnel on Login

To have the SSH tunnel start automatically when you log in, create a Launch Agent.

### [​
](#create-the-plist-file)
Create the PLIST file

Save this as `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`:
Copy

```
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>

```

### [​
](#load-the-launch-agent)
Load the Launch Agent

Copy

```
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist

```

The tunnel will now:

- Start automatically when you log in

- Restart if it crashes

- Keep running in the background

Legacy note: remove any leftover `com.openclaw.ssh-tunnel` LaunchAgent if present.

## [​
](#troubleshooting)
Troubleshooting

**Check if tunnel is running:**
Copy

```
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789

```

**Restart the tunnel:**
Copy

```
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel

```

**Stop the tunnel:**
Copy

```
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel

```

## [​
](#how-it-works)
How It Works

ComponentWhat It Does`LocalForward 18789 127.0.0.1:18789`Forwards local port 18789 to remote port 18789`ssh -N`SSH without executing remote commands (just port forwarding)`KeepAlive`Automatically restarts tunnel if it crashes`RunAtLoad`Starts tunnel when the agent loads

OpenClaw.app connects to `ws://127.0.0.1:18789` on your client machine. The SSH tunnel forwards that connection to port 18789 on the remote machine where the Gateway is running.
[Remote Access](/gateway/remote)[Tailscale](/gateway/tailscale)
⌘I