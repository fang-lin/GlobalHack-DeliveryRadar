/** Tolerant text -> validated T: extract a JSON object, zod-validate, never throw. */
import * as z from "zod/v4";

export function parseAgentJson<T>(text: string, schema: z.ZodType<T>): T | null {
  const candidate = extractJsonObject(text);
  if (!candidate) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(candidate);
  } catch {
    return null;
  }
  const parsed = schema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** First ```json fence, else a best-effort span from the first `{` to the last `}` (not a true balanced-brace parse — adequate for a single JSON object in the model's text). */
function extractJsonObject(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
