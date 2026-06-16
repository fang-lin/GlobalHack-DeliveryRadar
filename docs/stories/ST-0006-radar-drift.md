# ST-0006: `radar drift` — scan the standing codebase against constraints, produce a drift report

- **Status:** Todo
- **Type:** feature / core operation (Drift)
- **Spec:** `FR-DRIFT-0..8`
- **Related:** ST-0008 (dogfood consumes it)

## Story

As a maintainer, I want the radar to scan the *existing codebase* (not a single diff) against the active constraints and report where the code has drifted from current intent, so that decay is visible as a trend rather than discovered only at PR time.

## Acceptance criteria

- [ ] `radar drift --adr-dir <dir> --root <path>` retrieves files in each constraint's `scope`, runs the grounded conformance check over the existing code, and emits a **drift report**: per-constraint violation count + the violating files/lines.
- [ ] Reuses extract/retrieve/checker; semantic checks stay advisory; `--save`/`--replay`.
- [ ] Minimal real slice (no decay-trend history or dashboard wiring yet — that's capability #8); output both machine- and human-readable.

## Notes

Makes **Drift** a real operation, not just the seeded sparklines.
