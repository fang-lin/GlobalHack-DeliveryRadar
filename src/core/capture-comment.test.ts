import { describe, it, expect } from "vitest";
import { decisionNotesMarkdown } from "./capture-comment.ts";

const note = {
  detected_decision: "orders calls inventory over direct HTTP",
  evidence: [{ file: "services/orders/client.ts", lines: [10, 14] }],
  suggested_class: "architectural" as const,
  draft_rationale: "PR body says 'sync read for speed'",
  confidence: 0.82,
  why_net_new: "no active constraint scopes services/orders",
};

describe("decisionNotesMarkdown", () => {
  it("renders a note with header, evidence and confidence", () => {
    const md = decisionNotesMarkdown([note]);
    expect(md).toContain("Delivery Radar — Decision Capture");
    expect(md).toContain("orders calls inventory over direct HTTP");
    expect(md).toContain("`services/orders/client.ts` L10–L14");
    expect(md).toContain("0.82");
    expect(md).toContain("_Advisory");
  });
  it("says nothing-flagged on empty input, never a bare header", () => {
    const md = decisionNotesMarkdown([]);
    expect(md).toContain("No undocumented decisions detected");
    expect(md).not.toContain("Decision:");
  });
  it("renders a note with empty evidence array without 'Lundefined'", () => {
    const noteNoEvidence = {
      detected_decision: "some decision",
      evidence: [] as { file: string; lines: number[] }[],
      suggested_class: "behavioral" as const,
      draft_rationale: "a rationale",
      confidence: 0.6,
      why_net_new: "nothing recorded",
    };
    const md = decisionNotesMarkdown([noteNoEvidence]);
    expect(md).not.toContain("Lundefined");
    expect(md).toContain("**Evidence:** —");
  });
});
