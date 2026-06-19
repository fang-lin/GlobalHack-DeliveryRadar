# ST-0021: Sticky progress review — post "started", then edit it into the verdict

- **Status:** In progress
- **Type:** radar / CI integration
- **Implements:** FR-INT-7 (extends FR-INT-6; projection per FR-CONF-7; non-blocking per FR-CONF-9)
- **Related:** ADR-0006 (radar core is platform-agnostic — all `gh` I/O lives in the workflow, not the CLI)

## Story

As a PR author who triggers `/radar`, I want **immediate** feedback that the check has started and a **single** comment that updates itself into the final result — so I'm not left wondering whether anything is running, and the PR isn't littered with separate "started" and "result" comments.

## Design (load-bearing fact verified, not assumed)

Today `radar.yml` posts **one** advisory review only at the very end (`comment --post`); nothing appears while it runs, and a failed run leaves nothing.

We keep the result as a **review** (Reviews API, `COMMENT` event) — not an issue comment — because a review body is editable too, so switching buys nothing. **Empirically verified** on a real PR (GitHub docs were ambiguous): a `COMMENT` review is submitted/visible immediately (`submitted_at` set), and `PUT /repos/{o}/{r}/pulls/{n}/reviews/{id}` edits the **submitted** review's body in place (re-read confirmed).

**All GitHub I/O lives in `radar.yml`, never in the CLI (ADR-0006).** The radar core renders; the workflow publishes. Lifecycle (one review per run — each check is its own auditable record, `NFR-EVAL-1`):

1. **post-start** (before the build): the workflow posts a "🛰️ check started …" review + this run's log URL via `gh api`; captures its review id to `$GITHUB_OUTPUT`.
2. build → extract → check (produce `verdicts.json`).
3. **finalize**:
   - success → the CLI **renders** the verdict body to stdout; the workflow `PUT`s it onto the same review via `gh api`.
   - failure / cancel (`if: (failure() || cancelled())`) → the workflow `PUT`s a short failure note + log URL onto the same review (inline `gh api` — the CLI may not be built).

No re-trigger loop: a *review* does not fire `issue_comment` (only `pull_request_review`, which this workflow doesn't listen to), so the bot's own post can't re-invoke the check.

## Scope

- **`src/comment.ts`** — pure rendering only (ADR-0006): keep `reviewMarkdown` / `verdictMarkdown`; **removed** the `gh`-coupled `postReview` and `updateReview`. No `child_process`, no `gh`, no platform calls.
- **`src/cli.ts`** — `comment` renders the review markdown from `--verdicts` (+ `--all`) to **stdout** and nothing else (dropped `--post` / `--update` / `--repo` / `--pr`).
- **`.github/workflows/radar.yml`** — owns all platform I/O: post-start (`gh api`, before build) → build/extract/check → finalize-success (CLI renders → `gh api` PUT) / finalize-failure (inline `gh api` PUT), threading the review id via `$GITHUB_OUTPUT`.

## Acceptance criteria

- [ ] Triggering `/radar` posts a "started" review within seconds, **before** the build.
- [ ] On success, the **same** review becomes the verdict (no second comment).
- [ ] On failure, the **same** review shows a failure note + log link (no stuck "running").
- [ ] Review state stays `COMMENT` (never blocks). `tsc` + lint + build green; existing unit tests pass.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` (lint/typecheck/build/test) green | ⬜ |
| Live / web behaviour | user triggers `/radar` on a PR → observe started→verdict on **one** review; a forced-fail run shows the failure edit | ⬜ |
| Maintainer sign-off | maintainer reviews + merges | ⬜ pending |

## Notes

The sticky lifecycle is **CI orchestration**, so it lives entirely in the workflow — the CLI stays a pure check/render tool with **zero** platform coupling (ADR-0006; this story is what surfaced and removed the pre-existing `postReview` coupling). The "started" message and failure note are short bash strings in the workflow; the verdict body reuses the existing `reviewMarkdown` projection unchanged. Cost unchanged — the LLM `check` runs exactly once, gated by `FR-INT-6` / `NFR-COST-1`.
