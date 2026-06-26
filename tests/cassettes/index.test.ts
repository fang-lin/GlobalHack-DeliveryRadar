import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cassetteMode, cassetteDeps } from "./index.ts";
import { saveCassette, type Cassette } from "./cassette.ts";

describe("cassetteMode", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to replay when RADAR_CASSETTE is unset", () => {
    vi.stubEnv("RADAR_CASSETTE", "");
    // stubEnv sets the key to ""; cassetteMode treats any non-record/update value as "replay"
    expect(cassetteMode()).toBe("replay");
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

  it("throws a clear error when a replay cassette is missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-missing-"));
    expect(() => cassetteDeps("conformance", "nope", dir)).toThrow(/Cassette not found/);
  });
});
