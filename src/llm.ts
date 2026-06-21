/**
 * Model layer (ADR-0007) — barrel. The port + adapters + factory are split into
 * `src/llm/` (one responsibility per file) for reviewability; this re-exports the
 * public surface so the rest of the codebase imports from "./llm.js" unchanged.
 *
 *   port.ts          — ModelClient contract (+ DEFAULT_MODEL, debug)
 *   anthropic.ts     — AnthropicAdapter (Claude native, schema-enforced)
 *   openai-compat.ts — OpenAICompatAdapter (any OpenAI-compatible provider/gateway)
 *   factory.ts       — makeModelClient(env): the composition root + presets
 */
export { DEFAULT_MODEL, debug, type ModelClient } from "./llm/port.js";
export { AnthropicAdapter } from "./llm/anthropic-adapter.js";
export { OpenAICompatAdapter } from "./llm/openai-compat-adapter.js";
export { makeModelClient } from "./llm/factory.js";
