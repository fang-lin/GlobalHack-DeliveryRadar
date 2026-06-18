# ADR-0005: Significant UI elements carry stable ids (locatability & testability)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Lin Fang
- **Related:** ADR-0001 (the SPA) · ST-0008 (dogfood — own ADRs carry constraints)

## Context

We constantly need to point at a specific element — when discussing the UI in chat ("the IIAC-loop section", "the dashboard nav item"), when writing or reading tests, and when the radar / QA agent reasons about a change. Anonymous `<div>`s carrying only utility classes are hard to reference unambiguously and brittle to target in tests (class- and text-based selectors break on restyle/copy edits).

## Decision

**Every user-visible element with independent semantic meaning carries a stable, descriptive `id`** (or `data-testid`) — page sections, every nav item, every interactive control (button / link / input), and every distinct content unit a user perceives as a thing (a card, a metric/stat, a verdict row, a labelled value, a CTA, a heading that names something). Ids are **kebab-case and meaningful** (`id="hero"`, `id="nav-dashboard"`); data-driven elements derive a **stable** id from the data's own identity (e.g. `adr-001-c1` from the row), **never** an index or auto-generated value. **The only exemption is a pure layout/wrapper element** (a flex/grid container, a spacer) that carries no independent meaning of its own — exempt because it has no semantics, not because it's "minor".

*(Strengthened 2026-06-18: the first wording — "only elements a human/test would reasonably target", "not every div" — was too soft and let the implementer rationalise skipping real controls. The bar is now "independent semantic meaning", with pure layout the only exemption.)*

## Consequences

- The showcase becomes addressable: "the `iiac-loop` section" is unambiguous; tests use `#nav-evidence` instead of fragile class/text selectors.
- Adding a significant element with no id is a drift — **and it is easy to forget**, so the radar guards it (constraint below).
- Existing elements get ids incrementally as they are touched (no big-bang retrofit required).

## Machine-checkable constraints

```constraints
- id: ADR-0005-C1
  adr: ADR-0005
  title: Significant UI elements carry stable, descriptive ids
  rule: >
    Every user-visible element with INDEPENDENT SEMANTIC MEANING must carry a
    stable, descriptive id (or data-testid): page sections, every nav item,
    every interactive control (button/link/input), and every distinct content
    unit (card, metric/stat, verdict row, labelled value, CTA, naming heading).
    Adding OR changing such an element without a stable id is a violation.
    Data-driven elements use a stable, data-derived id (not an index). The ONLY
    exemption is a pure layout/wrapper element (flex/grid container, spacer)
    with no independent meaning of its own.
  polarity: requirement
  driver: ADR-0005 — locatability for discussion + stable test selectors
  scope:
    paths: ["web/src/**"]
    layers: ["web", "testability"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - '<section id="iiac-loop">, <NavLink id="nav-dashboard">, <button id="run-eval">'
        - "data-driven element: a stable id derived from the data (e.g. adr-001-c1), not an index"
        - "pure layout wrapper (flex/grid container) with no id — exempt, no independent meaning"
      violating:
        - "any new user-visible semantic element (card, metric, verdict row, link, button, labelled value) with only className and no id"
        - "index- or auto-generated ids (row-0, row-1) for a semantic element"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
```
