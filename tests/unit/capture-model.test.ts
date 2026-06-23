/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { selectCaptureModel } from "../../src/capture/model.ts";

describe("selectCaptureModel", () => {
  it("builds a native Anthropic model", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "anthropic", RADAR_MODEL: "claude-sonnet-4-5", ANTHROPIC_API_KEY: "x" } as any);
    expect(m).toBeTruthy();
  });
  it("builds a vercel-gateway model (DeepSeek)", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "vercel", RADAR_MODEL: "deepseek/deepseek-chat", AI_GATEWAY_API_KEY: "x" } as any);
    expect(m).toBeTruthy();
  });
  it("throws a clear error for vercel without a key", () => {
    expect(() => selectCaptureModel({ RADAR_PROVIDER: "vercel" } as any)).toThrow(/AI_GATEWAY_API_KEY/);
  });
  it("builds an openrouter model when OPENROUTER_API_KEY is set", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "openrouter", RADAR_MODEL: "openai/gpt-4o", OPENROUTER_API_KEY: "sk-or-test" } as any);
    expect(m).toBeTruthy();
  });
  it("builds an openrouter model when only RADAR_API_KEY is set (fallback)", () => {
    const m = selectCaptureModel({ RADAR_PROVIDER: "openrouter", RADAR_MODEL: "openai/gpt-4o", RADAR_API_KEY: "rk-test" } as any);
    expect(m).toBeTruthy();
  });
  it("throws naming OPENROUTER_API_KEY when no key is set for openrouter", () => {
    expect(() => selectCaptureModel({ RADAR_PROVIDER: "openrouter" } as any)).toThrow(/OPENROUTER_API_KEY/);
  });
});
