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

## Machine-checkable constraints

`radar extract` reads the block below; `radar check` evaluates PR diffs against it (advisory, never blocks). **ADR-0001-C2 (mobile-first / responsive)** records the requirement established by ST-0014.

```constraints
- id: ADR-0001-C1
  adr: ADR-0001
  title: Showcase routing must survive the GitHub Pages sub-path
  rule: >
    The web showcase must route with HashRouter (never BrowserRouter) and the
    Vite base must stay relative ("./"). It is served from a GitHub Pages
    project sub-path (.../GlobalHack-DeliveryRadar/); BrowserRouter or an
    absolute base would 404 on deep links and break asset loading.
  polarity: requirement
  driver: ADR-0001 — Pages sub-path deploy, no 404 fallback
  scope:
    paths: ["web/src/**", "web/vite.config.ts"]
    layers: ["web", "routing", "build"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - 'import { HashRouter } from "react-router-dom"'
        - 'vite base: "./"'
      violating:
        - 'import { BrowserRouter } from "react-router-dom"'
        - "createBrowserRouter([...])"
        - 'vite base: "/" (absolute)'
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
- id: ADR-0001-C2
  adr: ADR-0001
  title: Showcase must be mobile-first / responsive
  rule: >
    The web showcase must be mobile-first and responsive: usable and free of
    horizontal overflow at narrow (phone) widths. Use responsive Tailwind
    breakpoints (sm:/md:/lg:) and overflow handling. Fixed pixel-width layouts,
    desktop-only structures, or content that overflows the viewport on a phone
    are violations.
  polarity: requirement
  driver: ST-0014 — judges/visitors open the showcase on phones; it must not look broken
  scope:
    paths: ["web/src/**"]
    layers: ["web", "layout"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "responsive classes like 'hidden sm:flex' or 'grid-cols-1 md:grid-cols-3'"
        - "wide tables wrapped in overflow-x-auto; a hamburger menu at narrow widths"
      violating:
        - "a fixed-width container like w-[1100px] with no responsive fallback"
        - "a multi-column grid with no single-column phone fallback"
        - "a wide table with no overflow-x handling (clips on mobile)"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
- id: ADR-0001-C3
  adr: ADR-0001
  title: Homepage presents as a slide deck on all viewports
  rule: >
    The homepage must present as a slide deck — full-screen sections that scroll
    one screen at a time (scroll-snap) — at ALL viewport widths, mobile included.
    The deck's full-screen + scroll-snap behaviour must not be gated to desktop
    only (no @media min-width that disables it on phones); on a phone the page
    must not collapse into cramped continuous stacking.
  polarity: requirement
  driver: ST-0018 — the showcase must read like slides on every device, not just desktop
  scope:
    paths: ["web/src/index.css", "web/src/pages/Overview.tsx"]
    layers: ["web", "layout", "deck"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "html.deck scroll-snap-type: y mandatory at all widths; sections min-height 100svh + scroll-snap-align: start"
      violating:
        - "wrapping the deck scroll-snap / full-screen sections in @media (min-width: 1024px) so mobile loses them"
        - "deck sections with no min-height or scroll-snap on phones (continuous cramped stacking)"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
```
