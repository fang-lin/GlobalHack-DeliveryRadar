# IIAC Loop 图设计说明（视频 slides 第一屏）

> **权威: 中文（本文件） · 翻译: 英文（待更新） · 最后同步: 2026-06-12**
> 状态：已实现于 `dashboard/slides.html` 第一屏；本文供快速审核，改这里=改图。

## 一句话

**中心是"意图"（文档只是载体）**；三条检测管线让意图与实现相互对齐；**更新意图的写回必须经人确认**（收敛点）；底部曲线带展示收敛这一结果。

## 布局（自上而下）

```
                    SOURCE OF TRUTH
   ┌────────────── Intent ──────────────┐ ──extract→ ┌ Constraints ┐
   │ 载体: ADRs·specs·stories·需求文档    │            │ 可寻址·稳定ID │
   └─────────────────────────────────────┘            └──────┬──────┘
                                  ┌───────────────┬──────────┤（扇出）
                                  ↓               ↓          ↓
                          ┌ Conformance ┐ ┌ Decision Capture ┐ ┌ Drift Detection ┐   ← 绿=检测作业
                          │ PR open+push │ │   on PR open     │ │ cron·ADR change │
                                  ↓               ↓                    ↓
                            Report          Decision Note        Drift report        ← 灰=中间产物
                          typed PR review   draft·人工分诊       + 衰减趋势
                                                  ↓                ↓        ↓
                                          Graduate → intent   Remediation  Supersede → intent   ← 紫=意图更新
                                           架构→ADR·行为→story    issue
                                                  └──────┬────────────────────┘
                  回灌线: ──[ human confirms ✓ ]──→ 回到 Intent（updated intent → constraints re-extracted ↻）
```

## 元素清单

| 区域 | 内容 | 颜色 |
|---|---|---|
| 顶带 | **Intent**（副标：carried by ADRs · specs · stories · requirement docs — linked to business drivers）→ extract → **Constraints**（addressable · stable IDs） | 紫 |
| 三操作 | Conformance（on PR open + push）/ Decision Capture（on PR open）/ Drift Detection（cron · on ADR change） | 绿 |
| 中间产物 | Report（typed PR review, advisory）/ Decision Note（draft, on the PR · human triage）/ Drift report（+ decay trend per ADR） | 灰 |
| 意图更新 | Graduate → intent（architectural → ADR · behavioral → story/AC）/ Supersede → intent；旁支 Remediation issue（灰） | 紫 |
| 回灌线 | 两条紫线汇入底部回路，穿过虚线小框 **human confirms ✓**，回到 Intent 左侧；标注 `updated intent → constraints re-extracted ↻` | 紫 |
| 图例 | 紫 = intent · its updates；绿 = detection operations；灰 = intermediate artifacts | — |
| 收敛曲线带 | 红线锯齿上行 `without — divergence compounds`；青线平段+下台阶 `with — converges ≈ 0`（标注：flat = conformance 挡住新偏差；steps = drift 清存量）；脚注：capture 保证度量诚实（无未记录决策）→ aligned at every step, convergent over time → deterministic output | 红/青 |

## 关键语义决定（已按你的纠正落实）

- **A. 中心是 Intent，不是 ADR**——ADR 降级为载体之一，与 specs/stories/需求文档并列
- **B. 人只出现在收敛点**——"human confirms ✓" 是回灌路径上的一道门（意图的写回），不再是图中心的装饰
- **C. Capture 毕业分流**——architectural → ADR、behavioral → story/AC，直接体现"载体多样"
- **D. 机制与结果同屏**——上半部回答"怎么对齐"，曲线带回答"为什么收敛"

## 请你裁决的三个点

1. **Intent 载体清单**：现为 `ADRs · specs · stories · requirement docs`，要增删吗？
2. **human confirms 门**：现为底部回路上的小虚框，位置/分量合适吗？
3. **收敛曲线带**：保留在同一屏（现状），还是拆成独立一屏放大讲？
