# ST-0020: Add stable ids to significant UI elements (ADR-0005-C1 conformance)

- **Status:** In progress
- **Type:** showcase / frontend
- **Implements:** ADR-0005 / ADR-0005-C1 (significant UI elements carry stable, descriptive ids)

## Story

As someone discussing the UI or writing tests, I want the showcase's significant elements to carry stable, descriptive ids, so I can target them unambiguously (`#iiac-loop`, `#nav-evidence`) instead of fragile class/text selectors.

## Scope (full showcase coverage)

- **Global (`App.tsx`):** `#site-header`, `#site-footer`, desktop nav links (`#nav-overview` / `#nav-dashboard` / `#nav-evidence`), `#nav-logo`, `#nav-github`, `#mobile-nav` **and its items** (`#mobile-nav-overview` / `#mobile-nav-dashboard` / `#mobile-nav-evidence`, `#mobile-nav-github`).
- **Homepage (`Overview.tsx`):** each deck section — `#hero`, `#crux`, `#iiac-loop`, `#why-new`, `#system-map`, `#paths`, `#roadmap`, `#explore`, `#closing` — the two hero CTAs (`#cta-see-it-run`, `#cta-see-it-measured`), the two explore-card links (`#explore-dashboard-link`, `#explore-evidence-link`), and (**2nd pass**) every homepage **content unit**: `#crux-card`, `#why-table` + per-tool rows (`#why-row-…`), the system-map legend (`#system-legend-…`), its 4 columns (`#system-col-…`) and 13 capability cards (`#system-item-…`), the 3 path cards (`#path-…`) + `#paths-auditable`, the 3 roadmap cards (`#roadmap-…`). Data-driven ids are derived via `slug()`, never an index.

- **Dashboard (`DashboardLayout` / `DashboardView`):** sub-nav tabs (`#dashboard-tab-…`), `#dashboard-header`, `#dashboard-repo-link`, the 5 KPIs (`#kpi-…`), `#conformance-feed` + PR cards (`#pr-…`) + verdict rows (`#pr-…-…`), `#drift-section` + drift cards (`#drift-…`) + `#drift-at-risk` + option buttons (`#at-risk-…`), `#capture-section` + note cards (`#note-…`) + action buttons.
- **Evidence (`EvidenceLayout` / `Evidence` / `EvidenceExample`):** sub-nav tabs (`#evidence-tab-…`), `#evidence-header`, 3 context cards (`#context-…`), 2 metric cards (`#metric-…`), `#evidence-results` + `#evidence-table` + case rows (`#case-…`), `#evidence-killer-example` (`#killer-grounded` / `#killer-ungrounded`), `#evidence-conclusion` + `#conclusion-card`; worked example `#example-…`.

**Out of scope:** only the reusable **shadcn `components/ui/*` primitives** (Card/Badge/Button/Separator) — exempt as lib components per ADR-0005 (we id their *usage sites*, not the primitive). The showcase is now fully covered.

## Acceptance criteria

- [ ] Global header / footer / nav + logo & GitHub links carry stable kebab-case ids.
- [ ] Every homepage deck section + the two hero CTAs carry stable, descriptive ids.
- [ ] Every homepage content unit (card, table row, legend chip, column, capability card) carries a stable, data-derived id.
- [ ] Dashboard + Evidence surfaces (tabs, KPIs, PR/drift/note cards + verdict rows, metric cards, case rows, action buttons) carry stable, data-derived ids.
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

## Second pass — complete the homepage (this PR, after #4 merged)

Following the strengthened ADR-0005-C1 ("every user-visible element with independent semantic meaning"), the content units deferred in pass 1 are now id'd: the crux card, the why-table + its per-tool rows, the system-map legend + 4 columns + 13 capability cards, the 3 path cards + the audit callout, and the 3 roadmap cards. Data-driven elements get a stable, data-derived id via `slug(...)` (never an index — ADR-0005-C1). `tsc` + `vite build` green. Only the Dashboard/Evidence sub-pages now remain (a future "as touched" pass).

## Third pass — Dashboard + Evidence (full coverage)

The remaining surfaces are now id'd: Dashboard (tabs, header, repo link, 5 KPIs, conformance feed + PR cards + verdict rows, drift section/cards/at-risk + option buttons, capture notes + action buttons) and Evidence (tabs, context/metric cards, results table + case rows, killer-example + conclusion cards, worked example). `slug()` moved to `lib/utils` as the single definition (Overview now imports it). Data-driven ids derive via `slug()` — never an index. `tsc` + lint + `vite build` green; no static-id duplicates. Only shadcn `components/ui/*` primitives stay unid'd (exempt as reusable lib components — their usage sites are id'd). **The showcase is now fully covered.**

## Notes

Per ADR-0005: only significant elements (sections, nav, controls, major blocks) — not every div/span. kebab-case, meaningful, not auto-generated. Bonus: anchor links (`#iiac-loop`) now work (deck sections already have `scroll-margin-top`).
