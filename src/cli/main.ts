#!/usr/bin/env node
/** radar CLI — entry point. Dispatches to one-file-per-command (cli/commands/). */
import { cmdExtract } from "./commands/extract.js";
import { cmdCheck } from "./commands/check.js";
import { cmdComment } from "./commands/comment.js";
import { fail } from "./util.js";

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
