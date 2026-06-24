/**
 * Replay / precision harness (capability #11).
 *
 * Runs two arms over a HUMAN-labelled corpus of real Backstage diffs:
 *   - GROUNDED   = the radar conformance checker, with the ADR rule + business
 *                  driver + few-shot examples (buildUserPrompt / runAgent).
 *   - UNGROUNDED = the same model, same diff, but NO ADR/constraint — a generic
 *                  best-practice reviewer.
 * Both verdicts are scored against the gold label hand-set in eval/cases.yaml.
 * The harness never asks the model for the gold label.
 *
 * It quantifies the project's core claim — aligning to intent ≠ aligning to best
 * practice — by showing grounding catches project-specific violations the
 * ungrounded reviewer misses, without over-flagging compliant code.
 *
 * Run:  npx tsx scripts/eval.ts            (live; caches verdicts to eval/.verdict-cache.json)
 *       npx tsx scripts/eval.ts --replay   (no API calls; reuses the cache)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import yaml from "js-yaml";
import { extractFromDir, adrSection } from "../src/io/extract.ts";
import { loadDiff } from "../src/io/diff.ts";
import { retrieve } from "../src/core/retrieve.ts";
import { buildUserPrompt, toVerdict } from "../src/core/checker.ts";
import { selectModel } from "../src/agent/model.ts";
import { runAgent } from "../src/agent/engine.ts";
import { buildTools } from "../src/agent/tools.ts";
import { SemanticCheckOutputSchema } from "../src/core/models.ts";
import type { LanguageModel, Tool } from "ai";

const DEFAULT_MODEL = "claude-sonnet-4-6";

const ADR_DIR = "eval/adr";
const CASES = "eval/cases.yaml";
const CACHE = "eval/.verdict-cache.json";
const REPORT = "eval/report.md";

type Gold = "aligned" | "violated" | "unknown" | "out-of-scope";

interface Case {
  id: string;
  diff: string;
  target_constraint: string | null;
  gold: Gold;
  capability: string;
  source?: string;
  rationale?: string;
  realness?: string;
}

interface ArmResult {
  result: string; // aligned | violated | unknown | no-fire | FIRED
  confidence?: number;
  explanation?: string;
  note?: string;
}

const UNGROUNDED_SYSTEM =
  "You are an experienced senior software engineer doing a pre-merge code review. " +
  "Judge the diff ONLY by general software-engineering best practice and the code itself — " +
  "you have NO access to any project-specific architecture decisions, ADRs, or style guide. " +
  "Return result 'violated' if the diff introduces a real problem worth flagging (bug, bad " +
  "practice, risk), 'aligned' if it looks fine, or 'unknown' if you genuinely cannot tell. " +
  "Keep the explanation to one or two sentences.";

async function ungroundedReview(
  model: LanguageModel,
  diffText: string,
): Promise<ArmResult> {
  const o = await runAgent({
    model,
    skill: UNGROUNDED_SYSTEM,
    tools: {} as Record<string, Tool>,
    user: "Review this diff:\n```diff\n" + diffText + "\n```",
    outputSchema: SemanticCheckOutputSchema,
  });
  return {
    result: o?.result ?? "unknown",
    confidence: o?.confidence,
    explanation: o?.explanation,
  };
}

function fmt(x: number | null): string {
  return x == null ? "  – " : x.toFixed(2);
}

function violatedPRF(rows: Row[], pick: (r: Row) => ArmResult) {
  let tp = 0, fp = 0, fn = 0;
  for (const row of rows) {
    if (!["aligned", "violated", "unknown"].includes(row.cs.gold)) continue; // in-scope only
    const predV = pick(row).result === "violated";
    const goldV = row.cs.gold === "violated";
    if (goldV && predV) tp++;
    else if (!goldV && predV) fp++;
    else if (goldV && !predV) fn++;
  }
  const p = tp + fp ? tp / (tp + fp) : null;
  const r = tp + fn ? tp / (tp + fn) : null;
  const f1 = p && r ? (2 * p * r) / (p + r) : null;
  return { tp, fp, fn, p, r, f1 };
}

interface Row { cs: Case; grounded: ArmResult; ungrounded: ArmResult; }

const argValue = (flag: string): string | undefined => {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined; // guard: next token must be a value, not another flag
};

async function main(): Promise<void> {
  const replay = process.argv.includes("--replay");
  // Provider/model are selectable so the SAME benchmark runs across providers (ADR-0007).
  const providerArg = argValue("--provider");
  const modelArg = argValue("--model");
  if (providerArg) process.env.RADAR_PROVIDER = providerArg;
  if (modelArg) process.env.RADAR_MODEL = modelArg;
  const modelLabel = `${process.env.RADAR_PROVIDER ?? "anthropic"}/${process.env.RADAR_MODEL ?? DEFAULT_MODEL}`;
  // json mode changes how the model is prompted, so it is part of the cache identity.
  const jsonMode = process.env.RADAR_JSON_MODE === "json_schema" ? "json_schema" : "json_object";
  const tag = `${modelLabel}:${jsonMode}`;
  const cases = yaml.load(readFileSync(CASES, "utf8")) as Case[];
  const constraints = extractFromDir(ADR_DIR);

  let cache: Record<string, ArmResult> = {};
  if (existsSync(CACHE)) cache = JSON.parse(readFileSync(CACHE, "utf8"));

  // Build live-call resources only when not replaying
  let liveModel: LanguageModel | null = null;
  let liveTools: Record<string, Tool> = {};
  let conformanceSkill = "";
  if (!replay) {
    liveModel = selectModel(process.env);
    liveTools = buildTools(process.cwd());
    conformanceSkill = readFileSync("skills/conformance/SKILL.md", "utf8");
  }

  let calls = 0;

  const rows: Row[] = [];
  for (const cs of cases) {
    const fileDiffs = loadDiff(cs.diff);
    const pairs = retrieve(constraints, fileDiffs);
    const diffText = fileDiffs.map((d) => d.text).join("\n\n");

    // ---- GROUNDED arm ----
    let grounded: ArmResult;
    const gKey = `grounded:${tag}:${cs.id}`;
    const cachedG = cache[gKey] ?? cache[`grounded:${cs.id}`]; // legacy-key fallback for --replay
    if (cs.target_constraint) {
      const pair = pairs.find(([c]) => c.id === cs.target_constraint);
      if (!pair) {
        grounded = { result: "no-fire", note: "target constraint NOT retrieved (scope gap)" };
      } else if (cachedG) {
        grounded = cachedG;
      } else if (replay) {
        grounded = { result: "?", note: "no cached verdict — run live first" };
      } else {
        const [c, diffs] = pair;
        const ctx = adrSection(ADR_DIR, c.adr, "Context");
        const out = await runAgent({
          model: liveModel!,
          skill: conformanceSkill,
          tools: liveTools,
          user: buildUserPrompt(c, diffs, ctx),
          outputSchema: SemanticCheckOutputSchema,
        });
        calls++;
        const v = out
          ? toVerdict(c, out)
          : { result: "unknown" as const, confidence: 0, explanation: "" };
        grounded = { result: v.result, confidence: v.confidence, explanation: v.explanation };
        cache[gKey] = grounded;
      }
    } else {
      // expected out-of-scope: correct iff retrieval fired nothing
      grounded =
        pairs.length === 0
          ? { result: "no-fire" }
          : { result: "FIRED", note: `retrieval over-fired: ${pairs.map(([c]) => c.id).join(",")}` };
    }

    // ---- UNGROUNDED arm ----
    let ungrounded: ArmResult;
    const uKey = `ungrounded:${tag}:${cs.id}`;
    const cachedU = cache[uKey] ?? cache[`ungrounded:${cs.id}`]; // legacy-key fallback for --replay
    if (cachedU) {
      ungrounded = cachedU;
    } else if (replay) {
      ungrounded = { result: "?", note: "no cached verdict — run live first" };
    } else {
      ungrounded = await ungroundedReview(liveModel!, diffText);
      calls++;
      cache[uKey] = ungrounded;
    }

    rows.push({ cs, grounded, ungrounded });
  }

  if (!replay) {
    mkdirSync("eval", { recursive: true });
    writeFileSync(CACHE, JSON.stringify(cache, null, 2));
  }

  // ---- render ----
  const mark = (pred: string, gold: Gold, retrieval = false): string => {
    if (gold === "out-of-scope") return retrieval ? (pred === "no-fire" ? "✓" : "✗") : "·";
    return pred === gold ? "✓" : pred === "violated" || gold === "violated" ? "✗" : "·";
  };
  const lines: string[] = [];
  const pad = (s: string, n: number) => (s + " ".repeat(n)).slice(0, n);
  lines.push(
    pad("CASE", 26) + pad("GOLD", 13) + pad("GROUNDED", 16) + "UNGROUNDED",
  );
  lines.push("-".repeat(72));
  for (const { cs, grounded, ungrounded } of rows) {
    lines.push(
      pad(cs.id, 26) +
        pad(cs.gold, 13) +
        pad(`${grounded.result} ${mark(grounded.result, cs.gold, true)}`, 16) +
        `${ungrounded.result} ${mark(ungrounded.result, cs.gold)}`,
    );
  }
  const g = violatedPRF(rows, (r) => r.grounded);
  const u = violatedPRF(rows, (r) => r.ungrounded);
  const oos = rows.filter((r) => r.cs.gold === "out-of-scope");
  const oosOk = oos.filter((r) => r.grounded.result === "no-fire").length;

  lines.push("");
  lines.push("violated-class detection (in-scope cases):");
  lines.push(`  GROUNDED    P=${fmt(g.p)} R=${fmt(g.r)} F1=${fmt(g.f1)}   (tp=${g.tp} fp=${g.fp} fn=${g.fn})`);
  lines.push(`  UNGROUNDED  P=${fmt(u.p)} R=${fmt(u.r)} F1=${fmt(u.f1)}   (tp=${u.tp} fp=${u.fp} fn=${u.fn})`);
  lines.push(`retrieval precision (out-of-scope respected): ${oosOk}/${oos.length}`);
  if (!replay) lines.push(`\n(live: ${calls} model calls on ${modelLabel}; cached to ${CACHE})`);
  const out = lines.join("\n");
  console.log("\n" + out + "\n");

  // ---- report.md ----
  const md: string[] = [];
  md.push("# Delivery Radar — eval report (grounded vs ungrounded)\n");
  md.push(
    `Corpus: ${cases.length} human-labelled cases on **real Backstage ADRs**. ` +
      `Model: \`${modelLabel}\`. Ground truth is hand-labelled in \`eval/cases.yaml\` — ` +
      `the harness never asks the model for the gold label.\n`,
  );
  md.push("| case | gold | grounded | ungrounded | source |");
  md.push("|---|---|---|---|---|");
  for (const { cs, grounded, ungrounded } of rows) {
    const src = cs.source ? `[PR](${cs.source})` : cs.realness ?? "";
    md.push(
      `| \`${cs.id}\` | ${cs.gold} | ${grounded.result} ${mark(grounded.result, cs.gold, true)} | ${ungrounded.result} ${mark(ungrounded.result, cs.gold)} | ${src} |`,
    );
  }
  md.push("");
  md.push("## Violated-class detection (in-scope cases)\n");
  md.push("| arm | precision | recall | F1 | tp | fp | fn |");
  md.push("|---|---|---|---|---|---|---|");
  md.push(`| **grounded** | ${fmt(g.p)} | ${fmt(g.r)} | ${fmt(g.f1)} | ${g.tp} | ${g.fp} | ${g.fn} |`);
  md.push(`| ungrounded | ${fmt(u.p)} | ${fmt(u.r)} | ${fmt(u.f1)} | ${u.tp} | ${u.fp} | ${u.fn} |`);
  md.push(`\nRetrieval precision (out-of-scope respected): **${oosOk}/${oos.length}**.\n`);
  md.push("## Per-case rationale\n");
  for (const { cs, grounded, ungrounded } of rows) {
    md.push(`- **${cs.id}** (gold: ${cs.gold}) — ${(cs.rationale ?? "").trim()}`);
    if (grounded.explanation) md.push(`  - grounded: _${grounded.explanation.trim()}_`);
    if (ungrounded.explanation) md.push(`  - ungrounded: _${ungrounded.explanation.trim()}_`);
  }
  md.push(
    "\n> Honesty: small seeded corpus — numbers are illustrative, not a statistical " +
      "accuracy claim. The point is that the grounded↔ungrounded gap reproduces on real, " +
      "maintainer-authored ADRs, and that the harness scales to real history.\n",
  );
  writeFileSync(REPORT, md.join("\n"));

  // ---- machine-readable results for the showcase (contrast page) ----
  const results = {
    model: modelLabel,
    n: cases.length,
    rows: rows.map(({ cs, grounded, ungrounded }) => ({
      id: cs.id,
      gold: cs.gold,
      adr: cs.target_constraint,
      capability: cs.capability,
      realness: cs.realness ?? null,
      source: cs.source ?? null,
      grounded: {
        result: grounded.result,
        confidence: grounded.confidence ?? null,
        explanation: grounded.explanation ?? null,
      },
      ungrounded: {
        result: ungrounded.result,
        confidence: ungrounded.confidence ?? null,
        explanation: ungrounded.explanation ?? null,
      },
    })),
    metrics: {
      grounded: { p: g.p, r: g.r, f1: g.f1, tp: g.tp, fp: g.fp, fn: g.fn },
      ungrounded: { p: u.p, r: u.r, f1: u.f1, tp: u.tp, fp: u.fp, fn: u.fn },
      retrieval: { ok: oosOk, total: oos.length },
    },
  };
  writeFileSync("eval/results.json", JSON.stringify(results, null, 2));
  writeFileSync("eval/eval-data.js", `window.EVAL_DATA = ${JSON.stringify(results, null, 2)};\n`);
  console.error(`wrote ${REPORT}, eval/results.json, eval/eval-data.js`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
