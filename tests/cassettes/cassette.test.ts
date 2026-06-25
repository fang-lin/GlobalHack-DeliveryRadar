import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { digestInput, saveCassette, loadCassette, type Cassette } from "./cassette.ts";

describe("digestInput", () => {
  it("is stable across key order and ignores absolute tmp paths", () => {
    const a = digestInput({ b: 1, path: join(tmpdir(), "radar-x", "pr.diff"), a: 2 });
    const b = digestInput({ a: 2, path: join(tmpdir(), "radar-y", "pr.diff"), b: 1 });
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("save/load round-trip", () => {
  it("writes then reads an identical cassette", () => {
    const dir = mkdtempSync(join(tmpdir(), "radar-cass-"));
    const c: Cassette = {
      meta: { op: "conformance", case: "rt", recordedAt: "2026-06-25", model: "mock", jsonMode: "json_object" },
      modelCalls: [{ inputDigest: "abc", result: { content: [{ type: "text", text: "{}" }] } }],
      toolCalls: [{ name: "grep", input: { pattern: "x" }, output: "no matches" }],
    };
    saveCassette(c, dir);
    expect(loadCassette("conformance", "rt", dir)).toEqual(c);
  });
});
