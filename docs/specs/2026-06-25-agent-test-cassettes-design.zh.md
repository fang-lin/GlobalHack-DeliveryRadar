> **权威: 中文（本文件） · 翻译: 英文（`2026-06-25-agent-test-cassettes-design.en.md`） · 最后同步: 2026-06-25 · 两版冲突以中文为准**

# Agent 测试录放盒（cassette）设计

- **状态**：草案（设计待维护者 review）
- **关联**：`ST-0024`（强化测试套件）· `ADR-0010`（一个共享 agent 引擎）· `ADR-0009`（capture agent 在边缘）· `ADR-0006`（核心平台无关、配置只 `process.env`）· 复用 `ai/test` 的 `MockLanguageModelV3`
- **日期**：2026-06-25

## 1. 背景与问题

radar 的两个核心 LLM 操作（conformance、capture）现在都跑在共享的调查式 agent 引擎 `runAgent`（`src/agent/engine.ts`）上：一个 Vercel AI SDK 的工具循环（`stopWhen: stepCountIs(24)`），模型可自主调用只读工具（`read_file` / `grep` / `git`，见 `src/agent/tools.ts`）去仓库里查证，多轮往返直到产出结构化结果；引擎还有双路径（`Output.object` 主路径失败 → text-parse 兜底）。

**问题**：现有的集成测试根本没测这条真正易错的链路。

- `tests/integration/conformance-pipeline.test.ts` / `capture-pipeline.test.ts` 用 `--replay` 喂**手写的理想 JSON**（假 verdicts / notes），命令走回放分支、**整个 agent 被跳过**——测的只是"把存好的结果渲染到 stdout"。
- `scripts/eval.ts --replay` 同样：它的 cache 录的是**最终结果**（`cache[gKey] = grounded` 存跑完的 verdict），回放时连 `runConformanceCheck` 都不调。

也就是说：模型真实会吐什么形状、`Output.object` 解析、text-parse 兜底、工具循环、`toVerdict` 转换——**这些最容易出错的部分，没有任何测试覆盖**。手写理想数据绕过了它们。这是一种"糊弄"。

另外，`tests/unit/skill-capture.test.ts` / `skill-conformance.test.ts` 两个测试只 `readFileSync` 一个 `SKILL.md` 然后正则断言含某关键词（`/implicit/i`、`/driver/i`），不 import 任何代码、脆弱、低信号——是 `ST-0024` co-location 留下的尾巴（没有对应 `.ts` impl，所以没被 co-locate）。

## 2. 目标 / 非目标

**目标**
1. 让 conformance、capture 的**真实 agent 行为**（工具循环、解析、兜底、`toVerdict`）被自动化测试覆盖，且**不调真 LLM、不花 API、完全确定**。
2. 用 **record/replay 录放盒（cassette）**：第一次真跑时录下模型与工具的全部交互；之后回放时模型与工具都吐录好的数据，**工具不真跑**，agent 自身逻辑真实执行。
3. 顺带清理测试套件：删两个鸡肋 skill 测试、统一 integration 命名、给 skill 文件加一个有价值的守卫。

**非目标**
- 不替换 `eval` 的语料/口径（eval 的回放是评测台的事，本设计只管 agent 单测/集成测试）。
- 不给 `extract` / `comment` 做 cassette（它们不调 LLM）。
- 不引入新的运行时依赖；不改 CLI 用户可见行为。

## 3. 方案总览

录放盒在 **agent 的两个外部边界** mock，agent 自身全真跑：

| 边界 | 录什么 | 回放怎么做 |
|---|---|---|
| **模型**（Vercel AI SDK `LanguageModel`） | 每次 `doGenerate` 的输入（规范化）+ 返回（content/finishReason/usage），按调用顺序 | `MockLanguageModelV3`（`ai/test`）按序返回录好的；**校验当前输入匹配录制输入** |
| **工具**（`tool().execute`） | 每次工具调用的 `name` + 输入 + 返回，按顺序 | 替换 `execute`：**不真跑**，按序返回录好的输出；**校验当前输入匹配** |

`runAgent` 的循环、`Output.object`/text-parse、`toVerdict` 全部真实执行——只有这两个边界喂录好的数据。

**防"静默过期"是核心**：回放时**校验输入**——当前这次 model 调用 / tool 调用的输入，必须等于 cassette 里对应那次的输入；不等则**测试失败并提示 `update` 重录**。否则改了 skill/prompt/工具后 cassette 仍返回旧数据、测试照绿，就变成另一种糊弄。

## 4. 架构与组件

新增一个测试侧模块 `tests/cassettes/`（基建 + 数据），生产代码只加最小的依赖注入口。

### 4.1 cassette 文件格式

每个用例一个 JSON 文件 `tests/cassettes/<op>-<case>.json`：

```jsonc
{
  "meta": {
    "op": "conformance",            // 或 "capture"
    "case": "violated-core-git",
    "recordedAt": "<ISO 日期，录制时写入>",
    "model": "vercel/deepseek-v4-pro",
    "jsonMode": "json_object"
  },
  "modelCalls": [                    // 按 doGenerate 调用顺序
    {
      "inputDigest": "<规范化输入的 hash>",
      "result": { /* doGenerate 的返回：content(text/tool-call 块)、finishReason、usage */ }
    }
  ],
  "toolCalls": [                     // 按工具调用顺序
    { "name": "grep", "input": { "pattern": "execFileSync", "path": "src" }, "output": "src/...:42: ..." }
  ]
}
```

> **待实现时核实**：`doGenerate` 返回的精确字段、`MockLanguageModelV3` 的构造形状（已知 `finishReason:{unified,raw}`、`usage:{inputTokens:{total},outputTokens:{total}}`）要对着所装 `ai@6` 版本的 `LanguageModelV3` 类型定，存够回放所需的字段即可。`inputDigest` 用规范化后的输入算 hash（剔除临时路径、时间戳等易变内容）。

### 4.2 录/放的模型与工具

- `recordingModel(real)`：包真 `LanguageModel`，旁路记录每次 `doGenerate` 的输入+返回。
- `replayModel(cassette)`：基于 `MockLanguageModelV3`，按 `modelCalls` 序列返回；每次校验 `inputDigest` 与当前输入一致，不一致抛错（提示 `update`）。
- `recordingTools(real, sink)` / `replayTools(cassette)`：包/替换 `buildTools` 产出的工具的 `execute`。回放版不真跑，按 `toolCalls` 顺序返回，并校验 `(name, input)` 一致。

### 4.3 生产代码的注入口（最小、向后兼容）

当前链路：`cmdConformance(argv)` → `selectModel(process.env)` + `runConformanceCheck({model, …, root})` → 内部 `buildTools(root)`；capture 同构（`cmdCapture` → `runCapture`）。tools 在 runner 内部造、没有注入口。改动：

- **runner** `runConformanceCheck` / `runCapture`：加**可选 `tools` 参数**，默认 `buildTools(opts.root)`。
- **命令** `cmdConformance` / `cmdCapture`：加**可选第二参 `deps?: { makeModel?, makeTools? }`**，默认 `selectModel` / `buildTools`，把 `makeTools` 透传给 runner。

生产路径完全不变（默认值即现状）；cassette 逻辑**全在测试侧**——测试调 `cmdConformance(argv, { makeModel, makeTools })` 注入录/放版。这样能端到端测命令（argv → retrieve → agent → render），只把模型+工具换成录放盒。

### 4.4 三态开关

环境变量 `RADAR_CASSETTE`：
- 不设 / 其它 → **`replay`**（默认；CI 与平时跑测试走这条，零 API）。
- `record` → 缺失的 cassette 才真跑录制（需同时配真 provider env：`RADAR_PROVIDER`/`RADAR_MODEL`/key）。
- `update` → 强制重录所有目标 cassette。

`record`/`update` **花 API，由维护者触发**（项目硬规矩）；`replay` 永不联网。

## 5. 覆盖的用例

固定 fixture（小型 ADR + diff，放 `tests/fixtures/`，必要时建成 git 快照供 `git` 工具用——见 §8 风险）：

- **conformance**：`violated`、`aligned`、`unknown` 三态各一条 cassette。
- **capture**：`has-notes`（抓到未记录决策）、`no-notes`（净空）两条。

回放测试断言的是 runner 产出的**结构化结果**（verdict 的 `result`/`constraint_id`；notes 的条数/`detected_decision`），而不是只看 stdout 含某字符串。

## 6. 顺带的测试整理（同一个 PR）

1. **删** `tests/unit/skill-capture.test.ts`、`skill-conformance.test.ts`；`tests/unit/` 清空后删空目录。
2. **统一 integration 命名**：CLI 渲染/argv 测试 `*-pipeline` → `<cmd>-cli`（`conformance-cli`、`capture-cli`、`comment-cli`，加上已有的 `extract-cli`）；真正的"模块接线"测试 `pipeline.test.ts` → `core-pipeline.test.ts`。用 `git mv` 保留历史，**内容不改**。
3. **skill 文件守卫**：用**一个数据驱动测试**替代删掉的两个——遍历 `skills/*/SKILL.md`，校验每个都有合法 frontmatter（`name` / `description`）。比逐个写经得起增删 skill；守住"`skills/` 是运行时按路径读、且打包发布的资产，别被改丢/改坏"这个真实风险。

**两类测试并存、互补**（不重叠）：
- **cassette 测试**（新）：测 agent 真实推理/工具循环/解析（注入录放盒）。
- **CLI 渲染测试**（现有 `--replay`，改名 `<cmd>-cli`）：测命令 argv 解析 + 把结果渲染成 stdout/markdown（喂结果，不碰 agent）。

## 7. 怎么验证这套基建本身

- **回放确定 + 零 API**：不设 `RADAR_CASSETTE` 跑全套，绿，且无任何网络调用。
- **防过期有效**：故意改 cassette 里的一个输入（或改 prompt），回放**必须变红**并提示 `update`——证明校验真的生效，不是摆设。
- **守卫有效**：故意把某个 `SKILL.md` 的 frontmatter 改坏，guard **必须变红**；恢复后变绿。（不做这步，guard 就是又一个永远绿的鸡肋测试。）
- **计数对账**：重命名不改测试数；删 2 个 skill 测试减 2；加 guard + cassette 测试各按其 case 数加。跑 `pnpm test` 核对，对不上即排查。
- `pnpm lint && pnpm build && pnpm test` 全绿。

## 8. 范围、风险与权衡

- **范围**：只 conformance + capture 用 cassette；`extract`/`comment` 不调 LLM、保持原样（仅可能改名）。
- **cassette 维护成本**：改 skill/prompt/工具/schema → 模型输入变 → 校验报错 → 需 `update` 重录（花 API、维护者触发）。这是刻意的：宁可显式重录，也不要静默过期。
- **`git` 工具的特例**：回放时工具不真跑，所以 `git` 不需要真 repo。但**录制**那一次工具是真跑的——若某用例的 agent 会调 `git`，录制时 fixture 得是个 git 快照。**简化**：优先选 agent 只用 `read_file`/`grep` 就能判的用例，避开 `git`，fixture 就只是普通固定目录。
- **匹配脆性**：输入里的临时路径/时间戳要规范化后再算 digest，否则回放误报不匹配。

## 9. 约束（ADR/项目规矩）

- 核心 `src/core/` 不碰 SDK/平台（`ADR-0006-C1`）；配置只 `process.env`（`ADR-0006-C2`）；cassette 基建在测试侧，不污染 `src/core`。
- 每个 LLM 操作仍只走共享引擎 `runAgent`（`ADR-0010-C1`）；注入口不改这条。
- ESM-only、`.ts` 导入后缀。
- **测试绝不调真 LLM**：`replay` 默认、CI 永不联网；`record`/`update` 花 API，**维护者触发，不由 Claude 触发**。
- 提交禁 AI 署名、引用 ID（`ST-0024`、本 spec）。
- cassette 进 git 前确认不混入 key / 敏感内容。

## 10. 参考与查证

- **现有基建（已读，2026-06-25）**：`src/agent/engine.ts`（`runAgent`、`stepCountIs(24)`、双路径）、`src/agent/tools.ts`（`read_file`/`grep`/`git`，均 `inRoot`/`cwd:root` 沙箱）、`src/agent/conformance-run.ts`（`runConformanceCheck({model,…,root})`，内部 `buildTools`）、`src/capture/agent.ts`（`runCapture`，内部 `buildTools`）、`src/cli/commands/{conformance,capture}.ts`（`cmd*(argv)` → `selectModel(process.env)`）、`scripts/eval.ts`（`--replay` 录的是最终结果层）、现有 5 个 `tests/integration/*` 与 2 个 `tests/unit/skill-*`。
- **待实现时核实**：所装 `ai@6` 的 `LanguageModelV3.doGenerate` 返回结构与 `MockLanguageModelV3` 构造形状（对着包类型定 cassette 要存的字段）；`tool().execute(input, options)` 的精确签名。
- **复用模式**：`src/agent/engine.test.ts`、`src/capture/agent.test.ts` 已用 `MockLanguageModelV3`，回放模型在其基础上扩展。
