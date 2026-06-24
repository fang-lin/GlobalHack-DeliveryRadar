/** Read-only investigation tools for the capture agent (edge — ADR-0009). */
import { tool, type Tool } from "ai";
import * as z from "zod/v4";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, relative, isAbsolute } from "node:path";

const MAX = 20000; // cap tool output to keep the context bounded
const GIT_READONLY = new Set(["log", "blame", "show", "diff", "ls-files"]);

function inRoot(root: string, p: string): string | null {
  const abs = resolve(root, p);
  const rel = relative(root, abs);
  if (rel.startsWith("..") || isAbsolute(rel)) return null;
  return abs;
}

export function buildTools(root: string): Record<string, Tool> {
  return {
    read_file: tool({
      description: "Read a UTF-8 file from the repository (read-only).",
      inputSchema: z.object({ path: z.string().describe("repo-relative path") }),
      execute: async ({ path }) => {
        const abs = inRoot(root, path);
        if (!abs) return `path is outside the repo root — not allowed`;
        try {
          return readFileSync(abs, "utf8").slice(0, MAX);
        } catch (e) {
          return `could not read ${path}: ${(e as Error).message}`;
        }
      },
    }),
    grep: tool({
      description:
        "Search the repository for a LITERAL substring (not a regex); returns matching lines with file:line.",
      inputSchema: z.object({ pattern: z.string(), path: z.string().default(".") }),
      execute: async ({ pattern, path }) => {
        const abs = inRoot(root, path);
        if (!abs) return `path is outside the repo root — not allowed`;
        try {
          // -F: fixed-string (literal) match — the pattern is an arbitrary
          // model-supplied string, so treat metacharacters like ( ) literally
          // rather than as a regex (which errors on e.g. "fetch(").
          return execFileSync("grep", ["-rnIF", "--", pattern, abs], {
            encoding: "utf8", maxBuffer: 4 * MAX, cwd: root, timeout: 10000,
          }).slice(0, MAX);
        } catch {
          return "no matches"; // grep exits non-zero on no match
        }
      },
    }),
    git: tool({
      description:
        "Run a READ-ONLY git command for history/blame (e.g. log, blame, show, diff).",
      inputSchema: z.object({ args: z.array(z.string()).describe("git args, e.g. ['log','-p','file']") }),
      execute: async ({ args }) => {
        if (args.length === 0 || !GIT_READONLY.has(args[0])) {
          return `only read-only git subcommands are allowed: ${[...GIT_READONLY].join(", ")}`;
        }
        try {
          return execFileSync("git", args, { encoding: "utf8", maxBuffer: 4 * MAX, cwd: root, timeout: 10000 })
            .slice(0, MAX);
        } catch (e) {
          return `git failed: ${(e as Error).message}`;
        }
      },
    }),
  };
}
