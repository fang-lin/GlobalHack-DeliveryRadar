# Unified Investigation Agent — Implementation Plan

> **Authoritative: Chinese (`2026-06-24-unified-agent-plan.zh.md`) · Translation: English (this file) · Last synced: 2026-06-24**
>
> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development to implement task by task. Tick off steps with `- [ ]`.

**Goal:** Unify radar's three operations under one generic investigation-agent engine; upgrade conformance from a single `ModelClient` call to an agent; refactor capture onto the same engine; retire the ModelClient port and legacy adapters; rename CLI `check`→`conformance`. Per `ADR-0010` / design `docs/specs/2026-06-24-unified-agent-design.zh.md`.

**Architecture:** Add `src/agent/` (generic engine `runAgent<T>` + tools + model selection + tolerant parsing, generalized from `src/capture/`). Each operation = one SKILL.md + one output schema + one deterministic shell. The conformance shell retains scope-priority retrieval (deterministic) + keeps checker's pure logic (prompt construction, verdict mapping) as pure functions; only the model call is replaced by `runAgent`.

**Tech Stack:** TypeScript / Node 22 / ESM / `zod/v4` / vitest / Vercel AI SDK (`ai@6.0.208`, `@ai-sdk/anthropic`, `@ai-sdk/openai-compatible`, `@ai-sdk/gateway`).

## Global Constraints
- `src/core/` must not touch SDK/platform (ADR-0006-C1 now `src/core/`, ADR-0009-C1). Engine/tools/model selection live only in `src/agent/`.
- Every LLM operation goes through the **shared engine** — no bespoke provider calls, no dependency on the retired ModelClient port (ADR-0010-C1).
- **Scope-priority retrieval is deterministic code**, not delegated to the agent (ADR-0010-C2 / NFR-RETRIEVAL-1): `core/retrieve.ts` is unchanged; the agent only judges the already-retrieved in-scope constraints.
- Configuration comes only from `process.env` (ADR-0006-C2). ESM-only; relative imports carry the `.ts` suffix.
- Tests **must never call a real LLM**: use `ai/test`'s `MockLanguageModelV3` (returning the structure `finishReason:{unified,raw}`, `usage:{inputTokens:{total},outputTokens:{total}}`), or `--replay`.
- Commits: Conventional Commits, **no AI signature**, cite `ADR-0010` and the relevant `ST`.
- `unknown` remains a valid verdict (FR-CONF-6). Empty results are valid.
- The engine's dual-path (`Output.object` primary + text-parse fallback) is required (known ai@6 `output`+`tools` bug); reuse the existing pattern from `src/capture/agent.ts` directly.

**Quality gate (written into the plan, triggered by the maintainer, not automated):** Before switching, run `pnpm eval` replay to compare agent-version vs single-call-version conformance precision/recall; merge only if there is no regression (NFR-EVAL-1/AC-2).

---

### Task 1: Extract tools / model / parse into `src/agent/` (generalize)

**Files:**
- Move: `src/capture/tools.ts` → `src/agent/tools.ts` (`buildTools` unchanged)
- Move: `src/capture/model.ts` → `src/agent/model.ts` (`selectCaptureModel` renamed to `selectModel`)
- Move: `src/capture/parse.ts` → `src/agent/parse.ts` (`parseCaptureNotes` generalized to `parseAgentJson<T>(text, schema): T | null`)
- Update: `src/capture/agent.ts` (update import paths + use generalized names)
- Move tests: `tests/unit/capture-tools.test.ts`→`tests/unit/agent-tools.test.ts`; `capture-model.test.ts`→`agent-model.test.ts`; `capture-parse.test.ts`→`agent-parse.test.ts` (update import paths + names)

**Interfaces:**
- Produces: `buildTools(root): Record<string,Tool>`; `selectModel(env): LanguageModel`; `parseAgentJson<T>(text: string, schema: z.ZodType<T>): T | null` (returns `null` on failure, never throws).

- [ ] **Step 1: Move files + rename**
```bash
mkdir -p src/agent
git mv src/capture/tools.ts src/agent/tools.ts
git mv src/capture/model.ts src/agent/model.ts
git mv src/capture/parse.ts src/agent/parse.ts
git mv tests/unit/capture-tools.test.ts tests/unit/agent-tools.test.ts
git mv tests/unit/capture-model.test.ts tests/unit/agent-model.test.ts
git mv tests/unit/capture-parse.test.ts tests/unit/agent-parse.test.ts
```

- [ ] **Step 2: Rename export in `src/agent/model.ts`** — change `export function selectCaptureModel` to `export function selectModel` (function body unchanged).

- [ ] **Step 3: Generalize `src/agent/parse.ts`** — replace with:
```ts
/** Tolerant text -> validated T: extract a JSON object, zod-validate, never throw. */
import * as z from "zod/v4";

export function parseAgentJson<T>(text: string, schema: z.ZodType<T>): T | null {
  const candidate = extractJsonObject(text);
  if (!candidate) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(candidate);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** First ```json fence, else the first balanced {...} block. */
function extractJsonObject(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
```

- [ ] **Step 4: Update imports in `src/capture/agent.ts`** — change to `import { buildTools } from "../agent/tools.ts";` and `import { parseAgentJson } from "../agent/parse.ts";`; replace `parseCaptureNotes(text)` call with `parseAgentJson(text, CaptureOutputSchema)?.notes ?? []` (`CaptureOutputSchema` is already imported from `../core/models.ts`).

- [ ] **Step 5: Update imports in the moved tests** — `agent-tools.test.ts`/`agent-model.test.ts`: change `from "../../src/agent/..."`;  `agent-model.test.ts`: rename `selectCaptureModel` → `selectModel`; `agent-parse.test.ts`: update import to `parseAgentJson`, update assertions to `parseAgentJson(input, CaptureOutputSchema)` (add `import { CaptureOutputSchema } from "../../src/core/models.ts";` at the top).

- [ ] **Step 6: Run the full suite** — `pnpm lint && pnpm build && pnpm test`, all green (behaviour unchanged — pure relocation).

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "refactor(agent): lift tools/model/parse into src/agent, generalize parse (ADR-0010)"
```

---

### Task 2: Generic engine `runAgent` + switch capture onto the engine

**Files:**
- Create: `src/agent/engine.ts`
- Modify: `src/capture/agent.ts` (`runCapture` rewritten to call `runAgent`)
- Test: `tests/unit/agent-engine.test.ts`

**Interfaces:**
- Consumes: `buildTools` (T1), `parseAgentJson` (T1).
- Produces: `runAgent<T>(opts: { model: LanguageModel; skill: string; user: string; tools: Record<string,Tool>; outputSchema: z.ZodType<T>; }): Promise<T | null>` — dual-path, returns `null` on failure, never throws.

- [ ] **Step 1: Write failing tests** — `tests/unit/agent-engine.test.ts` (fake model; raw JSON takes primary path, fenced JSON takes fallback, garbage returns null)
```ts
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { MockLanguageModelV3 } from "ai/test";
import { runAgent } from "../../src/agent/engine.ts";

const Schema = z.object({ ok: z.boolean() });
function model(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
      warnings: [],
    }),
  });
}
describe("runAgent", () => {
  it("returns the validated object from raw JSON (primary path)", async () => {
    const out = await runAgent({ model: model(JSON.stringify({ ok: true })) as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toEqual({ ok: true });
  });
  it("falls back to text-parse for fenced JSON", async () => {
    const out = await runAgent({ model: model("```json\n" + JSON.stringify({ ok: true }) + "\n```") as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toEqual({ ok: true });
  });
  it("returns null (never throws) on unusable output", async () => {
    const out = await runAgent({ model: model("no json") as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm failure** — `pnpm vitest run tests/unit/agent-engine.test.ts` → FAIL.

- [ ] **Step 3: Implement `src/agent/engine.ts`** (generalize the existing `runCapture` dual-path)
```ts
/**
 * The one investigative-agent engine (edge — ADR-0010). A tool loop on the
 * Vercel AI SDK, parameterized by { skill, user, tools, outputSchema }.
 * Dual-path: Output.object primary → text-parse fallback (ai@6 output+tools
 * bugs #11348/#10023). Total: returns null on any failure, never throws —
 * each operation decides what null means (e.g. capture → [], conformance → unknown).
 */
import { generateText, Output, stepCountIs, type LanguageModel, type Tool } from "ai";
import type * as z from "zod/v4";
import { parseAgentJson } from "./parse.ts";

export async function runAgent<T>(opts: {
  model: LanguageModel;
  skill: string;
  user: string;
  tools: Record<string, Tool>;
  outputSchema: z.ZodType<T>;
}): Promise<T | null> {
  const shared = {
    model: opts.model,
    system: opts.skill,
    prompt: opts.user,
    tools: opts.tools,
    stopWhen: stepCountIs(24), // tool rounds + the structured-output step
  } as const;
  try {
    const r = await generateText({ ...shared, output: Output.object({ schema: opts.outputSchema }) });
    const out = (r as { output?: T }).output;
    if (out != null) return out;
  } catch {
    // Primary path failed — fall through to text-parse.
  }
  try {
    const r = await generateText(shared);
    return parseAgentJson(r.text ?? "", opts.outputSchema);
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to confirm passing** — `pnpm vitest run tests/unit/agent-engine.test.ts` → PASS.

- [ ] **Step 5: Switch capture onto the engine** — rewrite `runCapture` in `src/capture/agent.ts`: remove the internal dual-path, replace with
```ts
import { runAgent } from "../agent/engine.ts";
import { buildTools } from "../agent/tools.ts";
import { CaptureOutputSchema, type Constraint, type DecisionNote } from "../core/models.ts";
// buildCaptureUserPrompt stays unchanged
export async function runCapture(opts: {
  model: LanguageModel; skill: string; diff: string; constraints: Constraint[]; root: string;
}): Promise<DecisionNote[]> {
  const out = await runAgent({
    model: opts.model,
    skill: opts.skill,
    user: buildCaptureUserPrompt(opts.diff, opts.constraints),
    tools: buildTools(opts.root),
    outputSchema: CaptureOutputSchema,
  });
  return out?.notes ?? [];
}
```
(Keep `import type { LanguageModel } from "ai";` at the top; remove direct imports of `generateText/Output/stepCountIs/parse`.)

- [ ] **Step 6: Run capture regression + full suite** — `pnpm vitest run tests/unit/capture-agent.test.ts && pnpm lint && pnpm build && pnpm test`, all green (capture behaviour unchanged).

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat(agent): generic runAgent engine; capture runs on it (ADR-0010)"
```

---

### Task 3: Conformance SKILL.md

**Files:**
- Create: `skills/conformance/SKILL.md`
- Test: `tests/unit/skill-conformance.test.ts`

- [ ] **Step 1: Write failing test**
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
describe("conformance SKILL.md", () => {
  it("exists with name + description frontmatter and methodology", () => {
    const t = readFileSync("skills/conformance/SKILL.md", "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(/name:\s*conformance/);
    expect(t).toMatch(/description:/);
    expect(t).toMatch(/driver/i);   // judges letter AND reason
    expect(t).toMatch(/unknown/i);  // unknown is valid
  });
});
```

- [ ] **Step 2: Run test to confirm failure** → FAIL (file does not exist).

- [ ] **Step 3: Write `skills/conformance/SKILL.md`** (agentskills.io format; body drawn from the existing `checker.ts` SYSTEM + investigation guidance)
```markdown
---
name: conformance
description: Judge whether a PR diff conforms to ONE architectural constraint extracted from an ADR — against both the letter of the rule and the business reason (driver) behind it. Investigate beyond the diff when the evidence is insufficient, rather than guessing.
license: same as repository
---

# Conformance check

You are Delivery Radar's conformance checker. You evaluate whether a pull-request
diff conforms to ONE architectural constraint extracted from an Architecture
Decision Record (ADR).

Judge the diff against both the LETTER of the rule and the REASON behind it (the
business driver). A change can honor the letter while defeating the reason — that
is a violation.

## Rules of judgement
- Only judge what the evidence shows. Do not invent code that is not present.
- The diff is your primary evidence. When the diff alone is insufficient to decide,
  INVESTIGATE before answering: read the enclosing file, grep for how the pattern is
  used elsewhere, inspect git history of the touched files. Use your tools rather than
  guessing.
- If, after investigating, the evidence is still insufficient, emit result "unknown"
  with low confidence. `unknown` is a valid, first-class result — never guess.
- "aligned" means the changed code is compatible with the constraint.
- Evidence lines refer to the post-change file (the "+" side of the diff).
- fix_locality: "local" if a small in-place edit fixes it, "structural" if the fix
  requires changing the approach, "none" if no fix is needed.
- fix_direction: one or two sentences pointing at the direction of the required change
  (cite the ADR's intent), or null when result is "aligned".
- Keep explanation to one or two sentences.

## Output contract
Return a JSON object: { "result": "aligned"|"violated"|"unknown", "confidence": 0..1,
"explanation": string, "evidence_file": string|null, "evidence_line_start": number|null,
"evidence_line_end": number|null, "fix_locality": "local"|"structural"|"none",
"fix_direction": string|null }.
```

- [ ] **Step 4: Run test to confirm passing** → PASS.
- [ ] **Step 5: Commit**
```bash
git add skills/conformance/SKILL.md tests/unit/skill-conformance.test.ts
git commit -m "feat(skills): conformance methodology skill (ADR-0010, ST-0010)"
```

---

### Task 4: Conformance command (shell) + CLI rename + retain verdict pure logic

**Files:**
- Modify: `src/core/checker.ts` — retain pure function `buildUserPrompt` (unchanged) + add pure mapping `toVerdict`; delete the port-calling `checkConstraint` (and `import type { ModelClient }`, `SYSTEM` constant — SYSTEM has moved into SKILL.md)
- Create: `src/cli/commands/conformance.ts` (replaces `check.ts`)
- Delete: `src/cli/commands/check.ts`
- Modify: `src/cli/main.ts` (`check`→`conformance`)
- Test: `tests/unit/checker.test.ts` (update: test `buildUserPrompt` + `toVerdict`, remove `checkConstraint`); `tests/integration/conformance-pipeline.test.ts` (new, runs `--replay`)

**Interfaces:**
- Consumes: `runAgent` (T2), `selectModel` (T1), `buildTools` (T1), `retrieve`/`extractFromDir`/`adrSection`/`loadDiff` (existing), `SemanticCheckOutputSchema`/`Verdict` (existing models).
- Produces: `buildUserPrompt(constraint, diffs, driverContext)` (pure, unchanged); `toVerdict(constraint, out: SemanticCheckOutput): Verdict` (pure); `cmdConformance(argv): Promise<number>`.

- [ ] **Step 1: Add pure mapping `toVerdict` to `src/core/checker.ts` + delete port logic** — delete `SYSTEM`, `checkConstraint`, `import type { ModelClient }`, `import type { FileDiff }` (if only used by `checkConstraint`); retain `buildUserPrompt`; add:
```ts
import { type Constraint, type Verdict, type SemanticCheckOutput } from "./models.ts";
/** Pure: map the model's structured output to a DM-VERDICT for one constraint. */
export function toVerdict(constraint: Constraint, out: SemanticCheckOutput): Verdict {
  let code = null;
  if (out.evidence_file && out.evidence_line_start != null) {
    const end = out.evidence_line_end ?? out.evidence_line_start;
    code = { file: out.evidence_file, lines: [out.evidence_line_start, end] };
  }
  return {
    constraint_id: constraint.id,
    result: out.result,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    evidence: { adr_clause: constraint.id, code },
    explanation: out.explanation,
    fix_locality: out.fix_locality,
    fix_direction: out.fix_direction,
  };
}
```
(`buildUserPrompt` stays; it no longer needs SYSTEM internally.)

- [ ] **Step 2: Update `tests/unit/checker.test.ts`** — remove tests for `checkConstraint`; retain/add unit tests for `buildUserPrompt` (prompt contains rule/driver/examples) and the new `toVerdict` (mapping + confidence clamping + evidence). Example:
```ts
import { buildUserPrompt, toVerdict } from "../../src/core/checker.ts";
import { makeConstraint as constraint } from "../fixtures/factories.ts";
it("toVerdict maps output and clamps confidence", () => {
  const v = toVerdict(constraint(), {
    result: "violated", confidence: 1.4, explanation: "x",
    evidence_file: "a.ts", evidence_line_start: 3, evidence_line_end: 5,
    fix_locality: "local", fix_direction: "do y",
  });
  expect(v.confidence).toBe(1);
  expect(v.evidence.code).toEqual({ file: "a.ts", lines: [3, 5] });
});
```

- [ ] **Step 3: Write `src/cli/commands/conformance.ts`** (rewrite from `check.ts`; retrieval is deterministic, per-constraint agent call)
```ts
/** `radar conformance` — judge a diff against in-scope ADR constraints via the agent. */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { extractFromDir, adrSection } from "../../io/extract.ts";
import { loadDiff } from "../../io/diff.ts";
import { retrieve } from "../../core/retrieve.ts";
import { buildUserPrompt, toVerdict } from "../../core/checker.ts";
import { SemanticCheckOutputSchema, type Verdict } from "../../core/models.ts";
import { saveVerdicts, loadVerdicts } from "../../io/verdicts.ts";
import { runAgent } from "../../agent/engine.ts";
import { buildTools } from "../../agent/tools.ts";
import { selectModel } from "../../agent/model.ts";
import { fail } from "../util.ts";

export async function cmdConformance(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      skill: { type: "string", default: "skills/conformance/SKILL.md" },
      root: { type: "string", default: process.cwd() },
      save: { type: "string" },
      replay: { type: "string" },
      verbose: { type: "boolean", short: "v", default: false },
    },
  });
  if (!values.diff) fail("conformance requires --diff");
  if (values.verbose) process.env.RADAR_DEBUG = "1";
  const adrDir = values["adr-dir"]!;
  const constraints = extractFromDir(adrDir);
  const fileDiffs = loadDiff(values.diff!);
  const inScope = retrieve(constraints, fileDiffs);
  console.error(
    `changed files: ${fileDiffs.length}; in-scope constraints: ` +
      `[${inScope.map(([c]) => `'${c.id}'`).join(", ")}]`,
  );

  let verdicts: Verdict[];
  if (values.replay) {
    verdicts = loadVerdicts(values.replay);
  } else {
    const model = selectModel(process.env);
    const skill = readFileSync(values.skill!, "utf8");
    const tools = buildTools(values.root!);
    verdicts = [];
    for (const [constraint, diffs] of inScope) {
      const context = adrSection(adrDir, constraint.adr, "Context");
      const out = await runAgent({
        model, skill, tools,
        user: buildUserPrompt(constraint, diffs, context),
        outputSchema: SemanticCheckOutputSchema,
      });
      // agent failed to produce a verdict → unknown (FR-CONF-6), never crash
      verdicts.push(
        out
          ? toVerdict(constraint, out)
          : { constraint_id: constraint.id, result: "unknown", confidence: 0,
              evidence: { adr_clause: constraint.id, code: null },
              explanation: "the checker could not produce a verdict", fix_locality: "none", fix_direction: null },
      );
    }
    if (values.save) saveVerdicts(verdicts, values.save);
  }
  for (const v of verdicts) {
    console.log(`${v.constraint_id}: ${v.result} (confidence ${v.confidence.toFixed(2)})`);
    console.log(`  ${v.explanation}`);
  }
  return 0;
}
```

- [ ] **Step 4: Wire into `src/cli/main.ts`** — `import { cmdConformance } from "./commands/conformance.ts";`, replace `case "check": return cmdCheck(rest);` with `case "conformance": return cmdConformance(rest);`, remove the `cmdCheck` import, update the default error string `check`→`conformance`. Delete `src/cli/commands/check.ts` (`git rm`).

- [ ] **Step 5: Write integration test** — `tests/integration/conformance-pipeline.test.ts` (runs `--replay`, no network): build a verdicts.json + a diff, `cmdConformance(["--diff", d, "--adr-dir","docs/adr","--replay", v])`, assert stdout contains the verdict's `constraint_id` + result, returns 0.

- [ ] **Step 6: Run the full suite** — `pnpm lint && pnpm build && pnpm test`, all green.

- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "feat(cli): radar conformance runs the agent per in-scope constraint (ADR-0010, ST-0010)"
```

---

### Task 5: Retire the ModelClient port + legacy adapters + legacy deps; rewire eval

**Files:**
- Delete: `src/llm/port.ts`, `src/llm/anthropic-adapter.ts`, `src/llm/openai-compat-adapter.ts`, `src/llm/factory.ts`, `src/llm.ts`
- Delete tests: `tests/unit/factory.test.ts`, `tests/unit/openai-compat-adapter.test.ts`
- Modify: `src/index.ts` (if it re-exports the port/factory, change to export `runAgent`/`selectModel`)
- Modify: `package.json` (remove deps `openai`, `@anthropic-ai/sdk`)
- Modify: `scripts/eval.ts` (both arms rewritten to use `runAgent`)

**Interfaces:** No new public interfaces — cleanup only.

- [ ] **Step 1: Rewire `scripts/eval.ts`** — replace `import { makeModelClient, DEFAULT_MODEL, type ModelClient } from "../src/llm.ts";` with `import { selectModel } from "../src/agent/model.ts";` + `import { runAgent } from "../src/agent/engine.ts";` + `import { buildTools } from "../src/agent/tools.ts";`; inline `DEFAULT_MODEL` as `"claude-sonnet-4-6"`.
  - GROUNDED arm: replace `checkConstraint(client!, c, diffs, ctx)` with:
    ```ts
    const out = await runAgent({ model, skill: conformanceSkill, tools, user: buildUserPrompt(c, diffs, ctx), outputSchema: SemanticCheckOutputSchema });
    const v = out ? toVerdict(c, out) : { result: "unknown", confidence: 0, explanation: "" };
    ```
    (Add at top: `import { buildUserPrompt, toVerdict } from "../src/core/checker.ts";`, `const conformanceSkill = readFileSync("skills/conformance/SKILL.md","utf8");`, `const model = selectModel(process.env); const tools = buildTools(process.cwd());` inside `main()`, skipped when `replay` is true.)
  - UNGROUNDED arm: replace `client.complete({system: UNGROUNDED_SYSTEM, user, schema, maxTokens})` with `runAgent({ model, skill: UNGROUNDED_SYSTEM, tools: {}, user: "Review this diff:\n```diff\n"+diffText+"\n```", outputSchema: SemanticCheckOutputSchema })` (no tools), take `o.result/confidence/explanation` (give `{result:"unknown"}` when null).
  - Remove the `makeModelClient()` call and `client` variable; use `const live = !replay;` to control whether `model`/`tools` are constructed.

- [ ] **Step 2: Delete port/adapters/factory/barrel + their tests**
```bash
git rm src/llm/port.ts src/llm/anthropic-adapter.ts src/llm/openai-compat-adapter.ts src/llm/factory.ts src/llm.ts
git rm tests/unit/factory.test.ts tests/unit/openai-compat-adapter.test.ts
```

- [ ] **Step 3: Fix `src/index.ts`** — remove re-exports of `./llm.ts`/port/factory; replace with `export { runAgent } from "./agent/engine.ts";`, `export { selectModel } from "./agent/model.ts";` (retain all other core exports). Grep to confirm no stale imports: `grep -rn "llm.ts\|ModelClient\|makeModelClient\|checkConstraint" src scripts tests` (should be empty).

- [ ] **Step 4: Remove dependencies**
```bash
pnpm remove openai @anthropic-ai/sdk
```

- [ ] **Step 5: Run full suite + eval replay (no network)** — `pnpm lint && pnpm build && pnpm test` all green; `pnpm exec tsx scripts/eval.ts --replay` runs successfully (uses cache, no network).

- [ ] **Step 6: Commit**
```bash
git add -A
git commit -m "refactor(model): retire the ModelClient port + adapters; eval runs on the agent (ADR-0010)"
```

---

### Task 6: Workflow rename + ADR alignment + docs

**Files:**
- Modify: `.github/workflows/radar.yml` (`check`→`conformance`)
- Modify: `docs/adr/ADR-0007-pluggable-model-layer.md` (mark ADR-0007-C1 superseded)
- Modify: `docs/adr/ADR-0003-typescript-implementation.md` (reword ADR-0003-C1 to be provider-agnostic)
- Modify: `README.md` (`radar check`→`radar conformance`)
- Modify: `docs/stories/README.md` + add new story

- [ ] **Step 1: `radar.yml`** — on line 120, change `... main.ts check --adr-dir ...` to `... main.ts conformance --adr-dir ...` (everything else unchanged; occurrences of "check" in names/comments as English prose may stay).
- [ ] **Step 2: ADR-0007-C1** — in its constraints block change `status: active`→`status: superseded`, `superseded_by: null`→`superseded_by: ADR-0010`; add a note to the Status line in the body: "ADR-0007-C1 superseded by ADR-0010 (the port is replaced by the unified agent; the pluggable/cheap/edge-provider intent of ADR-0007 is continued by the engine)".
- [ ] **Step 3: ADR-0003-C1** — in the rule, replace Anthropic-SDK-specific wording such as "messages.parse + zodOutputFormat" with provider-agnostic language: "verdicts must be obtained via typed, zod-validated structured output — never by hand-parsing message.content (JSON.parse/regex field extraction); the specific SDK is not constrained". Update examples to remove SDK-specific names.
- [ ] **Step 4: README** — `radar check --adr-dir ... --diff ...` → `radar conformance --adr-dir ... --diff ...` (around lines 225–227).
- [ ] **Step 5: Stories** — add a new story row to `docs/stories/README.md` (ST-00NN: unified investigation agent / conformance upgrade, ADR-0010); advance ST-0010 status annotation; create `docs/stories/ST-00NN-unified-agent.md` (from template).
- [ ] **Step 6: Run full suite to confirm nothing broke** — `pnpm lint && pnpm build && pnpm test` all green.
- [ ] **Step 7: Commit**
```bash
git add -A
git commit -m "docs+ci: rename check→conformance; supersede ADR-0007-C1; reword ADR-0003-C1 (ADR-0010)"
```

---

## Wrap-up (before opening the PR)
- [ ] English mirror: this plan's `.en.md`, the new story, and any `check` occurrences in requirements (doc-management — same commit).
- [ ] `lint+build+test` green; **quality gate: `pnpm eval` replay comparing agent-version vs single-call-version (maintainer-triggered, costs API) — merge only on no regression**.
- [ ] `gh auth switch -u fang-lin` then open PR, citing ADR-0010 / ST.

## Self-Review
- **Coverage:** engine (T2), tools/model/parse migration (T1), conformance skill (T3), conformance shell + rename (T4), retire port + eval rewire (T5), workflow/ADR/docs (T6) — covers design §3/§4/§6/§9.
- **Platform boundary:** agent/SDK only in `src/agent/`; `src/core/` contains pure functions only (retrieve/buildUserPrompt/toVerdict); retrieval is deterministic (ADR-0010-C2).
- **No-network tests:** engine uses MockLanguageModelV3, conformance runs `--replay`, eval `--replay` uses cache.
- **Type consistency:** `runAgent<T>`, `SemanticCheckOutputSchema`, `Verdict`, `toVerdict`, `selectModel`, `parseAgentJson` are consistent throughout.
- **To verify during implementation:** eval rewire behaviour of both arms (capture the current single-call baseline first, then switch); quality gate must be run by the maintainer with a live eval.
