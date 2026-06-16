# ST-0012: Replay/precision eval harness on real Backstage ADRs

- **Status:** Done (2026-06-16)
- **Type:** feature / evaluation (capability #11)
- **Spec:** §14 `AC-1/2`
- **Design:** `docs/specs/2026-06-15-eval-corpus-design.zh.md`

## Story

As the team, we want to quantify the radar's accuracy and the grounded-vs-ungrounded gap on a labelled corpus of real third-party ADRs, so the differentiator is measured, not asserted.

## Acceptance criteria

- [x] `eval/` corpus on real Backstage ADRs (`cases.yaml` + `adr/` + `cases/`); gold labels human-set, never asked of the model.
- [x] `scripts/eval.ts` runs grounded (radar) vs ungrounded (same model) and scores violated P/R/F1 + retrieval; `--replay` caches.
- [x] Results: grounded P/R/F1 = 1.00 vs ungrounded R = 0.25 (7 cases / 4 violations); `report.md` + `results.json`; feeds the SPA Evidence page.

## Notes

**Backfilled story.** Honest framing: a small seeded corpus — illustrative, not a statistical claim.
