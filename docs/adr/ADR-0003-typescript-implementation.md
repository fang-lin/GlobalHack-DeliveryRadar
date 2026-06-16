# ADR-0003: Implement the radar in TypeScript (migrated from Python)

- **Status:** Accepted
- **Date:** 2026-06-14
- **Deciders:** Lin Fang
- **Related:** ST-0011 (the migration work)

## Context

Round 1 was built in Python (`argparse`, `anthropic`, `PyYAML`). After Round 1 the maintainer chose to move the radar to TypeScript. *(Honest note: this was a maintainer preference, not forced by an external constraint — an earlier attempt to justify it with a fabricated "the team/platform are TS" rationale was wrong and retracted. The real reasons are below.)*

## Decision

Reimplement the radar in **TypeScript** (Node 22): `@anthropic-ai/sdk` with `messages.parse` + `zodOutputFormat` (Zod from `zod/v4`), `js-yaml`, `vitest`, `node:util` parseArgs. Source in `src/*.ts` → `dist/`, bin `radar` → `dist/cli.js`. Behavior-equivalent to the Python version.

Reasons: (1) one language across the radar core and the showcase SPA (also TS); (2) first-class structured outputs via Zod schemas; (3) maintainer familiarity.

## Consequences

- The Round-1 demo video shows the **Python** version (noted in the demo-day spec); the repo is now TS.
- `extract` + `check --replay` verified byte-identical to the Python output; 7/7 vitest pass.
- `node_modules/` and `dist/` are gitignored.
