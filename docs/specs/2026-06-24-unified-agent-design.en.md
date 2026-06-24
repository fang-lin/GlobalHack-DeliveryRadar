# Unified Investigation Agent — Design Doc (upgrading conformance into an agent)

> **Authoritative: Chinese (`2026-06-24-unified-agent-design.zh.md`) · Translation: English (this file) · Last synced: 2026-06-24 · Chinese wins on conflict**

**Related:** `ADR-0010` (operations as skills, running on one investigation agent; replaces the port) · `ADR-0009` (capture, the first instance of this pattern) · `ADR-0007` (ModelClient port, superseded here) · `ADR-0006` (platform-agnostic core) · `FR-CONF-1..10` · `FR-CAP-1..9` · `NFR-RETRIEVAL-1` · `NFR-EVAL-1`/`AC-2` · `ST-0009` (methodology as a skill) · `ST-0010` (radar as an investigation agent)

---

## 1. Goals & Scope

Unify radar's three operations onto **one general-purpose investigation agent engine**: the operations differ only by **one SKILL.md + one output schema**. This design lands two things: ① upgrade **conformance (alignment checking) from a single call into an agent** (able to investigate when the diff evidence is insufficient, instead of returning `unknown` outright); ② refactor the existing **capture onto this shared engine**. drift is left as a future instance of the same pattern.

**Do:**
- Extract the general-purpose agent engine (AI SDK tool loop + read-only tools + structured output, taking `{skill, outputSchema, tools}`).
- conformance: **scope-first retrieval stays deterministic** (NFR-RETRIEVAL-1); each matched constraint is **judged one at a time**, running on the agent + conformance skill + `Verdict` schema.
- Refactor capture onto the shared engine (behavior unchanged).
- Replace the ModelClient port: delete the two old adapters + the `openai`/`@anthropic-ai/sdk` dependencies; switch eval over to the engine.
- Rename the CLI `check` → `conformance`.
- Eval-harness gate: compare the agent version vs the single-call version on precision/recall, and only replace if there is no regression.

**Don't (explicit non-goals):**
- Don't hand retrieval to the LLM (NFR-RETRIEVAL-1, retrieval is always deterministic code).
- Don't touch capture's external behavior (only swap the underlying engine).
- Don't do drift in this slice (a future same-pattern instance).

---

## 2. Key Decisions (see ADR-0010 for details)

1. **One general-purpose investigation agent engine**, parameterized by `{skill, outputSchema, tools}`, returning a zod-validated object.
2. **Operation = skill + output schema + deterministic shell**: conformance / capture / (future) drift.
3. conformance **upgraded into an agent**: able to investigate (read code/grep/git), reducing `unknown`; but `unknown` is still a legal result (FR-CONF-6).
4. **Replace the ModelClient port** (ADR-0007); keep its original intent of "pluggable, cheap, provider chosen at the edge" (the engine still selects from `RADAR_PROVIDER`).
5. **Change ADR-0003-C1 to be provider-agnostic** (drop the literal binding to `messages.parse`).
6. **Hard quality gate**: eval-harness comparison; ship only if there is no regression (unrelated to cost — it's "don't blindly swap in a worse checker").

---

## 3. Architecture

### 3.1 General-purpose agent engine (new `src/agent/`, edge)

```
runAgent({ skill, tools, outputSchema, system?, user, root }) → Promise<T(zod-validated)>
```
- Internals: the AI SDK's `generateText({ tools, output: Output.object(schema), stopWhen })` tool loop + failure fallbacks (put the schema into the prompt / a separate structured step / return a fallback on validation failure, never crash).
- Tools: `read_file` / `grep` / read-only `git` (extracted into the engine from the existing `src/capture/tools.ts`).
- provider: selected from `process.env` (`RADAR_PROVIDER` etc.), reusing the existing `selectModel` in `src/capture/model.ts` (config comes only from the environment, ADR-0006-C2).
- **This is the only model-call path** (ADR-0010-C1).

### 3.2 conformance shell (`src/cli/commands/conformance.ts` + core)

```
Deterministic retrieval (retrieve, NFR-RETRIEVAL-1) picks out matched constraints
  → for each matched constraint: runAgent({ skill: conformance, schema: Verdict,
        user: constraint (rule+driver+examples) + matched-file diff, root: repo root })
  → Verdict[]
  → render (comment, pure function)
```
- **Retrieval stays deterministic code** (`core/retrieve.ts` unchanged, ADR-0010-C2): the agent only "judges", it does not "pick".
- **One constraint at a time** (already decided): evidence is focused, and the verdict can point precisely to the ADR clause + the code line.
- The conformance skill (`skills/conformance/SKILL.md`) guides: judge the diff against this one constraint, and when evidence is insufficient **investigate with the tools** (read the enclosing code, grep for usages elsewhere, query git), then give `aligned`/`violated`/`unknown` + evidence + confidence + fix_locality; judge **both the letter and the rationale** (driver), carrying over the spirit of the existing `checker.ts` system prompt.

### 3.3 capture shell (refactor)

`src/capture/agent.ts` is changed to call `runAgent({ skill: capture, schema: CaptureOutput, ... })`. External behavior, output, CLI, and workflow **all stay unchanged** — only the underlying engine is swapped for the shared one. `src/capture/tools.ts`, `model.ts` are moved/shared into `src/agent/`.

### 3.4 Things being retired

- `src/llm/port.ts` (ModelClient), `anthropic-adapter.ts`, `openai-compat-adapter.ts`, `factory.ts` → delete.
- Dependencies `openai`, `@anthropic-ai/sdk` → remove.
- `eval.ts` switches from `makeModelClient`/`complete()` to `runAgent` (single-call tier: no tools or minimal tools, running the conformance skill).
- `ADR-0007-C1` is marked `superseded_by: ADR-0010`; `ADR-0003-C1` is reworded to be provider-agnostic.

---

## 4. Data Flow (conformance, one PR)

```
radar.yml (unchanged: checkout PR + fetch main ADR baseline + gh pr diff)
  → radar conformance --adr-dir .radar-baseline/docs/adr --diff pr.diff --save verdicts.json
       extract constraints → retrieve matches (deterministic)
       for each matched constraint:
         runAgent(conformance skill, Verdict schema, constraint+diff, root=PR code)
           ├─ main path: Output.object → Verdict
           └─ insufficient evidence: the agent investigates with read/grep/git before judging (instead of returning unknown outright)
       → verdicts.json
  → radar comment renders → the workflow posts a sticky review (FR-INT-7, unchanged)
```

---

## 5. Data Model

- **Verdict** (reuses the existing `DM-VERDICT`/`models.ts`, unchanged): `constraint_id` / `result` (aligned|violated|unknown) / `confidence` / `evidence` (adr_clause ↔ code) / `explanation` / `fix_locality` / `fix_direction`.
- **DecisionNote** (capture, unchanged).
- The agent engine treats both alike: just pass a different schema.

---

## 6. CLI

- `radar conformance --diff <f> --adr-dir <d> [--save --replay --verbose]` (the former `check`, renamed; arguments unchanged).
- `radar capture` (unchanged), `radar extract` (unchanged), `radar comment` (unchanged).
- `radar.yml` line 120 `check` → `conformance`; README and tests updated in sync.

---

## 7. Testing (carrying over the ST-0024 discipline: integration tests never call the real LLM)

- **Engine**: use the AI SDK's `MockLanguageModelV3` fake model (carrying over capture's test approach); assert that tools are called, structured output is parsed, and fallbacks don't crash.
- **conformance shell**: retrieve (deterministic) unit tests unchanged; the agent path is tested with the fake model; `--replay` integration tests don't touch the network.
- **capture**: regression tests after the refactor, behavior unchanged.
- **Quality gate (non-automated, maintainer-triggered)**: `pnpm eval` replay comparing the agent version vs the single-call version on precision/recall.

---

## 8. Risks & To Verify

1. **Quality regression**: conformance is an already-calibrated core; swapping to an agent MUST pass the eval-harness comparison before replacing (`NFR-EVAL-1`/`AC-2`). **Hard gate.**
2. **Cost/latency**: per-PR conformance is now one tool loop per constraint, more expensive/slower than a single call — accepted under "DeepSeek is cheap, use it freely"; still advisory, non-blocking.
3. **Non-determinism**: `--replay` preserves demo determinism.
4. **Dogfood chain reaction**: if `ADR-0007-C1`/`ADR-0003-C1` aren't changed in sync, radar's self-review will (correctly) report a conflict — this design already includes those two changes.
5. **Eval single-call baseline**: `eval.ts` currently tests the single-call path; first save a baseline result of the current single-call version, then compare after the rework.

---

## 9. Implementation Order (for writing the follow-up plan)

1. Extract `src/agent/` (engine + tools + model selection); cut capture over to the engine first (regression tests preserve behavior).
2. Change the conformance shell to use the engine + conformance skill; rename the CLI; sync radar.yml.
3. Retire the port/adapters/old dependencies; switch eval over to the engine.
4. Change `ADR-0007-C1` (superseded) + `ADR-0003-C1` (provider-agnostic).
5. Eval-harness gate (maintainer-triggered) → merge only if it passes.

---

## 10. References & provenance

- **AI SDK capabilities** (the `generateText`/`stopWhen` tool loop, `Output.object` zod validation, provider routing including DeepSeek via a gateway, `MockLanguageModelV3`) — verified against `ai-sdk.dev` on 2026-06-22 (recorded in the capture design doc).
- **Decision basis**: see `ADR-0010` (this pattern), `ADR-0009` (the first capture instance).
- **Verification not done**: the precision/recall of the agent-version conformance has **not yet been tested** — it's a gate for implementation, not a conclusion here.

---

*Design doc (pending maintainer review).*
