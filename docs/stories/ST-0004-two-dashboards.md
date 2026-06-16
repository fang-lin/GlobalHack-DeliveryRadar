# ST-0004: Two dashboards — migrate the rich shop-demo dashboard; add a second subject

- **Status:** Todo (blocked: clarify the second dashboard's subject)
- **Type:** showcase / frontend
- **Implements:** ADR-0002

## Story

As a viewer, I want a full product dashboard per subject, so that I can see conformance / drift / capture for shop-demo (and a second subject) the way the legacy `dashboard.html` showed it.

## Acceptance criteria

- [ ] Migrate the **rich shop-demo dashboard** from `dashboard.html` into the SPA, restoring what the thin SPA dashboard dropped: full KPI set; multi-verdict feed including the **`unknown`** example and the **ADR-002 storyline**; per-ADR **drift sparklines + violation counts**; the at-risk **Remediation-vs-Supersede binary card** (NFR-TRUST-1, "neither executes without human confirmation"); the **Capture queue** (Decision Note + graduate/route/dismiss).
- [ ] Dashboard supports **two subjects**: shop-demo + "&lt;new&gt;".
- [ ] **OPEN QUESTION (blocks the 2nd dashboard):** what is the second ("new") dashboard's subject? Candidates: the project itself (dogfood — radar on this repo's own ADRs, VIS-4) · Backstage · a generic/empty template · a shop-demo twin. Needs the maintainer's answer.

## Notes

This replaces the current thin SPA dashboard, which dropped much of the legacy content (see the ST-0002 audit).
