# ST-0027: Unify radar operations on one skill-driven agent; conformance becomes an agent

- **Status:** In progress
- **Type:** architecture / tooling
- **Implements / Relates:** ADR-0010 · ADR-0009 (capture, the first instance of the pattern) · ADR-0003 (C1 reworded) · ADR-0007 (C1 superseded) · ST-0010 (partially realized) · ST-0009 (methodology as skills, unblocked)

## Story

As the radar maintainer, I want all radar operations (conformance, capture, future drift) to run on one shared investigative-agent engine parameterized by a skill, so that the architecture is a single model path — simpler to reason about, easier to extend, and the strongest showcase narrative.

## Acceptance criteria

- [ ] A generic investigative agent engine (`src/agent/`) exists: a tool-loop runner on the Vercel AI SDK parameterized by `{ skill, tools, outputSchema }`, returning a zod-validated object.
- [ ] `radar conformance` (CLI verb renamed from `check`) drives the engine with the conformance skill + `Verdict` output schema; scope-first retrieval still runs in code (NFR-RETRIEVAL-1).
- [ ] The agent MAY investigate beyond the diff (read / grep / read-only git) when the diff alone is insufficient, rather than defaulting to `unknown`. `unknown` remains a valid result (FR-CONF-6).
- [ ] `radar capture` is refactored to run on the shared engine (not its own bespoke adapter).
- [ ] The `ModelClient` port and its adapters (`anthropic-adapter`, `openai-compat-adapter`) are retired; every LLM call routes through the AI SDK engine.
- [ ] `pnpm eval --replay` runs against the agent engine (eval harness rewired); results are recorded for the quality gate.
- [ ] `pnpm lint && pnpm build && pnpm test` pass green on CI.
- [ ] Workflow updated: `.github/workflows/radar.yml` calls `main.ts conformance` (not `check`).
- [ ] ADR-0007-C1 marked `superseded` / `superseded_by: ADR-0010` in its constraints block.
- [ ] ADR-0003-C1 reworded to be provider-agnostic (no Anthropic-SDK-specific names).

## Verification / QA

Status flips to **Done** only after this gate passes (see `README.md`). **Fill the `result` column in as you verify** — a finished story must show a concrete `qa-engineer` verdict, not just the intent to run it.

| gate | how | result (fill in) |
|---|---|---|
| Automated | CI on the PR — lint · typecheck · unit tests · build | ⬜ pending → ✅ green (run #___) |
| Live / web behaviour | N/A — CLI/tooling change, no web UI | ✅ N/A |
| Eval quality gate | `pnpm eval --replay` agent arm vs single-shot baseline: precision/recall MUST NOT regress (NFR-EVAL-1 / AC-2) — maintainer-triggered live run | ⬜ pending (maintainer triggers; results to be recorded here) |
| Maintainer sign-off | maintainer reviews/tests the result | ⬜ pending → ✅ \<who\>, \<date\> |

> Note: the eval quality gate (`pnpm eval` live, not `--replay`) is a spending action and is triggered by the maintainer, not by Claude.

## Notes

- This story partially realizes ST-0010 (radar as an investigative agent). The investigative tool-use loop and the shared engine are delivered here. The "pre-PR self-check entrypoint" from ST-0010 remains future work.
- ADR-0010 records the decision and its consequences in full.
- The rename `check` → `conformance` aligns the CLI verb with the spec (FR-CONF-*) and all internal naming.
- Docs-and-config edits in this story (workflow rename, ADR constraint updates, README) are bundled into one commit citing ADR-0010.
