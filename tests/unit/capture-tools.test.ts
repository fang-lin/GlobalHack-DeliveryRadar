/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { buildTools } from "../../src/capture/tools.ts";

describe("buildTools (read-only)", () => {
  const tools = buildTools(process.cwd());
  it("read_file reads a repo file", async () => {
    const out = await tools.read_file.execute({ path: "package.json" }, {} as any);
    expect(out).toContain("\"name\"");
  });
  it("read_file refuses to escape the repo root", async () => {
    const out = await tools.read_file.execute({ path: "../../etc/passwd" }, {} as any);
    expect(out).toMatch(/outside the repo|not allowed/i);
  });
  it("git tool rejects a non-read-only subcommand", async () => {
    const out = await tools.git.execute({ args: ["push"] }, {} as any);
    expect(out).toMatch(/only read-only/i);
  });
  it("grep finds a literal string in the repo", async () => {
    const out = await tools.grep.execute({ pattern: "\"name\"", path: "package.json" }, {} as any);
    expect(out).toMatch(/package\.json/);
  });
  it("grep treats regex metacharacters literally (does not error)", async () => {
    // A pattern with unbalanced-looking parens would break grep's default regex
    // mode; with -F it is matched literally and simply returns "no matches".
    const out = await tools.grep.execute({ pattern: "fetch(", path: "." }, {} as any);
    expect(out).not.toMatch(/parentheses|unbalanced|error/i);
  });
  it("grep refuses to escape the repo root", async () => {
    const out = await tools.grep.execute({ pattern: "x", path: "../../etc" }, {} as any);
    expect(out).toMatch(/outside the repo|not allowed/i);
  });
});
