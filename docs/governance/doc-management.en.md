# Project Documentation Management Policy

> **Authoritative version: Chinese (`doc-management.zh.md`) · This file: synchronized English translation · Last synced: 2026-06-12 · On conflict, the Chinese version prevails.**

This policy governs language authority, directory structure, naming, synchronization, and version control for all documentation in the Delivery Radar project.

---

## 1. Language and Authority (Two-Layer Model)

Documents fall into two layers with different authoritative languages:

### 1.1 Governance/Planning Layer — Chinese Authoritative

Scope: requirements specifications, design specs, implementation plans, discussion notes, this policy.

- The Chinese version (`.zh.md`) is the source of truth; the English version (`.en.md`) is a synchronized translation.
- On conflict, the Chinese version prevails.

### 1.2 Product Artifact Layer — English Authoritative, Not Bilingual

Scope: code, identifiers, comments, ADRs (both human-readable body and machine-readable `constraints` block), semgrep rules, technical identifiers in commit messages.

- Per requirements spec §0 "Language of artifacts", §16, and `FR-INT-2`: the system machine-parses ADR constraint blocks, constraint IDs, and matchers, so this layer **must be English**. No Chinese authoritative version and no bilingual mirror is maintained.
- ADRs are entirely in English (human-readable body + machine block), stored in `docs/adr/`.

---

## 2. Directory Structure

```
docs/
  governance/      policy docs — bilingual, zh authoritative
  requirements/    requirement specs — bilingual, zh authoritative
  specs/           design specs — bilingual, zh authoritative
  plans/           implementation plans — bilingual, zh authoritative
  video/           showcase scripts & diagram notes — bilingual, zh authoritative
  adr/             ADRs — English only (product artifact layer)
```

Note: design specs do not use the tool-default `docs/superpowers/specs/` path; they are consolidated under `docs/specs/`.

---

## 3. Naming Conventions

| Type | Rule | Example |
|------|------|---------|
| Bilingual document | Language suffix: `<name>.zh.md` (authoritative) / `<name>.en.md` (translation) | `doc-management.zh.md` |
| ADR | `ADR-<NNN>-<slug>.md`, no language suffix | `ADR-014-inventory-eventual-consistency.md` |
| Design spec | `YYYY-MM-DD-<topic>-design.zh.md` | `2026-06-15-extraction-core-design.zh.md` |
| Implementation plan | `YYYY-MM-DD-<topic>-plan.zh.md` | `2026-06-16-extraction-core-plan.zh.md` |

---

## 4. Bilingual Banner

Every bilingual document must carry a banner immediately after its title:

```markdown
> **权威: 中文（本文件） · 翻译: 英文（`<name>.en.md`） · 最后同步: <YYYY-MM-DD> · 两版冲突以中文为准**
```

Corresponding banner for the English version:

```markdown
> **Authoritative version: Chinese (`<name>.zh.md`) · This file: synchronized English translation · Last synced: <YYYY-MM-DD> · On conflict, the Chinese version prevails.**
```

When the translation temporarily lags, append "翻译待更新 / translation pending" to the banner.

---

## 5. Change and Synchronization Process

1. Modify the Chinese authoritative version first.
2. Update the English translation **in the same commit**, refreshing the "last synced" date in both banners.
3. Merging one side alone is not allowed; if translation must exceptionally be deferred, the banner must be marked "translation pending" and the translation completed in the next commit.

---

## 6. Translation Rules

Only prose is translated. The following stay byte-identical across both versions:

- All requirement IDs (`FR-*`, `NFR-*`, `DM-*`, `AC-*`);
- Code blocks, YAML blocks, ASCII diagrams;
- File paths, API names, field names, enum values (e.g. `advisory`, `gate`, `aligned`) and other technical identifiers;
- Normative keywords MUST / SHOULD / MAY remain in English (with Chinese gloss where needed).

Key terms on first occurrence use the "中文（English）" paired form, e.g.: 约束（Constraint）, 裁定（Verdict）, 决策笔记（Decision Note）.

---

## 7. Version Control

- All documents are under git version control; docs are the source of truth — no copies maintained outside git.
- ADRs evolve only by supersession; historical decisions are never edited in place (see requirements spec §2).
- Governance/planning documents may be revised in place, but substantive changes of direction should leave a change record in the document or be traceable through git history.

---

*End of policy.*
