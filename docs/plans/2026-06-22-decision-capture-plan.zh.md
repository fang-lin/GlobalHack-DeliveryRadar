# Decision Capture 实现计划

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-22-decision-capture-plan.en.md`，提交 PR 前补） · 最后同步: 2026-06-22**
>
> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现。步骤用 `- [ ]` 勾选。

**Goal:** 实现 `radar capture` —— 一个在 PR 合并后调查改动、起草 Decision Note 的技能驱动 agent，按 `ADR-0009` / 设计文档 `docs/specs/2026-06-22-decision-capture-design.zh.md` / 故事 `ST-0005`。

**Architecture:** 纯核心（`src/core/`）只加数据契约 + 纯渲染；调查 agent 在边缘 `src/capture/`，自己用 Vercel AI SDK 写（工具循环 + 只读工具 + 结构化输出 + 兜底解析）；方法论在 `skills/capture/SKILL.md`；CLI `radar capture` 是边缘；平台写动作（开草稿 PR/issue）在 `radar.yml` 工作流。

**Tech Stack:** TypeScript / Node 22 / ESM / `zod/v4` / vitest。Vercel AI SDK：`ai@6.0.208`、`@ai-sdk/anthropic@3.0.85`、`@ai-sdk/openai-compatible@2.0.51`、`@ai-sdk/gateway@3.0.133`（DeepSeek 经网关）。

## Global Constraints

- **ESM-only**，`src/` 无 CommonJS（ADR-0008-C1）。相对导入写 `.ts` 后缀（tsc `rewriteRelativeImportExtensions`）。
- **`src/core/` 不碰 git/平台、不 import AI SDK/agent**（ADR-0006-C1 现细化为 `src/core/`；ADR-0009-C1）。agent + AI SDK + 只读工具只在 `src/capture/`。
- **配置只来自 `process.env`**，`src/` 不读 `.env`（ADR-0006-C2）。
- **capture 只起草**：不接受/合并 ADR、不 push、不阻塞合并；草稿 PR/issue 由工作流开（ADR-0009-C2 / NFR-TRUST-1）。
- **测试不调真 LLM**：agent 用 `MockLanguageModelV3`；`--replay` 跑通不触网（ST-0024）。
- **空结果合法**：`{ notes: [] }` 是正常结果，不硬造决策。
- **提交信息**：Conventional Commits，**禁 AI 署名**，引用 `ST-0005` / `ADR-0009`。
- 工具描述 / 用户可见文案为英文（产物语言）。

---

### Task 1: DecisionNote 数据契约（纯核心）

**Files:**
- Modify: `src/core/models.ts`
- Test: `tests/unit/decision-note.test.ts`

**Interfaces:**
- Produces: `DecisionNoteSchema` / `DecisionNote`、`CaptureOutputSchema` / `CaptureOutput`、`SuggestedClass`。

- [ ] **Step 1: 写失败测试** — `tests/unit/decision-note.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/decision-note.test.ts` → FAIL（导出不存在）。

- [ ] **Step 3: 实现** — 追加到 `src/core/models.ts`（文件已 `import * as z from "zod/v4";`）：

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/decision-note.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/core/models.ts tests/unit/decision-note.test.ts
git commit -m "feat(core): DecisionNote data contract (DM-DECISION-NOTE) (ST-0005)"
```

---

### Task 2: Decision Note 渲染（纯核心）

**Files:**
- Create: `src/core/capture-comment.ts`
- Test: `tests/unit/capture-comment.test.ts`

**Interfaces:**
- Consumes: `DecisionNote`（Task 1）。
- Produces: `decisionNotesMarkdown(notes: DecisionNote[]): string`、`decisionNoteMarkdown(note: DecisionNote): string`。

- [ ] **Step 1: 写失败测试** — `tests/unit/capture-comment.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/capture-comment.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/core/capture-comment.ts`：

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/capture-comment.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/core/capture-comment.ts tests/unit/capture-comment.test.ts
git commit -m "feat(core): render Decision Notes to markdown (ST-0005)"
```

---

### Task 3: Note 存/读（io，供 --save/--replay）

**Files:**
- Create: `src/io/notes.ts`
- Test: `tests/unit/notes.test.ts`

**Interfaces:**
- Consumes: `DecisionNote`、`DecisionNoteSchema`（Task 1）。
- Produces: `saveNotes(notes: DecisionNote[], path: string): void`、`loadNotes(path: string): DecisionNote[]`。

- [ ] **Step 1: 写失败测试** — `tests/unit/notes.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/notes.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/io/notes.ts`：

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/notes.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/io/notes.ts tests/unit/notes.test.ts
git commit -m "feat(io): save/load Decision Notes for --save/--replay (ST-0005)"
```

---

### Task 4: 容错解析 agent 输出（边缘）

> 设计取舍：research 标注 `output: Output.object` + `tools` 在 `ai@6` 有已知 bug（#11348/#10023）。所以 `runCapture`（Task 7）先试 `output`，失败则回落到**解析 `result.text`**。本任务实现那个纯解析器，独立测充分。

**Files:**
- Create: `src/capture/parse.ts`
- Test: `tests/unit/capture-parse.test.ts`

**Interfaces:**
- Consumes: `CaptureOutputSchema`（Task 1）。
- Produces: `parseCaptureNotes(text: string): DecisionNote[]`（失败返回 `[]`，绝不抛）。

- [ ] **Step 1: 写失败测试** — `tests/unit/capture-parse.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/capture-parse.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/capture/parse.ts`：

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/capture-parse.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/capture/parse.ts tests/unit/capture-parse.test.ts
git commit -m "feat(capture): tolerant parser for agent output (ST-0005)"
```

---

### Task 5: 只读调查工具（边缘）

**Files:**
- Create: `src/capture/tools.ts`
- Test: `tests/unit/capture-tools.test.ts`

**Interfaces:**
- Produces: `buildTools(root: string): Record<string, Tool>` —— `read_file`、`grep`、`git`（只读）。`root` 为仓库根，所有路径限制在其内。
- 依赖 `ai` 的 `tool()`。

- [ ] **Step 1: 写失败测试** — `tests/unit/capture-tools.test.ts`（直接调 `execute`）

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/capture-tools.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/capture/tools.ts`（fs 读 + 只读 git；git 在 `src/capture` 允许，ADR-0006-C1 已细化为 `src/core/`）：

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

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/capture-tools.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/capture/tools.ts tests/unit/capture-tools.test.ts
git commit -m "feat(capture): read-only investigation tools (read/grep/git) (ST-0005, ADR-0009)"
```

---

### Task 6: 从 env 选模型（边缘）

**Files:**
- Create: `src/capture/model.ts`
- Test: `tests/unit/capture-model.test.ts`

**Interfaces:**
- Produces: `selectCaptureModel(env: NodeJS.ProcessEnv): LanguageModel`。沿用现有 `RADAR_PROVIDER`/`RADAR_MODEL`/`RADAR_BASE_URL`/键。

- [ ] **Step 1: 写失败测试** — `tests/unit/capture-model.test.ts`（只断言能构造、选对 provider，不触网）

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/capture-model.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/capture/model.ts`：

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

> 注：`anthropic()`/`gateway()` 是惰性构造（不立即发请求），故无键也能构造——但我们显式校验键给出清晰报错。`vercel` 的 DeepSeek slug 在实现时对照网关 live 列表确认。

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/capture-model.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/capture/model.ts tests/unit/capture-model.test.ts
git commit -m "feat(capture): select agent model from env (ST-0005, ADR-0007)"
```

---

### Task 7: 调查 agent（边缘，核心件）

**Files:**
- Create: `src/capture/agent.ts`
- Test: `tests/unit/capture-agent.test.ts`

**Interfaces:**
- Consumes: `buildTools`（T5）、`parseCaptureNotes`（T4）、`Constraint`（已有 models）、`CaptureOutputSchema`（T1）。
- Produces: `buildCaptureUserPrompt(diff, constraints): string`、`runCapture(opts): Promise<DecisionNote[]>`，其中 `opts = { model: LanguageModel; skill: string; diff: string; constraints: Constraint[]; root: string }`。

- [ ] **Step 1: 写失败测试** — `tests/unit/capture-agent.test.ts`（用 `MockLanguageModelV3`，无网络）

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/unit/capture-agent.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/capture/agent.ts`。先试 `output: Output.object`，异常或空则回落到 `parseCaptureNotes(result.text)`；都不行返回 `[]`（advisory 不 crash）。`stopWhen` 预算含"生成结构化输出也算一步"。

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

> 注：`MockLanguageModelV3` 走文本路径时 `output` 可能为空 → 触发 `parseCaptureNotes(result.text)`，测试因而稳定（不依赖 `Output.object` 的 mock 内部契约，那部分 research 未能核实）。真实 provider 走 `output` 主路径。

- [ ] **Step 4: 跑测试确认通过** — `pnpm vitest run tests/unit/capture-agent.test.ts` → PASS。
- [ ] **Step 5: 提交**

```bash
git add src/capture/agent.ts tests/unit/capture-agent.test.ts
git commit -m "feat(capture): investigative agent on the AI SDK (ST-0005, ADR-0009)"
```

---

### Task 8: CLI `radar capture` + 调度

**Files:**
- Create: `src/cli/commands/capture.ts`
- Modify: `src/cli/main.ts`（加 `capture` 分支）
- Test: `tests/integration/capture-pipeline.test.ts`（走 `--replay`，不触网）

**Interfaces:**
- Consumes: `extractFromDir`/`adrSection`、`loadDiff`、`runCapture`、`selectCaptureModel`、`decisionNotesMarkdown`、`saveNotes`/`loadNotes`。
- Produces: `cmdCapture(argv: string[]): Promise<number>`。
- 行为：读 skill（`skills/capture/SKILL.md`）、约束、diff；非 replay 则建模型跑 agent；把渲染后的 markdown 打到 stdout（草稿正文），`--save` 存 notes JSON。**不**发平台动作。

- [ ] **Step 1: 写失败集成测试** — `tests/integration/capture-pipeline.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run tests/integration/capture-pipeline.test.ts` → FAIL。

- [ ] **Step 3: 实现** — `src/cli/commands/capture.ts`：

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

- [ ] **Step 4: 接进 `src/cli/main.ts`** —— 在 dispatch 里加(与 `extract|check|comment` 同样式)：

```ts
import { cmdCapture } from "./commands/capture.ts";
// ... 在命令分发处：
case "capture":
  return cmdCapture(rest);
```

（按 `main.ts` 现有写法对齐；`rest` 为去掉命令名后的 argv。）

- [ ] **Step 5: 跑测试确认通过** — `pnpm vitest run tests/integration/capture-pipeline.test.ts` → PASS。
- [ ] **Step 6: 提交**

```bash
git add src/cli/commands/capture.ts src/cli/main.ts tests/integration/capture-pipeline.test.ts
git commit -m "feat(cli): radar capture command (--diff/--save/--replay) (ST-0005)"
```

---

### Task 9: IIAC capture SKILL.md（ST-0009）

**Files:**
- Create: `skills/capture/SKILL.md`
- Test: `tests/unit/skill-capture.test.ts`（断言文件存在 + frontmatter 必填字段）

- [ ] **Step 1: 写失败测试** — `tests/unit/skill-capture.test.ts`

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

- [ ] **Step 2: 跑测试确认失败** → FAIL（文件不存在）。

- [ ] **Step 3: 写 `skills/capture/SKILL.md`**（agentskills.io 格式；正文是 agent 的 instructions）：

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

- [ ] **Step 4: 跑测试确认通过** → PASS。
- [ ] **Step 5: 提交**

```bash
git add skills/capture/SKILL.md tests/unit/skill-capture.test.ts
git commit -m "feat(skills): IIAC capture methodology skill (ST-0009, ST-0005)"
```

---

### Task 10: 依赖 + 工作流接入

**Files:**
- Modify: `package.json`（deps + `files`）
- Modify: `.github/workflows/radar.yml`（capture 作业）

- [ ] **Step 1: 装依赖**

```bash
pnpm add ai@6 @ai-sdk/anthropic @ai-sdk/openai-compatible @ai-sdk/gateway
```

- [ ] **Step 2: `package.json` 的 `files` 加 `skills`**（发包时带上 SKILL.md，ADR-0008）：把 `"files": ["dist"]` 改为 `"files": ["dist", "skills"]`。

- [ ] **Step 3: `pnpm build` + 全量测试**

```bash
pnpm lint && pnpm build && pnpm test
```
Expected: 绿(含新加的 capture 测试)。

- [ ] **Step 4: `.github/workflows/radar.yml` 加 capture 作业**（合并后触发;平台写动作在工作流;始终 advisory）：

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
        with: { fetch-depth: 0 }   # 合并后的 main + 完整历史(供只读 git)
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
          RADAR_MODEL: deepseek/deepseek-chat   # 实现时对照网关 live 列表确认 slug
          AI_GATEWAY_API_KEY: ${{ secrets.AI_GATEWAY_API_KEY }}
      - name: Open a draft PR or issue per note (advisory; human merges/closes)
        run: |
          COUNT=$(jq 'length' notes.json)
          if [ "$COUNT" = "0" ]; then echo "nothing flagged"; exit 0; fi
          # 起一个分支放 body.md 作为讨论材料,开一个 issue 承载草稿(人来决定是否毕业为 ADR PR)
          gh issue create --repo ${{ github.repository }} \
            --title "Decision capture from #${{ github.event.pull_request.number }}" \
            --body-file body.md
        env: { GH_TOKEN: ${{ github.token }} }
```

> 起步先开 **issue**(最简、零风险);"开草稿 ADR PR"作为后续增强(需要 agent 产出 ADR 正文,见 ST-0005 备注)。**始终 advisory**,不设 required status、不阻塞。

- [ ] **Step 5: 提交**

```bash
git add package.json pnpm-lock.yaml .github/workflows/radar.yml
git commit -m "feat(ci): run capture after merge; open an advisory issue per Decision Note (ST-0005, ADR-0009)"
```

---

## 收尾(提交 PR 前)

- [ ] 英文镜像:`docs/specs/...en.md`、`docs/requirements/...en.md` 的 FR-CAP 改动、本计划 `.en.md`(doc-management 同提交)。
- [ ] `docs/stories/README.md` 索引:ST-0005 状态、新增 ST-0009 行。
- [ ] `lint + build + test` 绿;真实 smoke(一次真 provider 的 `radar capture`)由维护者触发(非 Claude)。
- [ ] `gh auth switch -u fang-lin` 后开 PR,引用 ST-0005 / ADR-0009。

## Self-Review（对照设计文档）

- **覆盖**:DecisionNote(T1)、渲染(T2)、save/replay(T3)、容错解析(T4)、只读工具(T5)、选模型(T6)、agent(T7)、CLI(T8)、SKILL.md(T9)、依赖+工作流(T10)——覆盖 spec §3/§5/§6/§7/§8。
- **平台边界**:git/gh 只在 `src/capture/`(只读 git)与工作流(gh);`src/core/` 仅 T1/T2 纯件 —— 合 ADR-0006-C1(src/core/)/ADR-0009-C1。
- **诚实/不 crash**:T4 解析失败返回 `[]`、T7 异常返回 `[]`、空结果有"nothing flagged"渲染(T2)。
- **不触网测试**:T7 用 MockLanguageModelV3、T8 走 --replay。
- **类型一致**:`DecisionNote`/`CaptureOutput`/`Constraint` 在各任务签名一致。
- **待核实(实现时)**:`output`+`tools` 的稳定性(已设回落)、DeepSeek 网关 slug、Mock 的 tool-call content 字段名(若要测多步工具循环)。
