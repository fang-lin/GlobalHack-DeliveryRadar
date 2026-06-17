# ST-0014: Responsive / mobile layout for the showcase SPA

- **Status:** In progress
- **Type:** showcase / frontend
- **Implements:** ADR-0001 (the SPA)

## Story

As a judge or visitor opening the showcase on a phone, I want every page readable and usable at narrow widths, so the project doesn't look broken on mobile.

## Acceptance criteria

- [ ] No horizontal overflow / clipping at ~390px on every route: Overview, Dashboard (shop-demo + Backstage), Evidence (measured + worked example).
- [ ] Tables **scroll** (`overflow-x-auto`), not clip; the IIAC Loop SVG is legible or horizontally scrollable.
- [ ] Header nav usable on narrow screens (no overflow / wrap mess).
- [ ] Desktop deck behaviour unchanged (scroll-snap is intentionally desktop-only).

## Notes

Diagnose with a 390px headless-Chrome screenshot per route, fix, re-verify.
