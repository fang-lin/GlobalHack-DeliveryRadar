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

/** Formats the evidence references as a comma-separated inline string, or "—". */
function evidenceString(note: DecisionNote): string {
  const ev = note.evidence
    .filter((e) => e.lines.length > 0)
    .map((e) => `\`${e.file}\` L${e.lines[0]}–L${e.lines[1] ?? e.lines[0]}`)
    .join(", ");
  return ev || "—";
}

export function decisionNoteMarkdown(note: DecisionNote): string {
  // All fields are always present (no optional sections), so this reads as the
  // output: blank lines in the source are the blank lines in the markdown.
  return `### 🟡 Possible undocumented decision — ${note.suggested_class}

**Decision:** ${note.detected_decision}

**Why it looks net-new:** ${note.why_net_new}

**Rationale (draft):** ${note.draft_rationale}

**Evidence:** ${evidenceString(note)}

confidence **${note.confidence.toFixed(2)}**`;
}

export function decisionNotesMarkdown(notes: DecisionNote[]): string {
  if (notes.length === 0) {
    const nothingFlagged =
      "✅ **No undocumented decisions detected** — this merge introduces no " +
      "architecturally-significant decision that isn't already recorded.";
    return `${HEADER}\n\n${nothingFlagged}\n\n${ADVISORY}`;
  }
  // Each note card is followed by \n\n---\n\n (matching original push-then-join structure).
  const body = notes.map((n) => `${decisionNoteMarkdown(n)}\n\n---\n\n`).join("");
  return `${HEADER}\n\n${body}${ADVISORY}`;
}
