# Delivery Radar — Vision 想法记录（idea log · ticket 式）

> **这是聊 vision/idea 的原始记录,像管理 ticket 一样管理。** 只中文、低摩擦;打磨后的严谨综述在 `product-vision.zh.md`。
> **约定**:每条 idea 一个 ticket(`VL-NNN`,ID 递增不复用);**新 ticket 放最上**;尽量**详细记录聊天**(原话 + 讨论 + 诚实 caveat + 结论 + 去向)。
> **状态**:🆕 新提出 · 🔬 打磨中 · 🅿️ 搁置 · 🎓 已毕业(进 summary/ADR)· ❌ 放弃 · 🔁 被取代
> **类型**:`定位` `架构` `方法论` `产物` `命名` `meta(流程)`
> 流向(本身就是 IIAC 的 capture→graduate):**log（本文)→ 提炼 → summary（`product-vision.zh.md`)→ ADR**

## 索引

| ID | 标题 | 类型 | 状态 | 去向 |
|---|---|---|---|---|
| VL-006 | vision-log 用 ticket 式管理、详细记录聊天 | meta | 🎓 | 本文结构 |
| VL-005 | vision 应分两类:想法记录 + 严谨 summary | meta | 🎓 | 本文 + summary §0 |
| VL-004 | 叫"工艺";agent/skill/cli 只是外在体现 | 定位/方法论 | 🎓 | VIS-1·VIS-2 / summary §3·§5 |
| VL-003 | 可提供 skill;本质是流程管理方法论 | 方法论/产物 | 🎓(+待办) | VIS-1·VIS-2 / summary §5 |
| VL-002 | radar 本质也是一个 agent | 定位/架构 | 🎓(架构待探索) | VIS-3 / summary §5 |
| VL-001 | 两大支柱:双路径 + 全程可审计 | 定位 | 🎓 | summary §6 |

---

## VL-006 · vision-log 用 ticket 式管理、详细记录聊天
- **类型**: meta(流程) · **状态**: 🎓 已毕业 · **创建/更新**: 2026-06-16 · **去向**: 本文结构

**原话(用户)**
> "vision-log.zh.md 你应该像管理ticket一样管理，而且要详细的记录我们关于vision/idea的聊天"

**讨论 / 聊天记录**
- 诉求:① 每条 idea 当 ticket 管(ID、状态、类型、去向);② 不要只记一行,要**详细记录聊天**(含原话和讨论过程)。
- 我据此把本文从"简记清单"重构为 ticket 格式 + 索引表;本条即第一个按新格式记录的 ticket。

**产出 / 待办**
- 已落地本文结构。**约定固化**:以后你抛 vision idea,我先开一个 VL ticket、详记聊天,再视情况毕业到 summary/ADR。

## VL-005 · vision 应分两类:想法记录 + 严谨 summary
- **类型**: meta(流程) · **状态**: 🎓 已毕业 · **创建/更新**: 2026-06-16 · **去向**: 本文 + `product-vision.zh.md` §0

**原话(用户)**
> "vision应该有两种，一种是我们聊vision idea的记录，一个是持续严谨的vision summary"

**讨论 / 聊天记录**
- 洞察:**捕获 ≠ 综述**(又是 IIAC 的 capture→graduate)。raw 想法低摩擦记下来,严谨的综述单独维护。
- 落地分工:`vision-log.zh.md`(本文)=原始记录,**只中文、低摩擦**(刻意不做英文镜像,免得拖慢捕获);`product-vision.{zh,en}.md`=持续提炼的**综述**,中英双语。

**产出 / 待办**
- 两份文档 + 互链已建;summary §0 写明分工。

## VL-004 · 叫"工艺";agent/skill/cli 只是外在体现
- **类型**: 定位/方法论 · **状态**: 🎓 已毕业 · **创建/更新**: 2026-06-16 · **去向**: VIS-1、VIS-2 / summary §3、§5

**原话(用户)**
> "或者说叫工艺" / "至于agent还是skill 还是cli，其实只是工艺流程管理的外在体现"

**讨论 / 聊天记录**
- "工艺"比"方法论"更准:带**过程控制 / 质量控制(SPC)**味道,正好对上 IIAC 的 **convergence**——slide 那句 *"convergence … no oscillation"* 本就是控制论语言(不是新加的比喻)。
- 制造业映射:规格=记录的意图 · 质检=conformance 检查 · 偏差=drift · 纠偏=remediation/supersede(过人确认门)· 收敛=代码库朝意图靠拢。
- 第二句是真正的高度:形态(CLI/Skill/Agent)只是**同一套工艺插在生命周期不同触点** → 不绑死形态 → 定位更耐久(工具会换,工艺留下)。
- **三条洞察(VL-002/003/004)其实是同一件事的三个面**:IIAC=方法 · radar=CI 侧工具 · skill=agent 侧化身。
- 我的诚实 caveat:措辞偏 **"过程控制 / 过程纪律"**,少用单字"工艺"(避匠人味,与"机读、机器可检"调性冲突);英文用 **"process control / engineering discipline for intent-aligned software production"**;牙齿仍是两硬核 + 收敛闭环,别让抽象变哲学。

**产出 / 待办**
- 已进 summary §3(过程控制本质 + 映射表)、§5(形态是外在体现)。

## VL-003 · 可提供 skill;本质是流程管理方法论
- **类型**: 方法论/产物 · **状态**: 🎓 已毕业(含待办) · **创建/更新**: 2026-06-16 · **去向**: VIS-1、VIS-2 / summary §5

**原话(用户)**
> "实际上我们也可以提供skill对吧？从根本上说我们的这个项目实际上做的是项目流程管理的方法论"

**讨论 / 聊天记录**
- 两层:① **本质是方法论(IIAC)**——工具会过时、方法论会留(类比 TDD、GitOps);可用 5 条说清(机读意图+driver / 对照意图带理由判断 / advisory+capture / 人确认门+留痕 / 收敛)。② **Skill = 方法论的分发载体**——让任何 agent"装上"这套纪律;skill 里装两样:方法本身 + 怎么驱动 radar。
- 串联:**IIAC(方法)→ radar(CI 工具)→ skill(agent 化身)**;agent 加载 skill 就用 radar 的判断逻辑自检 → 闭合 VL-002 那条线。
- caveat:"方法论"别空,要落到硬核;hackathon 要聚焦,但 **SKILL.md 体积小、信号强**,是便宜又亮眼的真实产物,还顺带 dogfood Claude 生态。

**产出 / 待办**
- 已进 summary §5。**待办候选产物**:真写一个 IIAC 的 `SKILL.md`(未动手,等你点头)。

## VL-002 · radar 本质也是一个 agent
- **类型**: 定位/架构 · **状态**: 🎓 已毕业(架构方向待探索) · **创建/更新**: 2026-06-16 · **去向**: VIS-3 / summary §5

**原话(用户)**
> "我突然有个idea，本质上说，我们做的这个radar实际上也是一个agent"

**讨论 / 聊天记录**
- 我先泼冷水(诚实):按标准定义,radar **今天是 workflow**(固定管道:抽取→检索→每条约束一次 grounded 判断→贴评论),不自主决定路径、不循环、不自调工具;直接说"是 agent"会被 fact-checker/skeptic 当过度宣称打掉。
- 真正强的角度:radar 是"agent 化开发"循环里的**对齐函数 / 自检**——它的**目标就是被记录的意图**,对照目标评判,这正是 agent 定义里最关键的一块。
- 而且**第三屏 slide 已经说过**"agent 开 PR 前自检、只在决策点上报人",那个"自检"用的判断逻辑**就是 radar**——这条 idea 等于给它命名。
- 两个真东西:① **定位升级**(从"又一个 PR review 工具"→"agent 化开发时代的对齐层";Innovation + Responsible AI 加分);② **架构方向**(把单次 grounded 判断升级成**调查型 agent**:不确定时自己多读文件/grep/查历史/收证据再裁定)。
- caveat:对外说"**对齐自检 / 对齐层**",别说"一个很厉害的自主 agent"——后者会被技术评委当吹牛。

**产出 / 待办**
- 已进 summary §5。**架构待探索**:radar 升级为调查型 agent(Phase 2/3)。

## VL-001 · 两大支柱:双路径 + 全程可审计
- **类型**: 定位 · **状态**: 🎓 已毕业 · **创建**: 2026-06-12 · **去向**: summary §6

**原话(用户,概括)**
> 双路径:人类今天实时 steering(不可规模化);**长程自治是探索目标**——agent 开 PR 前自检、只在决策点上报人。全程可审计:谁决定/改了什么/为什么。

**讨论 / 聊天记录**
- 更深一层:**可审计是收敛的前提,不是合规装饰**——收敛是轨迹属性,轨迹需要记忆。tagline:"无历史则无轨迹,无轨迹则无收敛。"
- 控制论映射:constraints=setpoint · verdicts=误差信号 · fix_direction=梯度 · drift=积分项 · 稳定 ID=可测距离。

**产出 / 待办**
- 已进 summary §6;另见记忆笔记 vision-pillars。早于本 log,补记为 VL-001。
