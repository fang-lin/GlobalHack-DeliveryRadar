# Zoom Showcase Run-Sheet — Delivery Radar (~5 min, 一镜到底)

> 形式：Zoom meeting 录制（共享屏幕 + 你的摄像头小窗），像给同事做 live demo 一样讲。
> 台词为**英文口语提示 + 中文对照**——英文照感觉说，中文帮你记住每段说什么，不必逐字背。

## 开录前 5 分钟检查

- Zoom：New Meeting（只有你一人）→ **Record on this Computer** → **Share Screen 选"整个屏幕"**（不是单窗口，要切终端）
- 浏览器开 5 个标签（按顺序）：① ADR-001（GitHub 文件页）② PR #1 ③ `contrast.html` ④ `dashboard/index.html` ⑤ `slides.html`
- 隐藏书签栏（Cmd+Shift+B）、系统勿扰模式、浏览器 125% 缩放
- 终端：`cd ~/Projects/intent-impl-align`，字号调大（Cmd+ 两三次），预输入好命令历史（↑ 即可调出）：
  - `gh pr diff 1 -R fang-lin/shop-demo > pr1.diff`
  - `.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff`
- 保底：若现场调用失败，改用 `--diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json`（输出一样）

## 流程（共 ~5:00）

### ① 0:00 — 开场（摄像头，10 秒后开共享）

> 🇬🇧 Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with the architectural decisions of your repo, *and the business reasons behind them*. AI writes code faster than anyone can review it against **why** the system is built this way — PRs pass every test and still quietly break decisions you already made. Let me show you on a real repo.

> 🇨🇳 嗨，我是 Lin。这是 Delivery Radar——它让代码变更与仓库的架构决策、以及决策背后的**业务理由**保持对齐。AI 写代码的速度已超过任何人对照"系统为什么这样建"做评审的速度——PR 测试全过，却悄悄破坏你们已经做出的决定。下面用真实仓库演示。

### ② 0:25 — 标签① ADR-001：指 Context 里 €400k/8x 段落，再滚到 `constraints` 块

> 🇬🇧 This demo shop records decisions as ADRs. ADR-001: **inventory reads tolerate five minutes of staleness** — a business decision: during peak sales, fresh reads would melt the primary DB; last peak that cost them €400k. The special part: a **machine-readable constraint block** — rule, scope, and a link to the business driver. This is what every check runs against.

> 🇨🇳 这个演示商城把决策记成 ADR。ADR-001：**库存读取容忍五分钟陈旧**——业务决定：大促时实时读会压垮主库，上次大促损失 40 万欧。特别之处：每个 ADR 带**机器可读的约束块**——规则、作用域、业务 driver 链接。所有检查都跑在它之上。

### ③ 1:10 — 标签② PR #1：标题+描述 → Checks 绿 → Files changed 扫一眼 diff

> 🇬🇧 Now a normal Tuesday: a developer fixes a real complaint — stale stock counts. The fix: read the primary directly, lock the row. Small, well-intentioned, **tests pass, CI is green**. Busy reviewers? This merges.

> 🇨🇳 平常的一天：开发者修真实客诉——库存数字陈旧。修法：直读主库、锁行。改动小、出发点好、**测试全过、CI 全绿**。评审都忙？这就合进去了。

### ④ 1:40 — 切终端：跑两条命令，等待时继续讲，结果出来指着两行裁定读

> 🇬🇧 Let's run the radar on it. It pulls the PR diff, retrieves **only the constraints whose scope matches the changed files** — noise control — then checks the diff against each one, grounded with the rule *and* the driver. …There: **ADR-001 violated, confidence 0.99** — and listen to the reason: it reintroduces the exact lock contention that caused the 8x checkout degradation. And note the second line: ADR-002 — **aligned**. It doesn't cry wolf.

> 🇨🇳 跑一下 radar。它拉取 PR diff，**只检索作用域匹配变更文件的约束**——控噪——然后将 diff 对照每条约束检查，提示里灌入规则和业务动因。看：**ADR-001 违反，置信度 0.99**——理由说得很清楚：重新引入了导致上次结账延迟恶化 8 倍的锁竞争。再看第二行：ADR-002 **合规**——它不乱报。

### ⑤ 2:30 — 标签② 回 PR Conversation，滚到 🛰️ 评论，鼠标划过 Rule / Why / Evidence / Direction

> 🇬🇧 On the PR it lands as this review comment: the rule, **why the rule exists — quoting the business rationale**, the exact lines, and the direction of the fix. And it's **advisory** — it doesn't block the merge. Machine drafts, human decides.

> 🇨🇳 在 PR 上它落成这条评审评论：规则、**规则为何存在——直接引用业务理由**、精确行号、修复方向。而且是**建议性的**——不阻塞合并。机器起草，人来定。

### ⑥ 3:05 — 标签③ contrast.html：先左后右，指左边高亮句

> 🇬🇧 Is this just AI code review? Same model, same diff, **no grounding** — left side. Good reviewer, catches the lock. But it treats staleness as a bug to *fix*, and even suggests reading the primary without a lock — **which is itself a violation of ADR-001**. Ungrounded review is opinion. Grounded, it's a verdict — addressable, measurable, attached to the decision.

> 🇨🇳 这只是又一个 AI 代码评审吗？同模型、同 diff、**不带锚定**——左边。它是个好评审，抓到了锁的问题。但它把陈旧度当成要修的 bug，甚至建议不加锁直读主库——**这本身就违反 ADR-001**。无锚定的评审是观点；有锚定才是裁定——可寻址、可度量、挂在决策上。

### ⑦ 3:40 — 标签④ dashboard：KPI → LIVE 卡 → drift 趋势 → at-risk 两个草稿 → capture 队列

> 🇬🇧 The architect's view. Conformance feed — there's our PR. **Drift** watches the main branch: ADR-002 is decaying, five violations and rising; the radar drafts both ways out — remediate the code, or supersede the decision. A human picks. And **Capture**: PR 38 made a decision nobody recorded — now a Decision Note waiting for triage. Undocumented decisions stop leaking away.

> 🇨🇳 架构师视角。Conformance feed——这是我们刚才的 PR。**Drift** 盯主分支：ADR-002 在衰减，5 处违规且在上升；雷达起草两条出路——把代码修回去，或者废止这条决策。人来选。还有 **Capture**：PR 38 做了个没人记录的决策——现在是一条等分诊的 Decision Note。未记录的决策不再流失。

### ⑧ 4:25 — 标签⑤ slides.html：闭环图 10 秒 → 滚到路线图 → 收尾

> 🇬🇧 It's one loop: ADRs become constraints; conformance enforces, drift audits, capture feeds new decisions back. What you saw runs **today**. Next: drift engine live, then a replay harness measuring precision on your own history — a check only earns the right to **block** a merge after it proves itself. **Delivery Radar — keep the why alive.** Thanks!

> 🇨🇳 这是一个闭环：ADR 变约束；conformance 执行、drift 审计、capture 把新决策喂回来。你看到的**今天就在跑**。接下来：drift 引擎上线，然后是在你自己的历史上度量精度的回放台——一个检查只有证明了自己，才**配**阻塞合并。Delivery Radar——keep the *why* alive。谢谢！

## 提词卡（贴屏幕边上，8 个钩子句）

| # | 🇬🇧 | 🇨🇳 |
|---|---|---|
| 1 | PRs pass every test and still break decisions you already made | PR 全绿，却破坏了你们已做的决定 |
| 2 | €400k — that's why this rule exists | 40 万欧——这就是规则存在的原因 |
| 3 | Tests pass, CI green — this merges | 测试过、CI 绿——就这么合了 |
| 4 | Violated 0.99 — and aligned on the other. It doesn't cry wolf | 违反 0.99——另一条合规，不乱报 |
| 5 | Why the rule exists, quoted on the PR. Advisory — human decides | 规则的"为什么"直接引用在 PR 上。建议性——人来定 |
| 6 | Ungrounded review suggested a violation itself | 无锚定的评审自己都提出了违规方案 |
| 7 | Remediate the code or supersede the decision — human picks | 修代码还是废决策——人来选 |
| 8 | A check earns the right to block. Keep the why alive | 检查要凭实绩才配阻塞。Keep the why alive |

## 录制小抄

- 翻车就停下重录那一段？**不行，Zoom 是一镜到底**——小磕绊直接讲下去（真实感反而加分），大翻车就整段重录（总共才 5 分钟）
- 终端等待 API 的 ~20 秒是讲解时间，不是尴尬时间（第 ④ 段台词就是为此设计的）
- 语速放慢 10%；切标签前先说完当前句
