# Code-Fix Report — batch code-review fixes (ADR-0010)

Date: 2026-06-24

## FIX #2 — `src/agent/model.ts`: drop "for capture" from error message

**Change:** `"unknown RADAR_PROVIDER for capture: ${provider}"` → `"unknown RADAR_PROVIDER: ${provider}"`

**Grep check:** `grep -rn "for capture" src` → NOT FOUND ✓

## FIX #4 — `unknownVerdict` pure helper in `src/core/checker.ts`

**Change:** Added `unknownVerdict(constraint: Constraint): Verdict` before `toVerdict`. Returns the exact same literal shape that `conformance.ts` was inlining. Pure data, no SDK.

**Unit test:** `tests/unit/checker.test.ts` — new `describe("unknownVerdict")` block asserting: result "unknown", confidence 0, evidence.code null, fix_locality "none", fix_direction null, explanation matches.

## FIX #4/#6 — `src/agent/conformance-run.ts`: shared conformance runner

**Change:** Created `src/agent/conformance-run.ts` (edge layer, `src/agent/`). Exports `runConformanceCheck(opts)` which composes `buildUserPrompt` + `runAgent` + `toVerdict`/`unknownVerdict`, always passing `maxTokens: 16000`.

**Refactored `src/cli/commands/conformance.ts`:** Removed imports of `buildUserPrompt`, `toVerdict`, `SemanticCheckOutputSchema`, `runAgent`, `buildTools`. Added import of `runConformanceCheck`. The live loop is now one line: `verdicts.push(await runConformanceCheck({ model, skill, constraint, diffs, driverContext: context, root: values.root! }))`.

**Refactored `scripts/eval.ts` grounded arm:** Removed imports of `buildUserPrompt`, `toVerdict`, `buildTools`. Removed `liveTools` variable. Replaced the inline `runAgent({...}) → toVerdict/unknown literal` with `const v = await runConformanceCheck(...)`. `runAgent` and `SemanticCheckOutputSchema` are still used by the ungrounded arm, so kept.

**FIX #6 (maxTokens parity):** eval.ts grounded arm now inherits `maxTokens: 16000` from `runConformanceCheck`, eliminating the drift.

**Grep check:** Both `conformance.ts` and `scripts/eval.ts` import and call `runConformanceCheck` ✓

## FIX #5 — `src/agent/parse.ts`: comment accuracy

**Change:** Updated the comment on `extractJsonObject` from "the first balanced {...} block" to accurately describe the `indexOf`/`lastIndexOf` approach: "a best-effort span from the first `{` to the last `}` (not a true balanced-brace parse — adequate for a single JSON object in the model's text)." Logic is unchanged.

## FIX #7 — `src/agent/tools.ts`: add `timeout: 10000` to both execFileSync calls

**Change:** Both `execFileSync` calls (grep and git tools) now include `timeout: 10000`. Both are already wrapped in try/catch — grep catch returns "no matches", git catch returns the error string — so a timeout becomes a graceful response rather than a CI hang.

## Verification

- `grep -rn "for capture" src` → NOT FOUND ✓
- Both `conformance.ts` and `scripts/eval.ts` use `runConformanceCheck` ✓
- `pnpm lint` → clean ✓
- `pnpm build` → clean ✓
- `pnpm test` → **60 tests passed** (was 59; +1 for unknownVerdict) ✓
- `pnpm exec tsx scripts/eval.ts --replay` → completes without crashing ✓
