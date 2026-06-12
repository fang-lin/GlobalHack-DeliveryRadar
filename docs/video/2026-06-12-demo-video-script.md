# Zoom Showcase Run-Sheet — Delivery Radar (~5 min, 一镜到底)

> 形式：Zoom meeting 录制（共享屏幕 + 你的摄像头小窗），像给同事做 live demo 一样讲。
> 台词是**口语化提示**，不必逐字背——每段记住加粗的钩子句即可。

## 开录前 5 分钟检查

- Zoom：New Meeting（只有你一人）→ **Record on this Computer** → **Share Screen 选"整个屏幕"**（不是单窗口，要切终端）
- 浏览器开 5 个标签（按顺序）：① ADR-001（GitHub 文件页）② PR #1 ③ `contrast.html` ④ `dashboard/index.html` ⑤ `slides.html`
- 隐藏书签栏（Cmd+Shift+B）、系统勿扰模式、浏览器 125% 缩放
- 终端：`cd ~/Projects/intent-impl-align`，字号调大（Cmd+ 两三次），预输入好命令历史（↑ 即可调出）：
  - `gh pr diff 1 -R fang-lin/shop-demo > pr1.diff`
  - `.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff`
- 保底：若现场调用失败，改用 `--diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json`（输出一样）

## 流程（共 ~5:00）

| # | ~时间 | 画面/操作 | 讲什么（口语提示） |
|---|------|----------|------------------|
| 1 | 0:00 | 摄像头开场（可不共享屏幕），10 秒后开共享 | Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with the architectural decisions of your repo, *and the business reasons behind them*. AI writes code faster than anyone can review it against **why** the system is built this way — PRs pass every test and still quietly break decisions you already made. Let me show you on a real repo. |
| 2 | 0:25 | 标签① ADR-001：先指 Context 里 €400k/8x 那段，再滚到 `constraints` 块 | This demo shop records decisions as ADRs. ADR-001: **inventory reads tolerate five minutes of staleness** — a business decision: during peak sales, fresh reads would melt the primary DB; last peak that cost them €400k. The special part: a **machine-readable constraint block** — rule, scope, and a link to the business driver. This is what every check runs against. |
| 3 | 1:10 | 标签② PR #1：Conversation 顶部（标题+描述）→ Checks 绿 → Files changed 短看 diff | Now a normal Tuesday: a developer fixes a real complaint — stale stock counts. The fix: read the primary directly, lock the row. Small, well-intentioned, **tests pass, CI is green**. Busy reviewers? This merges. |
| 4 | 1:40 | 切终端：跑 `gh pr diff...` 然后 `radar check...`；等待时继续讲；结果出来指着两行裁定读 | Let's run the radar on it. It pulls the PR diff, retrieves **only the constraints whose scope matches the changed files** — noise control — then checks the diff against each one, grounded with the rule *and* the driver. …There: **ADR-001 violated, confidence 0.99** — and listen to the reason: it reintroduces the exact lock contention that caused the 8x checkout degradation. And note the second line: ADR-002 — **aligned**. It doesn't cry wolf. |
| 5 | 2:30 | 标签② 回到 PR Conversation，滚到 🛰️ 评论，鼠标依次划过 Rule / Why this rule exists / Evidence / Direction | On the PR it lands as this review comment: the rule, **why the rule exists — quoting the business rationale**, the exact lines, and the direction of the fix. And it's **advisory** — it doesn't block the merge. Machine drafts, human decides. |
| 6 | 3:05 | 标签③ contrast.html：先左后右，指左边高亮句 | Is this just AI code review? Same model, same diff, **no grounding** — left side. Good reviewer, catches the lock. But it treats staleness as a bug to *fix*, and even suggests reading the primary without a lock — **which is itself a violation of ADR-001**. Ungrounded review is opinion. Grounded, it's a verdict — addressable, measurable, attached to the decision. |
| 7 | 3:40 | 标签④ dashboard：KPI → LIVE 卡 → drift sparklines → at-risk 卡两个草稿 → capture 队列 | The architect's view. Conformance feed — there's our PR. **Drift** watches the main branch: ADR-002 is decaying, five violations and rising; the radar drafts both ways out — remediate the code, or supersede the decision. A human picks. And **Capture**: PR 38 made a decision nobody recorded — now a Decision Note waiting for triage. Undocumented decisions stop leaking away. |
| 8 | 4:25 | 标签⑤ slides.html：闭环图 10 秒 → 滚到路线图 | It's one loop: ADRs become constraints; conformance enforces, drift audits, capture feeds new decisions back. What you saw runs **today**. Next: drift engine live, then a replay harness measuring precision on your own history — a check only earns the right to **block** a merge after it proves itself. **Delivery Radar — keep the why alive.** Thanks! |

## 提词卡（贴屏幕边上，8 个钩子句）

1. "PRs pass every test and still break decisions you already made"
2. "€400k — that's why this rule exists"
3. "Tests pass, CI green — this merges"
4. "Violated 0.99 — and aligned on the other. It doesn't cry wolf"
5. "Why the rule exists, quoted on the PR. Advisory — human decides"
6. "Ungrounded review suggested a violation itself"
7. "Remediate the code or supersede the decision — human picks"
8. "A check earns the right to block. Keep the why alive"

## 录制小抄

- 翻车就停下重录那一段？**不行，Zoom 是一镜到底**——小磕绊直接讲下去（真实感反而加分），大翻车就整段重录（总共才 5 分钟）
- 终端等待 API 的 ~20 秒是讲解时间，不是尴尬时间（第 4 段台词就是为此设计的）
- 语速放慢 10%；切标签前先说完当前句
