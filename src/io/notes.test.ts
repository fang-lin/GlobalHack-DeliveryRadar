import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveNotes, loadNotes } from "./notes.ts";

describe("notes save/load", () => {
  it("round-trips notes through a file", () => {
    const notes = [{
      detected_decision: "x", evidence: [{ file: "a.ts", lines: [1, 2] }],
      suggested_class: "behavioral" as const, draft_rationale: "r",
      confidence: 0.5, why_net_new: "n",
    }];
    const p = join(mkdtempSync(join(tmpdir(), "radar-")), "notes.json");
    saveNotes(notes, p);
    expect(loadNotes(p)).toEqual(notes);
  });
});
