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
export function loadDotenv(key: string, start?: string): string | undefined {
  if (process.env[key]) return process.env[key];
  let dir = start ?? process.cwd();
  const root = parsePath(dir).root;
  for (;;) {
    const envFile = join(dir, ".env");
    if (existsSync(envFile)) {
      for (const raw of readFileSync(envFile, "utf8").split(/\r?\n/)) {
        const line = raw.trim();
        if (line.startsWith(`${key}=`)) {
          process.env[key] = line.slice(key.length + 1).trim().replace(/^"|"$/g, "");
          return process.env[key];
        }
      }
    }
    if (dir === root) break;
    dir = parsePath(dir).dir;
  }
  return process.env[key];
}

/**
 * Anthropic native adapter — schema-enforced structured output via
 * `messages.parse` + `zodOutputFormat`. The most reliable path; default for
 * Claude direct.
 */
export class AnthropicAdapter implements ModelClient {
  private client: Anthropic;
  private model: string;
  constructor(opts: { model?: string; apiKey?: string; baseURL?: string } = {}) {
    loadDotenv("ANTHROPIC_API_KEY");
    this.client = new Anthropic({
      ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    });
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
    // z.toJSONSchema emits a top-level "$schema" key that OpenAI/Vercel strict
    // json_schema mode rejects as an unknown root property — drop it.
    delete jsonSchema.$schema;
    const response_format =
      this.mode === "json_schema"
        ? ({ type: "json_schema", json_schema: { name: "verdict", schema: jsonSchema, strict: true } } as const)
        : ({ type: "json_object" } as const);
    // In json_object mode there is no schema channel, so the schema must ride in
    // the prompt. In json_schema mode response_format already carries it — don't
    // double-send (wasted tokens).
    const baseSystem =
      this.mode === "json_schema"
        ? o.system
        : `${o.system}\n\nReturn ONLY a JSON object matching this JSON Schema ` +
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

function jsonMode(env: NodeJS.ProcessEnv): "json_schema" | "json_object" {
  // json_object is the safe default (works on the widest set incl. DeepSeek);
  // opt into json_schema per the target's support via RADAR_JSON_MODE.
  return env.RADAR_JSON_MODE === "json_schema" ? "json_schema" : "json_object";
}

// OpenAI-compatible presets: a known base_url + the provider's native key var
// (+ optional headers). RADAR_BASE_URL overrides the base_url for any of them.
const COMPAT_PRESETS: Record<string, { baseURL: string; nativeKey: string; headers?: Record<string, string> }> = {
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    nativeKey: "OPENROUTER_API_KEY",
    headers: { "HTTP-Referer": "https://github.com/fang-lin/GlobalHack-DeliveryRadar", "X-Title": "Delivery Radar" },
  },
  vercel: { baseURL: "https://ai-gateway.vercel.sh/v1", nativeKey: "AI_GATEWAY_API_KEY" },
  "openai-compat": { baseURL: "", nativeKey: "RADAR_API_KEY" },
};

/**
 * Resolve a provider key: the native var first, then the universal RADAR_API_KEY
 * fallback, consulting .env for either. `||` (not `??`) so an empty-string var is
 * treated as unset and does not block the fallback. `loadDotenv` returns the value
 * AND populates process.env, so this works whether `env` is process.env or a
 * caller-supplied copy (e.g. the CLI's `--model` merged env).
 */
function resolveKey(env: NodeJS.ProcessEnv, nativeKey: string): string | undefined {
  return env[nativeKey] || env.RADAR_API_KEY || loadDotenv(nativeKey) || loadDotenv("RADAR_API_KEY") || undefined;
}

/**
 * Build the ModelClient from env config at the edge (ADR-0006/0007):
 *   RADAR_PROVIDER  = anthropic (default) | openrouter | vercel | openai-compat
 *   RADAR_MODEL     = model string (required for gateways; format is provider-specific)
 *   RADAR_BASE_URL  = override the endpoint (required for openai-compat; optional for any preset)
 *   RADAR_JSON_MODE = json_schema | json_object (default json_object)
 * Key resolution: the provider's native var (ANTHROPIC_API_KEY / OPENROUTER_API_KEY /
 * AI_GATEWAY_API_KEY) is preferred, with RADAR_API_KEY as the universal fallback.
 * Keys come from env (.env supported); never hard-coded.
 */
export function makeModelClient(env: NodeJS.ProcessEnv = process.env): ModelClient {
  const provider = env.RADAR_PROVIDER ?? "anthropic";
  const model = env.RADAR_MODEL;

  if (provider === "anthropic") {
    return new AnthropicAdapter({
      model: model ?? DEFAULT_MODEL,
      apiKey: resolveKey(env, "ANTHROPIC_API_KEY"),
      baseURL: env.RADAR_BASE_URL,
    });
  }

  const preset = COMPAT_PRESETS[provider];
  if (!preset) {
    throw new Error(
      `unknown RADAR_PROVIDER '${provider}' (expected: anthropic | openrouter | vercel | openai-compat)`,
    );
  }
  const baseURL = env.RADAR_BASE_URL || preset.baseURL;
  const apiKey = resolveKey(env, preset.nativeKey);
  if (!baseURL) throw new Error(`RADAR_PROVIDER=${provider} requires RADAR_BASE_URL`);
  if (!apiKey) throw new Error(`RADAR_PROVIDER=${provider} requires ${preset.nativeKey} or RADAR_API_KEY`);
  if (!model) throw new Error(`RADAR_PROVIDER=${provider} requires RADAR_MODEL`);
  return new OpenAICompatAdapter({ baseURL, apiKey, model, headers: preset.headers, mode: jsonMode(env) });
}
