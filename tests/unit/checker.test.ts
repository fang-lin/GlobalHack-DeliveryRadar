import { describe, it, expect } from "vitest";
import { buildUserPrompt, toVerdict, unknownVerdict } from "../../src/core/checker.ts";
import type { FileDiff } from "../../src/io/diff.ts";
import { makeConstraint } from "../fixtures/factories.ts";

const constraint = makeConstraint();

const diffs: FileDiff[] = [{ path: "a.ts", text: "+ some change" }];

describe("unknownVerdict", () => {
  it("returns an unknown Verdict with the expected shape", () => {
    const v = unknownVerdict(constraint);
    expect(v.constraint_id).toBe("ADR-001-C1");
    expect(v.result).toBe("unknown");
    expect(v.confidence).toBe(0);
    expect(v.evidence.adr_clause).toBe("ADR-001-C1");
    expect(v.evidence.code).toBeNull();
    expect(v.fix_locality).toBe("none");
    expect(v.fix_direction).toBeNull();
    expect(v.explanation).toBe("the checker could not produce a verdict");
  });
});

describe("buildUserPrompt", () => {
  it("includes rule, driver, and examples in the prompt", () => {
    const c = makeConstraint({
      driver: "EPIC-42",
      check: {
        type: "semantic",
        matcher: null,
        examples: { compliant: ["good code"], violating: ["bad code"] },
      },
    });
    const prompt = buildUserPrompt(c, diffs, "some ADR context");
    expect(prompt).toContain("Must do X.");
    expect(prompt).toContain("EPIC-42");
    expect(prompt).toContain("some ADR context");
    expect(prompt).toContain("good code");
    expect(prompt).toContain("bad code");
    expect(prompt).toContain("+ some change");
  });

  it("omits driver/context/examples sections when absent", () => {
    const prompt = buildUserPrompt(constraint, diffs);
    expect(prompt).toContain("ADR-001-C1");
    expect(prompt).toContain("Must do X.");
    expect(prompt).not.toContain("Business driver:");
    expect(prompt).not.toContain("Driver rationale");
  });
});

describe("toVerdict", () => {
  it("maps output and clamps confidence", () => {
    const v = toVerdict(constraint, {
      result: "violated",
      confidence: 1.4,
      explanation: "x",
      evidence_file: "a.ts",
      evidence_line_start: 3,
      evidence_line_end: 5,
      fix_locality: "local",
      fix_direction: "do y",
    });
    expect(v.confidence).toBe(1);
    expect(v.evidence.code).toEqual({ file: "a.ts", lines: [3, 5] });
    expect(v.constraint_id).toBe("ADR-001-C1");
    expect(v.result).toBe("violated");
    expect(v.fix_direction).toBe("do y");
  });

  it("clamps confidence below 0 and handles null evidence", () => {
    const v = toVerdict(constraint, {
      result: "aligned",
      confidence: -0.5,
      explanation: "compatible",
      evidence_file: null,
      evidence_line_start: null,
      evidence_line_end: null,
      fix_locality: "none",
      fix_direction: null,
    });
    expect(v.confidence).toBe(0);
    expect(v.evidence.code).toBeNull();
    expect(v.result).toBe("aligned");
  });

  it("uses evidence_line_start for end when evidence_line_end is null", () => {
    const v = toVerdict(constraint, {
      result: "unknown",
      confidence: 0.3,
      explanation: "not enough info",
      evidence_file: "b.ts",
      evidence_line_start: 7,
      evidence_line_end: null,
      fix_locality: "none",
      fix_direction: null,
    });
    expect(v.evidence.code).toEqual({ file: "b.ts", lines: [7, 7] });
  });
});
