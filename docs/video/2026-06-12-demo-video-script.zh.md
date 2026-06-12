# Zoom Showcase 操作脚本 — Delivery Radar（约 5 分钟，一镜到底）

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-12-demo-video-script.en.md`） · 最后同步: 2026-06-12 · 两版冲突以中文为准**

> **结构：前半（0:00–2:45）紧凑 demo；后半（2:45–5:00）项目的更大愿景。**

---

## A. 开录前准备（10 分钟，逐项打勾）

### A1. 终端

- [ ] 打开 Terminal，执行：
  ```bash
  cd ~/Projects/intent-impl-align
  clear
  ```
- [ ] 字号调大：按 `Cmd +` 三次
- [ ] 把下面 4 条命令**各预跑一次**（练手 + 进命令历史，录制时按 ↑ 调出）：
  ```bash
  .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
  gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
  cat pr1.diff
  .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
  ```
- [ ] 预跑无报错后 `clear` 清屏待命

### A2. 浏览器（按此顺序开 5 个标签）

| 标签 | 地址 |
|---|---|
| ① ADR | `https://github.com/fang-lin/shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/shop-demo/pull/1` |
| ③ 对照 | `file:///Users/linfang/Projects/intent-impl-align/dashboard/contrast.html` |
| ④ 仪表盘 | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/slides.html`（四屏：闭环 / 全系统地图 / 双路径+审计 / 路线图，滚动切换） |

- [ ] 隐藏书签栏 `Cmd+Shift+B`；每个标签缩放 125%
- [ ] 标签②（PR）停在 **Conversation** 顶部

### A3. 系统与 Zoom

- [ ] macOS 勿扰模式开
- [ ] Zoom：**New Meeting** → 摄像头开、麦克风开
- [ ] 10 秒试录（Record on this Computer → 说话 → 停 → 验证有声）
- [ ] 正式开始：**Record on this Computer**

---

## B. 演示流程

> 🇬🇧 是要说的，🇨🇳 帮你记内容。说完当前句再切画面。

### 前半 · 紧凑 demo（0:00–2:45）

#### ① 0:00–0:20 · 开场（摄像头，说完再共享屏幕）

> 🇬🇧 Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with your architectural decisions, and the business reasons behind them. A quick live demo first — then the bigger picture.
>
> 🇨🇳 这是 Delivery Radar——让代码变更与架构决策及其业务理由保持对齐。先快速 live demo，然后讲更大的图景。

#### ② 0:20–0:50 · 标签①（ADR）：划过 €400k 句 → 停在 constraints 块

> 🇬🇧 This demo shop records decisions as ADRs. ADR-001: inventory reads tolerate five minutes of staleness — a business decision: fresh reads would melt the primary DB during peak sales; last peak cost €400k. The key part: this **machine-readable constraint block** — rule, scope, and the business driver. Checks run against this.
>
> 🇨🇳 决策记成 ADR。ADR-001：库存读容忍五分钟陈旧——业务决定，上次大促损失 40 万欧。关键是这个机器可读约束块——规则、作用域、业务 driver。检查跑在它之上。

#### ③ 0:50–1:15 · 标签②（PR）：标题/描述 → 绿 ✅ → Files changed 扫一眼 → 点回 Conversation

> 🇬🇧 A developer fixes a real complaint — stale stock counts — by reading the primary directly and locking the row. Well-intentioned, **tests pass, CI is green**. This merges.
>
> 🇨🇳 开发者修真实客诉——直读主库、锁行。出发点好、测试过、CI 绿。就这么合了。

#### ④ 1:15–2:00 · 终端：依次跑 3 条命令（↑ 调出）

```bash
.venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
```

操作：跑 extract 时说"constraints, extracted from the ADRs"；check 回车后的 20–30 秒说台词前半；结果出来选中 `violated` 行和 `aligned` 行各读一遍。

> 🇬🇧 Radar pulls the diff, retrieves **only the constraints whose scope matches the changed files**, and checks each one — grounded with the rule *and* the driver. …There: **ADR-001 — violated, 0.99** — it reintroduces the exact lock contention from the €400k incident. And ADR-002 — **aligned**. No false alarm.
>
> 🇨🇳 radar 拉 diff、只检索作用域命中的约束、带着规则和动因逐条检查。出来了：ADR-001 违反 0.99——重新引入了 40 万欧事故的锁竞争。ADR-002 合规——不误报。

**保底**（check 失败/超 30 秒）：
```bash
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json
```

#### ⑤ 2:00–2:25 · 标签②：滚到 🛰️ 评论，划过 Rule / Why / Evidence / Direction

> 🇬🇧 On the PR it lands as this comment: the rule — **why the rule exists, quoting the business rationale** — the exact lines, and the fix direction. **Advisory**: machine drafts, human decides.
>
> 🇨🇳 落在 PR 上：规则、规则为何存在（引用业务理由）、行号、修复方向。建议性——机器起草，人来定。

#### ⑥ 2:25–2:45 · 标签③（对照页）：指左栏黄色高亮句 → 指右栏

> 🇬🇧 Same model, no grounding — the left side. It catches the lock as an *opinion* — and then suggests an unlocked primary read, **itself a violation**. Opinion versus a governable verdict.
>
> 🇨🇳 同模型无锚定（左）：把锁当观点抓到了——却又建议不加锁直读主库，这本身就是违规。观点 vs 可治理的裁定。

### 后半 · 更大的愿景（2:45–5:00）

#### ⑦ 2:45–3:15 · 标签④（dashboard）：KPI → LIVE 卡 → drift 趋势 → AT RISK 卡 → Capture 队列

> 🇬🇧 And here the demo opens into the vision. What you saw is **one of three operations over one shared object** — the constraint. The architect's view: conformance, live. **Drift** audits the standing codebase — ADR-002 is decaying — and the radar drafts both ways out: remediate the code, or supersede the decision. **Capture** queues unrecorded decisions for triage. Humans confirm; nothing executes on its own.
>
> 🇨🇳 从这里进入愿景。刚才只是同一对象（约束）之上三个操作之一。架构师视角：conformance 实时；Drift 审计存量——ADR-002 在衰减，雷达起草两条出路：修代码或废决策；Capture 把未记录决策排队分诊。人来确认，一切不自动执行。

#### ⑧ 3:15–3:35 · 标签⑤ 第一屏（闭环图）

> 🇬🇧 The heart is a closed loop: ADRs become constraints; conformance enforces, drift audits, capture feeds decisions back — everything returns as new or superseded ADRs. Intent stops rotting, because the loop never stops.
>
> 🇨🇳 核心是闭环：ADR 变约束；conformance 执行、drift 审计、capture 喂回决策——一切以新 ADR/废止回流。意图不再腐烂，因为环不停转。

#### ⑨ 3:35–4:00 · 标签⑤ 第二屏（全系统地图）：先指图例，再扫暗色卡片

> 🇬🇧 We've specified the **whole system** — every box carries requirement IDs. Today you saw the lit spine. Around it, sequenced: the behavioral intent layer, deterministic checks, capture triage, the drift engine — and a trust ladder: a replay harness measuring precision on your repo's *own history*, because a check only earns the right to **block** after it proves itself.
>
> 🇨🇳 整个系统已写成规格——每个框都有需求 ID。今天是点亮的脊柱。周围按序排着：行为意图层、确定性检查、capture 分诊、drift 引擎，以及信任阶梯——回放台在你自己的历史上量精度：检查凭实绩才配阻塞。

#### ⑩ 4:00–4:40 · 标签⑤ 第三屏（Two paths, one loop）：先左卡，再右卡（高亮），最后指底部审计带

> 🇬🇧 Two paths make this matter. **Today, humans write the code** — and the loop keeps intent and implementation converging naturally. But the bigger one: this is an exploration of **how to let coding agents work autonomously for long stretches**. Agents drift. Machine-checkable intent gives them a self-check loop: verify against the decisions *before* opening a PR, capture new decisions as they're made, escalate to a human only at decision points. And the entire process is **tracked and auditable**: every verdict carries its evidence and constraint ID, every confirmation is recorded, intent history lives in git. You can always answer — who decided, what changed, and why.
>
> 🇨🇳 两条路径让这件事重要。今天人写代码——这个环让意图与实现自然收敛。更大的那条：这是在探索**如何让编码 agent 长时间自主工作**。agent 会漂移；机器可查的意图给它自检回路——开 PR 前先对照决策验证、边做边捕获新决策、只在需要决策时升级到人。而且全程**可跟踪可审计**：每个裁定带证据和约束 ID、每次确认有记录、意图历史活在 git 里。永远答得出：谁决定的、改了什么、为什么。

#### ⑪ 4:40–5:00 · 标签⑤ 第四屏（路线图）→ 收尾

> 🇬🇧 The road is sequenced: what you saw runs today; capture and drift next; gating only once precision is proven. **Delivery Radar — keep the why alive.** Thanks!
>
> 🇨🇳 路线已排好：今天的在跑；capture 和 drift 接着来；gate 等精度证明之后。Keep the why alive。谢谢！

---

## C. 录完之后

1. Zoom 结束会议后自动转码，文件在 `~/Documents/Zoom/<日期时间>.../` 下的 `.mp4`
2. 播放检查：时长 ≤ 5:00、声音清楚、屏幕文字可读
3. 超时：20 秒内不用重录；超太多就压缩第②⑦段重录
4. 按主办方渠道提交 `.mp4`

## D. 应急速查

| 状况 | 处理 |
|---|---|
| radar check 报错/超 30 秒 | 跑保底 replay 命令（第④段） |
| 说错词、小磕绊 | 直接讲下去，不要道歉重说 |
| 大翻车 | 停止录制整段重来（才 5 分钟） |
| GitHub 页面慢 | 开录前刷新所有标签 |
