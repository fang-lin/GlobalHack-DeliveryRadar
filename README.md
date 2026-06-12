# 🛰️ Delivery Radar

**Intent–Implementation Alignment & Convergence (IIAC)** — a governance engine
that keeps code changes aligned with recorded intent (ADRs, specs, stories) and
makes intent and implementation *converge* over time instead of drifting apart
one green build at a time.

> AI writes code faster than anyone can review it against **why** the system is
> built the way it is. PRs pass every test and still quietly break decisions the
> team already made. Delivery Radar checks every change against the recorded
> decisions — and the business reasons behind them.

## The loop

```
Intent (ADRs · specs · stories) ──extract──► Constraints (addressable, stable IDs)
        ▲                                          │ fan-out
        │ human confirms ✓                         ▼
        └──── Graduate / Supersede ◄── Capture · Conformance · Drift
```

Three operations over one shared contract:

| Operation | Trigger | Output |
|---|---|---|
| **Conformance** — enforce | PR open + push | typed, advisory PR review with evidence (ADR clause ↔ code lines) |
| **Drift Detection** — audit | cron · intent change | drift report + decay trends; remediate-or-supersede drafts |
| **Decision Capture** — produce | PR open | Decision Notes for implicit decisions; graduate to new intent |

*Alignment makes each change right; convergence makes the trajectory settle —
no oscillation, deterministic output. Every verdict, signal and confirmation is
recorded: who decided, what changed, why.*

## Live demo

- **Demo PR with a real verdict**: [fang-lin/shop-demo#1](https://github.com/fang-lin/shop-demo/pull/1) —
  CI-green "bugfix" that violates ADR-001's business driver; the radar's advisory
  review quotes the recorded rationale (€400k peak-sale incident) and the fix direction.
- **Dashboard & slides**: https://fang-lin.github.io/delivery-radar-pages/
  ([slides](https://fang-lin.github.io/delivery-radar-pages/slides.html) ·
  [grounded-vs-ungrounded contrast](https://fang-lin.github.io/delivery-radar-pages/contrast.html))

## Quickstart

```bash
python3 -m venv .venv && .venv/bin/pip install -e .
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env   # gitignored

# extract constraints from a repo's ADRs
.venv/bin/radar extract --adr-dir ../shop-demo/docs/adr

# check a PR diff against in-scope constraints (semantic, driver-grounded)
gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
.venv/bin/radar check --adr-dir ../shop-demo/docs/adr --diff pr1.diff --save verdicts.json

# project verdicts as an advisory PR review
.venv/bin/radar comment --adr-dir ../shop-demo/docs/adr --verdicts verdicts.json \
  --repo fang-lin/shop-demo --pr 1 --post
```

Tests: `.venv/bin/python -m pytest tests/`

## Repository layout

```
src/radar/        CLI + core: extract / retrieve / check / comment
tests/            fixture-based tests (ADR parsing, scope retrieval)
dashboard/        static demo pages (dashboard, slides, contrast)
artifacts/        persisted verdicts + baseline output (replayable)
docs/
  requirements/   full build spec (zh authoritative · en mirror)
  specs/          demo-day slice design (zh · en)
  governance/     documentation policy (bilingual, zh authoritative)
  video/          showcase operating scripts (zh · en)
  adr/            this repo's own ADRs (dogfooding, en)
```

## Status

Hackathon Phase 1 slice (2026-06-12): constraint extraction, scope-first
retrieval, driver-grounded semantic conformance and advisory review projection
run today on real PRs. Capture, the drift engine, the replay-precision harness
and earned gating are specified (stable requirement IDs in
`docs/requirements/`) and sequenced — see the
[roadmap](https://fang-lin.github.io/delivery-radar-pages/slides.html).

Principles that never bend: **machine drafts, human confirms** · advisory by
default, a check earns the right to block · the constraint is the single shared
contract.
