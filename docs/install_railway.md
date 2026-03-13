# Deploy on Railway

Source: https://docs.openclaw.ai/install/railway

---

Hosting and deployment

# Deploy on Railway

Deploy OpenClaw on Railway with a one-click template and finish setup in your browser.
This is the easiest “no terminal on the server” path: Railway runs the Gateway for you,
and you configure everything via the `/setup` web wizard.

## [​
](#quick-checklist-new-users)
Quick checklist (new users)

- Click **Deploy on Railway** (below).

- Add a **Volume** mounted at `/data`.

- Set the required **Variables** (at least `SETUP_PASSWORD`).

- Enable **HTTP Proxy** on port `8080`.

- Open `https://<your-railway-domain>/setup` and finish the wizard.

## [​
](#one-click-deploy)
One-click deploy

[Deploy on Railway](https://railway.com/deploy/clawdbot-railway-template)
After deploy, find your public URL in **Railway → your service → Settings → Domains**.
Railway will either:

- give you a generated domain (often `https://<something>.up.railway.app`), or

- use your custom domain if you attached one.

Then open:

- `https://<your-railway-domain>/setup` — setup wizard (password protected)

- `https://<your-railway-domain>/openclaw` — Control UI

## [​
](#what-you-get)
What you get

- Hosted OpenClaw Gateway + Control UI

- Web setup wizard at `/setup` (no terminal commands)

- Persistent storage via Railway Volume (`/data`) so config/credentials/workspace survive redeploys

- Backup export at `/setup/export` to migrate off Railway later

## [​
](#required-railway-settings)
Required Railway settings

### [​
](#public-networking)
Public Networking

Enable **HTTP Proxy** for the service.

- Port: `8080`

### [​
](#volume-required)
Volume (required)

Attach a volume mounted at:

- `/data`

### [​
](#variables)
Variables

Set these variables on the service:

- `SETUP_PASSWORD` (required)

- `PORT=8080` (required — must match the port in Public Networking)

- `OPENCLAW_STATE_DIR=/data/.openclaw` (recommended)

- `OPENCLAW_WORKSPACE_DIR=/data/workspace` (recommended)

- `OPENCLAW_GATEWAY_TOKEN` (recommended; treat as an admin secret)

## [​
](#setup-flow)
Setup flow

- Visit `https://<your-railway-domain>/setup` and enter your `SETUP_PASSWORD`.

- Choose a model/auth provider and paste your key.

- (Optional) Add Telegram/Discord/Slack tokens.

- Click **Run setup**.

If Telegram DMs are set to pairing, the setup wizard can approve the pairing code.

## [​
](#getting-chat-tokens)
Getting chat tokens

### [​
](#telegram-bot-token)
Telegram bot token

- Message `@BotFather` in Telegram

- Run `/newbot`

- Copy the token (looks like `123456789:AA...`)

- Paste it into `/setup`

### [​
](#discord-bot-token)
Discord bot token

- Go to [https://discord.com/developers/applications](https://discord.com/developers/applications)

- **New Application** → choose a name

- **Bot** → **Add Bot**

- **Enable MESSAGE CONTENT INTENT** under Bot → Privileged Gateway Intents (required or the bot will crash on startup)

- Copy the **Bot Token** and paste into `/setup`

- Invite the bot to your server (OAuth2 URL Generator; scopes: `bot`, `applications.commands`)

## [​
](#backups-&-migration)
Backups & migration

Download a backup at:

- `https://<your-railway-domain>/setup/export`

This exports your OpenClaw state + workspace so you can migrate to another host without losing config or memory.
[exe.dev](/install/exe-dev)[Deploy on Render](/install/render)
⌘I