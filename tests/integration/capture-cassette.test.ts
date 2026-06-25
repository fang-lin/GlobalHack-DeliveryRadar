/**
 * Integration: capture via synthetic cassette (no API, no network).
 *
 * Proves that the real agent loop runs correctly for each capture state —
 * has-notes (2-step: grep tool round then text-parse) and no-notes
 * (single-step: empty notes list) — and that the stale-gate (`mismatches`)
 * actually fires when a cassette drifts.
 *
 * Uses the whole project's docs/adr dir (capture does not use scope-first
 * retrieval — it reads all recorded constraints for dedup only).
 *
 * ST-0024 — cassette-backed capture integration.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdCapture } from "../../src/cli/commands/capture.ts";
import { cassetteDeps } from "../cassettes/index.ts";

const FIXTURE_DIFF = new URL("../fixtures/cassette-capture.diff", import.meta.url).pathname;
const ADR_DIR = new URL("../../docs/adr", import.meta.url).pathname;

function captureStdout(): { log: string[]; restore: () => void } {
  const log: string[] = [];
  const orig = console.log;
  console.log = (s?: unknown) => { log.push(String(s ?? "")); };
  return { log, restore: () => { console.log = orig; } };
}

function writeDiffToTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), "radar-cap-cassette-"));
  const diff = join(dir, "pr.diff");
  writeFileSync(diff, readFileSync(FIXTURE_DIFF, "utf8"));
  return diff;
}

describe("capture via cassette (real agent loop, no API)", () => {
  it("has-notes: renders the detected_decision text and mismatches is empty", async () => {
    const diff = writeDiffToTmp();
    const deps = cassetteDeps("capture", "has-notes");
    const cap = captureStdout();
    let code: number;
    try {
      code = await cmdCapture(
        ["--diff", diff, "--adr-dir", ADR_DIR, "--root", process.cwd()],
        deps,
      );
    } finally {
      cap.restore();
    }

    // Command must succeed
    expect(code).toBe(0);

    // Output must contain the note's detected_decision text
    const out = cap.log.join("\n");
    expect(out).toContain("payments service calls fraud-detection-service over synchronous HTTP");

    // Stale gate: cassette must have matched the real agent run exactly
    expect(deps.mismatches).toBeDefined();
    expect(deps.mismatches).toEqual([]);
  });

  it("no-notes: renders the clean output and mismatches is empty", async () => {
    const diff = writeDiffToTmp();
    const deps = cassetteDeps("capture", "no-notes");
    const cap = captureStdout();
    let code: number;
    try {
      code = await cmdCapture(
        ["--diff", diff, "--adr-dir", ADR_DIR, "--root", process.cwd()],
        deps,
      );
    } finally {
      cap.restore();
    }

    // Command must succeed
    expect(code).toBe(0);

    // Output must indicate no decisions found (no note markdown headers)
    const out = cap.log.join("\n");
    expect(out).toContain("No undocumented decisions detected");
    // Must NOT contain any architectural note content
    expect(out).not.toContain("Possible undocumented decision");

    // Stale gate: cassette must have matched the real agent run exactly
    expect(deps.mismatches).toBeDefined();
    expect(deps.mismatches).toEqual([]);
  });
});
