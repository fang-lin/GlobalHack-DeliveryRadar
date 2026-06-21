/** `radar extract` — parse ADR constraint blocks and list them. */
import { parseArgs } from "node:util";
import { extractFromDir, dumpConstraints } from "../../io/extract.ts";

export async function cmdExtract(argv: string[]): Promise<number> {
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
