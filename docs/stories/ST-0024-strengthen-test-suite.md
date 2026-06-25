# ST-0024: Strengthen the radar test suite — co-locate units, fill coverage gaps, real integration tests

- **Status:** Todo · backlog (designed + approved 2026-06-21; deferred to a later session)
- **Type:** radar / testing / quality
- **Related:** ST-0022 (the layering that created the current `tests/` layout) · ADR-0007 (the `ModelClient` port — the seam fakes plug into) · ADR-0006 (platform-agnostic core)

## Story

As the maintainer, I want the radar's tests to be **complete and well-structured** — so coverage gaps are obvious, unit vs integration is clear, and the LLM is never called in CI — so the green checkmark actually means "correct," not "the happy path we happened to test."

## Context — current state & gaps (as of 2026-06-21)

Tests live in `tests/unit/` (flat) + `tests/integration/` + `tests/fixtures/`. Real holes:

**Untested units:**
- `core/models.ts` `validateConstraint` — the two invariants (DM-CONSTRAINT-1 gate-only-deterministic; DM-CONSTRAINT-2 id pattern `ADR-NNN-Cn`) are only hit indirectly via `extractFromDir`, never asserted directly.
- `io/verdicts.ts` `saveVerdicts` / `loadVerdicts` — no round-trip / schema-validation test.
- `io/extract.ts` `dumpConstraints` / `loadConstraints` — untested (only `extractFromText/Dir`, `adrSection` are).
- `llm/anthropic-adapter.ts` `AnthropicAdapter` — untested (only the OpenAI-compat adapter is; Anthropic needs the SDK mocked).
- `core/checker.ts` `buildUserPrompt` — only exercised indirectly through `checkConstraint`; the prompt assembly itself is unasserted.

**Shallow integration:** `tests/integration/pipeline.test.ts` is one happy-path case (a fake client → "VIOLATED" in the markdown). No `aligned` case, no `out-of-scope` case, weak assertions, and the **CLI layer** (`cli/main.ts` + commands: arg parsing, `io/verdicts` save/load, stdout format) is not exercised end-to-end at all.

## Plan / scope

**1. Co-locate unit tests with their source** (makes "what's untested" visible at a glance):
- Move `tests/unit/*.test.ts` next to their modules, e.g. `src/core/checker.ts` + `src/core/checker.test.ts`. Imports become same-dir (`./checker.ts`); fixtures via `../../tests/fixtures/…`.
- Keep **integration** in `tests/integration/` and **shared fixtures** in `tests/fixtures/`.
- `tsconfig.json`: add `"exclude": ["src/**/*.test.ts"]` so `tsc` build does NOT compile test files into `dist/` (they must not ship in the npm package). Vitest discovers them independently (default include covers `src/`).

**2. Fill the unit coverage gaps** (one `*.test.ts` per module above):
- `validateConstraint`: assert both invariants throw with the right id in the message; assert a valid constraint parses.
- `io/verdicts`: save → load round-trip; `loadVerdicts` rejects a malformed file (zod).
- `extract`: `dumpConstraints` → `loadConstraints` round-trip.
- `anthropic-adapter`: `vi.mock("@anthropic-ai/sdk")` (mirror the openai mock); assert `messages.parse` is called with `zodOutputFormat` and the parsed output maps through; assert it throws on `parsed_output == null`.
- `buildUserPrompt`: assert the prompt contains the rule, driver, examples, and the diff fence.

**3. Strengthen integration tests** (the LLM is faked / replayed — never real):
- `tests/integration/pipeline.test.ts` (in-process, inject a fake `ModelClient`): cases for **violated** (assert `constraint_id` / `evidence.code` / `fix_direction` flow through AND render in the markdown), **aligned** (renders `ALIGNED`, never a false `VIOLATED`), **out-of-scope** (a changed path outside `services/inventory/**` → `retrieve` returns `[]`, so the model is never reached).
- `tests/integration/cli.test.ts` (NEW — spawn the real CLI via `tsx`): `extract`, `check --diff <fixture> --replay <verdicts.json>`, `comment --verdicts <…>`; assert stdout + the saved file. This covers arg parsing + `io/verdicts` + output format with **no model** (the `--replay` path skips `makeModelClient`).
- Add fixture `tests/fixtures/verdicts-sample.json` (a `Verdict[]` for `ADR-001-C1`) for the `--replay` test.

**LLM-in-tests policy (decided 2026-06-21):** a real LLM call NEVER happens in CI. Two no-network seams — (a) inject a fake `ModelClient` via the ADR-0007 port (in-process), (b) `--replay` for the CLI (model-less). Optional, only if we ever want the CLI's real adapter+HTTP seam covered: point `RADAR_BASE_URL` at a localhost stub returning a canned `chat.completions` response (largely redundant with the openai-compat unit test, which already mocks the SDK). Real LLM stays in the manual probe/smoke only.

## Acceptance criteria

- [x] Unit tests co-located with source; `tsc` build emits no `*.test.*` into `dist/` (verify `pnpm pack:check` stays green).
- [ ] The five gap modules each have a unit test (validateConstraint, verdicts, dump/load, anthropic-adapter, buildUserPrompt).
- [ ] Integration covers violated + aligned + out-of-scope (in-process) AND a CLI-level `extract`/`check --replay`/`comment` test.
  - [x] CLI-level `extract` + `comment` integration tests added (ST-0024, 2026-06-25); `dispatch` unit tests + `fail()` unit test added; in-process violated/aligned/out-of-scope still pending.
- [ ] `pnpm lint` + `build` + `test` green; no real network in any test.
- [ ] (Sign-off by the maintainer before marking Done.)

## Notes

The approach was designed and approved this session (2026-06-21). The strengthened integration tests were drafted, then reverted so this lands as one deliberate, tracked unit rather than half-done uncommitted work — the exact approach + assertions are captured above for easy execution.
