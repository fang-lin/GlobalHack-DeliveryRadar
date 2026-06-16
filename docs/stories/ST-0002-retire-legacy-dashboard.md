# ST-0002: Port remaining legacy-dashboard content into the SPA, then retire `dashboard/`

- **Status:** In progress
- **Type:** showcase / cleanup
- **Related:** ADR-0001

## Story

As the project maintainer, I want every piece of the legacy `dashboard/` showcase either reproduced in the SPA or consciously dropped, so that the legacy folder can be retired without losing content and the IIAC Loop SVG ends up with a single source of truth.

## Acceptance criteria

- [x] Audit `dashboard/` vs `web/` for content parity (done 2026-06-16; gaps listed below).
- [ ] Decide per gap — **port** or **drop** — then act. Known gaps NOT reflected in the SPA:
  - the **ADR-002 storyline** (no direct sync calls / event bus, driver EPIC-340);
  - the **`unknown` verdict** example (PR #44, conf 0.41);
  - the **at-risk Remediation-vs-Supersede binary card** (machine drafts both; NFR-TRUST-1 "neither executes without human confirmation");
  - the **Capture queue** (Decision Note DN-2026-0042 + graduate/route/dismiss actions);
  - the **KPI set** (alignment rate, open drift violations, notes awaiting triage);
  - the **per-ADR drift sparklines + violation counts**;
  - the **shop-demo grounded-vs-ungrounded worked example** on the contrast page.
- [ ] Establish a single source of truth for the IIAC Loop SVG.
- [ ] Retire / archive `dashboard/`; repoint any remaining links (README line 69 → contrast page).

## Notes

Audit findings produced in the 2026-06-16 session; this story is the home for the follow-up so the cleanup is not itself an unrecorded change.
