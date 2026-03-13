# Mistral

Source: https://docs.openclaw.ai/providers/mistral

---

Providers

# Mistral

# [​
](#mistral)
Mistral

OpenClaw supports Mistral for both text/image model routing (`mistral/...`) and
audio transcription via Voxtral in media understanding.
Mistral can also be used for memory embeddings (`memorySearch.provider = "mistral"`).

## [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice mistral-api-key
# or non-interactive
openclaw onboard --mistral-api-key "$MISTRAL_API_KEY"

```

## [​
](#config-snippet-llm-provider)
Config snippet (LLM provider)

Copy

```
{
  env: { MISTRAL_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "mistral/mistral-large-latest" } } },
}

```

## [​
](#config-snippet-audio-transcription-with-voxtral)
Config snippet (audio transcription with Voxtral)

Copy

```
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [{ provider: "mistral", model: "voxtral-mini-latest" }],
      },
    },
  },
}

```

## [​
](#notes)
Notes

- Mistral auth uses `MISTRAL_API_KEY`.

- Provider base URL defaults to `https://api.mistral.ai/v1`.

- Onboarding default model is `mistral/mistral-large-latest`.

- Media-understanding default audio model for Mistral is `voxtral-mini-latest`.

- Media transcription path uses `/v1/audio/transcriptions`.

- Memory embeddings path uses `/v1/embeddings` (default model: `mistral-embed`).

[Moonshot AI](/providers/moonshot)[NVIDIA](/providers/nvidia)
⌘I