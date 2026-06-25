# ST-0028: Capture at PR time — sticky Decision-Note review; unify comment triggers to `/conformance` + `/capture`

- **Status:** In progress (shipped on `capture-pr-time` / PR #19; pending maintainer sign-off)
- **Type:** integration / tooling
- **Implements / Relates:** `ADR-0009` (revised 2026-06-25: capture moves after-merge → PR-time) · `FR-CAP-1` / `FR-CAP-4` / `FR-CAP-5` (PR-time run, sticky review, surfacing ≠ recording) · `FR-INT-6` (conformance comment trigger) · `FR-INT-7` (fold prior reviews to Outdated) · evolves [ST-0005](ST-0005-radar-capture.md) (capture impl, originally after-merge) · generalizes [ST-0019](ST-0019-radar-pr-triggers.md) (PR triggers; `radar` label dropped) · reuses [ST-0021](ST-0021-sticky-progress-review.md) (sticky-progress review pattern) · both ops share the one engine from [ST-0027](ST-0027-unified-agent.md)

## Story

As the maintainer, I want **capture to run when a PR opens** and surface its Decision Notes as a **sticky, foldable, advisory review on the open PR** — not as an after-merge issue — and I want **both** radar operations re-triggerable by a short PR comment (`/conformance`, `/capture`), so findings land where I can still act on them before merge and re-running either is one natural action on the PR.

## Design

Builds on ST-0005 (capture exists, runs on the shared agent) and ST-0019 (PR triggers). Two shifts:

- **Capture moves to PR time (ADR-0009 revision).** It runs on `pull_request: [opened]` (+ `workflow_dispatch` + a `/capture` comment), investigates the PR diff, and posts a **`COMMENT` Decision-Note review on the open PR** — parallel to the conformance review. It posts **only when it finds something** (notes > 0); nothing-found writes only a run-summary, to avoid noise on every PR. Capture is the heavy whole-diff agent, so it runs on `opened` + on-demand, **not** on every `synchronize` (conformance covers per-push).
- **Two independent, foldable streams.** Each review body carries a hidden stream marker — `<!-- radar:conformance -->` / `<!-- radar:capture -->` — so each run folds **its own** prior reviews to `OUTDATED` (GraphQL `minimizeComment`) without touching the other stream, and a human can tell the two apart. (FR-INT-7)
- **Comment triggers unified and de-prefixed.** The old `/radar` prefix matched both ops (overlap bug); the fix made them explicit (`/radar conformance` / `/radar capture`), then dropped the prefix entirely → **`/conformance`** and **`/capture`** (they diverge after `/c`, no overlap). The write-access guard (`author_association` ∈ OWNER/MEMBER/COLLABORATOR) is kept on both.
- **Symmetry cleanup.** `radar.yml` → `radar-conformance.yml`, sitting next to `radar-capture.yml`. The `radar` label trigger was already removed in ST-0025; `workflow_dispatch` (with a PR-number input) is kept on both.

## Acceptance criteria

- [x] Capture runs on PR `opened` (+ `workflow_dispatch` + `/capture` comment), **not** after merge; posts a sticky Decision-Note `COMMENT` review on the open PR only when notes > 0; nothing-found writes only a run summary. (FR-CAP-1 / FR-CAP-4)
- [x] Capture and conformance reviews each carry a hidden stream marker and fold their own prior reviews to `OUTDATED` independently. (FR-INT-7)
- [x] Comment triggers are `/conformance` and `/capture` (de-prefixed, no overlap); write-access guard kept on both. (FR-INT-6 / FR-CAP-1)
- [x] `radar` label trigger gone (already dropped in ST-0025); `workflow_dispatch` kept on both workflows.
- [x] Workflows renamed for symmetry: `radar.yml` → `radar-conformance.yml`, alongside `radar-capture.yml`.
- [x] Surfacing ≠ recording: capture drafts only; graduating a confirmed Note to a recorded ADR stays a separate, human-confirmed step. (FR-CAP-5 / ADR-0009-C2)
- [x] `pnpm lint && pnpm build && pnpm test` green (66 tests).

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | CI / local — lint · typecheck · unit tests · build | ✅ green locally (66 tests); CI on PR #19 |
| Live / web behaviour | n/a — CI/tooling, no web UI | — |
| Capture detection | local capture run on a real diff | ✅ **partial** — local run on PR #18's diff found 1 high-quality Note (co-located unit tests; cited ST-0024 + ADR-0008-C2). PR #19's own `opened` auto-run found **0** notes — correct: its decisions are recorded in the same PR's ADR-0009 (demonstrates net-new dedup). |
| Maintainer sign-off | maintainer reviews/tests | ⬜ pending |

> **Unverified path:** the CI "post a Decision-Note review when notes > 0" branch has never actually fired (PR #19 ran with 0 notes). To verify, open a small PR off this branch carrying an undocumented decision (the `opened` event runs the HEAD branch's workflow version).

## Notes

- **Where each trigger's workflow comes from:** `pull_request` events run the **HEAD branch's** workflow version (so a PR's own capture/conformance changes take effect on its events), but `issue_comment` events run the **default branch (main)** version. So the PR-time auto-run is live on this PR already, but the `/conformance` · `/capture` **comment commands only become usable after this PR merges to main**. Pre-merge, comment triggers can only be tested on the version already on main.
- The hidden markers (`<!-- radar:conformance -->` / `<!-- radar:capture -->`) are **fold keys, not comment triggers** — left unchanged by the de-prefixing.
- Capture reuses the sticky-progress pattern from ST-0021 (conformance posts a "started" review, then edits it into the verdict).
- ST-0005 stays the record of capture's first cut (after-merge, draft ADR/issue); this story is the PR-time redesign of the same operation.
