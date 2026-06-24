/**
 * Provider request probe — a DIAGNOSTIC (not a unit test: it hits the live API).
 *
 * Sends a tiny mock request several ways to discover which request shape a given
 * OpenAI-compatible model/gateway actually accepts — e.g. does DeepSeek V4 Pro on
 * Vercel accept `response_format` json_object / json_schema / none, and does it
 * want `max_tokens` or `max_completion_tokens`? Prints one ✅/❌ line per variant
 * with the provider's status + error body, so you can pick the working shape
 * without guessing.
 *
 * Config from the environment only (ADR-0006) — source your .env first:
 *   RADAR_MODEL        e.g. deepseek/deepseek-v4-pro          (required)
 *   RADAR_BASE_URL     default https://ai-gateway.vercel.sh/v1
 *   RADAR_PROVIDER     openai-compat | vercel | openrouter | anthropic (default: openai-compat)
 *   AI_GATEWAY_API_KEY or RADAR_API_KEY                       (required for non-anthropic)
 *
 * Run:  set -a; source .env; set +a
 *       npx tsx scripts/probe-provider.ts
 */
import { selectModel } from "../src/agent/model.ts";
import { generateText } from "ai";
import * as z from "zod/v4";

const modelId = process.env.RADAR_MODEL;
const baseURL = process.env.RADAR_BASE_URL || "https://ai-gateway.vercel.sh/v1";

if (!modelId) {
  console.error("set RADAR_MODEL (e.g. deepseek/deepseek-v4-pro)");
  process.exit(2);
}

const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.RADAR_API_KEY;
if (!apiKey && !process.env.ANTHROPIC_API_KEY) {
  console.error("set AI_GATEWAY_API_KEY or RADAR_API_KEY (source your .env first)");
  process.exit(2);
}

const probeSchema = z.object({ ok: z.boolean() });

// Each variant tests a different maxTokens value (main thing that differs across providers).
const variants: { name: string; maxTokens?: number }[] = [
  { name: "maxTokens=200", maxTokens: 200 },
  { name: "maxTokens=500", maxTokens: 500 },
  { name: "no maxTokens" },
];

async function main(): Promise<void> {
  console.log(`probing ${modelId} @ ${baseURL}\n`);
  const model = selectModel(process.env);
  for (const v of variants) {
    try {
      const res = await generateText({
        model,
        system: "You are a JSON API. Reply with a single JSON object and nothing else.",
        prompt: 'Return exactly {"ok": true}.',
        maxTokens: v.maxTokens,
      });
      const content = res.text.replace(/\s+/g, " ").trim();
      console.log(`✅ ${v.name}`);
      console.log(`     content: ${content.slice(0, 100) || "(empty)"}`);
    } catch (e) {
      const err = e as { status?: number; message?: string; error?: unknown };
      const body = err.error ? ` — ${JSON.stringify(err.error)}` : "";
      console.log(`❌ ${v.name}`);
      console.log(`     ${err.status ?? "?"} ${err.message ?? String(e)}${body}`);
    }
  }
  void probeSchema; // schema kept for reference; AI SDK handles output shaping
  console.log("\nPick the first ✅ shape; that tells us what the adapter should send for this model.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
