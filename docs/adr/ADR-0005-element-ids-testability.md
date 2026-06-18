# ADR-0005: Significant UI elements carry stable ids (locatability & testability)

- **Status:** Accepted
- **Date:** 2026-06-18
- **Deciders:** Lin Fang
- **Related:** ADR-0001 (the SPA) · ST-0008 (dogfood — own ADRs carry constraints)

## Context

We constantly need to point at a specific element — when discussing the UI in chat ("the IIAC-loop section", "the dashboard nav item"), when writing or reading tests, and when the radar / QA agent reasons about a change. Anonymous `<div>`s carrying only utility classes are hard to reference unambiguously and brittle to target in tests (class- and text-based selectors break on restyle/copy edits).

## Decision

**Significant UI elements carry a stable, descriptive `id`** (or `data-testid`): page sections, navigation items, interactive controls (button / link / input), and major named content blocks. Ids are **kebab-case and meaningful** (`id="hero"`, `id="iiac-loop"`, `id="nav-dashboard"`), not auto-generated or index-based. This is **not** "every `<div>`/`<span>`" — it is every element a human or a test would reasonably need to target.

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
    Significant UI elements — page sections, navigation items, interactive
    controls (button/link/input), and major named content blocks — must carry a
    stable, descriptive id (or data-testid), kebab-case and meaningful, so they
    can be located for discussion and tests. Adding such an element with no id
    (only utility classes) is a violation. This does NOT mean every div/span —
    only elements a human or a test would reasonably target.
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
        - '<section id="iiac-loop"> ... </section>'
        - '<NavLink id="nav-dashboard" ...>'
        - '<button id="run-eval" ...>'
      violating:
        - "a new section / nav item / button with only className and no id or data-testid"
        - "unstable auto-generated or index-based ids for a key control"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
```
