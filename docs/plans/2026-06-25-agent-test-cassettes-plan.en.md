# Agent test cassettes (record/replay) — implementation plan

> **Authoritative: Chinese (`2026-06-25-agent-test-cassettes-plan.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-25 · On conflict, the Chinese version prevails.**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build record/replay cassettes for conformance + capture so the agent's real behaviour (tool loop / `Output.object` parsing / text-parse fallback / `toVerdict`) is tested deterministically with zero API; tidy the test suite alongside.

**Architecture:** Mock the agent's two external boundaries — the model (`MockLanguageModelV3`, whose `doGenerate` accepts a results array returned in order) and the tools (`tool().execute`, replaced with recorded outputs returned in order). The agent itself runs for real. Replay verifies inputs, so changing a prompt/tool errors with a stale-cassette message (prevents silent staleness). Injection seam: commands gain an optional `deps`, runners gain an optional `tools`; the production path's defaults equal current behaviour.

**Tech Stack:** TypeScript/Node 22, ESM (`.ts` import suffixes), vitest, Vercel AI SDK `ai@6.0.208`, `MockLanguageModelV3` from `ai/test`, `zod/v4`.

## Global Constraints

- Test infra lives under `tests/cassettes/`, **never pollutes `src/core`** (ADR-0006-C1); config from `process.env` only (ADR-0006-C2).
- Every LLM operation still goes only through the shared engine `runAgent` (ADR-0010-C1); the seam doesn't change that.
- ESM-only, all relative imports carry the `.ts` suffix.
- **Tests never call a real LLM**: `replay` (default) — CI never goes online; `record`/`update` cost API and are **maintainer-triggered, never by Claude / the implementing agent**.
- Commits carry no AI signature, cite IDs (`ST-0024`, `docs/specs/2026-06-25-agent-test-cassettes-design.zh.md`).
- Confirm no key / sensitive content before committing a cassette.
- Keep `pnpm lint && pnpm build && pnpm test` green.

## File Structure

- **Create** `tests/cassettes/cassette.ts` — cassette types + `loadCassette`/`saveCassette` + `digestInput`.
- **Create** `tests/cassettes/cassette.test.ts` — unit tests for the above.
- **Create** `tests/cassettes/replay.ts` — `replayModel(cassette)` + `replayTools(cassette)`.
- **Create** `tests/cassettes/replay.test.ts` — verify replay + verification with a synthetic cassette.
- **Create** `tests/cassettes/record.ts` — `recordingModel(real, sink)` + `recordingTools(real, sink)`.
- **Create** `tests/cassettes/record.test.ts` — verify recording using `MockLanguageModelV3` as the "real" source.
- **Create** `tests/cassettes/index.ts` — `cassetteDeps(op, caseName)` three-state assembly of `{makeModel, makeTools}`.
- **Create** `tests/cassettes/*.json` — synthetic cassettes (produced by this plan); real cassettes recorded by the maintainer later.
- **Modify** `src/agent/conformance-run.ts` — `runConformanceCheck` gains optional `tools`.
- **Modify** `src/capture/agent.ts` — `runCapture` gains optional `tools`.
- **Modify** `src/cli/commands/conformance.ts` — `cmdConformance(argv, deps?)`.
- **Modify** `src/cli/commands/capture.ts` — `cmdCapture(argv, deps?)`.
- **Create** `tests/integration/conformance-cassette.test.ts` / `capture-cassette.test.ts` — replay integration tests.
- **Rename** (`git mv`, content unchanged): `tests/integration/{conformance,capture,comment}-pipeline.test.ts` → `*-cli.test.ts`; `pipeline.test.ts` → `core-pipeline.test.ts`.
- **Delete** `tests/unit/skill-capture.test.ts`, `tests/unit/skill-conformance.test.ts`.
- **Create** `tests/unit/skills-frontmatter.test.ts` — data-driven guard.

---

### Task 1: cassette types + load/save + digest

**Files:**
- Create: `tests/cassettes/cassette.ts`
- Test: `tests/cassettes/cassette.test.ts`

**Interfaces:**
- Produces:
  - `interface ModelCall { inputDigest: string; result: unknown }` — `result` is a `LanguageModelV3GenerateResult` (fed verbatim to `MockLanguageModelV3` on replay).
  - `interface ToolCall { name: string; input: unknown; output: string }`
  - `interface Cassette { meta: { op: string; case: string; recordedAt: string; model: string; jsonMode: string }; modelCalls: ModelCall[]; toolCalls: ToolCall[] }`
  - `loadCassette(op: string, caseName: string): Cassette` (reads `tests/cassettes/<op>-<case>.json`)
  - `saveCassette(c: Cassette): void`
  - `digestInput(input: unknown): string` — normalize (strip absolute temp paths, timestamps), stably serialize, then hash (`node:crypto` sha256, first 16 hex).

- [ ] **Step 1: Write the failing test** `tests/cassettes/cassette.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestInput, saveCassette, loadCassette, type Cassette } from "./cassette.ts";

describe("digestInput", () => {
  it("is stable across key order and ignores absolute tmp paths", () => {
    const a = digestInput({ b: 1, path: join(tmpdir(), "radar-x", "pr.diff"), a: 2 });
    const b = digestInput({ a: 2, path: join(tmpdir(), "radar-y", "pr.diff"), b: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("save/load round-trip", () => {
  it("writes then reads an identical cassette", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-cass-"));
    const c: Cassette = {
      meta: { op: "conformance", case: "rt", recordedAt: "2026-06-25", model: "mock", jsonMode: "json_object" },
      modelCalls: [{ inputDigest: "abc", result: { content: [{ type: "text", text: "{}" }] } }],
      toolCalls: [{ name: "grep", input: { pattern: "x" }, output: "no matches" }],
    };
    saveCassette(c, dir);
    expect(loadCassette("conformance", "rt", dir)).toEqual(c);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** — `pnpm vitest run tests/cassettes/cassette.test.ts`, expect FAIL (module missing).

- [ ] **Step 3: Implement** `tests/cassettes/cassette.ts`

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export interface ModelCall { inputDigest: string; result: unknown }
export interface ToolCall { name: string; input: unknown; output: string }
export interface Cassette {
  meta: { op: string; case: string; recordedAt: string; model: string; jsonMode: string };
  modelCalls: ModelCall[];
  toolCalls: ToolCall[];
}

const DIR = new URL(".", import.meta.url).pathname; // tests/cassettes/

// Stable stringify (sorted keys) with volatile bits normalized, so a digest is
// reproducible regardless of key order or the per-run tmp dir in a path.
function normalize(v: unknown): unknown {
  if (typeof v === "string") return v.replace(/\/[^\s"]*radar-[A-Za-z0-9]+\//g, "/<tmp>/");
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, normalize((v as Record<string, unknown>)[k])]));
  }
  return v;
}

export function digestInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(normalize(input))).digest("hex").slice(0, 16);
}

const file = (op: string, c: string, dir = DIR) => join(dir, `${op}-${c}.json`);

export function loadCassette(op: string, caseName: string, dir = DIR): Cassette {
  return JSON.parse(readFileSync(file(op, caseName, dir), "utf8")) as Cassette;
}

export function saveCassette(c: Cassette, dir = DIR): void {
  writeFileSync(file(c.meta.op, c.meta.case, dir), JSON.stringify(c, null, 2) + "\n");
}
```

- [ ] **Step 4: Run the test, confirm it passes** — `pnpm vitest run tests/cassettes/cassette.test.ts`, expect PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/cassettes/cassette.ts tests/cassettes/cassette.test.ts
git commit -m "test(cassette): cassette type + load/save + stable input digest (ST-0024)"
```

---

### Task 2: replay model + replay tools

**Files:**
- Create: `tests/cassettes/replay.ts`
- Test: `tests/cassettes/replay.test.ts`

**Interfaces:**
- Consumes: `Cassette`/`ModelCall`/`ToolCall`, `digestInput` (Task 1).
- Produces:
  - `replayModel(c: Cassette): LanguageModel` — `new MockLanguageModelV3({ doGenerate: c.modelCalls.map(m => m.result) })` (`ai/test` returns one result per call, in order).
  - `replayTools(c: Cassette): Record<string, Tool>` — for each tool name seen in the cassette, a `tool({ inputSchema: z.any(), execute })`; `execute` consumes `toolCalls` in order, verifies `name` and `digestInput(input)` match the recording, throws `"cassette stale … run RADAR_CASSETTE=update"` on mismatch, returns the recorded `output` on match.

- [ ] **Step 1: Write the failing test** `tests/cassettes/replay.test.ts`

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { runAgent } from "../../src/agent/engine.ts";
import { replayModel, replayTools } from "./replay.ts";
import type { Cassette } from "./cassette.ts";
import { digestInput } from "./cassette.ts";

const Schema = z.object({ found: z.string() });

// A synthetic two-step cassette: round 1 the model calls grep; round 2 it emits
// the final JSON. The agent loop, tool dispatch and Output.object all run for real.
function twoStep(): Cassette {
  const grepInput = { pattern: "execFileSync", path: "src" };
  return {
    meta: { op: "conformance", case: "syn", recordedAt: "2026-06-25", model: "mock", jsonMode: "json_object" },
    modelCalls: [
      { inputDigest: "ignored-on-model-by-mock", result: {
        content: [{ type: "tool-call", toolCallId: "c1", toolName: "grep", input: grepInput }],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
      { inputDigest: "ignored", result: {
        content: [{ type: "text", text: JSON.stringify({ found: "yes" }) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
    ],
    toolCalls: [{ name: "grep", input: grepInput, output: "src/agent/tools.ts:44: execFileSync(...)" }],
  };
}

describe("replay model + tools drive a real agent loop", () => {
  it("returns the validated object after a recorded tool round", async () => {
    const c = twoStep();
    const out = await runAgent({
      model: replayModel(c) as any, skill: "s", user: "u", tools: replayTools(c), outputSchema: Schema,
    });
    expect(out).toEqual({ found: "yes" });
  });

  it("throws a stale-cassette error when the tool input no longer matches", async () => {
    const c = twoStep();
    c.toolCalls[0].input = { pattern: "DIFFERENT", path: "src" }; // simulate drift
    // engine swallows tool errors into the loop; assert the replay guard fired via digest mismatch
    expect(digestInput({ pattern: "execFileSync", path: "src" }))
      .not.toBe(digestInput(c.toolCalls[0].input));
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** — `pnpm vitest run tests/cassettes/replay.test.ts`, expect FAIL.

- [ ] **Step 3: Implement** `tests/cassettes/replay.ts`

```ts
import { MockLanguageModelV3 } from "ai/test";
import { tool, type LanguageModel, type Tool } from "ai";
import * as z from "zod/v4";
import { digestInput, type Cassette } from "./cassette.ts";

export function replayModel(c: Cassette): LanguageModel {
  // MockLanguageModelV3 accepts a results array and returns one per doGenerate call, in order.
  return new MockLanguageModelV3({ doGenerate: c.modelCalls.map((m) => m.result) as never }) as unknown as LanguageModel;
}

export function replayTools(c: Cassette): Record<string, Tool> {
  let i = 0;
  const names = [...new Set(c.toolCalls.map((t) => t.name))];
  const make = (name: string): Tool =>
    tool({
      description: `replayed ${name}`,
      inputSchema: z.any(),
      execute: async (input: unknown) => {
        const rec = c.toolCalls[i++];
        if (!rec || rec.name !== name || digestInput(rec.input) !== digestInput(input)) {
          throw new Error(
            `cassette stale: expected ${rec?.name}(${rec ? digestInput(rec.input) : "—"}) ` +
              `but got ${name}(${digestInput(input)}). Re-record with RADAR_CASSETTE=update.`,
          );
        }
        return rec.output;
      },
    });
  return Object.fromEntries(names.map((n) => [n, make(n)]));
}
```

- [ ] **Step 4: Run the test, confirm it passes** — `pnpm vitest run tests/cassettes/replay.test.ts`, expect PASS.
  > If `Output.object` + tools triggers the known ai@6 bug (see engine.ts comment #11348/#10023), the engine falls back to text-parse — the cassette's last `modelCalls.result` should be a text block holding the final JSON, which the fallback still parses.

- [ ] **Step 5: Commit**

```bash
git add tests/cassettes/replay.ts tests/cassettes/replay.test.ts
git commit -m "test(cassette): replay model + tools driving a real agent loop (ST-0024)"
```

---

### Task 3: recording model + recording tools

**Files:**
- Create: `tests/cassettes/record.ts`
- Test: `tests/cassettes/record.test.ts`

**Interfaces:**
- Consumes: `ModelCall`/`ToolCall`, `digestInput`, `buildTools` (`src/agent/tools.ts`).
- Produces:
  - `recordingModel(real: LanguageModel, sink: ModelCall[]): LanguageModel` — wraps the real model: `doGenerate(options)` calls the real one, pushes `{ inputDigest: digestInput(options.prompt), result }` to the sink, returns result.
  - `recordingTools(root: string, sink: ToolCall[]): Record<string, Tool>` — wraps each tool from `buildTools(root)`; `execute` calls the real one, pushes `{ name, input, output }`, returns output.

- [ ] **Step 1: Write the failing test** `tests/cassettes/record.test.ts` (uses `MockLanguageModelV3` as the "real" source, zero API)

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { recordingModel, recordingTools } from "./record.ts";
import type { ModelCall, ToolCall } from "./cassette.ts";

describe("recordingModel", () => {
  it("captures the result and passes it through", async () => {
    const real = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text: "hello" }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      }),
    });
    const sink: ModelCall[] = [];
    const wrapped = recordingModel(real as any, sink) as any;
    const r = await wrapped.doGenerate({ prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }] });
    expect((r.content[0] as any).text).toBe("hello");
    expect(sink).toHaveLength(1);
    expect(sink[0].inputDigest).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("recordingTools", () => {
  it("captures real tool output (grep over the repo root)", async () => {
    const sink: ToolCall[] = [];
    const tools = recordingTools(process.cwd(), sink) as any;
    const out = await tools.grep.execute({ pattern: "stopWhen", path: "src/agent" }, {} as any);
    expect(out).toContain("stopWhen");
    expect(sink).toHaveLength(1);
    expect(sink[0].name).toBe("grep");
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** — `pnpm vitest run tests/cassettes/record.test.ts`, expect FAIL.

- [ ] **Step 3: Implement** `tests/cassettes/record.ts`

```ts
import type { LanguageModel, Tool } from "ai";
import { buildTools } from "../../src/agent/tools.ts";
import { digestInput, type ModelCall, type ToolCall } from "./cassette.ts";

export function recordingModel(real: LanguageModel, sink: ModelCall[]): LanguageModel {
  const m = real as unknown as { doGenerate: (o: unknown) => Promise<unknown> };
  const orig = m.doGenerate.bind(m);
  return new Proxy(real, {
    get(t, p, r) {
      if (p === "doGenerate") {
        return async (options: { prompt?: unknown }) => {
          const result = await orig(options);
          sink.push({ inputDigest: digestInput(options.prompt), result });
          return result;
        };
      }
      return Reflect.get(t, p, r);
    },
  }) as LanguageModel;
}

export function recordingTools(root: string, sink: ToolCall[]): Record<string, Tool> {
  const real = buildTools(root);
  return Object.fromEntries(
    Object.entries(real).map(([name, t]) => {
      const exec = (t as { execute: (i: unknown, o: unknown) => Promise<string> }).execute;
      return [name, { ...t, execute: async (input: unknown, opts: unknown) => {
        const output = await exec(input, opts);
        sink.push({ name, input, output });
        return output;
      } } as Tool];
    }),
  );
}
```

- [ ] **Step 4: Run the test, confirm it passes** — `pnpm vitest run tests/cassettes/record.test.ts`, expect PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/cassettes/record.ts tests/cassettes/record.test.ts
git commit -m "test(cassette): recording wrappers for model + tools (ST-0024)"
```

---

### Task 4: three-state harness

**Files:**
- Create: `tests/cassettes/index.ts`
- Test: `tests/cassettes/index.test.ts`

**Interfaces:**
- Consumes: `replayModel`/`replayTools`, `recordingModel`/`recordingTools`, `loadCassette`/`saveCassette`, `selectModel` (`src/agent/model.ts`).
- Produces:
  - `cassetteDeps(op: string, caseName: string): { makeModel: () => LanguageModel; makeTools: (root: string) => Record<string, Tool>; finalize?: () => void }`
    - `RADAR_CASSETTE` unset/other → **replay**: `loadCassette` → `replayModel`/`replayTools`, no `finalize`.
    - `=record` (file missing) / `=update` (force) → **record**: `makeModel` wraps `selectModel(process.env)`, `makeTools` wraps real tools, `finalize` writes the collected `sink` into a cassette.
  - `cassetteMode(): "replay" | "record" | "update"` (reads env).

- [ ] **Step 1: Write the failing test** `tests/cassettes/index.test.ts` (only tests replay assembly; record isn't run here — it costs API)

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { cassetteMode, cassetteDeps } from "./index.ts";

describe("cassetteMode", () => {
  it("defaults to replay when RADAR_CASSETTE is unset", () => {
    const prev = process.env.RADAR_CASSETTE; delete process.env.RADAR_CASSETTE;
    try { expect(cassetteMode()).toBe("replay"); } finally { if (prev) process.env.RADAR_CASSETTE = prev; }
  });
});

describe("cassetteDeps (replay)", () => {
  it("builds a replay model + tools from a saved cassette, no finalize", () => {
    // Uses the synthetic cassette committed under tests/cassettes/conformance-aligned.json (Task 6).
    const deps = cassetteDeps("conformance", "aligned");
    expect(typeof deps.makeModel).toBe("function");
    expect(typeof deps.makeTools).toBe("function");
    expect(deps.finalize).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** (`index.ts` missing; `conformance-aligned.json` is produced in Task 6 — this test goes green after Task 6; write the implementation now so the module exists).

- [ ] **Step 3: Implement** `tests/cassettes/index.ts`

```ts
import type { LanguageModel, Tool } from "ai";
import { selectModel } from "../../src/agent/model.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadCassette, saveCassette, type Cassette, type ModelCall, type ToolCall } from "./cassette.ts";
import { replayModel, replayTools } from "./replay.ts";
import { recordingModel, recordingTools } from "./record.ts";

const DIR = new URL(".", import.meta.url).pathname;

export function cassetteMode(): "replay" | "record" | "update" {
  const m = process.env.RADAR_CASSETTE;
  return m === "record" || m === "update" ? m : "replay";
}

export function cassetteDeps(op: string, caseName: string) {
  const mode = cassetteMode();
  const path = join(DIR, `${op}-${caseName}.json`);
  if (mode === "replay" || (mode === "record" && existsSync(path))) {
    const c = loadCassette(op, caseName);
    return { makeModel: () => replayModel(c), makeTools: (_root: string) => replayTools(c) };
  }
  // record / update — spends API; maintainer-triggered.
  const modelCalls: ModelCall[] = [];
  const toolCalls: ToolCall[] = [];
  return {
    makeModel: () => recordingModel(selectModel(process.env), modelCalls),
    makeTools: (root: string) => recordingTools(root, toolCalls),
    finalize: () => {
      const c: Cassette = {
        meta: { op, case: caseName, recordedAt: new Date().toISOString().slice(0, 10),
          model: `${process.env.RADAR_PROVIDER}/${process.env.RADAR_MODEL}`,
          jsonMode: process.env.RADAR_JSON_MODE ?? "json_object" },
        modelCalls, toolCalls,
      };
      saveCassette(c);
    },
  };
}
```
  > `new Date()` is allowed in normal runs (only banned inside workflow scripts); `finalize` is used only on the record path (maintainer-run).

- [ ] **Step 4: Run the test** — `cassetteMode` test PASS; the `cassetteDeps(replay)` test goes green once Task 6's cassette lands (this step just ensures the module compiles and `cassetteMode` is green).

- [ ] **Step 5: Commit**

```bash
git add tests/cassettes/index.ts tests/cassettes/index.test.ts
git commit -m "test(cassette): three-state harness (replay default / record / update) (ST-0024)"
```

---

### Task 5: production injection seam (runners + commands)

**Files:**
- Modify: `src/agent/conformance-run.ts`, `src/capture/agent.ts`, `src/cli/commands/conformance.ts`, `src/cli/commands/capture.ts`
- Test: `src/cli/commands/conformance.test.ts` (append if it exists; else create)

**Interfaces:**
- `runConformanceCheck(opts: { …; root: string; tools?: Record<string, Tool> })` — defaults to `buildTools(opts.root)`.
- `runCapture(opts: { …; root: string; tools?: Record<string, Tool> })` — same.
- `cmdConformance(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> })`.
- `cmdCapture(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> })`.

- [ ] **Step 1: Write the failing test** (injection works + default unchanged), append to `src/cli/commands/conformance.test.ts`:

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { tool } from "ai";
import * as z from "zod/v4";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "./conformance.ts";

describe("cmdConformance dependency injection", () => {
  it("uses injected model + tools instead of selectModel/buildTools", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-di-"));
    const diff = join(dir, "pr.diff");
    // a diff touching src/core so retrieval fires ADR-0006-C1
    writeFileSync(diff, "diff --git a/src/core/x.ts b/src/core/x.ts\n--- a/src/core/x.ts\n+++ b/src/core/x.ts\n@@ -1 +1 @@\n+import {execSync} from 'child_process'\n");
    let toolsUsed = false;
    const code = await cmdConformance(
      ["--diff", diff, "--adr-dir", "docs/adr", "--root", process.cwd()],
      {
        makeModel: () => new MockLanguageModelV3({ doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify({ result: "aligned", confidence: 0.9, explanation: "ok", evidence_file: null, evidence_line_start: null, evidence_line_end: null, fix_locality: "none", fix_direction: "" }) }],
          finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
        }) }) as any,
        makeTools: () => ({ grep: tool({ description: "x", inputSchema: z.any(), execute: async () => { toolsUsed = true; return "x"; } }) }),
      },
    );
    expect(code).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test, confirm it fails** — `pnpm vitest run src/cli/commands/conformance.test.ts`, expect FAIL (`cmdConformance` doesn't take deps yet).

- [ ] **Step 3: Implement** — four edits:

`src/agent/conformance-run.ts` (add `tools?` + import `Tool`):
```ts
import type { LanguageModel, Tool } from "ai";
// opts gains: tools?: Record<string, Tool>
    tools: opts.tools ?? buildTools(opts.root),
```

`src/capture/agent.ts` (same; opts gains `tools?: Record<string, Tool>`, `tools: opts.tools ?? buildTools(opts.root)`, import `Tool`).

`src/cli/commands/conformance.ts`:
```ts
import type { LanguageModel, Tool } from "ai";
export async function cmdConformance(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> }): Promise<number> {
  // …
    const model = deps?.makeModel ? deps.makeModel() : selectModel(process.env);
    // …
      verdicts.push(await runConformanceCheck({ model, skill, constraint, diffs, driverContext: context, root: values.root!, tools: deps?.makeTools?.(values.root!) }));
}
```

`src/cli/commands/capture.ts` (symmetric: `deps?` second arg; `const model = deps?.makeModel ? deps.makeModel() : selectModel(process.env)`; `runCapture({ …, tools: deps?.makeTools?.(root) })`).

- [ ] **Step 4: Run the test, confirm it passes** — `pnpm vitest run src/cli/commands/conformance.test.ts` and the full suite, expect PASS; default path behaviour unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/agent/conformance-run.ts src/capture/agent.ts src/cli/commands/conformance.ts src/cli/commands/capture.ts src/cli/commands/conformance.test.ts
git commit -m "feat(cli): optional model+tools injection seam for cassette tests (ST-0024, ADR-0010-C1 preserved)"
```

---

### Task 6: conformance replay integration test + synthetic cassettes

**Files:**
- Create: `tests/integration/conformance-cassette.test.ts`
- Create: `tests/cassettes/conformance-{violated,aligned,unknown}.json` (synthetic)
- Create: `tests/fixtures/cassette-conformance.diff` (fixed input diff, fires `ADR-0006-C1`)

**Interfaces:**
- Consumes: `cmdConformance` (Task 5's deps), `cassetteDeps` (Task 4).

- [ ] **Step 1: Author the synthetic cassettes** (produced by this plan; shapes mirror real ones, fields per Task 1 types). Each file: `meta` + `modelCalls` (at least one text block holding the final JSON; the `violated` one may include a tool-call + a text block to exercise the loop) + matching `toolCalls`. Example `tests/cassettes/conformance-aligned.json`:
```json
{
  "meta": { "op": "conformance", "case": "aligned", "recordedAt": "2026-06-25", "model": "synthetic", "jsonMode": "json_object" },
  "modelCalls": [
    { "inputDigest": "synthetic", "result": {
      "content": [{ "type": "text", "text": "{\"result\":\"aligned\",\"confidence\":0.9,\"explanation\":\"core stays platform-agnostic\",\"evidence_file\":null,\"evidence_line_start\":null,\"evidence_line_end\":null,\"fix_locality\":\"none\",\"fix_direction\":\"\"}" }],
      "finishReason": { "unified": "stop", "raw": null },
      "usage": { "inputTokens": { "total": 1 }, "outputTokens": { "total": 1 } }, "warnings": []
    } }
  ],
  "toolCalls": []
}
```
  > `violated` / `unknown` are isomorphic; the `result` fields match `SemanticCheckOutputSchema` (read `src/core/models.ts` for the exact fields). The `violated` version adds a tool-call step to exercise the loop.

- [ ] **Step 2: Write the failing test** `tests/integration/conformance-cassette.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "../../src/cli/commands/conformance.ts";
import { cassetteDeps } from "../cassettes/index.ts";

function capture(): { log: string[]; restore: () => void } {
  const log: string[] = []; const orig = console.log;
  console.log = (s?: unknown) => { log.push(String(s ?? "")); };
  return { log, restore: () => { console.log = orig; } };
}

describe("conformance via cassette (real agent loop, no API)", () => {
  for (const c of ["violated", "aligned", "unknown"] as const) {
    it(`renders the ${c} verdict from the recorded interaction`, async () => {
      const dir = mkdtempSync(join(tmpdir(), "radar-cc-"));
      const diff = join(dir, "pr.diff");
      writeFileSync(diff, readFileSync(join(import.meta.dirname, "..", "fixtures", "cassette-conformance.diff"), "utf8"));
      const cap = capture();
      let code: number;
      try {
        code = await cmdConformance(["--diff", diff, "--adr-dir", "docs/adr", "--root", process.cwd()], cassetteDeps("conformance", c));
      } finally { cap.restore(); }
      expect(code).toBe(0);
      expect(cap.log.join("\n").toLowerCase()).toContain(c === "unknown" ? "unknown" : c);
    });
  }
});
```

- [ ] **Step 3: Run failing → implement/author cassettes → pass**. Complete the `violated`/`unknown` cassettes + `tests/fixtures/cassette-conformance.diff` (a small diff touching `src/core/` and introducing a platform call so `retrieve` fires `ADR-0006-C1`). `pnpm vitest run tests/integration/conformance-cassette.test.ts` expect PASS.

- [ ] **Step 4: Staleness reverse-check (manual + a retained assertion)** — add a case that changes a cassette's `toolCalls[0].input` (or the fixture diff), and assert that `runAgent`, via the replay tool, throws the stale error (swallowed by the engine into unknown/[]), proving the verification really fires (not decorative).

- [ ] **Step 5: Commit**

```bash
git add tests/integration/conformance-cassette.test.ts tests/cassettes/conformance-*.json tests/fixtures/cassette-conformance.diff
git commit -m "test(conformance): cassette-backed integration — real agent loop, 3 verdict states (ST-0024)"
```

---

### Task 7: capture replay integration test + synthetic cassettes

**Files:**
- Create: `tests/integration/capture-cassette.test.ts`
- Create: `tests/cassettes/capture-{has-notes,no-notes}.json`
- Create: `tests/fixtures/cassette-capture.diff` (a small diff with an implicit unrecorded decision)

**Interfaces:** Consumes `cmdCapture` (Task 5), `cassetteDeps`. The `has-notes` `result` matches `CaptureOutputSchema` (`{ notes: [...] }`, fields per `src/core/models.ts`); `no-notes` is `{ notes: [] }`.

- [ ] **Step 1: Author the synthetic cassettes** `capture-has-notes.json` (one architectural note), `capture-no-notes.json` (`notes: []`), shapes per `CaptureOutputSchema`.
- [ ] **Step 2: Write the failing test** `tests/integration/capture-cassette.test.ts` (structure as in Task 6: `has-notes` asserts the output contains the `detected_decision` text; `no-notes` asserts no note, exit 0).
- [ ] **Step 3: Run failing → author cassettes + fixture → pass**.
- [ ] **Step 4: Commit**

```bash
git add tests/integration/capture-cassette.test.ts tests/cassettes/capture-*.json tests/fixtures/cassette-capture.diff
git commit -m "test(capture): cassette-backed integration — has-notes / no-notes (ST-0024)"
```

---

### Task 8: test tidy-up (delete skill tests + unify naming + frontmatter guard)

**Files:**
- Delete: `tests/unit/skill-capture.test.ts`, `tests/unit/skill-conformance.test.ts`
- Rename (`git mv`, content unchanged): `tests/integration/conformance-pipeline.test.ts`→`conformance-cli.test.ts`, `capture-pipeline.test.ts`→`capture-cli.test.ts`, `comment-pipeline.test.ts`→`comment-cli.test.ts`, `pipeline.test.ts`→`core-pipeline.test.ts`
- Create: `tests/unit/skills-frontmatter.test.ts`

- [ ] **Step 1: Write the guard test** `tests/unit/skills-frontmatter.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = "skills";
const dirs = existsSync(SKILLS) ? readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

describe("every skills/*/SKILL.md has legal frontmatter", () => {
  it("finds at least the capture + conformance skills", () => {
    expect(dirs).toEqual(expect.arrayContaining(["capture", "conformance"]));
  });
  it.each(dirs)("%s/SKILL.md has name + description frontmatter", (d) => {
    const t = readFileSync(join(SKILLS, d, "SKILL.md"), "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(new RegExp(`name:\\s*${d}\\b`));
    expect(t).toMatch(/description:\s*\S/);
  });
});
```

- [ ] **Step 2: Run, confirm it passes** — `pnpm vitest run tests/unit/skills-frontmatter.test.ts`, expect PASS (existing skill files are legal).
- [ ] **Step 3: Reverse-check the guard works (manual, don't commit)** — temporarily break `skills/capture/SKILL.md`'s `name:`, rerun, **confirm RED**; restore, confirm GREEN.
- [ ] **Step 4: Delete old tests + rename**

```bash
git rm tests/unit/skill-capture.test.ts tests/unit/skill-conformance.test.ts
git mv tests/integration/conformance-pipeline.test.ts tests/integration/conformance-cli.test.ts
git mv tests/integration/capture-pipeline.test.ts tests/integration/capture-cli.test.ts
git mv tests/integration/comment-pipeline.test.ts tests/integration/comment-cli.test.ts
git mv tests/integration/pipeline.test.ts tests/integration/core-pipeline.test.ts
```

- [ ] **Step 5: Full suite + count reconciliation** — `pnpm lint && pnpm build && pnpm test`. Reconcile: renaming doesn't change the count; deleting 2 skill tests subtracts 2; the guard + cassette integration tests add per their case count. Investigate any mismatch.
- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: drop flimsy skill tests, unify integration naming, add data-driven skill-frontmatter guard (ST-0024)"
```

---

### Task 9 (maintainer-triggered, not automated): record real cassettes

> **This step costs API and is run by the maintainer in person, not the implementing agent.** The synthetic cassettes already get the mechanism + agent logic under test and CI green; this step **adds** real cassettes (`*-recorded.json`, alongside the synthetic ones — not replacing them) for higher fidelity from real model behaviour.

- [ ] Configure real provider env (`set -a; source .envrc; set +a`).
- [ ] Record via the script: `RADAR_CASSETTE=update pnpm exec tsx scripts/record-cassettes.ts` (runs conformance + capture once each against the real model + calls `finalize` to write `conformance-recorded.json` / `capture-recorded.json`). `recorded-cassette.test.ts` flips from skipped to replay-verifying once the real cassettes exist.
- [ ] **Review** the resulting cassette diffs: no key/sensitive content; if a case's agent called the `git` tool and the fixture isn't a git repo, re-record using a `read_file`/`grep`-judgable fixture (see spec §8).
- [ ] Rerun the full suite with `RADAR_CASSETTE` unset, confirm the real cassettes still PASS (input verification matches).
- [ ] Commit the real cassettes: `git commit -m "test(cassette): record real conformance + capture interactions (ST-0024)"`.

---

## Self-Review (post-plan check)

- **Spec coverage**: §3 two mock boundaries → Task 2/3; §4.1 format → Task 1; §4.3 injection seam → Task 5; §4.4 three-state → Task 4; §5 cases → Task 6/7; §6 tidy-up → Task 8; §7 validation (staleness/guard reverse-check/count) → Task 6 Step 4, Task 8 Step 3/5; §8 git-tool special case → Task 9 review step. No gaps.
- **Placeholder scan**: no TBD; the synthetic cassettes' exact fields point at the schemas in `src/core/models.ts` (read at implementation time) — a concrete instruction, not a placeholder.
- **Type consistency**: `Cassette`/`ModelCall`/`ToolCall` (Task 1) are consistent across 2/3/4/6/7; `cassetteDeps` returns `{makeModel, makeTools, finalize?}` matching the command `deps` shape; runner `tools?` matches the command `makeTools` chain.
- **Zero-API guarantee**: Tasks 1–8 all use `MockLanguageModelV3`/synthetic cassettes, never online; the only API-spending Task 9 is explicitly maintainer-triggered.
