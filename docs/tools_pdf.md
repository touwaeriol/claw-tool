# PDF Tool

Source: https://docs.openclaw.ai/tools/pdf

---

Built-in tools

# PDF Tool

# [​
](#pdf-tool)
PDF tool

`pdf` analyzes one or more PDF documents and returns text.
Quick behavior:

- Native provider mode for Anthropic and Google model providers.

- Extraction fallback mode for other providers (extract text first, then page images when needed).

- Supports single (`pdf`) or multi (`pdfs`) input, max 10 PDFs per call.

## [​
](#availability)
Availability

The tool is only registered when OpenClaw can resolve a PDF-capable model config for the agent:

- `agents.defaults.pdfModel`

- fallback to `agents.defaults.imageModel`

- fallback to best effort provider defaults based on available auth

If no usable model can be resolved, the `pdf` tool is not exposed.

## [​
](#input-reference)
Input reference

- `pdf` (`string`): one PDF path or URL

- `pdfs` (`string[]`): multiple PDF paths or URLs, up to 10 total

- `prompt` (`string`): analysis prompt, default `Analyze this PDF document.`

- `pages` (`string`): page filter like `1-5` or `1,3,7-9`

- `model` (`string`): optional model override (`provider/model`)

- `maxBytesMb` (`number`): per-PDF size cap in MB

Input notes:

- `pdf` and `pdfs` are merged and deduplicated before loading.

- If no PDF input is provided, the tool errors.

- `pages` is parsed as 1-based page numbers, deduped, sorted, and clamped to the configured max pages.

- `maxBytesMb` defaults to `agents.defaults.pdfMaxBytesMb` or `10`.

## [​
](#supported-pdf-references)
Supported PDF references

- local file path (including `~` expansion)

- `file://` URL

- `http://` and `https://` URL

Reference notes:

- Other URI schemes (for example `ftp://`) are rejected with `unsupported_pdf_reference`.

- In sandbox mode, remote `http(s)` URLs are rejected.

- With workspace-only file policy enabled, local file paths outside allowed roots are rejected.

## [​
](#execution-modes)
Execution modes

### [​
](#native-provider-mode)
Native provider mode

Native mode is used for provider `anthropic` and `google`.
The tool sends raw PDF bytes directly to provider APIs.
Native mode limits:

- `pages` is not supported. If set, the tool returns an error.

### [​
](#extraction-fallback-mode)
Extraction fallback mode

Fallback mode is used for non-native providers.
Flow:

- Extract text from selected pages (up to `agents.defaults.pdfMaxPages`, default `20`).

- If extracted text length is below `200` chars, render selected pages to PNG images and include them.

- Send extracted content plus prompt to the selected model.

Fallback details:

- Page image extraction uses a pixel budget of `4,000,000`.

- If the target model does not support image input and there is no extractable text, the tool errors.

- Extraction fallback requires `pdfjs-dist` (and `@napi-rs/canvas` for image rendering).

## [​
](#config)
Config

Copy

```
{
  agents: {
    defaults: {
      pdfModel: {
        primary: "anthropic/claude-opus-4-6",
        fallbacks: ["openai/gpt-5-mini"],
      },
      pdfMaxBytesMb: 10,
      pdfMaxPages: 20,
    },
  },
}

```

See [Configuration Reference](/gateway/configuration-reference) for full field details.

## [​
](#output-details)
Output details

The tool returns text in `content[0].text` and structured metadata in `details`.
Common `details` fields:

- `model`: resolved model ref (`provider/model`)

- `native`: `true` for native provider mode, `false` for fallback

- `attempts`: fallback attempts that failed before success

Path fields:

- single PDF input: `details.pdf`

- multiple PDF inputs: `details.pdfs[]` with `pdf` entries

- sandbox path rewrite metadata (when applicable): `rewrittenFrom`

## [​
](#error-behavior)
Error behavior

- Missing PDF input: throws `pdf required: provide a path or URL to a PDF document`

- Too many PDFs: returns structured error in `details.error = "too_many_pdfs"`

- Unsupported reference scheme: returns `details.error = "unsupported_pdf_reference"`

- Native mode with `pages`: throws clear `pages is not supported with native PDF providers` error

## [​
](#examples)
Examples

Single PDF:
Copy

```
{
  "pdf": "/tmp/report.pdf",
  "prompt": "Summarize this report in 5 bullets"
}

```

Multiple PDFs:
Copy

```
{
  "pdfs": ["/tmp/q1.pdf", "/tmp/q2.pdf"],
  "prompt": "Compare risks and timeline changes across both documents"
}

```

Page-filtered fallback model:
Copy

```
{
  "pdf": "https://example.com/report.pdf",
  "pages": "1-3,7",
  "model": "openai/gpt-5-mini",
  "prompt": "Extract only customer-impacting incidents"
}

```

[Diffs](/tools/diffs)[Elevated Mode](/tools/elevated)
⌘I