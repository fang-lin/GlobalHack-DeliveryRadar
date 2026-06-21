/**
 * Model layer — the PORT (ADR-0007). The radar core depends ONLY on this
 * interface; provider / SDK specifics live in the adapter files, never in the
 * core (ADR-0007-C1).
 */
import type * as z from "zod/v4";

// Hackathon workspace policy: Opus-tier models are blocked (0 RPM); Sonnet is the
// strongest permitted model. Used as the default when no model is configured.
export const DEFAULT_MODEL = "claude-sonnet-4-6";

/**
 * The core's one LLM dependency: a prompt + a zod schema in, a validated object
 * out. Adapters implement structured output and retries however their provider
 * requires; the core never sees that.
 */
export interface ModelClient {
  complete<T>(opts: {
    system: string;
    user: string;
    schema: z.ZodType<T>;
    maxTokens?: number;
  }): Promise<T>;
}

/** Verbose tracing to stderr, gated on RADAR_DEBUG (set by the CLI's --verbose). */
export function debug(...args: unknown[]): void {
  if (process.env.RADAR_DEBUG) console.error("[radar]", ...args);
}
