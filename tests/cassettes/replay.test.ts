/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { runAgent } from "../../src/agent/engine.ts";
import { createReplay } from "./replay.ts";
import type { Cassette } from "./cassette.ts";

const Schema = z.object({ found: z.string() });

function twoStep(): Cassette {
  const grepInput = { pattern: "execFileSync", path: "src" };
  return {
    meta: { op: "conformance", case: "syn", recordedAt: "2026-06-25", model: "mock", jsonMode: "json_object" },
    modelCalls: [
      { inputDigest: "synthetic", result: {
        content: [{ type: "tool-call", toolCallId: "c1", toolName: "grep", input: grepInput }],
        finishReason: { unified: "tool-calls", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
      { inputDigest: "synthetic", result: {
        content: [{ type: "text", text: JSON.stringify({ found: "yes" }) }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      } },
    ],
    toolCalls: [{ name: "grep", input: grepInput, output: "src/agent/tools.ts:44: execFileSync(...)" }],
  };
}

describe("createReplay drives a real agent loop", () => {
  it("returns the validated object after a recorded tool round, no mismatches", async () => {
    const c = twoStep();
    const r = createReplay(c);
    const out = await runAgent({ model: r.model as any, skill: "s", user: "u", tools: r.tools, outputSchema: Schema });
    expect(out).toEqual({ found: "yes" });
    expect(r.mismatches).toEqual([]);
  });

  it("records a mismatch (stale gate) when the recorded tool input no longer matches the call", async () => {
    const c = twoStep();
    c.toolCalls[0].input = { pattern: "DIFFERENT", path: "src" }; // cassette drifted from what the agent actually greps
    const r = createReplay(c);
    await runAgent({ model: r.model as any, skill: "s", user: "u", tools: r.tools, outputSchema: Schema });
    expect(r.mismatches.length).toBeGreaterThan(0); // stale detected end-to-end
  });
});
