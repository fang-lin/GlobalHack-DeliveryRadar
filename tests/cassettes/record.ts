import type { LanguageModel, Tool } from "ai";
import { buildTools } from "../../src/agent/tools.ts";
import { digestInput, type ModelCall, type ToolCall } from "./cassette.ts";

export function recordingModel(real: LanguageModel, sink: ModelCall[]): LanguageModel {
  const m = real as unknown as { doGenerate: (o: unknown) => Promise<unknown> };
  const orig = m.doGenerate.bind(m);
  return new Proxy(real, {
    get(t, p, r) {
      if (p === "doGenerate") {
        return async (options: { prompt?: unknown }) => {
          const result = await orig(options);
          sink.push({ inputDigest: digestInput(options.prompt), result });
          return result;
        };
      }
      return Reflect.get(t, p, r);
    },
  }) as LanguageModel;
}

export function recordingTools(root: string, sink: ToolCall[]): Record<string, Tool> {
  const real = buildTools(root);
  return Object.fromEntries(
    Object.entries(real).map(([name, t]) => {
      const exec = (t as { execute: (i: unknown, o: unknown) => Promise<string> }).execute;
      return [name, { ...t, execute: async (input: unknown, opts: unknown) => {
        const output = await exec(input, opts);
        sink.push({ name, input, output });
        return output;
      } } as Tool];
    }),
  );
}
