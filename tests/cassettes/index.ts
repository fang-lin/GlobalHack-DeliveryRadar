import type { LanguageModel, Tool } from "ai";
import { selectModel } from "../../src/agent/model.ts";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadCassette, saveCassette, type Cassette, type ModelCall, type ToolCall } from "./cassette.ts";
import { createReplay } from "./replay.ts";
import { recordingModel, recordingTools } from "./record.ts";

const DIR = new URL(".", import.meta.url).pathname;

export function cassetteMode(): "replay" | "record" | "update" {
  const m = process.env.RADAR_CASSETTE;
  return m === "record" || m === "update" ? m : "replay";
}

export interface CassetteDeps {
  makeModel: () => LanguageModel;
  makeTools: (root: string) => Record<string, Tool>;
  mismatches?: string[]; // replay mode — assert empty after the run (stale gate)
  finalize?: () => void; // record/update mode — writes the cassette
}

export function cassetteDeps(op: string, caseName: string, dir = DIR): CassetteDeps {
  const mode = cassetteMode();
  const path = join(dir, `${op}-${caseName}.json`);
  if (mode === "replay" || (mode === "record" && existsSync(path))) {
    // Friendly error when the cassette file is missing in replay mode.
    if (!existsSync(path)) {
      throw new Error(`Cassette not found: ${path}. Record it with RADAR_CASSETTE=record (maintainer-triggered).`);
    }
    const c = loadCassette(op, caseName, dir);
    const r = createReplay(c);
    // Replay tools don't touch the filesystem, so `root` is unused.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return { makeModel: () => r.model, makeTools: (_root: string) => r.tools, mismatches: r.mismatches };
  }
  // record / update — spends API; maintainer-triggered.
  const modelCalls: ModelCall[] = [];
  const toolCalls: ToolCall[] = [];
  return {
    makeModel: () => recordingModel(selectModel(process.env), modelCalls),
    makeTools: (root: string) => recordingTools(root, toolCalls),
    finalize: () => {
      const c: Cassette = {
        meta: {
          op, case: caseName, recordedAt: new Date().toISOString().slice(0, 10),
          model: `${process.env.RADAR_PROVIDER}/${process.env.RADAR_MODEL}`,
          jsonMode: process.env.RADAR_JSON_MODE ?? "json_object",
        },
        modelCalls, toolCalls,
      };
      saveCassette(c, dir);
    },
  };
}
