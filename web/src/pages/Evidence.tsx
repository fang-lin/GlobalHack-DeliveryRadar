import { Check, ExternalLink, FlaskConical, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import raw from "@/data/evidence.json";

type Arm = { result: string; confidence: number | null; explanation: string | null };
interface Row {
  id: string;
  gold: string;
  adr: string | null;
  capability: string;
  realness: string | null;
  source: string | null;
  grounded: Arm;
  ungrounded: Arm;
}
interface Metric { p: number | null; r: number | null; f1: number | null; tp: number; fp: number; fn: number }
const data = raw as unknown as {
  model: string;
  n: number;
  rows: Row[];
  metrics: { grounded: Metric; ungrounded: Metric; retrieval: { ok: number; total: number } };
};

const f = (x: number | null) => (x == null ? "–" : x.toFixed(2));

function goldVariant(g: string): "violated" | "aligned" | "unknown" {
  if (g === "violated") return "violated";
  if (g === "aligned") return "aligned";
  return "unknown";
}

function Mark({ ok }: { ok: boolean | null }) {
  if (ok == null) return <span className="text-muted-foreground">·</span>;
  return ok ? (
    <Check className="inline h-3.5 w-3.5 text-primary" />
  ) : (
    <X className="inline h-3.5 w-3.5 text-amber-400" />
  );
}

function correctness(arm: "grounded" | "ungrounded", row: Row): boolean | null {
  if (row.gold === "out-of-scope") {
    if (arm === "ungrounded") return null;
    return row.grounded.result === "no-fire";
  }
  return row[arm].result === row.gold;
}

function MetricCard({
  tag,
  accent,
  m,
  note,
}: {
  tag: string;
  accent: boolean;
  m: Metric;
  note: string;
}) {
  return (
    <Card className={accent ? "border-primary/50 bg-primary/[0.05]" : ""}>
      <CardContent className="p-5">
        <Badge variant={accent ? "default" : "unknown"}>{tag}</Badge>
        <div className="mt-3 flex items-baseline gap-3">
          <div className="text-3xl font-bold">F1 {f(m.f1)}</div>
          <div className="font-mono text-sm text-muted-foreground">
            P {f(m.p)} · R {f(m.r)}
          </div>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      </CardContent>
    </Card>
  );
}

export default function Evidence() {
  const { metrics, rows } = data;
  const gViol = metrics.grounded.tp + metrics.grounded.fn;
  const uViol = metrics.ungrounded.tp + metrics.ungrounded.fn;
  const q = rows.find((r) => /nodefetch|node-fetch/.test(r.id));

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Measured evidence</h1>
          <Badge variant="default">not cherry-picked</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Grounded vs ungrounded over {data.n} human-labelled cases built on{" "}
          <a
            href="https://github.com/backstage/backstage/tree/master/docs/architecture-decisions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground hover:text-primary"
          >
            Spotify Backstage's own published ADRs <ExternalLink className="h-3 w-3" />
          </a>
          {" "}— real merged PRs and real code. Model <code className="font-mono text-xs">{data.model}</code>.
          Ground truth is hand-labelled; the harness never asks the model for the answer.
        </p>
      </header>

      {/* metrics */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard
          tag="GROUNDED — radar"
          accent
          m={metrics.grounded}
          note={`catches ${metrics.grounded.tp}/${gViol} violations · ${metrics.grounded.fp} false alarms · retrieval ${metrics.retrieval.ok}/${metrics.retrieval.total}`}
        />
        <MetricCard
          tag="UNGROUNDED — same model"
          accent={false}
          m={metrics.ungrounded}
          note={`misses ${metrics.ungrounded.fn}/${uViol} intent-specific violations`}
        />
      </section>

      {/* table */}
      <section className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left font-medium">case</th>
              <th className="px-4 py-2.5 text-left font-medium">gold</th>
              <th className="px-4 py-2.5 text-left font-medium">grounded</th>
              <th className="px-4 py-2.5 text-left font-medium">ungrounded</th>
            </tr>
          </thead>
          <tbody className="font-mono text-xs">
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-2.5">
                  {r.source ? (
                    <a href={r.source} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      {r.id}
                    </a>
                  ) : (
                    r.id
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={goldVariant(r.gold)}>{r.gold}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {r.grounded.result} <Mark ok={correctness("grounded", r)} />
                </td>
                <td className="px-4 py-2.5">
                  {r.ungrounded.result} <Mark ok={correctness("ungrounded", r)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* headline quote */}
      {q && (
        <section>
          <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            why "best practice" isn't enough
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <Badge variant="unknown">UNGROUNDED → {q.ungrounded.result}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic text-muted-foreground">"{q.ungrounded.explanation}"</p>
              </CardContent>
            </Card>
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <Badge variant="default">GROUNDED → {q.grounded.result}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm italic">"{q.grounded.explanation}"</p>
              </CardContent>
            </Card>
          </div>
          <p className="mx-auto mt-3 max-w-3xl text-center text-xs text-muted-foreground">
            A capable generic reviewer <span className="text-amber-300">argues for</span> the{" "}
            <code className="font-mono">node-fetch</code> import on solid technical grounds — unaware the
            team already decided (ADR014, superseding ADR013) to move to native{" "}
            <code className="font-mono">fetch</code>.
          </p>
        </section>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <FlaskConical className="h-3.5 w-3.5" /> Seeded corpus — numbers are illustrative, not a
        statistical accuracy claim. The gap reproduces on real, maintainer-authored ADRs, and the
        harness scales to real history. Reproduce with <code className="font-mono">npm run eval</code>.
      </p>
    </div>
  );
}
