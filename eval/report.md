# Delivery Radar — eval report (grounded vs ungrounded)

Corpus: 7 human-labelled cases on **real Backstage ADRs**. Model: `vercel/deepseek/deepseek-v4-pro`. Ground truth is hand-labelled in `eval/cases.yaml` — the harness never asks the model for the gold label.

| case | gold | grounded | ungrounded | source |
|---|---|---|---|---|
| `adr012-violated-pr28986` | violated | violated ✓ | aligned ✗ | [PR](https://github.com/backstage/backstage/pull/28986) |
| `adr012-aligned-preset` | aligned | aligned ✓ | aligned ✓ | constructed-compliant-example |
| `out-of-scope-docs` | out-of-scope | no-fire ✓ | aligned · | representative |
| `adr006-react-fc-violated` | violated | violated ✓ | aligned ✗ | constructed-probe |
| `adr014-nodefetch-supersede` | violated | violated ✓ | aligned ✗ | [PR](packages/backend-defaults/src/entrypoints/urlReader/lib/GithubUrlReader.ts) |
| `adr007-adhoc-mock-violated` | violated | violated ✓ | violated ✓ | constructed-representative |
| `adr007-msw-aligned` | aligned | aligned ✓ | aligned ✓ | [PR](packages/integration/src/gitlab/GitLabIntegration.test.ts) |

## Violated-class detection (in-scope cases)

| arm | precision | recall | F1 | tp | fp | fn |
|---|---|---|---|---|---|---|
| **grounded** | 1.00 | 1.00 | 1.00 | 4 | 0 | 0 |
| ungrounded | 1.00 | 0.25 | 0.40 | 1 | 0 | 3 |

Retrieval precision (out-of-scope respected): **1/1**.

## Per-case rationale

- **adr012-violated-pr28986** (gold: violated) — A merged, CI-green PR titled "Fix date parsing and formatting in convertTimeToLocalTimezone" that STILL returns a custom toFormat('yyyy-MM-dd hh:mm:ss ZZZZ') for a value shown in the UI — violates ADR012 (use locale presets). An ungrounded best-practice reviewer sees only "date formatting, looks fine".
  - grounded: _The function convertTimeToLocalTimezone still returns a value formatted with toFormat('yyyy-MM-dd hh:mm:ss ZZZZ'), a hard-coded pattern. The comment says the purpose is so users 'can easily understand the times,' confirming it targets UI display. This defeats ADR012's reason: locale-consistent, unambiguous date display._
  - ungrounded: _The change fixes a likely bug in date parsing (original used toLocaleString with an incompatible format) by switching to ISO-based parsing, which is more robust. However, the timezone assumption changed from UTC to local for string inputs without timezone, which could alter behavior, but this seems like a reasonable correction given the environment._
- **adr012-aligned-preset** (gold: aligned) — Renders a timestamp via DateTime.toLocaleString(DateTime.DATETIME_MED) — compliant with ADR012. Tests that grounding does not over-flag.
  - grounded: _The diff replaces a raw ISO string display with a call to DateTime.fromISO(iso).toLocaleString(DateTime.DATETIME_MED), which uses a Luxon locale preset exactly as required by ADR-BS012-C1. No custom toFormat pattern is introduced._
  - ungrounded: _The change improves user experience by formatting timestamps for the user's locale while preserving the raw ISO string as a tooltip, with no negative side effects._
- **out-of-scope-docs** (gold: out-of-scope) — Docs-only change (*.md). No code constraint is in scope, so radar must not fire — a retrieval-precision check.
  - ungrounded: _Adding documentation for the backend.baseUrl setting improves clarity and is a standard practice._
- **adr006-react-fc-violated** (gold: violated) — Adds a component typed `const StatusLabel: React.FC<Props>` — violates ADR006 (avoid React.FC). No real PR adds React.FC because lint blocks it, so this is a probe; the point is the soul case: a generic best-practice reviewer treats React.FC as perfectly fine, so only the grounded checker flags it.
  - grounded: _The new component StatusLabel is typed with React.FC<StatusLabelProps>, which is prohibited for new code per ADR-BS006-C1. React.FC implicitly injects a children prop and cannot express a generic children type._
  - ungrounded: _The component is simple and well-typed, with no obvious bugs or anti-patterns._
- **adr014-nodefetch-supersede** (gold: violated) — Real Backstage code importing `node-fetch`. It complied with ADR013 (which mandated node-fetch) but ADR014 supersedes it with native fetch, so the import is now drift from current intent — a Supersede case.
  - grounded: _The diff adds an explicit import of 'node-fetch', which is prohibited by ADR-BS014-C1. The business driver requires using the native global fetch to avoid compatibility issues on newer Node.js versions._
  - ungrounded: _The change correctly wraps the headers into a RequestInit object, likely fixing a bug where headers were passed incorrectly. The explicit import of fetch avoids reliance on global fetch._
- **adr007-adhoc-mock-violated** (gold: violated) — A test that stubs the network via `global.fetch = jest.fn()` — the ad-hoc mocking ADR007 prohibits (use MSW). Representative of the ~11 global.fetch mocks still in the repo.
  - grounded: _The PR introduces a hand-rolled HTTP mock by reassigning `global.fetch` inside `beforeEach`, which directly violates the prohibition against mocking fetch via global reassignment._
  - ungrounded: _Stubbing global.fetch in beforeEach without a corresponding afterEach to restore the original can lead to cross-test contamination when more tests are added. It's safer to clean up after the test._
- **adr007-msw-aligned** (gold: aligned) — Real Backstage test mocking HTTP with MSW (setupServer + rest handlers) — compliant with ADR007. Tests that grounding does not over-flag.
  - grounded: _The diff adds an MSW `setupServer` with a `rest.get` handler — the exact compliant pattern prescribed by ADR007._
  - ungrounded: _The diff adds a standard MSW mock server setup for HTTP request interception in tests, which follows common testing practices. The lifecycle hooks are correctly placed, and there are no apparent violations of best practices._

> Honesty: small seeded corpus — numbers are illustrative, not a statistical accuracy claim. The point is that the grounded↔ungrounded gap reproduces on real, maintainer-authored ADRs, and that the harness scales to real history.
