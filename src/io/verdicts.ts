/**
 * Verdict persistence (I/O edge). Kept out of the pure core checker so
 * `core/checker.ts` has no filesystem dependency (ADR-0006 layering).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { VerdictSchema, type Verdict } from "../core/models.js";

export function saveVerdicts(verdicts: Verdict[], path: string): void {
  writeFileSync(path, JSON.stringify(verdicts, null, 2));
}

export function loadVerdicts(path: string): Verdict[] {
  const data = JSON.parse(readFileSync(path, "utf8")) as unknown[];
  return data.map((v) => VerdictSchema.parse(v));
}
