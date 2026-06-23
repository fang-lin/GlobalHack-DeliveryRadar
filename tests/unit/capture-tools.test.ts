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
});
