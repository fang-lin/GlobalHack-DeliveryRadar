/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { tool } from "ai";
import * as z from "zod/v4";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "./conformance.ts";

describe("cmdConformance dependency injection", () => {
  it("uses injected model + tools instead of selectModel/buildTools", async () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-di-"));
    const diff = join(dir, "pr.diff");
    // a diff touching src/core so retrieval fires ADR-0006-C1
    writeFileSync(diff, "diff --git a/src/core/x.ts b/src/core/x.ts\n--- a/src/core/x.ts\n+++ b/src/core/x.ts\n@@ -1 +1 @@\n+import {execSync} from 'child_process'\n");
    let makeToolsCalled = false;
    const code = await cmdConformance(
      ["--diff", diff, "--adr-dir", "docs/adr", "--root", process.cwd()],
      {
        makeModel: () => new MockLanguageModelV3({ doGenerate: async () => ({
          content: [{ type: "text", text: JSON.stringify({ result: "aligned", confidence: 0.9, explanation: "ok", evidence_file: null, evidence_line_start: null, evidence_line_end: null, fix_locality: "none", fix_direction: "" }) }],
          finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
        }) }) as any,
        makeTools: () => { makeToolsCalled = true; return { grep: tool({ description: "x", inputSchema: z.any(), execute: async () => "x" }) }; },
      },
    );
    expect(code).toBe(0);
    expect(makeToolsCalled).toBe(true);
  });
});
