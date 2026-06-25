import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cassetteMode, cassetteDeps } from "./index.ts";
import { saveCassette, type Cassette } from "./cassette.ts";

describe("cassetteMode", () => {
  it("defaults to replay when RADAR_CASSETTE is unset", () => {
    const prev = process.env.RADAR_CASSETTE;
    delete process.env.RADAR_CASSETTE;
    try { expect(cassetteMode()).toBe("replay"); } finally { if (prev) process.env.RADAR_CASSETTE = prev; }
  });
});

describe("cassetteDeps (replay)", () => {
  it("builds replay model + tools + mismatches from a saved cassette, no finalize", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-deps-"));
    const c: Cassette = {
      meta: { op: "conformance", case: "aligned", recordedAt: "2026-06-25", model: "synthetic", jsonMode: "json_object" },
      modelCalls: [{ inputDigest: "synthetic", result: { content: [{ type: "text", text: "{}" }], finishReason: { unified: "stop", raw: undefined }, usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [] } }],
      toolCalls: [],
    };
    saveCassette(c, dir);
    const deps = cassetteDeps("conformance", "aligned", dir);
    expect(typeof deps.makeModel).toBe("function");
    expect(typeof deps.makeTools).toBe("function");
    expect(deps.mismatches).toEqual([]);
    expect(deps.finalize).toBeUndefined();
  });
});
