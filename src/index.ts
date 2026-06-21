/**
 * Delivery Radar — public library API (⚠️ EXPERIMENTAL / UNSTABLE).
 *
 * Exported for programmatic use, but NOT yet a frozen, SemVer-guaranteed
 * contract (ADR-0008): this surface may change between releases until a stable
 * API is declared. The supported entry point today is the `radar` CLI.
 */

// --- model layer (ADR-0007) ---
export { makeModelClient, DEFAULT_MODEL, type ModelClient } from "./llm.js";

// --- core engine (pure) ---
export { checkConstraint } from "./core/checker.js";
export { retrieve } from "./core/retrieve.js";
export { reviewMarkdown } from "./core/comment.js";

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
} from "./core/models.js";

// --- I/O helpers (read inputs at the edge) ---
export { extractFromDir, extractFromText, adrSection } from "./io/extract.js";
export { loadDiff, parseUnifiedDiff, type FileDiff } from "./io/diff.js";
export { saveVerdicts, loadVerdicts } from "./io/verdicts.js";
