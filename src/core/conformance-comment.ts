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
  const lines = [
    `### ${badge} — ${constraint.title}`,
    "",
    `${adrLink(constraint)} · severity **${constraint.severity}** · ` +
      `confidence **${verdict.confidence.toFixed(2)}**`,
    "",
    `> **Rule:** ${constraint.rule.trim()}`,
  ];
  if (constraint.driver) {
    const quote = rationaleQuote(driverContext, constraint.driver);
    lines.push(">");
    if (quote) {
      lines.push(
        `> **Why this rule exists** (driver \`${constraint.driver}\`, ` +
          `from ${constraint.adr}): ${quote}`,
      );
    } else {
      lines.push(
        `> **Why this rule exists**: see driver \`${constraint.driver}\` ` +
          `in ${constraint.adr} — violating it defeats the reason, not just the letter.`,
      );
    }
  }
  if (verdict.evidence.code) {
    const c = verdict.evidence.code;
    lines.push("", `**Evidence:** \`${c.file}\` L${c.lines[0]}–L${c.lines[1]}`);
  }
  lines.push("", `**Explanation:** ${verdict.explanation}`);
  if (verdict.fix_direction) lines.push("", `**Direction:** ${verdict.fix_direction}`);
  return lines.join("\n");
}

export function reviewMarkdown(
  verdicts: Verdict[],
  constraints: Constraint[],
  driverContexts: Record<string, string> = {},
): string {
  const byId = new Map(constraints.map((c) => [c.id, c]));
  const blocks = [HEADER, ""];
  const ordered = [...verdicts].sort((a, b) => {
    const av = a.result !== "violated" ? 1 : 0;
    const bv = b.result !== "violated" ? 1 : 0;
    return av - bv || b.confidence - a.confidence;
  });
  let rendered = 0;
  for (const v of ordered) {
    const constraint = byId.get(v.constraint_id);
    if (!constraint) continue;
    blocks.push(
      verdictMarkdown(v, constraint, driverContexts[constraint.adr] ?? ""),
      "",
      "---",
      "",
    );
    rendered++;
  }
  if (rendered === 0) {
    // No verdicts to show — make "nothing flagged" explicit, rather than leaving a
    // bare header that reads like the check failed (FR-CONF-7 / NFR-EXPLAIN-1).
    blocks.push(
      "✅ **Nothing flagged** — the changed files raise no architecture-conformance " +
        "issues against the recorded intent.",
      "",
    );
  }
  blocks.push(
    "_Advisory — this check does not block your merge. The recorded intent " +
      "behind the cited ADR is the source of truth; react with 👍/👎 so future " +
      "checks can be calibrated._",
  );
  return blocks.join("\n");
}
