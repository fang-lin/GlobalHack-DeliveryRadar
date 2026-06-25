#!/usr/bin/env node
/** radar CLI — entry point. Dispatches to one-file-per-command (cli/commands/). */
import { cmdExtract } from "./commands/extract.ts";
import { cmdConformance } from "./commands/conformance.ts";
import { cmdComment } from "./commands/comment.ts";
import { cmdCapture } from "./commands/capture.ts";
import { fail } from "./util.ts";

export async function dispatch(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  switch (command) {
    case "extract":
      return cmdExtract(rest);
    case "conformance":
      return cmdConformance(rest);
    case "comment":
      return cmdComment(rest);
    case "capture":
      return cmdCapture(rest);
    default:
      return fail(
        `unknown command '${command ?? ""}' (expected: extract | conformance | comment | capture)`,
      );
  }
}

// Only run as CLI entry point when executed directly (not when imported by tests).
const isMain =
  process.argv[1] != null &&
  import.meta.url === new URL(process.argv[1], "file://").href;

if (isMain) {
  dispatch(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    },
  );
}
