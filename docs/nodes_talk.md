# Talk Mode

Source: https://docs.openclaw.ai/nodes/talk

---

Media and devices

# Talk Mode

# [​
](#talk-mode)
Talk Mode

Talk mode is a continuous voice conversation loop:

- Listen for speech

- Send transcript to the model (main session, chat.send)

- Wait for the response

- Speak it via ElevenLabs (streaming playback)

## [​
](#behavior-macos)
Behavior (macOS)

- **Always-on overlay** while Talk mode is enabled.

- **Listening → Thinking → Speaking** phase transitions.

- On a **short pause** (silence window), the current transcript is sent.

- Replies are **written to WebChat** (same as typing).

- **Interrupt on speech** (default on): if the user starts talking while the assistant is speaking, we stop playback and note the interruption timestamp for the next prompt.

## [​
](#voice-directives-in-replies)
Voice directives in replies

The assistant may prefix its reply with a **single JSON line** to control voice:
Copy

```
{ "voice": "<voice-id>", "once": true }

```

Rules:

- First non-empty line only.

- Unknown keys are ignored.

- `once: true` applies to the current reply only.

- Without `once`, the voice becomes the new default for Talk mode.

- The JSON line is stripped before TTS playback.

Supported keys:

- `voice` / `voice_id` / `voiceId`

- `model` / `model_id` / `modelId`

- `speed`, `rate` (WPM), `stability`, `similarity`, `style`, `speakerBoost`

- `seed`, `normalize`, `lang`, `output_format`, `latency_tier`

- `once`

## [​
](#config-/-openclaw/openclaw-json)
Config (`~/.openclaw/openclaw.json`)

Copy

```
{
  talk: {
    voiceId: "elevenlabs_voice_id",
    modelId: "eleven_v3",
    outputFormat: "mp3_44100_128",
    apiKey: "elevenlabs_api_key",
    silenceTimeoutMs: 1500,
    interruptOnSpeech: true,
  },
}

```

Defaults:

- `interruptOnSpeech`: true

- `silenceTimeoutMs`: when unset, Talk keeps the platform default pause window before sending the transcript (`700 ms on macOS and Android, 900 ms on iOS`)

- `voiceId`: falls back to `ELEVENLABS_VOICE_ID` / `SAG_VOICE_ID` (or first ElevenLabs voice when API key is available)

- `modelId`: defaults to `eleven_v3` when unset

- `apiKey`: falls back to `ELEVENLABS_API_KEY` (or gateway shell profile if available)

- `outputFormat`: defaults to `pcm_44100` on macOS/iOS and `pcm_24000` on Android (set `mp3_*` to force MP3 streaming)

## [​
](#macos-ui)
macOS UI

- Menu bar toggle: **Talk**

- Config tab: **Talk Mode** group (voice id + interrupt toggle)

- Overlay:

**Listening**: cloud pulses with mic level

- **Thinking**: sinking animation

- **Speaking**: radiating rings

- Click cloud: stop speaking

- Click X: exit Talk mode

## [​
](#notes)
Notes

- Requires Speech + Microphone permissions.

- Uses `chat.send` against session key `main`.

- TTS uses ElevenLabs streaming API with `ELEVENLABS_API_KEY` and incremental playback on macOS/iOS/Android for lower latency.

- `stability` for `eleven_v3` is validated to `0.0`, `0.5`, or `1.0`; other models accept `0..1`.

- `latency_tier` is validated to `0..4` when set.

- Android supports `pcm_16000`, `pcm_22050`, `pcm_24000`, and `pcm_44100` output formats for low-latency AudioTrack streaming.

[Camera Capture](/nodes/camera)[Voice Wake](/nodes/voicewake)
⌘I