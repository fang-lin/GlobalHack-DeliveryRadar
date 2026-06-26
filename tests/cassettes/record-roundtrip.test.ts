/**
 * Record round-trip unit test (Piece 3a — ST-0024).
 *
 * Proves that the record→finalize→cassette wiring works end-to-end without
 * spending any API: injects a MockLanguageModelV3 via the `makeRealModel`
 * parameter added in Piece 2, drives the real `cmdConformance` loop so that
 * `recordingModel`/`recordingTools` capture into the sinks, calls `finalize()`,
 * then asserts the cassette file was written and is loadable with ≥1 modelCall.
 *
 * RADAR_CASSETTE is set to "update" for the duration of the test and restored
 * in a finally block regardless of failure.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MockLanguageModelV3 } from "ai/test";
import type { LanguageModel } from "ai";
import { cassetteMode, cassetteDeps } from "./index.ts";
import { loadCassette } from "./cassette.ts";
import { cmdConformance } from "../../src/cli/commands/conformance.ts";

// A minimal valid SemanticCheckOutput JSON — aligned verdict, no tool call
// needed, so the cassette ends up with exactly 1 modelCall and 0 toolCalls.
const ALIGNED_RESPONSE = JSON.stringify({
  result: "aligned",
  confidence: 0.95,
  explanation: "Mock: no violation detected.",
  evidence_file: null,
  evidence_line_start: null,
  evidence_line_end: null,
  fix_locality: "none",
  fix_direction: null,
});

// Minimal model result shape expected by recordingModel / the AI SDK replay.
function mockModelResult() {
  return {
    content: [{ type: "text" as const, text: ALIGNED_RESPONSE }],
    finishReason: { unified: "stop" as const, raw: undefined },
    usage: { inputTokens: { total: 10 }, outputTokens: { total: 20 } },
    warnings: [],
  };
}

const FIXTURE_DIFF = new URL("../fixtures/cassette-conformance.diff", import.meta.url).pathname;
const ADR_DIR = new URL("../fixtures/adr-cassette", import.meta.url).pathname;

describe("record round-trip (mock model, zero API)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("finalize() writes a cassette that loadCassette can read back with ≥1 modelCall", async () => {
    vi.stubEnv("RADAR_CASSETTE", "update");

    // Sanity: confirm we are in a record-capable mode
    expect(cassetteMode()).toBe("update");

    const tmpDir = mkdtempSync(join(tmpdir(), "radar-rt-"));

    // Inject a MockLanguageModelV3 that returns a valid aligned response.
    const makeRealModel = (): LanguageModel =>
      new MockLanguageModelV3({
        doGenerate: async () => mockModelResult(),
      }) as unknown as LanguageModel;

    const deps = cassetteDeps("conformance", "__rt", tmpDir, makeRealModel);

    // deps should have finalize (record/update branch)
    expect(typeof deps.finalize).toBe("function");

    // Drive the real cmdConformance — recordingModel wraps makeRealModel(),
    // recordingTools wraps buildTools(root). The single ADR-0006-C1 constraint
    // fires one model call (no tool round needed for an aligned response).
    const code = await cmdConformance(
      [
        "--diff", FIXTURE_DIFF,
        "--adr-dir", ADR_DIR,
        "--root", process.cwd(),
      ],
      deps,
    );
    expect(code).toBe(0);

    // Trigger finalize to write the cassette file to tmpDir.
    deps.finalize!();

    // Now read it back and verify structure.
    const cassette = loadCassette("conformance", "__rt", tmpDir);
    expect(cassette.meta.op).toBe("conformance");
    expect(cassette.meta.case).toBe("__rt");
    expect(cassette.modelCalls.length).toBeGreaterThanOrEqual(1);

    // Each modelCall must have a 16-hex inputDigest (real digest, not "synthetic").
    for (const mc of cassette.modelCalls) {
      expect(mc.inputDigest).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});
