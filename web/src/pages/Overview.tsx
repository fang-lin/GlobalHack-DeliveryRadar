import { Link } from "react-router-dom";
import { ArrowRight, FlaskConical, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WHY = [
  { who: "Tests", checks: "does it work?", misses: "whether it still matches intent" },
  { who: "Linters", checks: "is it tidy?", misses: "whether it still matches intent" },
  { who: "Generic AI review", checks: "plausible opinions", misses: "the recorded reason — may even argue for a violation" },
  { who: "Delivery Radar", checks: "the diff against recorded intent + its business driver", misses: "—", us: true },
];

const LOOP = [
  { k: "Intent", d: "ADRs · RFCs · specs, linked to business drivers" },
  { k: "Constraints", d: "extracted, one shared contract, stable IDs" },
  { k: "Conformance · Capture · Drift", d: "operations act on every change" },
  { k: "Human gate", d: "machine drafts, human confirms write-back" },
];

export default function Overview() {
  return (
    <div className="space-y-12">
      {/* hero */}
      <section className="pt-4 text-center">
        <div className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
          intent → implementation → alignment → convergence
        </div>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-4xl">
          Does this change still match what the team{" "}
          <span className="text-primary">decided</span>?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
          Delivery Radar checks each pull request against the team's{" "}
          <span className="text-foreground">recorded intent</span> — the ADRs and the business
          driver behind them — not generic best practice. It posts an advisory review that cites
          the decision, the reason, and the exact lines. It never blocks the merge.
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

      {/* the loop */}
      <section>
        <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> The IIAC loop
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map((s, i) => (
            <Card key={s.k} className="relative">
              <CardHeader className="pb-3">
                <div className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</div>
                <CardTitle className="text-base">{s.k}</CardTitle>
                <CardDescription>{s.d}</CardDescription>
              </CardHeader>
              {i < LOOP.length - 1 && (
                <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-border lg:block" />
              )}
            </Card>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Each pass aligns one change; the loop drives convergence over time. Every write-back to
          intent passes a human gate.
        </p>
      </section>

      {/* two subjects, made explicit */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
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
    </div>
  );
}
