# ST-0011: Migrate the radar from Python to TypeScript

- **Status:** Done (2026-06-14)
- **Type:** migration
- **Implements:** ADR-0003

## Story

As the maintainer, I want the radar reimplemented in TypeScript, so the core and the showcase share one language and structured outputs use Zod schemas.

## Acceptance criteria

- [x] `extract` / `check` / `comment` reimplemented in TS (Node 22, `@anthropic-ai/sdk`, `zod/v4`, `js-yaml`, `vitest`).
- [x] Behavior-equivalent: `extract` + `check --replay` byte-identical to Python; live `check` produces correct verdicts; `comment` renders identically.
- [x] 7/7 vitest pass.

## Notes

**Backfilled story** — the work was done 2026-06-14, before the intent-tracking discipline existed (this is part of "making the account whole"). The Round-1 video shows the Python version.
