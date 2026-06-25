# ST-0026: Make the clean conformance review explicit ("Nothing flagged")

- **Status:** Done (2026-06-25 — maintainer sign-off; shipped 2026-06-22)
- **Type:** radar / UX
- **Implements / Relates:** `FR-CONF-7` (review projection) · `NFR-EXPLAIN-1` (explainability) · surfaced by [ST-0025](ST-0025-radar-auto-check.md) (auto-run on every PR)

## Story

As a PR author, when the radar finds **nothing in scope** for my changes, I want the review to say so plainly — not show a bare header that looks like the check failed or silently produced nothing.

## Context

Surfaced on PR #10 (a docs-only PR): `changed files: 7; in-scope constraints: []`. Scope-first retrieval (`NFR-RETRIEVAL-1`) correctly matched zero constraints (no ADR scopes `README`/`docs/**`), so there were no verdicts — and `reviewMarkdown([], …)` rendered only the header + advisory footer. Correct behaviour, but it read like "no feedback" / a broken check.

## Change

`reviewMarkdown` (`src/core/comment.ts`): when no verdict blocks are rendered, emit an explicit line before the advisory footer:

> ✅ **Nothing flagged** — the changed files raise no architecture-conformance issues against the recorded intent.

This covers both empty cases the function can see: zero in-scope constraints, and (when filtered to violations) all-aligned.

## Acceptance criteria

- [x] Empty-verdict `reviewMarkdown` renders an explicit "Nothing flagged" line, not just the header.
- [x] Unit test in `comment.test.ts` asserts it.
- [x] `pnpm lint` + `build` + `test` green.
- [x] Maintainer sign-off (fang-lin, 2026-06-25).

## Notes

Scope-limited to the projection (`comment`). It does not change retrieval or the verdict logic; a docs-only PR still does 0 LLM calls — it just now says so legibly. (Index row added when this lands alongside PR #10's ST-0025 entry.)
