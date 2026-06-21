# Radar Model Layer Implementation Plan

> **Authoritative version: Chinese (`2026-06-21-radar-model-layer-plan.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-21 · On conflict, the Chinese version prevails.**

> **For implementers:** this plan implements ADR-0007 / `docs/specs/2026-06-21-radar-model-layer-design.zh.md`. Branch `ST-0022-model-layer` (design docs already committed). TDD, one commit per task. Code blocks / paths / identifiers stay verbatim (`doc-management` §6).

**Goal:** extract the radar's LLM call from `checker.ts`'s direct Anthropic use into a `ModelClient` port + native-Anthropic & universal-OpenAI-compatible adapters, compatible with most models + gateways.

**Architecture:** the core depends only on the `ModelClient` port; provider/SDK specifics live in the adapters; `makeModelClient(env)` builds and injects the client at the CLI edge.

**Tech stack:** TypeScript / Node 22 / `zod/v4` / `@anthropic-ai/sdk` (existing) + `openai` (new) / vitest.

## Global constraints (implicit in every task)
- core (`src/`) **must not import** a provider SDK — only the adapters may (ADR-0007-C1).
- keys always via env, **never committed** (`.env` + `.gitignore`).
- structured output must be **zod-validated** before returning.
- the compatibility target is **Chat Completions** (verified still supported).
- commit messages carry **no AI signature**; cite `ST-0022` / `ADR-0007`.

## File structure
- **New `src/llm.ts`**: `ModelClient` port + `AnthropicAdapter` + `OpenAICompatAdapter` + `makeModelClient(env)`.
- **Modify `src/checker.ts`**: `checkConstraint(client: ModelClient, …)`; remove `makeClient`/`loadDotenv`/direct Anthropic.
- **Modify `src/cli.ts`**: `cmdCheck` builds the client from env at the edge.
- **Modify `scripts/eval.ts`**: add `--provider`/`--model`, reuse the factory.
- **Modify `package.json`**: add the `openai` dependency.
- **Tests**: `tests/llm.test.ts` (adapter retry/validation + factory selection), `tests/checker.test.ts` (core via a fake client).

---

### Task 1: `ModelClient` port + decouple the core (fake-client unit test)

**Files:** Create `src/llm.ts` (port only) · Modify `src/checker.ts` · Test `tests/checker.test.ts`

**Interfaces — Produces:**
```ts
// src/llm.ts
import type { z } from "zod/v4";
export interface ModelClient {
  complete<T>(o: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>;
}
```
`checkConstraint` new signature: `(client: ModelClient, constraint, diffs, driverContext?)` (the `model` param is removed); internally replace `client.messages.parse(...)` with
```ts
const out = await client.complete({ system: SYSTEM, user: buildUserPrompt(constraint, diffs, driverContext), schema: SemanticCheckOutputSchema, maxTokens: 16000 });
```
`SYSTEM`/`buildUserPrompt`/the mapping to `Verdict` are unchanged; remove `makeClient`/`loadDotenv`/`import Anthropic`.

- [ ] **Step 1 failing test** `tests/checker.test.ts`: build a `fake: ModelClient` whose `complete` returns a fixed `SemanticCheckOutput`; assert `checkConstraint(fake, constraint, diffs)` produces the matching `Verdict` (result/confidence/evidence/constraint_id).
- [ ] **Step 2 run** `pnpm test tests/checker.test.ts` → expect failure (signature/type mismatch).
- [ ] **Step 3 implement** edit `checker.ts` as above + write the port interface in `src/llm.ts`.
- [ ] **Step 4 run** → expect pass; `pnpm build` (tsc) passes.
- [ ] **Step 5 commit** `git commit -m "refactor(radar): checkConstraint depends on ModelClient port (ST-0022, ADR-0007)"`

### Task 2: `AnthropicAdapter` (native — migrate current logic)

**Files:** Modify `src/llm.ts` · Test `tests/llm.test.ts`

**Interfaces — Produces:** `class AnthropicAdapter implements ModelClient` (constructor takes `{ model: string }`, internally `new Anthropic()`). `complete` uses `messages.parse({ model, max_tokens, thinking:{type:"adaptive"}, system, messages:[{role:"user",content:user}], output_config:{format: zodOutputFormat(schema)} })` → take `parsed_output`, throw if empty. I.e. move the call from the current `checkConstraint` into it.

- [ ] **Step 1 test**: mock `@anthropic-ai/sdk` (vi.mock) so `messages.parse` returns `{parsed_output: <obj>}`; assert `new AnthropicAdapter({model}).complete({system,user,schema})` returns that obj; throws when `parsed_output==null`.
- [ ] **Step 2 run** → fail.
- [ ] **Step 3 implement** `AnthropicAdapter`.
- [ ] **Step 4 run** → pass.
- [ ] **Step 5 commit** `git commit -m "feat(radar): AnthropicAdapter (native, schema-enforced) for the model port (ADR-0007)"`

### Task 3: `OpenAICompatAdapter` (most error-prone — test the retry hard)

**Files:** Modify `src/llm.ts` · `package.json` (add `openai`) · Test `tests/llm.test.ts`

**Interfaces — Produces:** `class OpenAICompatAdapter implements ModelClient`, constructor `{ model, baseURL, apiKey, headers?, mode: "json_schema" | "json_object", maxRetries?=3 }`, internally `new OpenAI({ baseURL, apiKey, defaultHeaders: headers })`.
- `mode==="json_schema"`: `response_format: { type:"json_schema", json_schema:{ name:"verdict", schema: z.toJSONSchema(schema), strict:true } }`.
- `mode==="json_object"`: `response_format:{ type:"json_object" }` + the schema shown in the system prompt.
- Both: `chat.completions.create(...)` → `content = choices[0].message.content` → JSON.parse → `schema.parse` → on empty/parse/validation error retry (append "reply with ONLY the JSON object") up to `maxRetries` → then throw `Error("model returned no valid structured output after N tries")`.

- [ ] **Step 1 test** (core): mock the OpenAI client's `chat.completions.create` to return in turn: ① `content:""` (empty) ② `content:"not json"` ③ valid JSON. Assert json_object mode retries to the 3rd, returns the validated object, and `create` was called 3 times. Plus a case that always returns `""` → asserts it throws and call count = `maxRetries`. Plus json_schema mode: mock returns parsed content → asserts it returns directly.
- [ ] **Step 2 run** → fail.
- [ ] **Step 3 implement** `OpenAICompatAdapter`; `pnpm add openai`.
- [ ] **Step 4 run** → pass.
- [ ] **Step 5 commit** `git commit -m "feat(radar): OpenAICompatAdapter — json_object/json_schema + zod + retry for gateways/providers (ADR-0007)"`

### Task 4: `makeModelClient(env)` factory (presets + escape hatch + .env)

**Files:** Modify `src/llm.ts` · Test `tests/llm.test.ts`

**Interfaces — Produces:** `makeModelClient(env: NodeJS.ProcessEnv = process.env): ModelClient`. Reads `RADAR_PROVIDER` (default `anthropic`):
- `anthropic` → `AnthropicAdapter({ model: env.RADAR_MODEL ?? DEFAULT_MODEL })`
- `openrouter` → `OpenAICompatAdapter({ baseURL:"https://openrouter.ai/api/v1", apiKey: env.OPENROUTER_API_KEY, headers:{…}, model: env.RADAR_MODEL, mode })`
- `vercel` → `OpenAICompatAdapter({ baseURL:"https://ai-gateway.vercel.sh/v1", apiKey: env.AI_GATEWAY_API_KEY, model: env.RADAR_MODEL, mode })`
- `openai-compat` → `OpenAICompatAdapter({ baseURL: env.RADAR_BASE_URL!, apiKey: env.RADAR_API_KEY, model: env.RADAR_MODEL!, mode })`
- missing key/required field → throw a clear error. `loadDotenv` (moved from checker) runs first.

- [ ] **Step 1 test**: `env={RADAR_PROVIDER:"openrouter",OPENROUTER_API_KEY:"x",RADAR_MODEL:"m"}` → asserts an `OpenAICompatAdapter` instance; default `RADAR_PROVIDER` → `AnthropicAdapter`; `openai-compat` without `RADAR_BASE_URL` → throws.
- [ ] **Step 2 run** → fail.
- [ ] **Step 3 implement** the factory + move `loadDotenv`.
- [ ] **Step 4 run** → pass.
- [ ] **Step 5 commit** `git commit -m "feat(radar): makeModelClient(env) factory — provider/gateway presets + escape hatch (ADR-0007)"`

### Task 5: wire `cli.ts`

**Files:** Modify `src/cli.ts`

In `cmdCheck` replace `const client = makeClient()` with `const client = makeModelClient()`; keep `--model` as an override (if passed, set `process.env.RADAR_MODEL` then `makeModelClient()`). `import { makeModelClient } from "./llm.js"`; drop the `makeClient`/`DEFAULT_MODEL` imports (DEFAULT_MODEL now lives in llm.ts).

- [ ] **Step 1** edit `cli.ts` as above.
- [ ] **Step 2 run** `pnpm build && pnpm test && pnpm lint` → all green.
- [ ] **Step 3 smoke** (free, no LLM): `node dist/cli.js extract` still works; `comment --verdicts artifacts/pr1-verdicts.json --all` still prints (unaffected).
- [ ] **Step 4 commit** `git commit -m "feat(radar): cli check builds the model client from env at the edge (ADR-0007)"`

### Task 6: eval `--provider`/`--model`

**Files:** Modify `scripts/eval.ts`

In eval's grounded arm use `makeModelClient()` (read env / CLI args `--provider --model` → set env → build the client). Same for the ungrounded arm. **Do not change the corpus/scoring**, only the client source.

- [ ] **Step 1** edit `eval.ts`: parse `--provider`/`--model` → set env → `makeModelClient()`.
- [ ] **Step 2 run** `pnpm build` passes; the `--replay` (if supported) / `--help` path does not error (no live LLM).
- [ ] **Step 3 commit** `git commit -m "feat(eval): select provider/model so the Backstage benchmark runs across providers (ADR-0007)"`

### Task 7: wrap-up

- [ ] `pnpm lint && pnpm build && pnpm test` all green.
- [ ] `grep -rE "execFileSync|@anthropic-ai/sdk|new OpenAI|import OpenAI" src/` → only `src/llm.ts` (no provider SDK elsewhere in the core, per ADR-0007-C1).
- [ ] Add the **en mirrors** of `docs/specs` + this plan (before merge, `doc-management` §5).
- [ ] Update ST-0022's Verification table; open the PR (cite ST-0022 / ADR-0007).
- [ ] (running the comparison needs a key — **provided + triggered by the user**) eval Sonnet vs DeepSeek/OpenRouter, fold the numbers back into spec §6.

## Self-review (spec coverage)
- spec §2 port → Task 1 ✓ · §3.1 Anthropic → Task 2 ✓ · §3.2 OpenAI-compat+retry → Task 3 ✓ · §4 config presets → Task 4 ✓ · §5 wiring → Task 5/6 ✓ · §6 eval → Task 6 ✓ · §7 testing → Task 1/3/4 ✓ · §8 scope (only check, not capture/drift) → plan stays in bounds ✓.
- no placeholders; type names consistent (`ModelClient.complete`, `makeModelClient`, the adapter constructor fields).
- to-confirm item (spec §9): OpenRouter's exact json_schema support — Tasks 3/4 use a `mode` config; the openrouter preset defaults to json_object for safety, flip to json_schema if a live run shows it's supported.
