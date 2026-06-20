#!/usr/bin/env node
/** radar CLI — extract / check / comment. */
import { parseArgs } from "node:util";
import {
  extractFromDir,
  adrSection,
  dumpConstraints,
} from "./extract.js";
import { loadDiff } from "./diff.js";
import { retrieve } from "./retrieve.js";
import { checkConstraint, saveVerdicts, loadVerdicts } from "./checker.js";
import { AnthropicAdapter, DEFAULT_MODEL } from "./llm.js";
import { reviewMarkdown } from "./comment.js";

function fail(msg: string): never {
  console.error(`error: ${msg}`);
  process.exit(2);
}

async function cmdExtract(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: { "adr-dir": { type: "string", default: "docs/adr" }, out: { type: "string" } },
  });
  const constraints = extractFromDir(values["adr-dir"]!);
  if (values.out) dumpConstraints(constraints, values.out);
  for (const c of constraints) {
    console.log(`${c.id}  [${c.check.type}/${c.enforce}/${c.severity}]  ${c.title}`);
  }
  console.error(`extracted ${constraints.length} constraint(s)`);
  return 0;
}

async function cmdCheck(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      diff: { type: "string" },
      model: { type: "string", default: DEFAULT_MODEL },
      save: { type: "string" },
      replay: { type: "string" },
    },
  });
  if (!values.diff) fail("check requires --diff");
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
    const client = new AnthropicAdapter({ model: values.model });
    verdicts = [];
    for (const [constraint, diffs] of inScope) {
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

// Render the review markdown from verdicts and print it to stdout. This command
// is platform-agnostic on purpose: it never posts or edits anything. The caller
// (the workflow / any adapter) takes this body and publishes it however it likes.
async function cmdComment(argv: string[]): Promise<number> {
  const { values } = parseArgs({
    args: argv,
    options: {
      "adr-dir": { type: "string", default: "docs/adr" },
      verdicts: { type: "string" },
      all: { type: "boolean", default: false },
    },
  });
  if (!values.verdicts) fail("comment requires --verdicts");
  const adrDir = values["adr-dir"]!;
  const constraints = extractFromDir(adrDir);
  let verdicts = loadVerdicts(values.verdicts);
  if (!values.all) verdicts = verdicts.filter((v) => v.result === "violated");
  const driverContexts: Record<string, string> = {};
  for (const c of constraints) driverContexts[c.adr] = adrSection(adrDir, c.adr, "Context");
  // Always emit a valid body — even with no verdicts, reviewMarkdown renders a
  // header + advisory note (a clean "nothing flagged" result), never empty output.
  console.log(reviewMarkdown(verdicts, constraints, driverContexts));
  return 0;
}

async function main(): Promise<number> {
  const [command, ...rest] = process.argv.slice(2);
  switch (command) {
    case "extract":
      return cmdExtract(rest);
    case "check":
      return cmdCheck(rest);
    case "comment":
      return cmdComment(rest);
    default:
      fail(`unknown command '${command ?? ""}' (expected: extract | check | comment)`);
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
