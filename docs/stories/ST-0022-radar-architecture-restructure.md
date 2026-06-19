# ST-0022: Review & restructure the radar CLI architecture (layered core / ports & adapters)

- **Status:** In progress
- **Type:** radar / architecture / refactor
- **Related:** ADR-0003 (TS rewrite) · **ADR-0006 (platform-agnostic core — _parked_; this story finalizes it)**

## Story

As a maintainer planning the radar's evolution (drift, capture, multi-host, multi-LLM, earned gating, the pre-PR agent), I want a clear, honest picture of the **current** CLI design and then a deliberate **target** layering — so future capabilities slot in by adding adapters / ops, not by reworking the core.

> ⚠️ ADR-0006 ("the CLI must be platform-agnostic") is **parked** until this story settles the design. It will be finalized/strengthened as an *output* of this story, not before.

## Plan (the order we agreed)

1. **Survey all CLI source** (`src/**`) — done; recorded below.
2. **Present the current design** to the maintainer (the table + seams below).
3. **Agree the target layering** + which adjustments to do *now* vs *defer*.
4. **Finalize ADR-0006** to match; implement the agreed adjustments.

## 1 + 2. Current design (survey of all 7 modules, 681 LOC)

| module | LOC | responsibility | external deps | side effects |
|---|---|---|---|---|
| `models.ts` | 127 | shared contracts — `Constraint`/`Verdict` + zod schemas; `validateConstraint` (DM-CONSTRAINT-1/2) | `zod/v4` | none — **pure** |
| `retrieve.ts` | 55 | scope-first retrieval: `globToRegex` · `inScope` · `retrieve` (active + path-matched) | — | none — **pure** |
| `comment.ts` | 108 | render verdicts → review markdown (projection) | — (types only) | none — **pure** (post-decoupling) |
| `diff.ts` | 33 | parse unified diff → `FileDiff[]`; `loadDiff` reads a file | `node:fs` | reads a local file |
| `extract.ts` | 85 | ADR `constraints` YAML → `Constraint[]`; `extractFromDir` (dedup) · `adrSection` · dump/load | `node:fs`, `js-yaml` | reads ADR dir / writes dump |
| `checker.ts` | 145 | semantic check via LLM: `makeClient` (+`.env` loader) · `buildUserPrompt` · `checkConstraint` · save/load verdicts | `@anthropic-ai/sdk`, `node:fs`, `node:path` | **LLM API call** · reads `.env` · r/w verdicts |
| `cli.ts` | 128 | entrypoint: `parseArgs`, dispatch `extract`/`check`/`comment` | composes all | stdout / stderr |

**Dependency direction (who imports whom):** `models.ts` is the shared base everyone reads; `cli.ts` composes the rest. No module imports "outward". After ST-0021's decoupling, **`src/` contains no git/gh/platform calls** — the only outbound network call is the LLM in `checker.ts`.

**Seams / smells worth the maintainer's eye** (concrete — each tied to a candidate adjustment in §3):

**Seam 1 — the LLM provider is hardwired into `checker.ts`. (the one real "missing port")**
The provider SDK, the prompt, the model id and the schema-binding are all entangled in one module:
- `import Anthropic` (L11) + `import { zodOutputFormat }` (L12) — provider SDK bound directly.
- `DEFAULT_MODEL = "claude-sonnet-4-6"` (L23) — model id literal in the domain module.
- `SYSTEM` prompt (L25–44) — the *what to ask* (domain) sits next to the *how to call* (adapter).
- `makeClient()` → `new Anthropic()` (L70–73) and `client.messages.parse({ … output_config: zodOutputFormat(…) })` (L110–117) — the call shape is Anthropic-specific.
Why it matters: a second provider (OpenAI / Bedrock / Vertex / local) means editing the checker, and the request/response *schema* differs per provider. → **adjustment A: a `Model` port (`complete(system, user, schema) → parsed`) + an Anthropic adapter; the checker depends on the port, not the SDK.**

**Seam 2 — `checker.ts` carries ~4 concerns in 145 LOC.**
- `.env` / secret loading: `loadDotenv` (L50–68) — config/infra.
- provider client: `makeClient` (L70–73) — adapter.
- check orchestration: `buildUserPrompt` (L75–101) + `checkConstraint` (L103–136) — domain.
- verdict persistence: `saveVerdicts` / `loadVerdicts` (L138–145) — I/O.
Why it matters: the check logic can't be tested without the SDK + fs, and secret-loading shouldn't live inside the domain checker. → **adjustment C: split into config / adapter (folds into A) / check-orchestration / persistence.**

**Seam 3 — file I/O is scattered across domain modules, not pushed to the edge.**
`diff.loadDiff` (L31–33) · `extract.extractFromDir`/`adrSection` (L36, L59) · `extract.dumpConstraints`/`loadConstraints` (L75, L82) · `checker.saveVerdicts`/`loadVerdicts` (L138–145) · `checker.loadDotenv` (L50). All **local fs** — *not* an ADR-0006 platform-coupling issue — but the core isn't yet a set of pure `data → data` transforms. Note: the pure parse fns already exist (`extractFromText`, `parseUnifiedDiff`); it's the file-reading *wrappers* that could move to the CLI edge. → **adjustment B: read at the edge (CLI), pass text/objects into a pure core.**

**Seam 4 — no structural layer boundary.**
7 flat files in `src/`; core (`models`/`retrieve`/`comment`/parse fns) vs adapter (the LLM bits) vs persistence vs CLI are conceptual only, not visible in the tree. → **adjustment D: group into `src/core` + `src/adapters` (or similar). Optional / cosmetic.**

What's already healthy (don't disturb): one shared contract (`models.ts`, not forked per op), a pure `retrieve`, a now-pure `comment`, clean command separation in `cli.ts`.

## 3. Candidate adjustments (TO DISCUSS — not decided)

- **A — Extract a model port + adapter** (e.g. `llm.ts`): the core depends on a small `complete(system, user, schema) → parsed` port; an Anthropic adapter implements it. Fixes **seam 1** and answers "adapt different LLM API schemas". *(Recommended; small.)*
- **B — Push fs I/O to the edge** (CLI reads files / passes strings; core stays pure transforms). Fixes **seam 3** — bigger, likely *defer*.
- **C — Split `checker.ts`** into config / adapter (folds into A) / check-orchestration / persistence. Fixes **seam 2** — medium.
- **D — Folder layering** (`src/core`, `src/adapters`) to make the split visible. Fixes **seam 4** — optional / cosmetic.

## Acceptance criteria

- [x] All `src/` modules surveyed; current design documented (this story).
- [ ] Maintainer reviews the current design.
- [ ] Target layering + now/defer adjustments agreed with the maintainer.
- [ ] ADR-0006 finalized to match (un-parked).
- [ ] Agreed adjustments implemented; lint + typecheck + build + tests green.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` green for any code change | ⬜ |
| Maintainer sign-off | maintainer agrees the design + reviews changes | ⬜ pending |

## Notes

This story is **design-first**: steps 1–2 are documentation/review, no code moves until step 3 is agreed. The layered model under discussion: **L3 integration (workflow/gh) → L2 driving adapters (CLI, eval, future agent) → L1 pure core → analysis-engine ports (LLM now, semgrep later)** — but the point of this story is to ground that against the *actual* code above before committing to it.
