# Zoom Showcase Operating Script (~5 min, single take)

> **Authoritative version: Chinese (`2026-06-12-demo-video-script.zh.md`) · This file: synchronized English translation — use this one when narrating in English · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**

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
  > If `radar` says command not found: replace every `radar` below with the absolute path `~/Projects/intent-impl-align/.venv/bin/radar`.
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
| ① ADR | `https://github.com/fang-lin/shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/shop-demo/pull/1` |
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

> Hi, I'm Lin — this is our project, **Delivery Radar**. Let me open with a problem. When humans wrote the code, humans could review it — a colleague would read your PR and ask: does this fit how we build this system? Does it fit *why* we built it that way? In the AI era, that breaks: code now arrives faster than any team can review it. So — let AI review it? Point an agent at the PR and let it vibe-review? That can't be the answer. If agents are going to review code, they need a **method**. We built one.

### ② 0:40–1:10 · Tab ① (ADR-001)

**Actions**: scroll to the Context section, sweep the "€400k" sentence → scroll to the `constraints` block, rest on the `driver: EPIC-512` line.

> This is the demo repo; its architectural decisions live in ADRs. ADR-001: inventory reads tolerate five minutes of staleness — a business decision: fresh reads would melt the primary database during peak sales; last peak cost four hundred thousand euros. The key part is this **machine-readable constraint block**: a rule, a scope, and the business driver.

### ③ 1:10–1:30 · Tab ② (PR #1)

**Actions**: title + description for 3 seconds → point at the green ✅ → glance at `FOR UPDATE` in Files changed → back to Conversation.

> Now a perfectly normal PR: fixing a customer complaint about stale stock counts — by reading the primary directly, with a row lock. Tests pass, CI is green. Busy reviewers? This merges.

### ④ 1:30–2:10 · Terminal (3 commands, recall with ↑)

**Actions**: run the three commands below (recall with ↑); the ~20 s wait after check is exactly for the technique sentence; when results appear, highlight the `violated` line and the `aligned` line and read each.

```bash
radar extract --adr-dir docs/adr
gh pr diff 1 > pr1.diff
radar check --adr-dir docs/adr --diff pr1.diff
```

> Let's run the radar on it. The technique in one sentence: extract machine-checkable constraints from the ADRs, retrieve only those whose scope matches the changed files, then ground the model with the rule, the business driver and examples, forcing a structured verdict — no guessing; if the evidence is thin, it must answer *unknown*. …There: ADR-001 — **violated**, confidence 0.99 — and the reason cuts straight to it: this **re-introduces** the exact lock contention that caused the eightfold checkout slowdown. Second line, ADR-002: **aligned**. It doesn't cry wolf.

**Fallback** (check fails / >30 s; identical output, instant):
```bash
radar check --adr-dir docs/adr --diff pr1.diff --replay ~/Projects/intent-impl-align/artifacts/pr1-verdicts.json
```

### ⑤ 2:10–2:30 · Tab ② (the review on the PR)

**Actions**: scroll to the 🛰️ review; sweep Rule / Why this rule exists / Evidence / Direction.

> On the PR it lands as this review: the rule, why the rule exists — it quotes the business reason — the exact lines, and the direction of the fix. Advisory; it doesn't block the merge. This is **Conformance**: implementation aligning toward intent.

### ⑥ 2:30–2:45 · Tab ③ (contrast) — **cut if short on time**

**Actions**: point at the yellow highlight on the left → then the right panel.

> And this is the difference from vibe review: same model, same diff, no method — the left side. A decent reviewer — but it treats staleness as a bug to fix, and even proposes its own fix — one that violates the ADR. Review without a method is opinion; with a method, it's a verdict.

### ⑦ 2:45–3:40 · Tab ⑤ screen 1 (IIAC Loop) — the method's formal entrance

**Actions**: point at the middle pipeline for Capture, the right pipeline for Drift, then the human-confirms gate on the return edge.

> But reviewing PRs against ADRs is **not enough** — that only aligns implementation toward intent, one direction. Sometimes intent grows out of the code: a PR quietly makes a decision nobody recorded. If you can't detect and record it, there is no real alignment. So, the second method: **Decision Capture** — detect new intent created as the code is merged, and write it down as recorded intent. Still not done: intent that only grows and never changes is wrong too. Intent should be stable — and still change over time. The third method: **Drift Detection** — on a regular schedule, scan the whole codebase against all intent, and surface either code that needs fixing, or intent that needs changing. Together, this is our method: **IIAC — intent–implementation alignment and convergence**. Three operations over one shared constraint store; every write-back to intent passes human confirmation. Alignment makes each change right; convergence makes the trajectory settle.

### ⑧ 3:40–3:55 · Tab ④ (dashboard glance) — **cut if short on time**

**Actions**: sweep quickly: LIVE card in the conformance feed → drift trends and the AT RISK card → capture queue.

> For an architect it looks like this: the live conformance feed — there's our PR; drift decay trends — each with a drafted choice: fix the code, or change the intent; and the capture queue waiting for review.

### ⑨ 3:55–4:15 · Tab ⑤ screen 2 (What you saw today is one slice)

**Actions**: point at the legend and the "4 of 13" stat line, then sweep the dimmed cards.

> What you saw today is one slice — four of thirteen capability groups run, and every box carries requirement IDs. But the vision is **not a code-review tool**. With IIAC we want AI-driven software development to **converge** under AI supervision — the way it used to converge under human supervision.

### ⑩ 4:15–4:40 · Tab ⑤ screen 3 (From writing, to steering, to autonomy)

**Actions**: point left to right across the three cards, then the audit strip.

> In the past, humans wrote the code and reviewed each other's code. Today, AI writes the code, and humans review and steer in real time — that doesn't scale: one person, one session. And it shouldn't be the future. Code written by AI should be reviewed by AI; humans should manage what only humans can — **intent**. Govern the intent, ensure convergence — with the whole process tracked and auditable.

### ⑪ 4:40–5:00 · Tab ⑤ screen 4 (Roadmap) → close

> The roadmap is laid out. If you believe in this vision, vote for it — help this idea travel further down the roadmap. That's our take on *Innovation that AI/works*. Thank you!

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
