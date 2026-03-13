# Qianfan

Source: https://docs.openclaw.ai/providers/qianfan

---

Providers

# Qianfan

# [​
](#qianfan-provider-guide)
Qianfan Provider Guide

Qianfan is Baidu’s MaaS platform, provides a **unified API** that routes requests to many models behind a single
endpoint and API key. It is OpenAI-compatible, so most OpenAI SDKs work by switching the base URL.

## [​
](#prerequisites)
Prerequisites

- A Baidu Cloud account with Qianfan API access

- An API key from the Qianfan console

- OpenClaw installed on your system

## [​
](#getting-your-api-key)
Getting Your API Key

- Visit the [Qianfan Console](https://console.bce.baidu.com/qianfan/ais/console/apiKey)

- Create a new application or select an existing one

- Generate an API key (format: `bce-v3/ALTAK-...`)

- Copy the API key for use with OpenClaw

## [​
](#cli-setup)
CLI setup

Copy

```
openclaw onboard --auth-choice qianfan-api-key

```

## [​
](#related-documentation)
Related Documentation

- [OpenClaw Configuration](/gateway/configuration)

- [Model Providers](/concepts/model-providers)

- [Agent Setup](/concepts/agent)

- [Qianfan API Documentation](https://cloud.baidu.com/doc/qianfan-api/s/3m7of64lb)

[OpenRouter](/providers/openrouter)[Qwen](/providers/qwen)
⌘I