# Delivery Radar 模型层设计(可插拔 provider / 网关)

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-21-radar-model-layer-design.en.md`） · 最后同步: 2026-06-21 · 两版冲突以中文为准**

- **日期:** 2026-06-21
- **状态:** 已评审通过(设计),待写实现计划
- **作者:** Lin Fang
- **关联:** ADR-0007(本设计的决策记录)· ADR-0006(核心平台无关)· ADR-0003(TS / 类型化结构化输出)· ST-0022(架构重构·调整A)
- **目标:** 把 `checker.ts` 直连 Anthropic 抽成"模型端口 + 适配器",让 radar 兼容大部分模型 + 网关(OpenRouter / Vercel AI Gateway 这类),Claude 走原生(结构化输出最稳),其余走统一 OpenAI 兼容。

## 1. 架构

```
        依赖只能由外向内 ↓
CLI 边缘  ── makeModelClient(env) 读配置、造 client、注入 ──┐
                                                            ▼
L1 核心(纯)  checkConstraint(client: ModelClient, …)  ── 只认端口
                                                            │ 端口
                  ┌─────────────────────────────────────────┴─────────┐
                  ▼                                                     ▼
        AnthropicAdapter(原生)                       OpenAICompatAdapter(通用)
        @anthropic-ai/sdk                            openai SDK + 可配 baseURL
        messages.parse + zodOutputFormat             json_schema/json_object + zod + retry
        (schema 强约束)                              → OpenRouter / Vercel / DeepSeek / …
```
核心不 import 任何 provider SDK(ADR-0007-C1);provider/网关细节只在适配器里。

## 2. 端口契约(core 唯一依赖)

新增 `src/llm.ts`:
```ts
export interface ModelClient {
  /** 传 prompt + zod schema,拿回已校验对象;内部负责结构化输出与重试,失败抛错。 */
  complete<T>(opts: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<T>;
}
```
`checker.ts` 的 `checkConstraint(client: Anthropic, …)` 改成 `(client: ModelClient, …)`;`buildUserPrompt` 不变;`SemanticCheckOutputSchema`(`models.ts`)作为 `schema` 传入,不变。

## 3. 适配器

### 3.1 AnthropicAdapter(原生·保留)
`messages.parse({ model, system, messages, output_config: zodOutputFormat(schema) })` → `parsed_output`(schema 强约束,已校验)。即现有 `checker.ts` 逻辑迁过来。

### 3.2 OpenAICompatAdapter(通用·新增)
`new OpenAI({ baseURL, apiKey, defaultHeaders })`。结构化输出两条路径,由 `RADAR_JSON_MODE` 选择(默认 `json_object`,兼容面最广;目标支持时设 `json_schema`);均对照官方文档核实于 2026-06(Chat Completions 仍是当前受支持的标准面,Responses API 并存但未取代):

- **`json_schema` —— 支持的目标(OpenAI / Vercel AI Gateway / OpenRouter 中支持的模型)**:`response_format:{ type:"json_schema", json_schema:{ name:"verdict", schema, strict:true } }`,其中 `schema` 由 `z.toJSONSchema(schema)` 生成(**须删掉顶层 `$schema` 键**——严格模式拒绝未知顶层键)→ `JSON.parse` → **zod 校验**。注:不用 OpenAI SDK 的 `zodResponseFormat` / `chat.completions.parse` 助手——它们面向 zod v3,本项目用 zod/v4,故手搓 schema + 解析。
- **`json_object` —— 只支持它的目标(如 DeepSeek)**:`response_format:{ type:"json_object" }` + 在 prompt 里附 schema(DeepSeek 要求 prompt 含 "json")→ `JSON.parse` → **zod 校验**。

两路共用一个**重试循环**(默认上限 3 次):空返回或 `JSON.parse` / zod 校验失败即重试,追加"只返回符合该 schema 的 JSON"提示;超限抛错(由 radar workflow 失败路径接住,不崩)。各网关对 json_schema 的精确支持以实现时核实为准(OpenRouter 透传 `response_format`)。

## 4. 配置与选择(env 驱动:预设 + 逃生口)

工厂 `makeModelClient(env)` 在 **CLI 边缘**执行(IO 在边缘,ADR-0006)。**全部配置只来自环境变量(`process.env`)—— CLI 不读任何 `.env` 文件**:运行环境就是纯 shell,不假设前置条件;CI/pipeline 里没有 `.env`,靠注入 env/secrets。本地开发自己把 `.env` `source` 进 shell(`set -a; source .env; set +a`)即可;模板见仓库根 `.env.example`。

**后端选择(数据驱动预设)**

| `RADAR_PROVIDER` | 适配器 | base_url(默认) | 原生 key env | model 串示例 | 备注 |
|---|---|---|---|---|---|
| `anthropic`(默认) | Anthropic 原生 | — | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | 最稳;schema 强约束 |
| `openrouter` | OpenAI 兼容 | `https://openrouter.ai/api/v1` | `OPENROUTER_API_KEY` | `anthropic/claude-…`、`deepseek/…` | 自动带头 `HTTP-Referer`/`X-Title` |
| `vercel` | OpenAI 兼容 | `https://ai-gateway.vercel.sh/v1` | `AI_GATEWAY_API_KEY` | `provider/model`(如 `anthropic/claude-sonnet-4-6`) | 统一入口/预算;支持 json_schema |
| `openai-compat` | OpenAI 兼容 | 无(必须 `RADAR_BASE_URL`) | `RADAR_API_KEY` | 任意 | 逃生口:任何其它兼容网关/provider(含直连 DeepSeek `https://api.deepseek.com` + `deepseek-v4-flash`) |

**通用配置项**

- `RADAR_MODEL` —— model 串(网关必填;`anthropic` 缺省 `claude-sonnet-4-6`)。CLI `check --model` 可临时覆盖(不改 `process.env`,传合并后的 env)。
- `RADAR_BASE_URL` —— 覆盖端点。`openai-compat` **必填**;其余预设**可选覆盖**(指向自建/代理网关)。
- `RADAR_JSON_MODE` —— `json_schema` | `json_object`,默认 `json_object`(兼容面最广,含 DeepSeek);目标支持 json_schema 时再开。
- **key 解析(自洽规则)**:每个后端用 `原生KEY ?? RADAR_API_KEY` —— `RADAR_API_KEY` 是**通用兜底键**,各家原生名(`ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `AI_GATEWAY_API_KEY`)只是便利、优先生效。

- key 一律走环境变量,**绝不进 git**(`.env` 仅本地 `source`、被 `.gitignore` 忽略;模板 `.env.example` 入库)。
- 选 `anthropic` → AnthropicAdapter;其余三个 → OpenAICompatAdapter(数据驱动预设,仅 base_url/key/headers 不同)。

## 5. 代码改动清单(= ST-0022 调整A + 多 provider)

- **新增 `src/llm.ts`**:`ModelClient` 端口 + `AnthropicAdapter` + `OpenAICompatAdapter` + `makeModelClient(env)`。
- **改 `src/checker.ts`**:`checkConstraint` 收 `ModelClient`;删掉直连 Anthropic 的细节、`makeClient`、`loadDotenv`(挪到边缘/工厂)。
- **改 `src/cli.ts`**:`check` 命令在边缘 `makeModelClient(env)`,注入 `checkConstraint`。
- **改 `scripts/eval.ts`**:加 `--provider` / `--model`,复用同一工厂。
- **`src/models.ts` 不变**(schema 即契约)。
- 依赖:加 `openai`(npm)。

## 6. 评测计划(回答"质量会不会变差")

同一套 Backstage eval(grounded vs ungrounded),分别用 `anthropic`(Sonnet)、`openrouter`(可指向各家)、直连 DeepSeek 各跑一遍,比 **F1 / P / R + 检索命中**。按数据定"默认 provider";结果本身作为 showcase 论据("provider 无关 + 实测各家质量/成本权衡")。需要对应 API key 才能真跑。

## 7. 测试

端口可 mock:用一个返回固定 `Verdict` 的假 `ModelClient` 给 `checkConstraint` 写纯单测(无网络、无 key)——补上 ADR-0006 说的核心可测性。适配器层的结构化输出/重试逻辑单独测(喂构造的"空返回/坏 JSON"输入)。工厂另测预设/缺 key/缺 model/未知 provider,以及 **`RADAR_API_KEY` 兜底**与 **`RADAR_BASE_URL` 覆盖**。纯模块 `diff`(解析:多文件切段、删除文件保留旧路径、去尾换行)与 `comment`(渲染:排序、空路径、徽章/证据)各有单测。

## 8. 范围 / 非目标

- **范围**:本次只做 `radar check` 的 LLM 调用走端口 + 两个适配器 + eval 旋钮。
- **端口设计成通用**(`complete({system,user,schema})`),将来 capture(ST-0005)/ drift(ST-0006)/ agent(ST-0010)可直接复用——但**本次不实现它们**。
- 不做 streaming、不做多模型并行投票、不做自动 failover(网关自己可能带,先不在 core 做)。

## 9. 参考与查证(provenance)

本设计的供应商/接口事实均查过官方文档(查证于 **2026-06-20/21**),非凭记忆。LLM API 演进快,实现与日后复核时应重新核对(尤其各网关的 json_schema 支持、模型名、价格)。

| 来源(URL) | 查证得到的事实 |
|---|---|
| DeepSeek API `https://api-docs.deepseek.com/`(含 json_mode、pricing 页) | OpenAI/Anthropic 兼容,base_url `https://api.deepseek.com`;现役模型 `deepseek-v4-flash`(thinking/non-thinking 两模式)/ `deepseek-v4-pro`(旧名 `deepseek-chat`/`deepseek-reasoner` 已于 2026/07/24 废弃);结构化输出**仅 `json_object`**(需 prompt 含 "json"、官方自认偶尔空返回)→ 决定它走兜底路径;价格 v4-flash 输入 $0.14 / 输出 $0.28 每 1M(输入 cache-hit $0.0028)→ 比 Sonnet-4-6($3/$15)便宜约 20–50×。 |
| OpenRouter `https://openrouter.ai/docs/quickstart` | OpenAI 兼容,base_url `https://openrouter.ai/api/v1`,标准 apiKey,model slug `provider/model`,可选头 `HTTP-Referer`/`X-Title`。**待核实**:structured-outputs 专页当时 404 + WebSearch 不可用,json_schema 精确支持留待实现确认(透传 `response_format`)。 |
| Vercel AI Gateway `https://vercel.com/docs/ai-gateway/sdks-and-apis/openai-chat-completions` | OpenAI Chat Completions 兼容,base_url `https://ai-gateway.vercel.sh/v1`,`AI_GATEWAY_API_KEY`(Bearer)或 OIDC,model `provider/model`(如 `anthropic/claude-opus-4.7`),**支持 structured outputs**。 |
| OpenAI 结构化输出 `https://developers.openai.com/api/docs/guides/structured-outputs`(注:文档域名已由 `platform.openai.com` 迁至 `developers.openai.com`) | Chat Completions **仍受支持**(Responses API 并存,未取代)→ 选它作兼容目标;json_schema strict 形态 `{type:"json_schema", json_schema:{name, schema, strict:true}}`;SDK 助手 **`zodResponseFormat` + `chat.completions.parse()`** → 决定通用适配器 json_schema 路径与 Anthropic 适配器对称。 |
