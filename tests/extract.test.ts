import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { extractFromDir, extractFromText, adrSection } from "../src/extract.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

describe("extraction core (FR-EXT-1, FR-EXT-3)", () => {
  it("extracts a constraint from the fixture ADR", () => {
    const constraints = extractFromDir(FIXTURES);
    expect(constraints.length).toBe(1);
    const c = constraints[0];
    expect(c.id).toBe("ADR-001-C1");
    expect(c.adr).toBe("ADR-001");
    expect(c.check.type).toBe("semantic");
    expect(c.enforce).toBe("advisory");
    expect(c.severity).toBe("high");
    expect(c.driver).toBe("EPIC-512");
    expect(c.scope.paths).toEqual(["services/inventory/**"]);
    expect(c.check.examples!.violating[0]).toContain("FOR UPDATE");
  });

  it("ADR Context section carries the driver rationale", () => {
    const context = adrSection(FIXTURES, "ADR-001", "Context");
    expect(context).toContain("EPIC-512");
    expect(context.includes("five") || context.includes("5")).toBe(true);
  });

  const GATE_SEMANTIC = `
\`\`\`constraints
- id: ADR-009-C1
  adr: ADR-009
  title: Bad combination
  rule: anything
  polarity: requirement
  scope: {paths: ["x/**"]}
  check: {type: semantic}
  enforce: gate
  severity: low
  status: active
\`\`\`
`;

  const BAD_ID = `
\`\`\`constraints
- id: ADR-007-X1
  adr: ADR-007
  title: Bad id
  rule: anything
  polarity: requirement
  scope: {paths: ["x/**"]}
  check: {type: semantic}
  enforce: advisory
  severity: low
  status: active
\`\`\`
`;

  it("rejects gate + semantic (DM-CONSTRAINT-1)", () => {
    expect(() => extractFromText(GATE_SEMANTIC)).toThrow(/DM-CONSTRAINT-1/);
  });

  it("rejects an unstable id (DM-CONSTRAINT-2)", () => {
    expect(() => extractFromText(BAD_ID)).toThrow(/DM-CONSTRAINT-2/);
  });
});
