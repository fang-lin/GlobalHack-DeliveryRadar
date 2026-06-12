# Demo Day Slice Design — Delivery Radar Demo Video

> **Authoritative version: Chinese (`2026-06-12-demo-day-slice-design.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**

## 1. Goal and Constraints

- **Deliverable**: a ~**5-minute** demo video, **submitted by 2026-06-12 24:00 CEST** (hackathon).
- **North star**: requirements spec `AC-3` — for a CI-green PR, show the ADR clause it quietly violated, its business driver, and the review comment the system posts.
- **Layering principle**: the differentiating capability (driver-grounded semantic checking) must be real; everything else may be staged.
- This slice does not replace the full Phase 1 design; weekend work continues from here.

## 2. Video Narrative (seven scenes, see `docs/video/2026-06-12-demo-video-script.md`)

1. Pain: code is produced faster than review-against-why (~30s)
2. Staging: `shop-demo` + `ADR-001` (business rationale) + machine-readable constraints block + live `radar extract` (~40s)
3. **Main scene**: CI-green PR → scope retrieval → radar check → real review comment citing ADR clause + business rationale + code lines + fix direction (~70s)
4. Contrast: same model, ungrounded AI review misses it — "letter honored, reason defeated" (~30s)
5. Closed loop: ADR → Constraint → conformance/drift; capture/supersede feed back; "machine drafts, human confirms" (~40s)
6. Dashboard overview: conformance feed (with the real verdict), drift trends, at-risk ADR binary-choice card, Decision Note triage queue (~55s)
7. Roadmap (Phase 1 running / Phase 2 drift+dashboard / Phase 3 earned gating) + close (~35s)

## 3. Build Scope

### 3.1 radar CLI (this repo, `src/radar/`, real pipeline)

| Subcommand | Behavior | Requirements |
|---|---|---|
| `extract` | Parse `constraints` blocks in `docs/adr/*.md` → `DM-CONSTRAINT`; validate the forbidden `gate`+`semantic` combination and id stability | `FR-EXT-1`, `FR-EXT-3` |
| `check` | Read PR diff → retrieval by `scope.paths` matching → Claude structured output `DM-VERDICT` (`unknown` first-class); `--save/--replay` persists verdicts | `FR-CONF-3..6`, `NFR-RETRIEVAL-1` |
| `comment` | Verdict → GitHub PR review comment (`gh api`) with 🛰️ header, ADR↔code evidence chain, fix direction; fallback: manual paste of generated Markdown | `FR-CONF-7` (structural type only), `NFR-EXPLAIN-1` |

### 3.2 Tech Choices (locked)

- Python 3 (miniconda) + venv + pip; deps only `anthropic`, `PyYAML` (+ `pytest` for tests); CLI via `argparse`.
- Semantic check: `claude-opus-4-8`, adaptive thinking, `client.messages.parse()` + Pydantic (`DM-VERDICT` shape).
- API key: env var first, fallback to `.env` at repo root (gitignored).
- Demo repo: `~/Projects/shop-demo` (sibling dir, separate git), GitHub personal account `fang-lin`, private.
- Dashboard: single-file `dashboard/index.html` + Tailwind CDN + inline SVG; data injected via `data.js` (`window.RADAR_DATA`) — conformance fed with real verdicts, drift/capture seeded.

### 3.3 Staged Content

- `ADR-001`: inventory reads go through cache, tolerate ≤5min staleness; **driver**: peak-sale DB read amplification — business accepts staleness for conversion (epic link written in).
- Violating PR: cache bypass + `SELECT ... FOR UPDATE`; tests pass, linter silent; title disguised as a harmless bugfix.
- Baseline contrast: same diff, same model, prompt without ADR/driver grounding; output saved.

## 4. Explicitly Out (today)

Webhook/GitHub Action, capture detection, drift scanning, replay harness, persistent store, suggestion-block typed projection (structural comment type only), second compliant PR (time permitting).

## 5. Checkpoints and Pre-agreed Cuts (CEST)

| Time | Must achieve | Otherwise |
|---|---|---|
| ~13:00 | radar's three commands pass on local fixtures | cut the compliant contrast PR |
| ~16:00 | demo repo + PR + real comment live | `gh api` trouble → paste Markdown manually |
| ~19:00 | dashboard camera-ready | cut the capture section |
| ~21:00 | **hard stop**, switch to rehearsal/recording | record from persisted artifacts |

## 6. Risks and Fallbacks

- LLM flaking on camera → `--save/--replay`: recording consumes only verified persisted verdicts.
- Comment not product-like → Markdown with structured `🛰️ Delivery Radar` header.
- `file://` blocking fetch → data inlined via `data.js`, double-click to open.
- Narration: English (default, script to follow); video records GitHub UI + local dashboard page.
