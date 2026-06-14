/**
 * Review projection (FR-CONF-7 — structural type, NFR-EXPLAIN-1).
 *
 * Every violated verdict carries evidence (ADR clause <-> code lines) and a
 * short explanation; the comment cites the direction of the required change and
 * stays advisory (review event COMMENT, never Request changes — NFR-GATE-1 for
 * this slice where all constraints are semantic/advisory).
 */
import { execFileSync } from "node:child_process";
import type { Constraint, Verdict } from "./models.js";

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
  for (const v of ordered) {
    const constraint = byId.get(v.constraint_id);
    if (!constraint) continue;
    blocks.push(
      verdictMarkdown(v, constraint, driverContexts[constraint.adr] ?? ""),
      "",
      "---",
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

/**
 * Post an advisory review via gh api (FR-INT-1, Reviews API).
 * Review state is COMMENT — non-blocking by default (FR-CONF-9).
 */
export function postReview(repo: string, pr: number, body: string): void {
  const payload = JSON.stringify({ event: "COMMENT", body });
  execFileSync("gh", ["api", `repos/${repo}/pulls/${pr}/reviews`, "--input", "-"], {
    input: payload,
  });
}
