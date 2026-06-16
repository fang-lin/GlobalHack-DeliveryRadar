# ADR-0002: Showcase information architecture — Evidence sub-pages and per-subject Dashboards

- **Status:** Accepted
- **Date:** 2026-06-16
- **Deciders:** Lin Fang
- **Related:** ADR-0001 (the SPA) · ST-0003 · ST-0004 · ST-0002 (the audit that surfaced the gaps)

## Context

The SPA had a single Evidence page (the Backstage measured benchmark) and a single, thin Dashboard (shop-demo). The ST-0002 audit found legacy content not reflected in the SPA: the shop-demo **grounded-vs-ungrounded worked example** (from `dashboard/contrast.html`), and the **rich shop-demo product dashboard** (`dashboard/dashboard.html`: the ADR-002 storyline, the `unknown` verdict, the at-risk Remediation-vs-Supersede card, the Capture queue). We also want room for more than one dashboard subject.

## Decision

- **Evidence becomes a section with sub-pages** via nested routes under `/evidence`: **Measured benchmark** (Backstage) + **Worked example** (shop-demo, grounded vs ungrounded).
- **Dashboard supports multiple subjects** (one dashboard per subject): start by migrating the rich shop-demo dashboard from the legacy page; a second ("new") subject is TBD (see ST-0004).
- Everything is **rebuilt in the new stack** (React + shadcn; `react-markdown` for the prose-heavy worked-example reviews) — the legacy HTML is the source, not iframed.

## Consequences

- The worked-example / contrast content is preserved in the SPA → unblocks retiring the legacy pages (ST-0002).
- Adds a `react-markdown` dependency.
- Nav/routing gains nested Evidence routes and a Dashboard subject switch.
