import { describe, it, expect } from "vitest";
import { cmdExtract } from "../../src/cli/commands/extract.ts";

describe("radar extract (no network)", () => {
  it("lists constraints from real ADR dir to stdout and returns 0", async () => {
    const log: string[] = [];
    const origLog = console.log;
    // console.error is used for the count line; we silence it to keep test output clean
    const origErr = console.error;
    console.log = (s?: unknown) => {
      log.push(String(s ?? ""));
    };
    console.error = () => {};
    let code: number;
    try {
      code = await cmdExtract(["--adr-dir", "docs/adr"]);
    } finally {
      console.log = origLog;
      console.error = origErr;
    }

    expect(code).toBe(0);
    const out = log.join("\n");
    // The real ADRs must yield at least ADR-0006-C1
    expect(out).toContain("ADR-0006-C1");
  });
});
