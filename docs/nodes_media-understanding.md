# Media Understanding

Source: https://docs.openclaw.ai/nodes/media-understanding

---

Media and devices

# Media Understanding

# [​
](#media-understanding-inbound-—-2026-01-17)
Media Understanding (Inbound) — 2026-01-17

OpenClaw can **summarize inbound media** (image/audio/video) before the reply pipeline runs. It auto‑detects when local tools or provider keys are available, and can be disabled or customized. If understanding is off, models still receive the original files/URLs as usual.

## [​
](#goals)
Goals

- Optional: pre‑digest inbound media into short text for faster routing + better command parsing.

- Preserve original media delivery to the model (always).

- Support **provider APIs** and **CLI fallbacks**.

- Allow multiple models with ordered fallback (error/size/timeout).

## [​
](#high‑level-behavior)
High‑level behavior

- Collect inbound attachments (`MediaPaths`, `MediaUrls`, `MediaTypes`).

- For each enabled capability (image/audio/video), select attachments per policy (default: **first**).

- Choose the first eligible model entry (size + capability + auth).

- If a model fails or the media is too large, **fall back to the next entry**.

- On success:

`Body` becomes `[Image]`, `[Audio]`, or `[Video]` block.

- Audio sets `{{Transcript}}`; command parsing uses caption text when present,
otherwise the transcript.

- Captions are preserved as `User text:` inside the block.

If understanding fails or is disabled, **the reply flow continues** with the original body + attachments.

## [​
](#config-overview)
Config overview

`tools.media` supports **shared models** plus per‑capability overrides:

- `tools.media.models`: shared model list (use `capabilities` to gate).

- `tools.media.image` / `tools.media.audio` / `tools.media.video`:

defaults (`prompt`, `maxChars`, `maxBytes`, `timeoutSeconds`, `language`)

- provider overrides (`baseUrl`, `headers`, `providerOptions`)

- Deepgram audio options via `tools.media.audio.providerOptions.deepgram`

- audio transcript echo controls (`echoTranscript`, default `false`; `echoFormat`)

- optional **per‑capability `models` list** (preferred before shared models)

- `attachments` policy (`mode`, `maxAttachments`, `prefer`)

- `scope` (optional gating by channel/chatType/session key)

- `tools.media.concurrency`: max concurrent capability runs (default **2**).

Copy

```
{
  tools: {
    media: {
      models: [
        /* shared list */
      ],
      image: {
        /* optional overrides */
      },
      audio: {
        /* optional overrides */
        echoTranscript: true,
        echoFormat: &#x27;📝 "{transcript}"&#x27;,
      },
      video: {
        /* optional overrides */
      },
    },
  },
}

```

### [​
](#model-entries)
Model entries

Each `models[]` entry can be **provider** or **CLI**:
Copy

```
{
  type: "provider", // default if omitted
  provider: "openai",
  model: "gpt-5.2",
  prompt: "Describe the image in <= 500 chars.",
  maxChars: 500,
  maxBytes: 10485760,
  timeoutSeconds: 60,
  capabilities: ["image"], // optional, used for multi‑modal entries
  profile: "vision-profile",
  preferredProfile: "vision-fallback",
}

```

Copy

```
{
  type: "cli",
  command: "gemini",
  args: [
    "-m",
    "gemini-3-flash",
    "--allowed-tools",
    "read_file",
    "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
  ],
  maxChars: 500,
  maxBytes: 52428800,
  timeoutSeconds: 120,
  capabilities: ["video", "image"],
}

```

CLI templates can also use:

- `{{MediaDir}}` (directory containing the media file)

- `{{OutputDir}}` (scratch dir created for this run)

- `{{OutputBase}}` (scratch file base path, no extension)

## [​
](#defaults-and-limits)
Defaults and limits

Recommended defaults:

- `maxChars`: **500** for image/video (short, command‑friendly)

- `maxChars`: **unset** for audio (full transcript unless you set a limit)

- `maxBytes`:

image: **10MB**

- audio: **20MB**

- video: **50MB**

Rules:

- If media exceeds `maxBytes`, that model is skipped and the **next model is tried**.

- Audio files smaller than **1024 bytes** are treated as empty/corrupt and skipped before provider/CLI transcription.

- If the model returns more than `maxChars`, output is trimmed.

- `prompt` defaults to simple “Describe the .” plus the `maxChars` guidance (image/video only).

- If `<capability>.enabled: true` but no models are configured, OpenClaw tries the
**active reply model** when its provider supports the capability.

### [​
](#auto-detect-media-understanding-default)
Auto-detect media understanding (default)

If `tools.media.<capability>.enabled` is **not** set to `false` and you haven’t
configured models, OpenClaw auto-detects in this order and stops at the first
working option:

- **Local CLIs** (audio only; if installed)

`sherpa-onnx-offline` (requires `SHERPA_ONNX_MODEL_DIR` with encoder/decoder/joiner/tokens)

- `whisper-cli` (`whisper-cpp`; uses `WHISPER_CPP_MODEL` or the bundled tiny model)

- `whisper` (Python CLI; downloads models automatically)

- **Gemini CLI** (`gemini`) using `read_many_files`

- **Provider keys**

Audio: OpenAI → Groq → Deepgram → Google

- Image: OpenAI → Anthropic → Google → MiniMax

- Video: Google

To disable auto-detection, set:
Copy

```
{
  tools: {
    media: {
      audio: {
        enabled: false,
      },
    },
  },
}

```

Note: Binary detection is best-effort across macOS/Linux/Windows; ensure the CLI is on `PATH` (we expand `~`), or set an explicit CLI model with a full command path.

### [​
](#proxy-environment-support-provider-models)
Proxy environment support (provider models)

When provider-based **audio** and **video** media understanding is enabled, OpenClaw
honors standard outbound proxy environment variables for provider HTTP calls:

- `HTTPS_PROXY`

- `HTTP_PROXY`

- `https_proxy`

- `http_proxy`

If no proxy env vars are set, media understanding uses direct egress.
If the proxy value is malformed, OpenClaw logs a warning and falls back to direct
fetch.

## [​
](#capabilities-optional)
Capabilities (optional)

If you set `capabilities`, the entry only runs for those media types. For shared
lists, OpenClaw can infer defaults:

- `openai`, `anthropic`, `minimax`: **image**

- `google` (Gemini API): **image + audio + video**

- `groq`: **audio**

- `deepgram`: **audio**

For CLI entries, **set `capabilities` explicitly** to avoid surprising matches.
If you omit `capabilities`, the entry is eligible for the list it appears in.

## [​
](#provider-support-matrix-openclaw-integrations)
Provider support matrix (OpenClaw integrations)

CapabilityProvider integrationNotesImageOpenAI / Anthropic / Google / others via `pi-ai`Any image-capable model in the registry works.AudioOpenAI, Groq, Deepgram, Google, MistralProvider transcription (Whisper/Deepgram/Gemini/Voxtral).VideoGoogle (Gemini API)Provider video understanding.

## [​
](#model-selection-guidance)
Model selection guidance

- Prefer the strongest latest-generation model available for each media capability when quality and safety matter.

- For tool-enabled agents handling untrusted inputs, avoid older/weaker media models.

- Keep at least one fallback per capability for availability (quality model + faster/cheaper model).

- CLI fallbacks (`whisper-cli`, `whisper`, `gemini`) are useful when provider APIs are unavailable.

- `parakeet-mlx` note: with `--output-dir`, OpenClaw reads `<output-dir>/<media-basename>.txt` when output format is `txt` (or unspecified); non-`txt` formats fall back to stdout.

## [​
](#attachment-policy)
Attachment policy

Per‑capability `attachments` controls which attachments are processed:

- `mode`: `first` (default) or `all`

- `maxAttachments`: cap the number processed (default **1**)

- `prefer`: `first`, `last`, `path`, `url`

When `mode: "all"`, outputs are labeled `[Image 1/2]`, `[Audio 2/2]`, etc.

## [​
](#config-examples)
Config examples

### [​
](#1-shared-models-list-+-overrides)
1) Shared models list + overrides

Copy

```
{
  tools: {
    media: {
      models: [
        { provider: "openai", model: "gpt-5.2", capabilities: ["image"] },
        {
          provider: "google",
          model: "gemini-3-flash-preview",
          capabilities: ["image", "audio", "video"],
        },
        {
          type: "cli",
          command: "gemini",
          args: [
            "-m",
            "gemini-3-flash",
            "--allowed-tools",
            "read_file",
            "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
          ],
          capabilities: ["image", "video"],
        },
      ],
      audio: {
        attachments: { mode: "all", maxAttachments: 2 },
      },
      video: {
        maxChars: 500,
      },
    },
  },
}

```

### [​
](#2-audio-+-video-only-image-off)
2) Audio + Video only (image off)

Copy

```
{
  tools: {
    media: {
      audio: {
        enabled: true,
        models: [
          { provider: "openai", model: "gpt-4o-mini-transcribe" },
          {
            type: "cli",
            command: "whisper",
            args: ["--model", "base", "{{MediaPath}}"],
          },
        ],
      },
      video: {
        enabled: true,
        maxChars: 500,
        models: [
          { provider: "google", model: "gemini-3-flash-preview" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
          },
        ],
      },
    },
  },
}

```

### [​
](#3-optional-image-understanding)
3) Optional image understanding

Copy

```
{
  tools: {
    media: {
      image: {
        enabled: true,
        maxBytes: 10485760,
        maxChars: 500,
        models: [
          { provider: "openai", model: "gpt-5.2" },
          { provider: "anthropic", model: "claude-opus-4-6" },
          {
            type: "cli",
            command: "gemini",
            args: [
              "-m",
              "gemini-3-flash",
              "--allowed-tools",
              "read_file",
              "Read the media at {{MediaPath}} and describe it in <= {{MaxChars}} characters.",
            ],
          },
        ],
      },
    },
  },
}

```

### [​
](#4-multi‑modal-single-entry-explicit-capabilities)
4) Multi‑modal single entry (explicit capabilities)

Copy

```
{
  tools: {
    media: {
      image: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      audio: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
      video: {
        models: [
          {
            provider: "google",
            model: "gemini-3.1-pro-preview",
            capabilities: ["image", "video", "audio"],
          },
        ],
      },
    },
  },
}

```

## [​
](#status-output)
Status output

When media understanding runs, `/status` includes a short summary line:
Copy

```
📎 Media: image ok (openai/gpt-5.2) · audio skipped (maxBytes)

```

This shows per‑capability outcomes and the chosen provider/model when applicable.

## [​
](#notes)
Notes

- Understanding is **best‑effort**. Errors do not block replies.

- Attachments are still passed to models even when understanding is disabled.

- Use `scope` to limit where understanding runs (e.g. only DMs).

## [​
](#related-docs)
Related docs

- [Configuration](/gateway/configuration)

- [Image & Media Support](/nodes/images)

[Node Troubleshooting](/nodes/troubleshooting)[Image and Media Support](/nodes/images)
⌘I