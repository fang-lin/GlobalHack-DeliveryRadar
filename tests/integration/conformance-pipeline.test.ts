import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "../../src/cli/commands/conformance.ts";

describe("radar conformance --replay (no network)", () => {
  it("renders saved verdicts to stdout and returns 0", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-conf-"));

    // Write a pre-baked verdicts file
    const verdicts = join(dir, "verdicts.json");
    writeFileSync(verdicts, JSON.stringify([
      {
        constraint_id: "ADR-001-C1",
        result: "violated",
        confidence: 0.85,
        evidence: { adr_clause: "ADR-001-C1", code: null },
        explanation: "the diff bypasses the recorded constraint",
        fix_locality: "structural",
        fix_direction: "align with the ADR intent",
      },
    ]));

    // Write a minimal diff so loadDiff has something to parse
    const diff = join(dir, "pr.diff");
    writeFileSync(diff, "diff --git a/src/x.ts b/src/x.ts\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1 +1 @@\n+changed\n");

    const log: string[] = [];
    const orig = console.log;
    console.log = (s?: unknown) => { log.push(String(s)); };
    let code: number;
    try {
      code = await cmdConformance([
        "--diff", diff,
        "--adr-dir", "docs/adr",
        "--replay", verdicts,
      ]);
    } finally {
      console.log = orig;
    }

    expect(code).toBe(0);
    const out = log.join("\n");
    expect(out).toContain("ADR-001-C1");
    expect(out).toContain("violated");
  });
});
