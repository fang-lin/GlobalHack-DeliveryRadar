import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractFromDir } from "../../src/io/extract.ts";
import { loadDiff } from "../../src/io/diff.ts";
import { retrieve } from "../../src/core/retrieve.ts";
import { toVerdict } from "../../src/core/checker.ts";
import { reviewMarkdown } from "../../src/core/comment.ts";
import type { Verdict } from "../../src/core/models.ts";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

// A simulated SemanticCheckOutput — exercises the WHOLE pipeline (extract →
// retrieve → toVerdict → render) with no network and no key. This is the
// integration seam the unit tests don't cover: the modules wired together end-to-end.
const fakeOut = {
  result: "violated" as const,
  confidence: 0.9,
  explanation: "honors the letter but defeats the recorded intent",
  evidence_file: "src/x.ts",
  evidence_line_start: 1,
  evidence_line_end: 2,
  fix_locality: "structural" as const,
  fix_direction: "follow the ADR's intent",
};

describe("integration: extract → retrieve → toVerdict → render (no network)", () => {
  it("flags an in-scope violating diff end-to-end", () => {
    const constraints = extractFromDir(FIXTURES);
    expect(constraints.length).toBeGreaterThan(0);

    const diffs = loadDiff(join(FIXTURES, "pr-violating.diff"));
    const inScope = retrieve(constraints, diffs);
    expect(inScope.length).toBeGreaterThan(0);

    const verdicts: Verdict[] = [];
    for (const [constraint] of inScope) {
      verdicts.push(toVerdict(constraint, fakeOut));
    }

    const md = reviewMarkdown(verdicts, constraints);
    expect(md).toContain("🛰️ Delivery Radar");
    expect(md).toContain("VIOLATED");
  });
});
