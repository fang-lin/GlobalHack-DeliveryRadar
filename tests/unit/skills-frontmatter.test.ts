import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const SKILLS = "skills";
const dirs = existsSync(SKILLS) ? readdirSync(SKILLS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

describe("every skills/*/SKILL.md has legal frontmatter", () => {
  it("finds at least the capture + conformance skills", () => {
    expect(dirs).toEqual(expect.arrayContaining(["capture", "conformance"]));
  });
  it.each(dirs)("%s/SKILL.md has name + description frontmatter", (d) => {
    const t = readFileSync(join(SKILLS, d, "SKILL.md"), "utf8");
    expect(t).toMatch(/^---/);
    expect(t).toMatch(new RegExp(`name:\\s*${d}\\b`));
    expect(t).toMatch(/description:\s*\S/);
  });
});
