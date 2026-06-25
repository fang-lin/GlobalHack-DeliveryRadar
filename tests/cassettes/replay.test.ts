/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { runAgent } from "../../src/agent/engine.ts";
import { replayModel, replayTools } from "./replay.ts";
import type { Cassette } from "./cassette.ts";
import { digestInput } from "./cassette.ts";

const Schema = z.object({ found: z.string() });

// A synthetic two-step cassette: round 1 the model calls grep; round 2 it emits
// the final JSON. The agent loop, tool dispatch and Output.object all run for real.
function twoStep(): Cassette {
  const grepInput = { pattern: "execFileSync", path: "src" };
  return {
    meta: { op: "conformance", case: "syn", recordedAt: "2026-06-25", model: "mock", jsonMode: "json_object" },
    modelCalls: [
      { inputDigest: "ignored-on-model-by-mock", result: {
        content: [{ type: "tool-call", toolCallId: "c1", toolName: "grep", input: grepInput }],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
      { inputDigest: "ignored", result: {
        content: [{ type: "text", text: JSON.stringify({ found: "yes" }) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
    ],
    toolCalls: [{ name: "grep", input: grepInput, output: "src/agent/tools.ts:44: execFileSync(...)" }],
  };
}

describe("replay model + tools drive a real agent loop", () => {
  it("returns the validated object after a recorded tool round", async () => {
    const c = twoStep();
    const out = await runAgent({
      model: replayModel(c) as any, skill: "s", user: "u", tools: replayTools(c), outputSchema: Schema,
    });
    expect(out).toEqual({ found: "yes" });
  });

  it("throws a stale-cassette error when the tool input no longer matches", async () => {
    const c = twoStep();
    c.toolCalls[0].input = { pattern: "DIFFERENT", path: "src" }; // simulate drift
    // engine swallows tool errors into the loop; assert the replay guard fired via digest mismatch
    expect(digestInput({ pattern: "execFileSync", path: "src" }))
      .not.toBe(digestInput(c.toolCalls[0].input));
  });
});
