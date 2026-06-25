/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import * as z from "zod/v4";
import { MockLanguageModelV3 } from "ai/test";
import { runAgent } from "./engine.ts";

const Schema = z.object({ ok: z.boolean() });
function model(text: string) {
  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
      warnings: [],
    }),
  });
}
describe("runAgent", () => {
  it("returns the validated object from raw JSON (primary path)", async () => {
    const out = await runAgent({ model: model(JSON.stringify({ ok: true })) as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toEqual({ ok: true });
  });
  it("falls back to text-parse for fenced JSON", async () => {
    const out = await runAgent({ model: model("```json\n" + JSON.stringify({ ok: true }) + "\n```") as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toEqual({ ok: true });
  });
  it("returns null (never throws) on unusable output", async () => {
    const out = await runAgent({ model: model("no json") as any, skill: "s", user: "u", tools: {}, outputSchema: Schema });
    expect(out).toBeNull();
  });
});
