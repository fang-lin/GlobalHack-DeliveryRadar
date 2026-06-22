# ST-0005: `radar capture` — a skill-driven agent that drafts Decision Notes from a merged PR

- **Status:** In progress (design done — ADR-0009 + spec; implementation pending)
- **Type:** feature / core operation (Capture)
- **Implements / Relates:** `FR-CAP-1..9` (capture) · `DM-DECISION-NOTE` · `ADR-0009` (skill-driven agent on the AI SDK, at the edge) · `ADR-0006` (platform-agnostic core) · design spec `docs/specs/2026-06-22-decision-capture-design.zh.md` · `ST-0009` (the IIAC skill) · ST-0008 (dogfood consumes it)

## Story

As a reviewer/maintainer, I want the radar to notice decisions a PR made *implicitly* but that aren't recorded in any ADR — after the PR merges — and draft them for me, so undocumented intent gets captured instead of silently becoming unrecorded precedent.

## Design (per ADR-0009)

Capture is a **skill-driven investigative agent**, not a single LLM call: it reads the merged PR's diff and investigates the repo (read / grep / read-only git) to judge whether a change is an **implicit, net-new, architecturally-significant** decision. The agent is **hand-written on the Vercel AI SDK** (no framework), lives at the edge (`src/capture/`), and runs on the same pluggable cheap provider as conformance. Its methodology lives in `skills/capture/SKILL.md` (`ST-0009`), injected as the agent's instructions. It runs **after merge** (decoupled from conformance) and emits **draft** Decision Notes; the workflow turns each into a **draft PR (proposed ADR) or issue** for the maintainer to merge/close.

## Acceptance criteria

- [ ] `radar capture --diff <file> --adr-dir <dir>` reads a merged PR's diff, investigates the repo, and emits 0..n **draft Decision Notes** (Zod-validated): each = `detected_decision` + `evidence (file:lines)` + `suggested_class` (architectural/behavioral) + `draft_rationale` + `confidence` + `why_net_new`. **Emitting nothing is valid — do not invent decisions.**
- [ ] The agent is dedup-aware: it takes the existing constraint set and does not re-flag what's already recorded.
- [ ] Pure core (`src/core/`) stays SDK-free and platform-free; the agent + AI SDK + read-only tools live in `src/capture/` (`ADR-0009-C1`). Config from `process.env` only.
- [ ] Advisory + human-triage only: capture drafts; it MUST NOT auto-accept/merge an ADR, push, or block a merge (`ADR-0009-C2`).
- [ ] `--save` / `--replay` for demo determinism; tested with a mock model (no real LLM in tests, `ST-0024` discipline).

## Notes

This slice does **not** include the post-confirmation graduation automation beyond opening the draft PR/issue. Makes **Capture** a real, live operation (debuts the agent pillar, `ST-0010`, and the methodology-as-skill, `ST-0009`). Honesty guardrail (vision §9): keep it concrete; high bar; nothing-flagged is a normal result.
