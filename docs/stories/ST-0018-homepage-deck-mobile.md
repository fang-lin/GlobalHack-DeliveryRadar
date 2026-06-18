# ST-0018: Homepage deck — slide-scroll on mobile, not just desktop

- **Status:** Done (2026-06-18) — merged (PR #3), radar-checked 🟢 aligned, deployed; maintainer confirmed the slide-scroll on mobile.
- **Type:** showcase / frontend
- **Implements / Relates:** ADR-0001 (the SPA deck) · governed by **ADR-0001-C2** (mobile-first / responsive) · revises the ST-0014 "deck desktop-only" decision.

## Story

As a judge/visitor opening the homepage on a phone, I want the same one-screen-at-a-time slide feel as desktop — not everything cramped/stacked — so the showcase reads like the slide deck it is meant to be, on mobile too.

## Context / defect (a real drift, caught by a human)

ST-0014 gated the deck (scroll-snap + full-screen centred sections) to `@media (min-width: 1024px)`, on the rationale "on small screens content stacks tall, so keep normal scrolling." Result on mobile: no full-screen sections, no scroll-snap → content cramped together, no slide feel. That **drifts from the mobile-first intent (ADR-0001-C2)** and the original slide-deck experience — exactly the kind of intent↔implementation gap this project is about.

## Acceptance criteria

- [x] On mobile, the homepage scrolls **one full-screen section at a time** (scroll-snap), like the desktop deck.
- [x] **Tall sections are not clipped** — content stays reachable (e.g. `justify-content: safe center`, `min-height: 100svh`).
- [x] Inner multi-column content (system map, roadmap, why-new table) **stacks/scrolls responsively** on a phone — no cramped fixed grids, no horizontal overflow.
- [x] Desktop deck behaviour unchanged.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` green on PR #3; radar check 🟢 aligned (C1/C2/C3) | ✅ |
| Live / web behaviour | verified locally in Chrome @390px (mandatory snap, 788px sections, tall section top-aligned, no clip); deployed | ✅ |
| Maintainer sign-off | maintainer confirmed slide-scroll on mobile | ✅ 2026-06-18 |

## Notes

Use `100svh`/`100dvh` (not `100vh`) to avoid the mobile address-bar height jump. Keep **mandatory** snap for the firm slide feel (the maintainer values it). Debug locally in real Chrome before deploying (debug-locally-first rule).
