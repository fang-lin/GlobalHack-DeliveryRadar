/**
 * Scope-first constraint retrieval (NFR-RETRIEVAL-1).
 *
 * Only constraints whose scope.paths match the changed files are evaluated.
 * Over-retrieval is the primary cause of false positives and is treated as a
 * defect; path matching is primary, semantic similarity would only ever be a
 * secondary signal (not implemented in this slice).
 */
import type { Constraint } from "./models.js";
import type { FileDiff } from "../io/diff.js";

/**
 * Translate a path glob with ** support into a RegExp.
 * `**` matches across directory separators, `*`/`?` do not.
 */
export function globToRegex(pattern: string): RegExp {
  const out: string[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern.slice(i, i + 2) === "**") {
        out.push(".*");
        i += 2;
        if (i < pattern.length && pattern[i] === "/") i += 1; // "**/" already covered
        continue;
      }
      out.push("[^/]*");
    } else if (ch === "?") {
      out.push("[^/]");
    } else {
      out.push(ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    }
    i += 1;
  }
  return new RegExp("^" + out.join("") + "$");
}

export function inScope(constraint: Constraint, path: string): boolean {
  return constraint.scope.paths.some((p) => globToRegex(p).test(path));
}

/** Return [constraint, matching file diffs] pairs for active, in-scope constraints only. */
export function retrieve(
  constraints: Constraint[],
  fileDiffs: FileDiff[],
): Array<[Constraint, FileDiff[]]> {
  const result: Array<[Constraint, FileDiff[]]> = [];
  for (const c of constraints) {
    if (c.status !== "active") continue;
    const matching = fileDiffs.filter((fd) => inScope(c, fd.path));
    if (matching.length > 0) result.push([c, matching]);
  }
  return result;
}
