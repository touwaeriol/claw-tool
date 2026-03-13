# Deploy on Northflank

Source: https://docs.openclaw.ai/install/northflank

---

Hosting and deployment

# Deploy on Northflank

Deploy OpenClaw on Northflank with a one-click template and finish setup in your browser.
This is the easiest “no terminal on the server” path: Northflank runs the Gateway for you,
and you configure everything via the `/setup` web wizard.

## [​
](#how-to-get-started)
How to get started

- Click [Deploy OpenClaw](https://northflank.com/stacks/deploy-openclaw) to open the template.

- Create an [account on Northflank](https://app.northflank.com/signup) if you don’t already have one.

- Click **Deploy OpenClaw now**.

- Set the required environment variable: `SETUP_PASSWORD`.

- Click **Deploy stack** to build and run the OpenClaw template.

- Wait for the deployment to complete, then click **View resources**.

- Open the OpenClaw service.

- Open the public OpenClaw URL and complete setup at `/setup`.

- Open the Control UI at `/openclaw`.

## [​
](#what-you-get)
What you get

- Hosted OpenClaw Gateway + Control UI

- Web setup wizard at `/setup` (no terminal commands)

- Persistent storage via Northflank Volume (`/data`) so config/credentials/workspace survive redeploys

## [​
](#setup-flow)
Setup flow

- Visit `https://<your-northflank-domain>/setup` and enter your `SETUP_PASSWORD`.

- Choose a model/auth provider and paste your key.

- (Optional) Add Telegram/Discord/Slack tokens.

- Click **Run setup**.

- Open the Control UI at `https://<your-northflank-domain>/openclaw`

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

[Deploy on Render](/install/render)[Development Channels](/install/development-channels)
⌘I