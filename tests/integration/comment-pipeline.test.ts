import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdComment } from "../../src/cli/commands/comment.ts";

describe("radar comment (no network)", () => {
  it("renders review markdown to stdout and returns 0", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-comment-"));

    // Write a pre-baked verdicts file using the real ADR-0006-C1 constraint id
    const verdicts = join(dir, "verdicts.json");
    writeFileSync(
      verdicts,
      JSON.stringify([
        {
          constraint_id: "ADR-0006-C1",
          result: "violated",
          confidence: 0.9,
          evidence: { adr_clause: "ADR-0006-C1", code: null },
          explanation: "the diff adds a direct call to the GitHub API in core/checker.ts",
          fix_locality: "structural",
          fix_direction: "move the GitHub call into an io/ adapter",
        },
      ]),
    );

    const log: string[] = [];
    const origLog = console.log;
    console.log = (s?: unknown) => {
      log.push(String(s ?? ""));
    };
    let code: number;
    try {
      code = await cmdComment([
        "--verdicts", verdicts,
        "--adr-dir", "docs/adr",
      ]);
    } finally {
      console.log = origLog;
    }

    expect(code).toBe(0);
    const out = log.join("\n");
    // Header must be present
    expect(out).toContain("Delivery Radar — Architecture Conformance");
    // The violated constraint id must appear
    expect(out).toContain("ADR-0006-C1");
    // The VIOLATED badge must appear
    expect(out).toContain("VIOLATED");
  });
});
