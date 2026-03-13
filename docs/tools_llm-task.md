# LLM Task

Source: https://docs.openclaw.ai/tools/llm-task

---

Built-in tools

# LLM Task

# [​
](#llm-task)
LLM Task

`llm-task` is an **optional plugin tool** that runs a JSON-only LLM task and
returns structured output (optionally validated against JSON Schema).
This is ideal for workflow engines like Lobster: you can add a single LLM step
without writing custom OpenClaw code for each workflow.

## [​
](#enable-the-plugin)
Enable the plugin

- Enable the plugin:

Copy

```
{
  "plugins": {
    "entries": {
      "llm-task": { "enabled": true }
    }
  }
}

```

- Allowlist the tool (it is registered with `optional: true`):

Copy

```
{
  "agents": {
    "list": [
      {
        "id": "main",
        "tools": { "allow": ["llm-task"] }
      }
    ]
  }
}

```

## [​
](#config-optional)
Config (optional)

Copy

```
{
  "plugins": {
    "entries": {
      "llm-task": {
        "enabled": true,
        "config": {
          "defaultProvider": "openai-codex",
          "defaultModel": "gpt-5.4",
          "defaultAuthProfileId": "main",
          "allowedModels": ["openai-codex/gpt-5.4"],
          "maxTokens": 800,
          "timeoutMs": 30000
        }
      }
    }
  }
}

```

`allowedModels` is an allowlist of `provider/model` strings. If set, any request
outside the list is rejected.

## [​
](#tool-parameters)
Tool parameters

- `prompt` (string, required)

- `input` (any, optional)

- `schema` (object, optional JSON Schema)

- `provider` (string, optional)

- `model` (string, optional)

- `authProfileId` (string, optional)

- `temperature` (number, optional)

- `maxTokens` (number, optional)

- `timeoutMs` (number, optional)

## [​
](#output)
Output

Returns `details.json` containing the parsed JSON (and validates against
`schema` when provided).

## [​
](#example-lobster-workflow-step)
Example: Lobster workflow step

Copy

```
openclaw.invoke --tool llm-task --action json --args-json &#x27;{
  "prompt": "Given the input email, return intent and draft.",
  "input": {
    "subject": "Hello",
    "body": "Can you help?"
  },
  "schema": {
    "type": "object",
    "properties": {
      "intent": { "type": "string" },
      "draft": { "type": "string" }
    },
    "required": ["intent", "draft"],
    "additionalProperties": false
  }
}&#x27;

```

## [​
](#safety-notes)
Safety notes

- The tool is **JSON-only** and instructs the model to output only JSON (no
code fences, no commentary).

- No tools are exposed to the model for this run.

- Treat output as untrusted unless you validate with `schema`.

- Put approvals before any side-effecting step (send, post, exec).

[Firecrawl](/tools/firecrawl)[Lobster](/tools/lobster)
⌘I