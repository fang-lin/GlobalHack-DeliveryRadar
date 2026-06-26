# Agent 测试录放盒(cassette)实现计划

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-25-agent-test-cassettes-plan.en.md`） · 最后同步: 2026-06-25 · 两版冲突以中文为准**

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 conformance + capture 建 record/replay 录放盒,让 agent 的真实行为(工具循环 / `Output.object` 解析 / text-parse 兜底 / `toVerdict`)在零 API、确定的前提下被测;顺带清理测试套件。

**Architecture:** 在 agent 的两个外部边界 mock——模型(`MockLanguageModelV3`,`doGenerate` 接受结果数组按序返回)和工具(`tool().execute`,替换为按序返回录好结果)。agent 自身全真跑。回放校验输入,改了 prompt/工具就报错提示重录(防静默过期)。注入 seam:命令加可选 `deps`、runner 加可选 `tools`,生产路径默认值即现状。

**Tech Stack:** TypeScript/Node 22、ESM(`.ts` 导入后缀)、vitest、Vercel AI SDK `ai@6.0.208`、`ai/test` 的 `MockLanguageModelV3`、`zod/v4`。

## Global Constraints

- 测试基建放 `tests/cassettes/`,**不污染 `src/core`**(ADR-0006-C1);配置只 `process.env`(ADR-0006-C2)。
- 每个 LLM 操作仍只走共享引擎 `runAgent`(ADR-0010-C1);注入 seam 不改这条。
- ESM-only,所有相对导入带 `.ts` 后缀。
- **测试绝不调真 LLM**:`replay`(默认)CI 永不联网;`record`/`update` 花 API,**维护者触发,不由 Claude/实现 agent 触发**。
- 提交禁 AI 署名,引用 ID(`ST-0024`、`docs/specs/2026-06-25-agent-test-cassettes-design.zh.md`)。
- cassette 进 git 前确认不含 key/敏感内容。
- 保持 `pnpm lint && pnpm build && pnpm test` 全绿。

## File Structure

- **创建** `tests/cassettes/cassette.ts` — cassette 类型 + `loadCassette`/`saveCassette` + `digestInput`。
- **创建** `tests/cassettes/cassette.test.ts` — 上面的单测。
- **创建** `tests/cassettes/replay.ts` — `replayModel(cassette)` + `replayTools(cassette)`。
- **创建** `tests/cassettes/replay.test.ts` — 用合成 cassette 验证回放 + 校验。
- **创建** `tests/cassettes/record.ts` — `recordingModel(real, sink)` + `recordingTools(real, sink)`。
- **创建** `tests/cassettes/record.test.ts` — 用 `MockLanguageModelV3` 当"真"源验证录制。
- **创建** `tests/cassettes/index.ts` — `cassetteDeps(op, caseName)` 三态开关组装 `{makeModel, makeTools}`。
- **创建** `tests/cassettes/*.json` — 合成 cassette(本计划产出);真 cassette 由维护者后续录。
- **修改** `src/agent/conformance-run.ts` — `runConformanceCheck` 加可选 `tools`。
- **修改** `src/capture/agent.ts` — `runCapture` 加可选 `tools`。
- **修改** `src/cli/commands/conformance.ts` — `cmdConformance(argv, deps?)`。
- **修改** `src/cli/commands/capture.ts` — `cmdCapture(argv, deps?)`。
- **创建** `tests/integration/conformance-cassette.test.ts` / `capture-cassette.test.ts` — 回放集成测试。
- **改名** `tests/integration/{conformance,capture,comment}-pipeline.test.ts` → `*-cli.test.ts`;`pipeline.test.ts` → `core-pipeline.test.ts`(`git mv`,内容不改)。
- **删** `tests/unit/skill-capture.test.ts`、`tests/unit/skill-conformance.test.ts`。
- **创建** `tests/unit/skills-frontmatter.test.ts` — 数据驱动 guard。

---

### Task 1: cassette 类型 + 读写 + digest

**Files:**
- Create: `tests/cassettes/cassette.ts`
- Test: `tests/cassettes/cassette.test.ts`

**Interfaces:**
- Produces:
  - `interface ModelCall { inputDigest: string; result: unknown }` — `result` 是 `LanguageModelV3GenerateResult`(回放原样喂给 `MockLanguageModelV3`)。
  - `interface ToolCall { name: string; input: unknown; output: string }`
  - `interface Cassette { meta: { op: string; case: string; recordedAt: string; model: string; jsonMode: string }; modelCalls: ModelCall[]; toolCalls: ToolCall[] }`
  - `loadCassette(op: string, caseName: string): Cassette`(读 `tests/cassettes/<op>-<case>.json`)
  - `saveCassette(c: Cassette): void`
  - `digestInput(input: unknown): string` — 规范化(剔除绝对临时路径、时间戳)后 JSON 稳定序列化再 hash(`node:crypto` sha256,取前 16 hex)。

- [ ] **Step 1: 写失败测试** `tests/cassettes/cassette.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/cassettes/cassette.test.ts`,预期 FAIL(模块不存在)。

- [ ] **Step 3: 实现** `tests/cassettes/cassette.ts`

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/cassettes/cassette.test.ts`,预期 PASS。

- [ ] **Step 5: 提交**

```bash
git add tests/cassettes/cassette.ts tests/cassettes/cassette.test.ts
git commit -m "test(cassette): cassette type + load/save + stable input digest (ST-0024)"
```

---

### Task 2: 回放模型 + 回放工具

**Files:**
- Create: `tests/cassettes/replay.ts`
- Test: `tests/cassettes/replay.test.ts`

**Interfaces:**
- Consumes: `Cassette`/`ModelCall`/`ToolCall`、`digestInput`(Task 1)。
- Produces:
  - `replayModel(c: Cassette): LanguageModel` — `new MockLanguageModelV3({ doGenerate: c.modelCalls.map(m => m.result) })`(`ai/test` 支持结果数组按序返回)。
  - `replayTools(c: Cassette): Record<string, Tool>` — 为 cassette 里出现过的每个工具名造一个 `tool({ inputSchema: z.any(), execute })`;`execute` 按 `toolCalls` 顺序消费,校验 `name` 与 `digestInput(input)` 与录制一致,不一致 `throw new Error("cassette stale … run RADAR_CASSETTE=update")`,一致则返回录好的 `output`。

- [ ] **Step 1: 写失败测试** `tests/cassettes/replay.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/cassettes/replay.test.ts`,预期 FAIL。

- [ ] **Step 3: 实现** `tests/cassettes/replay.ts`

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/cassettes/replay.test.ts`,预期 PASS。
  > 若 `Output.object` + tools 在 ai@6 触发已知 bug(见 engine.ts 注释 #11348/#10023),引擎会走 text-parse 兜底——cassette 的最后一次 `modelCalls.result` 应是含最终 JSON 的 text 块,兜底仍能解析。

- [ ] **Step 5: 提交**

```bash
git add tests/cassettes/replay.ts tests/cassettes/replay.test.ts
git commit -m "test(cassette): replay model + tools driving a real agent loop (ST-0024)"
```

---

### Task 3: 录制模型 + 录制工具

**Files:**
- Create: `tests/cassettes/record.ts`
- Test: `tests/cassettes/record.test.ts`

**Interfaces:**
- Consumes: `ModelCall`/`ToolCall`、`digestInput`、`buildTools`(`src/agent/tools.ts`)。
- Produces:
  - `recordingModel(real: LanguageModel, sink: ModelCall[]): LanguageModel` — 包真模型:`doGenerate(options)` 调真的,把 `{ inputDigest: digestInput(options.prompt), result }` 推入 sink,返回 result。
  - `recordingTools(root: string, sink: ToolCall[]): Record<string, Tool>` — 包 `buildTools(root)` 的每个工具,`execute` 调真的,把 `{ name, input, output }` 推入 sink,返回 output。

- [ ] **Step 1: 写失败测试** `tests/cassettes/record.test.ts`(用 `MockLanguageModelV3` 当"真"源,零 API)

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/cassettes/record.test.ts`,预期 FAIL。

- [ ] **Step 3: 实现** `tests/cassettes/record.ts`

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/cassettes/record.test.ts`,预期 PASS。

- [ ] **Step 5: 提交**

```bash
git add tests/cassettes/record.ts tests/cassettes/record.test.ts
git commit -m "test(cassette): recording wrappers for model + tools (ST-0024)"
```

---

### Task 4: 三态开关 harness

**Files:**
- Create: `tests/cassettes/index.ts`
- Test: `tests/cassettes/index.test.ts`

**Interfaces:**
- Consumes: `replayModel`/`replayTools`、`recordingModel`/`recordingTools`、`loadCassette`/`saveCassette`、`selectModel`(`src/agent/model.ts`)。
- Produces:
  - `cassetteDeps(op: string, caseName: string): { makeModel: () => LanguageModel; makeTools: (root: string) => Record<string, Tool>; finalize?: () => void }`
    - `RADAR_CASSETTE` 未设/其它 → **replay**:`loadCassette` → `replayModel`/`replayTools`,无 `finalize`。
    - `=record`(缺文件)/`=update`(强制) → **record**:`makeModel` 包 `selectModel(process.env)`、`makeTools` 包真工具,`finalize` 把收集到的 `sink` 写成 cassette。
  - `cassetteMode(): "replay" | "record" | "update"`(读 env)。

- [ ] **Step 1: 写失败测试** `tests/cassettes/index.test.ts`(只测 replay 装配,record 不在此跑——它花 API)

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

- [ ] **Step 2: 跑测试确认失败**(`index.ts` 不存在;`conformance-aligned.json` 由 Task 6 产出——此测试在 Task 6 后转绿,先写实现让模块存在)。

- [ ] **Step 3: 实现** `tests/cassettes/index.ts`

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
  > `new Date()` 在普通运行允许(只在 workflow 脚本里被禁);`finalize` 仅 record 路径(维护者跑)用到。

- [ ] **Step 4: 跑测试** — `cassetteMode` 测试 PASS;`cassetteDeps(replay)` 测试待 Task 6 的 cassette 落地后转绿(本步先确保模块编译、`cassetteMode` 绿)。

- [ ] **Step 5: 提交**

```bash
git add tests/cassettes/index.ts tests/cassettes/index.test.ts
git commit -m "test(cassette): three-state harness (replay default / record / update) (ST-0024)"
```

---

### Task 5: 生产注入 seam(runner + 命令)

**Files:**
- Modify: `src/agent/conformance-run.ts`、`src/capture/agent.ts`、`src/cli/commands/conformance.ts`、`src/cli/commands/capture.ts`
- Test: `src/cli/commands/conformance.test.ts`(若已存在则追加;否则新建)

**Interfaces:**
- `runConformanceCheck(opts: { …; root: string; tools?: Record<string, Tool> })` — 默认 `buildTools(opts.root)`。
- `runCapture(opts: { …; root: string; tools?: Record<string, Tool> })` — 同上。
- `cmdConformance(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> })`。
- `cmdCapture(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> })`。

- [ ] **Step 1: 写失败测试**(注入生效 + 默认不变) `src/cli/commands/conformance.test.ts` 追加:

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run src/cli/commands/conformance.test.ts`,预期 FAIL(`cmdConformance` 还不接 deps)。

- [ ] **Step 3: 实现** — 四处改动:

`src/agent/conformance-run.ts`(加 `tools?` + import `Tool`):
```ts
import type { LanguageModel, Tool } from "ai";
// opts 增加: tools?: Record<string, Tool>
    tools: opts.tools ?? buildTools(opts.root),
```

`src/capture/agent.ts`(同样,opts 加 `tools?: Record<string, Tool>`,`tools: opts.tools ?? buildTools(opts.root)`,import 补 `Tool`)。

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

`src/cli/commands/capture.ts`(对称:`deps?` 第二参;`const model = deps?.makeModel ? deps.makeModel() : selectModel(process.env)`;`runCapture({ …, tools: deps?.makeTools?.(root) })`)。

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run src/cli/commands/conformance.test.ts` 与全套,预期 PASS;默认路径行为不变。

- [ ] **Step 5: 提交**

```bash
git add src/agent/conformance-run.ts src/capture/agent.ts src/cli/commands/conformance.ts src/cli/commands/capture.ts src/cli/commands/conformance.test.ts
git commit -m "feat(cli): optional model+tools injection seam for cassette tests (ST-0024, ADR-0010-C1 preserved)"
```

---

### Task 6: conformance 回放集成测试 + 合成 cassette

**Files:**
- Create: `tests/integration/conformance-cassette.test.ts`
- Create: `tests/cassettes/conformance-{violated,aligned,unknown}.json`(合成)
- Create: `tests/fixtures/cassette-conformance.diff`(固定输入 diff,触发 `ADR-0006-C1`)

**Interfaces:**
- Consumes: `cmdConformance`(Task 5 的 deps)、`cassetteDeps`(Task 4)。

- [ ] **Step 1: 造合成 cassette**(本计划手工产出;形状仿真,字段照 Task 1 类型)。每个文件:`meta` + `modelCalls`(至少一次 text 块含最终 JSON;`violated` 那条可含一次 tool-call + 一次 text 演示工具循环)+ 对应 `toolCalls`。例 `tests/cassettes/conformance-aligned.json`:
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
  > `violated` / `unknown` 同构,`result` 字段对应 `SemanticCheckOutputSchema`(读 `src/core/models.ts` 取准确字段)。`violated` 版加一个 tool-call 步演示循环。

- [ ] **Step 2: 写失败测试** `tests/integration/conformance-cassette.test.ts`

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

- [ ] **Step 3: 跑测试确认失败 → 实现/补 cassette → 通过**。补齐 `violated`/`unknown` 两个 cassette + `tests/fixtures/cassette-conformance.diff`(一个触碰 `src/core/` 且引入平台调用的小 diff,使 `retrieve` 命中 `ADR-0006-C1`)。`pnpm vitest run tests/integration/conformance-cassette.test.ts` 预期 PASS。

- [ ] **Step 4: 防过期反向验证(手动 + 留断言)** — 在测试里加一条:把某 cassette 的 `toolCalls[0].input` 改一个值(或 fixture diff 改动),断言 `runAgent` 经 replay tool 抛 stale 错误被引擎吞成 unknown/[],证明校验真的生效(不是摆设)。

- [ ] **Step 5: 提交**

```bash
git add tests/integration/conformance-cassette.test.ts tests/cassettes/conformance-*.json tests/fixtures/cassette-conformance.diff
git commit -m "test(conformance): cassette-backed integration — real agent loop, 3 verdict states (ST-0024)"
```

---

### Task 7: capture 回放集成测试 + 合成 cassette

**Files:**
- Create: `tests/integration/capture-cassette.test.ts`
- Create: `tests/cassettes/capture-{has-notes,no-notes}.json`
- Create: `tests/fixtures/cassette-capture.diff`(含一个隐式未记录决策的小 diff)

**Interfaces:** Consumes `cmdCapture`(Task 5)、`cassetteDeps`。`has-notes` 的 `result` 是 `CaptureOutputSchema` 形状(`{ notes: [...] }`,字段照 `src/core/models.ts`);`no-notes` 是 `{ notes: [] }`。

- [ ] **Step 1: 造合成 cassette** `capture-has-notes.json`(一条 architectural note)、`capture-no-notes.json`(`notes: []`),形状照 `CaptureOutputSchema`。
- [ ] **Step 2: 写失败测试** `tests/integration/capture-cassette.test.ts`(结构同 Task 6:`has-notes` 断言输出含 `detected_decision` 文本;`no-notes` 断言无 note、退出 0)。
- [ ] **Step 3: 跑失败 → 补 cassette + fixture → 通过**。
- [ ] **Step 4: 提交**

```bash
git add tests/integration/capture-cassette.test.ts tests/cassettes/capture-*.json tests/fixtures/cassette-capture.diff
git commit -m "test(capture): cassette-backed integration — has-notes / no-notes (ST-0024)"
```

---

### Task 8: 测试整理(删 skill 测试 + 统一命名 + frontmatter guard)

**Files:**
- Delete: `tests/unit/skill-capture.test.ts`、`tests/unit/skill-conformance.test.ts`
- Rename(`git mv`,内容不改): `tests/integration/conformance-pipeline.test.ts`→`conformance-cli.test.ts`、`capture-pipeline.test.ts`→`capture-cli.test.ts`、`comment-pipeline.test.ts`→`comment-cli.test.ts`、`pipeline.test.ts`→`core-pipeline.test.ts`
- Create: `tests/unit/skills-frontmatter.test.ts`

- [ ] **Step 1: 写 guard 测试** `tests/unit/skills-frontmatter.test.ts`

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

- [ ] **Step 2: 跑确认通过** — `pnpm vitest run tests/unit/skills-frontmatter.test.ts`,预期 PASS(现有 skill 文件合法)。
- [ ] **Step 3: 反向验证 guard 有效(手动,不提交)** — 临时把 `skills/capture/SKILL.md` 的 `name:` 改坏,重跑,**确认 RED**;改回,确认 GREEN。
- [ ] **Step 4: 删旧测试 + 改名**

```bash
git rm tests/unit/skill-capture.test.ts tests/unit/skill-conformance.test.ts
git mv tests/integration/conformance-pipeline.test.ts tests/integration/conformance-cli.test.ts
git mv tests/integration/capture-pipeline.test.ts tests/integration/capture-cli.test.ts
git mv tests/integration/comment-pipeline.test.ts tests/integration/comment-cli.test.ts
git mv tests/integration/pipeline.test.ts tests/integration/core-pipeline.test.ts
```

- [ ] **Step 5: 全套 + 计数对账** — `pnpm lint && pnpm build && pnpm test`。核对:重命名不改数;删 2 个 skill 测试 -2;guard + cassette 集成测试按 case 数加。对不上即排查。
- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "test: drop flimsy skill tests, unify integration naming, add data-driven skill-frontmatter guard (ST-0024)"
```

---

### Task 9(维护者触发,非自动):录制真 cassette

> **这一步花 API,由维护者本人执行,不由实现 agent 触发。** 合成 cassette 已让机制 + agent 逻辑被测、CI 绿;这一步**新增**真 cassette(`*-recorded.json`,与合成 cassette 并存、不替换),用真实模型行为提高保真度。

- [ ] 配置真 provider env(`set -a; source .envrc; set +a`)。
- [ ] 用录制脚本录制:`RADAR_CASSETTE=update pnpm exec tsx scripts/record-cassettes.ts`(脚本对 conformance + capture 各跑一次真模型 + 调 `finalize` 写出 `conformance-recorded.json` / `capture-recorded.json`)。`recorded-cassette.test.ts` 在真 cassette 存在后自动从 skip 变为回放校验。
- [ ] **审查** diff 出来的 cassette:不含 key/敏感内容;若某用例 agent 调了 `git` 工具而 fixture 非 git 仓库,改用 `read_file`/`grep` 能判的 fixture 重录(见 spec §8)。
- [ ] 不设 `RADAR_CASSETTE` 重跑全套,确认真 cassette 仍 PASS(校验输入匹配)。
- [ ] 提交真 cassette:`git commit -m "test(cassette): record real conformance + capture interactions (ST-0024)"`。

---

## Self-Review(写完计划后自查)

- **Spec 覆盖**:§3 两个 mock 边界 → Task 2/3;§4.1 格式 → Task 1;§4.3 注入 seam → Task 5;§4.4 三态 → Task 4;§5 用例 → Task 6/7;§6 整理 → Task 8;§7 验证(防过期/guard 反向/计数)→ Task 6 Step 4、Task 8 Step 3/5;§8 git 工具特例 → Task 9 审查步。无遗漏。
- **占位扫描**:无 TBD;合成 cassette 的精确字段指向 `src/core/models.ts` 的 schema(实现时读取),属具体指令非占位。
- **类型一致**:`Cassette`/`ModelCall`/`ToolCall`(Task 1)在 2/3/4/6/7 一致;`cassetteDeps` 返回 `{makeModel, makeTools, finalize?}` 与命令 `deps` 形状一致;runner `tools?` 与命令 `makeTools` 链路一致。
- **零 API 保证**:Task 1–8 全用 `MockLanguageModelV3`/合成 cassette,不联网;唯一花 API 的 Task 9 明确维护者触发。
