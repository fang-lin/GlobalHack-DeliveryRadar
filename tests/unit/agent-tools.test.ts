/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { buildTools } from "../../src/agent/tools.ts";

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
  it("grep finds a literal string and returns the matching line", async () => {
    // Assert the matched LINE CONTENT, not the filename: GNU grep (Linux CI) omits
    // the filename prefix for a single-file search, BSD grep (macOS) includes it.
    const out = await tools.grep.execute({ pattern: "delivery-radar", path: "package.json" }, {} as any);
    expect(out).toMatch(/delivery-radar/);
  });
  it("grep matches a pattern with metacharacters literally (regex mode would choke)", async () => {
    // "stepCountIs(" has an unbalanced paren — grep's default regex mode errors on
    // it and the result is swallowed as "no matches"; with -F it matches literally.
    const out = await tools.grep.execute({ pattern: "stepCountIs(", path: "src/capture/agent.ts" }, {} as any);
    expect(out).toMatch(/stepCountIs\(/);
  });
  it("grep refuses to escape the repo root", async () => {
    const out = await tools.grep.execute({ pattern: "x", path: "../../etc" }, {} as any);
    expect(out).toMatch(/outside the repo|not allowed/i);
  });
});
