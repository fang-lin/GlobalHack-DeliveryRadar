/**
 * Capture investigative agent (edge — ADR-0009). A hand-written tool loop on the
 * Vercel AI SDK: the skill (instructions) + the diff + the recorded constraints
 * drive read-only investigation; output is a zod-validated DecisionNote[].
 * Advisory: any failure yields [] rather than crashing the check.
 *
 * Thin wrapper over runAgent (ADR-0010): dual-path logic lives in the engine.
 */
import type { LanguageModel } from "ai";
import { CaptureOutputSchema, type Constraint, type DecisionNote } from "../core/models.ts";
import { buildTools } from "../agent/tools.ts";
import { runAgent } from "../agent/engine.ts";

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
  const out = await runAgent({
    model: opts.model,
    skill: opts.skill,
    user: buildCaptureUserPrompt(opts.diff, opts.constraints),
    tools: buildTools(opts.root),
    outputSchema: CaptureOutputSchema,
  });
  return out?.notes ?? [];
}
