# Decision Capture Implementation Plan

> **Authoritative: Chinese (`2026-06-22-decision-capture-plan.zh.md`) · Translation: English (this file) · Last synced: 2026-06-22**
>
> **For agentic workers:** REQUIRED SUB-SKILL: implement task-by-task with superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Check off steps with `- [ ]`.

**Goal:** Implement `radar capture` — a skill-driven agent that, after a PR merges, investigates the change and drafts a Decision Note, per `ADR-0009` / the design doc `docs/specs/2026-06-22-decision-capture-design.zh.md` / story `ST-0005`.

**Architecture:** The pure core (`src/core/`) only adds the data contract + pure rendering; the investigative agent lives at the edge in `src/capture/`, hand-written on the Vercel AI SDK (tool loop + read-only tools + structured output + fallback parsing); the methodology lives in `skills/capture/SKILL.md`; the CLI `radar capture` is an edge; platform write-actions (open a draft PR/issue) live in the `radar.yml` workflow.

**Tech Stack:** TypeScript / Node 22 / ESM / `zod/v4` / vitest. Vercel AI SDK: `ai@6.0.208`, `@ai-sdk/anthropic@3.0.85`, `@ai-sdk/openai-compatible@2.0.51`, `@ai-sdk/gateway@3.0.133` (DeepSeek via the gateway).

## Global Constraints

- **ESM-only**, no CommonJS in `src/` (ADR-0008-C1). Relative imports carry the `.ts` suffix (tsc `rewriteRelativeImportExtensions`).
- **`src/core/` does not touch git/platform and does not import the AI SDK/agent** (ADR-0006-C1, now refined to `src/core/`; ADR-0009-C1). The agent + AI SDK + read-only tools live only in `src/capture/`.
- **Config comes only from `process.env`**; `src/` does not read `.env` (ADR-0006-C2).
- **Capture only drafts**: it does not accept/merge ADRs, does not push, and does not block merges; the draft PR/issue is opened by the workflow (ADR-0009-C2 / NFR-TRUST-1).
- **Tests do not call a real LLM**: the agent uses `MockLanguageModelV3`; `--replay` runs end-to-end without touching the network (ST-0024).
- **An empty result is legal**: `{ notes: [] }` is a normal result; do not fabricate decisions.
- **Commit messages**: Conventional Commits, **no AI signature**, cite `ST-0005` / `ADR-0009`.
- Tool descriptions / user-visible text are in English (the artifact language).

---

### Task 1: DecisionNote data contract (pure core)

**Files:**
- Modify: `src/core/models.ts`
- Test: `tests/unit/decision-note.test.ts`

**Interfaces:**
- Produces: `DecisionNoteSchema` / `DecisionNote`, `CaptureOutputSchema` / `CaptureOutput`, `SuggestedClass`.

- [ ] **Step 1: Write the failing test** — `tests/unit/decision-note.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { CaptureOutputSchema, DecisionNoteSchema } from "../../src/core/models.ts";

describe("DecisionNote (DM-DECISION-NOTE)", () => {
  it("parses a full note", () => {
    const n = DecisionNoteSchema.parse({
      detected_decision: "orders calls inventory over direct HTTP",
      evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
      suggested_class: "architectural",
      draft_rationale: "from PR body",
      confidence: 0.8,
      why_net_new: "no ADR scopes services/orders",
    });
    expect(n.suggested_class).toBe("architectural");
  });
  it("empty notes list is valid (nothing flagged)", () => {
    expect(CaptureOutputSchema.parse({ notes: [] }).notes).toEqual([]);
    expect(CaptureOutputSchema.parse({}).notes).toEqual([]); // defaults
  });
  it("rejects an unknown class", () => {
    expect(() => DecisionNoteSchema.parse({
      detected_decision: "x", evidence: [], suggested_class: "weird",
      draft_rationale: "", confidence: 0.1, why_net_new: "",
    })).toThrow();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/decision-note.test.ts` → FAIL (the exports don't exist).

- [ ] **Step 3: Implement** — append to `src/core/models.ts` (the file already has `import * as z from "zod/v4";`):

```ts
/** DM-DECISION-NOTE — capture's draft output. id/pr/status/graduated_to are
 * added by the integration layer; the agent emits the fields below. */
export const SuggestedClass = z.enum(["architectural", "behavioral"]);

export const DecisionEvidenceSchema = z.object({
  file: z.string(),
  lines: z.array(z.number()), // [start, end] in the post-merge file
});

export const DecisionNoteSchema = z.object({
  detected_decision: z.string(),
  evidence: z.array(DecisionEvidenceSchema).default([]),
  suggested_class: SuggestedClass,
  draft_rationale: z.string(),
  confidence: z.number(),
  why_net_new: z.string(),
});
export type DecisionNote = z.infer<typeof DecisionNoteSchema>;

/** The structured object the capture agent returns. Empty notes is valid. */
export const CaptureOutputSchema = z.object({
  notes: z.array(DecisionNoteSchema).default([]),
});
export type CaptureOutput = z.infer<typeof CaptureOutputSchema>;
```

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/decision-note.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/core/models.ts tests/unit/decision-note.test.ts
git commit -m "feat(core): DecisionNote data contract (DM-DECISION-NOTE) (ST-0005)"
```

---

### Task 2: Decision Note rendering (pure core)

**Files:**
- Create: `src/core/capture-comment.ts`
- Test: `tests/unit/capture-comment.test.ts`

**Interfaces:**
- Consumes: `DecisionNote` (Task 1).
- Produces: `decisionNotesMarkdown(notes: DecisionNote[]): string`, `decisionNoteMarkdown(note: DecisionNote): string`.

- [ ] **Step 1: Write the failing test** — `tests/unit/capture-comment.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { decisionNotesMarkdown } from "../../src/core/capture-comment.ts";

const note = {
  detected_decision: "orders calls inventory over direct HTTP",
  evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
  suggested_class: "architectural" as const,
  draft_rationale: "PR body says 'sync read for speed'",
  confidence: 0.82,
  why_net_new: "no active constraint scopes services/orders",
};

describe("decisionNotesMarkdown", () => {
  it("renders a note with header, evidence and confidence", () => {
    const md = decisionNotesMarkdown([note]);
    expect(md).toContain("Delivery Radar — Decision Capture");
    expect(md).toContain("orders calls inventory over direct HTTP");
    expect(md).toContain("`services/orders/client.ts` L10–L14");
    expect(md).toContain("0.82");
    expect(md).toContain("_Advisory");
  });
  it("says nothing-flagged on empty input, never a bare header", () => {
    const md = decisionNotesMarkdown([]);
    expect(md).toContain("No undocumented decisions detected");
    expect(md).not.toContain("Decision:");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/capture-comment.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/core/capture-comment.ts`:

```ts
/**
 * Decision Note projection (capture). Pure rendering: DecisionNote[] -> markdown
 * for a draft-PR / issue body. Platform-agnostic — never talks to git/gh
 * (ADR-0006). Posting is the integration layer's job.
 */
import type { DecisionNote } from "./models.ts";

const HEADER = "## 🛰️ Delivery Radar — Decision Capture";
const ADVISORY =
  "_Advisory — a draft for human triage. Merge the proposed ADR (or act on " +
  "the issue) to record it; nothing is recorded until you do._";

export function decisionNoteMarkdown(note: DecisionNote): string {
  const ev = note.evidence
    .map((e) => `\`${e.file}\` L${e.lines[0]}–L${e.lines[1] ?? e.lines[0]}`)
    .join(", ");
  return [
    `### 🟡 Possible undocumented decision — ${note.suggested_class}`,
    "",
    `**Decision:** ${note.detected_decision}`,
    "",
    `**Why it looks net-new:** ${note.why_net_new}`,
    "",
    `**Rationale (draft):** ${note.draft_rationale}`,
    "",
    `**Evidence:** ${ev || "—"}`,
    "",
    `confidence **${note.confidence.toFixed(2)}**`,
  ].join("\n");
}

export function decisionNotesMarkdown(notes: DecisionNote[]): string {
  const blocks = [HEADER, ""];
  if (notes.length === 0) {
    blocks.push(
      "✅ **No undocumented decisions detected** — this merge introduces no " +
        "architecturally-significant decision that isn't already recorded.",
      "",
    );
  } else {
    for (const n of notes) blocks.push(decisionNoteMarkdown(n), "", "---", "");
  }
  blocks.push(ADVISORY);
  return blocks.join("\n");
}
```

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/capture-comment.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/core/capture-comment.ts tests/unit/capture-comment.test.ts
git commit -m "feat(core): render Decision Notes to markdown (ST-0005)"
```

---

### Task 3: Note save/load (io, for --save/--replay)

**Files:**
- Create: `src/io/notes.ts`
- Test: `tests/unit/notes.test.ts`

**Interfaces:**
- Consumes: `DecisionNote`, `DecisionNoteSchema` (Task 1).
- Produces: `saveNotes(notes: DecisionNote[], path: string): void`, `loadNotes(path: string): DecisionNote[]`.

- [ ] **Step 1: Write the failing test** — `tests/unit/notes.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveNotes, loadNotes } from "../../src/io/notes.ts";

describe("notes save/load", () => {
  it("round-trips notes through a file", () => {
    const notes = [{
      detected_decision: "x", evidence: [{ file: "a.ts", lines: [1, 2] }],
      suggested_class: "behavioral" as const, draft_rationale: "r",
      confidence: 0.5, why_net_new: "n",
    }];
    const p = join(mkdtempSync(join(tmpdir(), "radar-")), "notes.json");
    saveNotes(notes, p);
    expect(loadNotes(p)).toEqual(notes);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/notes.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/io/notes.ts`:

```ts
/** Persist/replay capture's Decision Notes (demo determinism — mirrors verdicts.ts). */
import { readFileSync, writeFileSync } from "node:fs";
import * as z from "zod/v4";
import { DecisionNoteSchema, type DecisionNote } from "../core/models.ts";

export function saveNotes(notes: DecisionNote[], path: string): void {
  writeFileSync(path, JSON.stringify(notes, null, 2));
}

export function loadNotes(path: string): DecisionNote[] {
  const data = JSON.parse(readFileSync(path, "utf8"));
  return z.array(DecisionNoteSchema).parse(data);
}
```

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/notes.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/io/notes.ts tests/unit/notes.test.ts
git commit -m "feat(io): save/load Decision Notes for --save/--replay (ST-0005)"
```

---

### Task 4: Tolerant parsing of agent output (edge)

> Design trade-off: research flags that annotating `output: Output.object` + `tools` has a known bug in `ai@6` (#11348/#10023). So `runCapture` (Task 7) tries `output` first, and on failure falls back to **parsing `result.text`**. This task implements that pure parser, tested thoroughly in isolation.

**Files:**
- Create: `src/capture/parse.ts`
- Test: `tests/unit/capture-parse.test.ts`

**Interfaces:**
- Consumes: `CaptureOutputSchema` (Task 1).
- Produces: `parseCaptureNotes(text: string): DecisionNote[]` (returns `[]` on failure, never throws).

- [ ] **Step 1: Write the failing test** — `tests/unit/capture-parse.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { parseCaptureNotes } from "../../src/capture/parse.ts";

const valid = JSON.stringify({ notes: [{
  detected_decision: "x", evidence: [{ file: "a.ts", lines: [1, 2] }],
  suggested_class: "architectural", draft_rationale: "r", confidence: 0.7, why_net_new: "n",
}]});

describe("parseCaptureNotes", () => {
  it("parses a bare JSON object", () => {
    expect(parseCaptureNotes(valid)).toHaveLength(1);
  });
  it("parses JSON inside a ```json fence", () => {
    expect(parseCaptureNotes("blah\n```json\n" + valid + "\n```\n")).toHaveLength(1);
  });
  it("returns [] on garbage, never throws", () => {
    expect(parseCaptureNotes("no json here")).toEqual([]);
    expect(parseCaptureNotes("{not valid}")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/capture-parse.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/capture/parse.ts`:

```ts
/** Tolerant text -> DecisionNote[]: extract a JSON object, zod-validate, never throw. */
import { CaptureOutputSchema, type DecisionNote } from "../core/models.ts";

export function parseCaptureNotes(text: string): DecisionNote[] {
  const candidate = extractJsonObject(text);
  if (!candidate) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(candidate);
  } catch {
    return [];
  }
  const parsed = CaptureOutputSchema.safeParse(raw);
  return parsed.success ? parsed.data.notes : [];
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

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/capture-parse.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/capture/parse.ts tests/unit/capture-parse.test.ts
git commit -m "feat(capture): tolerant parser for agent output (ST-0005)"
```

---

### Task 5: Read-only investigation tools (edge)

**Files:**
- Create: `src/capture/tools.ts`
- Test: `tests/unit/capture-tools.test.ts`

**Interfaces:**
- Produces: `buildTools(root: string): Record<string, Tool>` — `read_file`, `grep`, `git` (read-only). `root` is the repo root; all paths are constrained within it.
- Depends on `ai`'s `tool()`.

- [ ] **Step 1: Write the failing test** — `tests/unit/capture-tools.test.ts` (call `execute` directly)

```ts
import { describe, it, expect } from "vitest";
import { buildTools } from "../../src/capture/tools.ts";

describe("buildTools (read-only)", () => {
  const tools = buildTools(process.cwd());
  it("read_file reads a repo file", async () => {
    const out = await tools.read_file.execute({ path: "package.json" }, {} as any);
    expect(out).toContain("\"name\"");
  });
  it("read_file refuses to escape the repo root", async () => {
    const out = await tools.read_file.execute({ path: "../../etc/passwd" }, {} as any);
    expect(out).toMatch(/outside the repo|not allowed/i);
  });
  it("git tool rejects a non-read-only subcommand", async () => {
    const out = await tools.git.execute({ args: ["push"] }, {} as any);
    expect(out).toMatch(/only read-only/i);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/capture-tools.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/capture/tools.ts` (fs reads + read-only git; git is allowed in `src/capture`, since ADR-0006-C1 is now refined to `src/core/`):

```ts
/** Read-only investigation tools for the capture agent (edge — ADR-0009). */
import { tool, type Tool } from "ai";
import * as z from "zod/v4";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, isAbsolute } from "node:path";

const MAX = 20000; // cap tool output to keep the context bounded
const GIT_READONLY = new Set(["log", "blame", "show", "diff", "ls-files"]);

function inRoot(root: string, p: string): string | null {
  const abs = resolve(root, p);
  const rel = relative(root, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return abs;
}

export function buildTools(root: string): Record<string, Tool> {
  return {
    read_file: tool({
      description: "Read a UTF-8 file from the repository (read-only).",
      inputSchema: z.object({ path: z.string().describe("repo-relative path") }),
      execute: async ({ path }) => {
        const abs = inRoot(root, path);
        if (!abs) return `path is outside the repo root — not allowed`;
        try {
          return readFileSync(abs, "utf8").slice(0, MAX);
        } catch (e) {
          return `could not read ${path}: ${(e as Error).message}`;
        }
      },
    }),
    grep: tool({
      description: "Search the repository for a regex; returns matching lines with file:line.",
      inputSchema: z.object({ pattern: z.string(), path: z.string().default(".") }),
      execute: async ({ pattern, path }) => {
        const abs = inRoot(root, path);
        if (!abs) return `path is outside the repo root — not allowed`;
        try {
          return execFileSync("grep", ["-rnI", "--", pattern, abs], {
            encoding: "utf8", maxBuffer: 4 * MAX, cwd: root,
          }).slice(0, MAX);
        } catch {
          return "no matches"; // grep exits non-zero on no match
        }
      },
    }),
    git: tool({
      description:
        "Run a READ-ONLY git command for history/blame (e.g. log, blame, show, diff).",
      inputSchema: z.object({ args: z.array(z.string()).describe("git args, e.g. ['log','-p','file']") }),
      execute: async ({ args }) => {
        if (args.length === 0 || !GIT_READONLY.has(args[0])) {
          return `only read-only git subcommands are allowed: ${[...GIT_READONLY].join(", ")}`;
        }
        try {
          return execFileSync("git", args, { encoding: "utf8", maxBuffer: 4 * MAX, cwd: root })
            .slice(0, MAX);
        } catch (e) {
          return `git failed: ${(e as Error).message}`;
        }
      },
    }),
  };
}
```

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/capture-tools.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/capture/tools.ts tests/unit/capture-tools.test.ts
git commit -m "feat(capture): read-only investigation tools (read/grep/git) (ST-0005, ADR-0009)"
```

---

### Task 6: Select the model from env (edge)

**Files:**
- Create: `src/capture/model.ts`
- Test: `tests/unit/capture-model.test.ts`

**Interfaces:**
- Produces: `selectCaptureModel(env: NodeJS.ProcessEnv): LanguageModel`. Reuses the existing `RADAR_PROVIDER`/`RADAR_MODEL`/`RADAR_BASE_URL`/keys.

- [ ] **Step 1: Write the failing test** — `tests/unit/capture-model.test.ts` (only asserts it can construct and picks the right provider, no network)

```ts
import { describe, it, expect } from "vitest";
import { selectCaptureModel } from "../../src/capture/model.ts";

describe("selectCaptureModel", () => {
  it("builds a native Anthropic model", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "anthropic", RADAR_MODEL: "claude-sonnet-4-5", ANTHROPIC_API_KEY: "x" } as any);
    expect(m).toBeTruthy();
  });
  it("builds a vercel-gateway model (DeepSeek)", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "vercel", RADAR_MODEL: "deepseek/deepseek-chat", AI_GATEWAY_API_KEY: "x" } as any);
    expect(m).toBeTruthy();
  });
  it("throws a clear error for vercel without a key", () => {
    expect(() => selectCaptureModel({ RADAR_PROVIDER: "vercel" } as any)).toThrow(/AI_GATEWAY_API_KEY/);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/capture-model.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/capture/model.ts`:

```ts
/** Select the capture agent's model from env (ADR-0007 spirit, ADR-0006-C2: env only). */
import type { LanguageModel } from "ai";
import { gateway } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function selectCaptureModel(env: NodeJS.ProcessEnv): LanguageModel {
  const provider = env.RADAR_PROVIDER ?? "anthropic";
  const model = env.RADAR_MODEL;
  switch (provider) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY && !env.RADAR_API_KEY) throw new Error("anthropic provider requires ANTHROPIC_API_KEY");
      return anthropic(model ?? "claude-sonnet-4-5");
    }
    case "vercel": {
      if (!env.AI_GATEWAY_API_KEY && !env.RADAR_API_KEY) throw new Error("vercel provider requires AI_GATEWAY_API_KEY");
      return gateway(model ?? "deepseek/deepseek-chat"); // verify exact slug in the live gateway list
    }
    case "openai-compat": {
      if (!env.RADAR_BASE_URL) throw new Error("openai-compat provider requires RADAR_BASE_URL");
      const p = createOpenAICompatible({ name: "radar", baseURL: env.RADAR_BASE_URL, apiKey: env.RADAR_API_KEY ?? "" });
      return p.chatModel(model ?? "");
    }
    default:
      throw new Error(`unknown RADAR_PROVIDER for capture: ${provider}`);
  }
}
```

> Note: `anthropic()`/`gateway()` are lazily constructed (they don't send a request immediately), so they can be constructed even without a key — but we validate the key explicitly to give a clear error. Confirm `vercel`'s DeepSeek slug against the gateway's live list at implementation time.

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/capture-model.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/capture/model.ts tests/unit/capture-model.test.ts
git commit -m "feat(capture): select agent model from env (ST-0005, ADR-0007)"
```

---

### Task 7: Investigative agent (edge, the core piece)

**Files:**
- Create: `src/capture/agent.ts`
- Test: `tests/unit/capture-agent.test.ts`

**Interfaces:**
- Consumes: `buildTools` (T5), `parseCaptureNotes` (T4), `Constraint` (existing models), `CaptureOutputSchema` (T1).
- Produces: `buildCaptureUserPrompt(diff, constraints): string`, `runCapture(opts): Promise<DecisionNote[]>`, where `opts = { model: LanguageModel; skill: string; diff: string; constraints: Constraint[]; root: string }`.

- [ ] **Step 1: Write the failing test** — `tests/unit/capture-agent.test.ts` (uses `MockLanguageModelV3`, no network)

```ts
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { runCapture } from "../../src/capture/agent.ts";

const NOTES = { notes: [{
  detected_decision: "orders calls inventory over direct HTTP",
  evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
  suggested_class: "architectural", draft_rationale: "speed", confidence: 0.8,
  why_net_new: "no ADR scopes services/orders",
}]};

function modelReturning(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
      warnings: [],
    }),
  });
}

describe("runCapture", () => {
  it("returns parsed notes from the model output", async () => {
    const notes = await runCapture({
      model: modelReturning("```json\n" + JSON.stringify(NOTES) + "\n```") as any,
      skill: "be a capture agent", diff: "diff --git a/x b/x", constraints: [], root: process.cwd(),
    });
    expect(notes).toHaveLength(1);
    expect(notes[0].suggested_class).toBe("architectural");
  });
  it("returns [] (never throws) when the model emits no usable JSON", async () => {
    const notes = await runCapture({
      model: modelReturning("I found nothing.") as any,
      skill: "s", diff: "d", constraints: [], root: process.cwd(),
    });
    expect(notes).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/unit/capture-agent.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/capture/agent.ts`. Try `output: Output.object` first; on exception or empty, fall back to `parseCaptureNotes(result.text)`; if neither works, return `[]` (advisory does not crash). The `stopWhen` budget includes "producing the structured output also counts as a step".

```ts
/**
 * Capture investigative agent (edge — ADR-0009). A hand-written tool loop on the
 * Vercel AI SDK: the skill (instructions) + the diff + the recorded constraints
 * drive read-only investigation; output is a zod-validated DecisionNote[].
 * Advisory: any failure yields [] rather than crashing the check.
 */
import { generateText, Output, stepCountIs, type LanguageModel } from "ai";
import { CaptureOutputSchema, type Constraint, type DecisionNote } from "../core/models.ts";
import { buildTools } from "./tools.ts";
import { parseCaptureNotes } from "./parse.ts";

export function buildCaptureUserPrompt(diff: string, constraints: Constraint[]): string {
  const recorded = constraints.map((c) => `- ${c.id} (${c.adr}): ${c.title}`).join("\n") || "(none)";
  return [
    "## Already-recorded constraints (do NOT re-flag these)",
    recorded,
    "",
    "## The merged pull-request diff",
    "```diff",
    diff,
    "```",
    "",
    "Investigate (read files / grep / read-only git as your skill directs) and return " +
      "the JSON object of Decision Notes. Returning an empty notes list is valid and expected " +
      "when nothing implicit, net-new and architecturally significant was decided.",
  ].join("\n");
}

export async function runCapture(opts: {
  model: LanguageModel;
  skill: string;
  diff: string;
  constraints: Constraint[];
  root: string;
}): Promise<DecisionNote[]> {
  const tools = buildTools(opts.root);
  const user = buildCaptureUserPrompt(opts.diff, opts.constraints);
  let result;
  try {
    result = await generateText({
      model: opts.model,
      system: opts.skill,
      prompt: user,
      tools,
      output: Output.object({ schema: CaptureOutputSchema }),
      stopWhen: stepCountIs(24), // tool rounds + the structured-output step
    });
  } catch {
    return []; // advisory — never crash the check
  }
  // Prefer the validated structured output; fall back to tolerant text parse
  // (ai@6 output+tools has open bugs — #11348/#10023).
  const out = (result as { output?: { notes?: DecisionNote[] } }).output;
  if (out?.notes && Array.isArray(out.notes)) return out.notes;
  return parseCaptureNotes(result.text ?? "");
}
```

> Note: when `MockLanguageModelV3` goes down the text path, `output` may be empty → triggering `parseCaptureNotes(result.text)`, which makes the test stable (it doesn't depend on the internal contract of `Output.object`'s mock, which research could not verify). A real provider takes the `output` main path.

- [ ] **Step 4: Run the test to confirm it passes** — `pnpm vitest run tests/unit/capture-agent.test.ts` → PASS.
- [ ] **Step 5: Commit**

```bash
git add src/capture/agent.ts tests/unit/capture-agent.test.ts
git commit -m "feat(capture): investigative agent on the AI SDK (ST-0005, ADR-0009)"
```

---

### Task 8: CLI `radar capture` + dispatch

**Files:**
- Create: `src/cli/commands/capture.ts`
- Modify: `src/cli/main.ts` (add the `capture` branch)
- Test: `tests/integration/capture-pipeline.test.ts` (via `--replay`, no network)

**Interfaces:**
- Consumes: `extractFromDir`/`adrSection`, `loadDiff`, `runCapture`, `selectCaptureModel`, `decisionNotesMarkdown`, `saveNotes`/`loadNotes`.
- Produces: `cmdCapture(argv: string[]): Promise<number>`.
- Behavior: read the skill (`skills/capture/SKILL.md`), constraints, diff; when not in replay, build the model and run the agent; print the rendered markdown to stdout (the draft body), and `--save` stores the notes JSON. Does **not** issue platform actions.

- [ ] **Step 1: Write the failing integration test** — `tests/integration/capture-pipeline.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdCapture } from "../../src/cli/commands/capture.ts";

describe("radar capture --replay (no network)", () => {
  it("renders saved notes to stdout", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-cap-"));
    const notes = join(dir, "notes.json");
    writeFileSync(notes, JSON.stringify([{
      detected_decision: "orders calls inventory over direct HTTP",
      evidence: [{ file: "a.ts", lines: [1, 2] }], suggested_class: "architectural",
      draft_rationale: "r", confidence: 0.8, why_net_new: "n",
    }]));
    const diff = join(dir, "pr.diff");
    writeFileSync(diff, "diff --git a/a.ts b/a.ts\n");
    const log: string[] = [];
    const orig = console.log;
    console.log = (s?: unknown) => { log.push(String(s)); };
    try {
      const code = await cmdCapture(["--diff", diff, "--adr-dir", "docs/adr", "--replay", notes]);
      expect(code).toBe(0);
    } finally { console.log = orig; }
    expect(log.join("\n")).toContain("orders calls inventory over direct HTTP");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** — `pnpm vitest run tests/integration/capture-pipeline.test.ts` → FAIL.

- [ ] **Step 3: Implement** — `src/cli/commands/capture.ts`:

```ts
/** `radar capture` — investigate a merged PR's diff and draft Decision Notes. */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { extractFromDir } from "../../io/extract.ts";
import { loadDiff } from "../../io/diff.ts";
import { saveNotes, loadNotes } from "../../io/notes.ts";
import { decisionNotesMarkdown } from "../../core/capture-comment.ts";
import { runCapture } from "../../capture/agent.ts";
import { selectCaptureModel } from "../../capture/model.ts";
import { fail } from "../util.ts";
import type { DecisionNote } from "../../core/models.ts";

export async function cmdCapture(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      skill: { type: "string", default: "skills/capture/SKILL.md" },
      root: { type: "string", default: process.cwd() },
      save: { type: "string" },
      replay: { type: "string" },
      verbose: { type: "boolean", short: "v", default: false },
    },
  });
  if (!values.diff) fail("capture requires --diff");
  if (values.verbose) process.env.RADAR_DEBUG = "1";

  let notes: DecisionNote[];
  if (values.replay) {
    notes = loadNotes(values.replay);
  } else {
    const constraints = extractFromDir(values["adr-dir"]!);
    const diffText = readFileSync(values.diff!, "utf8");
    loadDiff(values.diff!); // validate the diff parses (changed-file sanity)
    const skill = readFileSync(values.skill!, "utf8");
    const model = selectCaptureModel(process.env);
    notes = await runCapture({ model, skill, diff: diffText, constraints, root: values.root! });
    if (values.save) saveNotes(notes, values.save);
  }

  console.error(`decision notes: ${notes.length}`);
  console.log(decisionNotesMarkdown(notes)); // draft body to stdout; the workflow posts it
  return 0;
}
```

- [ ] **Step 4: Wire it into `src/cli/main.ts`** — add to the dispatch (same style as `extract|check|comment`):

```ts
import { cmdCapture } from "./commands/capture.ts";
// ... at the command dispatch:
case "capture":
  return cmdCapture(rest);
```

(Align with `main.ts`'s existing style; `rest` is the argv with the command name removed.)

- [ ] **Step 5: Run the test to confirm it passes** — `pnpm vitest run tests/integration/capture-pipeline.test.ts` → PASS.
- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/capture.ts src/cli/main.ts tests/integration/capture-pipeline.test.ts
git commit -m "feat(cli): radar capture command (--diff/--save/--replay) (ST-0005)"
```

---

### Task 9: IIAC capture SKILL.md (ST-0009)

**Files:**
- Create: `skills/capture/SKILL.md`
- Test: `tests/unit/skill-capture.test.ts` (asserts the file exists + the required frontmatter fields)

- [ ] **Step 1: Write the failing test** — `tests/unit/skill-capture.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("capture SKILL.md", () => {
  it("exists with name + description frontmatter", () => {
    const t = readFileSync("skills/capture/SKILL.md", "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(/name:\s*capture/);
    expect(t).toMatch(/description:/);
    expect(t).toMatch(/implicit/i); // methodology present
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails** → FAIL (the file doesn't exist).

- [ ] **Step 3: Write `skills/capture/SKILL.md`** (agentskills.io format; the body is the agent's instructions):

```markdown
---
name: capture
description: Detect implicit, net-new, architecturally-significant decisions a merged PR makes but records nowhere, and draft them as Decision Notes for human triage.
license: same as repository
---

# Decision Capture

You are Delivery Radar's Decision Capture agent. After a PR merges, you read its
diff and investigate the repository to find decisions the PR made **implicitly**
that are **not recorded** in any ADR — then draft them for a human to confirm.

## What counts as a capture (ALL three must hold)
1. **Implicit** — the PR makes it without saying so (no ADR, not the PR's stated purpose).
2. **Net-new** — no active constraint / ADR already covers it. If it's covered, it's
   a conformance/drift matter, not a capture. Do NOT re-flag recorded intent.
3. **Architecturally significant** — it shapes structure, integration, or data
   (e.g. a new dependency, a new datastore, a new cross-service call pattern),
   not a local implementation detail.

## How to investigate (start from the diff, go outward only as needed)
1. Read the diff. Note candidate decisions.
2. Read the PR title/description for the author's stated intent and rationale.
3. For each candidate, use your tools:
   - `grep` the repo: is this pattern already used elsewhere? (if everywhere → not net-new)
   - `read_file` related code to understand the change.
   - `git` (read-only: log/blame/show) on touched files: is this the first occurrence?
4. Check the already-recorded constraints you were given. If covered → drop it.

## Honesty guardrail
Returning an **empty** notes list is valid and common. Do not invent decisions.
Only emit a note when you are confident it is implicit + net-new + significant.
Low confidence → either omit it or set a low `confidence`.

## Output contract
Return a JSON object: `{ "notes": [ ... ] }`. Each note:
- `detected_decision` — one sentence.
- `evidence` — array of `{ "file": string, "lines": [start, end] }`.
- `suggested_class` — `"architectural"` | `"behavioral"`.
- `draft_rationale` — from the PR description / linked story.
- `confidence` — 0..1.
- `why_net_new` — why no existing constraint/ADR covers it.

## Examples
- GOOD capture: PR adds `requests.get("http://inventory-service/...")` in orders;
  no ADR scopes service-to-service calls; grep shows no prior direct call → a net-new
  integration decision.
- NOT a capture: PR renames a variable, fixes a typo, or adds a call that an existing
  ADR already governs.
```

- [ ] **Step 4: Run the test to confirm it passes** → PASS.
- [ ] **Step 5: Commit**

```bash
git add skills/capture/SKILL.md tests/unit/skill-capture.test.ts
git commit -m "feat(skills): IIAC capture methodology skill (ST-0009, ST-0005)"
```

---

### Task 10: Dependencies + workflow wiring

**Files:**
- Modify: `package.json` (deps + `files`)
- Modify: `.github/workflows/radar.yml` (capture job)

- [ ] **Step 1: Install dependencies**

```bash
pnpm add ai@6 @ai-sdk/anthropic @ai-sdk/openai-compatible @ai-sdk/gateway
```

- [ ] **Step 2: Add `skills` to `package.json`'s `files`** (ship SKILL.md with the package, ADR-0008): change `"files": ["dist"]` to `"files": ["dist", "skills"]`.

- [ ] **Step 3: `pnpm build` + full test run**

```bash
pnpm lint && pnpm build && pnpm test
```
Expected: green (including the newly-added capture tests).

- [ ] **Step 4: Add the capture job to `.github/workflows/radar.yml`** (triggered after merge; platform write-actions in the workflow; always advisory):

```yaml
  capture:
    if: >-
      (github.event_name == 'pull_request' && github.event.pull_request.merged == true) ||
      github.event_name == 'workflow_dispatch' ||
      (github.event_name == 'issue_comment' && startsWith(github.event.comment.body, '/radar capture'))
    runs-on: ubuntu-latest
    permissions: { contents: write, pull-requests: write, issues: write }
    steps:
      - uses: actions/checkout@v6
        with: { fetch-depth: 0 }   # post-merge main + full history (for read-only git)
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Get merged PR diff
        run: gh pr diff ${{ github.event.pull_request.number }} --repo ${{ github.repository }} > pr.diff
        env: { GH_TOKEN: ${{ github.token }} }
      - name: Capture
        run: pnpm exec tsx src/cli/main.ts capture --diff pr.diff --adr-dir docs/adr --save notes.json > body.md
        env:
          RADAR_PROVIDER: vercel
          RADAR_MODEL: deepseek/deepseek-chat   # at implementation, confirm the slug against the live gateway list
          AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
      - name: Open a draft PR or issue per note (advisory; human merges/closes)
        run: |
          COUNT=$(jq 'length' notes.json)
          if [ "$COUNT" = "0" ]; then echo "nothing flagged"; exit 0; fi
          # open an issue carrying the draft (the human decides whether to graduate it to an ADR PR)
          gh issue create --repo ${{ github.repository }} \
            --title "Decision capture from #${{ github.event.pull_request.number }}" \
            --body-file body.md
        env: { GH_TOKEN: ${{ github.token }} }
```

> Start by opening an **issue** (simplest, zero-risk); "open a draft ADR PR" is a later enhancement (it needs the agent to produce the ADR body — see the ST-0005 note). **Always advisory** — no required status, no blocking.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml .github/workflows/radar.yml
git commit -m "feat(ci): run capture after merge; open an advisory issue per Decision Note (ST-0005, ADR-0009)"
```

---

## Wrap-up (before opening the PR)

- [ ] English mirrors: the FR-CAP changes in `docs/specs/...en.md` / `docs/requirements/...en.md`, and this plan's `.en.md` (doc-management, same commit).
- [ ] `docs/stories/README.md` index: ST-0005 status, add the new ST-0009 row.
- [ ] `lint + build + test` green; the real smoke (one `radar capture` against a real provider) is triggered by the maintainer (not Claude).
- [ ] Open the PR after `gh auth switch -u fang-lin`, citing ST-0005 / ADR-0009.

## Self-Review (against the design doc)

- **Coverage**: DecisionNote (T1), rendering (T2), save/replay (T3), tolerant parsing (T4), read-only tools (T5), model selection (T6), agent (T7), CLI (T8), SKILL.md (T9), dependencies + workflow (T10) — covers spec §3/§5/§6/§7/§8.
- **Platform boundary**: git/gh only in `src/capture/` (read-only git) and the workflow (gh); `src/core/` is purely T1/T2 pure pieces — consistent with ADR-0006-C1 (src/core/)/ADR-0009-C1.
- **Honesty / no crash**: T4 parse failure returns `[]`, T7 exception returns `[]`, the empty result has a "nothing flagged" rendering (T2).
- **No-network tests**: T7 uses MockLanguageModelV3, T8 goes via --replay.
- **Type consistency**: `DecisionNote`/`CaptureOutput`/`Constraint` are consistent across each task's signatures.
- **To verify (at implementation time)**: the stability of `output`+`tools` (a fallback is in place), the DeepSeek gateway slug, the field name of the Mock's tool-call content (if the multi-step tool loop is to be tested).
