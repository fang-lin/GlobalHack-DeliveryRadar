/**
 * Decision Note projection (capture). Pure rendering: DecisionNote[] -> markdown
 * for a draft-PR / issue body. Platform-agnostic — never talks to git/gh
 * (ADR-0006). Posting is the integration layer's job.
 */
import type { DecisionNote } from "./models.ts";

const HEADER = "## 🛰️ Delivery Radar — Decision Capture";
const ADVISORY =
  "_Advisory — a draft for human triage. Merge the proposed ADR (or act on " +
  "the issue) to record it; nothing is recorded until you do._";

export function decisionNoteMarkdown(note: DecisionNote): string {
  const ev = note.evidence
    .map((e) => `\`${e.file}\` L${e.lines[0]}–L${e.lines[1] ?? e.lines[0]}`)
    .join(", ");
  return [
    `### 🟡 Possible undocumented decision — ${note.suggested_class}`,
    "",
    `**Decision:** ${note.detected_decision}`,
    "",
    `**Why it looks net-new:** ${note.why_net_new}`,
    "",
    `**Rationale (draft):** ${note.draft_rationale}`,
    "",
    `**Evidence:** ${ev || "—"}`,
    "",
    `confidence **${note.confidence.toFixed(2)}**`,
  ].join("\n");
}

export function decisionNotesMarkdown(notes: DecisionNote[]): string {
  const blocks = [HEADER, ""];
  if (notes.length === 0) {
    blocks.push(
      "✅ **No undocumented decisions detected** — this merge introduces no " +
        "architecturally-significant decision that isn't already recorded.",
      "",
    );
  } else {
    for (const n of notes) blocks.push(decisionNoteMarkdown(n), "", "---", "");
  }
  blocks.push(ADVISORY);
  return blocks.join("\n");
}
