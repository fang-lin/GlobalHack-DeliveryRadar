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
 *   AI_GATEWAY_API_KEY or RADAR_API_KEY                       (required)
 *
 * Run:  set -a; source .env; set +a
 *       npx tsx scripts/probe-provider.ts
 */
import OpenAI from "openai";

type CreateParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;

const model = process.env.RADAR_MODEL;
const baseURL = process.env.RADAR_BASE_URL || "https://ai-gateway.vercel.sh/v1";
const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.RADAR_API_KEY;

if (!model) {
  console.error("set RADAR_MODEL (e.g. deepseek/deepseek-v4-pro)");
  process.exit(2);
}
if (!apiKey) {
  console.error("set AI_GATEWAY_API_KEY or RADAR_API_KEY (source your .env first)");
  process.exit(2);
}

const client = new OpenAI({ baseURL, apiKey });

// Mock data — trivial; we only care which request SHAPE the provider accepts.
const messages: CreateParams["messages"] = [
  { role: "system", content: "You are a JSON API. Reply with a single JSON object and nothing else." },
  { role: "user", content: 'Return exactly {"ok": true}.' },
];
const probeSchema = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  additionalProperties: false,
};

// Each variant patches the base request; we report which the provider accepts.
const variants: { name: string; body: Partial<CreateParams> }[] = [
  { name: "json_object + max_tokens", body: { max_tokens: 200, response_format: { type: "json_object" } } },
  {
    name: "json_schema + max_tokens",
    body: {
      max_tokens: 200,
      response_format: { type: "json_schema", json_schema: { name: "probe", schema: probeSchema, strict: true } },
    },
  },
  { name: "no response_format + max_tokens", body: { max_tokens: 200 } },
  { name: "no response_format + max_completion_tokens", body: { max_completion_tokens: 200 } },
  {
    name: "json_object + max_completion_tokens",
    body: { max_completion_tokens: 200, response_format: { type: "json_object" } },
  },
];

async function main(): Promise<void> {
  console.log(`probing ${model} @ ${baseURL}\n`);
  for (const v of variants) {
    try {
      const res = await client.chat.completions.create({ model: model!, messages, ...v.body });
      const content = (res.choices?.[0]?.message?.content ?? "").replace(/\s+/g, " ").trim();
      console.log(`✅ ${v.name}`);
      console.log(`     content: ${content.slice(0, 100) || "(empty)"}`);
    } catch (e) {
      const err = e as { status?: number; message?: string; error?: unknown };
      const body = err.error ? ` — ${JSON.stringify(err.error)}` : "";
      console.log(`❌ ${v.name}`);
      console.log(`     ${err.status ?? "?"} ${err.message ?? String(e)}${body}`);
    }
  }
  console.log("\nPick the first ✅ shape; that tells us what the adapter should send for this model.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
