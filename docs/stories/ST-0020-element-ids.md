# ST-0020: Add stable ids to significant UI elements (ADR-0005-C1 conformance)

- **Status:** In progress
- **Type:** showcase / frontend
- **Implements:** ADR-0005 / ADR-0005-C1 (significant UI elements carry stable, descriptive ids)

## Story

As someone discussing the UI or writing tests, I want the showcase's significant elements to carry stable, descriptive ids, so I can target them unambiguously (`#iiac-loop`, `#nav-evidence`) instead of fragile class/text selectors.

## Scope (first pass — global chrome + homepage, the most-referenced surface)

- **Global (`App.tsx`):** `#site-header`, `#site-footer`, desktop nav links (`#nav-overview` / `#nav-dashboard` / `#nav-evidence`), `#nav-logo`, `#nav-github`, `#mobile-nav` **and its items** (`#mobile-nav-overview` / `#mobile-nav-dashboard` / `#mobile-nav-evidence`, `#mobile-nav-github`).
- **Homepage (`Overview.tsx`):** each deck section — `#hero`, `#crux`, `#iiac-loop`, `#why-new`, `#system-map`, `#paths`, `#roadmap`, `#explore`, `#closing` — the two hero CTAs (`#cta-see-it-run`, `#cta-see-it-measured`), and the two explore-card links (`#explore-dashboard-link`, `#explore-evidence-link`).

**Out of scope** (incremental per ADR-0005, "as touched"): Dashboard + Evidence sub-pages — id those when next edited.

## Acceptance criteria

- [ ] Global header / footer / nav + logo & GitHub links carry stable kebab-case ids.
- [ ] Every homepage deck section + the two hero CTAs carry stable, descriptive ids.
- [ ] ids are unique on the page; `tsc` + `vite build` pass; no visual change.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` (lint/typecheck/build) green | ⬜ |
| Live / web behaviour | browser / `qa-engineer`: `#iiac-loop`, `#nav-evidence` etc. resolve and are unique | ⬜ |
| radar (ADR-0005-C1) | `/radar` on the PR | 🟢 caught a real deviation → converged (see below); re-run to confirm ⬜ |
| Maintainer sign-off | maintainer reviews + merges | ⬜ pending |

## Convergence (radar dogfood — the loop working on our own PR)

First pass shipped section + desktop-nav + CTA ids but **missed the interactive controls in the touched chrome**. `/radar` on PR #4 flagged it (🔴 ADR-0005-C1, confidence 0.82, evidence `App.tsx L70–L80`): the desktop nav items got ids but the **mobile-drawer NavLinks did not** — "duplicating the nav into a mobile drawer doesn't exempt the items inside it." Accurate catch.

Converged by completing the **same category the PR established (interactive controls)**: added ids to the mobile-drawer nav items + the mobile GitHub link (`App.tsx`) and the two explore-card links (`Overview.tsx`) I'd previously left bare. Content cards (`<Card>`) stay out of scope this pass — they carry no ids anywhere yet, so the PR is internally consistent; card ids are a separate "as touched" pass per ADR-0005. Re-run `/radar` to confirm aligned.

## Notes

Per ADR-0005: only significant elements (sections, nav, controls, major blocks) — not every div/span. kebab-case, meaningful, not auto-generated. Bonus: anchor links (`#iiac-loop`) now work (deck sections already have `scroll-margin-top`).
