# Radar 模型层实现计划

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-21-radar-model-layer-plan.en.md`） · 最后同步: 2026-06-21 · 两版冲突以中文为准**

> **给执行者:** 本计划实现 ADR-0007 / `docs/specs/2026-06-21-radar-model-layer-design.zh.md`。分支 `ST-0022-model-layer`(设计文档已提交)。TDD、每任务一提交。代码块/路径/标识符逐字一致(`doc-management` §6)。

**目标:** 把 radar 的 LLM 调用从 `checker.ts` 直连 Anthropic 抽成 `ModelClient` 端口 + 原生Anthropic & 通用OpenAI兼容两适配器,兼容大部分模型 + 网关。

**架构:** core 只依赖 `ModelClient` 端口;provider/SDK 细节只在适配器;`makeModelClient(env)` 在 CLI 边缘构造并注入。

**技术栈:** TypeScript / Node 22 / `zod/v4` / `@anthropic-ai/sdk`(已有)+ `openai`(新增)/ vitest。

## 全局约束(每个任务都隐含)
- `src/` 核心**不得 import** provider SDK——只准在适配器里(ADR-0007-C1)。
- key 一律走 env,**绝不进 git**(`.env` + `.gitignore`)。
- 结构化输出必须经 **zod 校验**后才返回。
- 兼容目标是 **Chat Completions**(已核实仍受支持)。
- 提交信息**不加 AI 署名**;引用 `ST-0022` / `ADR-0007`。

## 文件结构
- **新增 `src/llm.ts`**:`ModelClient` 端口 + `AnthropicAdapter` + `OpenAICompatAdapter` + `makeModelClient(env)`。
- **改 `src/checker.ts`**:`checkConstraint(client: ModelClient, …)`;删 `makeClient`/`loadDotenv`/直连 Anthropic。
- **改 `src/cli.ts`**:`cmdCheck` 在边缘 `makeModelClient` 注入。
- **改 `scripts/eval.ts`**:加 `--provider`/`--model`,复用工厂。
- **改 `package.json`**:加 `openai` 依赖。
- **测试**:`tests/llm.test.ts`(适配器重试/校验 + 工厂选择)、`tests/checker.test.ts`(core 用假 client)。

---

### Task 1: `ModelClient` 端口 + core 解耦(用假 client 单测)

**Files:** Create `src/llm.ts`(仅端口)· Modify `src/checker.ts` · Test `tests/checker.test.ts`

**Interfaces — Produces:**
```ts
// src/llm.ts
import type { z } from "zod/v4";
export interface ModelClient {
  complete<T>(o: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T>;
}
```
`checkConstraint` 改签名:`(client: ModelClient, constraint, diffs, driverContext?, /* model 删除 */)`;内部把 `client.messages.parse(...)` 换成
```ts
const out = await client.complete({ system: SYSTEM, user: buildUserPrompt(constraint, diffs, driverContext), schema: SemanticCheckOutputSchema, maxTokens: 16000 });
```
`SYSTEM`/`buildUserPrompt`/映射到 `Verdict` 的逻辑不变;删 `makeClient`/`loadDotenv`/`import Anthropic`。

- [ ] **Step 1 写失败测试** `tests/checker.test.ts`:造一个 `fake: ModelClient`,`complete` 返回固定 `SemanticCheckOutput`;断言 `checkConstraint(fake, constraint, diffs)` 产出对应 `Verdict`(result/confidence/evidence/constraint_id 正确)。
- [ ] **Step 2 跑** `pnpm test tests/checker.test.ts` → 期望失败(签名/类型不符)。
- [ ] **Step 3 实现** 改 `checker.ts` 如上 + `src/llm.ts` 写端口接口。
- [ ] **Step 4 跑** → 期望通过;`pnpm build`(tsc)通过。
- [ ] **Step 5 提交** `git commit -m "refactor(radar): checkConstraint depends on ModelClient port (ST-0022, ADR-0007)"`

### Task 2: `AnthropicAdapter`(原生·迁移现逻辑)

**Files:** Modify `src/llm.ts` · Test `tests/llm.test.ts`

**Interfaces — Produces:** `class AnthropicAdapter implements ModelClient`(构造接收 `{ model: string }`,内部 `new Anthropic()`)。`complete` 用 `messages.parse({ model, max_tokens, thinking:{type:"adaptive"}, system, messages:[{role:"user",content:user}], output_config:{format: zodOutputFormat(schema)} })` → 取 `parsed_output`,空则抛错。即把现 `checkConstraint` 里的调用搬进来。

- [ ] **Step 1 写测试**:mock `@anthropic-ai/sdk`(vi.mock)让 `messages.parse` 返回 `{parsed_output: <obj>}`;断言 `new AnthropicAdapter({model}).complete({system,user,schema})` 返回该 obj;`parsed_output==null` 时抛错。
- [ ] **Step 2 跑** → 失败。
- [ ] **Step 3 实现** `AnthropicAdapter`。
- [ ] **Step 4 跑** → 通过。
- [ ] **Step 5 提交** `git commit -m "feat(radar): AnthropicAdapter (native, schema-enforced) for the model port (ADR-0007)"`

### Task 3: `OpenAICompatAdapter`(通用 + 重试,最易错——重点测)

**Files:** Modify `src/llm.ts` · `package.json`(加 `openai`)· Test `tests/llm.test.ts`

**Interfaces — Produces:** `class OpenAICompatAdapter implements ModelClient`,构造 `{ model, baseURL, apiKey, headers?, mode: "json_schema" | "json_object", maxRetries?=3 }`,内部 `new OpenAI({ baseURL, apiKey, defaultHeaders: headers })`。
- `mode==="json_schema"`:`const r = await client.chat.completions.parse({ model, max_tokens, messages, response_format: zodResponseFormat(schema, "verdict") }); return r.choices[0].message.parsed`(SDK 已按 schema 校验)。
- `mode==="json_object"`:循环至多 `maxRetries`:`create({ model, response_format:{type:"json_object"}, messages })` → `content = choices[0].message.content` → 空/`JSON.parse` 抛错/`schema.parse` 抛错 → 重试(messages 追加"只返回符合该 schema 的 JSON";schema 用 `z.toJSONSchema(schema)` 注入到 system)→ 超限抛 `Error("model returned no valid structured output after N tries")`。
- `messages` = `[{role:"system",content: system + (mode==="json_object" ? "\nRespond with JSON matching this schema:\n"+JSON.stringify(z.toJSONSchema(schema)) : "")},{role:"user",content:user}]`。

- [ ] **Step 1 写测试**(核心):mock OpenAI client 的 `chat.completions.create` 依次返回:① `content:""`(空)② `content:"not json"` ③ 合法 JSON。断言 `json_object` 模式下重试到第③次、返回校验后的对象、`create` 被调 3 次。再加一例:始终返回 `""` → 断言抛错且调用次数 = `maxRetries`。再加 `json_schema` 模式:mock `chat.completions.parse` 返回 `{choices:[{message:{parsed:<obj>}}]}` → 断言直接返回。
- [ ] **Step 2 跑** → 失败。
- [ ] **Step 3 实现** `OpenAICompatAdapter`;`pnpm add openai`。
- [ ] **Step 4 跑** → 通过。
- [ ] **Step 5 提交** `git commit -m "feat(radar): OpenAICompatAdapter — json_schema(parse) + json_object(zod+retry) for gateways/providers (ADR-0007)"`

### Task 4: `makeModelClient(env)` 工厂(预设 + 逃生口 + .env)

**Files:** Modify `src/llm.ts` · Test `tests/llm.test.ts`

**Interfaces — Produces:** `makeModelClient(env: NodeJS.ProcessEnv = process.env): ModelClient`。读 `RADAR_PROVIDER`(默认 `anthropic`):
- `anthropic` → `AnthropicAdapter({ model: env.RADAR_MODEL ?? DEFAULT_MODEL })`
- `openrouter` → `OpenAICompatAdapter({ baseURL:"https://openrouter.ai/api/v1", apiKey: env.OPENROUTER_API_KEY, headers:{"HTTP-Referer":…,"X-Title":"Delivery Radar"}, model: env.RADAR_MODEL ?? "…", mode:"json_schema" })`
- `vercel` → `OpenAICompatAdapter({ baseURL:"https://ai-gateway.vercel.sh/v1", apiKey: env.AI_GATEWAY_API_KEY, model: env.RADAR_MODEL ?? "…", mode:"json_schema" })`
- `openai-compat` → `OpenAICompatAdapter({ baseURL: env.RADAR_BASE_URL!, apiKey: env.RADAR_API_KEY, model: env.RADAR_MODEL!, mode: (env.RADAR_JSON_MODE as any) ?? "json_object" })`
- 缺 key/必填项 → 抛清晰错误。`loadDotenv`(从 checker 迁来)在工厂开头调用。

- [ ] **Step 1 写测试**:设 `env={RADAR_PROVIDER:"openrouter",OPENROUTER_API_KEY:"x"}` → 断言返回 `OpenAICompatAdapter` 实例且 baseURL 正确;`RADAR_PROVIDER` 缺省 → `AnthropicAdapter`;`openai-compat` 缺 `RADAR_BASE_URL` → 抛错。(用 `instanceof` + 暴露只读字段供断言。)
- [ ] **Step 2 跑** → 失败。
- [ ] **Step 3 实现** 工厂 + 迁 `loadDotenv`。
- [ ] **Step 4 跑** → 通过。
- [ ] **Step 5 提交** `git commit -m "feat(radar): makeModelClient(env) factory — provider/gateway presets + escape hatch (ADR-0007)"`

### Task 5: 接线 `cli.ts`

**Files:** Modify `src/cli.ts`

`cmdCheck` 里把 `const client = makeClient()` 换成 `const client = makeModelClient()`;删 `--model` 选项(改由 `RADAR_MODEL` env)或保留 `--model` 覆盖 env——**保留 `--model`**:若传入则 `process.env.RADAR_MODEL = values.model` 再 `makeModelClient()`。`import { makeModelClient } from "./llm.js"`;删对 `makeClient`/`DEFAULT_MODEL` 的 import(DEFAULT_MODEL 移到 llm.ts)。

- [ ] **Step 1** 改 `cli.ts` 如上。
- [ ] **Step 2 跑** `pnpm build && pnpm test && pnpm lint` → 全绿。
- [ ] **Step 3 烟测**(免费,不调 LLM):`node dist/cli.js extract` 仍正常;`comment --verdicts artifacts/pr1-verdicts.json --all` 仍输出(不受影响)。
- [ ] **Step 4 提交** `git commit -m "feat(radar): cli check builds the model client from env at the edge (ADR-0007)"`

### Task 6: eval 加 `--provider`/`--model`

**Files:** Modify `scripts/eval.ts`

eval 跑 grounded arm 处改用 `makeModelClient()`(读 env / CLI 参数 `--provider --model` → 设 env → 造 client)。ungrounded arm 同理。**不改语料/打分逻辑**,只换 client 来源。

- [ ] **Step 1** 改 `eval.ts`:解析 `--provider`/`--model` → 设 env → `makeModelClient()`。
- [ ] **Step 2 跑** `pnpm build` 通过;`--replay`(若支持)或 `--help` 路径不报错(不真调 LLM)。
- [ ] **Step 3 提交** `git commit -m "feat(eval): select provider/model so the Backstage benchmark runs across providers (ADR-0007)"`

### Task 7: 收口

- [ ] `pnpm lint && pnpm build && pnpm test` 全绿。
- [ ] `grep -rE "execFileSync|@anthropic-ai/sdk|new OpenAI|import OpenAI" src/` → 只命中 `src/llm.ts`(core 其它文件无 provider SDK,符合 ADR-0007-C1)。
- [ ] 补 `docs/specs` + 本计划的 **en 镜像**(PR 合并前,`doc-management` §5)。
- [ ] 更新 ST-0022 Verification 表;开 PR(引用 ST-0022 / ADR-0007)。
- [ ] (跑对比需 key,**由用户提供 + 用户触发**)eval 对比 Sonnet vs DeepSeek/OpenRouter,把数填回 spec §6。

## 自检(spec 覆盖)
- spec §2 端口 → Task 1 ✓ · §3.1 Anthropic → Task 2 ✓ · §3.2 OpenAI兼容+重试 → Task 3 ✓ · §4 配置预设 → Task 4 ✓ · §5 接线 → Task 5/6 ✓ · §6 eval → Task 6 ✓ · §7 测试 → Task 1/3/4 ✓ · §8 范围(只 check,不做 capture/drift)→ 计划未越界 ✓。
- 无占位;类型名一致(`ModelClient.complete`、`makeModelClient`、各 Adapter 构造字段)。
- 待实现核实项(spec §9):OpenRouter 的 json_schema 精确支持——Task 3/4 用 `mode` 配置,默认 OpenRouter 设 `json_schema`,若实跑发现不支持则该预设改 `json_object` 兜底。
