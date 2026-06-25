/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { MockLanguageModelV3 } from "ai/test";
import { recordingModel, recordingTools } from "./record.ts";
import type { ModelCall, ToolCall } from "./cassette.ts";

describe("recordingModel", () => {
  it("captures the result and passes it through", async () => {
    const real = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text: "hello" }],
        finishReason: { unified: "stop", raw: undefined },
        usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } }, warnings: [],
      }),
    });
    const sink: ModelCall[] = [];
    const wrapped = recordingModel(real as any, sink) as any;
    const r = await wrapped.doGenerate({ prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }] });
    expect((r.content[0] as any).text).toBe("hello");
    expect(sink).toHaveLength(1);
    expect(sink[0].inputDigest).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("recordingTools", () => {
  it("captures real tool output (grep over the repo root)", async () => {
    const sink: ToolCall[] = [];
    const tools = recordingTools(process.cwd(), sink) as any;
    const out = await tools.grep.execute({ pattern: "stopWhen", path: "src/agent" }, {} as any);
    expect(out).toContain("stopWhen");
    expect(sink).toHaveLength(1);
    expect(sink[0].name).toBe("grep");
  });
});
