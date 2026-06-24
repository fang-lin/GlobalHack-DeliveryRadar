/**
 * Semantic conformance checker — pure functions only (ADR-0006 / ADR-0010).
 *
 * `buildUserPrompt` assembles the user turn for the conformance agent.
 * `toVerdict` maps the agent's structured output to a DM-VERDICT.
 * No SDK, no port, no I/O — this file stays in the pure core.
 */
import { type Constraint, type Verdict, type SemanticCheckOutput } from "./models.ts";
import type { FileDiff } from "../io/diff.ts";

export function buildUserPrompt(
  constraint: Constraint,
  diffs: FileDiff[],
  driverContext = "",
): string {
  const examples = constraint.check.examples;
  const parts = [
    `## Constraint ${constraint.id} (from ${constraint.adr})`,
    `Title: ${constraint.title}`,
    `Polarity: ${constraint.polarity}`,
    `Rule: ${constraint.rule.trim()}`,
  ];
  if (constraint.driver) parts.push(`Business driver: ${constraint.driver}`);
  if (driverContext) parts.push(`Driver rationale (ADR Context section):\n${driverContext}`);
  if (examples && ((examples.compliant?.length ?? 0) || (examples.violating?.length ?? 0))) {
    parts.push(
      "Examples of compliant code patterns: " +
        JSON.stringify(examples.compliant ?? []) +
        "\nExamples of violating code patterns: " +
        JSON.stringify(examples.violating ?? []),
    );
  }
  const diffText = diffs.map((fd) => fd.text).join("\n\n");
  parts.push(`## Pull-request diff (in-scope files only)\n\`\`\`diff\n${diffText}\n\`\`\``);
  parts.push("Evaluate the diff against this single constraint and return the verdict.");
  return parts.join("\n\n");
}

/** Pure: map the model's structured output to a DM-VERDICT for one constraint. */
export function toVerdict(constraint: Constraint, out: SemanticCheckOutput): Verdict {
  let code = null;
  if (out.evidence_file && out.evidence_line_start != null) {
    const end = out.evidence_line_end ?? out.evidence_line_start;
    code = { file: out.evidence_file, lines: [out.evidence_line_start, end] };
  }
  return {
    constraint_id: constraint.id,
    result: out.result,
    confidence: Math.max(0, Math.min(1, out.confidence)),
    evidence: { adr_clause: constraint.id, code },
    explanation: out.explanation,
    fix_locality: out.fix_locality,
    fix_direction: out.fix_direction,
  };
}
