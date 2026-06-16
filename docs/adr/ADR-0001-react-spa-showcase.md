# ADR-0001: Showcase delivered as a React SPA (supersedes the static HTML pages)

- **Status:** Accepted
- **Date:** 2026-06-15
- **Deciders:** Lin Fang
- **Related:** ST-0001 (implementation) · ST-0002 (retire legacy) · VIS-2 (form is an outward manifestation)

## Context

The Round-1 showcase was hand-written static HTML in `dashboard/` (slides `index.html`, `dashboard.html`, `contrast.html`). We wanted a polished, maintainable showcase with mature UI components, a clearer information architecture (the shop-demo vs Backstage subjects had been conflated on one page), and continued GitHub Pages deployment with static data.

## Decision

Build the showcase as a **Vite + React + TypeScript + Tailwind + shadcn-style SPA** under `web/`, with three routes — **Overview / Dashboard / Evidence** — via `HashRouter` and `base: './'` (so it works under the Pages subpath without a 404 fallback). Static data lives in `web/src/data/`; the build output is copied to the pages repo. Each route is **explicitly labelled by data subject**: shop-demo = product-in-use; Backstage = measured evidence.

## Consequences

- Unified, polished showcase; the subject confusion is resolved by routing + labels.
- **Drift risk introduced:** the IIAC Loop SVG now exists in two places — the legacy `dashboard/index.html` and the extracted `web/src/data/iiacLoopSvg.ts`. A single source of truth must be chosen (tracked in ST-0002). *(Ironic for a project about drift — recorded here precisely so it does not go unrecorded.)*
- Legacy `dashboard/` is retained for now (SVG source + content not yet ported); retirement is tracked in **ST-0002** after a content-parity audit.
- README showcase links repointed to the SPA routes (`#/dashboard`, `#/evidence`).
