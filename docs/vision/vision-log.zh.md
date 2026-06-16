# Delivery Radar — Vision 想法记录（idea log）

> **工作日志:只中文、低摩擦**(刻意不做英文镜像——这是随手捕获想法的地方,不是对外产物;双语只用于严谨综述 `product-vision.zh.md`)。
> **新想法 prepend 到最前。** 每条尽量标注它**毕业**到哪(graduated → 哪个 VIS / summary 章节);没毕业的就留着发酵。

这是"聊 vision 时的原始记录";打磨后的**严谨综述**在 `product-vision.zh.md`。流向本身就是 IIAC 的 capture→graduate:

> **想法 log（本文）→ 提炼 → vision summary（`product-vision.zh.md`）→ ADR → 需求/README**

---

## 2026-06-16 · "或者叫工艺;agent / skill / cli 只是外在体现"

原话:本质是项目流程管理的**工艺**;agent / skill / cli 只是工艺流程管理的**外在体现**。
- 提炼:工艺 = **过程控制(SPC)纪律**(定规格→控过程→量偏差→纠偏→收敛);措辞偏"过程控制 / 过程纪律",少用单字"工艺"(避匠人味)。形态 = 同一套工艺插在生命周期不同触点。
- **graduated → VIS-1(过程控制本质)、VIS-2(形态是外在体现);summary §3、§5**

## 2026-06-16 · "我们也可以提供 skill;本质是流程管理方法论"

- 提炼:方法论(IIAC)才是核心 IP;**Skill(SKILL.md)是方法论的分发载体**——让 dev/agent"装上"这套纪律。
- **graduated → VIS-1、VIS-2;summary §5。待办候选产物:真写一个 IIAC SKILL.md**

## 2026-06-16 · "radar 本质也是一个 agent"

- 提炼:**今天技术上是 workflow**(固定管道),不是开放式 agent;但它是"agent 化开发"循环里的**对齐函数 / 自检**——编码 agent 开 PR 前用同一套判断逻辑检查自己。措辞:对外说"对齐层 / 自检",别吹"很厉害的自主 agent"。
- **graduated → VIS-3;summary §5。架构待探索:把单次 grounded 判断升级成"调查型 agent"(不确定时自己多读文件/grep/查历史)**

## 2026-06-12 · 两大支柱(已沉淀)

双路径(人类今天实时 steering / 长程自治是**探索目标**)+ 全程可审计(收敛需要记忆,"无历史则无轨迹,无轨迹则无收敛")。
- **已沉淀 → summary §6**
