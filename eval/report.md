# Delivery Radar — eval report (grounded vs ungrounded)

Corpus: 3 human-labelled cases on **real Backstage ADRs**. Model: `claude-sonnet-4-6`. Ground truth is hand-labelled in `eval/cases.yaml` — the harness never asks the model for the gold label.

| case | gold | grounded | ungrounded | source |
|---|---|---|---|---|
| `adr012-violated-pr28986` | violated | violated ✓ | aligned ✗ | [PR](https://github.com/backstage/backstage/pull/28986) |
| `adr012-aligned-preset` | aligned | aligned ✓ | aligned ✓ | constructed-compliant-example |
| `out-of-scope-docs` | out-of-scope | no-fire ✓ | aligned · | representative |

## Violated-class detection (in-scope cases)

| arm | precision | recall | F1 | tp | fp | fn |
|---|---|---|---|---|---|---|
| **grounded** | 1.00 | 1.00 | 1.00 | 1 | 0 | 0 |
| ungrounded |   –  | 0.00 |   –  | 0 | 0 | 1 |

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

> Honesty: small seeded corpus — numbers are illustrative, not a statistical accuracy claim. The point is that the grounded↔ungrounded gap reproduces on real, maintainer-authored ADRs, and that the harness scales to real history.
