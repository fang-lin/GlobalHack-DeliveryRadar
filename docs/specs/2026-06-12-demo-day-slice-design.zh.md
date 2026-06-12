# Demo Day 切片设计 — Delivery Radar 演示视频

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-12-demo-day-slice-design.en.md`） · 最后同步: 2026-06-12 · 两版冲突以中文为准**

## 1. 目标与约束

- **交付物**：一支约 **5 分钟**的 demo 视频，**2026-06-12 24:00 CEST 前提交**（hackathon）。
- **北极星**：需求规格 `AC-3` —— 对一个 CI 全绿的 PR，展示它悄悄违反的 ADR 条款、其业务理由（driver），以及系统贴出的评审评论。
- **分层原则**：差异化能力（driver 锚定的语义检查）必须真实；其余皆可布景。
- 本切片不替代 Phase 1 完整设计；周末在此基础上继续。

## 2. 视频叙事（七幕，详见 `docs/video/2026-06-12-demo-video-script.md`）

1. 痛点：代码生产快于"对照为什么"的评审（~30s）
2. 布景：`shop-demo` + `ADR-001`（业务理由）+ 机读 constraints 块 + `radar extract` 实跑（~40s）
3. **主戏**：CI 绿的 PR → scope 检索 → radar check → 真实评审评论引用 ADR 条款 + 业务理由 + 代码行 + 修复方向（~70s）
4. 对照组：同模型、无锚定的 AI review 抓不到——"letter honored, reason defeated"（~30s）
5. 闭环原理：ADR → Constraint → conformance/drift；capture/supersede 回流；"machine drafts, human confirms"（~40s）
6. Dashboard 全景：conformance feed（含真裁定）、drift 趋势、at-risk ADR 二选一卡片、Decision Note triage 队列（~55s）
7. 路线图（Phase 1 已跑通 / Phase 2 drift+dashboard / Phase 3 凭实绩开 gate）+ 收尾（~35s）

## 3. 构建范围

### 3.1 radar CLI（本仓库 `src/radar/`，真实管道）

| 子命令 | 行为 | 对应需求 |
|---|---|---|
| `extract` | 解析 `docs/adr/*.md` 的 `constraints` 块 → `DM-CONSTRAINT`；校验 `gate`+`semantic` 禁组合与 id 稳定性 | `FR-EXT-1`, `FR-EXT-3` |
| `check` | 读 PR diff → `scope.paths` 路径匹配检索 → Claude 结构化输出 `DM-VERDICT`（`unknown` 一等结果）；`--save/--replay` 落盘裁定 | `FR-CONF-3..6`, `NFR-RETRIEVAL-1` |
| `comment` | 裁定 → GitHub PR review 评论（`gh api`），带 🛰️ 头、ADR↔代码证据链、修复方向；保底为手贴 Markdown | `FR-CONF-7`(structural 一型), `NFR-EXPLAIN-1` |

### 3.2 技术选型（已锁定）

- Python 3（miniconda）+ venv + pip；依赖仅 `anthropic`、`PyYAML`（测试加 `pytest`）；CLI 用 `argparse`。
- 语义检查：`claude-opus-4-8`，adaptive thinking，`client.messages.parse()` + Pydantic（`DM-VERDICT` 形状）。
- API key：环境变量优先，回退读项目根 `.env`（已 gitignore）。
- demo 仓库：`~/Projects/shop-demo`（兄弟目录，独立 git），GitHub 个人号 `fang-lin`，private。
- Dashboard：`dashboard/index.html` 单文件 + Tailwind CDN + 内联 SVG；数据由 `data.js`（`window.RADAR_DATA`）注入，conformance 喂真实裁定，drift/capture 用种子数据。

### 3.3 布景内容

- `ADR-001`：库存读走缓存、容忍 ≤5min 陈旧；**driver**：大促 DB 读放大，业务接受陈旧换转化（写明 epic 链接）。
- 违规 PR：绕过缓存 + `SELECT ... FOR UPDATE`，测试全过、linter 沉默；标题伪装成无害 bugfix。
- baseline 对照：同 diff、同模型、去掉 ADR/driver 锚定的 prompt，留存输出。

## 4. 明确不做（今天）

webhook/GitHub Action、capture 检测、drift 实扫、回放评测台、持久化存储、suggestion 块分型投影（只做 structural 评论一型）、双 PR（合规对照 PR 视时间）。

## 5. 检查点与预定砍单（CEST）

| 时间 | 必须达成 | 未达成则 |
|---|---|---|
| ~13:00 | radar 三命令本地 fixture 全通 | 砍合规对照 PR |
| ~16:00 | demo 仓库 + PR + 真评论上线 | `gh api` 不顺 → 手贴 Markdown |
| ~19:00 | dashboard 可上镜 | 砍 capture 区块 |
| ~21:00 | **硬停**，转排练录制 | 用落盘产物录制 |

## 6. 风险与保底

- LLM 现场翻车 → `--save/--replay`：录制只消费已验证的落盘裁定。
- 评论不像产品 → Markdown 带 `🛰️ Delivery Radar` 结构化头。
- `file://` 拦 fetch → 数据走 `data.js` 内联，双击即开。
- 旁白：英文（默认，逐字稿另出）；视频录 GitHub UI + dashboard 本地页。
