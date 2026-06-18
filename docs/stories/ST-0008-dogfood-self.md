# ST-0008: Dogfood — run the radar on this repo's own ADRs (VIS-4)

- **Status:** In progress — first local self-check done 2026-06-17 (`radar check` on PR #1 = aligned); broader coverage still depends on ST-0005/0006.
- **Type:** dogfood
- **Implements:** VIS-4
- **Related:** ADR-0001 / ADR-0002 (get constraint blocks) · ST-0005 (capture) · ST-0006 (drift)

## Story

As the team, we want to govern Delivery Radar's *own* development with Delivery Radar, so that "we use IIAC on ourselves" is demonstrable — the strongest proof the method is real, and the most distinctive thing to show at Round 2.

## Acceptance criteria

- [x] Add machine-readable `constraints` blocks to the project's own ADRs — **6 constraints** (2026-06-18): ADR-0001 (`C1` routing-survives-subpath · `C2` mobile-first/responsive), ADR-0003 (`C1` typed structured outputs), ADR-0004 (`C1` no-secrets · `C2` Pages-from-main · `C3` GitHub-only release).
- [ ] Run `radar check` on a PR, `radar drift` on the codebase, `radar capture` on a diff — capture as evidence. **Started:** `radar check` run locally on **PR #1** → `ADR-0004-C1: aligned (0.98)` with grounded evidence; `drift`/`capture` pending (ST-0006/0005).
- [ ] (Stretch) Surface **"this project"** as a third dashboard subject in the SPA.

## Notes

Will likely spawn an ADR ("we govern this repo with our own radar; our ADRs carry constraint blocks"). This is the line that ties together the three operations (ST-0005/0006 + live Conformance) into one demonstrable loop on ourselves. Honesty guardrail (vision §9): keep it concrete; don't overclaim.

**2026-06-17 — first self-check (one-off, local).** Added `ADR-0004-C1` to ADR-0004, then `radar extract` (free, deterministic) + `radar check` on PR #1's workflow diff: scope-first retrieval selected only `ADR-0004-C1`; verdict **aligned (0.98)** — uses `${{ secrets.* }}` + OIDC, no committed secrets. **Formal integration** (run `radar check` on a PR in CI) landed as **ST-0013** — a manual `workflow_dispatch` action ("Does this PR still match what we decided?"), cost-gated (FR-INT-6 / NFR-COST-1).

**2026-06-18 — constraint corpus enriched.** Replaced the thin single-constraint corpus with **6 real architectural constraints** mined from our own ADRs (see AC above). These give the dogfood substance: a PR that switches to BrowserRouter, drops responsiveness, hand-parses model output, or adds npm publish is now machine-checkable against recorded intent.
