/** Persist/replay capture's Decision Notes (demo determinism — mirrors verdicts.ts). */
import { readFileSync, writeFileSync } from "node:fs";
import * as z from "zod/v4";
import { DecisionNoteSchema, type DecisionNote } from "../core/models.ts";

export function saveNotes(notes: DecisionNote[], path: string): void {
  writeFileSync(path, JSON.stringify(notes, null, 2));
}

export function loadNotes(path: string): DecisionNote[] {
  const data = JSON.parse(readFileSync(path, "utf8"));
  return z.array(DecisionNoteSchema).parse(data);
}
