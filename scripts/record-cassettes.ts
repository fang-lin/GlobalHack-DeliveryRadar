/**
 * Recording entrypoint — MAINTAINER-TRIGGERED ONLY.
 *
 * Records one real cassette per operation (conformance + capture) against a
 * live provider. This SPENDS API. Do NOT run in CI or automated tests.
 *
 * Usage:
 *   set -a; source .envrc; set +a
 *   RADAR_CASSETTE=record tsx scripts/record-cassettes.ts
 *
 * Produces:
 *   tests/cassettes/conformance-recorded.json
 *   tests/cassettes/capture-recorded.json
 *
 * ST-0024
 */
import { cassetteMode, cassetteDeps } from "../tests/cassettes/index.ts";
import { cmdConformance } from "../src/cli/commands/conformance.ts";
import { cmdCapture } from "../src/cli/commands/capture.ts";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "..");
const CASSETTE_DIR = join(REPO_ROOT, "tests", "cassettes");
const FIXTURE_DIR = join(REPO_ROOT, "tests", "fixtures");

// Guard: refuse to run in replay mode (no API would be called, nothing useful
// would be produced, and the user would be confused).
if (cassetteMode() === "replay") {
  console.error(
    "Set RADAR_CASSETTE=record|update to record — this spends API. Aborting.",
  );
  process.exit(1);
}

console.error(`Recording cassettes in ${cassetteMode()} mode…`);
console.error(`Output dir: ${CASSETTE_DIR}`);

// ── 1. conformance-recorded ──────────────────────────────────────────────────
//
// Uses tests/fixtures/adr-cassette/ (single ADR-0006-C1) so retrieval fires
// exactly one constraint → one model call.  The diff is cassette-conformance.diff
// (adds child_process import into src/core/ — a clear ADR-0006-C1 violation).
{
  console.error("\n[1/2] Recording conformance-recorded…");
  const deps = cassetteDeps("conformance", "recorded", CASSETTE_DIR);
  const code = await cmdConformance(
    [
      "--diff", join(FIXTURE_DIR, "cassette-conformance.diff"),
      "--adr-dir", join(FIXTURE_DIR, "adr-cassette"),
      "--root", REPO_ROOT,
    ],
    deps,
  );
  deps.finalize?.();
  console.error(
    `[1/2] conformance-recorded done (exit ${code}) → ${join(CASSETTE_DIR, "conformance-recorded.json")}`,
  );
}

// ── 2. capture-recorded ──────────────────────────────────────────────────────
//
// Uses the full docs/adr dir (capture reads all constraints for dedup only).
// The diff is cassette-capture.diff (payments→fraud HTTP call).
{
  console.error("\n[2/2] Recording capture-recorded…");
  const deps = cassetteDeps("capture", "recorded", CASSETTE_DIR);
  const code = await cmdCapture(
    [
      "--diff", join(FIXTURE_DIR, "cassette-capture.diff"),
      "--adr-dir", join(REPO_ROOT, "docs", "adr"),
      "--root", REPO_ROOT,
    ],
    deps,
  );
  deps.finalize?.();
  console.error(
    `[2/2] capture-recorded done (exit ${code}) → ${join(CASSETTE_DIR, "capture-recorded.json")}`,
  );
}

console.error("\nAll cassettes recorded.");
