# Decision Capture — Design Document

> **Authoritative: Chinese (`2026-06-22-decision-capture-design.zh.md`) · Translation: English (this file) · Last synced: 2026-06-22 · Chinese wins on conflict**

**Related:** `ADR-0009` (capture lands as a skill-driven investigative agent, written by ourselves on the AI SDK, at the edge) · `ADR-0006` (platform-agnostic core) · `ADR-0007` (pluggable model layer) · `FR-CAP-1..9` (decision capture) · `DM-DECISION-NOTE` (decision-note data model) · `ST-0005` (capture story) · `ST-0009` (IIAC skill)

---

## 1. Goal and scope

Have Delivery Radar discover an architectural decision a PR makes **implicitly, yet records nowhere** (`FR-CAP-2`), **draft** it into a Decision Note, and drive it toward being recorded in a way that **takes effect only after a human confirms**.

**This slice does:**
- One `capture` operation: investigate the changes of a merged PR and produce 0..n draft Decision Notes.
- An investigative agent driven by the IIAC skill (SKILL.md) and **written by ourselves on the Vercel AI SDK**, running at the edge (the integration layer), on a cheap, pluggable model (e.g., DeepSeek via Vercel AI Gateway).
- Integration into `radar.yml`: triggered after a PR merges, drafting each decision worth recording into a **draft PR** (containing an ADR with status `Proposed`) or an **issue**, left for a human to merge/close as confirmation.

**This slice does not do (explicit non-goals):**
- Does not automatically **accept/merge** ADRs, does not push to the default branch, and does not block any PR's merge (`ADR-0009-C2` / `NFR-TRUST-1`).
- Does not do behavioral-layer (Story/AC) capture routing (`[Phase 2]`).
- Does not do the "after human confirmation" automation in the graduation flow (confirmation is still a human manually merging that draft PR).

---

## 2. Key decisions (see ADR-0009 for details)

1. **Paradigm: a skill-driven investigative agent, not a single LLM call.** To judge "implicit / net-new / architectural", capture must look beyond the diff (does the same pattern exist elsewhere in the repo, is there an old ADR covering it, what does the git history say) — this is what an agent's tool loop is good at and a single call cannot do.
2. **Implementation: write the agent ourselves on the Vercel AI SDK** (no framework). The AI SDK provides the tool loop, Zod-validated structured output, and provider routing; the model stays pluggable (the same provider configuration as `conformance`: DeepSeek via Vercel AI Gateway / OpenRouter / any OpenAI-compatible baseURL). See `ADR-0009` for details.
3. **Location: the agent + AI SDK + investigation tools all live at the edge** (the capture adapter / integration layer); the pure core `src/core/` touches neither the SDK nor the platform (`ADR-0009-C1`, reinforcing `ADR-0006`).
4. **The methodology is a SKILL.md** (`ST-0009`), injected as the agent's `instructions`. **How to investigate, which git commands to run, how to judge** are all written in the skill, not coded as git logic.
5. **Trigger: runs after a PR merges** (decoupled from `conformance` — the latter runs when the PR is opened).
6. **The output is a draft**: the agent drafts → the workflow opens a draft PR / issue → a human merges/closes to confirm.

---

## 3. Architecture

### 3.1 Pure-core reuse (`src/core/`, leaving its platform-agnosticism intact)

- `io/diff.ts` `parseUnifiedDiff` — parse the diff produced by the merge.
- `io/extract.ts` `extractFromDir` + `core/retrieve.ts` — obtain the **list of already-recorded constraints**, as reverse context for "these are already recorded, don't duplicate them".
- `core/models.ts` — add the **`DecisionNote` schema** (see §5).
- `core/comment.ts` (or a new `core/capture-comment.ts`) — a **pure function** that renders a decision note into markdown (draft-PR body / issue body / review body). Touches no platform.

### 3.2 capture agent (edge, new `src/capture/`, written by ourselves on the Vercel AI SDK)

- **agent loop**: use the AI SDK's multi-step tool calling directly (it carries its own loop + stop conditions); we write only a thin layer (around one or two hundred lines).
- **instructions** = the IIAC capture SKILL.md body (`ST-0009`) — the skill lives at the **repository top level `skills/capture/SKILL.md`** (outside `src/`, since it is a content asset, not compiled source); the agent reads it at runtime.
- **tools** (using the AI SDK's `tool()`, read-only only):
  - `read_file` (read working-tree files), `grep` (search the codebase) — filesystem reads, allowed by `ADR-0006-C1` (`extract.ts` reads this way today too).
  - a generic **read-only command** tool (e.g., to run `git log`/`blame`/`show`) — which ones to run and how to interpret them is directed by SKILL.md (see §3.3).
- **input**: the merge diff + the PR title/description (source of `draft_rationale`) + the list of already-recorded constraints (basis for deduplication).
- **output**: the AI SDK's structured output (`Output.object` + Zod schema), yielding `DecisionNote[]` (see §5).
- **model**: mapped from `process.env` (`RADAR_PROVIDER` etc.) into an AI SDK model (e.g., DeepSeek via Vercel AI Gateway + `AI_GATEWAY_API_KEY`). Configuration comes from the environment only (`ADR-0006-C2`).
- **reliability fallback**: DeepSeek's reliability under "tool loop + structured output" is uncertain → put the schema into the prompt and/or add a separate structuring step; on validation failure, handle leniently (log / return empty, never crash). capture is advisory.
- **security**: tools are read-only; configuration comes from `process.env` only (`ADR-0006-C2`).

### 3.3 Platform boundary (`ADR-0006`) and where git lives

- All **platform-writing** actions (opening a draft PR, opening an issue) are done by the **workflow** (`gh`); the core/adapters only produce content.
- **git capability belongs to the skill**: which (read-only) git commands to run and how to interpret them are all written in SKILL.md; our code only provides a **generic read-only command tool** (git-agnostic). The git logic is in the skill, the executor is in the capture edge adapter (`src/capture/`).
- **`src/core/` never touches git/platform.** `ADR-0006-C1` is read as "governing the pure core `src/core/`"; the edge adapters (io / llm / cli / capture agent) each do their own I/O — this is a refinement of the scope of `ADR-0006-C1` (**confirmed**: the scope of `ADR-0006-C1` has been formally changed from `src/**` to `src/core/**`).
- git is always **read-only**.

---

## 4. Data flow (end-to-end)

```
PR merged → radar.yml(on: pull_request closed & merged)
  → checkout the post-merge main(fetch-depth: 0, for grep / read-only git verification) + gh pr diff <PR#> > merge.diff(still retrievable after merge)
  → radar capture --diff merge.diff --adr-dir docs/adr [--save notes.json]
       capture agent(AI SDK, edge):
         instructions = IIAC SKILL.md
         input = merge.diff + list of already-recorded constraints
         investigation = read_file / grep / read-only git(directed by the skill)
         output = DecisionNote[](Zod-validated; 0 is also valid)
  → notes.json
  → for each note:
       enough to draft an ADR → the workflow opens a【draft PR】(adds docs/adr/ADR-NNN.md, Status: Proposed)
       not enough → the workflow opens an【issue】("record a decision for X")
  → a human【merges or closes】to confirm(merging the PR = accept → Proposed→Accepted → re-extract constraints, FR-LOOP-1)
```

Key point: capture and conformance **no longer share a single scan** (`FR-CAP-1`/`FR-ARCH-1` are updated accordingly); capture runs only once per PR, after merge, keeping cost controllable (`NFR-COST-1`/`NFR-PERF-1`).

---

## 5. Data model — agent output (aligned with `DM-DECISION-NOTE`)

Each note the agent produces (`id`/`pr`/`status`/`graduated_to` are filled in by the integration layer):

```ts
DecisionNote = {
  detected_decision: string;                 // one sentence: what decision this PR appears to have made
  evidence: { file: string; lines: [number, number] }[];  // evidence hunk
  suggested_class: "architectural" | "behavioral";        // suggested classification
  draft_rationale: string;                    // a draft rationale distilled from the PR description / linked story
  confidence: number;                         // 0..1
  why_net_new: string;                        // why it is believed to be covered by no existing constraint/ADR (basis for deduplication)
};
CaptureOutput = { notes: DecisionNote[] };    // an empty array is valid —— do not fabricate decisions
```

The integration layer fills in → landing into `DM-DECISION-NOTE`: `id` (e.g., `DN-2026-NNNN`), `pr`, `status: draft`, `graduated_to: null`.

---

## 6. CLI — `radar capture`

```
radar capture --diff <file> --adr-dir <dir> [--save <f>] [--replay <f>] [--verbose]
```
- Runs at the repository root; the agent's read-only tools act on the current working tree.
- `--save` writes `notes.json` to disk; `--replay` reads `notes.json` directly and skips the agent (demo determinism, consistent with `conformance`).
- Output: prints the notes to stdout (for humans) + can save JSON (machine-readable). Performs **no** platform action (`ADR-0006`).

---

## 7. Integration — `radar.yml`

- **Trigger**: the `closed` event of `pull_request` with `merged == true` (after merge); retain `workflow_dispatch` and the `/radar capture` comment command for manual reruns.
- **Steps**: checkout the post-merge main (`fetch-depth: 0`, for grep / read-only git) → `gh pr diff <PR#>` to obtain this PR's diff (still retrievable after merge) → run `radar capture --adr-dir docs/adr --save notes.json` (constraints are read directly from the ADRs on the checked-out main, no separate baseline needed) → render each note → the **workflow** uses `gh` to open a draft PR or issue.
- **Always advisory**: sets no failing/required status, does not block merging (`ADR-0009-C2`/`FR-CONF-9`).
- The draft PR is decoupled from the triggering PR (`FR-CAP-9`): the triggering PR is already merged; the ADR draft follows up asynchronously.

---

## 8. IIAC capture SKILL.md (`ST-0009`, this design gives the outline; it lives in its own document)

**Location**: `skills/capture/SKILL.md` (repository top level, outside `src/` — it is a content asset, not compiled source; when published as an npm package (`ADR-0008`) it is added to `files` and shipped together, and the agent reads it at runtime). Follows the SKILL.md format of agentskills.io (portable); `.claude/` is Claude Code's local configuration and is not placed there.

The skill body (as the agent's instructions) covers at least:
- **Criteria**: what counts as a decision worth capturing — it MUST simultaneously be **implicit** (the PR did not state it), **net-new** (no existing constraint/ADR covers it), and **architectural** (affecting structure/integration/data, not a local implementation).
- **Investigation steps (start from the diff, expand outward as needed, don't blindly scan the whole repo — the spirit of `NFR-RETRIEVAL-1`)**: read the diff (where the decision happens) → read the PR title/description for the rationale → for a suspected decision, use grep to see whether the same pattern exists elsewhere in the repo, read the related code, check the git history of the touched files → cross-check against already-recorded constraints/ADRs to deduplicate.
- **Honesty guardrails**: **outputting 0 notes is valid and common**; if evidence is insufficient, or it is already covered by an existing ADR, **do not** produce a note (corresponding to the honesty constraint in vision §9 and the 3rd question of `FR-CAP-4`).
- **Output contract**: strictly follow the `DecisionNote` structure in §5; every note MUST carry `evidence` and `why_net_new`.
- **Positive and negative examples**: give several examples of "good captures" and "should-not-capture" for few-shot anchoring.

---

## 9. Cost / performance / security

- **Cost/performance** (`NFR-COST-1`/`NFR-PERF-1`): runs only once after each PR merges; cheap pluggable provider; advisory, non-blocking.
- **Security** (`NFR-SEC-1`): the agent's tools are **read-only**; only opens draft PRs/issues (the write action = a human merging); least-privilege token; does not change access control / branch protection.
- **Trust** (`NFR-TRUST-1`/`ADR-0009-C2`): the machine drafts, the human confirms = merge/close.

---

## 10. Testing (following the `ST-0024` discipline: integration tests never call a real LLM)

- **Pure core**: `DecisionNote` schema validation, note rendering — fixture unit tests.
- **agent**: inject a **fake model** (the AI SDK's `MockLanguageModelV3`) that produces predictable notes; assert the tools are called correctly and the structured output is parsed correctly.
- **Integration**: use `--replay notes.json` to run through "notes → render → open PR/issue (mocked at the workflow layer)", with no network access.
- **demo determinism**: `--save`/`--replay` record the notes of one real run for the demo.

---

## 11. Risks and items to verify (recheck at implementation time)

1. **DeepSeek's reliability under "tool loop + structured output"** is uncertain → fallbacks: put the schema into the prompt / add a separate structuring step / handle leniently on validation failure (don't crash).
2. **Configuration hygiene (`ADR-0006-C2`)**: the agent's model/keys come from `process.env` only (the AI SDK reads environment variables like `AI_GATEWAY_API_KEY`); `src/` does not read `.env`. Watch the dependency footprint of the chosen provider package.
3. **The OpenRouter variable name / the exact DeepSeek model id on Vercel** to be confirmed on the official live pages at implementation time.
4. **git location / `ADR-0006-C1` scope**: the git logic is in the skill, the executor is in the `src/capture/` edge; the scope of `ADR-0006-C1` has been refined to `src/core/` (confirmed).

---

## 12. References & provenance

- **Vercel AI SDK capabilities** (multi-step tool-call loop, `Output.object`'s Zod structured output, provider routing including DeepSeek via Vercel AI Gateway / OpenRouter / OpenAI-compatible baseURL, the `MockLanguageModelV3` fake model) — verified against `ai-sdk.dev` and the official repository on **2026-06-22**.
- **Open-source agent selection research** (turnkey options like opencode/Goose/Codex CLI/OpenHands, and frameworks like Vercel AI SDK/Mastra/LangGraph/Pydantic AI; provider lock-in is not an issue, SKILL.md is an open standard) — verified online on **2026-06-22**.
- **Conclusion**: an agent is essentially a small loop, and the AI SDK already provides it (loop + structured output + provider routing); frameworks like Mastra sit on top of the AI SDK and add things this slice does not use (workflow/sub-agents/memory/eval), so we **write it ourselves on the AI SDK** (see `ADR-0009`).
- **Items to verify** are in §11. Agent/LLM tooling evolves fast; recheck at implementation time.

---

*Design document (pending maintainer review).*
