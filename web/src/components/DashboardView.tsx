import {
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  GitPullRequest,
  Inbox,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DashboardData, Verdict } from "@/data/dashboards";

const RESULT: Record<Verdict["result"], { variant: "violated" | "aligned" | "unknown"; Icon: typeof XCircle; label: string }> = {
  violated: { variant: "violated", Icon: XCircle, label: "VIOLATED" },
  aligned: { variant: "aligned", Icon: CheckCircle2, label: "ALIGNED" },
  unknown: { variant: "unknown", Icon: CircleHelp, label: "UNKNOWN" },
};

function Sparkline({ points }: { points: number[] }) {
  const w = 120, h = 28;
  const max = Math.max(...points, 1);
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => `${(i * step).toFixed(1)},${(h - 3 - (p / max) * (h - 8)).toFixed(1)}`);
  const [lx, ly] = coords[coords.length - 1].split(",");
  return (
    <svg width={w} height={h} className="shrink-0 overflow-visible">
      <polyline points={coords.join(" ")} fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
      <circle cx={lx} cy={ly} r={3} fill="#f59e0b" />
    </svg>
  );
}

function Kpi({ label, value, hint, warn }: { label: string; value: string | number; hint?: string; warn?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`text-3xl font-bold ${warn ? "text-amber-400" : "text-primary"}`}>{value}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground/70">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function SectionTitle({ icon: Icon, children, tag }: { icon: typeof GitPullRequest; children: React.ReactNode; tag?: string }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-4 w-4" /> {children}
      {tag && <Badge variant="warning" className="ml-1 normal-case tracking-normal">{tag}</Badge>}
    </h2>
  );
}

export function DashboardView({ data }: { data: DashboardData }) {
  const ar = data.drift.at_risk;
  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛰️</span>
          <div>
            <div className="text-lg font-bold">Delivery Radar</div>
            <div className="text-xs text-muted-foreground">Intent–Implementation Alignment &amp; Convergence · IIAC</div>
          </div>
        </div>
        <div className="sm:text-right">
          <a href={data.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-sm text-primary hover:underline">
            {data.repo} <ExternalLink className="h-3 w-3" />
          </a>
          <div className="text-xs text-muted-foreground">last scan {new Date(data.generated_at).toLocaleString("en-GB")}</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Kpi label="ADRs" value={data.kpis.adrs} />
        <Kpi label="Active constraints" value={data.kpis.active_constraints} />
        <Kpi label="Alignment rate" value={`${Math.round(data.kpis.alignment_rate * 100)}%`} hint="last 30 PRs" />
        <Kpi label="Open drift violations" value={data.kpis.open_violations} hint="default branch" warn />
        <Kpi label="Notes awaiting triage" value={data.kpis.notes_awaiting_triage} hint="capture queue" />
      </div>

      <p className="text-xs text-muted-foreground">{data.feedNote}</p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* conformance feed */}
        <section className="lg:col-span-3">
          <SectionTitle icon={GitPullRequest}>Conformance — PR checks (advisory)</SectionTitle>
          <div className="space-y-3">
            {data.conformance_feed.map((pr) => (
              <Card key={pr.pr} className={pr.live ? "border-primary/50 shadow-[0_0_24px_rgba(55,232,194,.08)]" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-mono text-xs text-muted-foreground">#{pr.pr}</span>
                    <span className="text-sm font-medium">{pr.title}</span>
                    {pr.live && <Badge variant="default">LIVE</Badge>}
                    <span className="ml-auto text-[11px] text-muted-foreground">@{pr.author}</span>
                    <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300">CI ✓</span>
                  </div>
                  {pr.verdicts.map((v, i) => {
                    const m = RESULT[v.result];
                    return (
                      <div key={i} className="mt-3 border-t border-border pt-3">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <Badge variant={m.variant} className="gap-1">
                            <m.Icon className="h-3 w-3" />
                            {m.label}
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">{v.constraint_id}</span>
                          <span className="text-xs text-muted-foreground">
                            · driver <span className="font-mono text-primary/80">{v.driver}</span>
                          </span>
                          <span className="ml-auto font-mono text-[11px] text-muted-foreground">conf {v.confidence.toFixed(2)}</span>
                        </div>
                        <div className="mt-1.5 text-sm text-foreground/90">{v.constraint_title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{v.explanation}</div>
                        <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">📍 {v.evidence}</div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* drift + capture */}
        <section className="space-y-6 lg:col-span-2">
          <div>
            <SectionTitle icon={TrendingDown} tag="PHASE 2 · SEEDED">Drift — standing codebase</SectionTitle>
            <div className="space-y-2">
              {data.drift.adrs.map((a) => (
                <Card key={a.adr}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs text-muted-foreground">{a.adr}</div>
                      <div className="truncate text-sm">{a.title}</div>
                    </div>
                    <Sparkline points={a.trend} />
                    <div className="text-right">
                      <div className={`text-lg font-bold ${a.violations >= 4 ? "text-rose-400" : "text-amber-400"}`}>{a.violations}</div>
                      <div className="text-[10px] text-muted-foreground">violations</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="mt-3 border-rose-500/40">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant="violated">AT RISK</Badge>
                  <span className="font-mono text-xs text-muted-foreground">{ar.adr}</span>
                  <span className="text-[11px] text-muted-foreground sm:ml-auto">{ar.trend_note}</span>
                </div>
                <div className="mt-2 text-sm">{ar.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  driver <span className="font-mono text-primary/80">{ar.driver}</span> — is the decision stale, or the code?
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ar.options.map((o) => (
                    <div key={o.kind} className="rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                      <div className={`text-xs font-semibold ${o.kind === "remediation" ? "text-emerald-400" : "text-violet-400"}`}>{o.label}</div>
                      <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{o.summary}</div>
                      <button className="mt-2 w-full rounded border border-border py-1 font-mono text-[11px] text-muted-foreground hover:bg-accent">
                        review draft → confirm
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-center text-[10px] text-muted-foreground">neither executes without human confirmation (NFR-TRUST-1)</div>
              </CardContent>
            </Card>
          </div>

          <div>
            <SectionTitle icon={Inbox} tag="PHASE 2 · SEEDED">Capture — Decision Notes</SectionTitle>
            <div className="space-y-2">
              {data.capture_queue.map((n) => (
                <Card key={n.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary">{n.id}</span>
                      <span className="text-[11px] text-muted-foreground">from PR #{n.pr}</span>
                      <Badge variant="default" className="ml-auto">{n.suggested_class}</Badge>
                    </div>
                    <div className="mt-2 text-sm">{n.detected}</div>
                    <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">📍 {n.evidence}</div>
                    <div className="mt-3 flex gap-2">
                      <button className="flex-1 rounded border border-border py-1 font-mono text-[11px] hover:bg-accent">graduate → ADR</button>
                      <button className="flex-1 rounded border border-border py-1 font-mono text-[11px] hover:bg-accent">route → story</button>
                      <button className="flex-1 rounded border border-border py-1 font-mono text-[11px] text-muted-foreground hover:bg-accent">dismiss</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="border-t border-border pt-4 text-center font-mono text-xs text-muted-foreground">
        intent → constraints → {"{ conformance · drift · capture }"} → drafts → human confirms ✓ → intent ↻
      </div>
    </div>
  );
}
