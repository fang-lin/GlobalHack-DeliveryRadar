# ST-0001: Rebuild the showcase as a React SPA

- **Status:** Done
- **Type:** showcase / frontend
- **Implements:** ADR-0001
- **Commits:** `git log -- web/` (feat(web): SPA scaffold · homepage deck · Evidence narrative · Thoughtworks logo)

## Story

As a hackathon judge / first-time visitor, I want a single polished site that explains the product and shows its evidence, so that I can grasp Delivery Radar and trust it within a few minutes.

## Acceptance criteria

- [x] Three routes render and deploy to GitHub Pages (Overview / Dashboard / Evidence).
- [x] Homepage carries the product intro (IIAC Loop diagram + system map + dual-path + roadmap), page-by-page on desktop.
- [x] Dashboard = shop-demo product view; Evidence = measured Backstage benchmark; each labelled by subject.
- [x] Static data only; reproducible build (`cd web && npm run build` → copy `dist/` to the pages repo).

## Notes

Content-parity with the legacy `dashboard/` pages is **not** complete — tracked in ST-0002.
