/**
 * Semantic conformance checker (FR-CONF-4..6).
 *
 * Each semantic constraint is evaluated by Claude grounded with the constraint
 * rule, the business driver rationale, and the few-shot examples (FR-CONF-5).
 * `unknown` is a first-class result: the model is explicitly instructed to emit
 * it rather than guess when evidence is insufficient (FR-CONF-6).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { parse as parsePath, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  SemanticCheckOutputSchema,
  VerdictSchema,
  type Constraint,
  type Verdict,
} from "./models.js";
import type { FileDiff } from "./diff.js";

// Hackathon workspace policy: Opus-tier models are blocked (0 RPM); Sonnet is
// the strongest permitted model.
export const DEFAULT_MODEL = "claude-sonnet-4-6";

const SYSTEM = `You are the conformance checker of Delivery Radar, an \
intent-implementation governance engine. You evaluate whether a pull-request \
diff conforms to ONE architectural constraint extracted from an Architecture \
Decision Record (ADR).

Judge the diff against both the LETTER of the rule and the REASON behind it \
(the business driver). A change can honor the letter while defeating the \
reason — that is a violation.

Rules of judgement:
- Only judge what the diff shows. Do not invent code that is not present.
- If the evidence is insufficient to decide, emit result "unknown" with a low \
confidence. Never guess.
- "aligned" means the changed code is compatible with the constraint.
- Evidence lines refer to the post-change file (the "+" side of the diff).
- fix_locality: "local" if a small in-place edit fixes it, "structural" if the \
fix requires changing the approach, "none" if no fix is needed.
- fix_direction: one or two sentences pointing at the direction of the \
required change (cite the ADR's intent), or null when result is "aligned".
- Keep explanation to one or two sentences.`;

/**
 * Minimal .env loader: sets ANTHROPIC_API_KEY from the nearest .env if the
 * variable is not already set. No third-party dependency.
 */
function loadDotenv(start?: string): void {
  if (process.env.ANTHROPIC_API_KEY) return;
  let dir = start ?? process.cwd();
  const root = parsePath(dir).root;
  while (true) {
    const envFile = join(dir, ".env");
    if (existsSync(envFile)) {
      for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith("ANTHROPIC_API_KEY=")) {
          process.env.ANTHROPIC_API_KEY = line.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^"|"$/g, "");
          return;
        }
      }
    }
    if (dir === root) break;
    dir = parsePath(dir).dir;
  }
}

export function makeClient(): Anthropic {
  loadDotenv();
  return new Anthropic();
}

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

export async function checkConstraint(
  client: Anthropic,
  constraint: Constraint,
  diffs: FileDiff[],
  driverContext = "",
  model: string = DEFAULT_MODEL,
): Promise<Verdict> {
  const response = await client.messages.parse({
    model,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [{ role: "user", content: buildUserPrompt(constraint, diffs, driverContext) }],
    output_config: { format: zodOutputFormat(SemanticCheckOutputSchema) },
  });
  if (response.parsed_output == null) {
    throw new Error(`${constraint.id}: model returned no structured verdict`);
  }
  const out = SemanticCheckOutputSchema.parse(response.parsed_output);
  let code = null;
  if (out.evidence_file && out.evidence_line_start != null) {
    const end = out.evidence_line_end ?? out.evidence_line_start;
    code = { file: out.evidence_file, lines: [out.evidence_line_start, end] };
  }
  return {
    constraint_id: constraint.id,
    result: out.result,
    confidence: Math.max(0.0, Math.min(1.0, out.confidence)),
    evidence: { adr_clause: constraint.id, code },
    explanation: out.explanation,
    fix_locality: out.fix_locality,
    fix_direction: out.fix_direction,
  };
}

export function saveVerdicts(verdicts: Verdict[], path: string): void {
  writeFileSync(path, JSON.stringify(verdicts, null, 2));
}

export function loadVerdicts(path: string): Verdict[] {
  const data = JSON.parse(readFileSync(path, "utf8")) as unknown[];
  return data.map((v) => VerdictSchema.parse(v));
}
