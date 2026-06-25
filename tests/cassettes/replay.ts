import { MockLanguageModelV3 } from "ai/test";
import { tool, type LanguageModel, type Tool } from "ai";
import * as z from "zod/v4";
import { digestInput, type Cassette } from "./cassette.ts";

export function replayModel(c: Cassette): LanguageModel {
  // MockLanguageModelV3 accepts a results array and returns one per doGenerate call, in order.
  return new MockLanguageModelV3({ doGenerate: c.modelCalls.map((m) => m.result) as never }) as unknown as LanguageModel;
}

export function replayTools(c: Cassette): Record<string, Tool> {
  let i = 0;
  const names = [...new Set(c.toolCalls.map((t) => t.name))];
  const make = (name: string): Tool =>
    tool({
      description: `replayed ${name}`,
      inputSchema: z.any(),
      execute: async (input: unknown) => {
        const rec = c.toolCalls[i++];
        if (!rec || rec.name !== name || digestInput(rec.input) !== digestInput(input)) {
          throw new Error(
            `cassette stale: expected ${rec?.name}(${rec ? digestInput(rec.input) : "—"}) ` +
              `but got ${name}(${digestInput(input)}). Re-record with RADAR_CASSETTE=update.`,
          );
        }
        return rec.output;
      },
    });
  return Object.fromEntries(names.map((n) => [n, make(n)]));
}
