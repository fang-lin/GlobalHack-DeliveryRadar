import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdCapture } from "../../src/cli/commands/capture.ts";

describe("radar capture --replay (no network)", () => {
  it("renders saved notes to stdout", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-cap-"));
    const notes = join(dir, "notes.json");
    writeFileSync(notes, JSON.stringify([{
      detected_decision: "orders calls inventory over direct HTTP",
      evidence: [{ file: "a.ts", lines: [1, 2] }], suggested_class: "architectural",
      draft_rationale: "r", confidence: 0.8, why_net_new: "n",
    }]));
    const diff = join(dir, "pr.diff");
    writeFileSync(diff, "diff --git a/a.ts b/a.ts\n");
    const log: string[] = [];
    const orig = console.log;
    console.log = (s?: unknown) => { log.push(String(s)); };
    try {
      const code = await cmdCapture(["--diff", diff, "--adr-dir", "docs/adr", "--replay", notes]);
      expect(code).toBe(0);
    } finally { console.log = orig; }
    expect(log.join("\n")).toContain("orders calls inventory over direct HTTP");
  });
});
