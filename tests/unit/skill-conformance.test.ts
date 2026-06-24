import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("conformance SKILL.md", () => {
  it("exists with name + description frontmatter and methodology", () => {
    const t = readFileSync("skills/conformance/SKILL.md", "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(/name:\s*conformance/);
    expect(t).toMatch(/description:/);
    expect(t).toMatch(/driver/i); // judges letter AND reason
    expect(t).toMatch(/unknown/i); // unknown is valid
  });
});
