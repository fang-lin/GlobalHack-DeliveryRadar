# ST-0008: Dogfood — run the radar on this repo's own ADRs (VIS-4)

- **Status:** In progress — first local self-check done 2026-06-17 (`radar check` on PR #1 = aligned); broader coverage still depends on ST-0005/0006.
- **Type:** dogfood
- **Implements:** VIS-4
- **Related:** ADR-0001 / ADR-0002 (get constraint blocks) · ST-0005 (capture) · ST-0006 (drift)

## Story

As the team, we want to govern Delivery Radar's *own* development with Delivery Radar, so that "we use IIAC on ourselves" is demonstrable — the strongest proof the method is real, and the most distinctive thing to show at Round 2.

## Acceptance criteria

- [ ] Add machine-readable `constraints` blocks to the project's own ADRs. **Started:** ADR-0004 now carries `ADR-0004-C1` (CI config must not embed secrets); ADR-0001/0002 still TODO.
- [ ] Run `radar check` on a PR, `radar drift` on the codebase, `radar capture` on a diff — capture as evidence. **Started:** `radar check` run locally on **PR #1** → `ADR-0004-C1: aligned (0.98)` with grounded evidence; `drift`/`capture` pending (ST-0006/0005).
- [ ] (Stretch) Surface **"this project"** as a third dashboard subject in the SPA.

## Notes

Will likely spawn an ADR ("we govern this repo with our own radar; our ADRs carry constraint blocks"). This is the line that ties together the three operations (ST-0005/0006 + live Conformance) into one demonstrable loop on ourselves. Honesty guardrail (vision §9): keep it concrete; don't overclaim.

**2026-06-17 — first self-check (one-off, local).** Added `ADR-0004-C1` to ADR-0004, then `radar extract` (free, deterministic) + `radar check` on PR #1's workflow diff: scope-first retrieval selected only `ADR-0004-C1`; verdict **aligned (0.98)** — uses `${{ secrets.* }}` + OIDC, no committed secrets. **Formal integration** (auto-run `radar check` on every PR in CI) is deferred to **ST-0013** — mind the per-PR API cost: gate behind a manual `workflow_dispatch` / label, not every push.
