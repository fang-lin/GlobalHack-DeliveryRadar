# IIAC Loop Diagram Design Notes

> **Authoritative version: Chinese (`2026-06-12-iiac-loop-diagram-design.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**
> Status: implemented as screen 1 of `dashboard/index.html` (the showcase landing page); this document exists for quick review — change here = change the diagram.

## One sentence

**The center is Intent (documents are only carriers)**; three detection
pipelines keep intent and implementation aligned with each other; **intent
write-backs must pass human confirmation** (the convergence points); a curve
strip at the bottom shows convergence as the outcome.

## Layout (top to bottom)

1. Top "SOURCE OF TRUTH" band: violet **Intent** box (subtitle: carried by ADRs ·
   specs · stories · requirement docs — linked to business drivers) → *extract* →
   violet **Constraints** box (addressable · stable IDs).
2. Grey fan-out arrows to the three green operation boxes (side by side):
   Conformance (on PR open + push) / Decision Capture (on PR open) /
   Drift Detection (cron · on intent change).
3. Each pipeline yields a neutral "intermediate artifact" box: Report (typed
   advisory PR review) / Decision Note (draft · human triage) / Drift report
   (+ decay trend per ADR).
4. Below (columns 2 and 3 only): Graduate → intent (architectural → ADR ·
   behavioral → story/AC, violet) and Remediation issue (neutral) +
   Supersede → intent (violet).
5. Return edge (violet): Graduate and Supersede merge into the bottom path,
   pass through the dashed **human confirms ✓** gate, and re-enter the Intent
   box; labeled `updated intent → constraints re-extracted ↻`.
6. Legend: violet = intent · its updates; green = detection operations;
   grey = intermediate artifacts.
7. Convergence strip: red jagged rising line `without — divergence compounds`
   vs. teal flat-plus-steps line `with — converges ≈ 0` (annotations: flat =
   conformance blocks new divergence; steps = drift drains the backlog);
   footnote: capture keeps the measure honest (no unrecorded decisions) →
   aligned at every step, convergent over time → deterministic output.

## Key semantic decisions

- **A. The center is Intent, not ADR** — ADR is demoted to one carrier among
  specs/stories/requirement docs.
- **B. Humans appear only at convergence points** — "human confirms ✓" is a
  gate on the write-back path, not a centerpiece.
- **C. Capture graduation routes by class** — architectural → ADR,
  behavioral → story/AC.
- **D. Mechanism and outcome share one screen** — the upper part answers "how
  alignment happens"; the curve strip answers "why it converges".

## Open review questions

1. Intent carrier list: currently `ADRs · specs · stories · requirement docs` —
   add or remove any?
2. The "human confirms ✓" gate: is its position/weight (small dashed box on the
   bottom return path) right?
3. Convergence strip: keep on the same screen (current state) or split into its
   own screen?
