/** `radar check` — evaluate a diff against in-scope ADR constraints via the LLM. */
import { parseArgs } from "node:util";
import { extractFromDir, adrSection } from "../../io/extract.ts";
import { loadDiff } from "../../io/diff.ts";
import { retrieve } from "../../core/retrieve.ts";
import { checkConstraint } from "../../core/checker.ts";
import { saveVerdicts, loadVerdicts } from "../../io/verdicts.ts";
import { makeModelClient, debug } from "../../llm.ts";
import { fail } from "../util.ts";

export async function cmdCheck(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      model: { type: "string" }, // overrides RADAR_MODEL; provider via RADAR_PROVIDER (env)
      save: { type: "string" },
      replay: { type: "string" },
      verbose: { type: "boolean", short: "v", default: false }, // RADAR_DEBUG: trace requests to stderr
    },
  });
  if (!values.diff) fail("check requires --diff");
  if (values.verbose) process.env.RADAR_DEBUG = "1";
  const adrDir = values["adr-dir"]!;
  const constraints = extractFromDir(adrDir);
  const fileDiffs = loadDiff(values.diff);
  const inScope = retrieve(constraints, fileDiffs);
  console.error(
    `changed files: ${fileDiffs.length}; in-scope constraints: ` +
      `[${inScope.map(([c]) => `'${c.id}'`).join(", ")}]`,
  );

  let verdicts;
  if (values.replay) {
    verdicts = loadVerdicts(values.replay);
  } else {
    const client = makeModelClient(
      values.model ? { ...process.env, RADAR_MODEL: values.model } : process.env,
    );
    verdicts = [];
    for (const [constraint, diffs] of inScope) {
      debug("checking", constraint.id, "from", constraint.adr, `(${diffs.length} file(s))`);
      const context = adrSection(adrDir, constraint.adr, "Context");
      verdicts.push(await checkConstraint(client, constraint, diffs, context));
    }
  }

  for (const v of verdicts) {
    console.log(`${v.constraint_id}: ${v.result} (confidence ${v.confidence.toFixed(2)})`);
    console.log(`  ${v.explanation}`);
  }
  if (values.save && !values.replay) {
    saveVerdicts(verdicts, values.save);
    console.error(`saved verdicts to ${values.save}`);
  }
  return 0;
}
