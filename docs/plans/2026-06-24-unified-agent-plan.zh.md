# 统一调查 agent 实现计划

> **权威: 中文(本文件) · 翻译: 英文(`2026-06-24-unified-agent-plan.en.md`,提交 PR 前补) · 最后同步: 2026-06-24**
>
> **For agentic workers:** REQUIRED SUB-SKILL: 用 superpowers:subagent-driven-development 逐任务实现。步骤用 `- [ ]` 勾选。

**Goal:** 把 radar 三操作统一到一个通用调查 agent 引擎;conformance 从单次 `ModelClient` 调用升级为 agent;capture 重构到同一引擎;退役 ModelClient 端口与旧适配器;CLI `check`→`conformance`。按 `ADR-0010` / 设计 `docs/specs/2026-06-24-unified-agent-design.zh.md`。

**Architecture:** 新增 `src/agent/`(通用引擎 `runAgent<T>` + 工具 + 选模型 + 容错解析,从 `src/capture/` 抽出泛化)。每个操作 = 一份 SKILL.md + 一个输出 schema + 一个确定性外壳。conformance 外壳保留作用域优先检索(确定性)+ 把 checker 的纯逻辑(prompt 构造、verdict 映射)留作纯函数,只把模型调用换成 `runAgent`。

**Tech Stack:** TypeScript / Node 22 / ESM / `zod/v4` / vitest / Vercel AI SDK(`ai@6.0.208`、`@ai-sdk/anthropic`、`@ai-sdk/openai-compatible`、`@ai-sdk/gateway`)。

## Global Constraints
- `src/core/` 不碰 SDK/平台(ADR-0006-C1 现 `src/core/`、ADR-0009-C1)。引擎/工具/选模型只在 `src/agent/`。
- 每个 LLM 操作走**共享引擎**,不留 bespoke provider 调用、不依赖已退役的 ModelClient 端口(ADR-0010-C1)。
- **作用域优先检索是确定性代码**,不交给 agent(ADR-0010-C2 / NFR-RETRIEVAL-1):`core/retrieve.ts` 不变,agent 只判已检索出的命中约束。
- 配置只来自 `process.env`(ADR-0006-C2)。ESM-only,相对导入带 `.ts` 后缀。
- 测试**绝不调真 LLM**:用 `ai/test` 的 `MockLanguageModelV3`(返回结构 `finishReason:{unified,raw}`、`usage:{inputTokens:{total},outputTokens:{total}}`),或 `--replay`。
- 提交:Conventional Commits,**禁 AI 署名**,引用 `ADR-0010` 及相关 `ST`。
- `unknown` 仍是合法 verdict(FR-CONF-6)。空结果合法。
- 引擎双路径(`Output.object` 主 + 文本兜底)是必需的(ai@6 `output`+`tools` 已知 bug),直接沿用现有 `src/capture/agent.ts` 的模式。

**质量 gate(写进计划,维护者触发,非自动化):** 切换前跑 `pnpm eval` 回放对比 agent 版 vs 单次版 conformance 的 precision/recall,不退化才合并(NFR-EVAL-1/AC-2)。

---

### Task 1: 把 tools / model / parse 抽到 `src/agent/`(泛化)

**Files:**
- Move: `src/capture/tools.ts` → `src/agent/tools.ts`(`buildTools` 不变)
- Move: `src/capture/model.ts` → `src/agent/model.ts`(`selectCaptureModel` 重命名为 `selectModel`)
- Move: `src/capture/parse.ts` → `src/agent/parse.ts`(`parseCaptureNotes` 泛化为 `parseAgentJson<T>(text, schema): T | null`)
- Update: `src/capture/agent.ts`(改导入路径 + 用泛化后的名字)
- Move tests: `tests/unit/capture-tools.test.ts`→`tests/unit/agent-tools.test.ts`;`capture-model.test.ts`→`agent-model.test.ts`;`capture-parse.test.ts`→`agent-parse.test.ts`(改导入路径 + 名字)

**Interfaces:**
- Produces: `buildTools(root): Record<string,Tool>`;`selectModel(env): LanguageModel`;`parseAgentJson<T>(text: string, schema: z.ZodType<T>): T | null`(失败返回 `null`,绝不抛)。

- [ ] **Step 1: 移动文件 + 改名**
```bash
mkdir -p src/agent
git mv src/capture/tools.ts src/agent/tools.ts
git mv src/capture/model.ts src/agent/model.ts
git mv src/capture/parse.ts src/agent/parse.ts
git mv tests/unit/capture-tools.test.ts tests/unit/agent-tools.test.ts
git mv tests/unit/capture-model.test.ts tests/unit/agent-model.test.ts
git mv tests/unit/capture-parse.test.ts tests/unit/agent-parse.test.ts
```

- [ ] **Step 2: `src/agent/model.ts` 改名导出** —— 把 `export function selectCaptureModel` 改为 `export function selectModel`(函数体不变)。

- [ ] **Step 3: `src/agent/parse.ts` 泛化** —— 改为:
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

- [ ] **Step 4: 更新 `src/capture/agent.ts` 导入** —— 改为 `import { buildTools } from "../agent/tools.ts";` 和 `import { parseAgentJson } from "../agent/parse.ts";`;把 `parseCaptureNotes(text)` 调用改为 `parseAgentJson(text, CaptureOutputSchema)?.notes ?? []`(`CaptureOutputSchema` 已从 `../core/models.ts` 导入)。

- [ ] **Step 5: 更新移动后测试的导入** —— `agent-tools.test.ts`/`agent-model.test.ts` 改 `from "../../src/agent/..."`;`agent-model.test.ts` 把 `selectCaptureModel` 改 `selectModel`;`agent-parse.test.ts` 改导入 `parseAgentJson`,断言改为 `parseAgentJson(input, CaptureOutputSchema)`(顶部 `import { CaptureOutputSchema } from "../../src/core/models.ts";`)。

- [ ] **Step 6: 跑全套** —— `pnpm lint && pnpm build && pnpm test`,全绿(行为不变,纯搬迁)。

- [ ] **Step 7: 提交**
```bash
git add -A
git commit -m "refactor(agent): lift tools/model/parse into src/agent, generalize parse (ADR-0010)"
```

---

### Task 2: 通用引擎 `runAgent` + capture 切到引擎

**Files:**
- Create: `src/agent/engine.ts`
- Modify: `src/capture/agent.ts`(`runCapture` 改为调 `runAgent`)
- Test: `tests/unit/agent-engine.test.ts`

**Interfaces:**
- Consumes: `buildTools`(T1)、`parseAgentJson`(T1)。
- Produces: `runAgent<T>(opts: { model: LanguageModel; skill: string; user: string; tools: Record<string,Tool>; outputSchema: z.ZodType<T>; }): Promise<T | null>` —— 双路径,失败返回 `null`,绝不抛。

- [ ] **Step 1: 写失败测试** —— `tests/unit/agent-engine.test.ts`(假模型;裸 JSON 走主路径、栅栏 JSON 走兜底、垃圾返回 null)
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

- [ ] **Step 2: 跑测试确认失败** —— `pnpm vitest run tests/unit/agent-engine.test.ts` → FAIL。

- [ ] **Step 3: 实现 `src/agent/engine.ts`**(泛化现有 `runCapture` 双路径)
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

- [ ] **Step 4: 跑测试确认通过** —— `pnpm vitest run tests/unit/agent-engine.test.ts` → PASS。

- [ ] **Step 5: capture 切到引擎** —— 改 `src/capture/agent.ts` `runCapture`:删掉内部双路径,改为
```ts
import { runAgent } from "../agent/engine.ts";
import { buildTools } from "../agent/tools.ts";
import { CaptureOutputSchema, type Constraint, type DecisionNote } from "../core/models.ts";
// buildCaptureUserPrompt 保留不变
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
(顶部 `import type { LanguageModel } from "ai";` 保留;删掉对 `generateText/Output/stepCountIs/parse` 的直接导入。)

- [ ] **Step 6: 跑 capture 回归 + 全套** —— `pnpm vitest run tests/unit/capture-agent.test.ts && pnpm lint && pnpm build && pnpm test`,全绿(capture 行为不变)。

- [ ] **Step 7: 提交**
```bash
git add -A
git commit -m "feat(agent): generic runAgent engine; capture runs on it (ADR-0010)"
```

---

### Task 3: conformance SKILL.md

**Files:**
- Create: `skills/conformance/SKILL.md`
- Test: `tests/unit/skill-conformance.test.ts`

- [ ] **Step 1: 写失败测试**
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

- [ ] **Step 2: 跑测试确认失败** → FAIL(文件不存在)。

- [ ] **Step 3: 写 `skills/conformance/SKILL.md`**(agentskills.io 格式;正文取自现有 `checker.ts` 的 SYSTEM + 调查指引)
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

- [ ] **Step 4: 跑测试确认通过** → PASS。
- [ ] **Step 5: 提交**
```bash
git add skills/conformance/SKILL.md tests/unit/skill-conformance.test.ts
git commit -m "feat(skills): conformance methodology skill (ADR-0010, ST-0010)"
```

---

### Task 4: conformance 命令(外壳)+ CLI 改名 + verdict 纯逻辑保留

**Files:**
- Modify: `src/core/checker.ts` —— 保留纯函数 `buildUserPrompt`(不变)+ 新增纯映射 `toVerdict`;删除走端口的 `checkConstraint`(及 `import type { ModelClient }`、`SYSTEM` 常量——SYSTEM 已移入 SKILL.md)
- Create: `src/cli/commands/conformance.ts`(取代 `check.ts`)
- Delete: `src/cli/commands/check.ts`
- Modify: `src/cli/main.ts`(`check`→`conformance`)
- Test: `tests/unit/checker.test.ts`(更新:测 `buildUserPrompt` + `toVerdict`,去掉 `checkConstraint`)、`tests/integration/conformance-pipeline.test.ts`(新,走 `--replay`)

**Interfaces:**
- Consumes: `runAgent`(T2)、`selectModel`(T1)、`buildTools`(T1)、`retrieve`/`extractFromDir`/`adrSection`/`loadDiff`(现有)、`SemanticCheckOutputSchema`/`Verdict`(现有 models)。
- Produces: `buildUserPrompt(constraint, diffs, driverContext)`(纯,不变);`toVerdict(constraint, out: SemanticCheckOutput): Verdict`(纯);`cmdConformance(argv): Promise<number>`。

- [ ] **Step 1: 在 `src/core/checker.ts` 加纯映射 `toVerdict`、删端口逻辑** —— 删 `SYSTEM`、`checkConstraint`、`import type { ModelClient }`、`import type { FileDiff }`(若仅 checkConstraint 用);保留 `buildUserPrompt`;新增:
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
(`buildUserPrompt` 保留;它内部不再需要 SYSTEM。)

- [ ] **Step 2: 更新 `tests/unit/checker.test.ts`** —— 去掉对 `checkConstraint` 的测试;保留/补 `buildUserPrompt`(prompt 含 rule/driver/examples)与新 `toVerdict`(映射 + confidence 钳制 + evidence)的单测。示例:
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

- [ ] **Step 3: 写 `src/cli/commands/conformance.ts`**(从 `check.ts` 改写;检索确定性,逐约束走 agent)
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

- [ ] **Step 4: 接进 `src/cli/main.ts`** —— `import { cmdConformance } from "./commands/conformance.ts";`,把 `case "check": return cmdCheck(rest);` 换成 `case "conformance": return cmdConformance(rest);`,删 `cmdCheck` 导入,default 错误串里 `check`→`conformance`。删 `src/cli/commands/check.ts`(`git rm`)。

- [ ] **Step 5: 写集成测试** —— `tests/integration/conformance-pipeline.test.ts`(走 `--replay`,不触网):构造一个 verdicts.json + 一个 diff,`cmdConformance(["--diff", d, "--adr-dir","docs/adr","--replay", v])`,断言 stdout 含该 verdict 的 `constraint_id` + result,返回 0。

- [ ] **Step 6: 跑全套** —— `pnpm lint && pnpm build && pnpm test`,全绿。

- [ ] **Step 7: 提交**
```bash
git add -A
git commit -m "feat(cli): radar conformance runs the agent per in-scope constraint (ADR-0010, ST-0010)"
```

---

### Task 5: 退役 ModelClient 端口 + 旧适配器 + 旧依赖;rewire eval

**Files:**
- Delete: `src/llm/port.ts`、`src/llm/anthropic-adapter.ts`、`src/llm/openai-compat-adapter.ts`、`src/llm/factory.ts`、`src/llm.ts`
- Delete tests: `tests/unit/factory.test.ts`、`tests/unit/openai-compat-adapter.test.ts`
- Modify: `src/index.ts`(若导出端口/工厂,改为导出 `runAgent`/`selectModel`)
- Modify: `package.json`(deps 移除 `openai`、`@anthropic-ai/sdk`)
- Modify: `scripts/eval.ts`(两臂改走 `runAgent`)

**Interfaces:** 无新增对外接口;清理。

- [ ] **Step 1: rewire `scripts/eval.ts`** —— 把 `import { makeModelClient, DEFAULT_MODEL, type ModelClient } from "../src/llm.ts";` 改为 `import { selectModel } from "../src/agent/model.ts";` + `import { runAgent } from "../src/agent/engine.ts";` + `import { buildTools } from "../src/agent/tools.ts";`;`DEFAULT_MODEL` 内联为 `"claude-sonnet-4-6"`。
  - GROUNDED 臂:把 `checkConstraint(client!, c, diffs, ctx)` 换成:
    ```ts
    const out = await runAgent({ model, skill: conformanceSkill, tools, user: buildUserPrompt(c, diffs, ctx), outputSchema: SemanticCheckOutputSchema });
    const v = out ? toVerdict(c, out) : { result: "unknown", confidence: 0, explanation: "" };
    ```
    (顶部 `import { buildUserPrompt, toVerdict } from "../src/core/checker.ts";`,`const conformanceSkill = readFileSync("skills/conformance/SKILL.md","utf8");`,`const model = selectModel(process.env); const tools = buildTools(process.cwd());` 在 `main()` 内、`replay` 为真时跳过构造。)
  - UNGROUNDED 臂:把 `client.complete({system: UNGROUNDED_SYSTEM, user, schema, maxTokens})` 换成 `runAgent({ model, skill: UNGROUNDED_SYSTEM, tools: {}, user: "Review this diff:\n```diff\n"+diffText+"\n```", outputSchema: SemanticCheckOutputSchema })`(无工具),取 `o.result/confidence/explanation`(为 null 时给 `{result:"unknown"}`)。
  - `makeModelClient()` 的调用与 `client` 变量删除;改成 `const live = !replay;` 控制是否构造 `model`/`tools`。

- [ ] **Step 2: 删端口/适配器/工厂/barrel + 其测试**
```bash
git rm src/llm/port.ts src/llm/anthropic-adapter.ts src/llm/openai-compat-adapter.ts src/llm/factory.ts src/llm.ts
git rm tests/unit/factory.test.ts tests/unit/openai-compat-adapter.test.ts
```

- [ ] **Step 3: 修 `src/index.ts`** —— 移除对 `./llm.ts`/端口/工厂的 re-export;改为 `export { runAgent } from "./agent/engine.ts";`、`export { selectModel } from "./agent/model.ts";`(其余核心导出保留)。grep 确认无残留导入:`grep -rn "llm.ts\|ModelClient\|makeModelClient\|checkConstraint" src scripts tests`(应为空)。

- [ ] **Step 4: 移除依赖**
```bash
pnpm remove openai @anthropic-ai/sdk
```

- [ ] **Step 5: 跑全套 + eval 回放(不触网)** —— `pnpm lint && pnpm build && pnpm test` 全绿;`pnpm exec tsx scripts/eval.ts --replay` 能跑通(用缓存,不触网)。

- [ ] **Step 6: 提交**
```bash
git add -A
git commit -m "refactor(model): retire the ModelClient port + adapters; eval runs on the agent (ADR-0010)"
```

---

### Task 6: 工作流改名 + ADR 对齐 + 文档

**Files:**
- Modify: `.github/workflows/radar.yml`(`check`→`conformance`)
- Modify: `docs/adr/ADR-0007-pluggable-model-layer.md`(ADR-0007-C1 标 superseded)
- Modify: `docs/adr/ADR-0003-typescript-implementation.md`(ADR-0003-C1 改 provider 无关)
- Modify: `README.md`(`radar check`→`radar conformance`)
- Modify: `docs/stories/README.md` + 新增 story

- [ ] **Step 1: `radar.yml`** —— 第 120 行 `... main.ts check --adr-dir ...` 改为 `... main.ts conformance --adr-dir ...`(其余不变;名字/注释里的 "check" 可保留为英文叙述,不影响)。
- [ ] **Step 2: ADR-0007-C1** —— 在其 constraints 块把 `status: active`→`status: superseded`、`superseded_by: null`→`superseded_by: ADR-0010`;正文 Status 行加注 "ADR-0007-C1 superseded by ADR-0010(端口被统一 agent 取代;ADR-0007 的可插拔/便宜/边缘选 provider 本意由引擎延续)"。
- [ ] **Step 3: ADR-0003-C1** —— 把 rule 里 "messages.parse + zodOutputFormat" 等 Anthropic-SDK 专属措辞改为 provider 无关:"必须通过类型化、zod 校验的结构化输出获得裁定,不得从 message.content 手解析(JSON.parse/正则抽字段),具体 SDK 不限"。examples 同步去掉 SDK 专名。
- [ ] **Step 4: README** —— `radar check --adr-dir ... --diff ...` → `radar conformance --adr-dir ... --diff ...`(225–227 行附近)。
- [ ] **Step 5: stories** —— `docs/stories/README.md` 加一行新 story(ST-00NN:统一调查 agent / conformance 升级,ADR-0010);ST-0010 状态推进注记;新建 `docs/stories/ST-00NN-unified-agent.md`(模板)。
- [ ] **Step 6: 跑全套确认没破** —— `pnpm lint && pnpm build && pnpm test` 全绿。
- [ ] **Step 7: 提交**
```bash
git add -A
git commit -m "docs+ci: rename check→conformance; supersede ADR-0007-C1; reword ADR-0003-C1 (ADR-0010)"
```

---

## 收尾(提交 PR 前)
- [ ] 英文镜像:本计划 `.en.md`、新 story、需求里若有 `check` 字样同步(doc-management 同提交)。
- [ ] `lint+build+test` 绿;**质量 gate:`pnpm eval` 回放对比 agent 版 vs 单次版(维护者触发,花 API)——不退化才合并**。
- [ ] `gh auth switch -u fang-lin` 后开 PR,引用 ADR-0010 / ST。

## Self-Review
- **覆盖**:引擎(T2)、工具/选模型/解析迁移(T1)、conformance 技能(T3)、conformance 外壳+改名(T4)、退役端口+eval rewire(T5)、工作流/ADR/文档(T6)——覆盖设计 §3/§4/§6/§9。
- **平台边界**:agent/SDK 只在 `src/agent/`;`src/core/` 仅纯函数(retrieve/buildUserPrompt/toVerdict);检索确定性(ADR-0010-C2)。
- **不触网测试**:引擎用 MockLanguageModelV3、conformance 走 --replay、eval --replay 用缓存。
- **类型一致**:`runAgent<T>`、`SemanticCheckOutputSchema`、`Verdict`、`toVerdict`、`selectModel`、`parseAgentJson` 全程一致。
- **待核实(实施时)**:eval rewire 后两臂行为(先存当前单次版基线再改);质量 gate 必须维护者跑真 eval。
