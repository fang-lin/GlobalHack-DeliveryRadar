# ST-0022: Review & restructure the radar CLI architecture (layered core / ports & adapters)

- **Status:** In progress
- **Type:** radar / architecture / refactor
- **Related:** ADR-0003 (TS rewrite) · ADR-0006 (platform-agnostic core) · **ADR-0007 (pluggable model layer — the concrete realization of adjustment A)** · design spec `docs/specs/2026-06-21-radar-model-layer-design.zh.md`

## Story

As a maintainer planning the radar's evolution (drift, capture, multi-host, multi-LLM, earned gating, the pre-PR agent), I want a clear, honest picture of the **current** CLI design and then a deliberate **target** layering — so future capabilities slot in by adding adapters / ops, not by reworking the core.

> ✅ Design settled (brainstormed + user-approved 2026-06-21). ADR-0006's "model adapter" idea is now realized by **ADR-0007** — a `ModelClient` port + native Anthropic & universal OpenAI-compatible adapters, gateway-aware (OpenRouter / Vercel AI Gateway presets). **Adjustment A (model port) is being implemented** per the design spec; ADR-0006 stays as the principle.

## Plan (the order we agreed)

1. **Survey all CLI source** (`src/**`) — done; recorded below.
2. **Present the current design** to the maintainer (the table + seams below).
3. **Agree the target layering** + which adjustments to do *now* vs *defer*.
4. **Finalize ADR-0006** to match; implement the agreed adjustments.

## 1 + 2. Current design (survey of all 7 modules, 681 LOC)

| module | LOC | responsibility | external deps | side effects |
|---|---|---|---|---|
| `models.ts` | 127 | shared contracts — `Constraint`/`Verdict` + zod schemas; `validateConstraint` (DM-CONSTRAINT-1/2) | `zod/v4` | none — **pure** |
| `retrieve.ts` | 55 | scope-first retrieval: `globToRegex` · `inScope` · `retrieve` (active + path-matched) | — | none — **pure** |
| `comment.ts` | 108 | render verdicts → review markdown (projection) | — (types only) | none — **pure** (post-decoupling) |
| `diff.ts` | 33 | parse unified diff → `FileDiff[]`; `loadDiff` reads a file | `node:fs` | reads a local file |
| `extract.ts` | 85 | ADR `constraints` YAML → `Constraint[]`; `extractFromDir` (dedup) · `adrSection` · dump/load | `node:fs`, `js-yaml` | reads ADR dir / writes dump |
| `checker.ts` | 145 | semantic check via LLM: `makeClient` (+`.env` loader) · `buildUserPrompt` · `checkConstraint` · save/load verdicts | `@anthropic-ai/sdk`, `node:fs`, `node:path` | **LLM API call** · reads `.env` · r/w verdicts |
| `cli.ts` | 128 | entrypoint: `parseArgs`, dispatch `extract`/`check`/`comment` | composes all | stdout / stderr |

**Dependency direction (who imports whom):** `models.ts` is the shared base everyone reads; `cli.ts` composes the rest. No module imports "outward". After ST-0021's decoupling, **`src/` contains no git/gh/platform calls** — the only outbound network call is the LLM in `checker.ts`.

**Seams / smells worth the maintainer's eye** (concrete — each tied to a candidate adjustment in §3):

**Seam 1 — the LLM provider is hardwired into `checker.ts`. (the one real "missing port")**
The provider SDK, the prompt, the model id and the schema-binding are all entangled in one module:
- `import Anthropic` (L11) + `import { zodOutputFormat }` (L12) — provider SDK bound directly.
- `DEFAULT_MODEL = "claude-sonnet-4-6"` (L23) — model id literal in the domain module.
- `SYSTEM` prompt (L25–44) — the *what to ask* (domain) sits next to the *how to call* (adapter).
- `makeClient()` → `new Anthropic()` (L70–73) and `client.messages.parse({ … output_config: zodOutputFormat(…) })` (L110–117) — the call shape is Anthropic-specific.
Why it matters: a second provider (OpenAI / Bedrock / Vertex / local) means editing the checker, and the request/response *schema* differs per provider. → **adjustment A: a `Model` port (`complete(system, user, schema) → parsed`) + an Anthropic adapter; the checker depends on the port, not the SDK.**

**Seam 2 — `checker.ts` carries ~4 concerns in 145 LOC.**
- `.env` / secret loading: `loadDotenv` (L50–68) — config/infra.
- provider client: `makeClient` (L70–73) — adapter.
- check orchestration: `buildUserPrompt` (L75–101) + `checkConstraint` (L103–136) — domain.
- verdict persistence: `saveVerdicts` / `loadVerdicts` (L138–145) — I/O.
Why it matters: the check logic can't be tested without the SDK + fs, and secret-loading shouldn't live inside the domain checker. → **adjustment C: split into config / adapter (folds into A) / check-orchestration / persistence.**

**Seam 3 — file I/O is scattered across domain modules, not pushed to the edge.**
`diff.loadDiff` (L31–33) · `extract.extractFromDir`/`adrSection` (L36, L59) · `extract.dumpConstraints`/`loadConstraints` (L75, L82) · `checker.saveVerdicts`/`loadVerdicts` (L138–145) · `checker.loadDotenv` (L50). All **local fs** — *not* an ADR-0006 platform-coupling issue — but the core isn't yet a set of pure `data → data` transforms. Note: the pure parse fns already exist (`extractFromText`, `parseUnifiedDiff`); it's the file-reading *wrappers* that could move to the CLI edge. → **adjustment B: read at the edge (CLI), pass text/objects into a pure core.**

**Seam 4 — no structural layer boundary.**
7 flat files in `src/`; core (`models`/`retrieve`/`comment`/parse fns) vs adapter (the LLM bits) vs persistence vs CLI are conceptual only, not visible in the tree. → **adjustment D: group into `src/core` + `src/adapters` (or similar). Optional / cosmetic.**

What's already healthy (don't disturb): one shared contract (`models.ts`, not forked per op), a pure `retrieve`, a now-pure `comment`, clean command separation in `cli.ts`.

## 3. Candidate adjustments (TO DISCUSS — not decided)

- **A — Extract a model port + adapter** (`llm.ts`): the core depends on a small `complete({system, user, schema}) → validated` port; native Anthropic + universal OpenAI-compatible adapters implement it. Fixes **seam 1** and adds multi-provider/gateway support. **✅ DONE** — see ADR-0007 + the design spec/plan; the model port also addresses most of seam 2 (config/.env moved out of `checker.ts`).
- **B — Push fs I/O to the edge** (CLI reads files / passes strings; core stays pure transforms). Fixes **seam 3** — bigger, likely *defer*.
- **C — Split `checker.ts`** into config / adapter (folds into A) / check-orchestration / persistence. Fixes **seam 2** — medium.
- **D — Folder layering** (`src/core`, `src/adapters`) to make the split visible. Fixes **seam 4** — optional / cosmetic.

## Acceptance criteria

- [x] All `src/` modules surveyed; current design documented (this story).
- [x] Maintainer reviewed the current design (brainstormed + approved 2026-06-21).
- [x] Target layering + now/defer adjustments agreed (hybrid: do **A** now; **B/C/D** deferred).
- [x] ADR-0006 un-parked — realized concretely by **ADR-0007** (the model layer).
- [x] **Adjustment A (model layer) implemented**; lint + typecheck + build + tests green (34 tests). B/C/D remain deferred (separate future passes).
- [x] **Config made coherent** (env-driven: provider/model/base_url/json-mode + `RADAR_API_KEY` universal fallback; `.env.example`) — see ADR-0007 §4 / spec §4.
- [x] **Self-reviewed** via `/code-review` (xhigh / recall): 15 findings, 12 fixed, 4 recorded — see "Code review" below.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `pnpm lint` + `build` + `test` | ✅ 34 tests; scripts `tsc --noEmit` ✅; `eval --replay` ✅ |
| Self-review | `/code-review` xhigh / recall (see below) | ✅ 15 found, 12 fixed, 4 recorded |
| Maintainer sign-off | maintainer agrees the design + reviews changes | ⬜ pending |

## Code review (self-review, 2026-06-21)

`/code-review` (xhigh / recall) over this branch (PR #9 + working tree): 10 independent finder angles → verify → sweep → **15 findings**. **Fixed 12 (#1–#10, #14, and #15's double-send); 4 recorded as low / deferred.** They surfaced *after* lint/build/test were green — evidence that design-first still needs a review gate.

> **绿 ≠ 对**:`tsc` 只编 `src/`(漏 `scripts/`);`--replay`、`--model`+`.env`、`json_schema` 真校验都没被测试覆盖(单测把 key 塞进 env、把 SDK mock 掉)。

| # | 严重度 | 位置 | 摘要 | 状态 |
|---|---|---|---|---|
| 1 | 🔴 | `scripts/baseline-review.ts:11` | import 了重构删除的 `makeClient`/`DEFAULT_MODEL` → 运行即崩 | ✅ 已修 |
| 2 | 🔴 | `src/llm.ts` 工厂 + `src/cli.ts` | `loadDotenv` 写 `process.env`、工厂读传入的 `env` 副本;`--model` 路径下 `.env` 里的 key 读不到 | ✅ 已修 |
| 3 | 🔴 | `scripts/eval.ts` cache key | key 加了 `${model}` 段,旧缓存仍是 `grounded:<id>` → `--replay`(免 key 路径)全空 | ✅ 已修 |
| 4 | 🔴 | `src/llm.ts` OpenAICompat | `z.toJSONSchema` 带顶层 `$schema`,被严格 `json_schema` 400 退回,retry 接不住 | ✅ 已修 |
| 5 | 🔴 | `src/llm.ts` 工厂 key 解析 | 空串原生 key 被 `??` 保留 → 跳过 `RADAR_API_KEY` 兜底 → `!apiKey` 抛错 | ✅ 已修 |
| 6 | 🟠 | `scripts/eval.ts` cache 守卫 | `cache[gKey] && (replay \|\| true)` 恒真,误导且与 #3 纠缠 | ✅ 已修 |
| 7 | 🟠 | `src/llm.ts` + ADR-0007 §4 / spec §4 | `AnthropicAdapter` 不接 `baseURL`,但文档(本次自己加的)称"覆盖任意 preset" | ✅ 已修 |
| 8 | 🟠 | spec §3.2(zh/en) | 中英镜像互相矛盾、且都与代码不符;"未知目标自动降级"未实现 | ✅ 已修 |
| 9 | 🟡 | checker/comment 测试 | `Constraint` fixture 重复手写(`as unknown as` 掩盖 schema 漂移) | ✅ 已修 |
| 10 | 🟡 | `scripts/eval.ts` | 自造 `argValue`、每旗标调两次、`--provider --model x` 误解析 | ✅ 已修 |
| 11 | 🟡 | `src/llm.ts` `max_tokens` | 新 OpenAI 推理模型要 `max_completion_tokens`(经网关通常被转译,看目标) | ⏭️ 记录 |
| 12 | 🟡 | `src/llm.ts` `jsonMode` | json 模式全局而非按 preset 能力;属早前"最稳默认"决策 | ⏭️ 记录 |
| 13 | 🟡 | `src/llm.ts` | `AnthropicAdapter` 无 retry、`OpenAICompatAdapter` 有 → 失败处理不对称 | ⏭️ 记录 |
| 14 | 🟡 | `scripts/eval.ts` cache key | key 不含 `RADAR_JSON_MODE` → 仅 json 模式不同的两次跑共用缓存 | ✅ 已修 |
| 15 | 🟡 | `src/llm.ts` | 冗余 `loadDotenv`;json_schema 模式 schema 双发(prompt + `response_format`) | 🟡 部分(双发已修;冗余记录) |

### 修复记录

- `src/llm.ts`:`loadDotenv` 返回值;新增 `resolveKey()`(`原生 || RADAR_API_KEY || loadDotenv(原生) || loadDotenv(RADAR_API_KEY)`,空串视未设)→ #2/#5;anthropic 分支 + `AnthropicAdapter` 接 `baseURL` → #7;`json_schema` 模式 `delete jsonSchema.$schema` 且不再把 schema 塞进 prompt → #4/#15。
- `scripts/baseline-review.ts`:改用 `Anthropic` SDK + `llm.js` 的 `loadDotenv`/`DEFAULT_MODEL` → #1。
- `scripts/eval.ts`:`argValue` 绑一次 + 守卫下一 token → #10;cache key 加 json 模式段 → #14;miss 回退查旧 key、去 `(replay\|\|true)` → #3/#6。
- 文档:spec §3.2 zh/en 对齐真实实现(`z.toJSONSchema` 手搓 + zod-v4 原因、删 `$schema`、去掉未实现的自动降级)→ #8。
- 测试:抽 `tests/fixtures/factories.ts` 共享 `makeConstraint`/`makeVerdict` → #9;新增 llm 单测 3 个(`$schema` 剥离、空 key 兜底、从 `process.env` 解析 key)。
- **验证**:`lint`/`build`/`test` ✅ 34 passed;`scripts/*.ts` tsc ✅;`eval --replay` 恢复(GROUNDED F1=1.00 / UNGROUNDED F1=0.40)。
- **暂不改(理由)**:#11(网关多会转译 `max_tokens`,改了反伤常见路径)、#12(全局默认 json_object 为有意决策)、#13(原生路径更稳;retry 可后续提端口层)、#15 余项(冗余 `loadDotenv` 已早返回,开销极小)。

## Notes

This story is **design-first**: steps 1–2 are documentation/review, no code moves until step 3 is agreed. The layered model under discussion: **L3 integration (workflow/gh) → L2 driving adapters (CLI, eval, future agent) → L1 pure core → analysis-engine ports (LLM now, semgrep later)** — but the point of this story is to ground that against the *actual* code above before committing to it.
