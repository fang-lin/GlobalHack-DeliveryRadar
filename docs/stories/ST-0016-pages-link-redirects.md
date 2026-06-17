# ST-0016: Redirect all pre-migration `-pages` showcase links to the new Pages site

- **Status:** In progress — redirect shell built (the `-pages` repo, this session); **per-link browser verification pending**.
- **Type:** infra / migration
- **Relates to:** ADR-0004 (the deploy migration that changed the URL), ST-0015 (the pipeline).

## Story

The showcase moved from `https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/` to `https://fang-lin.github.io/GlobalHack-DeliveryRadar/`. The submitted video and the pre-migration README publicized the **old** `-pages` deep links. So every old link a viewer might follow must land on the **correct** new subpage — not just the homepage.

## Inventory — old `-pages` links across pre-migration README states

**Hard requirement: each old link maps to its specific new subpage — NOT all dumped on the homepage.**

Three README states were checked. The earliest, `c293925` (2026-06-12, **pre-SPA** — no `web/`, no HashRouter), is the one the **submitted video most likely matches**; its links are all static `.html` / root. Later states (`d875673` 2026-06-15, `c424c0e^`) are post-SPA and use `#/` hash routes. Union of every distinct old path:

| old `-pages` path | seen in | type | → new target | mechanism |
|---|---|---|---|---|
| `…-pages/` (root) | c293925 (slides landing), all | root | `…/GlobalHack-DeliveryRadar/` (homepage = the deck) | index.html |
| `…-pages/dashboard.html` | **c293925** | legacy .html | `…/#/dashboard` | **targeted** |
| `…-pages/contrast.html` | **c293925**, d875673 | legacy .html | `…/#/evidence/example` | **targeted** |
| `…-pages/#/evidence` | d875673, c424c0e^ | hash route | `…/#/evidence` | index.html (preserves `location.hash`) |
| `…-pages/#/evidence/example` | c424c0e^ | hash route | `…/#/evidence/example` | index.html (hash) |
| `…-pages/#/dashboard` | d875673, c424c0e^ | hash route | `…/#/dashboard` | index.html (hash) |
| `…-pages/#/dashboard/backstage` | c424c0e^ | hash route | `…/#/dashboard/backstage` | index.html (hash) |

Also redirected for safety (any other old link): `slides.html` → `#/`, `404.html` → root.

**Why correspondence matters:** hash routes map correctly only if the shell **preserves `location.hash`** (a naive redirect would dump them all on the homepage — the failure mode to avoid). Legacy `.html` paths can't carry a hash, so each gets a **hardcoded targeted** redirect to the right route.

## Test checklist — click each OLD link, confirm it lands on the expected NEW page

🟢 = verified · ⬜ = for the maintainer to confirm

| | OLD link (click) | must land on | how |
|---|---|---|---|
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/ | https://fang-lin.github.io/GlobalHack-DeliveryRadar/ (homepage = the deck) | index.html |
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/dashboard.html | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/dashboard | targeted (curl-confirmed) |
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/contrast.html | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/evidence/example | targeted (curl-confirmed) |
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/#/evidence | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/evidence | hash preserved |
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/#/evidence/example | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/evidence/example | hash preserved |
| ⬜ | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/#/dashboard | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/dashboard | hash preserved |
| 🟢 | https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/#/dashboard/backstage | https://fang-lin.github.io/GlobalHack-DeliveryRadar/#/dashboard/backstage | hash preserved — verified in-browser 2026-06-17 |

Also covered (not from any README, kept as a safety net): `…-pages/slides.html` → `…/#/`; `404.html` catch-all → homepage.

## Acceptance criteria

- [x] Inventory every `-pages` link across the pre-migration README states (`c293925` pre-SPA · `d875673` · `c424c0e^`).
- [x] The `-pages` redirect shell maps each link to its **specific** new route — legacy `.html` via hardcoded targeted redirects, hash routes by preserving `location.hash` — **not** all to the homepage.
- [x] Hash mechanism verified in-browser on the deepest route (`#/dashboard/backstage` → correct); legacy `.html` targets curl-confirmed.
- [ ] **Maintainer** walks the test checklist above and confirms every row lands on the expected page → then ST-0016 is Done.

## Notes

The redirect lives in the **`-pages` repo** (now a pure redirect shell — must NOT be deleted; the video links to it). curl can confirm the redirect HTML/JS is served but **cannot** exercise the client-side hash redirect — hence the browser verification. New README already points at the new URL; this story is about the **already-published** old links.
