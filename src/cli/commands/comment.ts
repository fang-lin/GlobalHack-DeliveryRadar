/**
 * `radar comment` — render the review markdown from verdicts and print it.
 * Platform-agnostic on purpose: it never posts or edits anything (ADR-0006-C1);
 * the caller (workflow / any adapter) publishes the body however it likes.
 */
import { parseArgs } from "node:util";
import { extractFromDir, adrSection } from "../../io/extract.ts";
import { loadVerdicts } from "../../io/verdicts.ts";
import { reviewMarkdown } from "../../core/comment.ts";
import { fail } from "../util.ts";

export async function cmdComment(argv: string[]): Promise<number> {
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
