/** Select the capture agent's model from env (ADR-0007 spirit, ADR-0006-C2: env only). */
import type { LanguageModel } from "ai";
import { gateway } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function selectCaptureModel(env: NodeJS.ProcessEnv): LanguageModel {
  const provider = env.RADAR_PROVIDER ?? "anthropic";
  const model = env.RADAR_MODEL;
  switch (provider) {
    case "anthropic": {
      if (!env.ANTHROPIC_API_KEY && !env.RADAR_API_KEY) throw new Error("anthropic provider requires ANTHROPIC_API_KEY");
      return anthropic(model ?? "claude-sonnet-4-5");
    }
    case "vercel": {
      if (!env.AI_GATEWAY_API_KEY && !env.RADAR_API_KEY) throw new Error("vercel provider requires AI_GATEWAY_API_KEY");
      return gateway(model ?? "deepseek/deepseek-chat");
    }
    case "openai-compat": {
      if (!env.RADAR_BASE_URL) throw new Error("openai-compat provider requires RADAR_BASE_URL");
      const p = createOpenAICompatible({ name: "radar", baseURL: env.RADAR_BASE_URL, apiKey: env.RADAR_API_KEY ?? "" });
      return p.chatModel(model ?? "");
    }
    default:
      throw new Error(`unknown RADAR_PROVIDER for capture: ${provider}`);
  }
}
