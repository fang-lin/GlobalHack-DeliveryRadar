/**
 * The one investigative-agent engine (edge — ADR-0010). A tool loop on the
 * Vercel AI SDK, parameterized by { skill, user, tools, outputSchema }.
 * Dual-path: Output.object primary → text-parse fallback (ai@6 output+tools
 * bugs #11348/#10023). Total: returns null on any failure, never throws —
 * each operation decides what null means (e.g. capture → [], conformance → unknown).
 */
import { generateText, Output, stepCountIs, type LanguageModel, type Tool } from "ai";
import type * as z from "zod/v4";
import { parseAgentJson } from "./parse.ts";

export async function runAgent<T>(opts: {
  model: LanguageModel;
  skill: string;
  user: string;
  tools: Record<string, Tool>;
  outputSchema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<T | null> {
  const shared = {
    model: opts.model,
    system: opts.skill,
    prompt: opts.user,
    tools: opts.tools,
    stopWhen: stepCountIs(24), // tool rounds + the structured-output step
    ...(opts.maxTokens != null ? { maxOutputTokens: opts.maxTokens } : {}),
  } as const;
  try {
    const r = await generateText({ ...shared, output: Output.object({ schema: opts.outputSchema }) });
    const out = (r as { output?: T }).output;
    if (out != null) return out;
  } catch {
    // Primary path failed — fall through to text-parse.
  }
  try {
    const r = await generateText(shared);
    return parseAgentJson(r.text ?? "", opts.outputSchema);
  } catch {
    return null;
  }
}
