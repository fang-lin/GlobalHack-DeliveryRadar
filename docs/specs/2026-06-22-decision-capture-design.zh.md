# 决策捕获（Decision Capture）— 设计文档

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-22-decision-capture-design.en.md`） · 最后同步: 2026-06-22 · 两版冲突以中文为准**

**关联:** `ADR-0009`（capture 以技能驱动的调查型 agent 落地，自己用 AI SDK 写、在边缘）· `ADR-0006`（平台无关核心）· `ADR-0007`（可插拔模型层）· `FR-CAP-1..9`（决策捕获）· `DM-DECISION-NOTE`（决策笔记数据模型）· `ST-0005`（capture 故事）· `ST-0009`（IIAC 技能）

---

## 1. 目标与范围

让交付雷达发现一个 PR **隐式做出、却无处记录**的架构决策（`FR-CAP-2`），把它**起草**成决策笔记（Decision Note），并以**人类确认后才生效**的方式推动它被记录下来。

**本切片（slice）做：**
- 一个 `capture` 操作：调查一个已合并 PR 的改动，产出 0..n 条草稿决策笔记。
- 一个由 IIAC 技能（SKILL.md）驱动、**自己用 Vercel AI SDK 写**的调查型 agent，运行在边缘（集成层），跑在便宜的、可插拔的模型上（如 DeepSeek，经 Vercel AI Gateway）。
- 集成到 `radar.yml`：PR 合并后触发，把每条值得记录的决策起草成一个**草稿 PR**（内含状态为 `Proposed` 的 ADR）或一个 **issue**，交人类合并/关闭来确认。

**本切片不做（明确非目标）：**
- 不自动**接受/合并** ADR、不向默认分支 push、不阻塞任何 PR 的合并（`ADR-0009-C2` / `NFR-TRUST-1`）。
- 不做行为层（Story/AC）捕获路由（`[Phase 2]`）。
- 不做毕业流程里"人类确认之后"的自动化（确认仍是人手动合并那个草稿 PR）。

---

## 2. 关键决策（详见 ADR-0009）

1. **范式：技能驱动的调查型 agent，而非单次 LLM 调用。** capture 要判"隐式 / 净新增 / 架构级"，必须看 diff 之外（仓库别处有没有同类写法、有没有旧 ADR 覆盖、git 历史怎么说）——这是 agent 的工具循环擅长、单次调用做不到的。
2. **实现：自己用 Vercel AI SDK 写 agent**（不用框架）。AI SDK 提供工具循环、Zod 校验的结构化输出、和 provider 路由；模型保持可插拔（与 `conformance` 同一套 provider 配置：DeepSeek 经 Vercel AI Gateway / OpenRouter / 任意 OpenAI 兼容 baseURL）。详见 `ADR-0009`。
3. **位置：agent + AI SDK + 调查工具都在边缘**（capture 适配器 / 集成层），纯核心 `src/core/` 不碰 SDK、不碰平台（`ADR-0009-C1`，强化 `ADR-0006`）。
4. **方法论是一份 SKILL.md**（`ST-0009`），作为 agent 的 `instructions` 注入。**怎么调查、跑哪些 git 命令、如何判断**，都写在技能里，不写成 git 逻辑代码。
5. **触发：PR 合并后**跑（与 `conformance` 解耦——后者在 PR 打开时跑）。
6. **产出是草稿**：agent 起草 → 工作流开草稿 PR / issue → 人类合并/关闭来确认。

---

## 3. 架构

### 3.1 纯核心复用（`src/core/`，不变其平台无关性）

- `io/diff.ts` `parseUnifiedDiff` — 解析合并产生的 diff。
- `io/extract.ts` `extractFromDir` + `core/retrieve.ts` — 得到**已记录的约束清单**，作为"这些已经记过，别重复"的反向上下文。
- `core/models.ts` — 新增 **`DecisionNote` schema**（见 §5）。
- `core/comment.ts`（或新增 `core/capture-comment.ts`）— **纯函数**把决策笔记渲染成 markdown（草稿 PR 正文 / issue 正文 / 评审正文）。不碰平台。

### 3.2 capture agent（边缘，新增 `src/capture/`，自己用 Vercel AI SDK 写）

- **agent 循环**：直接用 AI SDK 的多步工具调用（它自带循环 + 结束条件）；我们只写薄薄一层（约一两百行）。
- **instructions** = IIAC capture SKILL.md 正文（`ST-0009`）—— skill 放在**仓库顶层 `skills/capture/SKILL.md`**（在 `src/` 之外，它是内容资产、不是编译源码），agent 运行时读取它。
- **工具**（用 AI SDK 的 `tool()`，仅只读）：
  - `read_file`（读工作树文件）、`grep`（搜代码库）—— 文件系统读，`ADR-0006-C1` 允许（`extract.ts` 现也这么读）。
  - 一个通用的**只读命令**工具（如跑 `git log`/`blame`/`show`）—— 跑哪些、怎么解读，由 SKILL.md 指挥（见 §3.3）。
- **输入**：合并 diff + PR 标题/描述（`draft_rationale` 来源）+ 已记录约束清单（去重依据）。
- **输出**：AI SDK 的结构化输出（`Output.object` + Zod schema），得到 `DecisionNote[]`（见 §5）。
- **模型**：从 `process.env`（`RADAR_PROVIDER` 等）映射成 AI SDK 的 model（如 DeepSeek 经 Vercel AI Gateway + `AI_GATEWAY_API_KEY`）。配置只来自环境（`ADR-0006-C2`）。
- **可靠性兜底**：DeepSeek 在"工具循环 + 结构化输出"下的可靠性不确定 → 把 schema 放进 prompt 和/或加一道单独的结构化步骤；校验失败时宽松处理（记录/返回空，绝不 crash）。capture 是 advisory。
- **安全**：工具只读；配置只来自 `process.env`（`ADR-0006-C2`）。

### 3.3 平台边界（`ADR-0006`）与 git 位置

- 所有**写平台**的动作（开草稿 PR、开 issue）由**工作流**做（`gh`），核心/适配器只产出内容。
- **git 能力归 skill**：跑哪些（只读）git 命令、怎么解读，全写在 SKILL.md 里；我们的代码只提供一个**通用的只读命令工具**（与 git 无关）。git 的逻辑在 skill，执行器在 capture 边缘适配器（`src/capture/`）。
- **`src/core/` 绝不碰 git/平台**。`ADR-0006-C1` 按"管纯核心 `src/core/`"理解，边缘适配器（io / llm / cli / capture agent）各自做自己的 I/O —— 这是对 `ADR-0006-C1` scope 的细化（**已确认**：`ADR-0006-C1` 的 scope 已正式从 `src/**` 改为 `src/core/**`）。
- git 始终**只读**。

---

## 4. 数据流（端到端）

```
PR 合并 → radar.yml(on: pull_request closed & merged)
  → checkout 合并后的 main(fetch-depth: 0,供 grep / 只读 git 查证) + gh pr diff <PR号> > merge.diff(合并后仍可取)
  → radar capture --diff merge.diff --adr-dir docs/adr [--save notes.json]
       capture agent(AI SDK,边缘):
         instructions = IIAC SKILL.md
         输入 = merge.diff + 已记录约束清单
         调查 = read_file / grep / 只读 git(由 skill 指挥)
         输出 = DecisionNote[](Zod 校验;0 条也合法)
  → notes.json
  → 对每条笔记:
       够起草 ADR → 工作流开一个【草稿 PR】(新增 docs/adr/ADR-NNN.md, Status: Proposed)
       不够 → 工作流开一个【issue】("为 X 记录一个决策")
  → 人类【合并或关闭】来确认(合并 PR = 接受 → Proposed→Accepted → 重新提取约束, FR-LOOP-1)
```

要点:capture 与 conformance **不再共用一次扫描**(`FR-CAP-1`/`FR-ARCH-1` 随之更新);capture 每个 PR 只在合并后跑一次,成本可控(`NFR-COST-1`/`NFR-PERF-1`)。

---

## 5. 数据模型 — agent 输出（对齐 `DM-DECISION-NOTE`）

agent 产出的每条笔记（`id`/`pr`/`status`/`graduated_to` 由集成层补齐）：

```ts
DecisionNote = {
  detected_decision: string;                 // 一句话:这个 PR 看似做了什么决策
  evidence: { file: string; lines: [number, number] }[];  // 证据 hunk
  suggested_class: "architectural" | "behavioral";        // 建议分类
  draft_rationale: string;                    // 从 PR 描述/关联 story 提炼的理由草稿
  confidence: number;                         // 0..1
  why_net_new: string;                        // 为何认为它未被任何现有约束/ADR 覆盖(去重依据)
};
CaptureOutput = { notes: DecisionNote[] };    // 空数组合法 —— 不要硬造决策
```

集成层补齐 → 落到 `DM-DECISION-NOTE`：`id`(如 `DN-2026-NNNN`)、`pr`、`status: draft`、`graduated_to: null`。

---

## 6. CLI — `radar capture`

```
radar capture --diff <file> --adr-dir <dir> [--save <f>] [--replay <f>] [--verbose]
```
- 在仓库根目录运行;agent 的只读工具作用于当前工作树。
- `--save` 把 `notes.json` 存盘;`--replay` 直接读 `notes.json`、跳过 agent(demo 决定论,与 `conformance` 一致)。
- 输出:把笔记打印到 stdout(人读)+ 可存 JSON(机读)。**不**发任何平台动作(`ADR-0006`)。

---

## 7. 集成 — `radar.yml`

- **触发**:`pull_request` 的 `closed` 事件且 `merged == true`(合并后);保留 `workflow_dispatch` 与 `/radar capture` 评论命令手动重跑。
- **步骤**:checkout 合并后的 main(`fetch-depth: 0`,供 grep / 只读 git)→ `gh pr diff <PR号>` 取本 PR 的 diff（合并后仍可取）→ 跑 `radar capture --adr-dir docs/adr --save notes.json`（约束直接读 checkout 出来的 main 上的 ADR，无需单独基线）→ 渲染每条笔记 → **工作流**用 `gh` 开草稿 PR 或 issue。
- **始终 advisory**:不设失败/必需状态,不阻塞合并(`ADR-0009-C2`/`FR-CONF-9`)。
- 草稿 PR 与触发 PR 解耦(`FR-CAP-9`):触发 PR 已合并;ADR 草稿异步跟进。

---

## 8. IIAC capture SKILL.md（`ST-0009`，本设计给出大纲，单独成文）

**位置**:`skills/capture/SKILL.md`（仓库顶层，在 `src/` 之外 —— 它是内容资产、不是编译源码；按 npm 包发布时（`ADR-0008`）加进 `files` 一起发，agent 运行时读取）。遵循 agentskills.io 的 SKILL.md 格式（可移植）；`.claude/` 是 Claude Code 的本地配置，不放那里。

技能正文（作为 agent 的 instructions）至少覆盖:
- **判据**:什么算一次值得捕获的决策 —— 必须同时是**隐式**(PR 没明说)、**净新增**(无现有约束/ADR 覆盖)、**架构级**(影响结构/集成/数据,而非局部实现)。
- **调查步骤（从 diff 出发、按需向外，不盲扫全库 —— `NFR-RETRIEVAL-1` 精神）**:读 diff（决策发生处）→ 读 PR 标题/描述拿理由 → 对疑似决策，用 grep 看仓库别处有没有同类写法、读相关代码、查触及文件的 git 历史 → 对照已记录约束/ADR 去重。
- **诚实护栏**:**输出 0 条是合法且常见的**;证据不足、或已被现有 ADR 覆盖,就**不要**产出(对应 vision §9 的诚实约束、`FR-CAP-4` 第 3 问)。
- **输出契约**:严格按 §5 的 `DecisionNote` 结构;每条都要带 `evidence` 与 `why_net_new`。
- **正反例**:给若干"好的捕获"与"不该捕获"的例子做 few-shot 锚定。

---

## 9. 成本 / 性能 / 安全

- **成本/性能**(`NFR-COST-1`/`NFR-PERF-1`):每 PR 合并后只跑一次;便宜可插拔 provider;advisory 不阻塞。
- **安全**(`NFR-SEC-1`):agent 工具**只读**;只开草稿 PR/issue(写动作=人类合并);最小权限令牌;不改访问控制/分支保护。
- **信任**(`NFR-TRUST-1`/`ADR-0009-C2`):机器起草,人类确认=合并/关闭。

---

## 10. 测试（沿用 `ST-0024` 纪律：集成测试绝不调真 LLM）

- **纯核心**:`DecisionNote` schema 校验、笔记渲染 —— fixture 单测。
- **agent**:注入一个**假模型**(AI SDK 的 `MockLanguageModelV3`)产出可预期的笔记;断言工具被正确调用、结构化输出被正确解析。
- **集成**:用 `--replay notes.json` 跑通"笔记 → 渲染 → (工作流层 mock 的)开 PR/issue",不触网。
- **demo 决定论**:`--save`/`--replay` 录制一次真实运行的笔记供演示。

---

## 11. 风险与待核实（实现时复核）

1. **DeepSeek 在"工具循环 + 结构化输出"下的可靠性**不确定 → 备:把 schema 放进 prompt / 加一道单独结构化步骤 / 校验失败时宽松处理(不 crash)。
2. **配置卫生(`ADR-0006-C2`)**:agent 的模型/密钥只来自 `process.env`(AI SDK 读 `AI_GATEWAY_API_KEY` 等环境变量);`src/` 不读 `.env`。留意所选 provider 包的依赖足迹。
3. **OpenRouter 变量名 / Vercel 上 DeepSeek 精确 model id** 在实现时于官方 live 页确认。
4. **git 位置 / `ADR-0006-C1` scope**:git 逻辑在 skill、执行器在 `src/capture/` 边缘;`ADR-0006-C1` 的 scope 已细化为 `src/core/`(已确认)。

---

## 12. 参考与查证（provenance）

- **Vercel AI SDK 能力**(多步工具调用循环、`Output.object` 的 Zod 结构化输出、provider 路由含 DeepSeek 经 Vercel AI Gateway / OpenRouter / OpenAI 兼容 baseURL、`MockLanguageModelV3` 假模型)—— 于 **2026-06-22** 对照 `ai-sdk.dev` 与官方仓库核实。
- **开源 agent 选型调研**(opencode/Goose/Codex CLI/OpenHands 等 turnkey,与 Vercel AI SDK/Mastra/LangGraph/Pydantic AI 等框架;provider 锁定非问题、SKILL.md 为开放标准)—— 于 **2026-06-22** 联网核实。
- **结论**:agent 本质是个小循环,AI SDK 已经把它(循环 + 结构化输出 + provider 路由)提供好了;Mastra 等框架是架在 AI SDK 之上、多了我们这刀用不到的东西(workflow/子 agent/记忆/评测),故**自己用 AI SDK 写**(见 `ADR-0009`)。
- **待核实项**见 §11。Agent/LLM 工具演进快,实现时再次复核。

---

*设计文档（待维护者 review）。*
