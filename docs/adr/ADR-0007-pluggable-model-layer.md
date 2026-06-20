# ADR-0007: Pluggable model layer — a `ModelClient` port with native + OpenAI-compatible adapters

- **Status:** Accepted
- **Date:** 2026-06-21
- **Deciders:** Lin Fang
- **Related:** ADR-0006 (platform-agnostic core; the LLM is the core's one allowed outbound dependency) · ADR-0003 (TypeScript, typed structured outputs) · ST-0022 (architecture restructure, adjustment A)

## Context

ADR-0006 established that the radar core is platform-agnostic and that an LLM provider is its **one** allowed outbound dependency — but today `checker.ts` hardwires the Anthropic SDK: `import Anthropic`, `messages.parse` + `zodOutputFormat`, the model id, and a `.env` loader are all tangled into the domain module. That blocks two things this tool needs to be genuinely usable:

- **Cost / freedom to iterate.** The Claude API is expensive; gateways and cheaper providers (DeepSeek, etc.) are ~20–50× cheaper, which means we can dogfood every PR and re-run the eval freely.
- **Coverage.** A real tool should run on most models and on model gateways (Vercel AI Gateway, OpenRouter, …), not one vendor.

So the LLM dependency must become **pluggable**, without losing the proven Anthropic structured-output path the radar + eval are currently calibrated on.

*All vendor/API facts behind this decision — OpenAI-compatibility, model names, structured-output shapes (`response_format` json_schema vs json_object), the OpenAI SDK `zodResponseFormat`/`parse` helper, and pricing — were verified against the vendors' docs on 2026-06-20/21, not from memory. Exact URLs and what each established are recorded in the design spec's "参考与查证 (provenance)" section (`docs/specs/2026-06-21-radar-model-layer-design.zh.md`). LLM APIs change fast; re-check at implementation.*

## Decision

1. **The core depends on a `ModelClient` port**, not a concrete SDK:
   `complete<T>({ system, user, schema }) → Promise<T>` — returns a **zod-validated** object. The check/capture/drift logic passes a prompt + schema and gets a validated result; it knows nothing about providers.

2. **Two adapters implement the port:**
   - **Anthropic (native, kept):** `@anthropic-ai/sdk` `messages.parse` + `zodOutputFormat` (schema-enforced). The most reliable structured-output path; default for Claude direct.
   - **OpenAI-compatible (universal, new):** the OpenAI SDK with a configurable `baseURL` / `apiKey` / headers. Covers any OpenAI-compatible provider **or gateway** — OpenRouter, Vercel AI Gateway, DeepSeek, OpenAI, Azure, LiteLLM, … Structured output: `json_schema` when the target supports it, else `json_object` (schema shown in the prompt), then **parse → zod-validate → bounded retry** to tolerate weaker / occasionally-empty outputs.

3. **Gateways are configuration, not code.** Any OpenAI-compatible gateway works via `base_url + model + key`. Shipped presets: **`anthropic`** (native), **`openrouter`**, **`vercel`**, plus a generic **`openai-compat`**; anything else via a `RADAR_BASE_URL` escape hatch.

4. **Selection/construction happens at the edge** (ADR-0006): a `makeModelClient(env)` factory reads config (`RADAR_PROVIDER` / `RADAR_MODEL` / `RADAR_BASE_URL` + per-provider key env vars) at the CLI boundary and injects a `ModelClient` into the core. Keys live in env, never committed.

5. **Cross-provider quality is measured, not assumed.** The eval harness (`scripts/eval.ts`) gains a provider/model knob so the same Backstage benchmark is run across providers and compared on F1 / precision / recall — this is how we pick a default and answer "does quality degrade".

## Consequences

- The core becomes provider-agnostic and **unit-testable with a fake `ModelClient`** (no network, no key) — fulfilling an ADR-0006 consequence.
- Adding a provider/gateway = config (or a tiny preset), **not** a core change.
- Cost can drop ~20–50× by routing dev/dogfood to a cheap model/gateway, while the best-measured model is used for the demo — swappable by config.
- Cost of the decision: a bit more adapter code, and a structured-output retry path for non-native providers (the native Anthropic path keeps schema enforcement).

## Machine-checkable constraints

```constraints
- id: ADR-0007-C1
  adr: ADR-0007
  title: core LLM access goes through the ModelClient port, not a concrete provider SDK
  rule: >
    Domain code under src/ that needs an LLM MUST depend on the ModelClient port
    (complete({system,user,schema}) -> a zod-validated object), never on a concrete
    provider SDK or its call shape. Provider / gateway / SDK specifics — the
    Anthropic SDK, the OpenAI SDK, base_url, model ids, response_format, retry —
    live ONLY in adapter modules, never in check/capture/drift logic. The client is
    selected and constructed from config at the edge (a makeModelClient factory),
    not inside the core. Importing a provider SDK into core domain logic, or
    embedding a model id / base_url / response_format literal in check logic, is a
    violation.
  polarity: requirement
  driver: ADR-0007 — a pluggable, cost-flexible, testable model layer; reinforces ADR-0006
  scope:
    paths: ["src/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "checker.ts takes a ModelClient and calls client.complete({system, user, schema})"
        - "AnthropicAdapter / OpenAICompatAdapter import the SDKs; the core imports neither"
        - "makeModelClient(env) builds the adapter at the CLI edge and injects it into the core"
      violating:
        - "checker.ts imports @anthropic-ai/sdk or openai directly and calls messages/chat.completions"
        - "a model id, base_url, or response_format literal embedded in the check logic"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
