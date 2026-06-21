import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractFromDir } from "../../src/io/extract.js";
import { loadDiff } from "../../src/io/diff.js";
import { retrieve } from "../../src/core/retrieve.js";
import { checkConstraint } from "../../src/core/checker.js";
import { reviewMarkdown } from "../../src/core/comment.js";
import type { ModelClient } from "../../src/llm.js";
import type { Verdict } from "../../src/core/models.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

// A fake ModelClient — exercises the WHOLE pipeline (extract → retrieve → check →
// render) with no network and no key. This is the integration seam the unit tests
// don't cover: the modules wired together end-to-end.
const fakeClient = {
  complete: async () => ({
    result: "violated",
    confidence: 0.9,
    explanation: "honors the letter but defeats the recorded intent",
    evidence_file: "src/x.ts",
    evidence_line_start: 1,
    evidence_line_end: 2,
    fix_locality: "structural",
    fix_direction: "follow the ADR's intent",
  }),
} as unknown as ModelClient;

describe("integration: extract → retrieve → check → render (no network)", () => {
  it("flags an in-scope violating diff end-to-end", async () => {
    const constraints = extractFromDir(FIXTURES);
    expect(constraints.length).toBeGreaterThan(0);

    const diffs = loadDiff(join(FIXTURES, "pr-violating.diff"));
    const inScope = retrieve(constraints, diffs);
    expect(inScope.length).toBeGreaterThan(0);

    const verdicts: Verdict[] = [];
    for (const [constraint, fileDiffs] of inScope) {
      verdicts.push(await checkConstraint(fakeClient, constraint, fileDiffs));
    }

    const md = reviewMarkdown(verdicts, constraints);
    expect(md).toContain("🛰️ Delivery Radar");
    expect(md).toContain("VIOLATED");
  });
});
