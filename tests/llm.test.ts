import { describe, it, expect, vi, beforeEach } from "vitest";
import * as z from "zod/v4";

// Mock the OpenAI SDK: every `new OpenAI(...)` gets a client whose
// chat.completions.create is this controllable spy.
const { create, ctor } = vi.hoisted(() => ({ create: vi.fn(), ctor: vi.fn() }));
vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create } };
    constructor(opts: unknown) {
      ctor(opts);
    }
  },
}));

const { OpenAICompatAdapter, AnthropicAdapter, makeModelClient } = await import("../src/llm.js");

const schema = z.object({ result: z.string(), n: z.number() });
const reply = (content: string | null) => ({ choices: [{ message: { content } }] });

beforeEach(() => {
  create.mockReset();
  ctor.mockReset();
});

describe("OpenAICompatAdapter (ADR-0007)", () => {
  it("json_object: retries past empty + bad JSON, then returns the validated object", async () => {
    create
      .mockResolvedValueOnce(reply("")) // empty
      .mockResolvedValueOnce(reply("not json at all")) // unparseable
      .mockResolvedValueOnce(reply(JSON.stringify({ result: "violated", n: 1 }))); // good
    const a = new OpenAICompatAdapter({ model: "m", baseURL: "https://x/v1", apiKey: "k", mode: "json_object" });
    const out = await a.complete({ system: "s", user: "u", schema });
    expect(out).toEqual({ result: "violated", n: 1 });
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("throws after maxRetries when the output never validates", async () => {
    create.mockResolvedValue(reply("")); // always empty
    const a = new OpenAICompatAdapter({ model: "m", baseURL: "https://x/v1", apiKey: "k", maxRetries: 2 });
    await expect(a.complete({ system: "s", user: "u", schema })).rejects.toThrow(/no valid structured output/);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("retries when the JSON parses but fails zod validation", async () => {
    create
      .mockResolvedValueOnce(reply(JSON.stringify({ result: "x" }))) // missing `n` → zod fails
      .mockResolvedValueOnce(reply(JSON.stringify({ result: "aligned", n: 2 }))); // good
    const a = new OpenAICompatAdapter({ model: "m", baseURL: "https://x/v1", apiKey: "k", mode: "json_object" });
    const out = await a.complete({ system: "s", user: "u", schema });
    expect(out).toEqual({ result: "aligned", n: 2 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("json_schema mode: returns the validated content (and asks for json_schema response_format)", async () => {
    create.mockResolvedValueOnce(reply(JSON.stringify({ result: "aligned", n: 7 })));
    const a = new OpenAICompatAdapter({ model: "m", baseURL: "https://x/v1", apiKey: "k", mode: "json_schema" });
    const out = await a.complete({ system: "s", user: "u", schema });
    expect(out).toEqual({ result: "aligned", n: 7 });
    expect(create.mock.calls[0][0].response_format.type).toBe("json_schema");
  });

  it("json_schema mode strips the top-level $schema key (strict mode rejects it)", async () => {
    create.mockResolvedValueOnce(reply(JSON.stringify({ result: "aligned", n: 1 })));
    const a = new OpenAICompatAdapter({ model: "m", baseURL: "https://x/v1", apiKey: "k", mode: "json_schema" });
    await a.complete({ system: "s", user: "u", schema });
    const sent = create.mock.calls[0][0].response_format.json_schema.schema;
    expect(sent.$schema).toBeUndefined();
    expect(sent.type).toBe("object");
  });
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
  it("reads keys only from the given env — no .envrc file (platform-agnostic, ADR-0006)", () => {
    // The factory must not consult a .envrc file; a key absent from the passed env throws.
    expect(() => makeModelClient({ RADAR_PROVIDER: "openrouter", RADAR_MODEL: "m" })).toThrow(
      /OPENROUTER_API_KEY or RADAR_API_KEY/,
    );
  });
});
