# ST-0014: Responsive / mobile layout for the showcase SPA

- **Status:** In review — built & deployed 2026-06-17; **pending verification on a real device** (not signed off)
- **Type:** showcase / frontend
- **Implements:** ADR-0001 (the SPA)

## Story

As a judge or visitor opening the showcase on a phone, I want every page readable and usable at narrow widths, so the project doesn't look broken on mobile.

## Acceptance criteria

- [x] No horizontal overflow at ~390px on every route (verified via headless-Chrome screenshots).
- [x] Tables now **scroll** (`overflow-x-auto` + `min-w-…`) instead of clipping (the eval table no longer cuts off the `ungrounded` column); the IIAC Loop SVG gets `min-width:520px` so it stays legible and scrolls horizontally on phones instead of shrinking to nothing.
- [x] Header nav: a **hamburger menu** on mobile (`sm:hidden` button → dropdown), inline nav on `sm+`. This is robust to font width (the old inline nav overflowed at 390 and pushed "Evidence" off-screen).
- [x] Desktop deck behaviour unchanged (scroll-snap stays desktop-only).

## Notes

Diagnose with a 390px headless-Chrome screenshot per route, fix, re-verify.

**Not signed off yet:** verified only via headless-Chrome screenshots — and headless uses fallback fonts that mis-render text width (which is why the inline nav looked broken and I switched to a hamburger). The maintainer still needs to confirm on a real phone before this moves to **Done**.
