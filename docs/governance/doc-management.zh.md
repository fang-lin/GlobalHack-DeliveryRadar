# 项目文档管理条例

> **权威: 中文（本文件） · 翻译: 英文（`doc-management.en.md`） · 最后同步: 2026-06-12 · 两版冲突以中文为准**

本条例规定 Delivery Radar（交付雷达）项目中所有文档的语言权威性、目录结构、命名、同步与版本控制规则。

---

## 1. 语言与权威性（两层模型）

文档分为两层，权威语言不同：

### 1.1 治理/规划层 — 中文权威

适用范围：需求规格、设计 spec、实现计划、讨论记录、本条例。

- 中文版（`.zh.md`）为 source of truth；英文版（`.en.md`）为同步翻译。
- 两版冲突时，以中文版为准。

### 1.2 产品产物层 — 英文权威，不双语化

适用范围：代码、标识符、注释、ADR（含正文与机读 `constraints` 块）、semgrep 规则、commit message 中的技术标识。

- 依据需求规格 §0「产物语言」、§16 及 `FR-INT-2`：系统需要机器解析 ADR 机读块、约束 ID 与 matcher，此层 **必须为英文**，不设中文权威版，也不维护双语对照。
- ADR 全文（人类可读正文 + 机读块）均为英文，存放于 `docs/adr/`。

---

## 2. 目录结构

```
docs/
  governance/      治理文档（本条例等）。双语，中文权威。
  requirements/    需求规格。双语，中文权威。
  specs/           设计 spec（brainstorming 产出）。中文权威。
  plans/           实现计划（writing-plans 产出）。中文权威。
  adr/             ADR。英文单语（产品产物层）。
```

说明：设计 spec 不使用工具默认的 `docs/superpowers/specs/` 路径，统一收敛到 `docs/specs/`。

---

## 3. 命名约定

| 类型 | 规则 | 示例 |
|------|------|------|
| 双语文档 | 语言后缀：`<name>.zh.md`（权威）/ `<name>.en.md`（翻译） | `doc-management.zh.md` |
| ADR | `ADR-<NNN>-<slug>.md`，无语言后缀 | `ADR-014-inventory-eventual-consistency.md` |
| 设计 spec | `YYYY-MM-DD-<topic>-design.zh.md` | `2026-06-15-extraction-core-design.zh.md` |
| 实现计划 | `YYYY-MM-DD-<topic>-plan.zh.md` | `2026-06-16-extraction-core-plan.zh.md` |

---

## 4. 双语横幅（banner）

每份双语文档的标题之后必须紧跟一行横幅：

```markdown
> **权威: 中文（本文件） · 翻译: 英文（`<name>.en.md`） · 最后同步: <YYYY-MM-DD> · 两版冲突以中文为准**
```

英文版对应横幅：

```markdown
> **Authoritative version: Chinese (`<name>.zh.md`) · This file: synchronized English translation · Last synced: <YYYY-MM-DD> · On conflict, the Chinese version prevails.**
```

翻译暂时滞后时，在横幅追加「翻译待更新 / translation pending」。

---

## 5. 变更与同步流程

1. 先修改中文权威版。
2. **同一次提交内**同步更新英文翻译版，并刷新两边横幅的「最后同步」日期。
3. 不允许只改一边就 merge；确有特殊情况需暂缓翻译时，必须在横幅标注「翻译待更新」，并在下一次提交补齐。

---

## 6. 翻译规则

翻译只译散文，以下内容在两版间保持逐字一致：

- 所有需求 ID（`FR-*`、`NFR-*`、`DM-*`、`AC-*`）；
- 代码块、YAML 块、ASCII 图；
- 文件路径、API 名称、字段名、枚举值（如 `advisory`、`gate`、`aligned`）等技术标识符；
- 规范性关键词 MUST / SHOULD / MAY 保留英文原文（必要时括注中文）。

首次出现的关键术语采用「中文（English）」对照写法，如：约束（Constraint）、裁定（Verdict）、决策笔记（Decision Note）。

---

## 7. 版本控制

- 所有文档纳入 git 版本管理；docs 即事实来源，不在 git 之外维护副本。
- ADR 仅通过取代（supersession）演进，不就地改写历史决策（见需求规格 §2）。
- 治理/规划层文档可以就地修订，但实质性的方向变更应在文档中留下变更记录或通过 git 历史可追溯。

---

*条例完。*
