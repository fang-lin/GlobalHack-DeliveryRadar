/**
 * Capture investigative agent (edge — ADR-0009). A hand-written tool loop on the
 * Vercel AI SDK: the skill (instructions) + the diff + the recorded constraints
 * drive read-only investigation; output is a zod-validated DecisionNote[].
 * Advisory: any failure yields [] rather than crashing the check.
 *
 * Dual-path strategy:
 *  1. Primary: generateText with Output.object → result.output.notes (ai@6 structured output).
 *  2. Fallback A: if Output.object throws (ai@6 open bugs #11348/#10023 on output+tools,
 *     or mock emitting fenced JSON), retry without structured output and parse result.text.
 *  3. Fallback B: parseAgentJson tolerantly extracts from any text that contains JSON.
 *  4. Final: [] — advisory, never crashes the check.
 */
import { generateText, Output, stepCountIs, type LanguageModel } from "ai";
import { CaptureOutputSchema, type Constraint, type DecisionNote } from "../core/models.ts";
import { buildTools } from "../agent/tools.ts";
import { parseAgentJson } from "../agent/parse.ts";

export function buildCaptureUserPrompt(diff: string, constraints: Constraint[]): string {
  const recorded = constraints.map((c) => `- ${c.id} (${c.adr}): ${c.title}`).join("\n") || "(none)";
  return [
    "## Already-recorded constraints (do NOT re-flag these)",
    recorded,
    "",
    "## The merged pull-request diff",
    "```diff",
    diff,
    "```",
    "",
    "Investigate (read files / grep / read-only git as your skill directs) and return " +
      "the JSON object of Decision Notes. Returning an empty notes list is valid and expected " +
      "when nothing implicit, net-new and architecturally significant was decided.",
  ].join("\n");
}

export async function runCapture(opts: {
  model: LanguageModel;
  skill: string;
  diff: string;
  constraints: Constraint[];
  root: string;
}): Promise<DecisionNote[]> {
  const tools = buildTools(opts.root);
  const user = buildCaptureUserPrompt(opts.diff, opts.constraints);
  const shared = {
    model: opts.model,
    system: opts.skill,
    prompt: user,
    tools,
    stopWhen: stepCountIs(24), // tool rounds + the structured-output step
  } as const;

  // Primary path: structured output (preferred for real providers).
  let structuredResult: { output?: { notes?: DecisionNote[] }; text?: string } | undefined;
  try {
    structuredResult = await generateText({
      ...shared,
      output: Output.object({ schema: CaptureOutputSchema }),
    });
    const out = structuredResult.output;
    if (out?.notes && Array.isArray(out.notes)) return out.notes;
  } catch {
    // Primary path failed (ai@6 output+tools bugs, or mock emitting fenced JSON).
    // Fall through to text-parse fallback.
  }

  // Text-parse fallback: run without Output.object to get raw text, then parse tolerantly.
  try {
    const textResult = await generateText(shared);
    return parseAgentJson(textResult.text ?? "", CaptureOutputSchema)?.notes ?? [];
  } catch {
    return []; // advisory — never crash the check
  }
}
