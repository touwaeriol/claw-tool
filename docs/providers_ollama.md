# Ollama

Source: https://docs.openclaw.ai/providers/ollama

---

Providers

# Ollama

# [​
](#ollama)
Ollama

Ollama is a local LLM runtime that makes it easy to run open-source models on your machine. OpenClaw integrates with Ollama’s native API (`/api/chat`), supporting streaming and tool calling, and can **auto-discover tool-capable models** when you opt in with `OLLAMA_API_KEY` (or an auth profile) and do not define an explicit `models.providers.ollama` entry.

**Remote Ollama users**: Do not use the `/v1` OpenAI-compatible URL (`http://host:11434/v1`) with OpenClaw. This breaks tool calling and models may output raw tool JSON as plain text. Use the native Ollama API URL instead: `baseUrl: "http://host:11434"` (no `/v1`).

## [​
](#quick-start)
Quick start

- 
Install Ollama: [https://ollama.ai](https://ollama.ai)

- 
Pull a model:

Copy

```
ollama pull gpt-oss:20b
# or
ollama pull llama3.3
# or
ollama pull qwen2.5-coder:32b
# or
ollama pull deepseek-r1:32b

```

- Enable Ollama for OpenClaw (any value works; Ollama doesn’t require a real key):

Copy

```
# Set environment variable
export OLLAMA_API_KEY="ollama-local"

# Or configure in your config file
openclaw config set models.providers.ollama.apiKey "ollama-local"

```

- Use Ollama models:

Copy

```
{
  agents: {
    defaults: {
      model: { primary: "ollama/gpt-oss:20b" },
    },
  },
}

```

## [​
](#model-discovery-implicit-provider)
Model discovery (implicit provider)

When you set `OLLAMA_API_KEY` (or an auth profile) and **do not** define `models.providers.ollama`, OpenClaw discovers models from the local Ollama instance at `http://127.0.0.1:11434`:

- Queries `/api/tags` and `/api/show`

- Keeps only models that report `tools` capability

- Marks `reasoning` when the model reports `thinking`

- Reads `contextWindow` from `model_info["<arch>.context_length"]` when available

- Sets `maxTokens` to 10× the context window

- Sets all costs to `0`

This avoids manual model entries while keeping the catalog aligned with Ollama’s capabilities.
To see what models are available:
Copy

```
ollama list
openclaw models list

```

To add a new model, simply pull it with Ollama:
Copy

```
ollama pull mistral

```

The new model will be automatically discovered and available to use.
If you set `models.providers.ollama` explicitly, auto-discovery is skipped and you must define models manually (see below).

## [​
](#configuration)
Configuration

### [​
](#basic-setup-implicit-discovery)
Basic setup (implicit discovery)

The simplest way to enable Ollama is via environment variable:
Copy

```
export OLLAMA_API_KEY="ollama-local"

```

### [​
](#explicit-setup-manual-models)
Explicit setup (manual models)

Use explicit config when:

- Ollama runs on another host/port.

- You want to force specific context windows or model lists.

- You want to include models that do not report tool support.

Copy

```
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
        apiKey: "ollama-local",
        api: "ollama",
        models: [
          {
            id: "gpt-oss:20b",
            name: "GPT-OSS 20B",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 8192,
            maxTokens: 8192 * 10
          }
        ]
      }
    }
  }
}

```

If `OLLAMA_API_KEY` is set, you can omit `apiKey` in the provider entry and OpenClaw will fill it for availability checks.

### [​
](#custom-base-url-explicit-config)
Custom base URL (explicit config)

If Ollama is running on a different host or port (explicit config disables auto-discovery, so define models manually):
Copy

```
{
  models: {
    providers: {
      ollama: {
        apiKey: "ollama-local",
        baseUrl: "http://ollama-host:11434", // No /v1 - use native Ollama API URL
        api: "ollama", // Set explicitly to guarantee native tool-calling behavior
      },
    },
  },
}

```

Do not add `/v1` to the URL. The `/v1` path uses OpenAI-compatible mode, where tool calling is not reliable. Use the base Ollama URL without a path suffix.

### [​
](#model-selection)
Model selection

Once configured, all your Ollama models are available:
Copy

```
{
  agents: {
    defaults: {
      model: {
        primary: "ollama/gpt-oss:20b",
        fallbacks: ["ollama/llama3.3", "ollama/qwen2.5-coder:32b"],
      },
    },
  },
}

```

## [​
](#advanced)
Advanced

### [​
](#reasoning-models)
Reasoning models

OpenClaw marks models as reasoning-capable when Ollama reports `thinking` in `/api/show`:
Copy

```
ollama pull deepseek-r1:32b

```

### [​
](#model-costs)
Model Costs

Ollama is free and runs locally, so all model costs are set to $0.

### [​
](#streaming-configuration)
Streaming Configuration

OpenClaw’s Ollama integration uses the **native Ollama API** (`/api/chat`) by default, which fully supports streaming and tool calling simultaneously. No special configuration is needed.

#### [​
](#legacy-openai-compatible-mode)
Legacy OpenAI-Compatible Mode

**Tool calling is not reliable in OpenAI-compatible mode.** Use this mode only if you need OpenAI format for a proxy and do not depend on native tool calling behavior.

If you need to use the OpenAI-compatible endpoint instead (e.g., behind a proxy that only supports OpenAI format), set `api: "openai-completions"` explicitly:
Copy

```
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: true, // default: true
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}

```

This mode may not support streaming + tool calling simultaneously. You may need to disable streaming with `params: { streaming: false }` in model config.
When `api: "openai-completions"` is used with Ollama, OpenClaw injects `options.num_ctx` by default so Ollama does not silently fall back to a 4096 context window. If your proxy/upstream rejects unknown `options` fields, disable this behavior:
Copy

```
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434/v1",
        api: "openai-completions",
        injectNumCtxForOpenAICompat: false,
        apiKey: "ollama-local",
        models: [...]
      }
    }
  }
}

```

### [​
](#context-windows)
Context windows

For auto-discovered models, OpenClaw uses the context window reported by Ollama when available, otherwise it defaults to `8192`. You can override `contextWindow` and `maxTokens` in explicit provider config.

## [​
](#troubleshooting)
Troubleshooting

### [​
](#ollama-not-detected)
Ollama not detected

Make sure Ollama is running and that you set `OLLAMA_API_KEY` (or an auth profile), and that you did **not** define an explicit `models.providers.ollama` entry:
Copy

```
ollama serve

```

And that the API is accessible:
Copy

```
curl http://localhost:11434/api/tags

```

### [​
](#no-models-available)
No models available

OpenClaw only auto-discovers models that report tool support. If your model isn’t listed, either:

- Pull a tool-capable model, or

- Define the model explicitly in `models.providers.ollama`.

To add models:
Copy

```
ollama list  # See what&#x27;s installed
ollama pull gpt-oss:20b  # Pull a tool-capable model
ollama pull llama3.3     # Or another model

```

### [​
](#connection-refused)
Connection refused

Check that Ollama is running on the correct port:
Copy

```
# Check if Ollama is running
ps aux | grep ollama

# Or restart Ollama
ollama serve

```

## [​
](#see-also)
See Also

- [Model Providers](/concepts/model-providers) - Overview of all providers

- [Model Selection](/concepts/models) - How to choose models

- [Configuration](/gateway/configuration) - Full config reference

[NVIDIA](/providers/nvidia)[OpenAI](/providers/openai)
⌘I