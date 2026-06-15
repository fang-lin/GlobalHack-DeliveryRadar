# Delivery Radar — eval report (grounded vs ungrounded)

Corpus: 7 human-labelled cases on **real Backstage ADRs**. Model: `claude-sonnet-4-6`. Ground truth is hand-labelled in `eval/cases.yaml` — the harness never asks the model for the gold label.

| case | gold | grounded | ungrounded | source |
|---|---|---|---|---|
| `adr012-violated-pr28986` | violated | violated ✓ | aligned ✗ | [PR](https://github.com/backstage/backstage/pull/28986) |
| `adr012-aligned-preset` | aligned | aligned ✓ | aligned ✓ | constructed-compliant-example |
| `out-of-scope-docs` | out-of-scope | no-fire ✓ | aligned · | representative |
| `adr006-react-fc-violated` | violated | violated ✓ | aligned ✗ | constructed-probe |
| `adr014-nodefetch-supersede` | violated | violated ✓ | aligned ✗ | [PR](packages/backend-defaults/src/entrypoints/urlReader/lib/GithubUrlReader.ts) |
| `adr007-adhoc-mock-violated` | violated | violated ✓ | violated ✓ | constructed-representative |
| `adr007-msw-aligned` | aligned | aligned ✓ | unknown · | [PR](packages/integration/src/gitlab/GitLabIntegration.test.ts) |

## Violated-class detection (in-scope cases)

| arm | precision | recall | F1 | tp | fp | fn |
|---|---|---|---|---|---|---|
| **grounded** | 1.00 | 1.00 | 1.00 | 4 | 0 | 0 |
| ungrounded | 1.00 | 0.25 | 0.40 | 1 | 0 | 3 |

Retrieval precision (out-of-scope respected): **1/1**.

## Per-case rationale

- **adr012-violated-pr28986** (gold: violated) — A merged, CI-green PR titled "Fix date parsing and formatting in convertTimeToLocalTimezone" that STILL returns a custom toFormat('yyyy-MM-dd hh:mm:ss ZZZZ') for a value shown in the UI — violates ADR012 (use locale presets). An ungrounded best-practice reviewer sees only "date formatting, looks fine".
  - grounded: _The updated function still returns `strDateTime.toFormat('yyyy-MM-dd hh:mm:ss ZZZZ')`, a hard-coded custom pattern string, for the value that is ultimately displayed to users. This directly violates the prohibition on using `toFormat(...)` for UI-displayed dates._
  - ungrounded: _The refactoring is cleaner: using `toISOString()` and `DateTime.fromISO` is more robust than calling `toLocaleString()` then parsing with a fixed format string. One pre-existing issue (`hh` is 12-hour clock, should be `HH` for 24-hour) is carried over but not introduced by this diff. The implicit assumption that string inputs are ISO-formatted should be consistent with callers._
- **adr012-aligned-preset** (gold: aligned) — Renders a timestamp via DateTime.toLocaleString(DateTime.DATETIME_MED) — compliant with ADR012. Tests that grounding does not over-flag.
  - grounded: _The diff replaces a raw ISO string display with `DateTime.fromISO(iso).toLocaleString(DateTime.DATETIME_MED)`, which is exactly the locale-aware preset pattern mandated by ADR-BS012-C1. No custom `toFormat` pattern strings are introduced._
  - ungrounded: _The change correctly converts an ISO timestamp to a locale-aware human-readable string while preserving the raw ISO value as a tooltip, which is a straightforward and sensible improvement. No edge cases like invalid ISO strings are handled, but that's a minor omission rather than a blocking issue._
- **out-of-scope-docs** (gold: out-of-scope) — Docs-only change (*.md). No code constraint is in scope, so radar must not fire — a retrieval-precision check.
  - ungrounded: _The diff simply adds a documentation sentence explaining how to override the backend base URL. No code logic, security, or correctness issues are introduced._
- **adr006-react-fc-violated** (gold: violated) — Adds a component typed `const StatusLabel: React.FC<Props>` — violates ADR006 (avoid React.FC). No real PR adds React.FC because lint blocks it, so this is a probe; the point is the soul case: a generic best-practice reviewer treats React.FC as perfectly fine, so only the grounded checker flags it.
  - grounded: _The new component `StatusLabel` is typed as `React.FC<StatusLabelProps>`, which is explicitly prohibited by ADR-BS006-C1. This implicitly injects a `children` prop and uses the banned typing pattern._
  - ungrounded: _The component is a straightforward, well-typed presentational badge that maps a constrained union type to a CSS class and display text. No issues with the implementation._
- **adr014-nodefetch-supersede** (gold: violated) — Real Backstage code importing `node-fetch`. It complied with ADR013 (which mandated node-fetch) but ADR014 supersedes it with native fetch, so the import is now drift from current intent — a Supersede case.
  - grounded: _The diff explicitly adds `import fetch, { RequestInit, Response } from 'node-fetch'`, which is precisely the import pattern prohibited by ADR-BS014-C1. Node.js 20+ provides native global `fetch`, `RequestInit`, and `Response` without any import._
  - ungrounded: _Explicitly importing `fetch`, `RequestInit`, and `Response` from `node-fetch` is appropriate here because `node-fetch` provides a Node.js-style readable stream body, which is required by `ReadUrlResponseFactory.fromNodeJSReadable`; relying on the global `fetch` (Node 18+) would yield a Web `ReadableStream` instead. The `Response` import isn't visible in use within this diff, but it may be referenced elsewhere in the file._
- **adr007-adhoc-mock-violated** (gold: violated) — A test that stubs the network via `global.fetch = jest.fn()` — the ad-hoc mocking ADR007 prohibits (use MSW). Representative of the ~11 global.fetch mocks still in the repo.
  - grounded: _The test stubs HTTP by reassigning `global.fetch` with `jest.fn().mockResolvedValue(...)`, which is explicitly prohibited by ADR-BS007-C1. MSW's `setupServer` with `rest`/`http` handlers must be used instead._
  - ungrounded: _The `global.fetch` mock is set in `beforeEach` but never restored in an `afterEach`, so the stub leaks into any test files that run afterward in the same Jest worker, potentially causing false positives or hard-to-diagnose failures. Add `afterEach(() => jest.restoreAllMocks())` or save and restore the original `global.fetch` to prevent the leak._
- **adr007-msw-aligned** (gold: aligned) — Real Backstage test mocking HTTP with MSW (setupServer + rest handlers) — compliant with ADR007. Tests that grounding does not over-flag.
  - grounded: _The diff introduces MSW-based HTTP mocking via setupServer with rest.get handlers, exactly as required by ADR-BS007-C1. No hand-rolled fetch stubs, global.fetch reassignments, or nock usage are present._
  - ungrounded: _The MSW server setup follows a standard pattern, but the intercepted URL `https://h.com/api/v4` looks like a placeholder or truncated hostname rather than a realistic GitLab test URL. Without seeing the rest of the test file it's impossible to confirm whether this handler actually matches the URLs used in the tests, or if it will silently never fire._

> Honesty: small seeded corpus — numbers are illustrative, not a statistical accuracy claim. The point is that the grounded↔ungrounded gap reproduces on real, maintainer-authored ADRs, and that the harness scales to real history.
