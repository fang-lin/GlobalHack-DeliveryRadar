/** Shared single-constraint conformance runner (edge — ADR-0010). */
import { buildUserPrompt, toVerdict, unknownVerdict } from "../core/checker.ts";
import { SemanticCheckOutputSchema, type Constraint, type Verdict } from "../core/models.ts";
import type { FileDiff } from "../io/diff.ts";
import { runAgent } from "./engine.ts";
import { buildTools } from "./tools.ts";
import type { LanguageModel, Tool } from "ai";

/** Run conformance for ONE in-scope constraint via the shared agent. */
export async function runConformanceCheck(opts: {
  model: LanguageModel;
  skill: string;
  constraint: Constraint;
  diffs: FileDiff[];
  driverContext: string;
  root: string;
  tools?: Record<string, Tool>;
}): Promise<Verdict> {
  const out = await runAgent({
    model: opts.model,
    skill: opts.skill,
    tools: opts.tools ?? buildTools(opts.root),
    user: buildUserPrompt(opts.constraint, opts.diffs, opts.driverContext),
    outputSchema: SemanticCheckOutputSchema,
    maxTokens: 16000,
  });
  return out ? toVerdict(opts.constraint, out) : unknownVerdict(opts.constraint);
}
