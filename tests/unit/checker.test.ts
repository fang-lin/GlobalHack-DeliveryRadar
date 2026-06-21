import { describe, it, expect } from "vitest";
import { checkConstraint } from "../../src/core/checker.js";
import type { ModelClient } from "../../src/llm.js";
import type { FileDiff } from "../../src/io/diff.js";
import { makeConstraint } from "../fixtures/factories.js";

const constraint = makeConstraint();

const diffs: FileDiff[] = [{ path: "a.ts", text: "+ some change" }];

/** A fake ModelClient — the whole point of the port: core is testable, no network/key. */
const fake = (out: unknown): ModelClient => ({ complete: async () => out } as unknown as ModelClient);

describe("checkConstraint over the ModelClient port (ADR-0007)", () => {
  it("maps the model's structured output to a Verdict", async () => {
    const v = await checkConstraint(
      fake({
        result: "violated",
        confidence: 0.9,
        explanation: "defeats the recorded intent",
        evidence_file: "a.ts",
        evidence_line_start: 3,
        evidence_line_end: 5,
        fix_locality: "structural",
        fix_direction: "follow the ADR",
      }),
      constraint,
      diffs,
    );
    expect(v.constraint_id).toBe("ADR-001-C1");
    expect(v.result).toBe("violated");
    expect(v.confidence).toBe(0.9);
    expect(v.evidence).toEqual({ adr_clause: "ADR-001-C1", code: { file: "a.ts", lines: [3, 5] } });
    expect(v.fix_direction).toBe("follow the ADR");
  });

  it("clamps confidence to [0,1] and tolerates missing evidence", async () => {
    const v = await checkConstraint(
      fake({
        result: "aligned",
        confidence: 1.5,
        explanation: "compatible",
        evidence_file: null,
        evidence_line_start: null,
        evidence_line_end: null,
        fix_locality: "none",
        fix_direction: null,
      }),
      constraint,
      diffs,
    );
    expect(v.confidence).toBe(1);
    expect(v.evidence.code).toBeNull();
    expect(v.result).toBe("aligned");
  });
});
