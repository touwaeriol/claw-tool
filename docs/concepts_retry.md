# Retry Policy

Source: https://docs.openclaw.ai/concepts/retry

---

Messages and delivery

# Retry Policy

# [​
](#retry-policy)
Retry policy

## [​
](#goals)
Goals

- Retry per HTTP request, not per multi-step flow.

- Preserve ordering by retrying only the current step.

- Avoid duplicating non-idempotent operations.

## [​
](#defaults)
Defaults

- Attempts: 3

- Max delay cap: 30000 ms

- Jitter: 0.1 (10 percent)

- Provider defaults:

Telegram min delay: 400 ms

- Discord min delay: 500 ms

## [​
](#behavior)
Behavior

### [​
](#discord)
Discord

- Retries only on rate-limit errors (HTTP 429).

- Uses Discord `retry_after` when available, otherwise exponential backoff.

### [​
](#telegram)
Telegram

- Retries on transient errors (429, timeout, connect/reset/closed, temporarily unavailable).

- Uses `retry_after` when available, otherwise exponential backoff.

- Markdown parse errors are not retried; they fall back to plain text.

## [​
](#configuration)
Configuration

Set retry policy per provider in `~/.openclaw/openclaw.json`:
Copy

```
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}

```

## [​
](#notes)
Notes

- Retries apply per request (message send, media upload, reaction, poll, sticker).

- Composite flows do not retry completed steps.

[Streaming and Chunking](/concepts/streaming)[Command Queue](/concepts/queue)
⌘I