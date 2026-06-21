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
import OpenAI from "openai";
import * as z from "zod/v4";

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
    schema: z.ZodType<T>;
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
  async complete<T>(o: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T> {
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

/**
 * OpenAI-compatible adapter — works with any OpenAI-compatible provider OR gateway
 * (OpenRouter, Vercel AI Gateway, DeepSeek, OpenAI, Azure, …) via base_url + key.
 * Structured output: `response_format` (json_schema where the target supports it,
 * else json_object), then JSON.parse + zod-validate + bounded retry — robust to
 * weaker/empty outputs (e.g. DeepSeek occasionally returns empty content).
 */
export class OpenAICompatAdapter implements ModelClient {
  private client: OpenAI;
  private model: string;
  private mode: "json_schema" | "json_object";
  private maxRetries: number;
  constructor(o: {
    model: string;
    baseURL: string;
    apiKey?: string;
    headers?: Record<string, string>;
    mode?: "json_schema" | "json_object";
    maxRetries?: number;
  }) {
    this.client = new OpenAI({ baseURL: o.baseURL, apiKey: o.apiKey, defaultHeaders: o.headers });
    this.model = o.model;
    this.mode = o.mode ?? "json_object";
    this.maxRetries = o.maxRetries ?? 3;
  }
  async complete<T>(o: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T> {
    const jsonSchema = z.toJSONSchema(o.schema) as Record<string, unknown>;
    const response_format =
      this.mode === "json_schema"
        ? ({ type: "json_schema", json_schema: { name: "verdict", schema: jsonSchema, strict: true } } as const)
        : ({ type: "json_object" } as const);
    // Show the schema in the system prompt so the model knows the shape in BOTH modes
    // (required for json_object; harmless and helpful for json_schema).
    const baseSystem =
      `${o.system}\n\nReturn ONLY a JSON object matching this JSON Schema ` +
      `(no prose, no markdown):\n${JSON.stringify(jsonSchema)}`;
    let lastErr: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const res = await this.client.chat.completions.create({
        model: this.model,
        max_tokens: o.maxTokens ?? 16000,
        response_format,
        messages: [
          {
            role: "system",
            content:
              attempt === 0
                ? baseSystem
                : `${baseSystem}\n\nYour previous reply was not valid JSON for the schema. Reply with ONLY the JSON object.`,
          },
          { role: "user", content: o.user },
        ],
      });
      const content = res.choices[0]?.message?.content;
      if (!content) {
        lastErr = new Error("empty content from model");
        continue;
      }
      try {
        return o.schema.parse(JSON.parse(content));
      } catch (e) {
        lastErr = e;
      }
    }
    throw new Error(
      `model returned no valid structured output after ${this.maxRetries} tries: ` +
        (lastErr instanceof Error ? lastErr.message : String(lastErr)),
    );
  }
}
