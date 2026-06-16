# ST-0008: Dogfood — run the radar on this repo's own ADRs (VIS-4)

- **Status:** Todo (depends on ST-0005, ST-0006)
- **Type:** dogfood
- **Implements:** VIS-4
- **Related:** ADR-0001 / ADR-0002 (get constraint blocks) · ST-0005 (capture) · ST-0006 (drift)

## Story

As the team, we want to govern Delivery Radar's *own* development with Delivery Radar, so that "we use IIAC on ourselves" is demonstrable — the strongest proof the method is real, and the most distinctive thing to show at Round 2.

## Acceptance criteria

- [ ] Add machine-readable `constraints` blocks to the project's own ADRs (ADR-0001/0002 and/or new ones): stable IDs + scope + driver.
- [ ] Run `radar check` on a recent PR to this repo, `radar drift` on this codebase, and `radar capture` on a diff — capture the outputs as evidence.
- [ ] (Stretch) Surface **"this project"** as a third dashboard subject in the SPA.

## Notes

Will likely spawn an ADR ("we govern this repo with our own radar; our ADRs carry constraint blocks"). This is the line that ties together the three operations (ST-0005/0006 + live Conformance) into one demonstrable loop on ourselves. Honesty guardrail (vision §9): keep it concrete; don't overclaim.
