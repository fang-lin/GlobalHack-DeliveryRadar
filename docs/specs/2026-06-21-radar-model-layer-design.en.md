# Delivery Radar Model Layer Design (pluggable provider / gateway)

> **Authoritative version: Chinese (`2026-06-21-radar-model-layer-design.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-21 · On conflict, the Chinese version prevails.**

- **Date:** 2026-06-21
- **Status:** Design reviewed & approved; awaiting the implementation plan
- **Author:** Lin Fang
- **Related:** ADR-0007 (the decision record for this design) · ADR-0006 (platform-agnostic core) · ADR-0003 (TS / typed structured outputs) · ST-0022 (architecture restructure, adjustment A)
- **Goal:** extract `checker.ts`'s direct Anthropic call into a "model port + adapters" so the radar works with most models + gateways (OpenRouter / Vercel AI Gateway and the like). Claude runs natively (most reliable structured output); everything else goes through a unified OpenAI-compatible path.

## 1. Architecture

```
        dependencies point inward ↓
CLI edge  ── makeModelClient(env) reads config, builds the client, injects ──┐
                                                                             ▼
L1 core (pure)  checkConstraint(client: ModelClient, …)  ── depends only on the port
                                                                             │ port
                  ┌──────────────────────────────────────────────────────────┴────────┐
                  ▼                                                                      ▼
        AnthropicAdapter (native)                          OpenAICompatAdapter (universal)
        @anthropic-ai/sdk                                  openai SDK + configurable baseURL
        messages.parse + zodOutputFormat                   json_schema/json_object + zod + retry
        (schema-enforced)                                  → OpenRouter / Vercel / DeepSeek / …
```
The core imports no provider SDK (ADR-0007-C1); provider/gateway specifics live only in the adapters.

## 2. The port (the core's only dependency)

New `src/llm.ts`:
```ts
export interface ModelClient {
  /** prompt + zod schema in, a validated object out; handles structured output + retry internally, throws on failure. */
  complete<T>(opts: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<T>;
}
```
`checker.ts`'s `checkConstraint(client: Anthropic, …)` becomes `(client: ModelClient, …)`; `buildUserPrompt` is unchanged; `SemanticCheckOutputSchema` (`models.ts`) is passed in as the `schema`, unchanged.

## 3. Adapters

### 3.1 AnthropicAdapter (native, kept)
`messages.parse({ model, system, messages, output_config: zodOutputFormat(schema) })` → `parsed_output` (schema-enforced, already validated). I.e. the current `checker.ts` logic moved here.

### 3.2 OpenAICompatAdapter (universal, new)
`new OpenAI({ baseURL, apiKey, defaultHeaders })`. Two structured-output paths, chosen by `RADAR_JSON_MODE` (default `json_object`, the widest-compatible; set `json_schema` where the target supports it); both verified against the vendors' docs on 2026-06 (Chat Completions is still the supported standard surface, the Responses API coexists but has not replaced it):

- **`json_schema` — supported targets (OpenAI / Vercel AI Gateway / capable OpenRouter models):** `response_format:{ type:"json_schema", json_schema:{ name:"verdict", schema, strict:true } }`, where `schema` comes from `z.toJSONSchema(schema)` (**the top-level `$schema` key must be dropped** — strict mode rejects unknown root keys) → `JSON.parse` → **zod-validate**. Note: we do NOT use the OpenAI SDK's `zodResponseFormat` / `chat.completions.parse` helpers — they target zod v3, but this project uses zod/v4, so the schema and parsing are hand-rolled.
- **`json_object` — targets that only support it (e.g. DeepSeek):** `response_format:{ type:"json_object" }` + the schema shown in the prompt (DeepSeek requires the word "json") → `JSON.parse` → **zod-validate**.

Both paths share one **retry loop** (default cap 3): empty content or a `JSON.parse`/zod-validation failure triggers a retry that appends "reply with ONLY the JSON object"; throw after the cap (caught by the radar workflow's failure path, never crashes). Each gateway's exact json_schema support is to be confirmed at implementation (OpenRouter passes `response_format` through).

## 4. Selection & config (env-driven: presets + escape hatch)

The factory `makeModelClient(env)` runs at the **CLI edge** (I/O at the edge, ADR-0006). The `.env` loader also moves here from `checker.ts`. **All config is env vars**; see `.env.example` at the repo root for the template.

**Backend selection (data-driven presets)**

| `RADAR_PROVIDER` | adapter | base_url (default) | native key env | model string example | notes |
|---|---|---|---|---|---|
| `anthropic` (default) | Anthropic native | — | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | most reliable; schema-enforced |
| `openrouter` | OpenAI-compat | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | `anthropic/claude-…`, `deepseek/…` | auto-sends `HTTP-Referer`/`X-Title` headers |
| `vercel` | OpenAI-compat | `https://ai-gateway.vercel.sh/v1` | `AI_GATEWAY_API_KEY` | `provider/model` (e.g. `anthropic/claude-sonnet-4-6`) | unified entry / budgets; supports json_schema |
| `openai-compat` | OpenAI-compat | none (requires `RADAR_BASE_URL`) | `RADAR_API_KEY` | any | escape hatch: any other compatible gateway/provider (incl. direct DeepSeek `https://api.deepseek.com` + `deepseek-v4-flash`) |

**Common config**

- `RADAR_MODEL` — model string (required for gateways; `anthropic` defaults to `claude-sonnet-4-6`). The CLI `check --model` flag overrides it transiently (passes a merged env, never mutates `process.env`).
- `RADAR_BASE_URL` — override the endpoint. **Required** for `openai-compat`; **optional override** for the other presets (point at a self-hosted/proxy gateway).
- `RADAR_JSON_MODE` — `json_schema` | `json_object`, default `json_object` (widest support, incl. DeepSeek); opt into json_schema where the target supports it.
- **Key resolution (the coherent rule):** each backend uses `nativeKey ?? RADAR_API_KEY` — `RADAR_API_KEY` is the **universal fallback** key; the native vars (`ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `AI_GATEWAY_API_KEY`) are conveniences that take precedence.

- keys always via env, **never committed** (`.env` + `.gitignore`; the `.env.example` template is checked in).
- `anthropic` → AnthropicAdapter; the other three → OpenAICompatAdapter (data-driven presets; only base_url/key/headers differ).

## 5. Code change list (= ST-0022 adjustment A + multi-provider)

- **New `src/llm.ts`**: `ModelClient` port + `AnthropicAdapter` + `OpenAICompatAdapter` + `makeModelClient(env)`.
- **Modify `src/checker.ts`**: `checkConstraint` takes `ModelClient`; remove the direct Anthropic bits, `makeClient`, `loadDotenv` (moved to the edge/factory).
- **Modify `src/cli.ts`**: `check` calls `makeModelClient(env)` at the edge and injects into `checkConstraint`.
- **Modify `scripts/eval.ts`**: add `--provider` / `--model`, reuse the same factory.
- **`src/models.ts` unchanged** (the schema is the contract).
- Dependency: add `openai` (npm).

## 6. Eval plan (answers "does quality degrade")

Run the same Backstage eval (grounded vs ungrounded) on `anthropic` (Sonnet), `openrouter` (pointing at various providers), and direct DeepSeek, comparing **F1 / P / R + retrieval hits**. Pick the default provider from the data; the comparison itself becomes a showcase argument ("provider-agnostic + measured quality/cost trade-off"). Needs the matching API key to actually run.

## 7. Testing

The port is mockable: a fake `ModelClient` returning a fixed `Verdict` gives `checkConstraint` pure unit tests (no network, no key) — fulfilling the core testability ADR-0006 called for. The adapter's structured-output/retry logic is tested separately (fed constructed "empty/bad JSON" inputs). The factory also tests presets / missing key / missing model / unknown provider, plus **`RADAR_API_KEY` fallback** and **`RADAR_BASE_URL` override**. The pure modules `diff` (parsing: multi-file segmentation, deleted-file path retention, trailing-newline trim) and `comment` (rendering: ordering, empty path, badges/evidence) each have unit tests.

## 8. Scope / non-goals

- **Scope**: this pass only routes the `radar check` LLM call through the port + the two adapters + the eval knob.
- **The port is designed generically** (`complete({system,user,schema})`) so capture (ST-0005) / drift (ST-0006) / the agent (ST-0010) can reuse it later — but **none of those are implemented here**.
- No streaming, no multi-model voting, no automatic failover (gateways may provide it; not in the core for now).

## 9. References & provenance

The vendor/API facts behind this design were all checked against the official docs (verified **2026-06-20/21**), not from memory. LLM APIs change fast; re-check on implementation and future review (especially each gateway's json_schema support, model names, pricing).

| Source (URL) | What it established |
|---|---|
| DeepSeek API `https://api-docs.deepseek.com/` (incl. json_mode, pricing) | OpenAI/Anthropic-compatible, base_url `https://api.deepseek.com`; current models `deepseek-v4-flash` (thinking/non-thinking modes) / `deepseek-v4-pro` (old `deepseek-chat`/`deepseek-reasoner` deprecated 2026/07/24); structured output is **`json_object` only** (needs "json" in the prompt; vendor admits occasional empty replies) → it uses the fallback path; price v4-flash input $0.14 / output $0.28 per 1M (cache-hit input $0.0028) → ~20–50× cheaper than Sonnet-4-6 ($3/$15). |
| OpenRouter `https://openrouter.ai/docs/quickstart` | OpenAI-compatible, base_url `https://openrouter.ai/api/v1`, standard apiKey, model slug `provider/model`, optional `HTTP-Referer`/`X-Title` headers. **To confirm**: structured-outputs page 404'd + WebSearch unavailable at the time; exact json_schema support to be confirmed on implementation (passes `response_format` through). |
| Vercel AI Gateway `https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions` | OpenAI Chat Completions compatible, base_url `https://ai-gateway.vercel.sh/v1`, `AI_GATEWAY_API_KEY` (Bearer) or OIDC, model `provider/model` (e.g. `anthropic/claude-opus-4.7`), **supports structured outputs**. |
| OpenAI structured outputs `https://developers.openai.com/api/docs/guides/structured-outputs` (note: docs domain moved from `platform.openai.com` to `developers.openai.com`) | Chat Completions **still supported** (Responses API coexists, has not replaced it) → chosen as the compatibility target; json_schema strict shape `{type:"json_schema", json_schema:{name, schema, strict:true}}`; SDK helper **`zodResponseFormat` + `chat.completions.parse()`**. |
