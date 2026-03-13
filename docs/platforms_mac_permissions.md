# macOS Permissions

Source: https://docs.openclaw.ai/platforms/mac/permissions

---

macOS companion app

# macOS Permissions

# [​
](#macos-permissions-tcc)
macOS permissions (TCC)

macOS permission grants are fragile. TCC associates a permission grant with the
app’s code signature, bundle identifier, and on-disk path. If any of those change,
macOS treats the app as new and may drop or hide prompts.

## [​
](#requirements-for-stable-permissions)
Requirements for stable permissions

- Same path: run the app from a fixed location (for OpenClaw, `dist/OpenClaw.app`).

- Same bundle identifier: changing the bundle ID creates a new permission identity.

- Signed app: unsigned or ad-hoc signed builds do not persist permissions.

- Consistent signature: use a real Apple Development or Developer ID certificate
so the signature stays stable across rebuilds.

Ad-hoc signatures generate a new identity every build. macOS will forget previous
grants, and prompts can disappear entirely until the stale entries are cleared.

## [​
](#recovery-checklist-when-prompts-disappear)
Recovery checklist when prompts disappear

- Quit the app.

- Remove the app entry in System Settings -> Privacy & Security.

- Relaunch the app from the same path and re-grant permissions.

- If the prompt still does not appear, reset TCC entries with `tccutil` and try again.

- Some permissions only reappear after a full macOS restart.

Example resets (replace bundle ID as needed):
Copy

```
sudo tccutil reset Accessibility ai.openclaw.mac
sudo tccutil reset ScreenCapture ai.openclaw.mac
sudo tccutil reset AppleEvents

```

## [​
](#files-and-folders-permissions-desktop/documents/downloads)
Files and folders permissions (Desktop/Documents/Downloads)

macOS may also gate Desktop, Documents, and Downloads for terminal/background processes. If file reads or directory listings hang, grant access to the same process context that performs file operations (for example Terminal/iTerm, LaunchAgent-launched app, or SSH process).
Workaround: move files into the OpenClaw workspace (`~/.openclaw/workspace`) if you want to avoid per-folder grants.
If you are testing permissions, always sign with a real certificate. Ad-hoc
builds are only acceptable for quick local runs where permissions do not matter.
[macOS Logging](/platforms/mac/logging)[Remote Control](/platforms/mac/remote)
⌘I