# Plugin Agent Tools

Source: https://docs.openclaw.ai/plugins/agent-tools

---

Extensions

# Plugin Agent Tools

# [​
](#plugin-agent-tools)
Plugin agent tools

OpenClaw plugins can register **agent tools** (JSON‑schema functions) that are exposed
to the LLM during agent runs. Tools can be **required** (always available) or
**optional** (opt‑in).
Agent tools are configured under `tools` in the main config, or per‑agent under
`agents.list[].tools`. The allowlist/denylist policy controls which tools the agent
can call.

## [​
](#basic-tool)
Basic tool

Copy

```
import { Type } from "@sinclair/typebox";

export default function (api) {
  api.registerTool({
    name: "my_tool",
    description: "Do a thing",
    parameters: Type.Object({
      input: Type.String(),
    }),
    async execute(_id, params) {
      return { content: [{ type: "text", text: params.input }] };
    },
  });
}

```

## [​
](#optional-tool-opt‑in)
Optional tool (opt‑in)

Optional tools are **never** auto‑enabled. Users must add them to an agent
allowlist.
Copy

```
export default function (api) {
  api.registerTool(
    {
      name: "workflow_tool",
      description: "Run a local workflow",
      parameters: {
        type: "object",
        properties: {
          pipeline: { type: "string" },
        },
        required: ["pipeline"],
      },
      async execute(_id, params) {
        return { content: [{ type: "text", text: params.pipeline }] };
      },
    },
    { optional: true },
  );
}

```

Enable optional tools in `agents.list[].tools.allow` (or global `tools.allow`):
Copy

```
{
  agents: {
    list: [
      {
        id: "main",
        tools: {
          allow: [
            "workflow_tool", // specific tool name
            "workflow", // plugin id (enables all tools from that plugin)
            "group:plugins", // all plugin tools
          ],
        },
      },
    ],
  },
}

```

Other config knobs that affect tool availability:

- Allowlists that only name plugin tools are treated as plugin opt-ins; core tools remain
enabled unless you also include core tools or groups in the allowlist.

- `tools.profile` / `agents.list[].tools.profile` (base allowlist)

- `tools.byProvider` / `agents.list[].tools.byProvider` (provider‑specific allow/deny)

- `tools.sandbox.tools.*` (sandbox tool policy when sandboxed)

## [​
](#rules-+-tips)
Rules + tips

- Tool names must **not** clash with core tool names; conflicting tools are skipped.

- Plugin ids used in allowlists must not clash with core tool names.

- Prefer `optional: true` for tools that trigger side effects or require extra
binaries/credentials.

[Plugin Manifest](/plugins/manifest)[OpenProse](/prose)
⌘I