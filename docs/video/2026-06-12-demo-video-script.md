# Demo Video Script — Delivery Radar (~5 min)

> 画面指引中文，旁白英文（照读即可）。目标时长 4:45–5:00（约 730 词，常速）。
> 录屏建议：1080p、浏览器 125% 缩放、深色终端主题、关闭通知（勿扰模式）。

| # | 时长 | 画面 | 旁白（English, verbatim） |
|---|------|------|---------------------------|
| 1 | 0:00–0:30 | 快切蒙太奇：绿色 CI ✓、PR merged、`git log` 滚动；最后定格一个 "All checks have passed" | AI writes code faster than humans can review it — and the review that's drowning first is not "does it work", but "does it match *why* the system is built this way". Pull requests pass every test, every linter — and still quietly violate the architectural decisions your team already made. Each one is invisible on its own. Together, they're how architecture rots. We built Delivery Radar to keep intent and implementation aligned — continuously. |
| 2 | 0:30–1:10 | `shop-demo` 仓库 → 打开 `docs/adr/ADR-001-...md`，停在 Context 的 €400k 段落 → 滚动到 `constraints` 块 → 切终端跑 `radar extract`，指着输出行 | This is shop-demo. Like any well-run repo, its decisions are recorded. ADR-001 says: inventory reads tolerate five minutes of staleness. Not a style preference — a business decision: during peak sales, fresh reads would melt the primary database. Last year that cost four hundred thousand euros in abandoned carts.<br><br>Here's what makes this ADR special: it carries a machine-readable constraint block — a rule, a scope, and a link to the business driver. Delivery Radar extracts it into an addressable, checkable constraint. The ADR stays the single source of truth; the constraint is what every check runs against. |
| 3 | 1:10–2:20 | PR #1 页面（绿 CI 特写，author/描述可见）→ 终端跑 `radar check`（真输出，violated 行特写）→ 切回 PR，🛰️ 评论出现，鼠标依次划过 Rule / Why this rule exists / Evidence / Direction | Now watch a perfectly normal Tuesday. A developer fixes a real customer complaint: stale stock counts on the product page. The fix reads the primary database directly and locks the row. It's small, it's well-intentioned, tests pass, CI is green. Reviewers are busy. This merges.<br><br>Delivery Radar runs on the pull request. First, scope: it retrieves only the constraints whose paths match the changed files — that's the noise control. Then it checks the diff against each constraint, grounded with the rule *and* the business reason behind it. Verdict: **violated**, confidence zero point nine three.<br><br>And look at the comment it posts. It cites the ADR clause. It quotes the business reason — five minutes of staleness is *accepted*, to protect the primary during peak sales. It points at the exact lines. And it gives the direction of the fix. One more thing: it's advisory. It doesn't block the merge. The human decides. |
| 4 | 2:20–2:50 | 分屏：左 = 无锚定 baseline 输出（划出"looks reasonable"类句子），右 = radar 评论 | So could any AI code reviewer do this? We asked the exact same model to review the exact same diff — without the ADR grounding. It calls the change *reasonable*. Exact counts sound like an improvement; the code is clean; the letter looks fine. This is the class of violations we're after: **letter honored, reason defeated**. Structural linters can't see it. Ungrounded AI review can't see it. Recorded intent makes it visible. |
| 5 | 2:50–3:30 | 简洁示意图（spec §4 闭环 ASCII 或简版图形）：ADR → Constraint → conformance/drift；capture/supersede → 回到 ADR；高亮 "machine drafts, human confirms" | How does this stay alive instead of becoming another stale wiki? The whole system is a closed loop around one shared object — the constraint. ADRs produce constraints. **Conformance** enforces them on every pull request. **Drift** audits the standing codebase — and can conclude that the *decision* itself is stale. **Capture** detects decisions a PR makes implicitly and turns them into new ADRs. Every new or superseded ADR re-extracts constraints, and the loop continues. And one principle is non-negotiable everywhere: the machine drafts, the human confirms. |
| 6 | 3:30–4:25 | dashboard：KPI 行 → conformance feed（LIVE 卡特写）→ drift 趋势 sparklines → at-risk 卡（悬停 Remediation / Supersede 两个草稿）→ capture 队列（DN 卡 + 三个 triage 按钮） | This is the architect's view. The conformance feed shows live verdicts — there's our pull request. Drift watches the default branch: ADR-002 is decaying — five violations across three services, and rising. The radar drafts both ways out: a remediation plan to refactor the code back into conformance — or a superseding ADR, if the decision no longer matches reality. A human picks one; neither executes on its own.<br><br>And down here, Capture: pull request thirty-eight quietly introduced a direct service-to-service call — a decision nobody recorded. It's now a Decision Note waiting for triage: graduate it into an ADR, route it to a story, or dismiss it. Undocumented decisions stop leaking away. |
| 7 | 4:25–5:00 | 路线图一屏（Phase 1/2/3 三列）→ 收尾静帧：🛰️ logo + "keep the why alive" | What you saw — advisory conformance and capture on real pull requests — runs today. Next: the drift engine and this dashboard go live, then a replay harness that measures precision on your repo's own history — because a check only earns the right to *block* a merge after it proves itself. Semantic checks never block; that's policy.<br><br>Intent stays in version control. The machine drafts; the human confirms. Delivery Radar — keep the *why* alive. |

字数 ≈ 700 / 常速 ≈ 4:50 ✅

## 录制顺序建议（与播出顺序无关）

1. 先录终端：`radar extract` + `radar check --replay`（消费已验证裁定，零风险）
2. 再录 PR 页面（评论已贴好，静态）
3. dashboard 一镜到底（动效循环，随时可录）
4. 闭环示意图 + 路线图（一张静态页/幻灯片，最后做）
5. ADR/montage 补拍

## 素材清单

- [ ] PR #1 上的真实 radar 评论（待 API key → check → comment --post）
- [ ] baseline 对照输出截图（待 API key）
- [ ] `verdicts.json`（--save 落盘，供 --replay 录制）
- [ ] dashboard `data.js` 顶部卡片与真实裁定数值同步
- [ ] 闭环示意图一张（场景 5）
- [ ] 路线图一屏（场景 7，Phase 1 ✅ / Phase 2 / Phase 3）
