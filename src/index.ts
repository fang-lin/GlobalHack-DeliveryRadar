/**
 * Delivery Radar — public library API (⚠️ EXPERIMENTAL / UNSTABLE).
 *
 * Exported for programmatic use, but NOT yet a frozen, SemVer-guaranteed
 * contract (ADR-0008): this surface may change between releases until a stable
 * API is declared. The supported entry point today is the `radar` CLI.
 */

// --- model layer (ADR-0007) ---
export { makeModelClient, DEFAULT_MODEL, type ModelClient } from "./llm.ts";

// --- core engine (pure) ---
export { buildUserPrompt, toVerdict } from "./core/checker.ts";
export { retrieve } from "./core/retrieve.ts";
export { reviewMarkdown } from "./core/comment.ts";

// --- domain contracts ---
export {
  validateConstraint,
  ConstraintSchema,
  VerdictSchema,
  SemanticCheckOutputSchema,
  type Constraint,
  type Verdict,
  type Evidence,
  type SemanticCheckOutput,
} from "./core/models.ts";

// --- I/O helpers (read inputs at the edge) ---
export { extractFromDir, extractFromText, adrSection } from "./io/extract.ts";
export { loadDiff, parseUnifiedDiff, type FileDiff } from "./io/diff.ts";
export { saveVerdicts, loadVerdicts } from "./io/verdicts.ts";
