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
| ④ 仪表盘 | `file:///Users/linfang/Projects/intent-impl-align/dashboard/dashboard.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html`（四屏：闭环 / 全系统地图 / 三时代+审计 / 路线图，滚动切换） |

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
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff --replay artifacts/pr1-verdicts.json
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

#### ⑧ 3:15–3:35 · 标签⑤ 第一屏（IIAC Loop 图）：先指三个绿色操作和回灌线，说收敛句时指左下角曲线小图（红升 vs 青降）

> 🇬🇧 The heart is what we call the **IIAC loop** — intent, implementation, alignment, convergence. Recorded intent — carried in ADRs, specs, stories — becomes constraints; conformance enforces, drift audits, capture feeds decisions back. **Alignment makes each change right; convergence makes the whole trajectory settle** — no oscillation, so the process ends in a deterministic, auditable state instead of circling.
>
> 🇨🇳 核心是 IIAC 环——意图、实现、对齐、收敛。记录在案的意图（由 ADR、spec、story 承载）变约束；conformance 执行、drift 审计、capture 喂回决策。**对齐让每一步正确；收敛让整条轨迹安定下来**——不摆动，过程以确定的、可审计的状态收尾，而不是打转。

#### ⑨ 3:35–4:00 · 标签⑤ 第二屏（全系统地图）：先指图例，再扫暗色卡片

> 🇬🇧 We've specified the **whole system** — every box carries requirement IDs; **four of thirteen capability groups run today**, and that ratio is the point. Today you saw the lit spine. Around it, sequenced: the behavioral intent layer, deterministic checks, capture triage, the drift engine — and a trust ladder: a replay harness measuring precision on your repo's *own history*, because a check only earns the right to **block** after it proves itself.
>
> 🇨🇳 整个系统已写成规格——每个框都有需求 ID；**13 组能力今天跑通 4 组**，这个比例本身就是重点。今天是点亮的脊柱。周围按序排着：行为意图层、确定性检查、capture 分诊、drift 引擎，以及信任阶梯——回放台在你自己的历史上量精度：检查凭实绩才配阻塞。

#### ⑩ 4:00–4:40 · 标签⑤ 第三屏（writing → steering → autonomy 三联卡）：从左到右逐卡指，最后指底部审计带

> 🇬🇧 Three eras put this in context. **In the past, humans wrote the code** — intent lived in people's heads, and drift was slow enough for review to keep up. **Today, humans steer coding agents in real time** — agents write the code; alignment holds because a human corrects every step, live. That scales to one person, one session. **The exploration: long-horizon autonomy** — recorded, machine-checkable intent replaces real-time steering. The agent self-checks *before* opening a PR, captures new decisions, escalates only at decision points. The human steps out of the loop — alignment stays in. And one thing is non-negotiable: the whole loop is **designed to be tracked and auditable — because convergence needs memory**. You cannot converge if you don't know where you've been. Every verdict carries evidence and a constraint ID, every confirmation is recorded, intent lives in git — who decided, what changed, why.
>
> 🇨🇳 三个时代看清这件事。**过去：人写代码**——意图在人脑子里，漂移慢到评审跟得上。**今天：人类实时操纵 agent 写代码**——代码已是 agent 写的，对齐靠人盯每一步、实时纠偏，只能扩展到一个人一个会话。**要探索的：长程自主**——记录在案、机器可查的意图取代实时操纵：agent 开 PR 前自检、边做边捕获决策、只在决策点升级到人。人退出回路，对齐留在回路里。还有一点不可妥协：整个环按**可跟踪、可审计**设计——**因为收敛需要记忆**，不知道过去走过哪里就谈不上收敛。裁定带证据和约束 ID、确认有记录、意图活在 git——谁决定的、改了什么、为什么。

#### ⑪ 4:40–5:00 · 标签⑤ 第四屏（路线图）→ 收尾

> 🇬🇧 The road is sequenced: what you saw runs today; capture and drift next; gating only once precision is proven. **Delivery Radar — keep the why alive.** That's our take on *innovation that AI works*. Thanks!
>
> 🇨🇳 路线已排好：今天的在跑；capture 和 drift 接着来；gate 等精度证明之后。Keep the why alive——这就是我们对 *Innovation that AI/works* 的回答。谢谢！

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
