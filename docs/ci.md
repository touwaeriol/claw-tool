# CI Pipeline

Source: https://docs.openclaw.ai/ci

---

Contributing

# CI Pipeline

How the OpenClaw CI pipeline works

# [​
](#ci-pipeline)
CI Pipeline

The CI runs on every push to `main` and every pull request. It uses smart scoping to skip expensive jobs when only docs or native code changed.

## [​
](#job-overview)
Job Overview

JobPurposeWhen it runs`docs-scope`Detect docs-only changesAlways`changed-scope`Detect which areas changed (node/macos/android/windows)Non-docs PRs`check`TypeScript types, lint, formatPush to `main`, or PRs with Node-relevant changes`check-docs`Markdown lint + broken link checkDocs changed`code-analysis`LOC threshold check (1000 lines)PRs only`secrets`Detect leaked secretsAlways`build-artifacts`Build dist once, share with other jobsNon-docs, node changes`release-check`Validate npm pack contentsAfter build`checks`Node/Bun tests + protocol checkNon-docs, node changes`checks-windows`Windows-specific testsNon-docs, windows-relevant changes`macos`Swift lint/build/test + TS testsPRs with macos changes`android`Gradle build + testsNon-docs, android changes

## [​
](#fail-fast-order)
Fail-Fast Order

Jobs are ordered so cheap checks fail before expensive ones run:

- `docs-scope` + `code-analysis` + `check` (parallel, ~1-2 min)

- `build-artifacts` (blocked on above)

- `checks`, `checks-windows`, `macos`, `android` (blocked on build)

Scope logic lives in `scripts/ci-changed-scope.mjs` and is covered by unit tests in `src/scripts/ci-changed-scope.test.ts`.

## [​
](#runners)
Runners

RunnerJobs`blacksmith-16vcpu-ubuntu-2404`Most Linux jobs, including scope detection`blacksmith-32vcpu-windows-2025``checks-windows``macos-latest``macos`, `ios`

## [​
](#local-equivalents)
Local Equivalents

Copy

```
pnpm check          # types + lint + format
pnpm test           # vitest tests
pnpm check:docs     # docs format + lint + broken links
pnpm release:check  # validate npm pack

```

[Pi Development Workflow](/pi-dev)[Docs Hubs](/start/hubs)
⌘I