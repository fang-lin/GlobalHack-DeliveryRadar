# ST-0020: Add stable ids to significant UI elements (ADR-0005-C1 conformance)

- **Status:** In progress
- **Type:** showcase / frontend
- **Implements:** ADR-0005 / ADR-0005-C1 (significant UI elements carry stable, descriptive ids)

## Story

As someone discussing the UI or writing tests, I want the showcase's significant elements to carry stable, descriptive ids, so I can target them unambiguously (`#iiac-loop`, `#nav-evidence`) instead of fragile class/text selectors.

## Scope (first pass — global chrome + homepage, the most-referenced surface)

- **Global (`App.tsx`):** `#site-header`, `#site-footer`, desktop nav links (`#nav-overview` / `#nav-dashboard` / `#nav-evidence`), `#nav-logo`, `#nav-github`, `#mobile-nav`.
- **Homepage (`Overview.tsx`):** each deck section — `#hero`, `#crux`, `#iiac-loop`, `#why-new`, `#system-map`, `#paths`, `#roadmap`, `#explore`, `#closing` — and the two hero CTAs (`#cta-see-it-run`, `#cta-see-it-measured`).

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
| radar (ADR-0005-C1) | optional `/radar` on the PR — should read aligned | ⬜ |
| Maintainer sign-off | maintainer reviews + merges | ⬜ pending |

## Notes

Per ADR-0005: only significant elements (sections, nav, controls, major blocks) — not every div/span. kebab-case, meaningful, not auto-generated. Bonus: anchor links (`#iiac-loop`) now work (deck sections already have `scroll-margin-top`).
