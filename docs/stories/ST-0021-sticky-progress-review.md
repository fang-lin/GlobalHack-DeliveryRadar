# ST-0021: Sticky progress review — post "started", then edit it into the verdict

- **Status:** In progress
- **Type:** radar / CI integration
- **Implements:** FR-INT-7 (extends FR-INT-6; projection per FR-CONF-7; non-blocking per FR-CONF-9)

## Story

As a PR author who triggers `/radar`, I want **immediate** feedback that the check has started and a **single** comment that updates itself into the final result — so I'm not left wondering whether anything is running, and the PR isn't littered with separate "started" and "result" comments.

## Design (load-bearing fact verified, not assumed)

Today `radar.yml` posts **one** advisory review only at the very end (`comment --post`); nothing appears while it runs, and a failed run leaves nothing.

We keep posting a **review** (Reviews API, `COMMENT` event) — not an issue comment — because a review body is editable too, so switching buys nothing. **Empirically verified** on a real PR (GitHub docs were ambiguous): a `COMMENT` review is submitted/visible immediately (`submitted_at` set), and `PUT /repos/{o}/{r}/pulls/{n}/reviews/{id}` edits the **submitted** review's body in place (re-read confirmed).

Lifecycle (in `radar.yml`, one review per run — each check is its own auditable record, `NFR-EVAL-1`):

1. **post-start** (before the build): post a "🛰️ check started …" review + this run's log URL; capture its review id.
2. build → extract → check (produce `verdicts.json`).
3. **finalize**:
   - success → build the verdict body and `PUT` it onto the same review.
   - failure (`if: failure()`) → `PUT` a short failure note + log URL onto the same review.

No re-trigger loop: a *review* does not fire `issue_comment` (only `pull_request_review`, which this workflow doesn't listen to), so the bot's own post can't re-invoke the check.

## Scope

- **`src/comment.ts`**: `startReview(repo, pr, body) → reviewId` (POST `COMMENT` placeholder) + `updateReview(repo, pr, reviewId, body)` (PUT body onto an existing review). Keep `postReview` for non-sticky callers.
- **`src/cli.ts`** — `comment` gains: `--start` (post placeholder, print the review id), `--update <id>` (build verdict body, PUT onto that review), `--run-url <url>` (embed the live-log link), `--failed` (write a failure note instead of verdicts).
- **`.github/workflows/radar.yml`**: restructure into post-start → build/extract/check → finalize-success / finalize-failure, threading the review id via `$GITHUB_OUTPUT`.

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

The sticky lifecycle is **CI orchestration**, kept thin in the CLI: the CLI gains start/update verbs (it already owns `gh api` review posting via `postReview`), the workflow threads the id. The "started" message and failure note are short; the verdict body reuses the existing `reviewMarkdown` projection unchanged. Cost unchanged — the LLM `check` runs exactly once, gated by `FR-INT-6` / `NFR-COST-1`.
