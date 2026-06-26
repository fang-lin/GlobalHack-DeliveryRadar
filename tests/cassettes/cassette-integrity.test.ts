/**
 * Cassette integrity guard (§7 promise).
 *
 * Invariant: a cassette whose meta.model is NOT a synthetic marker (i.e. it
 * was recorded against a REAL provider like "vercel/deepseek-v4-pro") MUST
 * carry real inputDigest values — none of its modelCalls[*].inputDigest may
 * equal the synthetic sentinel "synthetic".
 *
 * Today every committed cassette has meta.model === "synthetic", so all are
 * exempt and this suite passes green.  Once Task 9 records real cassettes,
 * this guard enforces that real digests were captured; if they were not (e.g.
 * someone copy-pasted the sentinel), the test goes RED immediately.
 */
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { loadCassette } from "./cassette.ts";
import { SYNTHETIC } from "./replay.ts";

const CASSETTE_DIR = new URL(".", import.meta.url).pathname; // tests/cassettes/
const SYNTHETIC_MODEL_RE = /synthetic|mock/i;

function listCassetteFiles(dir: string): { op: string; caseName: string }[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      // filename format: <op>-<caseName>.json  (caseName itself may contain hyphens)
      const stem = f.slice(0, -5); // strip .json
      const dash = stem.indexOf("-");
      return dash === -1
        ? null
        : { op: stem.slice(0, dash), caseName: stem.slice(dash + 1) };
    })
    .filter((x): x is { op: string; caseName: string } => x !== null);
}

describe("cassette integrity — real cassettes must not use the synthetic sentinel", () => {
  const entries = listCassetteFiles(CASSETTE_DIR);

  if (entries.length === 0) {
    it("(no cassette files found — skipped)", () => {
      expect(true).toBe(true);
    });
    return;
  }

  for (const { op, caseName } of entries) {
    it(`${op}-${caseName}.json`, () => {
      const cassette = loadCassette(op, caseName, CASSETTE_DIR);
      const isRealModel = !SYNTHETIC_MODEL_RE.test(cassette.meta.model);

      if (!isRealModel) {
        // Synthetic-marked cassette — exempt from the sentinel guard.
        return;
      }

      // Real cassette: every modelCall must carry a real digest (not the sentinel).
      const sentinelCalls = cassette.modelCalls
        .map((call, i) => ({ i, digest: call.inputDigest }))
        .filter(({ digest }) => digest === SYNTHETIC);

      expect(
        sentinelCalls,
        `Real cassette ${op}-${caseName}.json (meta.model="${cassette.meta.model}") ` +
          `has ${sentinelCalls.length} modelCall(s) with inputDigest="${SYNTHETIC}": ` +
          `indices [${sentinelCalls.map((c) => c.i).join(", ")}]. ` +
          `Real recordings must carry actual sha256 digests so the anti-staleness gate is live.`,
      ).toEqual([]);
    });
  }
});
