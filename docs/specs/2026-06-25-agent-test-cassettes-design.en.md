> **Authoritative: Chinese (`2026-06-25-agent-test-cassettes-design.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-25 · On conflict, the Chinese version prevails.**

# Agent test cassettes (record/replay) — design

- **Status**: Draft (design pending maintainer review)
- **Relates**: `ST-0024` (strengthen the test suite) · `ADR-0010` (one shared agent engine) · `ADR-0009` (capture agent at the edge) · `ADR-0006` (platform-agnostic core, config from `process.env` only) · reuses `MockLanguageModelV3` from `ai/test`
- **Date**: 2026-06-25

## 1. Background & problem

The radar's two core LLM operations (conformance, capture) now both run on the shared investigative-agent engine `runAgent` (`src/agent/engine.ts`): a Vercel AI SDK tool loop (`stopWhen: stepCountIs(24)`) where the model autonomously calls read-only tools (`read_file` / `grep` / `git`, see `src/agent/tools.ts`) to investigate the repo over multiple rounds until it produces a structured result; the engine is also dual-path (`Output.object` primary → text-parse fallback).

**Problem**: the existing integration tests don't exercise that error-prone path at all.

- `tests/integration/conformance-pipeline.test.ts` / `capture-pipeline.test.ts` feed `--replay` **hand-written ideal JSON** (fake verdicts / notes); the command takes the replay branch and **the whole agent is skipped** — they only test "render a saved result to stdout".
- `scripts/eval.ts --replay` is the same: its cache stores the **final result** (`cache[gKey] = grounded`, the finished verdict); on replay it never even calls `runConformanceCheck`.

So: what shape the model actually returns, `Output.object` parsing, text-parse fallback, the tool loop, the `toVerdict` conversion — **none of the most error-prone parts are covered**. Hand-written ideal data bypasses them. That's a form of fudging.

Separately, `tests/unit/skill-capture.test.ts` / `skill-conformance.test.ts` each just `readFileSync` a `SKILL.md` and regex-assert it contains a keyword (`/implicit/i`, `/driver/i`); they import no code, are fragile and low-signal — a tail left by the `ST-0024` co-location (no corresponding `.ts` impl, so they weren't co-located).

## 2. Goals / non-goals

**Goals**
1. Get the **real agent behaviour** of conformance and capture (tool loop, parsing, fallback, `toVerdict`) under automated test — with **no real LLM, no API cost, fully deterministic**.
2. Use **record/replay cassettes**: record the full model+tool interaction on a first real run; on replay both the model and the tools return the recorded data, **tools do not actually run**, and the agent's own logic runs for real.
3. Tidy the test suite alongside: delete the two flimsy skill tests, unify integration naming, add a worthwhile guard for the skill files.

**Non-goals**
- Don't replace `eval`'s corpus/metrics (eval's replay is the harness's concern; this design is only about agent unit/integration tests).
- No cassettes for `extract` / `comment` (they don't call the LLM).
- No new runtime dependency; no change to user-visible CLI behaviour.

## 3. Approach overview

The cassette mocks the **two external boundaries** of the agent; the agent itself runs for real:

| Boundary | What's recorded | Replay |
|---|---|---|
| **Model** (Vercel AI SDK `LanguageModel`) | each `doGenerate` input (normalized) + result (content/finishReason/usage), in call order | `MockLanguageModelV3` (`ai/test`) returns the recorded sequence; **verifies the current input matches the recorded input** |
| **Tools** (`tool().execute`) | each tool call's `name` + input + output, in order | replace `execute`: **does not run for real**, returns the recorded output in order; **verifies the current input matches** |

The `runAgent` loop, `Output.object`/text-parse, and `toVerdict` all run for real — only those two boundaries are fed recorded data.

**Preventing silent staleness is central**: on replay we **verify the input** — the current model call / tool call input must equal the recorded one for that step; if not, the **test fails and prompts an `update` re-record**. Otherwise, after changing a skill/prompt/tool the cassette would keep returning old data and the test would still pass — which is just another form of fudging.

## 4. Architecture & components

A new test-side module `tests/cassettes/` (infra + data); production code gains only a minimal dependency-injection seam.

### 4.1 Cassette file format

One JSON file per case, `tests/cassettes/<op>-<case>.json`:

```jsonc
{
  "meta": {
    "op": "conformance",            // or "capture"
    "case": "violated-core-git",
    "recordedAt": "<ISO date, written at record time>",
    "model": "vercel/deepseek-v4-pro",
    "jsonMode": "json_object"
  },
  "modelCalls": [                    // in doGenerate call order
    {
      "inputDigest": "<hash of normalized input>",
      "result": { /* doGenerate result: content (text/tool-call blocks), finishReason, usage */ }
    }
  ],
  "toolCalls": [                     // in tool-call order
    { "name": "grep", "input": { "pattern": "execFileSync", "path": "src" }, "output": "src/...:42: ..." }
  ]
}
```

> **To verify at implementation time**: the exact `doGenerate` result fields and the `MockLanguageModelV3` construction shape (known: `finishReason:{unified,raw}`, `usage:{inputTokens:{total},outputTokens:{total}}`) against the installed `ai@6` `LanguageModelV3` types — store just enough for replay. `inputDigest` is hashed from the normalized input (strip temp paths, timestamps, other volatile bits).

### 4.2 Recording/replay model & tools

- `recordingModel(real)`: wraps the real `LanguageModel`, side-records each `doGenerate` input + result.
- `replayModel(cassette)`: built on `MockLanguageModelV3`, returns the `modelCalls` sequence; verifies each `inputDigest` against the current input, throws on mismatch (prompts `update`).
- `recordingTools(real, sink)` / `replayTools(cassette)`: wrap/replace the `execute` of the tools produced by `buildTools`. The replay version doesn't run for real, returns the `toolCalls` in order, and verifies `(name, input)` matches.

### 4.3 Production injection seam (minimal, backward-compatible)

Current path: `cmdConformance(argv)` → `selectModel(process.env)` + `runConformanceCheck({model, …, root})` → internal `buildTools(root)`; capture is isomorphic (`cmdCapture` → `runCapture`). Tools are built inside the runner with no injection point. Changes:

- **runner** `runConformanceCheck` / `runCapture`: add an **optional `tools` param**, defaulting to `buildTools(opts.root)`.
- **command** `cmdConformance` / `cmdCapture`: add an **optional second arg `deps?: { makeModel?, makeTools? }`**, defaulting to `selectModel` / `buildTools`, passing `makeTools` down to the runner.

The production path is unchanged (defaults = current behaviour); the cassette logic lives **entirely test-side** — tests call `cmdConformance(argv, { makeModel, makeTools })` to inject the record/replay versions. This tests the command end-to-end (argv → retrieve → agent → render), swapping only the model+tools for cassettes.

### 4.4 Three-state switch

Environment variable `RADAR_CASSETTE`:
- unset / other → **`replay`** (default; CI and normal test runs take this, zero API).
- `record` → record only missing cassettes by running for real (requires real provider env: `RADAR_PROVIDER`/`RADAR_MODEL`/key).
- `update` → force re-record all target cassettes.

`record`/`update` **cost API and are maintainer-triggered** (project hard rule); `replay` never touches the network.

## 5. Cases covered

Fixed fixtures (a small ADR + diff under `tests/fixtures/`, made into a git snapshot if a case needs the `git` tool — see §8 risks):

- **conformance**: one cassette each for `violated`, `aligned`, `unknown`.
- **capture**: `has-notes` (catches an unrecorded decision), `no-notes` (clean).

The replay tests assert the runner's **structured result** (the verdict's `result`/`constraint_id`; the notes' count/`detected_decision`), not just "stdout contains a string".

## 6. Test tidy-up (same PR)

1. **Delete** `tests/unit/skill-capture.test.ts`, `skill-conformance.test.ts`; remove the empty `tests/unit/` dir.
2. **Unify integration naming**: CLI render/argv tests `*-pipeline` → `<cmd>-cli` (`conformance-cli`, `capture-cli`, `comment-cli`, plus the existing `extract-cli`); the real "module wiring" test `pipeline.test.ts` → `core-pipeline.test.ts`. Use `git mv` to keep history, **content unchanged**.
3. **Skill-file guard**: replace the two deleted tests with **one data-driven test** — iterate `skills/*/SKILL.md`, validate each has legal frontmatter (`name` / `description`). More robust to adding/removing skills than per-file tests; guards the real risk that `skills/` is read by path at runtime and shipped in the package, so it mustn't be lost/broken.

**Two complementary, non-overlapping test kinds**:
- **cassette tests** (new): test the agent's real reasoning/tool-loop/parsing (inject the cassette).
- **CLI render tests** (existing `--replay`, renamed `<cmd>-cli`): test command argv parsing + rendering the result to stdout/markdown (feed the result, don't touch the agent).

## 7. How to validate the infra itself

- **Deterministic + zero API**: run the full suite with `RADAR_CASSETTE` unset → green, with no network calls.
- **Staleness check works**: deliberately change one input in a cassette (or change a prompt); replay **must go red** and prompt `update` — proving the verification is real, not decorative.
- **Guard works**: deliberately break a `SKILL.md` frontmatter; the guard **must go red**; restore → green. (Skip this and the guard is just another always-green flimsy test.)
- **Count reconciliation**: renaming doesn't change the test count; deleting 2 skill tests subtracts 2; the guard + cassette tests each add per their case count. Run `pnpm test` and reconcile; investigate any mismatch.
- `pnpm lint && pnpm build && pnpm test` all green.

## 8. Scope, risks & trade-offs

- **Scope**: only conformance + capture get cassettes; `extract`/`comment` don't call the LLM, left as-is (rename only).
- **Cassette maintenance cost**: changing a skill/prompt/tool/schema → the model input changes → verification fails → needs `update` re-record (API cost, maintainer-triggered). This is deliberate: explicit re-record over silent staleness.
- **The `git` tool special case**: on replay tools don't run, so `git` needs no real repo. But on **record** the tools do run for real — if a case's agent calls `git`, the fixture must be a git snapshot at record time. **Simplification**: prefer cases the agent can judge with only `read_file`/`grep`, avoiding `git`, so the fixture is just a plain fixed directory.
- **Match brittleness**: temp paths/timestamps in inputs must be normalized before digesting, or replay falsely reports a mismatch.

## 9. Constraints (ADRs / project rules)

- Core `src/core/` touches no SDK/platform (`ADR-0006-C1`); config from `process.env` only (`ADR-0006-C2`); the cassette infra is test-side, never pollutes `src/core`.
- Every LLM operation still goes only through the shared engine `runAgent` (`ADR-0010-C1`); the seam doesn't change that.
- ESM-only, `.ts` import suffixes.
- **Tests never call a real LLM**: `replay` is the default, CI never goes online; `record`/`update` cost API and are **maintainer-triggered, not triggered by Claude**.
- Commits carry no AI signature, cite IDs (`ST-0024`, this spec).
- Confirm no key / sensitive content leaks into a cassette before committing it.

## 10. References & verification

- **Existing infra (read 2026-06-25)**: `src/agent/engine.ts` (`runAgent`, `stepCountIs(24)`, dual-path), `src/agent/tools.ts` (`read_file`/`grep`/`git`, all `inRoot`/`cwd:root` sandboxed), `src/agent/conformance-run.ts` (`runConformanceCheck({model,…,root})`, internal `buildTools`), `src/capture/agent.ts` (`runCapture`, internal `buildTools`), `src/cli/commands/{conformance,capture}.ts` (`cmd*(argv)` → `selectModel(process.env)`), `scripts/eval.ts` (`--replay` records the final-result layer), the existing 5 `tests/integration/*` and 2 `tests/unit/skill-*`.
- **To verify at implementation time**: the installed `ai@6` `LanguageModelV3.doGenerate` result shape and `MockLanguageModelV3` construction shape (define the cassette fields against the package types); the exact `tool().execute(input, options)` signature.
- **Reused pattern**: `src/agent/engine.test.ts`, `src/capture/agent.test.ts` already use `MockLanguageModelV3`; the replay model extends that.
