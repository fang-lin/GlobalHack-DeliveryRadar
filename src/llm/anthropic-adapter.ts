/**
 * Anthropic native adapter — schema-enforced structured output via
 * `messages.parse` + `zodOutputFormat`. The most reliable path; default for
 * Claude direct.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { DEFAULT_MODEL, debug, type ModelClient } from "./port.js";

export class AnthropicAdapter implements ModelClient {
  private client: Anthropic;
  private model: string;
  constructor(opts: { model?: string; apiKey?: string; baseURL?: string } = {}) {
    this.client = new Anthropic({
      ...(opts.apiKey ? { apiKey: opts.apiKey } : {}),
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    });
    this.model = opts.model ?? DEFAULT_MODEL;
  }
  async complete<T>(o: { system: string; user: string; schema: z.ZodType<T>; maxTokens?: number }): Promise<T> {
    debug("anthropic.complete model=", this.model, "maxTokens=", o.maxTokens ?? 16000);
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
    debug("anthropic.complete ok");
    return o.schema.parse(response.parsed_output);
  }
}
