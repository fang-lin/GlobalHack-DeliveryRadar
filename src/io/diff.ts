/**
 * Unified-diff parsing — one pass over the PR diff shared by conformance and
 * (later) capture (FR-ARCH-1).
 */
import { readFileSync } from "node:fs";

export interface FileDiff {
  path: string; // post-change path
  text: string; // the file's full diff segment (headers + hunks)
}

const FILE_HEADER_RE = /^diff --git a\/(?<a>\S+) b\/(?<b>\S+)/gm;

export function parseUnifiedDiff(text: string): FileDiff[] {
  const matches = [...text.matchAll(FILE_HEADER_RE)];
  const diffs: FileDiff[] = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? text.length) : text.length;
    const segment = text.slice(start, end);
    let path = m.groups!.b;
    if (segment.includes("+++ /dev/null")) {
      path = m.groups!.a; // deleted file — keep pre-change path
    }
    diffs.push({ path, text: segment.replace(/\n+$/, "") });
  }
  return diffs;
}

export function loadDiff(path: string): FileDiff[] {
  return parseUnifiedDiff(readFileSync(path, "utf8"));
}
