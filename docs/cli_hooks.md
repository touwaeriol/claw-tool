# hooks

Source: https://docs.openclaw.ai/cli/hooks

---

CLI commands

# hooks

# [​
](#openclaw-hooks)
`openclaw hooks`

Manage agent hooks (event-driven automations for commands like `/new`, `/reset`, and gateway startup).
Related:

- Hooks: [Hooks](/automation/hooks)

- Plugin hooks: [Plugins](/tools/plugin#plugin-hooks)

## [​
](#list-all-hooks)
List All Hooks

Copy

```
openclaw hooks list

```

List all discovered hooks from workspace, managed, and bundled directories.
**Options:**

- `--eligible`: Show only eligible hooks (requirements met)

- `--json`: Output as JSON

- `-v, --verbose`: Show detailed information including missing requirements

**Example output:**
Copy

```
Hooks (4/4 ready)

Ready:
  🚀 boot-md ✓ - Run BOOT.md on gateway startup
  📎 bootstrap-extra-files ✓ - Inject extra workspace bootstrap files during agent bootstrap
  📝 command-logger ✓ - Log all command events to a centralized audit file
  💾 session-memory ✓ - Save session context to memory when /new command is issued

```

**Example (verbose):**
Copy

```
openclaw hooks list --verbose

```

Shows missing requirements for ineligible hooks.
**Example (JSON):**
Copy

```
openclaw hooks list --json

```

Returns structured JSON for programmatic use.

## [​
](#get-hook-information)
Get Hook Information

Copy

```
openclaw hooks info <name>

```

Show detailed information about a specific hook.
**Arguments:**

- `<name>`: Hook name (e.g., `session-memory`)

**Options:**

- `--json`: Output as JSON

**Example:**
Copy

```
openclaw hooks info session-memory

```

**Output:**
Copy

```
💾 session-memory ✓ Ready

Save session context to memory when /new command is issued

Details:
  Source: openclaw-bundled
  Path: /path/to/openclaw/hooks/bundled/session-memory/HOOK.md
  Handler: /path/to/openclaw/hooks/bundled/session-memory/handler.ts
  Homepage: https://docs.openclaw.ai/automation/hooks#session-memory
  Events: command:new

Requirements:
  Config: ✓ workspace.dir

```

## [​
](#check-hooks-eligibility)
Check Hooks Eligibility

Copy

```
openclaw hooks check

```

Show summary of hook eligibility status (how many are ready vs. not ready).
**Options:**

- `--json`: Output as JSON

**Example output:**
Copy

```
Hooks Status

Total hooks: 4
Ready: 4
Not ready: 0

```

## [​
](#enable-a-hook)
Enable a Hook

Copy

```
openclaw hooks enable <name>

```

Enable a specific hook by adding it to your config (`~/.openclaw/config.json`).
**Note:** Hooks managed by plugins show `plugin:<id>` in `openclaw hooks list` and
can’t be enabled/disabled here. Enable/disable the plugin instead.
**Arguments:**

- `<name>`: Hook name (e.g., `session-memory`)

**Example:**
Copy

```
openclaw hooks enable session-memory

```

**Output:**
Copy

```
✓ Enabled hook: 💾 session-memory

```

**What it does:**

- Checks if hook exists and is eligible

- Updates `hooks.internal.entries.<name>.enabled = true` in your config

- Saves config to disk

**After enabling:**

- Restart the gateway so hooks reload (menu bar app restart on macOS, or restart your gateway process in dev).

## [​
](#disable-a-hook)
Disable a Hook

Copy

```
openclaw hooks disable <name>

```

Disable a specific hook by updating your config.
**Arguments:**

- `<name>`: Hook name (e.g., `command-logger`)

**Example:**
Copy

```
openclaw hooks disable command-logger

```

**Output:**
Copy

```
⏸ Disabled hook: 📝 command-logger

```

**After disabling:**

- Restart the gateway so hooks reload

## [​
](#install-hooks)
Install Hooks

Copy

```
openclaw hooks install <path-or-spec>
openclaw hooks install <npm-spec> --pin

```

Install a hook pack from a local folder/archive or npm.
Npm specs are **registry-only** (package name + optional **exact version** or
**dist-tag**). Git/URL/file specs and semver ranges are rejected. Dependency
installs run with `--ignore-scripts` for safety.
Bare specs and `@latest` stay on the stable track. If npm resolves either of
those to a prerelease, OpenClaw stops and asks you to opt in explicitly with a
prerelease tag such as `@beta`/`@rc` or an exact prerelease version.
**What it does:**

- Copies the hook pack into `~/.openclaw/hooks/<id>`

- Enables the installed hooks in `hooks.internal.entries.*`

- Records the install under `hooks.internal.installs`

**Options:**

- `-l, --link`: Link a local directory instead of copying (adds it to `hooks.internal.load.extraDirs`)

- `--pin`: Record npm installs as exact resolved `name@version` in `hooks.internal.installs`

**Supported archives:** `.zip`, `.tgz`, `.tar.gz`, `.tar`
**Examples:**
Copy

```
# Local directory
openclaw hooks install ./my-hook-pack

# Local archive
openclaw hooks install ./my-hook-pack.zip

# NPM package
openclaw hooks install @openclaw/my-hook-pack

# Link a local directory without copying
openclaw hooks install -l ./my-hook-pack

```

## [​
](#update-hooks)
Update Hooks

Copy

```
openclaw hooks update <id>
openclaw hooks update --all

```

Update installed hook packs (npm installs only).
**Options:**

- `--all`: Update all tracked hook packs

- `--dry-run`: Show what would change without writing

When a stored integrity hash exists and the fetched artifact hash changes,
OpenClaw prints a warning and asks for confirmation before proceeding. Use
global `--yes` to bypass prompts in CI/non-interactive runs.

## [​
](#bundled-hooks)
Bundled Hooks

### [​
](#session-memory)
session-memory

Saves session context to memory when you issue `/new`.
**Enable:**
Copy

```
openclaw hooks enable session-memory

```

**Output:** `~/.openclaw/workspace/memory/YYYY-MM-DD-slug.md`
**See:** [session-memory documentation](/automation/hooks#session-memory)

### [​
](#bootstrap-extra-files)
bootstrap-extra-files

Injects additional bootstrap files (for example monorepo-local `AGENTS.md` / `TOOLS.md`) during `agent:bootstrap`.
**Enable:**
Copy

```
openclaw hooks enable bootstrap-extra-files

```

**See:** [bootstrap-extra-files documentation](/automation/hooks#bootstrap-extra-files)

### [​
](#command-logger)
command-logger

Logs all command events to a centralized audit file.
**Enable:**
Copy

```
openclaw hooks enable command-logger

```

**Output:** `~/.openclaw/logs/commands.log`
**View logs:**
Copy

```
# Recent commands
tail -n 20 ~/.openclaw/logs/commands.log

# Pretty-print
cat ~/.openclaw/logs/commands.log | jq .

# Filter by action
grep &#x27;"action":"new"&#x27; ~/.openclaw/logs/commands.log | jq .

```

**See:** [command-logger documentation](/automation/hooks#command-logger)

### [​
](#boot-md)
boot-md

Runs `BOOT.md` when the gateway starts (after channels start).
**Events**: `gateway:startup`
**Enable**:
Copy

```
openclaw hooks enable boot-md

```

**See:** [boot-md documentation](/automation/hooks#boot-md)
[health](/cli/health)[logs](/cli/logs)
⌘I