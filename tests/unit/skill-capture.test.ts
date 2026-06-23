import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

describe("capture SKILL.md", () => {
  it("exists with name + description frontmatter", () => {
    const t = readFileSync("skills/capture/SKILL.md", "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(/name:\s*capture/);
    expect(t).toMatch(/description:/);
    expect(t).toMatch(/implicit/i); // methodology present
  });
});
