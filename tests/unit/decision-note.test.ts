import { describe, it, expect } from "vitest";
import { CaptureOutputSchema, DecisionNoteSchema } from "../../src/core/models.ts";

describe("DecisionNote (DM-DECISION-NOTE)", () => {
  it("parses a full note", () => {
    const n = DecisionNoteSchema.parse({
      detected_decision: "orders calls inventory over direct HTTP",
      evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
      suggested_class: "architectural",
      draft_rationale: "from PR body",
      confidence: 0.8,
      why_net_new: "no ADR scopes services/orders",
    });
    expect(n.suggested_class).toBe("architectural");
  });
  it("empty notes list is valid (nothing flagged)", () => {
    expect(CaptureOutputSchema.parse({ notes: [] }).notes).toEqual([]);
    expect(CaptureOutputSchema.parse({}).notes).toEqual([]); // defaults
  });
  it("rejects an unknown class", () => {
    expect(() => DecisionNoteSchema.parse({
      detected_decision: "x", evidence: [], suggested_class: "weird",
      draft_rationale: "", confidence: 0.1, why_net_new: "",
    })).toThrow();
  });
});
