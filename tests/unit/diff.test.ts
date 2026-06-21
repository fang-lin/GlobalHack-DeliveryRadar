import { describe, it, expect } from "vitest";
import { parseUnifiedDiff } from "../../src/io/diff.js";

// A realistic two-file unified diff: one modified file, one deleted file.
const DIFF = `diff --git a/src/foo.ts b/src/foo.ts
index 1111111..2222222 100644
--- a/src/foo.ts
+++ b/src/foo.ts
@@ -1,2 +1,3 @@
 const a = 1;
+const b = 2;
 export { a };
diff --git a/legacy/old.ts b/legacy/old.ts
deleted file mode 100644
index 3333333..0000000
--- a/legacy/old.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-const gone = true;
-export { gone };

`;

describe("parseUnifiedDiff (FR-ARCH-1)", () => {
  it("splits the diff into one segment per file", () => {
    const diffs = parseUnifiedDiff(DIFF);
    expect(diffs).toHaveLength(2);
    expect(diffs.every((d) => d.text.startsWith("diff --git"))).toBe(true);
  });

  it("uses the post-change (b) path for a modified file", () => {
    const [foo] = parseUnifiedDiff(DIFF);
    expect(foo.path).toBe("src/foo.ts");
    expect(foo.text).toContain("+const b = 2;");
  });

  it("keeps the pre-change (a) path for a deleted file (+++ /dev/null)", () => {
    const old = parseUnifiedDiff(DIFF)[1];
    expect(old.path).toBe("legacy/old.ts");
  });

  it("trims trailing newlines from each segment", () => {
    for (const d of parseUnifiedDiff(DIFF)) {
      expect(d.text).not.toMatch(/\n$/);
    }
  });

  it("returns an empty array when there are no file headers", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("just some text, not a diff")).toEqual([]);
  });
});
