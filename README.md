# 🛰️ Delivery Radar

**Intent–Implementation Alignment & Convergence (IIAC)** — a governance engine
that keeps code changes aligned with recorded intent (ADRs, specs, stories) and
makes intent and implementation *converge* over time instead of drifting apart
one green build at a time.

> AI writes code faster than anyone can review it against **why** the system is
> built the way it is. PRs pass every test and still quietly break decisions the
> team already made. Delivery Radar checks every change against the recorded
> decisions — and the business reasons behind them.

## The IIAC Loop

```mermaid
flowchart TB
    I["Intent — source of truth<br/>carried by ADRs · specs · stories · requirement docs"]
    C["Constraints<br/>addressable · stable IDs"]
    CONF["Conformance<br/>on PR open + push"]
    CAP["Decision Capture<br/>on PR open"]
    DRIFT["Drift Detection<br/>cron · on intent change"]
    R["Report<br/>typed advisory PR review"]
    DN["Decision Note<br/>draft · human triage"]
    DR["Drift report<br/>+ decay trend per ADR"]
    G["Graduate → intent<br/>architectural → ADR · behavioral → story/AC"]
    REM["Remediation issue"]
    SUP["Supersede → intent"]
    H{{"human confirms ✓"}}

    I -- extract --> C
    C --> CONF
    C --> CAP
    C --> DRIFT
    CONF --> R
    CAP --> DN
    DRIFT --> DR
    DN --> G
    DR --> REM
    DR --> SUP
    G --> H
    SUP --> H
    H -- "updated intent → constraints re-extracted ↻" --> I

    classDef intent stroke:#7c3aed,stroke-width:2.5px;
    class I,C,G,SUP,H intent;
    classDef op stroke:#059669,stroke-width:2.5px;
    class CONF,CAP,DRIFT op;
```

Three operations over one shared contract:

| Operation | Trigger | Output |
|---|---|---|
| **Conformance** — enforce | PR open + push | typed, advisory PR review with evidence (ADR clause ↔ code lines) |
| **Drift Detection** — audit | cron · intent change | drift report + decay trends; remediate-or-supersede drafts |
| **Decision Capture** — produce | PR open | Decision Notes for implicit decisions; graduate to new intent |

*Alignment makes each change right; convergence makes the trajectory settle —
no oscillation, deterministic output.*

**Auditability is part of the method, not garnish.** Convergence is a property
of a *trajectory*, and a trajectory needs memory: without recorded verdicts,
confirmations and intent history you can judge "aligned right now" — but never
know you are *getting closer*. In AI-led development, where agents write most
of the code, the audit trail is the system's institutional memory: stable
constraint IDs make history addressable, recorded confirmations keep settled
questions settled, and the distance-from-intent trend becomes computable at
all. **No history, no trajectory; no trajectory, no convergence** — *who
decided, what changed, why*.

## Progress — the vision is big; today's slice is deliberately thin

Built in one hackathon day (2026-06-12). Every 🧭 row already carries stable
requirement IDs in [the spec](docs/requirements/delivery-radar-requirements.en.md)
— the vision is sequenced, not vapor.

| # | Capability | Spec | Status |
|---|---|---|---|
| 1 | Constraint extraction from ADR blocks | `FR-EXT-1/3` | ✅ **live** |
| 2 | Scope-first retrieval (noise control) | `NFR-RETRIEVAL-1` | ✅ **live** |
| 3 | Driver-grounded semantic conformance | `FR-CONF-3..6` | ✅ **live** |
| 4 | Advisory review on real PRs, evidence-linked | `FR-CONF-7..9` | ✅ **live** (structural comment type) |
| 5 | Verdict persistence & replay | `NFR-EVAL-1` (partial) | 🟡 basic (`--save` / `--replay`) |
| 6 | GitHub Action automation (auto-run on PR events) | `FR-INT-1` | 🔜 next |
| 7 | Decision Capture → Notes → graduation | `FR-CAP-1..9` | 🧭 specified |
| 8 | Drift engine + decay dashboard | `FR-DRIFT-0..8` | 🧭 specified (dashboard = seeded preview) |
| 9 | Behavioral intent layer (stories / AC) | §3.1 Phase 2 | 🧭 specified |
| 10 | Audit trail: verdicts + human signals persisted | `FR-CONF-10` `NFR-EVAL-1` | 🧭 specified |
| 11 | Historical-replay precision harness | §14 `AC-1/2` | 🧭 specified |
| 12 | Earned gating (deterministic + proven precision only) | `NFR-GATE-1` | 🧭 specified |
| 13 | Pre-PR self-check in agent loops → long-horizon autonomy | `FR-CONF-2` | 🧭 specified |

**4 of 13 capability groups run today.** That ratio is the point: the live
slice proves the differentiating mechanism (driver-grounded verdicts on real
PRs); the other nine are why it matters — see the
[showcase](https://fang-lin.github.io/delivery-radar-pages/).

## Live demo

- **Demo PR with a real verdict**: [fang-lin/shop-demo#1](https://github.com/fang-lin/shop-demo/pull/1) —
  CI-green "bugfix" that violates ADR-001's business driver; the radar's advisory
  review quotes the recorded business rationale (EPIC-512, peak-sale stability)
  and the direction of the fix.
- **Showcase (slides)**: https://fang-lin.github.io/delivery-radar-pages/
  ([dashboard](https://fang-lin.github.io/delivery-radar-pages/dashboard.html) ·
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
  adr/            reserved for this repo's own ADRs (en)
```

Principles that never bend: **machine drafts, human confirms** · advisory by
default, a check earns the right to block · the constraint is the single shared
contract.

---

Built at the [Thoughtworks](https://www.thoughtworks.com) **Global Hackathon**
(June 2026) — organizer and sponsor. *Innovation that AI/works™*

<img src="https://www.thoughtworks.com/etc.clientlibs/thoughtworks/clientlibs/clientlib-site/resources/images/thoughtworks-logo.svg" alt="Thoughtworks — Innovation that AI/works™" height="22" />
