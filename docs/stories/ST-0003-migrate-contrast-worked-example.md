# ST-0003: Migrate the shop-demo worked example (contrast.html) into the SPA as an Evidence sub-page

- **Status:** Done (2026-06-16)
- **Type:** showcase / frontend
- **Implements:** ADR-0002

## Story

As a judge, I want to see — side by side — how the same model reviews the same shop-demo PR with and without recorded intent, so that I viscerally get "aligning to intent ≠ aligning to best practice" before I read the aggregate numbers.

## Acceptance criteria

- [x] `/evidence` gains a sub-nav: **Measured benchmark** (Backstage) + **Worked example** (shop-demo). (nested routes + `EvidenceLayout`)
- [x] The worked example reproduces `contrast.html`'s ungrounded-vs-grounded side-by-side (the cache PR), **rebuilt in React** (`react-markdown`), dark-themed, **not iframed**.
- [x] Deploys to GitHub Pages; the README worked-example link repointed to `#/evidence/example`.

## Notes

The measured-evidence eval table already lives in the SPA (the Measured benchmark sub-page) — not duplicated here.
