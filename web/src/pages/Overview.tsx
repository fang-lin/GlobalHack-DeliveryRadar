import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, LayoutDashboard, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IiacLoopDiagram } from "@/components/IiacLoopDiagram";

const WHY = [
  { who: "Tests", checks: "does it work?", misses: "whether it still matches intent" },
  { who: "Linters", checks: "is it tidy?", misses: "whether it still matches intent" },
  { who: "Generic AI review", checks: "plausible opinions", misses: "the recorded reason — may even argue for a violation" },
  { who: "Delivery Radar", checks: "the diff against recorded intent + its business driver", misses: "—", us: true },
];

type Phase = "live" | "p2" | "p3";
const PHASE_CARD: Record<Phase, string> = {
  live: "border-primary/60 shadow-[0_0_24px_rgba(55,232,194,.08)]",
  p2: "border-amber-500/30 opacity-80",
  p3: "border-slate-500/30 opacity-70",
};
const PHASE_TITLE: Record<Phase, string> = {
  live: "text-primary",
  p2: "text-amber-400",
  p3: "text-slate-300",
};

const SYSTEM: { head: string; items: { t: string; d: string; phase: Phase }[] }[] = [
  {
    head: "intent · carriers",
    items: [
      { t: "ADRs + constraint blocks", d: "architecture decisions with machine-readable rules, linked to business drivers", phase: "live" },
      { t: "Story / AC layer", d: "behavioral intent: goals, expected behaviors, non-goals per PR", phase: "p2" },
    ],
  },
  {
    head: "shared core",
    items: [
      { t: "Constraint extraction", d: "ADR → addressable constraints, stable IDs, validation", phase: "live" },
      { t: "Scope-first retrieval", d: "only constraints governing the touched code — noise control", phase: "live" },
      { t: "Authoring assist", d: "draft constraints from ADR prose + diffs", phase: "p2" },
    ],
  },
  {
    head: "per-diff engine (PRs)",
    items: [
      { t: "Semantic conformance", d: "driver-grounded LLM verdicts, advisory comments with evidence", phase: "live" },
      { t: "Deterministic checks · typed projection", d: "semgrep matchers; suggestion blocks for local fixes", phase: "p2" },
      { t: "Capture → Decision Notes", d: "detect implicit decisions, triage, graduate to ADRs", phase: "p2" },
      { t: "Pre-PR agent self-check", d: "same verdicts inside agent loops — the door to long-horizon autonomy", phase: "p3" },
    ],
  },
  {
    head: "per-repo engine · trust",
    items: [
      { t: "Drift engine + dashboard", d: "nightly scans, decay trends, remediate-or-supersede drafts", phase: "p2" },
      { t: "Audit trail & convergence metrics", d: "every verdict, signal and confirmation recorded; distance-from-intent curves", phase: "p2" },
      { t: "Historical replay harness", d: "precision/recall on your repo's own merged PRs — first results in Evidence", phase: "p3" },
      { t: "Earned gating", d: "deterministic + proven precision → only then may a check block", phase: "p3" },
    ],
  },
];

const PATHS = [
  {
    icon: "👩‍💻",
    tag: "PAST",
    tagCls: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    title: "Humans write the code",
    body: "Intent lives in people's heads and meeting rooms. Drift is slow enough that human review mostly keeps up — alignment by craftsmanship.",
    accent: false,
  },
  {
    icon: "🕹️",
    tag: "TODAY",
    tagCls: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    title: "Humans steer agents in real time",
    body: "Agents write the code; alignment holds because a human watches every step and corrects drift live, prompt by prompt — it doesn't scale past one person, one session.",
    accent: false,
  },
  {
    icon: "🤖",
    tag: "THE EXPLORATION",
    tagCls: "bg-primary/15 text-primary border-primary/40",
    title: "Long-horizon autonomy",
    body: "Recorded, machine-checkable intent replaces real-time steering: the agent self-checks before opening a PR, captures new decisions, escalates to a human only at decision points. The human steps out of the loop; alignment stays in.",
    accent: true,
  },
];

const ROADMAP = [
  {
    phase: "Phase 1",
    tag: "RUNNING TODAY",
    tagCls: "bg-primary/15 text-primary border-primary/40",
    head: "text-primary",
    accent: true,
    items: [
      "ADR constraint blocks → constraint store",
      "Advisory conformance on real PRs",
      "Driver-grounded semantic checks",
      "Evidence-linked review comments",
    ],
  },
  {
    phase: "Phase 2",
    tag: "NEXT",
    tagCls: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    head: "text-amber-400",
    accent: false,
    items: [
      "Capture → Decision Note triage flow",
      "Drift engine + live dashboard",
      "Remediation / supersede drafts",
      "Story/AC behavioral intent layer",
    ],
  },
  {
    phase: "Phase 3",
    tag: "EARNED",
    tagCls: "bg-violet-500/10 text-violet-300 border-violet-500/30",
    head: "text-violet-400",
    accent: false,
    items: [
      "Historical-replay precision harness",
      "Gate only what proves itself",
      "Pre-PR self-check in agent loops",
      "Decay prediction",
    ],
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
      {children}
    </div>
  );
}

export default function Overview() {
  return (
    <div className="space-y-20">
      {/* hero */}
      <section className="pt-4 text-center">
        <Eyebrow>intent → implementation → alignment → convergence</Eyebrow>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
          Does this change still match what the team <span className="text-primary">decided</span>?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Delivery Radar checks each pull request against the team's{" "}
          <span className="text-foreground">recorded intent</span> — the ADRs and the business
          driver behind them — not generic best practice. It posts an advisory review that cites the
          decision, the reason, and the exact lines. It never blocks the merge.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <LayoutDashboard className="h-4 w-4" /> See it run
          </Link>
          <Link
            to="/evidence"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            <FlaskConical className="h-4 w-4" /> See it measured
          </Link>
        </div>
      </section>

      {/* crux */}
      <section>
        <Card className="border-primary/40 bg-primary/[0.04]">
          <CardContent className="p-6 text-center">
            <p className="text-lg font-medium">
              The staleness wasn't a bug — <span className="text-primary">the team chose it.</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              A generic reviewer would try to "fix" it; Delivery Radar defends it.{" "}
              <span className="text-foreground">Aligning to intent is not the same as aligning to best practice</span>{" "}
              — and that gap is exactly what no existing tool checks.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* the IIAC loop */}
      <section>
        <Eyebrow>intent → implementation → alignment → convergence · IIAC</Eyebrow>
        <h2 className="mt-2 text-center text-2xl font-bold">The IIAC Loop</h2>
        <p className="mt-1 text-center text-sm text-muted-foreground">
          alignment makes each change right · <span className="text-primary">convergence</span> makes
          the trajectory settle — no oscillation
        </p>
        <div className="mt-6 rounded-xl border border-border bg-card/40 p-3 sm:p-5">
          <IiacLoopDiagram />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          capture keeps the measure honest — no unrecorded decisions ·{" "}
          <span className="text-primary">aligned at every step, convergent over time → deterministic output</span>
        </p>
      </section>

      {/* why this is new */}
      <section>
        <h2 className="mb-4 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Why this is new
        </h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">layer</th>
                <th className="px-4 py-2.5 text-left font-medium">checks</th>
                <th className="px-4 py-2.5 text-left font-medium">misses</th>
              </tr>
            </thead>
            <tbody>
              {WHY.map((r) => (
                <tr key={r.who} className={`border-t border-border ${r.us ? "bg-primary/[0.06]" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {r.us ? <span className="text-primary">{r.who}</span> : r.who}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.checks}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.misses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* the full system — one slice */}
      <section>
        <Eyebrow>the specified system</Eyebrow>
        <h2 className="mt-2 text-center text-2xl font-bold">What runs today is one slice</h2>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 font-mono text-[11px]">
          <span className="rounded border border-primary/40 bg-primary/15 px-2 py-0.5 text-primary">■ LIVE TODAY</span>
          <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-400">■ PHASE 2</span>
          <span className="rounded border border-slate-500/30 bg-slate-500/10 px-2 py-0.5 text-slate-400">■ PHASE 3</span>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SYSTEM.map((col) => (
            <div key={col.head} className="space-y-3">
              <div className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                {col.head}
              </div>
              {col.items.map((it) => (
                <div key={it.t} className={`rounded-xl border bg-card/70 p-3 ${PHASE_CARD[it.phase]}`}>
                  <div className={`text-sm font-semibold ${PHASE_TITLE[it.phase]}`}>{it.t}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{it.d}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          <span className="font-semibold text-primary">4 of 13 capability groups live today</span> —
          every box is specified with stable requirement IDs; today's slice is the lit spine, not the
          whole body.
        </p>
      </section>

      {/* two paths → autonomy */}
      <section>
        <Eyebrow>why this matters</Eyebrow>
        <h2 className="mt-2 text-center text-2xl font-bold">From writing, to steering, to autonomy</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {PATHS.map((p) => (
            <Card key={p.tag} className={p.accent ? "border-primary/60 shadow-[0_0_40px_rgba(55,232,194,.1)]" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="text-3xl">{p.icon}</div>
                  <span className={`rounded border px-2 py-0.5 font-mono text-[10px] ${p.tagCls}`}>{p.tag}</span>
                </div>
                <div className={`mt-3 text-base font-bold ${p.accent ? "text-primary" : ""}`}>{p.title}</div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-5 border-violet-500/40">
          <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row">
            <div className="text-2xl">🔍</div>
            <div>
              <div className="font-bold text-violet-300">Tracked &amp; auditable — because convergence needs memory</div>
              <div className="mt-1 text-sm text-muted-foreground">
                you cannot converge on what you cannot remember: verdicts carry evidence + constraint
                IDs, confirmations are recorded, intent history lives in git —{" "}
                <span className="font-mono text-xs text-foreground">who decided · what changed · why</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* roadmap */}
      <section>
        <Eyebrow>where this goes</Eyebrow>
        <h2 className="mt-2 text-center text-2xl font-bold">Roadmap</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {ROADMAP.map((r) => (
            <Card key={r.phase} className={r.accent ? "border-primary/60 shadow-[0_0_40px_rgba(55,232,194,.1)]" : ""}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`text-lg font-bold ${r.head}`}>{r.phase}</div>
                  <span className={`rounded border px-2 py-0.5 font-mono text-[11px] ${r.tagCls}`}>{r.tag}</span>
                </div>
                <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
                  {r.items.map((it) => (
                    <li key={it} className="flex gap-2">
                      <span className={r.accent ? "text-primary" : "text-muted-foreground"}>{r.accent ? "✓" : "◇"}</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* explore the showcases */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4 text-primary" />
              <Badge variant="default">Dashboard</Badge>
              <span className="text-xs text-muted-foreground">product in use</span>
            </div>
            <CardTitle className="mt-2 text-lg">Running on the shop-demo repo</CardTitle>
            <CardDescription>
              A staged demo repo: a CI-green PR that quietly violates an ADR, the advisory verdict,
              drift trend, at-risk ADRs, and the Decision-Note triage queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <Badge variant="default">Evidence</Badge>
              <span className="text-xs text-muted-foreground">measured, not cherry-picked</span>
            </div>
            <CardTitle className="mt-2 text-lg">Measured on real Backstage ADRs</CardTitle>
            <CardDescription>
              Grounded vs ungrounded on a labelled corpus built from Spotify Backstage's own
              published ADRs — real merged PRs and real code. The numbers, and why "best practice"
              isn't enough.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/evidence" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
              Open evidence <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* closing */}
      <section className="pb-4 text-center">
        <div className="text-2xl font-bold">🛰️ Delivery Radar</div>
        <div className="mt-2 font-mono text-primary">
          keep the <span className="italic">why</span> alive
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          our take on <span className="italic">Innovation that AI/works™</span>
        </div>
      </section>
    </div>
  );
}
