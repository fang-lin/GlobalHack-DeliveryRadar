# Zoom Showcase 操作脚本（约 5 分钟，一镜到底）

> **权威: 中文（本文件） · 翻译: 英文（`2026-06-12-demo-video-script.en.md`，英文口播用） · 最后同步: 2026-06-12 · 两版冲突以中文为准**

> 叙事主线：提出问题（人 review 不过来，vibe review 不行）→ 快速展示 Conformance → 引出方法 IIAC（三个方法逻辑递进）→ 愿景（不是 review 工具，是让 AI 开发收敛）→ 三时代 → 路线图 + 拉票。

---

## A. 开录前准备（10 分钟，逐项打勾）

### A1. 终端

- [ ] 打开 Terminal，执行：
  ```bash
  cd ~/Projects/intent-impl-align
  clear
  ```
- [ ] 字号调大：按 `Cmd +` 三次
- [ ] 下面 4 条命令各预跑一次（练手 + 进命令历史，录制时按 ↑ 调出）：
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
| ⑤ Slides | `file:///Users/linfang/Projects/intent-impl-align/dashboard/index.html`（四屏：IIAC Loop / 全系统地图 / 三时代 / 路线图） |

- [ ] 隐藏书签栏 `Cmd+Shift+B`；GitHub 两个标签缩放 125%
- [ ] 标签②（PR）停在 **Conversation** 顶部

### A3. 系统与 Zoom

- [ ] macOS 勿扰模式开
- [ ] Zoom：**New Meeting** → 摄像头开、麦克风开
- [ ] 10 秒试录（Record on this Computer → 说话 → 停 → 验证有声）
- [ ] 正式开始：**Record on this Computer**

---

## B. 演示流程（说完当前句再切画面）

### ① 0:00–0:40 · 提出问题（摄像头，说完再共享屏幕）

**操作**：对摄像头说完整段，然后 Share Screen → 整个屏幕 → Share。

> 人写代码的时代，PR 是人来 review 的——同事读你的代码，还能问一句：这符合我们系统的建法吗？符合当初为什么这么建吗？AI 时代，这件事崩了：代码生产的速度，人根本 review 不过来。那让 AI 来 review？把 PR 丢给 agent，凭感觉审一遍——vibe review？肯定不行。要让 agent 审代码，它得有**方法**。我们造了一个。

### ② 0:40–1:10 · 标签①（ADR-001）

**操作**：滚到 Context 段，鼠标划过"€400k"句 → 滚到底部 `constraints` 块，停在 `driver: EPIC-512` 行。

> 这是演示仓库，它的架构决策记录在 ADR 里。ADR-001：库存读取容忍五分钟陈旧——这是业务决定：大促时实时读会压垮主库，上次大促损失四十万欧。关键是下面这个**机器可读的约束块**：规则、作用域、业务动因。

### ③ 1:10–1:30 · 标签②（PR #1）

**操作**：标题+描述停 3 秒 → 指绿色 ✅ → Files changed 扫一眼 `FOR UPDATE` → 点回 Conversation。

> 现在来了一个再正常不过的 PR：修客诉"库存数字不准"——直读主库、加行锁。测试全过，CI 全绿。评审忙不过来？这就合进去了。

### ④ 1:30–2:10 · 终端（3 条命令，↑ 调出）

**操作**：依次跑 extract → `gh pr diff` → check；check 等待的 20–30 秒正好讲技术细节；结果出来选中 `violated` 行和 `aligned` 行各读一遍。

> 跑一下 radar。技术上一句话讲完：从 ADR 提取出机器可检查的约束，只检索作用域命中变更文件的那些，然后把规则、业务动因和正反例一起灌给模型，强制输出结构化裁定——不许猜，证据不足必须答 unknown。……结果出来了：ADR-001，**violated**，置信度 0.99——理由直指要害：重新引入了当年造成八倍结账延迟的锁竞争。第二行 ADR-002：**aligned**。它不乱咬。

**保底**（check 失败/超 30 秒，输出一致、瞬间出）：
```bash
.venv/bin/radar check --adr-dir ~/Projects/shop-demo/docs/adr --diff pr1.diff --replay artifacts/pr1-verdicts.json
```

### ⑤ 2:10–2:30 · 标签②（PR 上的评论）

**操作**：滚到 🛰️ 评论，鼠标依次划过 Rule / Why this rule exists / Evidence / Direction。

> 这就是落在 PR 上的评审：规则、规则为什么存在——直接引用业务理由——精确行号、修复方向。建议性，不阻塞合并。这就是 **Conformance**：让实现向意图对齐。

### ⑥ 2:30–2:45 · 标签③（对照页）【时间紧可砍】

**操作**：指左栏黄色高亮句 → 指右栏。

> 顺便回答"这跟 vibe review 差在哪"：同一个模型、同一份 diff、不带方法——左边。它也算个好评审，但它把陈旧当 bug 修，甚至自己提了一个违反 ADR 的方案。没有方法的 review 是观点；有方法的，才是裁定。

### ⑦ 2:45–3:40 · 标签⑤ 第一屏（IIAC Loop 图）——方法的正式出场

**操作**：讲 Capture 时指中列管线，讲 Drift 时指右列管线，最后指回灌线上的 human confirms 门。

> 但只用 ADR 审 PR 是**不够的**——这只保证了实现向意图对齐，单向。意图有时是从代码里长出来的：PR 悄悄做了一个谁都没记录的决策。识别不了、记录不了，就谈不上真正的对齐。所以第二个方法：**Decision Capture**——探测集成过程中产生的新意图，转成意图文档记录下来。还没完：意图只增不改也是错的。意图应当稳定，但必须随时间演进。第三个方法：**Drift Detection**——定期把存量代码对照全部意图扫一遍，反过来发现该修的代码，或者该变的意图。合在一起，这就是我们的方法：**IIAC——意图与实现的对齐与收敛**。三个操作读写同一个约束存储，所有意图写回必须经人确认。对齐让每一步正确，收敛让整条轨迹安定。

### ⑧ 3:40–3:55 · 标签④（dashboard 快览）【时间紧可砍】

**操作**：鼠标快速划过：conformance feed 的 LIVE 卡 → drift 趋势和 AT RISK 卡 → capture 队列。

> 给架构师的视角长这样：conformance 实时流——刚才那个 PR 就在这；drift 的衰减趋势，和"修代码还是改意图"的二选一草稿；capture 的待分诊队列。

### ⑨ 3:55–4:15 · 标签⑤ 第二屏（What you saw today is one slice）

**操作**：先指图例和"4 of 13"统计行，再扫过暗色卡片。

> 今天你看到的只是一个切片——13 组能力跑通了 4 组，每个框都有需求 ID。但我们的愿景**不是做一款 code review 工具**。我们想用 IIAC 让 AI 驱动的软件开发，在 AI 的监管下**收敛**——就像过去它在人类的监管下收敛一样。

### ⑩ 4:15–4:40 · 标签⑤ 第三屏（From writing, to steering, to autonomy）

**操作**：从左到右逐卡指，最后指底部审计带。

> 过去，人写代码，人互相 review。今天，AI 写代码，人来 review、人来实时监管——但这撑不远：一个人，盯一个会话。而且这不该是未来。AI 写的代码，就该由 AI 来 review；人类去管真正该人管的东西——**意图**。监管意图，确保收敛，全程可跟踪、可审计。

### ⑪ 4:40–5:00 · 标签⑤ 第四屏（Roadmap）→ 收尾

> 路线已经排好。如果你认同这个愿景，投我们一票——让这个 idea 沿着路线图走得更远。这是我们对 Innovation that AI/works 的回答。谢谢！

---

## C. 录完之后

1. Zoom 结束会议后自动转码，`.mp4` 在 `~/Documents/Zoom/<日期时间>.../`
2. 播放检查：时长 ≤ 5:00、声音清楚、屏幕文字可读
3. 超时：先砍 ⑥（对照页 15s），再砍 ⑧（dashboard 15s）
4. 按主办方渠道提交

## D. 应急速查

| 状况 | 处理 |
|---|---|
| radar check 报错/超 30 秒 | 跑第④段的保底 replay 命令 |
| 说错词、小磕绊 | 直接讲下去，不要道歉重说 |
| 大翻车 | 停止录制整段重来（才 5 分钟） |
| GitHub 页面慢 | 开录前刷新所有标签 |
