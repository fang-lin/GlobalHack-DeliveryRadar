/**
 * Ungrounded-LLM baseline (AC-1 contrast arm, demo slice).
 *
 * Same model, same diff, same PR context — but NO ADR/constraint grounding.
 * Demonstrates the class of violations ungrounded review misses:
 * letter honored, reason defeated.
 *
 * Run:  npx tsx scripts/baseline-review.ts <diff-file>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { DEFAULT_MODEL } from "../src/llm.ts";

const PR_TITLE = "Fix stale stock count on product page";
const PR_BODY =
  "Customers keep reporting that the product page shows items as in stock " +
  "when they are actually sold out (support ticket #1287). Read the stock " +
  "count directly from the primary database and lock the row, so the " +
  "displayed count is always exact.";

const SYSTEM =
  "You are an experienced AI code reviewer. Review the pull request diff " +
  "and point out any problems — bugs, design issues, risks. If the change " +
  "looks good, say so briefly.";

async function main(): Promise<void> {
  const diff = readFileSync(process.argv[2], "utf8");
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from the environment
  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `PR title: ${PR_TITLE}\n\nPR description:\n${PR_BODY}\n\nDiff:\n\`\`\`diff\n${diff}\n\`\`\``,
      },
    ],
  });
  const text = response.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  mkdirSync("artifacts", { recursive: true });
  writeFileSync(
    "artifacts/baseline-review.md",
    `# Ungrounded AI review (same model, no ADR grounding)\n\n${text}\n`,
  );
  console.log(text);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
