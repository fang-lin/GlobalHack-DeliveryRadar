import { describe, it, expect } from "vitest";
import { parseCaptureNotes } from "../../src/capture/parse.ts";

const valid = JSON.stringify({ notes: [{
  detected_decision: "x", evidence: [{ file: "a.ts", lines: [1, 2] }],
  suggested_class: "architectural", draft_rationale: "r", confidence: 0.7, why_net_new: "n",
}]});

describe("parseCaptureNotes", () => {
  it("parses a bare JSON object", () => {
    expect(parseCaptureNotes(valid)).toHaveLength(1);
  });
  it("parses JSON inside a ```json fence", () => {
    expect(parseCaptureNotes("blah\n```json\n" + valid + "\n```\n")).toHaveLength(1);
  });
  it("returns [] on garbage, never throws", () => {
    expect(parseCaptureNotes("no json here")).toEqual([]);
    expect(parseCaptureNotes("{not valid}")).toEqual([]);
  });
});
