/** Tolerant text -> DecisionNote[]: extract a JSON object, zod-validate, never throw. */
import { CaptureOutputSchema, type DecisionNote } from "../core/models.ts";

export function parseCaptureNotes(text: string): DecisionNote[] {
  const candidate = extractJsonObject(text);
  if (!candidate) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(candidate);
  } catch {
    return [];
  }
  const parsed = CaptureOutputSchema.safeParse(raw);
  return parsed.success ? parsed.data.notes : [];
}

/** First ```json fence, else the first balanced {...} block. */
function extractJsonObject(text: string): string | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}
