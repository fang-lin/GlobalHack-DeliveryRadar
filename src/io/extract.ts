/**
 * Constraint extraction core (FR-EXT-1, FR-EXT-3).
 *
 * Parses the fenced `constraints` YAML block of an ADR markdown file into
 * DM-CONSTRAINT objects. ADRs remain the source of truth (FR-INT-2); any dump
 * produced here is a derived cache.
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";
import { validateConstraint, type Constraint } from "../core/models.js";

const FENCE_RE = /^```constraints\s*$(.*?)^```\s*$/gms;
const SECTION_RE = /^##\s+(.+?)\s*$/gm;

/** Extract all constraints from one ADR document. */
export function extractFromText(text: string, source = "<text>"): Constraint[] {
  const constraints: Constraint[] = [];
  for (const match of text.matchAll(FENCE_RE)) {
    const data = yaml.load(match[1]);
    if (data == null) continue;
    const items = Array.isArray(data) ? data : [data];
    for (const item of items) {
      try {
        constraints.push(validateConstraint(item));
      } catch (exc) {
        const msg = exc instanceof Error ? exc.message : String(exc);
        throw new Error(`${source}: invalid constraint: ${msg}`);
      }
    }
  }
  return constraints;
}

/** Extract constraints from every ADR-*.md under adrDir; reject duplicate ids. */
export function extractFromDir(adrDir: string): Constraint[] {
  const files = readdirSync(adrDir)
    .filter((f) => /^ADR-.*\.md$/.test(f))
    .sort();
  const constraints: Constraint[] = [];
  for (const f of files) {
    const p = join(adrDir, f);
    constraints.push(...extractFromText(readFileSync(p, "utf8"), p));
  }
  const seen = new Set<string>();
  for (const c of constraints) {
    if (seen.has(c.id)) {
      throw new Error(`duplicate constraint id ${c.id} (DM-CONSTRAINT-2)`);
    }
    seen.add(c.id);
  }
  return constraints;
}

/**
 * Return one section's prose from an ADR file (used to ground the semantic
 * checker with the driver rationale, FR-CONF-5).
 */
export function adrSection(adrDir: string, adrId: string, section = "Context"): string {
  const all = readdirSync(adrDir);
  let matches = all.filter((f) => f.startsWith(`${adrId}-`) && f.endsWith(".md")).sort();
  if (matches.length === 0) matches = all.filter((f) => f === `${adrId}.md`);
  if (matches.length === 0) return "";
  const text = readFileSync(join(adrDir, matches[0]), "utf8");
  // split with a capturing group keeps the titles: [pre, title1, body1, title2, body2, ...]
  const parts = text.split(SECTION_RE);
  for (let i = 1; i + 1 < parts.length; i += 2) {
    if (parts[i].trim().toLowerCase() === section.toLowerCase()) {
      return parts[i + 1].trim();
    }
  }
  return "";
}

export function dumpConstraints(constraints: Constraint[], path: string): void {
  const payload = constraints.map((c) =>
    JSON.parse(JSON.stringify(c, (_k, v) => (v == null ? undefined : v))),
  );
  writeFileSync(path, yaml.dump(payload, { sortKeys: false, lineWidth: -1 }));
}

export function loadConstraints(path: string): Constraint[] {
  const data = (yaml.load(readFileSync(path, "utf8")) as unknown[]) ?? [];
  return data.map((item) => validateConstraint(item));
}
