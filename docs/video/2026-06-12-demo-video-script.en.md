# Zoom Showcase Operating Script (~5 min, single take)

> **Bilingual run-sheet — English narration script + Chinese pronunciation cheat-sheet and notes. Single source (the standalone Chinese file was folded in here).**

> Narrative spine: pose the problem (humans can't review at AI speed; vibe review won't do) → quick Conformance showcase → reveal the method, IIAC (three methods in logical progression) → the vision (not a review tool — convergence of AI-driven development) → three eras → roadmap + the ask.

---

## 发音小抄（关键术语保留，照拼读念即可；大写=重音）

| 词 | IPA | 拼读 | 含义提示 |
|---|---|---|---|
| **Conformance** | /kənˈfɔːrməns/ | kun-**FOR**-muns | 一致性检查（操作①） |
| **constraint** | /kənˈstreɪnt/ | kun-**STRAYNT** | 约束 |
| **verdict** | /ˈvɜːrdɪkt/ | **VUR**-dikt | 裁定 |
| **advisory** | /ədˈvaɪzəri/ | ad-**VY**-zuh-ree | 建议性的（不阻塞） |
| **retrieve** | /rɪˈtriːv/ | ri-**TREEV** | 检索 |
| **lock contention** | /kənˈtenʃn/ | kun-**TEN**-shun | 锁竞争（技术细节，要站得住） |
| **alignment** | /əˈlaɪnmənt/ | uh-**LYNE**-munt | 对齐 |
| **convergence** | /kənˈvɜːrdʒəns/ | kun-**VUR**-juns | 收敛（核心概念） |
| **converge** | /kənˈvɜːrdʒ/ | kun-**VURJ** | 收敛（动词） |
| **trajectory** | /trəˈdʒektəri/ | truh-**JEK**-tuh-ree | 轨迹 |
| **supervision** | /ˌsuːpərˈvɪʒn/ | soo-per-**VIZH**-un | 监管 |
| **auditable** | /ˈɔːdɪtəbl/ | **AW**-di-tuh-bul | 可审计的 |
| **IIAC** | — | 念 "I-I-A-C"（逐字母），或念全称 *Intent–Implementation Alignment and Convergence* | 方法论名 |

> Decision Capture / Drift Detection / intent / scope / drift 这些都好念，未列入。

---

## A. Pre-recording Setup (10 min, check off each item)

### A1. Terminal (**run from inside the demo repo** — more natural on screen)

- [ ] Open Terminal and run (enter the demo repo + load the API key into this shell; `radar` is symlinked onto PATH so it's callable directly):
  ```bash
  cd ~/Projects/shop-demo
  export ANTHROPIC_API_KEY=$(sed -n 's/^ANTHROPIC_API_KEY=//p' ~/Projects/intent-impl-align/.env)
  clear
  ```
  > If `radar` says command not found: replace every `radar` below with the absolute path `~/Projects/intent-impl-align/dist/cli.js` (after `npm run build`).
- [ ] Increase font size: `Cmd +` three times
- [ ] Pre-run each command once (rehearsal + shell history; recall with ↑ while recording):
  ```bash
  radar extract --adr-dir docs/adr
  gh pr diff 1 > pr1.diff
  cat pr1.diff
  radar check --adr-dir docs/adr --diff pr1.diff
  ```
- [ ] After a clean dry run, `clear` (**don't close this terminal** — the exported key lives only in this shell)

### A2. Browser (5 tabs in this order)

| Tab | URL |
|---|---|
| ① ADR | `https://github.com/fang-lin/GlobalHack-shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/GlobalHack-shop-demo/pull/1` |
| ③ Contrast | `file:///Users/linfang/Projects/intent-impl-align/dashboard/contrast.html` |
| ④ Dashboard | `file:///Users/linfang/Projects/intent-impl-align/dashboard/dashboard.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html` (four screens: IIAC Loop / system map / three eras / roadmap) |

- [ ] Hide bookmarks bar `Cmd+Shift+B`; zoom the two GitHub tabs to 125%
- [ ] Park tab ② (PR) on **Conversation**, top

### A3. System & Zoom

- [ ] macOS Do Not Disturb on
- [ ] Zoom: **New Meeting** → camera on, mic on
- [ ] 10-second recording test (Record on this Computer → speak → stop → verify audio)
- [ ] Start for real: **Record on this Computer**

---

## B. Walkthrough (finish the current line before switching screens)

### ① 0:00–0:40 · Pose the problem (camera only; share screen afterwards)

**Actions**: deliver the whole passage to the camera, then Share Screen → entire screen → Share.

**操作**：对着摄像头把这段说完，然后 Share Screen → 整个屏幕 → Share。

> 🇬🇧 Hi, I'm Lin — this is our project, **Delivery Radar**. Let me open with a problem. When humans wrote the code, humans could review it — a colleague would read your PR and ask: does this fit how we build this system? Does it fit *why* we built it that way? In the AI era, that breaks: code now arrives faster than any team can review it. So — let AI review it? Point an agent at the PR and let it vibe-review? That can't be the answer. If agents are going to review code, they need a **method**. We built one.
>
> 🇨🇳 大家好，我是 Lin，这是我们的项目 Delivery Radar。先抛一个问题——人写代码的时代，PR 是人来 review 的：同事读你的代码，还能问一句，这符合系统的建法吗？符合当初为什么这么建吗？AI 时代这件事崩了——代码产出快到人根本 review 不过来。那让 AI 来 review？把 PR 丢给 agent 凭感觉审——vibe review？肯定不行。要让 agent 审代码，它得有方法。我们造了一个。

### ② 0:40–1:10 · Tab ① (ADR-001)

**Actions**: scroll to the Context section, sweep the "€400k" sentence → scroll to the `constraints` block, rest on the `driver: EPIC-512` line.

**操作**：滚到 Context 段，鼠标划过 "€400k" 那句 → 再滚到底部 `constraints` 块，停在 `driver: EPIC-512` 那行。

> 🇬🇧 Let me show you, on a real repo. This is the demo repo; its architectural decisions live in ADRs. ADR-001: inventory reads tolerate five minutes of staleness — a business decision: fresh reads would melt the primary database during peak sales; last peak cost four hundred thousand euros. The key part is this **machine-readable constraint block**: a rule, a scope, and the business driver.
>
> 🇨🇳 我用一个真实的仓库给你看。这是演示仓库，架构决策记在 ADR 里。ADR-001：库存读容忍五分钟陈旧——这是业务决定：大促时实时读会压垮主库，上次大促损失四十万欧。关键是下面这个机器可读的约束块：规则、作用域、业务动因。

### ③ 1:10–1:30 · Tab ② (PR #1)

**Actions**: title + description for 3 seconds → point at the green ✅ → glance at `FOR UPDATE` in Files changed → back to Conversation.

**操作**：标题+描述停 3 秒 → 指绿色 ✅ → 点 Files changed 扫一眼 `FOR UPDATE` → 点回 Conversation。

> 🇬🇧 Now watch a perfectly normal PR come in: fixing a customer complaint about stale stock counts — by reading the primary directly, with a row lock. Tests pass, CI is green. Busy reviewers? This merges.
>
> 🇨🇳 来了个再正常不过的 PR：修"库存数字不准"的客诉——直读主库、加行锁。测试全过、CI 绿。评审忙不过来？这就合进去了。

### ④ 1:30–2:10 · Terminal (3 commands, recall with ↑)

**Actions**: run the three commands below (recall with ↑); the ~20 s wait after check is exactly for the technique sentence; when results appear, highlight the `violated` line and the `aligned` line and read each.

**操作**：依次跑下面三条命令（按 ↑ 调出历史）；check 之后约 20 秒的等待正好用来说"三步方法"那段；结果出来后选中 `violated` 行和 `aligned` 行各读一遍。

```bash
radar extract --adr-dir docs/adr
gh pr diff 1 > pr1.diff
radar check --adr-dir docs/adr --diff pr1.diff
```

> 🇬🇧 Let's run the radar. Here's the method, in three quick steps. **One:** it pulls the constraints out of the ADRs. **Two:** it keeps only the ones that cover the files we changed. **Three:** it asks the model — does this diff break them? — grounded in the rule and the business reason. And the model must answer clearly: **aligned**, **violated**, or **unknown**. No guessing. …And here we go. ADR-001: **violated**. Confidence, 0.99. The reason cuts straight to it — this brings back the exact locking problem that made checkout eight times slower last time. Second line, ADR-002: **aligned**. No false alarm.
>
> 🇨🇳 跑一下 radar。方法分三步：一，从 ADR 里把约束抽出来；二，只留下覆盖我们改动文件的那些；三，问模型——这个 diff 违反它们吗——并用规则和业务理由作锚。模型必须明确回答：aligned、violated、或者 unknown。不许猜。结果出来了：ADR-001——violated，置信度 0.99。理由直指要害——它把当年让结账慢八倍的那个锁问题又带回来了。第二行 ADR-002：aligned。它不乱咬。

**Fallback** (check fails / >30 s; identical output, instant):
```bash
radar check --adr-dir docs/adr --diff pr1.diff --replay ~/Projects/intent-impl-align/artifacts/pr1-verdicts.json
```

### ⑤ 2:10–2:30 · Tab ② (the review on the PR)

**Actions**: scroll to the 🛰️ review; sweep Rule / Why this rule exists / Evidence / Direction.

**操作**：滚到 🛰️ 那条评审，鼠标依次划过 Rule / Why this rule exists / Evidence / Direction 四块。

> 🇬🇧 And on the PR, it lands as this review: the rule, why the rule exists — it quotes the business reason — the exact lines, and the direction of the fix. Advisory; it doesn't block the merge. This is **Conformance**: implementation aligning toward intent.
>
> 🇨🇳 而在 PR 上，它就落成这条评审：规则、规则为何存在（直接引用业务理由）、精确行号、修复方向。建议性，不阻塞合并。这就是 Conformance：实现向意图对齐。

### ⑥ 2:30–2:45 · Tab ③ (contrast) — **cut if short on time**

**Actions**: point at the yellow highlight on the left → then the right panel.

**操作**：指左栏黄色高亮句 → 再指右栏。

> 🇬🇧 So how is this different from vibe review? Same model, same diff — but no method. That's the left side. It's not a bad reviewer. But it treats the staleness as a bug to fix. It even suggests its own fix — and that fix breaks the ADR. So: without a method, a review is just an opinion. With a method, it's a **verdict**.
>
> 🇨🇳 这跟 vibe review 差在哪：同模型、同 diff、没方法——左边。算个好评审，但它把陈旧当 bug 修，甚至自己提了个违反 ADR 的方案。没方法的 review 是观点；有方法的，才是裁定。

### ⑦ 2:45–3:40 · Tab ⑤ screen 1 (IIAC Loop) — the method's formal entrance

**Actions**: point at the middle pipeline for Capture, the right pipeline for Drift, then the human-confirms gate on the return edge.

**操作**：说 Capture 时指中间那条管线，说 Drift 时指右边那条，最后指回灌线上的 human confirms 门。

> 🇬🇧 So that was the first method. But reviewing PRs against ADRs is **not enough** — that only aligns implementation toward intent, one direction. Sometimes intent grows out of the code: a PR quietly makes a decision nobody recorded. If you can't detect and record it, there is no real alignment. So, the second method: **Decision Capture** — detect new intent created as the code is merged, and write it down as recorded intent. Still not done: intent that only grows and never changes is wrong too. Intent should be stable — and still change over time. The third method: **Drift Detection** — on a regular schedule, scan the whole codebase against all intent, and surface either code that needs fixing, or intent that needs changing. Together, this is our method: **IIAC — intent–implementation alignment and convergence**. Three operations over one shared constraint store; every write-back to intent passes human confirmation. Alignment makes each change right. Convergence keeps the whole thing moving closer to intent — not drifting away.
>
> 🇨🇳 这是第一个方法。但只用 ADR 审 PR 是不够的——这只保证实现向意图对齐，单向。意图有时是从代码里长出来的：PR 悄悄做了个没人记录的决策。识别不了、记录不了，就谈不上真正的对齐。所以第二个方法 Decision Capture——探测集成中产生的新意图，记成意图文档。还没完：意图只增不改也是错的。意图该稳定，也必须随时间演进。第三个方法 Drift Detection——定期把全库对照全部意图扫一遍，反过来发现该修的代码，或该变的意图。合起来就是我们的方法：IIAC——意图与实现的对齐与收敛。三个操作读写同一个约束存储，所有意图写回都要过人工确认。对齐让每一步正确；收敛让整体一直向意图靠拢，而不是越漂越远。

### ⑧ 3:40–3:55 · Tab ④ (dashboard glance) — **cut if short on time**

**Actions**: sweep quickly: LIVE card in the conformance feed → drift trends and the AT RISK card → capture queue.

**操作**：鼠标快速划过：conformance 流里的 LIVE 卡 → drift 趋势和 AT RISK 卡 → capture 队列。

> 🇬🇧 Put all three together, and you get this — the dashboard, the architect's view. Here's the live **conformance** feed. There's our PR. Here are the **drift** trends. For each one, the radar drafts a choice: fix the code, or change the intent. And here's the **capture** queue, waiting for review.
>
> 🇨🇳 三个操作合在一起，就是这个——仪表盘，给架构师看的。这是实时的 conformance 流，刚才那个 PR 就在这。这是 drift 趋势，每一条雷达都起草了一个二选一：修代码，还是改意图。这是 capture 队列，等着审。

### ⑨ 3:55–4:15 · Tab ⑤ screen 2 (What you saw today is one slice)

**Actions**: point at the legend and the "4 of 13" stat line, then sweep the dimmed cards.

**操作**：指一下图例和 "4 of 13" 那行统计，再扫过暗色的卡片。

> 🇬🇧 Now, step back for a second. What you saw today is just a small part of this. We've built a little; the plan behind it is much bigger. But here's the point — the vision is **not a code-review tool**. With IIAC, we want AI-driven development to **converge** under AI's watch — the same way it used to, under ours.
>
> 🇨🇳 退一步看。今天你看到的只是其中很小一部分——我们只做了一点点，背后是大得多的计划。但重点是——我们的愿景不是做一款 code review 工具。我们想用 IIAC，让 AI 驱动的开发在 AI 的监管下收敛——就像它过去在我们人类的监管下收敛一样。

### ⑩ 4:15–4:40 · Tab ⑤ screen 3 (From writing, to steering, to autonomy)

**Actions**: point left to right across the three cards, then the audit strip.

**操作**：从左到右逐张指过三张卡，最后指底部的审计带。

> 🇬🇧 Why does this matter? Think of three eras. In the past, humans wrote the code and reviewed each other's code. Today, AI writes the code, and humans review and steer in real time — that doesn't scale: one person, one session. And it shouldn't be the future. Code written by AI should be reviewed by AI; humans should manage what only humans can — **intent**. Govern the intent, ensure convergence — with the whole process tracked and auditable.
>
> 🇨🇳 为什么这重要？看三个时代。过去，人写代码，人互相 review。今天，AI 写代码，人来 review、人来实时监管——但撑不远：一个人，盯一个会话。而且这不该是未来。AI 写的代码就该由 AI 来 review；人去管只有人能管的东西——意图。监管意图、确保收敛，全程可跟踪、可审计。

### ⑪ 4:40–5:00 · Tab ⑤ screen 4 (Roadmap) → close

> 🇬🇧 So here's where we're headed. The roadmap is laid out. If you believe in this vision, vote for it — help this idea travel further down the roadmap. That's our take on *Innovation that AI/works*. Thank you!
>
> 🇨🇳 所以，我们要去的方向就在这。路线已经排好。如果你认同这个愿景，投我们一票——让这个 idea 沿着路线图走得更远。这是我们对 Innovation that AI/works 的回答。谢谢！

---

## C. After Recording

1. Zoom transcodes after the meeting ends; the `.mp4` lands under `~/Documents/Zoom/<date-time>.../`
2. Playback check: duration ≤ 5:00, audio clear, on-screen text readable
3. If over 5:00: cut ⑥ (contrast, 15 s) first, then ⑧ (dashboard, 15 s)
4. Submit through the organizer's channel

## D. Emergency Quick Reference

| Situation | Action |
|---|---|
| radar check errors / >30 s | run the replay fallback in segment ④ |
| Small stumble | keep going; don't apologize or restart |
| Major derailment | stop recording, redo the take (it's only 5 minutes) |
| GitHub pages slow | refresh all tabs right before recording |
