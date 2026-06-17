# ST-0016: Redirect all pre-migration `-pages` showcase links to the new Pages site

- **Status:** In progress — redirect shell built (the `-pages` repo, this session); **per-link browser verification pending**.
- **Type:** infra / migration
- **Relates to:** ADR-0004 (the deploy migration that changed the URL), ST-0015 (the pipeline).

## Story

The showcase moved from `https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/` to `https://fang-lin.github.io/GlobalHack-DeliveryRadar/`. The submitted video and the pre-migration README publicized the **old** `-pages` deep links. So every old link a viewer might follow must land on the **correct** new subpage — not just the homepage.

## Inventory — old `-pages` links in the pre-migration README (`c424c0e^`)

| # | old link | refs | → new target |
|---|---|---|---|
| 1 | `…-pages/#/evidence` | 4 | `…/GlobalHack-DeliveryRadar/#/evidence` |
| 2 | `…-pages/#/evidence/example` | 2 | `…/#/evidence/example` |
| 3 | `…-pages/#/dashboard/backstage` | 1 | `…/#/dashboard/backstage` |
| 4 | `…-pages/#/dashboard` | 1 | `…/#/dashboard` |
| 5 | `…-pages/` (root) | 1 | `…/` (root) |

All five share the root path (`…-pages/`) with the route in the URL **hash**; the root `index.html` redirect (`location.replace(NEW + location.hash + location.search)`) should map them all. Legacy standalone pages (`slides.html`/`dashboard.html`/`contrast.html`) and a `404.html` fallback also redirect (built this session) — out of the README's scope but kept for video/old links.

## Acceptance criteria

- [ ] In a real browser, each of the 5 links above is followed and confirmed to land on the **exact** new subpage (hash preserved), not just the homepage.
- [ ] Any link that does not map correctly is fixed in the `-pages` redirect shell.
- [ ] Record the verification (which links checked, result) as evidence.

## Notes

The redirect lives in the **`-pages` repo** (now a pure redirect shell — must NOT be deleted; the video links to it). curl can confirm the redirect HTML/JS is served but **cannot** exercise the client-side hash redirect — hence the browser verification. New README already points at the new URL; this story is about the **already-published** old links.
