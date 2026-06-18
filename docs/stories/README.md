# Stories

Work-unit records for Delivery Radar's **own** development — we dogfood our own intent-tracking (VIS-4).

**Convention:** every code-work item gets a story here (`ST-NNN`); architectural decisions get an ADR in `docs/adr/`; commit messages cite the IDs (e.g. `feat(web): … (ST-0001)`). Stories are English (product artifact). A story links to the ADR it implements (if any) and to its commits.

**Status values:** `Todo` · `In progress` · `In review` · `Done` · `Dropped`. (`In review` = work complete, awaiting the verification gate.)

**Template & verification gate:** copy [`TEMPLATE.md`](TEMPLATE.md) for new stories. Every story carries a **Verification / QA** section — nothing flips to `Done` until it passes the gate: **CI green** + the [`qa-engineer`](../../.claude/agents/qa-engineer.md) agent's pass/fail check for any live/web behaviour + **maintainer sign-off** (we don't self-declare Done).

| ID | Title | Status | ADR |
|---|---|---|---|
| ST-0001 | Rebuild the showcase as a React SPA | Done | ADR-0001 |
| ST-0002 | Port legacy-dashboard content into the SPA, retire `dashboard/` | In progress | ADR-0001 |
| ST-0003 | Migrate the contrast worked example into the SPA (Evidence sub-page) | Done | ADR-0002 |
| ST-0004 | Two dashboards — rich shop-demo (parity) + Backstage | Done | ADR-0002 |
| ST-0005 | `radar capture` — draft Decision Notes from a PR | Todo | — |
| ST-0006 | `radar drift` — scan the codebase for drift | Todo | — |
| ST-0007 | Conformance — richer comment projection types | Todo | — |
| ST-0008 | Dogfood — run the radar on this repo (VIS-4) | In progress | ADR-0004 |
| ST-0009 | IIAC `SKILL.md` (methodology as a skill) | Todo · backlog | — |
| ST-0010 | radar as investigative agent + pre-PR self-check | Todo · backlog | — |
| ST-0011 | Migrate radar Python → TypeScript | Done | ADR-0003 |
| ST-0012 | Replay/precision eval harness (Backstage) | Done | — |
| ST-0013 | GitHub Action — radar-check a PR against recorded intent (manual, advisory) | In progress | FR-INT-6 |
| ST-0014 | Responsive / mobile layout for the showcase SPA | Done | ADR-0001 |
| ST-0015 | CI/CD pipeline (GitHub Actions) — lint · unit tests · typecheck/build · semantic-release · deploy Pages | Done | ADR-0004 |
| ST-0016 | Redirect pre-migration `-pages` showcase links to the new Pages site | Done | ADR-0004 |
| ST-0017 | Bump CI/CD actions to current (Node 24) majors — clear Node 20 deprecation | Done | ADR-0004 |
| ST-0018 | Homepage deck — slide-scroll on mobile, not just desktop | Done | ADR-0001 |
| ST-0019 | Trigger radar from the PR — `/radar` comment + `radar` label | In progress | FR-INT-6 |
