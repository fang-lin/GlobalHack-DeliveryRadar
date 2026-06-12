# Zoom Showcase 操作脚本 — Delivery Radar（约 5 分钟，一镜到底）

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-12-demo-video-script.en.md`） · 最后同步: 2026-06-12 · 两版冲突以中文为准**

---

## A. 开录前准备（10 分钟，逐项打勾）

### A1. 终端

- [ ] 打开 Terminal，执行：
  ```bash
  cd ~/Projects/intent-impl-align
  clear
  ```
- [ ] 字号调大：按 `Cmd +` 三次
- [ ] 把下面 4 条命令**各预跑一次**（练手 + 进命令历史，录制时按 ↑ 调出即可不用现敲）：
  ```bash
  .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
  gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
  cat pr1.diff
  .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
  ```
- [ ] 预跑无报错后，执行 `clear` 清屏待命

### A2. 浏览器（按此顺序开 5 个标签）

| 标签 | 地址 |
|---|---|
| ① ADR | `https://github.com/fang-lin/shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/shop-demo/pull/1` |
| ③ 对照 | `file:///Users/linfang/Projects/intent-impl-align/dashboard/contrast.html` |
| ④ 仪表盘 | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/slides.html` |

- [ ] 隐藏书签栏：`Cmd+Shift+B`；每个标签缩放 125%：`Cmd +` 一两次
- [ ] 标签②（PR）预先停在 **Conversation** 页，滚到顶部

### A3. 系统与 Zoom

- [ ] macOS 勿扰模式开启（控制中心 → 专注模式）
- [ ] Zoom：**New Meeting**（仅自己）→ 摄像头开、麦克风开
- [ ] 测试录音 10 秒：Record on this Computer → 说一句话 → 停止 → 确认有声音
- [ ] 正式开始：点 **Record on this Computer**（注意不是 Record to Cloud）

---

## B. 演示流程（8 段，含全部操作与台词）

> 台词规则：🇬🇧 是你要说的，🇨🇳 帮你记内容。说完当前句再切画面。

### ① 0:00–0:25 · 开场白（先不共享屏幕，露脸说）

**操作**：对摄像头说完这段，然后点 **Share Screen → 整个屏幕（Desktop 1）→ Share**。

> 🇬🇧 Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with the architectural decisions of your repo, and the business reasons behind them. AI writes code faster than anyone can review it against **why** the system is built this way — PRs pass every test and still quietly break decisions you already made. Let me show you on a real repo.
>
> 🇨🇳 这是 Delivery Radar——让代码变更与架构决策及其业务理由保持对齐。AI 写码快过任何人对照"为什么"做评审——PR 全绿却悄悄破坏已做的决定。用真实仓库演示。

### ② 0:25–1:10 · 标签①（ADR-001 页面）

**操作**：
1. 切到标签①
2. 滚动到 **Context** 段，鼠标划过 "€400k in abandoned carts" 那句（说台词前半）
3. 继续滚动到底部的 ` ```constraints ` 代码块，鼠标停在 `driver: EPIC-512` 一行（说台词后半）

> 🇬🇧 This demo shop records decisions as ADRs. ADR-001: **inventory reads tolerate five minutes of staleness** — a business decision: during peak sales, fresh reads would melt the primary DB; last peak that cost them €400k. The special part: this **machine-readable constraint block** — rule, scope, and a link to the business driver. This is what every check runs against.
>
> 🇨🇳 决策记成 ADR。ADR-001：库存读容忍五分钟陈旧——业务决定，上次大促损失 40 万欧。特别之处是这个机器可读约束块——规则、作用域、业务 driver 链接。所有检查跑在它之上。

### ③ 1:10–1:40 · 标签②（PR #1）

**操作**：
1. 切到标签②（Conversation 顶部）：让标题 "Fix stale stock count on product page" 和描述停留 3 秒
2. 指一下绿色的 ✅ "All checks have passed"
3. 点 **Files changed** 标签页，鼠标划过红绿 diff（`FOR UPDATE` 那几行）
4. 说完台词，点回 **Conversation**（为第⑤段做准备），先别滚动

> 🇬🇧 Now a normal Tuesday: a developer fixes a real complaint — stale stock counts. The fix: read the primary directly, lock the row. Small, well-intentioned, **tests pass, CI is green**. Busy reviewers? This merges.
>
> 🇨🇳 平常一天：开发者修真实客诉。修法：直读主库、锁行。改动小、测试过、CI 绿。评审忙？就这么合了。

### ④ 1:40–2:35 · 终端（4 条命令）

**操作**（`Cmd+Tab` 切到终端，命令用 ↑ 历史调出）：

1. 跑提取（出来 1 行约束清单，指着说"two constraints, extracted from the ADRs"）：
   ```bash
   .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
   ```
2. 拉 PR diff（说"now pull the PR's diff from GitHub"——没有输出是正常的）：
   ```bash
   gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
   ```
3. 跑检查（回车后 **20–30 秒等待，恰好说下面的台词**）：
   ```bash
   .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
   ```
4. 结果出来：鼠标选中高亮 `violated (confidence 0.99)` 一行 → 再选中 `aligned` 一行，分别读出来

> 🇬🇧（等待时说）It retrieves **only the constraints whose scope matches the changed files** — that's the noise control — then checks the diff against each one, grounded with the rule *and* the business driver. …（结果出来）There: **ADR-001 — violated, confidence 0.99.** And the reason: it reintroduces the exact lock contention that caused the 8x checkout degradation. Second line: ADR-002 — **aligned**. It doesn't cry wolf.
>
> 🇨🇳 它只检索作用域匹配变更文件的约束（控噪），再带着规则和业务动因逐条检查。出来了：ADR-001 违反、0.99——理由：重新引入了导致 8 倍结账恶化的锁竞争。第二行 ADR-002 合规——不乱报。

**保底**：第 3 条命令若 30 秒后报错，直接跑这条（输出一样、瞬间出）：
```bash
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json
```

### ⑤ 2:35–3:05 · 标签②（回 PR 看评论）

**操作**：
1. `Cmd+Tab` 切回浏览器（应该还在 PR Conversation）
2. 向下滚到 🛰️ **Delivery Radar — Architecture Conformance** 评论（最新那条大的）
3. 鼠标依次划过四个部分，边划边说：**Rule** → **Why this rule exists** → **Evidence** → **Direction**

> 🇬🇧 On the PR it lands as this review comment: the rule — **why the rule exists, quoting the business rationale** — the exact lines — and the direction of the fix. And it's **advisory**: it doesn't block the merge. Machine drafts, human decides.
>
> 🇨🇳 落在 PR 上就是这条评论：规则、规则为何存在（直接引用业务理由）、精确行号、修复方向。建议性——不阻塞合并。机器起草，人来定。

### ⑥ 3:05–3:40 · 标签③（contrast.html）

**操作**：
1. 切到标签③
2. 先指左栏 UNGROUNDED 标签，向下滚到**黄色高亮句**（"read from the primary with a plain SELECT"），鼠标停住
3. 再指右栏 GROUNDED 的 "Why this rule exists" 引用块

> 🇬🇧 Is this just AI code review? Same model, same diff, **no grounding** — that's the left side. It's a good reviewer — catches the lock. But it treats staleness as a bug to *fix*, and even suggests reading the primary without a lock — **which is itself a violation of ADR-001**. Ungrounded review is opinion. Grounded — the right side — it's a verdict: addressable, measurable, attached to the decision.
>
> 🇨🇳 同模型同 diff 无锚定（左边）：是个好评审、抓到锁，但把陈旧当 bug 修，甚至建议不加锁直读主库——这本身就违反 ADR-001。无锚定是观点；有锚定（右边）是裁定——可寻址、可度量、挂在决策上。

### ⑦ 3:40–4:25 · 标签④（dashboard）

**操作**：
1. 切到标签④
2. 鼠标按顺序划过：顶部 KPI 行 → 左栏第一张带 **LIVE** 标的 PR 卡 → 右栏两条 sparkline 趋势 → **AT RISK** 红框卡（在 Remediation 和 Supersede 两个选项上各悬停 1 秒）→ 底部 Capture 的 DN 卡和三个按钮

> 🇬🇧 The architect's view. The conformance feed — there's our pull request, live. **Drift** watches the main branch: ADR-002 is decaying — five violations and rising. The radar drafts both ways out: remediate the code, or supersede the decision. A human picks; neither runs on its own. And **Capture**: PR 38 made a decision nobody recorded — now a Decision Note waiting for triage. Undocumented decisions stop leaking away.
>
> 🇨🇳 架构师视角。Conformance feed 里是我们的 PR。Drift 盯主分支：ADR-002 在衰减、5 处违规上升中；雷达起草两条出路——修代码或废决策，人来选。Capture：PR 38 做了没人记录的决策，现在是待分诊的 Decision Note。未记录的决策不再流失。

### ⑧ 4:25–5:00 · 标签⑤（slides.html）+ 收尾

**操作**：
1. 切到标签⑤（闭环图），停 10 秒说前半句
2. 向下滚动到 Roadmap 屏，说后半句
3. 说完 "Thanks!" → Zoom **Stop Recording** → End Meeting

> 🇬🇧 It's one loop: ADRs become constraints; conformance enforces, drift audits, capture feeds new decisions back. What you saw runs **today**. Next: the drift engine live, then a replay harness measuring precision on your own history — a check only earns the right to **block** a merge after it proves itself. **Delivery Radar — keep the why alive.** Thanks!
>
> 🇨🇳 一个闭环：ADR 变约束；conformance 执行、drift 审计、capture 喂回新决策。你看到的今天就在跑。接下来 drift 引擎上线、回放台在你自己的历史上度量精度——检查凭实绩才配阻塞。Keep the why alive。

---

## C. 录完之后

1. Zoom 结束会议后自动转码，文件在 `~/Documents/Zoom/<日期时间>.../` 下的 `.mp4`
2. 播放检查：时长 ≤ 5:00、声音清楚、屏幕文字可读
3. 超时怎么办：超 20 秒以内不用重录（裁判一般有容忍度）；超太多就压缩第②段和第⑦段的停留时间重录
4. 按主办方要求的渠道提交 `.mp4`

## D. 应急速查

| 状况 | 处理 |
|---|---|
| radar check 报错/超 30 秒 | 跑保底 replay 命令（见第④段） |
| 说错词、小磕绊 | 直接讲下去，不要道歉重说 |
| 大翻车（顺序乱了/命令连续失败） | 停止录制，整段重来（总共 5 分钟，成本低） |
| GitHub 页面加载慢 | 开录前先把每个标签都刷新好 |
