/**
 * Composition root (ADR-0006/0007) — the ONLY place that knows the provider
 * presets. Picks + constructs the adapter from env at the CLI edge; the core
 * receives a `ModelClient`, blind to which concrete adapter.
 *
 *   RADAR_PROVIDER  = anthropic (default) | openrouter | vercel | openai-compat
 *   RADAR_MODEL     = model string (required for gateways; format is provider-specific)
 *   RADAR_BASE_URL  = override the endpoint (required for openai-compat; optional for any preset)
 *   RADAR_JSON_MODE = json_schema | json_object (default json_object)
 *
 * Key resolution: the provider's native var (ANTHROPIC_API_KEY / OPENROUTER_API_KEY /
 * AI_GATEWAY_API_KEY) is preferred, with RADAR_API_KEY as the universal fallback.
 * All config + keys come from the environment (process.env) only — the CLI never
 * reads a .env file (platform-agnostic, ADR-0006-C2); never hard-coded.
 */
import { DEFAULT_MODEL, debug, type ModelClient } from "./port.ts";
import { AnthropicAdapter } from "./anthropic-adapter.ts";
import { OpenAICompatAdapter } from "./openai-compat-adapter.ts";

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
 * Resolve a provider key from the environment: the native var first, then the
 * universal RADAR_API_KEY fallback. `||` (not `??`) so an empty-string var is
 * treated as unset and does not block the fallback. Reads only the given env
 * (process.env at the edge) — never a .env file (ADR-0006-C2).
 */
function resolveKey(env: NodeJS.ProcessEnv, nativeKey: string): string | undefined {
  return env[nativeKey] || env.RADAR_API_KEY || undefined;
}

export function makeModelClient(env: NodeJS.ProcessEnv = process.env): ModelClient {
  const provider = env.RADAR_PROVIDER ?? "anthropic";
  const model = env.RADAR_MODEL;

  if (provider === "anthropic") {
    debug("provider=anthropic model=", model ?? DEFAULT_MODEL);
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
  debug("provider=", provider, "model=", model, "baseURL=", baseURL, "jsonMode=", jsonMode(env));
  return new OpenAICompatAdapter({ baseURL, apiKey, model, headers: preset.headers, mode: jsonMode(env) });
}
