import { describe, it, expect } from "vitest";
import { parseAgentJson } from "./parse.ts";
import { CaptureOutputSchema } from "../core/models.ts";

const valid = JSON.stringify({ notes: [{
  detected_decision: "x", evidence: [{ file: "a.ts", lines: [1, 2] }],
  suggested_class: "architectural", draft_rationale: "r", confidence: 0.7, why_net_new: "n",
}]});

describe("parseAgentJson", () => {
  it("parses a bare JSON object", () => {
    expect(parseAgentJson(valid, CaptureOutputSchema)?.notes).toHaveLength(1);
  });
  it("parses JSON inside a ```json fence", () => {
    expect(parseAgentJson("blah\n```json\n" + valid + "\n```\n", CaptureOutputSchema)?.notes).toHaveLength(1);
  });
  it("returns null on garbage, never throws", () => {
    expect(parseAgentJson("no json here", CaptureOutputSchema)).toBeNull();
    expect(parseAgentJson("{not valid}", CaptureOutputSchema)).toBeNull();
  });
});
