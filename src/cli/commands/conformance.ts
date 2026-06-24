/** `radar conformance` — judge a diff against in-scope ADR constraints via the agent. */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { extractFromDir, adrSection } from "../../io/extract.ts";
import { loadDiff } from "../../io/diff.ts";
import { retrieve } from "../../core/retrieve.ts";
import { buildUserPrompt, toVerdict } from "../../core/checker.ts";
import { SemanticCheckOutputSchema, type Verdict } from "../../core/models.ts";
import { saveVerdicts, loadVerdicts } from "../../io/verdicts.ts";
import { runAgent } from "../../agent/engine.ts";
import { buildTools } from "../../agent/tools.ts";
import { selectModel } from "../../agent/model.ts";
import { fail } from "../util.ts";

export async function cmdConformance(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      skill: { type: "string", default: "skills/conformance/SKILL.md" },
      root: { type: "string", default: process.cwd() },
      save: { type: "string" },
      replay: { type: "string" },
      verbose: { type: "boolean", short: "v", default: false },
    },
  });
  if (!values.diff) fail("conformance requires --diff");
  if (values.verbose) process.env.RADAR_DEBUG = "1";
  const adrDir = values["adr-dir"]!;
  const constraints = extractFromDir(adrDir);
  const fileDiffs = loadDiff(values.diff!);
  const inScope = retrieve(constraints, fileDiffs);
  console.error(
    `changed files: ${fileDiffs.length}; in-scope constraints: ` +
      `[${inScope.map(([c]) => `'${c.id}'`).join(", ")}]`,
  );

  let verdicts: Verdict[];
  if (values.replay) {
    verdicts = loadVerdicts(values.replay);
  } else {
    const model = selectModel(process.env);
    const skill = readFileSync(values.skill!, "utf8");
    const tools = buildTools(values.root!);
    verdicts = [];
    for (const [constraint, diffs] of inScope) {
      const context = adrSection(adrDir, constraint.adr, "Context");
      const out = await runAgent({
        model, skill, tools,
        user: buildUserPrompt(constraint, diffs, context),
        outputSchema: SemanticCheckOutputSchema,
        maxTokens: 16000,
      });
      // agent failed to produce a verdict → unknown (FR-CONF-6), never crash
      verdicts.push(
        out
          ? toVerdict(constraint, out)
          : { constraint_id: constraint.id, result: "unknown", confidence: 0,
              evidence: { adr_clause: constraint.id, code: null },
              explanation: "the checker could not produce a verdict", fix_locality: "none", fix_direction: null },
      );
    }
    if (values.save) {
      saveVerdicts(verdicts, values.save);
      console.error(`saved verdicts to ${values.save}`);
    }
  }
  for (const v of verdicts) {
    console.log(`${v.constraint_id}: ${v.result} (confidence ${v.confidence.toFixed(2)})`);
    console.log(`  ${v.explanation}`);
  }
  return 0;
}
