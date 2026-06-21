import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadDiff } from "../../src/io/diff.js";
import { extractFromDir } from "../../src/io/extract.js";
import { globToRegex, retrieve } from "../../src/core/retrieve.js";

const FIXTURES = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures");

describe("scope-first retrieval (NFR-RETRIEVAL-1)", () => {
  it("parses changed files from the diff", () => {
    const diffs = loadDiff(join(FIXTURES, "pr-violating.diff"));
    expect(diffs.map((d) => d.path)).toEqual([
      "services/inventory/reader.py",
      "services/inventory/tests/test_reader.py",
    ]);
    expect(diffs[0].text).toContain("FOR UPDATE");
  });

  it("glob matching with ** semantics", () => {
    expect(globToRegex("services/inventory/**").test("services/inventory/reader.py")).toBe(true);
    expect(globToRegex("services/inventory/**").test("services/inventory/sub/deep.py")).toBe(true);
    expect(globToRegex("services/inventory/**").test("services/orders/api.py")).toBe(false);
    expect(globToRegex("**/*.sql").test("migrations/0001_init.sql")).toBe(true);
    expect(globToRegex("services/*/api.py").test("services/a/b/api.py")).toBe(false);
  });

  it("retrieves only in-scope constraints", () => {
    const constraints = extractFromDir(FIXTURES);
    const diffs = loadDiff(join(FIXTURES, "pr-violating.diff"));
    const matched = retrieve(constraints, diffs);
    expect(matched.length).toBe(1);
    const [constraint, files] = matched[0];
    expect(constraint.id).toBe("ADR-001-C1");
    expect(files.length).toBe(2);
    // an out-of-scope (empty) diff retrieves nothing — over-retrieval is a defect
    expect(retrieve(constraints, [])).toEqual([]);
  });
});
