# 统一调查 agent — 设计文档(conformance 升级为 agent)

> **权威: 中文(本文件) · 翻译: 英文(`2026-06-24-unified-agent-design.en.md`,本设计批准后补) · 最后同步: 2026-06-24 · 两版冲突以中文为准**

**关联:** `ADR-0010`(操作即技能,运行在一个调查 agent 上;取代端口)· `ADR-0009`(capture,本模式的首个实例)· `ADR-0007`(ModelClient 端口,此处被取代)· `ADR-0006`(平台无关核心)· `FR-CONF-1..10` · `FR-CAP-1..9` · `NFR-RETRIEVAL-1` · `NFR-EVAL-1`/`AC-2` · `ST-0009`(方法论即技能)· `ST-0010`(radar 作为调查 agent)

---

## 1. 目标与范围

把 radar 的三个操作统一到**一个通用调查 agent 引擎**上:操作之间只差**一份 SKILL.md + 一个输出 schema**。本设计落地两件事:① 把 **conformance(一致性检查)从单次调用升级为 agent**(能在 diff 证据不足时调查,而非直接吐 `unknown`);② 把现有 **capture 重构到这个共享引擎上**。drift 留作将来的同款实例。

**做:**
- 抽出通用 agent 引擎(AI SDK 工具循环 + 只读工具 + 结构化输出,接收 `{skill, outputSchema, tools}`)。
- conformance:**作用域优先检索保持确定性**(NFR-RETRIEVAL-1),命中的约束**一次判一条**,走 agent + conformance 技能 + `Verdict` schema。
- capture 重构到共享引擎(行为不变)。
- 取代 ModelClient 端口:删两个旧适配器 + `openai`/`@anthropic-ai/sdk` 依赖;eval 改接引擎。
- CLI 改名 `check` → `conformance`。
- 评测台 gate:agent 版 vs 单次版对比 precision/recall,不退化才替换。

**不做(明确非目标):**
- 不把检索交给 LLM(NFR-RETRIEVAL-1,检索永远是确定性代码)。
- 不动 capture 的对外行为(只换底层引擎)。
- 不在本切片做 drift(将来同款)。

---

## 2. 关键决策(详见 ADR-0010)

1. **一个通用调查 agent 引擎**,参数化 `{skill, outputSchema, tools}`,返回 zod 校验对象。
2. **操作 = 技能 + 输出 schema + 确定性外壳**:conformance / capture / (将来)drift。
3. conformance **升级为 agent**:能调查(读码/grep/git),减少 `unknown`;但 `unknown` 仍是合法结果(FR-CONF-6)。
4. **取代 ModelClient 端口**(ADR-0007);保留其"可插拔、便宜、边缘选 provider"的本意(引擎仍从 `RADAR_PROVIDER` 选)。
5. **ADR-0003-C1 改为 provider 无关**(去掉 `messages.parse` 字面绑定)。
6. **质量硬 gate**:评测台对比,不退化才上(与成本无关,是"别盲换更差的检查器")。

---

## 3. 架构

### 3.1 通用 agent 引擎(新增 `src/agent/`,边缘)

```
runAgent({ skill, tools, outputSchema, system?, user, root }) → Promise<T(zod 校验)>
```
- 内部:AI SDK 的 `generateText({ tools, output: Output.object(schema), stopWhen })` 工具循环 + 失败兜底(把 schema 放进 prompt / 单独结构化步 / 校验失败返回兜底,绝不 crash)。
- 工具:`read_file` / `grep` / 只读 `git`(从现有 `src/capture/tools.ts` 抽到引擎)。
- provider:从 `process.env`(`RADAR_PROVIDER` 等)选,沿用现有 `src/capture/model.ts` 的 `selectModel`(配置只来自环境,ADR-0006-C2)。
- **这是唯一的模型调用路径**(ADR-0010-C1)。

### 3.2 conformance 外壳(`src/cli/commands/conformance.ts` + 核心)

```
确定性检索(retrieve,NFR-RETRIEVAL-1)挑出命中约束
  → 对每条命中约束:runAgent({ skill: conformance, schema: Verdict,
        user: 约束(rule+driver+examples)+ 命中文件 diff, root: 仓库根 })
  → Verdict[]
  → 渲染(comment,纯函数)
```
- **检索仍是确定性代码**(`core/retrieve.ts` 不变,ADR-0010-C2):agent 只"判",不"挑"。
- **一次一条约束**(已拍板):证据聚焦,裁定能精确指到 ADR 条款 + 代码行。
- conformance 技能(`skills/conformance/SKILL.md`)指导:对着这一条约束判 diff,证据不足时**用工具调查**(读 enclosing 代码、grep 别处用法、查 git),再给 `aligned`/`violated`/`unknown` + 证据 + 置信 + fix_locality;判**字面也判理由**(driver),沿用现有 `checker.ts` 的系统提示精神。

### 3.3 capture 外壳(重构)

`src/capture/agent.ts` 改为调用 `runAgent({ skill: capture, schema: CaptureOutput, ... })`。对外行为、输出、CLI、工作流**都不变**——只是底层换成共享引擎。`src/capture/tools.ts`、`model.ts` 移/共享到 `src/agent/`。

### 3.4 退役的东西

- `src/llm/port.ts`(ModelClient)、`anthropic-adapter.ts`、`openai-compat-adapter.ts`、`factory.ts` → 删。
- 依赖 `openai`、`@anthropic-ai/sdk` → 移除。
- `eval.ts` 从 `makeModelClient`/`complete()` 改接 `runAgent`(单次档:无工具或最小工具,走 conformance 技能)。
- `ADR-0007-C1` 标 `superseded_by: ADR-0010`;`ADR-0003-C1` 改 provider 无关措辞。

---

## 4. 数据流(conformance,一次 PR)

```
radar.yml(不变:checkout PR + 取 main ADR 基线 + gh pr diff)
  → radar conformance --adr-dir .radar-baseline/docs/adr --diff pr.diff --save verdicts.json
       extract 约束 → retrieve 命中(确定性)
       for 每条命中约束:
         runAgent(conformance 技能, Verdict schema, 约束+diff, root=PR代码)
           ├─ 主路径:Output.object → Verdict
           └─ 证据不足:agent 用 read/grep/git 调查后再判(而非直接 unknown)
       → verdicts.json
  → radar comment 渲染 → 工作流贴 sticky review(FR-INT-7,不变)
```

---

## 5. 数据模型

- **Verdict**(沿用现有 `DM-VERDICT`/`models.ts`,不变):`constraint_id` / `result`(aligned|violated|unknown)/ `confidence` / `evidence`(adr_clause ↔ code)/ `explanation` / `fix_locality` / `fix_direction`。
- **DecisionNote**(capture,不变)。
- agent 引擎对二者一视同仁:传不同 schema 即可。

---

## 6. CLI

- `radar conformance --diff <f> --adr-dir <d> [--save --replay --verbose]`(原 `check` 改名;参数不变)。
- `radar capture`(不变)、`radar extract`(不变)、`radar comment`(不变)。
- `radar.yml` 第 120 行 `check` → `conformance`;README、测试同步。

---

## 7. 测试(沿用 ST-0024 纪律:集成测试绝不调真 LLM)

- **引擎**:用 AI SDK 的 `MockLanguageModelV3` 假模型(沿用 capture 的测法);断言工具被调、结构化输出被解析、兜底不 crash。
- **conformance 外壳**:retrieve(确定性)单测不变;agent 路径用假模型测;`--replay` 集成测试不触网。
- **capture**:重构后回归测试,行为不变。
- **质量 gate(非自动化、维护者触发)**:`pnpm eval` 回放对比 agent 版 vs 单次版 precision/recall。

---

## 8. 风险与待核实

1. **质量回归**:conformance 是已校准核心,换 agent 必须过评测台对比才替换(`NFR-EVAL-1`/`AC-2`)。**硬 gate。**
2. **成本/延迟**:每个 PR 的 conformance 现在是每约束一个工具循环,比单次贵/慢——已按"DeepSeek 便宜随便用"接受;仍 advisory 不阻塞。
3. **非确定性**:`--replay` 保 demo 决定论。
4. **dogfood 连锁**:`ADR-0007-C1`/`ADR-0003-C1` 不同步改,radar 自审会(正确地)报冲突——本设计已含这两处改动。
5. **eval 单次基线**:`eval.ts` 现在测单次路径;要先存一份当前单次版的基线结果,改造后对比。

---

## 9. 实施顺序(供后续写计划)

1. 抽 `src/agent/`(引擎 + 工具 + 选模型),capture 先切到引擎(回归测试保行为)。
2. conformance 外壳改用引擎 + conformance 技能;CLI 改名;radar.yml 同步。
3. 退役端口/适配器/旧依赖;eval 改接引擎。
4. 改 `ADR-0007-C1`(superseded)+ `ADR-0003-C1`(provider 无关)。
5. 评测台 gate(维护者触发)→ 通过才合。

---

## 10. 参考与查证(provenance)

- **AI SDK 能力**(工具循环 `generateText`/`stopWhen`、`Output.object` zod 校验、provider 路由含 DeepSeek 经网关、`MockLanguageModelV3`)—— 2026-06-22 对照 `ai-sdk.dev` 核实(记录于 capture 设计文档)。
- **决策依据**:见 `ADR-0010`(本模式)、`ADR-0009`(capture 首例)。
- **未做的核实**:agent 版 conformance 的 precision/recall **尚未测**——是实施的 gate,不是这里的结论。

---

*设计文档(待维护者 review)。*
