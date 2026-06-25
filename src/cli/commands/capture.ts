/** `radar capture` — investigate a merged PR's diff and draft Decision Notes. */
import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { extractFromDir } from "../../io/extract.ts";
import { loadDiff } from "../../io/diff.ts";
import { saveNotes, loadNotes } from "../../io/notes.ts";
import { decisionNotesMarkdown } from "../../core/capture-comment.ts";
import { runCapture } from "../../capture/agent.ts";
import { selectModel } from "../../agent/model.ts";
import { fail } from "../util.ts";
import type { DecisionNote } from "../../core/models.ts";
import type { LanguageModel, Tool } from "ai";

export async function cmdCapture(argv: string[], deps?: { makeModel?: () => LanguageModel; makeTools?: (root: string) => Record<string, Tool> }): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      skill: { type: "string", default: "skills/capture/SKILL.md" },
      root: { type: "string", default: process.cwd() },
      save: { type: "string" },
      replay: { type: "string" },
      verbose: { type: "boolean", short: "v", default: false },
    },
  });
  if (!values.diff) fail("capture requires --diff");
  if (values.verbose) process.env.RADAR_DEBUG = "1";

  let notes: DecisionNote[];
  if (values.replay) {
    notes = loadNotes(values.replay);
  } else {
    const constraints = extractFromDir(values["adr-dir"]!);
    const diffText = readFileSync(values.diff!, "utf8");
    loadDiff(values.diff!); // validate the diff parses (changed-file sanity)
    const skill = readFileSync(values.skill!, "utf8");
    const model = deps?.makeModel ? deps.makeModel() : selectModel(process.env);
    notes = await runCapture({ model, skill, diff: diffText, constraints, root: values.root!, tools: deps?.makeTools?.(values.root!) });
    if (values.save) saveNotes(notes, values.save);
  }

  console.error(`decision notes: ${notes.length}`);
  console.log(decisionNotesMarkdown(notes)); // draft body to stdout; the workflow posts it
  return 0;
}
