# Delivery Radar — Vision & Scope

> **Authoritative: Chinese (`product-vision.zh.md`) · This file: synchronized English translation · Last updated: 2026-06-16 · Concept-level, evolving · On conflict, the Chinese version prevails.**

## 0. What this document is

It manages Delivery Radar's **concept-level requirements** — what it fundamentally is, its positioning, its scope — not a feature list. It sits **above** the requirements spec (SRS, `docs/requirements/`): concepts are incubated and refined here, **distilled into the README / showcase only once stable**, and settled decisions are extracted into the project's own ADRs. **Evolving concepts do not get dumped straight into the README.**

Document chain (its shape is IIAC itself):

> **Vision (this doc, concept) → ADR (settled decisions) → requirements spec (how to build) → README / showcase (public distillation)**

## 1. Vision statement

Delivery Radar is **process control for AI-era software production**: it treats the team's **recorded intent** as the spec, and keeps every change — whether from a human or an agent — **converging** on it.

## 2. The problem (Why)

AI produces code at machine speed; humans can no longer review *against the original "why"* at that speed. Intent is scattered across ADRs, people's heads, and meeting rooms, so the implementation **quietly drifts**. Nothing today checks "does this still match what we decided": tests check "does it run", linters check "is it tidy", generic AI review gives "plausible opinions" (and may even propose a fix that violates the decision).

## 3. Essence: a process-control discipline (the core reframe)

It is **not "yet another review tool"** — it is a **process-control craft / discipline**: define the spec → control the process so output meets spec → measure deviation → correct → converge on spec. The mapping:

| Manufacturing process control | Delivery Radar (IIAC) |
|---|---|
| Spec | Recorded intent (ADR + driver) |
| Production process | Development (humans / agents writing code) |
| Quality inspection | Conformance check against intent |
| Deviation | Drift |
| Correction | Remediation / supersede (through the human gate) |
| Convergence on spec | Codebase trends toward intent over time |

The slide line *"convergence makes the trajectory settle — no oscillation"* is already **control-theory / SPC** language — this framing was baked in, not bolted on.
(Wording: externally use **"process control / engineering discipline for intent-aligned software production"**; the Chinese leans on "过程控制工艺 / 过程纪律" and avoids the bare word "工艺/craft" to dodge an artisanal connotation that clashes with "machine-readable, machine-checkable".)

## 4. Two hard cores + the convergence loop (the teeth — without these it's hot air)

The abstract positioning only earns its keep if it lands on these:

- **Core ①**: intent is **machine-readable + bound to its business driver** (constraint blocks inside ADRs, stable IDs).
- **Core ②**: a semantic judgment **against the in-scope recorded intent, carrying the driver's reasoning** — **not against best practice**. "Aligning to intent ≠ aligning to best practice" is the soul line.
- **Convergence loop**: each pass aligns one change → the whole trends toward intent; every **write-back to intent** passes a **human gate**; everything is **tracked and auditable** (convergence needs memory).

## 5. Form is just an outward manifestation (CLI / Skill / Agent)

One discipline, plugged into different points of the software lifecycle; **not tied to any one form → more durable** (tools come and go, the craft remains):

- **CLI**: a gate on CI (today's implementation).
- **Skill**: lets a dev / agent **adopt** the discipline (the method + driving the radar).
- **Agent**: autonomous **self-check** — a coding agent checks itself with the same verdict logic before opening a PR.

Hence **radar = the alignment layer of the agentic-development loop / an agent's alignment self-check.**

## 6. Dual path + auditability (the north star)

- **Humans today**: agents write code, humans steer in real time — doesn't scale past one person, one session.
- **Exploration goal (not a commitment)**: **long-horizon autonomy** — recorded, machine-checkable intent replaces real-time steering; the agent self-checks before opening a PR and escalates to a human only at decision points. **Alignment is carried by infrastructure; the human steps out of the loop, alignment stays in.**
- **Auditable throughout**: who decided · what changed · why — turning point-in-time alignment into a convergence trajectory.

## 7. Scope (what it is / isn't)

**Is**: process control for intent alignment; **advisory (never blocks the merge)**; evidence-linked (verdicts cite the ADR clause + code lines + fix direction).

**Isn't**: not a replacement for linters / tests; not generic AI code review; **no enforced gating by default** — gating must be **earned** by being "deterministic *and* precision-proven on the repo's own history".

## 8. Concept-level requirement items (tracked)

Managed with stable IDs, for later refinement / trade-offs:

| ID | Concept-level claim | Status |
|---|---|---|
| **VIS-1** | The essence is a **process-control discipline**, not a tool | Accepted |
| **VIS-2** | **Form (CLI / Skill / Agent) is an outward manifestation**, not a lock-in; one discipline, many touchpoints | Accepted |
| **VIS-3** | **radar = the alignment layer of agentic development / an agent's alignment self-check** | Accepted |
| **VIS-4** | **Dogfood**: record the project's own intent as ADRs (+ constraint blocks) and **let the radar check the project against itself** | Exploring |

## 9. Honest boundaries

- Words like "process control / craft / methodology" can sound hollow — they are **only not buzzwords if every claim lands on cores ①② (machine-readable intent + driver grounding) plus the convergence loop**.
- The demo / evidence must stay concrete (the radar catching a real violation; the harness quantifying grounded vs ungrounded), or the abstraction becomes philosophy.
- Long-horizon autonomy is an **exploration direction**, not a delivered capability; external wording must never present it as "already implemented".
