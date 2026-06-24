/**
 * Review projection (FR-CONF-7 — structural type, NFR-EXPLAIN-1).
 *
 * Pure rendering: verdicts + constraints -> the review markdown. This module is
 * platform-agnostic by design — it NEVER talks to git / GitHub / gh. Posting or
 * editing the review is the integration layer's job (the workflow), so the radar
 * core stays a check/render tool that any platform adapter can drive.
 *
 * Every violated verdict carries evidence (ADR clause <-> code lines) and a
 * short explanation; the body cites the direction of the required change and
 * stays advisory (rendered as a COMMENT review, never Request changes — NFR-GATE-1
 * for this slice where all constraints are semantic/advisory).
 */
import type { Constraint, Verdict } from "./models.ts";

const HEADER = "## 🛰️ Delivery Radar — Architecture Conformance";

const ADVISORY =
  "_Advisory — this check does not block your merge. The recorded intent " +
  "behind the cited ADR is the source of truth; react with 👍/👎 so future " +
  "checks can be calibrated._";

function adrLink(constraint: Constraint): string {
  return `\`${constraint.adr}\` · constraint \`${constraint.id}\``;
}

/**
 * Pick the most driver-relevant paragraph of the ADR Context section —
 * quoting the actual business reason is the differentiator, not boilerplate.
 */
function rationaleQuote(driverContext: string, driver: string | null | undefined, limit = 420): string {
  const paragraphs = driverContext
    .split("\n\n")
    .map((p) => p.trim().replace(/\n/g, " "))
    .filter((p) => p);
  if (paragraphs.length === 0) return "";
  const chosen = paragraphs.find((p) => driver && p.includes(driver)) ?? paragraphs[0];
  if (chosen.length <= limit) return chosen;
  const cut = chosen.slice(0, limit - 1);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

/** Returns the "> Why this rule exists" block (with leading blank blockquote line), or "". */
function driverBlock(constraint: Constraint, driverContext: string): string {
  if (!constraint.driver) return "";
  const quote = rationaleQuote(driverContext, constraint.driver);
  if (quote) {
    return (
      ">\n" +
      `> **Why this rule exists** (driver \`${constraint.driver}\`, ` +
      `from ${constraint.adr}): ${quote}`
    );
  }
  return (
    ">\n" +
    `> **Why this rule exists**: see driver \`${constraint.driver}\` ` +
    `in ${constraint.adr} — violating it defeats the reason, not just the letter.`
  );
}

/** Returns the evidence line (preceded by blank line) or "". */
function evidenceLine(verdict: Verdict): string {
  if (!verdict.evidence.code) return "";
  const c = verdict.evidence.code;
  return `\n\n**Evidence:** \`${c.file}\` L${c.lines[0]}–L${c.lines[1]}`;
}

/** Returns the fix-direction line (preceded by blank line) or "". */
function fixLine(verdict: Verdict): string {
  if (!verdict.fix_direction) return "";
  return `\n\n**Direction:** ${verdict.fix_direction}`;
}

export function verdictMarkdown(
  verdict: Verdict,
  constraint: Constraint,
  driverContext = "",
): string {
  const badge = {
    violated: "🔴 **VIOLATED**",
    aligned: "🟢 **ALIGNED**",
    unknown: "⚪ **UNKNOWN**",
  }[verdict.result];

  const driver = driverBlock(constraint, driverContext);
  const driverSection = driver ? `\n${driver}` : "";

  return (
    `### ${badge} — ${constraint.title}\n` +
    `\n` +
    `${adrLink(constraint)} · severity **${constraint.severity}** · ` +
    `confidence **${verdict.confidence.toFixed(2)}**\n` +
    `\n` +
    `> **Rule:** ${constraint.rule.trim()}` +
    `${driverSection}` +
    `${evidenceLine(verdict)}\n` +
    `\n` +
    `**Explanation:** ${verdict.explanation}` +
    `${fixLine(verdict)}`
  );
}

/**
 * Joins an array of card strings with blank-line + separator + blank-line spacing,
 * with a trailing separator after the last card (matching the original push-then-join
 * structure where every card is followed by "", "---", "").
 */
function joinCards(cards: string[]): string {
  // Each card is followed by \n\n---\n\n; the last card also gets a trailing separator.
  return cards.map((c) => `${c}\n\n---\n\n`).join("");
}

export function reviewMarkdown(
  verdicts: Verdict[],
  constraints: Constraint[],
  driverContexts: Record<string, string> = {},
): string {
  const byId = new Map(constraints.map((c) => [c.id, c]));
  const ordered = [...verdicts].sort((a, b) => {
    const av = a.result !== "violated" ? 1 : 0;
    const bv = b.result !== "violated" ? 1 : 0;
    return av - bv || b.confidence - a.confidence;
  });

  const cards: string[] = [];
  for (const v of ordered) {
    const constraint = byId.get(v.constraint_id);
    if (!constraint) continue;
    cards.push(verdictMarkdown(v, constraint, driverContexts[constraint.adr] ?? ""));
  }

  const nothingFlagged =
    "✅ **Nothing flagged** — the changed files raise no architecture-conformance " +
    "issues against the recorded intent.";

  if (cards.length === 0) {
    return `${HEADER}\n\n${nothingFlagged}\n\n${ADVISORY}`;
  }
  // Cards block already ends with \n\n (from the trailing separator), so ADVISORY follows directly.
  return `${HEADER}\n\n${joinCards(cards)}${ADVISORY}`;
}
