/**
 * Integration: replay against REAL recorded cassettes (Piece 3b — ST-0024).
 *
 * For each operation (conformance / capture), if the corresponding
 * `tests/cassettes/{op}-recorded.json` exists (written by
 * `scripts/record-cassettes.ts`), replay it through the real command function
 * and assert:
 *   - exit code 0
 *   - deps.mismatches is empty (cassette still matches the live prompt)
 *   - (conformance) the rendered verdict is one of aligned/violated/unknown
 *
 * If the recorded cassette does NOT exist yet, the test is SKIPPED — this
 * must NOT fail CI before the maintainer has run the recording script.
 *
 * Run the recorder first (spends API — maintainer only):
 *   RADAR_CASSETTE=record tsx scripts/record-cassettes.ts
 */
import { describe, it, expect } from "vitest";
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "../../src/cli/commands/conformance.ts";
import { cmdCapture } from "../../src/cli/commands/capture.ts";
import { cassetteDeps } from "../cassettes/index.ts";

const CASSETTE_DIR = new URL("../cassettes", import.meta.url).pathname;
const FIXTURE_DIR = new URL("../fixtures", import.meta.url).pathname;
const REPO_ROOT = new URL("../..", import.meta.url).pathname;

const conformanceRecordedPath = join(CASSETTE_DIR, "conformance-recorded.json");
const captureRecordedPath = join(CASSETTE_DIR, "capture-recorded.json");

function writeDiffToTmp(fixtureName: string): string {
  const dir = mkdtempSync(join(tmpdir(), "radar-rec-"));
  const dest = join(dir, "pr.diff");
  writeFileSync(dest, readFileSync(join(FIXTURE_DIR, fixtureName), "utf8"));
  return dest;
}

function captureStdout(): { log: string[]; restore: () => void } {
  const log: string[] = [];
  const orig = console.log;
  console.log = (s?: unknown) => { log.push(String(s ?? "")); };
  return { log, restore: () => { console.log = orig; } };
}

// ── conformance ───────────────────────────────────────────────────────────────

describe("conformance — recorded cassette replay", () => {
  const skip = !existsSync(conformanceRecordedPath);
  const maybeIt = skip ? it.skip : it;

  maybeIt(
    skip
      ? "SKIP: conformance-recorded.json missing — run scripts/record-cassettes.ts first"
      : "replays conformance-recorded.json: exit 0, no mismatches, valid verdict",
    async () => {
      const diff = writeDiffToTmp("cassette-conformance.diff");
      const adrDir = join(FIXTURE_DIR, "adr-cassette");
      const deps = cassetteDeps("conformance", "recorded", CASSETTE_DIR);
      const cap = captureStdout();
      let code: number;
      try {
        code = await cmdConformance(
          ["--diff", diff, "--adr-dir", adrDir, "--root", REPO_ROOT],
          deps,
        );
      } finally {
        cap.restore();
      }

      expect(code).toBe(0);

      // Stale gate: cassette must match the real prompt
      expect(deps.mismatches).toBeDefined();
      expect(deps.mismatches).toEqual([]);

      // Verdict must be one of the three valid states
      const out = cap.log.join("\n").toLowerCase();
      const valid = ["aligned", "violated", "unknown"].some((v) => out.includes(v));
      expect(valid).toBe(true);
    },
  );
});

// ── capture ───────────────────────────────────────────────────────────────────

describe("capture — recorded cassette replay", () => {
  const skip = !existsSync(captureRecordedPath);
  const maybeIt = skip ? it.skip : it;

  maybeIt(
    skip
      ? "SKIP: capture-recorded.json missing — run scripts/record-cassettes.ts first"
      : "replays capture-recorded.json: exit 0, no mismatches",
    async () => {
      const diff = writeDiffToTmp("cassette-capture.diff");
      const adrDir = join(REPO_ROOT, "docs", "adr");
      const deps = cassetteDeps("capture", "recorded", CASSETTE_DIR);
      const cap = captureStdout();
      let code: number;
      try {
        code = await cmdCapture(
          ["--diff", diff, "--adr-dir", adrDir, "--root", REPO_ROOT],
          deps,
        );
      } finally {
        cap.restore();
      }

      expect(code).toBe(0);

      // Stale gate
      expect(deps.mismatches).toBeDefined();
      expect(deps.mismatches).toEqual([]);
    },
  );
});
