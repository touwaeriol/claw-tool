# WebChat

Source: https://docs.openclaw.ai/platforms/mac/webchat

---

macOS companion app

# WebChat

# [​
](#webchat-macos-app)
WebChat (macOS app)

The macOS menu bar app embeds the WebChat UI as a native SwiftUI view. It
connects to the Gateway and defaults to the **main session** for the selected
agent (with a session switcher for other sessions).

- **Local mode**: connects directly to the local Gateway WebSocket.

- **Remote mode**: forwards the Gateway control port over SSH and uses that
tunnel as the data plane.

## [​
](#launch-&-debugging)
Launch & debugging

- 
Manual: Lobster menu → “Open Chat”.

- 
Auto‑open for testing:
Copy

```
dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat

```

- 
Logs: `./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`).

## [​
](#how-it’s-wired)
How it’s wired

- Data plane: Gateway WS methods `chat.history`, `chat.send`, `chat.abort`,
`chat.inject` and events `chat`, `agent`, `presence`, `tick`, `health`.

- Session: defaults to the primary session (`main`, or `global` when scope is
global). The UI can switch between sessions.

- Onboarding uses a dedicated session to keep first‑run setup separate.

## [​
](#security-surface)
Security surface

- Remote mode forwards only the Gateway WebSocket control port over SSH.

## [​
](#known-limitations)
Known limitations

- The UI is optimized for chat sessions (not a full browser sandbox).

[Voice Overlay](/platforms/mac/voice-overlay)[Canvas](/platforms/mac/canvas)
⌘I