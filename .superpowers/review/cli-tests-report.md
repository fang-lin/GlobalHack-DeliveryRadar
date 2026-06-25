# CLI Tests Report — ST-0024

## Tests Added

| File | Tests | What it covers |
|------|-------|----------------|
| `src/cli/main.test.ts` | 5 | `dispatch()` routing: extract, conformance, comment, capture → correct command called with correct remaining args; unknown command → `fail()` called with message containing "unknown command" and the bad command name |
| `src/cli/util.test.ts` | 1 | `fail("boom")` → `console.error("error: boom")` + `process.exit(2)`; spies on both, restores in afterEach |
| `tests/integration/comment-pipeline.test.ts` | 1 | Writes a temp verdicts.json with `constraint_id: "ADR-0006-C1"` / `result: "violated"`, calls `cmdComment(["--verdicts", tmpVerdicts, "--adr-dir", "docs/adr"])`, asserts stdout contains "Delivery Radar — Architecture Conformance", "ADR-0006-C1", "VIOLATED"; returns 0 |
| `tests/integration/extract-cli.test.ts` | 1 | Calls `cmdExtract(["--adr-dir", "docs/adr"])` against real ADRs, asserts stdout contains "ADR-0006-C1"; returns 0 |

**Total new tests: 8** (60 before → 68 after)

## Source Changes

- `src/cli/main.ts`: extracted `export async function dispatch(argv: string[])` (the switch block, now takes argv as parameter); bottom invocation wrapped in `isMain` guard (`import.meta.url === new URL(process.argv[1], "file://").href`) to prevent side-effects when imported by vitest.

- `docs/stories/ST-0024-strengthen-test-suite.md`: added progress note under AC #3 (CLI-level tests done; in-process three-scenario tests still pending).

## `find dist -name "*.test.*"` output

```
(empty — no test files in dist)
```

## Verification results

```
pnpm lint   → 0 errors, 0 warnings
pnpm build  → tsc exits 0; dist/ clean
pnpm test   → Test Files  22 passed (22)
               Tests  68 passed (68)
               Errors  0
```

## Network calls in tests

None. All four new tests are fully offline:
- `main.test.ts` — mocks all command modules and util
- `util.test.ts` — only calls `fail()` with spied exit/console
- `comment-pipeline.test.ts` — uses real ADRs (local filesystem) + pre-baked verdicts JSON; no LLM
- `extract-cli.test.ts` — uses real ADRs (local filesystem); no LLM
