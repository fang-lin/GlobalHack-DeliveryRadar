import { MockLanguageModelV3 } from "ai/test";
import { tool, type LanguageModel, type Tool } from "ai";
import * as z from "zod/v4";
import { digestInput, type Cassette } from "./cassette.ts";
import { buildTools } from "../../src/agent/tools.ts";

export const SYNTHETIC = "synthetic";

export interface Replay {
  model: LanguageModel;
  tools: Record<string, Tool>;
  mismatches: string[];
}

// Normalise a model result so it is compatible with the Vercel AI SDK's
// MockLanguageModelV3: tool-call `input` must be a JSON string (the SDK calls
// `.trim()` on it before parsing), but cassettes store it as a plain object
// for readability. This function converts in-place without mutating the original.
function normResult(result: unknown): unknown {
  if (!result || typeof result !== "object") return result;
  const r = result as Record<string, unknown>;
  if (!Array.isArray(r.content)) return result;
  return {
    ...r,
    content: (r.content as unknown[]).map((item) => {
      if (item && typeof item === "object" && (item as Record<string, unknown>).type === "tool-call") {
        const c = item as Record<string, unknown>;
        return { ...c, input: typeof c.input === "string" ? c.input : JSON.stringify(c.input) };
      }
      return item;
    }),
  };
}

// Replay drives a REAL runAgent loop from a recorded cassette. Each model/tool
// call's input is verified against the recording; a mismatch is RECORDED into
// `mismatches` (not thrown — the engine swallows thrown tool errors into its
// loop, making a throw silent). A stale cassette is caught by asserting
// `mismatches` is empty after the run.
export function createReplay(c: Cassette): Replay {
  const mismatches: string[] = [];
  let mi = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async (options: { prompt?: unknown }) => {
      const rec = c.modelCalls[mi++];
      if (!rec) {
        mismatches.push(`unexpected model call #${mi}: cassette has only ${c.modelCalls.length}`);
        return normResult(c.modelCalls.at(-1)?.result) as never;
      }
      // SYNTHETIC sentinel DISABLES model-input verification for this call.
      //
      // Why: synthetic cassettes are hand-authored; the exact prompt that runAgent
      // will produce cannot be predicted at authoring time, so no real digest can
      // be embedded.  The sentinel lets the replay proceed without a spurious
      // mismatch.
      //
      // REAL recordings (recorded in Task 9 against a live provider) carry a
      // sha256 digest of the actual prompt that was sent.  For those calls
      // rec.inputDigest !== SYNTHETIC, so the gate below IS live: any change to
      // the skill file, the user prompt, or the retrieve pipeline that alters
      // what the model sees will produce a digest mismatch and turn the test RED.
      //
      // Consequence: prompt/skill drift is caught ONLY against real cassettes.
      // Synthetic cassettes guard tool-call order/inputs and agent output shape,
      // but they do NOT guard the model-input prompt.
      if (rec.inputDigest !== SYNTHETIC && digestInput(options.prompt) !== rec.inputDigest) {
        mismatches.push(`model call #${mi} input drift: recorded ${rec.inputDigest}, got ${digestInput(options.prompt)}`);
      }
      return normResult(rec.result) as never;
    },
  }) as unknown as LanguageModel;

  // Build real tools once so we can reuse their inputSchema (with zod defaults).
  // The root path is irrelevant here — we only need the schema, never execute real tools.
  const realTools = buildTools(process.cwd());

  let ti = 0;
  const names = [...new Set(c.toolCalls.map((t) => t.name))];
  const make = (name: string): Tool =>
    tool({
      description: `replayed ${name}`,
      inputSchema: realTools[name]?.inputSchema ?? z.any(),
      execute: async (input: unknown) => {
        const rec = c.toolCalls[ti++];
        if (!rec || rec.name !== name || digestInput(rec.input) !== digestInput(input)) {
          mismatches.push(
            `tool call #${ti} drift: expected ${rec?.name ?? "—"}(${rec ? digestInput(rec.input) : "—"}), ` +
              `got ${name}(${digestInput(input)})`,
          );
          return rec?.output ?? "";
        }
        return rec.output;
      },
    });
  const tools = Object.fromEntries(names.map((n) => [n, make(n)]));
  return { model, tools, mismatches };
}
