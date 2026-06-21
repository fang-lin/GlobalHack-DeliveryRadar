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

const { OpenAICompatAdapter } = await import("../../src/llm.js");

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
