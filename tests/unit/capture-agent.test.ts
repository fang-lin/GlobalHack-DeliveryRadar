/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { runCapture } from "../../src/capture/agent.ts";

const NOTES = { notes: [{
  detected_decision: "orders calls inventory over direct HTTP",
  evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
  suggested_class: "architectural", draft_rationale: "speed", confidence: 0.8,
  why_net_new: "no ADR scopes services/orders",
}]};

function modelReturning(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
      warnings: [],
    }),
  });
}

describe("runCapture", () => {
  it("returns parsed notes from the model output", async () => {
    const notes = await runCapture({
      model: modelReturning("```json\n" + JSON.stringify(NOTES) + "\n```") as any,
      skill: "be a capture agent", diff: "diff --git a/x b/x", constraints: [], root: process.cwd(),
    });
    expect(notes).toHaveLength(1);
    expect(notes[0].suggested_class).toBe("architectural");
  });
  it("returns [] (never throws) when the model emits no usable JSON", async () => {
    const notes = await runCapture({
      model: modelReturning("I found nothing.") as any,
      skill: "s", diff: "d", constraints: [], root: process.cwd(),
    });
    expect(notes).toEqual([]);
  });
});
