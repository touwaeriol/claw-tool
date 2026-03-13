# Firecrawl

Source: https://docs.openclaw.ai/tools/firecrawl

---

Built-in tools

# Firecrawl

# [​
](#firecrawl)
Firecrawl

OpenClaw can use **Firecrawl** as a fallback extractor for `web_fetch`. It is a hosted
content extraction service that supports bot circumvention and caching, which helps
with JS-heavy sites or pages that block plain HTTP fetches.

## [​
](#get-an-api-key)
Get an API key

- Create a Firecrawl account and generate an API key.

- Store it in config or set `FIRECRAWL_API_KEY` in the gateway environment.

## [​
](#configure-firecrawl)
Configure Firecrawl

Copy

```
{
  tools: {
    web: {
      fetch: {
        firecrawl: {
          apiKey: "FIRECRAWL_API_KEY_HERE",
          baseUrl: "https://api.firecrawl.dev",
          onlyMainContent: true,
          maxAgeMs: 172800000,
          timeoutSeconds: 60,
        },
      },
    },
  },
}

```

Notes:

- `firecrawl.enabled` defaults to `true` unless explicitly set to `false`.

- Firecrawl fallback attempts run only when an API key is available (`tools.web.fetch.firecrawl.apiKey` or `FIRECRAWL_API_KEY`).

- `maxAgeMs` controls how old cached results can be (ms). Default is 2 days.

## [​
](#stealth-/-bot-circumvention)
Stealth / bot circumvention

Firecrawl exposes a **proxy mode** parameter for bot circumvention (`basic`, `stealth`, or `auto`).
OpenClaw always uses `proxy: "auto"` plus `storeInCache: true` for Firecrawl requests.
If proxy is omitted, Firecrawl defaults to `auto`. `auto` retries with stealth proxies if a basic attempt fails, which may use more credits
than basic-only scraping.

## [​
](#how-web_fetch-uses-firecrawl)
How `web_fetch` uses Firecrawl

`web_fetch` extraction order:

- Readability (local)

- Firecrawl (if configured)

- Basic HTML cleanup (last fallback)

See [Web tools](/tools/web) for the full web tool setup.
[Exec Approvals](/tools/exec-approvals)[LLM Task](/tools/llm-task)
⌘I