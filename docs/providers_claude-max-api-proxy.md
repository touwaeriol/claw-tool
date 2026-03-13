# Claude Max API Proxy

Source: https://docs.openclaw.ai/providers/claude-max-api-proxy

---

Providers

# Claude Max API Proxy

# [​
](#claude-max-api-proxy)
Claude Max API Proxy

**claude-max-api-proxy** is a community tool that exposes your Claude Max/Pro subscription as an OpenAI-compatible API endpoint. This allows you to use your subscription with any tool that supports the OpenAI API format.

This path is technical compatibility only. Anthropic has blocked some subscription
usage outside Claude Code in the past. You must decide for yourself whether to use
it and verify Anthropic’s current terms before relying on it.

## [​
](#why-use-this)
Why Use This?

ApproachCostBest ForAnthropic APIPay per token (~15/Minput,15/M input, 15/Minput,75/M output for Opus)Production apps, high volumeClaude Max subscription$200/month flatPersonal use, development, unlimited usage

If you have a Claude Max subscription and want to use it with OpenAI-compatible tools, this proxy may reduce cost for some workflows. API keys remain the clearer policy path for production use.

## [​
](#how-it-works)
How It Works

Copy

```
Your App → claude-max-api-proxy → Claude Code CLI → Anthropic (via subscription)
     (OpenAI format)              (converts format)      (uses your login)

```

The proxy:

- Accepts OpenAI-format requests at `http://localhost:3456/v1/chat/completions`

- Converts them to Claude Code CLI commands

- Returns responses in OpenAI format (streaming supported)

## [​
](#installation)
Installation

Copy

```
# Requires Node.js 20+ and Claude Code CLI
npm install -g claude-max-api-proxy

# Verify Claude CLI is authenticated
claude --version

```

## [​
](#usage)
Usage

### [​
](#start-the-server)
Start the server

Copy

```
claude-max-api
# Server runs at http://localhost:3456

```

### [​
](#test-it)
Test it

Copy

```
# Health check
curl http://localhost:3456/health

# List models
curl http://localhost:3456/v1/models

# Chat completion
curl http://localhost:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d &#x27;{
    "model": "claude-opus-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }&#x27;

```

### [​
](#with-openclaw)
With OpenClaw

You can point OpenClaw at the proxy as a custom OpenAI-compatible endpoint:
Copy

```
{
  env: {
    OPENAI_API_KEY: "not-needed",
    OPENAI_BASE_URL: "http://localhost:3456/v1",
  },
  agents: {
    defaults: {
      model: { primary: "openai/claude-opus-4" },
    },
  },
}

```

## [​
](#available-models)
Available Models

Model IDMaps To`claude-opus-4`Claude Opus 4`claude-sonnet-4`Claude Sonnet 4`claude-haiku-4`Claude Haiku 4

## [​
](#auto-start-on-macos)
Auto-Start on macOS

Create a LaunchAgent to run the proxy automatically:
Copy

```
cat > ~/Library/LaunchAgents/com.claude-max-api.plist << &#x27;EOF&#x27;
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.claude-max-api</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string>/usr/local/lib/node_modules/claude-max-api-proxy/dist/server/standalone.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:~/.local/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
EOF

launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.claude-max-api.plist

```

## [​
](#links)
Links

- **npm:** [https://www.npmjs.com/package/claude-max-api-proxy](https://www.npmjs.com/package/claude-max-api-proxy)

- **GitHub:** [https://github.com/atalovesyou/claude-max-api-proxy](https://github.com/atalovesyou/claude-max-api-proxy)

- **Issues:** [https://github.com/atalovesyou/claude-max-api-proxy/issues](https://github.com/atalovesyou/claude-max-api-proxy/issues)

## [​
](#notes)
Notes

- This is a **community tool**, not officially supported by Anthropic or OpenClaw

- Requires an active Claude Max/Pro subscription with Claude Code CLI authenticated

- The proxy runs locally and does not send data to any third-party servers

- Streaming responses are fully supported

## [​
](#see-also)
See Also

- [Anthropic provider](/providers/anthropic) - Native OpenClaw integration with Claude setup-token or API keys

- [OpenAI provider](/providers/openai) - For OpenAI/Codex subscriptions

[Cloudflare AI Gateway](/providers/cloudflare-ai-gateway)[Deepgram](/providers/deepgram)
⌘I