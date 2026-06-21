import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the OpenAI SDK so factory construction is offline; `ctor` captures the
// options passed to `new OpenAI(...)` (baseURL / apiKey / headers).
const { create, ctor } = vi.hoisted(() => ({ create: vi.fn(), ctor: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
    constructor(opts: unknown) {
      ctor(opts);
    }
  },
}));

const { OpenAICompatAdapter, AnthropicAdapter, makeModelClient } = await import("../../src/llm.ts");

beforeEach(() => {
  create.mockReset();
  ctor.mockReset();
});

describe("makeModelClient factory (ADR-0007)", () => {
  // AnthropicAdapter constructs `new Anthropic()`, which needs a key present in env
  // (not validated here); openai-backed presets use the mocked OpenAI above.
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY ??= "test-key";
  });

  it("defaults to the Anthropic native adapter", () => {
    expect(makeModelClient({})).toBeInstanceOf(AnthropicAdapter);
  });
  it("builds an OpenAI-compat adapter for the openrouter preset", () => {
    const c = makeModelClient({
      RADAR_PROVIDER: "openrouter",
      OPENROUTER_API_KEY: "k",
      RADAR_MODEL: "anthropic/claude-sonnet-4-6",
    });
    expect(c).toBeInstanceOf(OpenAICompatAdapter);
  });
  it("a gateway preset requires its key and a model", () => {
    expect(() => makeModelClient({ RADAR_PROVIDER: "openrouter", RADAR_MODEL: "m" })).toThrow(/OPENROUTER_API_KEY/);
    expect(() => makeModelClient({ RADAR_PROVIDER: "openrouter", OPENROUTER_API_KEY: "k" })).toThrow(/RADAR_MODEL/);
  });
  it("the openai-compat escape hatch requires RADAR_BASE_URL", () => {
    expect(() => makeModelClient({ RADAR_PROVIDER: "openai-compat", RADAR_MODEL: "m" })).toThrow(/RADAR_BASE_URL/);
  });
  it("rejects an unknown provider", () => {
    expect(() => makeModelClient({ RADAR_PROVIDER: "nope" })).toThrow(/unknown RADAR_PROVIDER/);
  });
  it("falls back to RADAR_API_KEY when the provider's native key var is unset", () => {
    const c = makeModelClient({ RADAR_PROVIDER: "openrouter", RADAR_API_KEY: "uni", RADAR_MODEL: "m" });
    expect(c).toBeInstanceOf(OpenAICompatAdapter);
    expect(ctor.mock.calls[0][0].apiKey).toBe("uni");
  });
  it("RADAR_BASE_URL overrides a preset's endpoint", () => {
    makeModelClient({
      RADAR_PROVIDER: "vercel",
      AI_GATEWAY_API_KEY: "k",
      RADAR_MODEL: "m",
      RADAR_BASE_URL: "https://proxy.example/v1",
    });
    expect(ctor.mock.calls[0][0].baseURL).toBe("https://proxy.example/v1");
  });
  it("an empty native key falls back to RADAR_API_KEY (not blocked by ??)", () => {
    makeModelClient({ RADAR_PROVIDER: "openrouter", OPENROUTER_API_KEY: "", RADAR_API_KEY: "uni", RADAR_MODEL: "m" });
    expect(ctor.mock.calls[0][0].apiKey).toBe("uni");
  });
  it("reads keys only from the given env — no .env file (platform-agnostic, ADR-0006)", () => {
    // The factory must not consult a .env file; a key absent from the passed env throws.
    expect(() => makeModelClient({ RADAR_PROVIDER: "openrouter", RADAR_MODEL: "m" })).toThrow(
      /OPENROUTER_API_KEY or RADAR_API_KEY/,
    );
  });
});
