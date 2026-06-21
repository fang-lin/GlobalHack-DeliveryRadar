/**
 * Shared data contracts.
 *
 * The Constraint (DM-CONSTRAINT) is the single shared contract all operations
 * read and write; the Verdict (DM-VERDICT) is the single result shape. Do not
 * fork these per operation (requirements spec §0, §3.2).
 */
import * as z from "zod/v4";

export const Polarity = z.enum(["requirement", "prohibition"]);
export const CheckType = z.enum(["semantic", "deterministic"]);
export const Enforce = z.enum(["advisory", "gate"]);
export const Severity = z.enum(["low", "medium", "high"]);
export const ConstraintStatus = z.enum(["active", "superseded"]);
/** `unknown` is a first-class result — never guess (FR-CONF-6). */
export const VerdictResult = z.enum(["aligned", "violated", "unknown"]);
export const FixLocality = z.enum(["local", "structural", "none"]);

export const ExamplesSchema = z.object({
  compliant: z.array(z.string()).default([]),
  violating: z.array(z.string()).default([]),
});

export const CheckSpecSchema = z.object({
  type: CheckType,
  matcher: z.string().nullish(), // semgrep/AST/regex rule for deterministic checks
  examples: ExamplesSchema.nullish(), // few-shot anchors for the semantic checker
});

export const ScopeSchema = z.object({
  paths: z.array(z.string()), // drives retrieval — NFR-RETRIEVAL-1
  layers: z.array(z.string()).nullish(),
});

/** Raw shape parsed from the ADR constraints block (before invariant checks). */
export const ConstraintSchema = z.object({
  id: z.string(),
  adr: z.string(),
  title: z.string(),
  rule: z.string(),
  polarity: Polarity,
  driver: z.string().nullish(), // link to business rationale (epic/story/PRD)
  scope: ScopeSchema,
  check: CheckSpecSchema,
  enforce: Enforce.default("advisory"), // advisory is the default (NFR-GATE-1)
  severity: Severity,
  status: ConstraintStatus.default("active"),
  superseded_by: z.string().nullish(),
});

export type Constraint = z.infer<typeof ConstraintSchema>;

/**
 * Validate one raw constraint object: parse the shape, then enforce the two
 * invariants that Pydantic enforced as model validators. Throws Error whose
 * message contains the requirement id (callers/tests match on that).
 */
export function validateConstraint(raw: unknown): Constraint {
  const c = ConstraintSchema.parse(raw);

  // DM-CONSTRAINT-1: enforce=gate is only permitted for deterministic checks.
  if (c.enforce === "gate" && c.check.type !== "deterministic") {
    throw new Error(
      `${c.id}: DM-CONSTRAINT-1 violated — enforce=gate requires ` +
        `check.type=deterministic (got ${c.check.type})`,
    );
  }
  // DM-CONSTRAINT-2: stable id derived from ADR number + ordinal (ADR-NNN-Cn).
  const idPattern = new RegExp(`^${escapeRegExp(c.adr)}-C\\d+$`);
  if (!idPattern.test(c.id)) {
    throw new Error(
      `${c.id}: DM-CONSTRAINT-2 violated — id must be <adr>-C<ordinal> ` +
        `derived from adr=${c.adr}`,
    );
  }
  return c;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const CodeEvidenceSchema = z.object({
  file: z.string(),
  lines: z.array(z.number()), // [start, end] in the post-change file
});
export type CodeEvidence = z.infer<typeof CodeEvidenceSchema>;

export const EvidenceSchema = z.object({
  adr_clause: z.string(), // the constraint id — links verdict back to recorded intent
  code: CodeEvidenceSchema.nullish(),
});
export type Evidence = z.infer<typeof EvidenceSchema>;

/**
 * DM-VERDICT. `fix_direction` extends the spec shape to carry the
 * 'direction of the required change' that FR-CONF-7 requires structural
 * comments to cite.
 */
export const VerdictSchema = z.object({
  constraint_id: z.string(),
  result: VerdictResult,
  confidence: z.number(),
  evidence: EvidenceSchema,
  explanation: z.string(),
  fix_locality: FixLocality,
  fix_direction: z.string().nullish(),
});
export type Verdict = z.infer<typeof VerdictSchema>;

/**
 * Structured output the semantic checker requests from the model for ONE
 * constraint. The caller fills in constraint_id/adr_clause (FR-CONF-4).
 * Optionals are nullable (not absent) so the strict structured-output schema
 * always returns them.
 */
export const SemanticCheckOutputSchema = z.object({
  result: VerdictResult,
  confidence: z.number(),
  explanation: z.string(),
  evidence_file: z.string().nullable(),
  evidence_line_start: z.number().nullable(),
  evidence_line_end: z.number().nullable(),
  fix_locality: FixLocality,
  fix_direction: z.string().nullable(),
});
export type SemanticCheckOutput = z.infer<typeof SemanticCheckOutputSchema>;
