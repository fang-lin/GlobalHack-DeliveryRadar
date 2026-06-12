# Zoom Showcase Operating Script — Delivery Radar (~5 min, single take)

> **Authoritative version: Chinese (`2026-06-12-demo-video-script.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**

---

## A. Pre-recording Setup (10 min, check off each item)

### A1. Terminal

- [ ] Open Terminal and run:
  ```bash
  cd ~/Projects/intent-impl-align
  clear
  ```
- [ ] Increase font size: press `Cmd +` three times
- [ ] Pre-run each of these 4 commands once (rehearsal + shell history; recall with ↑ while recording):
  ```bash
  .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
  gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
  cat pr1.diff
  .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
  ```
- [ ] After a clean dry run, `clear` the screen

### A2. Browser (open 5 tabs in this order)

| Tab | URL |
|---|---|
| ① ADR | `https://github.com/fang-lin/shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/shop-demo/pull/1` |
| ③ Contrast | `file:///Users/linfang/Projects/intent-impl-align/dashboard/contrast.html` |
| ④ Dashboard | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/slides.html` |

- [ ] Hide bookmarks bar: `Cmd+Shift+B`; zoom each tab to 125%: `Cmd +`
- [ ] Park tab ② (PR) on the **Conversation** page, scrolled to top

### A3. System & Zoom

- [ ] Enable macOS Do Not Disturb (Control Center → Focus)
- [ ] Zoom: **New Meeting** (just you) → camera on, mic on
- [ ] 10-second recording test: Record on this Computer → say a sentence → stop → verify audio
- [ ] To start for real: click **Record on this Computer** (not Record to Cloud)

---

## B. Walkthrough (8 segments, all actions and lines)

> Say the current line to the end before switching screens.

### ① 0:00–0:25 · Opening (camera only, no screen share yet)

**Actions**: deliver the line to the camera, then click **Share Screen → entire screen (Desktop 1) → Share**.

> Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with the architectural decisions of your repo, and the business reasons behind them. AI writes code faster than anyone can review it against **why** the system is built this way — PRs pass every test and still quietly break decisions you already made. Let me show you on a real repo.

### ② 0:25–1:10 · Tab ① (ADR-001 page)

**Actions**:
1. Switch to tab ①
2. Scroll to the **Context** section, sweep the cursor over the "€400k in abandoned carts" sentence (first half of the line)
3. Scroll to the ` ```constraints ` block at the bottom, rest the cursor on the `driver: EPIC-512` line (second half)

> This demo shop records decisions as ADRs. ADR-001: **inventory reads tolerate five minutes of staleness** — a business decision: during peak sales, fresh reads would melt the primary DB; last peak that cost them €400k. The special part: this **machine-readable constraint block** — rule, scope, and a link to the business driver. This is what every check runs against.

### ③ 1:10–1:40 · Tab ② (PR #1)

**Actions**:
1. Switch to tab ② (Conversation, top): let the title "Fix stale stock count on product page" and description sit for 3 seconds
2. Point at the green ✅ "All checks have passed"
3. Click **Files changed**, sweep over the red/green diff (the `FOR UPDATE` lines)
4. After the line, click back to **Conversation** (prep for segment ⑤) — do not scroll yet

> Now a normal Tuesday: a developer fixes a real complaint — stale stock counts. The fix: read the primary directly, lock the row. Small, well-intentioned, **tests pass, CI is green**. Busy reviewers? This merges.

### ④ 1:40–2:35 · Terminal (4 commands)

**Actions** (`Cmd+Tab` to Terminal; recall commands with ↑):

1. Extraction (one-line constraint list appears; point and say "two constraints, extracted from the ADRs"):
   ```bash
   .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
   ```
2. Pull the PR diff (say "now pull the PR's diff from GitHub" — no output is normal):
   ```bash
   gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
   ```
3. Run the check (after Enter there is a **20–30 s wait — exactly the time for the line below**):
   ```bash
   .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
   ```
4. When results appear: select/highlight the `violated (confidence 0.99)` line, then the `aligned` line, reading each aloud

> (while waiting) It retrieves **only the constraints whose scope matches the changed files** — that's the noise control — then checks the diff against each one, grounded with the rule *and* the business driver. … (results appear) There: **ADR-001 — violated, confidence 0.99.** And the reason: it reintroduces the exact lock contention that caused the 8x checkout degradation. Second line: ADR-002 — **aligned**. It doesn't cry wolf.

**Fallback**: if command 3 errors or exceeds ~30 s, run this instead (identical output, instant):
```bash
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json
```

### ⑤ 2:35–3:05 · Tab ② (back to the PR comment)

**Actions**:
1. `Cmd+Tab` back to the browser (should still be on PR Conversation)
2. Scroll down to the 🛰️ **Delivery Radar — Architecture Conformance** review (the latest big one)
3. Sweep the cursor over the four parts while speaking: **Rule** → **Why this rule exists** → **Evidence** → **Direction**

> On the PR it lands as this review comment: the rule — **why the rule exists, quoting the business rationale** — the exact lines — and the direction of the fix. And it's **advisory**: it doesn't block the merge. Machine drafts, human decides.

### ⑥ 3:05–3:40 · Tab ③ (contrast.html)

**Actions**:
1. Switch to tab ③
2. Point at the left UNGROUNDED panel, scroll to the **yellow-highlighted sentence** ("read from the primary with a plain SELECT"), hold the cursor there
3. Then point at the "Why this rule exists" quote block in the right GROUNDED panel

> Is this just AI code review? Same model, same diff, **no grounding** — that's the left side. It's a good reviewer — catches the lock. But it treats staleness as a bug to *fix*, and even suggests reading the primary without a lock — **which is itself a violation of ADR-001**. Ungrounded review is opinion. Grounded — the right side — it's a verdict: addressable, measurable, attached to the decision.

### ⑦ 3:40–4:25 · Tab ④ (dashboard)

**Actions**:
1. Switch to tab ④
2. Sweep in order: KPI row → first PR card with the **LIVE** badge → the two sparkline trends → the red **AT RISK** card (hover 1 s each on Remediation and Supersede) → the Capture DN card with its three buttons

> The architect's view. The conformance feed — there's our pull request, live. **Drift** watches the main branch: ADR-002 is decaying — five violations and rising. The radar drafts both ways out: remediate the code, or supersede the decision. A human picks; neither runs on its own. And **Capture**: PR 38 made a decision nobody recorded — now a Decision Note waiting for triage. Undocumented decisions stop leaking away.

### ⑧ 4:25–5:00 · Tab ⑤ (slides.html) + close

**Actions**:
1. Switch to tab ⑤ (closed-loop diagram), hold 10 s for the first half
2. Scroll down to the Roadmap screen for the second half
3. After "Thanks!" → Zoom **Stop Recording** → End Meeting

> It's one loop: ADRs become constraints; conformance enforces, drift audits, capture feeds new decisions back. What you saw runs **today**. Next: the drift engine live, then a replay harness measuring precision on your own history — a check only earns the right to **block** a merge after it proves itself. **Delivery Radar — keep the why alive.** Thanks!

---

## C. After Recording

1. Zoom transcodes after the meeting ends; the `.mp4` lands under `~/Documents/Zoom/<date-time>.../`
2. Playback check: duration ≤ 5:00, audio clear, on-screen text readable
3. If over time: up to ~20 s over is usually tolerated; if far over, shorten the dwell time in segments ② and ⑦ and re-record
4. Submit the `.mp4` through the organizer's channel

## D. Emergency Quick Reference

| Situation | Action |
|---|---|
| radar check errors / exceeds 30 s | run the replay fallback (segment ④) |
| Misspoken word, small stumble | keep going; don't apologize or restart |
| Major derailment (order lost / repeated failures) | stop recording, redo the whole take (it's only 5 minutes) |
| GitHub pages slow | refresh every tab right before recording |
