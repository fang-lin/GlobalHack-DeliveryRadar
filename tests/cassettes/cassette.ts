import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export interface ModelCall { inputDigest: string; result: unknown }
export interface ToolCall { name: string; input: unknown; output: string }
export interface Cassette {
  meta: { op: string; case: string; recordedAt: string; model: string; jsonMode: string };
  modelCalls: ModelCall[];
  toolCalls: ToolCall[];
}

const DIR = new URL(".", import.meta.url).pathname; // tests/cassettes/

// Stable stringify (sorted keys) with volatile bits normalized, so a digest is
// reproducible regardless of key order or the per-run tmp dir in a path.
function normalize(v: unknown): unknown {
  if (typeof v === "string") return v.replace(/[/\\][^\s"]*radar-[A-Za-z0-9-]+[/\\]/g, "/<tmp>/");
  if (Array.isArray(v)) return v.map(normalize);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, normalize((v as Record<string, unknown>)[k])]));
  }
  return v;
}

export function digestInput(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(normalize(input))).digest("hex").slice(0, 16);
}

const file = (op: string, c: string, dir = DIR) => join(dir, `${op}-${c}.json`);

export function loadCassette(op: string, caseName: string, dir = DIR): Cassette {
  const path = file(op, caseName, dir);
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!raw || typeof raw !== "object") {
    throw new Error(`Malformed cassette ${path}: not an object`);
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.meta || typeof obj.meta !== "object" || Array.isArray(obj.meta)) {
    throw new Error(`Malformed cassette ${path}: missing or invalid meta`);
  }
  if (!Array.isArray(obj.modelCalls)) {
    throw new Error(`Malformed cassette ${path}: missing modelCalls`);
  }
  if (!Array.isArray(obj.toolCalls)) {
    throw new Error(`Malformed cassette ${path}: missing toolCalls`);
  }
  return raw as Cassette;
}

export function saveCassette(c: Cassette, dir = DIR): void {
  writeFileSync(file(c.meta.op, c.meta.case, dir), JSON.stringify(c, null, 2) + "\n");
}
