# ST-0025: Auto-run the radar on every PR, on a low-cost provider (DeepSeek via Vercel)

- **Status:** Done (2026-06-25 — maintainer sign-off; shipped 2026-06-21)
- **Type:** radar / CI / dogfood
- **Implements / Relates:** `FR-INT-6` + `NFR-COST-1` (both **revised** 2026-06-21) · ADR-0007 (pluggable model layer) · builds on [ST-0013](ST-0013-github-action.md) / [ST-0019](ST-0019-radar-pr-triggers.md) (manual triggers — now superseded by auto)

## Story

As the maintainer, I want the radar to check **every** PR automatically, on a cheap model, so intent-drift is caught without me remembering to trigger it — affordable now that the model layer (ADR-0007) lets us run DeepSeek instead of Claude.

## What shipped

- **Auto trigger:** `radar.yml` runs on `pull_request` `[opened, synchronize, reopened]` — on PR open AND every push. Manual re-run kept (`/radar` comment, `workflow_dispatch`); the `radar` label trigger dropped (redundant). `concurrency` with `cancel-in-progress` keeps only the latest run per PR.
- **Provider:** the check runs **DeepSeek V4 Pro via Vercel AI Gateway** (`RADAR_PROVIDER=vercel`, `RADAR_MODEL=deepseek/deepseek-v4-pro`, `RADAR_JSON_MODE=json_schema` — V4 Pro rejects `response_format` json_object, verified by a live probe). Only `AI_GATEWAY_API_KEY` is a secret; provider/model/mode are plain config. Exercises the ADR-0007 layer end-to-end in CI.
- **No build in CI:** the CLI runs via `tsx src/cli/main.ts …` — no `pnpm build`, no `dist/` path to maintain.
- **Engine vs baseline:** the workflow checks out the **PR's own code** (radar engine + workflow from the same ref) and fetches **main's `docs/adr`** separately (`git archive FETCH_HEAD docs/adr` → `.radar-baseline/`) as the recorded-intent baseline (FR-INT-6). This fixed an `ERR_MODULE_NOT_FOUND` from the prior `checkout ref: main` (main lacked the restructured `src/cli/main.ts`).
- **Cost stance (FR-INT-6 / NFR-COST-1 revised):** cost is controlled by scope-first retrieval (only in-scope constraints call the LLM) + a low-cost provider + advisory non-blocking — not manual gating. Both requirements updated (zh authoritative + en mirror, banner dates synced).

## Acceptance criteria

- [x] Runs automatically on PR open + update; manual re-run still possible.
- [x] Check runs on DeepSeek V4 Pro via Vercel (json_schema) through the ADR-0007 layer; verified live in CI on PR #9 (produced a real verdict).
- [x] Runs via `tsx` (no build); engine from the PR, ADR baseline from main.
- [x] `FR-INT-6` / `NFR-COST-1` revised + mirrored (zh/en), banner synced.
- [x] Maintainer sign-off (fang-lin, 2026-06-25).

## Notes

Prerequisite to run: the `AI_GATEWAY_API_KEY` repo secret (the maintainer provisions it; never committed). A nice dogfood moment surfaced on the first live run — the radar flagged this PR's `release.yml` change as violating **ADR-0004-C3** (still active on main), the correct response being the recorded supersession by ADR-0008. Optional follow-up: make the check step `continue-on-error` so an LLM/secret hiccup never shows a red ✗ on an advisory check.
