# OpenCode Zen

Source: https://docs.openclaw.ai/providers/opencode

---

Providers

# OpenCode Zen

# [​
](#opencode-zen)
OpenCode Zen

OpenCode Zen is a **curated list of models** recommended by the OpenCode team for coding agents.
It is an optional, hosted model access path that uses an API key and the `opencode` provider.
Zen is currently in beta.

## [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice opencode-zen
# or non-interactive
openclaw onboard --opencode-zen-api-key "$OPENCODE_API_KEY"

```

## [​
](#config-snippet)
Config snippet

Copy

```
{
  env: { OPENCODE_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "opencode/claude-opus-4-6" } } },
}

```

## [​
](#notes)
Notes

- `OPENCODE_ZEN_API_KEY` is also supported.

- You sign in to Zen, add billing details, and copy your API key.

- OpenCode Zen bills per request; check the OpenCode dashboard for details.

[OpenAI](/providers/openai)[OpenRouter](/providers/openrouter)
⌘I