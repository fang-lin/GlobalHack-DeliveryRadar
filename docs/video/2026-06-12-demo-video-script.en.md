# Zoom Showcase Operating Script — Delivery Radar (~5 min, single take)

> **Authoritative version: Chinese (`2026-06-12-demo-video-script.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**

> **Structure: first half (0:00–2:45) tight demo; second half (2:45–5:00) the project's bigger vision.**

---

## A. Pre-recording Setup (10 min, check off each item)

### A1. Terminal

- [ ] Open Terminal and run:
  ```bash
  cd ~/Projects/intent-impl-align
  clear
  ```
- [ ] Increase font size: `Cmd +` three times
- [ ] Pre-run each command once (rehearsal + shell history; recall with ↑ while recording):
  ```bash
  .venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
  gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
  cat pr1.diff
  .venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
  ```
- [ ] After a clean dry run, `clear`

### A2. Browser (5 tabs in this order)

| Tab | URL |
|---|---|
| ① ADR | `https://github.com/fang-lin/shop-demo/blob/main/docs/adr/ADR-001-inventory-eventual-consistency.md` |
| ② PR | `https://github.com/fang-lin/shop-demo/pull/1` |
| ③ Contrast | `file:///Users/linfang/Projects/intent-impl-align/dashboard/contrast.html` |
| ④ Dashboard | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html` |
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/slides.html` (four screens: loop / system map / two paths + audit / roadmap; scroll to switch) |

- [ ] Hide bookmarks bar `Cmd+Shift+B`; zoom each tab to 125%
- [ ] Park tab ② (PR) on **Conversation**, top

### A3. System & Zoom

- [ ] macOS Do Not Disturb on
- [ ] Zoom: **New Meeting** → camera on, mic on
- [ ] 10-second recording test (Record on this Computer → speak → stop → verify audio)
- [ ] Start for real: **Record on this Computer**

---

## B. Walkthrough

> Finish the current line before switching screens.

### First half · Tight demo (0:00–2:45)

#### ① 0:00–0:20 · Opening (camera; share screen after the line)

> Hi, I'm Lin. This is **Delivery Radar** — it keeps code changes aligned with your architectural decisions, and the business reasons behind them. A quick live demo first — then the bigger picture.

#### ② 0:20–0:50 · Tab ① (ADR): sweep the €400k sentence → rest on the constraints block

> This demo shop records decisions as ADRs. ADR-001: inventory reads tolerate five minutes of staleness — a business decision: fresh reads would melt the primary DB during peak sales; last peak cost €400k. The key part: this **machine-readable constraint block** — rule, scope, and the business driver. Checks run against this.

#### ③ 0:50–1:15 · Tab ② (PR): title/description → green ✅ → glance at Files changed → back to Conversation

> A developer fixes a real complaint — stale stock counts — by reading the primary directly and locking the row. Well-intentioned, **tests pass, CI is green**. This merges.

#### ④ 1:15–2:00 · Terminal: run 3 commands (recall with ↑)

```bash
.venv/bin/radar extract --adr-dir ~/Projects/shop-demo/docs/adr
gh pr diff 1 -R fang-lin/shop-demo > pr1.diff
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff
```

Actions: at extract say "constraints, extracted from the ADRs"; the 20–30 s wait after the check is for the first half of the line; when results appear, highlight the `violated` line and the `aligned` line and read each.

> Radar pulls the diff, retrieves **only the constraints whose scope matches the changed files**, and checks each one — grounded with the rule *and* the driver. …There: **ADR-001 — violated, 0.99** — it reintroduces the exact lock contention from the €400k incident. And ADR-002 — **aligned**. No false alarm.

**Fallback** (check fails / >30 s):
```bash
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff /tmp/pr1.diff --replay artifacts/pr1-verdicts.json
```

#### ⑤ 2:00–2:25 · Tab ②: scroll to the 🛰️ comment; sweep Rule / Why / Evidence / Direction

> On the PR it lands as this comment: the rule — **why the rule exists, quoting the business rationale** — the exact lines, and the fix direction. **Advisory**: machine drafts, human decides.

#### ⑥ 2:25–2:45 · Tab ③ (contrast): point at the yellow highlight on the left → then the right panel

> Same model, no grounding — the left side. It catches the lock as an *opinion* — and then suggests an unlocked primary read, **itself a violation**. Opinion versus a governable verdict.

### Second half · The bigger vision (2:45–5:00)

#### ⑦ 2:45–3:15 · Tab ④ (dashboard): KPI → LIVE card → drift trends → AT RISK card → Capture queue

> And here the demo opens into the vision. What you saw is **one of three operations over one shared object** — the constraint. The architect's view: conformance, live. **Drift** audits the standing codebase — ADR-002 is decaying — and the radar drafts both ways out: remediate the code, or supersede the decision. **Capture** queues unrecorded decisions for triage. Humans confirm; nothing executes on its own.

#### ⑧ 3:15–3:35 · Tab ⑤ screen 1 (closed loop)

> The heart is a closed loop — intent, implementation, alignment, convergence. ADRs become constraints; conformance enforces, drift audits, capture feeds decisions back. **Alignment makes each change right; convergence makes the whole trajectory settle** — no oscillation, so the process ends in a deterministic, auditable state instead of circling.

#### ⑨ 3:35–4:00 · Tab ⑤ screen 2 (system map): point at the legend, then sweep the dimmed cards

> We've specified the **whole system** — every box carries requirement IDs. Today you saw the lit spine. Around it, sequenced: the behavioral intent layer, deterministic checks, capture triage, the drift engine — and a trust ladder: a replay harness measuring precision on your repo's *own history*, because a check only earns the right to **block** after it proves itself.

#### ⑩ 4:00–4:40 · Tab ⑤ screen 3 (writing → steering → autonomy, three cards): point left to right, then the audit strip

> Three eras put this in context. **In the past, humans wrote the code** — intent lived in people's heads, and drift was slow enough for review to keep up. **Today, humans steer coding agents in real time** — agents write the code; alignment holds because a human corrects every step, live. That scales to one person, one session. **The exploration: long-horizon autonomy** — recorded, machine-checkable intent replaces real-time steering. The agent self-checks *before* opening a PR, captures new decisions, escalates only at decision points. The human steps out of the loop — alignment stays in. And everything is **tracked and auditable**: every verdict carries evidence and a constraint ID, every confirmation is recorded, intent lives in git — who decided, what changed, why.

#### ⑪ 4:40–5:00 · Tab ⑤ screen 4 (roadmap) → close

> The road is sequenced: what you saw runs today; capture and drift next; gating only once precision is proven. **Delivery Radar — keep the why alive.** Thanks!

---

## C. After Recording

1. Zoom transcodes after the meeting ends; the `.mp4` lands under `~/Documents/Zoom/<date-time>.../`
2. Playback check: duration ≤ 5:00, audio clear, on-screen text readable
3. Over time: up to ~20 s is usually fine; if far over, shorten dwell time in segments ② and ⑦ and re-record
4. Submit the `.mp4` through the organizer's channel

## D. Emergency Quick Reference

| Situation | Action |
|---|---|
| radar check errors / >30 s | run the replay fallback (segment ④) |
| Small stumble | keep going; don't apologize or restart |
| Major derailment | stop recording, redo the take (it's only 5 minutes) |
| GitHub pages slow | refresh all tabs right before recording |
