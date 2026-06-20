/**
 * Model layer (ADR-0007). The radar core depends ONLY on the `ModelClient` port;
 * provider / SDK specifics live here in the adapters, never in the core
 * (ADR-0007-C1). The client is selected/constructed by `makeModelClient(env)` at
 * the CLI edge (added in a later task) and injected into the core.
 */
import { readFileSync, existsSync } from "node:fs";
import { parse as parsePath, join } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ZodType } from "zod/v4";

// Hackathon workspace policy: Opus-tier models are blocked (0 RPM); Sonnet is the
// strongest permitted model. Used as the default when no model is configured.
export const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * The core's one LLM dependency: a prompt + a zod schema in, a validated object
 * out. Adapters implement structured output and retries however their provider
 * requires; the core never sees that.
 */
export interface ModelClient {
  complete<T>(opts: {
    system: string;
    user: string;
    schema: ZodType<T>;
    maxTokens?: number;
  }): Promise<T>;
}

/**
 * Minimal .env loader — sets `key` from the nearest .env if not already in the
 * environment. No third-party dependency. Config/infra, lives in the model layer
 * (not the core), and is invoked by the adapters/factory at the edge.
 */
export function loadDotenv(key: string, start?: string): void {
  if (process.env[key]) return;
  let dir = start ?? process.cwd();
  const root = parsePath(dir).root;
  for (;;) {
    const envFile = join(dir, ".env");
    if (existsSync(envFile)) {
      for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith(`${key}=`)) {
          process.env[key] = line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
          return;
        }
      }
    }
    if (dir === root) break;
    dir = parsePath(dir).dir;
  }
}

/**
 * Anthropic native adapter — schema-enforced structured output via
 * `messages.parse` + `zodOutputFormat`. The most reliable path; default for
 * Claude direct.
 */
export class AnthropicAdapter implements ModelClient {
  private client: Anthropic;
  private model: string;
  constructor(opts: { model?: string } = {}) {
    loadDotenv("ANTHROPIC_API_KEY");
    this.client = new Anthropic();
    this.model = opts.model ?? DEFAULT_MODEL;
  }
  async complete<T>(o: { system: string; user: string; schema: ZodType<T>; maxTokens?: number }): Promise<T> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: o.maxTokens ?? 16000,
      thinking: { type: "adaptive" },
      system: o.system,
      messages: [{ role: "user", content: o.user }],
      output_config: { format: zodOutputFormat(o.schema) },
    });
    if (response.parsed_output == null) {
      throw new Error("model returned no structured output");
    }
    return o.schema.parse(response.parsed_output);
  }
}
