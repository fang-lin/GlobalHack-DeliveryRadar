#!/usr/bin/env node
/** radar CLI — entry point. Dispatches to one-file-per-command (cli/commands/). */
import { cmdExtract } from "./commands/extract.ts";
import { cmdCheck } from "./commands/check.ts";
import { cmdComment } from "./commands/comment.ts";
import { fail } from "./util.ts";

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
      return fail(`unknown command '${command ?? ""}' (expected: extract | check | comment)`);
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  },
);
