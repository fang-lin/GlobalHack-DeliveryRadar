/**
 * OpenAI-compatible adapter — works with any OpenAI-compatible provider OR gateway
 * (OpenRouter, Vercel AI Gateway, DeepSeek, OpenAI, Azure, …) via base_url + key.
 * Structured output: `response_format` (json_schema where the target supports it,
 * else json_object), then JSON.parse + zod-validate + bounded retry — robust to
 * weaker/empty outputs (e.g. DeepSeek occasionally returns empty content).
 */
import OpenAI from "openai";
import * as z from "zod/v4";
import { debug, type ModelClient } from "./port.js";

export class OpenAICompatAdapter implements ModelClient {
  private client: OpenAI;
  private model: string;
  private baseURL: string;
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
    this.baseURL = o.baseURL;
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
    debug("openai-compat.complete", this.baseURL, "model=", this.model, "mode=", this.mode);
    let lastErr: unknown;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      debug("  attempt", attempt + 1, "of", this.maxRetries);
      let res;
      try {
        res = await this.client.chat.completions.create({
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
      } catch (e) {
        // A request-level error (e.g. 400 invalid request) won't succeed on retry —
        // fail fast, surfacing the provider's actual status + body, not a bare message.
        const err = e as { status?: number; message?: string; error?: unknown };
        if (typeof err.status === "number") {
          const body = err.error ? ` — ${JSON.stringify(err.error)}` : "";
          throw new Error(`${this.model} request failed: ${err.status} ${err.message ?? ""}${body}`);
        }
        throw e;
      }
      const content = res.choices[0]?.message?.content;
      debug("  response:", content ? `${content.length} chars` : "(empty)");
      if (!content) {
        lastErr = new Error("empty content from model");
        continue;
      }
      try {
        return o.schema.parse(JSON.parse(content));
      } catch (e) {
        debug("  parse/validate failed:", e instanceof Error ? e.message : String(e));
        lastErr = e;
      }
    }
    throw new Error(
      `model returned no valid structured output after ${this.maxRetries} tries: ` +
        (lastErr instanceof Error ? lastErr.message : String(lastErr)),
    );
  }
}
