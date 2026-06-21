import { describe, it, expect } from "vitest";
import { reviewMarkdown, verdictMarkdown } from "../src/comment.js";
import { makeConstraint as constraint, makeVerdict as verdict } from "./fixtures/factories.js";

describe("reviewMarkdown (FR-CONF-7)", () => {
  it("renders the header and the advisory footer even with no verdicts", () => {
    const md = reviewMarkdown([], []);
    expect(md).toContain("🛰️ Delivery Radar");
    expect(md).toContain("_Advisory");
    expect(md).not.toContain("VIOLATED");
  });

  it("orders violated before non-violated, then by confidence descending", () => {
    const constraints = [
      constraint({ id: "ADR-001-C1", title: "V-low" }),
      constraint({ id: "ADR-001-C2", title: "V-high" }),
      constraint({ id: "ADR-001-C3", title: "Aligned" }),
    ];
    const verdicts = [
      verdict({ constraint_id: "ADR-001-C3", result: "aligned", confidence: 0.99 }),
      verdict({ constraint_id: "ADR-001-C1", result: "violated", confidence: 0.5 }),
      verdict({ constraint_id: "ADR-001-C2", result: "violated", confidence: 0.8 }),
    ];
    const md = reviewMarkdown(verdicts, constraints);
    expect(md.indexOf("V-high")).toBeLessThan(md.indexOf("V-low"));
    expect(md.indexOf("V-low")).toBeLessThan(md.indexOf("Aligned"));
  });

  it("skips a verdict whose constraint is not in the set (no crash)", () => {
    const md = reviewMarkdown([verdict({ constraint_id: "ADR-999-C1" })], [constraint()]);
    expect(md).toContain("🛰️ Delivery Radar");
    expect(md).not.toContain("Title One");
  });
});

describe("verdictMarkdown", () => {
  it("renders the violated badge, formatted confidence, and code evidence", () => {
    const md = verdictMarkdown(
      verdict({ confidence: 0.9, evidence: { adr_clause: "ADR-001-C1", code: { file: "a.ts", lines: [3, 5] } } }),
      constraint(),
    );
    expect(md).toContain("🔴 **VIOLATED**");
    expect(md).toContain("confidence **0.90**");
    expect(md).toContain("`a.ts`");
    expect(md).toContain("L3");
    expect(md).toContain("L5");
  });

  it("maps each result to its badge", () => {
    expect(verdictMarkdown(verdict({ result: "aligned" }), constraint())).toContain("🟢 **ALIGNED**");
    expect(verdictMarkdown(verdict({ result: "unknown" }), constraint())).toContain("⚪ **UNKNOWN**");
  });

  it("quotes the driver rationale paragraph that mentions the driver", () => {
    const ctx = "Unrelated opening paragraph.\n\nSTORY-7 demands eventual-consistency tolerance for reads.";
    const md = verdictMarkdown(verdict(), constraint({ driver: "STORY-7" }), ctx);
    expect(md).toContain("driver `STORY-7`");
    expect(md).toContain("eventual-consistency tolerance");
  });
});
