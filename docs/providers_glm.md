# GLM Models

Source: https://docs.openclaw.ai/providers/glm

---

Providers

# GLM Models

# [​
](#glm-models)
GLM models

GLM is a **model family** (not a company) available through the Z.AI platform. In OpenClaw, GLM
models are accessed via the `zai` provider and model IDs like `zai/glm-5`.

## [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice zai-api-key

```

## [​
](#config-snippet)
Config snippet

Copy

```
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5" } } },
}

```

## [​
](#notes)
Notes

- GLM versions and availability can change; check Z.AI’s docs for the latest.

- Example model IDs include `glm-5`, `glm-4.7`, and `glm-4.6`.

- For provider details, see [/providers/zai](/providers/zai).

[Litellm](/providers/litellm)[MiniMax](/providers/minimax)
⌘I