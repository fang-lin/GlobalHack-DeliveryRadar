/**
 * Integration: conformance via synthetic cassette (no API, no network).
 *
 * Proves that the real agent loop (tool round → text-parse → toVerdict)
 * runs correctly for each verdict state — violated (2-step with grep),
 * aligned (single-step), unknown (single-step) — and that the stale-gate
 * (`mismatches`) actually fires when a cassette drifts.
 *
 * Uses a single-constraint ADR fixture (tests/fixtures/adr-cassette/) so
 * that retrieval fires exactly one constraint (ADR-0006-C1) and the
 * cassette model-call count matches exactly.
 *
 * ST-0024 — cassette-backed conformance integration.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cmdConformance } from "../../src/cli/commands/conformance.ts";
import { cassetteDeps } from "../cassettes/index.ts";
import { createReplay } from "../cassettes/replay.ts";
import { loadCassette } from "../cassettes/cassette.ts";

const CASSETTE_DIR = new URL("../cassettes", import.meta.url).pathname;
const FIXTURE_DIFF = new URL("../fixtures/cassette-conformance.diff", import.meta.url).pathname;
// Minimal ADR dir: only ADR-0006-C1 — one constraint in scope, cassette fits exactly.
const ADR_DIR = new URL("../fixtures/adr-cassette", import.meta.url).pathname;

function capture(): { log: string[]; restore: () => void } {
  const log: string[] = [];
  const orig = console.log;
  console.log = (s?: unknown) => { log.push(String(s ?? "")); };
  return { log, restore: () => { console.log = orig; } };
}

function writeDiffToTmp(): string {
  const dir = mkdtempSync(join(tmpdir(), "radar-cc-"));
  const diff = join(dir, "pr.diff");
  writeFileSync(diff, readFileSync(FIXTURE_DIFF, "utf8"));
  return diff;
}

describe("conformance via cassette (real agent loop, no API)", () => {
  for (const c of ["violated", "aligned", "unknown"] as const) {
    it(`renders the ${c} verdict from the recorded interaction`, async () => {
      const diff = writeDiffToTmp();
      const deps = cassetteDeps("conformance", c, CASSETTE_DIR);
      const cap = capture();
      let code: number;
      try {
        code = await cmdConformance(
          ["--diff", diff, "--adr-dir", ADR_DIR, "--root", process.cwd()],
          deps,
        );
      } finally {
        cap.restore();
      }

      // Command must succeed
      expect(code).toBe(0);

      // Output must mention the verdict
      const out = cap.log.join("\n").toLowerCase();
      expect(out).toContain(c === "unknown" ? "unknown" : c);

      // Stale gate: cassette must have matched the real agent run exactly
      expect(deps.mismatches).toBeDefined();
      expect(deps.mismatches).toEqual([]);
    });
  }

  it("stale-gate reverse check: drifted cassette produces mismatches", async () => {
    // Load the violated cassette (has a tool-call step — best candidate for drift)
    const c = loadCassette("conformance", "violated", CASSETTE_DIR);

    // Drift the recorded tool input — the real agent will still grep "child_process",
    // but the cassette now expects something different → mismatch must fire.
    c.toolCalls[0] = {
      ...c.toolCalls[0],
      input: { pattern: "DRIFTED_PATTERN_THAT_WONT_MATCH", path: "src/core" },
    };

    const r = createReplay(c);

    // Run the real agent through one constraint, with the drifted replay model
    const { runAgent } = await import("../../src/agent/engine.ts");
    const { SemanticCheckOutputSchema } = await import("../../src/core/models.ts");
    const { buildUserPrompt } = await import("../../src/core/checker.ts");
    const { extractFromDir } = await import("../../src/io/extract.ts");
    const { loadDiff } = await import("../../src/io/diff.ts");
    const { retrieve } = await import("../../src/core/retrieve.ts");
    const { readFileSync: rfs } = await import("node:fs");

    const diff = writeDiffToTmp();
    const constraints = extractFromDir(ADR_DIR);
    const fileDiffs = loadDiff(diff);
    const inScope = retrieve(constraints, fileDiffs);

    // Must have at least one in-scope constraint (ADR-0006-C1) — if not, the
    // fixture diff is wrong and this test would be hollow.
    expect(inScope.length).toBeGreaterThan(0);

    const [[constraint, diffs]] = inScope;
    const skill = rfs("skills/conformance/SKILL.md", "utf8");
    const userPrompt = buildUserPrompt(constraint, diffs, "");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await runAgent({ model: r.model as any, skill, user: userPrompt, tools: r.tools, outputSchema: SemanticCheckOutputSchema });

    // The drifted cassette must have been detected
    expect(r.mismatches.length).toBeGreaterThan(0);
  });
});
