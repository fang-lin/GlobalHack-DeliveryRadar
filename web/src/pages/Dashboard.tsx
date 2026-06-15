import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  ExternalLink,
  FileWarning,
  GitPullRequest,
  Inbox,
  ScrollText,
  TrendingDown,
  XCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { shopDemo, type Verdict } from "@/data/shopDemo";

const RESULT: Record<Verdict["result"], { variant: "violated" | "aligned" | "unknown"; Icon: typeof XCircle }> = {
  violated: { variant: "violated", Icon: XCircle },
  aligned: { variant: "aligned", Icon: CheckCircle2 },
  unknown: { variant: "unknown", Icon: CircleHelp },
};

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function healthColor(h: number) {
  if (h >= 0.9) return "bg-emerald-400";
  if (h >= 0.75) return "bg-amber-400";
  return "bg-rose-400";
}

export default function Dashboard() {
  const s = shopDemo;
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Conformance dashboard</h1>
            <Badge variant="default">product in use</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Radar running on{" "}
            <a
              href={s.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-foreground hover:text-primary"
            >
              {s.repo} <ExternalLink className="h-3 w-3" />
            </a>{" "}
            — a staged demo repo. Static demo data.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="ADRs" value={s.stats.adrs} sub="source of truth" />
        <StatCard label="Constraints" value={s.stats.constraints} sub="machine-readable" />
        <StatCard label="Open PRs" value={s.stats.openPrs} sub="checked this cycle" />
        <StatCard label="Violations" value={s.stats.violations} sub="advisory, not blocked" />
      </section>

      {/* conformance feed */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <GitPullRequest className="h-4 w-4" /> Conformance feed
        </h2>
        <div className="space-y-3">
          {s.conformance.map((v) => {
            const meta = RESULT[v.result];
            return (
              <Card key={v.pr} className={v.result === "violated" ? "border-rose-500/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={meta.variant} className="gap-1">
                      <meta.Icon className="h-3 w-3" /> {v.result}
                    </Badge>
                    <a
                      href={v.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium hover:text-primary"
                    >
                      #{v.pr} {v.title}
                    </a>
                    <span className="ml-auto flex items-center gap-2 font-mono text-xs text-muted-foreground">
                      <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300">
                        CI {v.ci}
                      </span>
                      conf {v.confidence.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-muted-foreground">
                    {v.constraint} · severity {v.severity} · driver {v.driver} ·{" "}
                    <span className="text-foreground/80">
                      {v.file} {v.lines}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{v.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* drift + at-risk */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-rose-300" />
              <CardTitle className="text-base">ADR-001 conformance health</CardTitle>
            </div>
            <CardDescription>decay trend over the last 8 weeks (seeded preview)</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={s.driftSeries} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="health" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#37e8c2" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#37e8c2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2b4a" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={{ stroke: "#1f2b4a" }} tickLine={false} />
                  <YAxis
                    domain={[0.5, 1]}
                    tickFormatter={(v) => `${Math.round(v * 100)}%`}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: "#11182e", border: "1px solid #1f2b4a", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(v: number) => [`${Math.round(v * 100)}%`, "health"]}
                  />
                  <Area type="monotone" dataKey="health" stroke="#37e8c2" strokeWidth={2} fill="url(#health)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-300" />
              <CardTitle className="text-base">At-risk ADRs</CardTitle>
            </div>
            <CardDescription>conformance health by decision</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {s.atRisk.map((a) => (
              <div key={a.adr}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{a.adr}</span>
                  <span className="font-mono text-xs">{Math.round(a.health * 100)}%</span>
                </div>
                <div className="truncate text-sm">{a.title}</div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className={`h-full rounded-full ${healthColor(a.health)}`} style={{ width: `${a.health * 100}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">{a.note}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* triage */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Inbox className="h-4 w-4" /> Decision-Note triage queue
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {s.triage.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs text-muted-foreground">{t.id} · {t.kind}</span>
                  <Badge variant="warning" className="ml-auto">{t.proposal}</Badge>
                </div>
                <div className="mt-2 font-medium">{t.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{t.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          <FileWarning className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
          Machine drafts; a human confirms before anything writes back to intent.
        </p>
      </section>
    </div>
  );
}
