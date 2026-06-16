# ST-0004: Two dashboards — migrate the rich shop-demo dashboard; add a second subject

- **Status:** In progress (second subject resolved: **Backstage**, 2026-06-16)
- **Type:** showcase / frontend
- **Implements:** ADR-0002

## Story

As a viewer, I want a full product dashboard per subject, so that I can see conformance / drift / capture for shop-demo (and a second subject) the way the legacy `dashboard.html` showed it.

## Acceptance criteria

- [ ] Migrate the **rich shop-demo dashboard** from `dashboard.html` into the SPA, restoring what the thin SPA dashboard dropped: full KPI set; multi-verdict feed including the **`unknown`** example and the **ADR-002 storyline**; per-ADR **drift sparklines + violation counts**; the at-risk **Remediation-vs-Supersede binary card** (NFR-TRUST-1, "neither executes without human confirmation"); the **Capture queue** (Decision Note + graduate/route/dismiss). **Parity with `dashboard.html` is the bar — reproduce its content faithfully; do NOT re-author or invent data** (the mistake that made the thin SPA dashboard diverge).
- [ ] Dashboard supports **two subjects**: shop-demo + **Backstage** (a subject switcher).
- [x] **Resolved (2026-06-16):** the second dashboard's subject = **Backstage** (the real repo used by the eval), to mirror the Evidence benchmark.

## Notes

This replaces the current thin SPA dashboard, which dropped much of the legacy content (see the ST-0002 audit).

**Root cause of the divergence (for the record):** when the SPA was first built (ST-0001), the dashboard was *re-authored* from scratch with simplified, partly invented data (PR #2, DN-6/7) instead of faithfully porting `dashboard.html` + `data.js`. There was no migration story with "content parity" as an acceptance criterion, and no parity check — so the regression went unflagged. This story fixes it and makes parity the explicit bar.
