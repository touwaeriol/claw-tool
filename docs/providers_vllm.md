# vLLM

Source: https://docs.openclaw.ai/providers/vllm

---

Providers

# vLLM

# [​
](#vllm)
vLLM

vLLM can serve open-source (and some custom) models via an **OpenAI-compatible** HTTP API. OpenClaw can connect to vLLM using the `openai-completions` API.
OpenClaw can also **auto-discover** available models from vLLM when you opt in with `VLLM_API_KEY` (any value works if your server doesn’t enforce auth) and you do not define an explicit `models.providers.vllm` entry.

## [​
](#quick-start)
Quick start

- Start vLLM with an OpenAI-compatible server.

Your base URL should expose `/v1` endpoints (e.g. `/v1/models`, `/v1/chat/completions`). vLLM commonly runs on:

- `http://127.0.0.1:8000/v1`

- Opt in (any value works if no auth is configured):

Copy

```
export VLLM_API_KEY="vllm-local"

```

- Select a model (replace with one of your vLLM model IDs):

Copy

```
{
  agents: {
    defaults: {
      model: { primary: "vllm/your-model-id" },
    },
  },
}

```

## [​
](#model-discovery-implicit-provider)
Model discovery (implicit provider)

When `VLLM_API_KEY` is set (or an auth profile exists) and you **do not** define `models.providers.vllm`, OpenClaw will query:

- `GET http://127.0.0.1:8000/v1/models`

…and convert the returned IDs into model entries.
If you set `models.providers.vllm` explicitly, auto-discovery is skipped and you must define models manually.

## [​
](#explicit-configuration-manual-models)
Explicit configuration (manual models)

Use explicit config when:

- vLLM runs on a different host/port.

- You want to pin `contextWindow`/`maxTokens` values.

- Your server requires a real API key (or you want to control headers).

Copy

```
{
  models: {
    providers: {
      vllm: {
        baseUrl: "http://127.0.0.1:8000/v1",
        apiKey: "${VLLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "your-model-id",
            name: "Local vLLM Model",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
}

```

## [​
](#troubleshooting)
Troubleshooting

- Check the server is reachable:

Copy

```
curl http://127.0.0.1:8000/v1/models

```

- If requests fail with auth errors, set a real `VLLM_API_KEY` that matches your server configuration, or configure the provider explicitly under `models.providers.vllm`.

[Venice AI](/providers/venice)[Xiaomi MiMo](/providers/xiaomi)
⌘I