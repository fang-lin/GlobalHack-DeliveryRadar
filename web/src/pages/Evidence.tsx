import { Boxes, Check, ExternalLink, FlaskConical, Lightbulb, Target, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

function MetricCard({ tag, accent, m, note }: { tag: string; accent: boolean; m: Metric; note: string }) {
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

const CONTEXT = [
  {
    Icon: Target,
    title: "Why measure it",
    body: "One demo can be cherry-picked. To test the core claim — that driver-grounded checking beats generic review — we built a labelled benchmark and pitted the radar against the same model with no recorded intent.",
  },
  {
    Icon: Boxes,
    title: "Why Backstage",
    body: "Spotify Backstage publishes 16 real ADRs in-repo (MADR format), in TypeScript. The intent is written by its maintainers — not by us — so the benchmark can't be dismissed as self-authored rules. Cases come from real merged PRs and real code.",
  },
  {
    Icon: FlaskConical,
    title: "How we tested",
    body: "Two arms, same model: grounded (the radar — ADR rule + business driver + examples) vs ungrounded (a generic best-practice reviewer, no ADR). Gold labels are hand-set by reading each diff against the ADR — never asked of the model. Each diff isolates one target violation; scored on the violated class + retrieval.",
  },
];

export default function Evidence() {
  const { metrics, rows } = data;
  const gViol = metrics.grounded.tp + metrics.grounded.fn;
  const uViol = metrics.ungrounded.tp + metrics.ungrounded.fn;
  const q = rows.find((r) => /nodefetch|node-fetch/.test(r.id));

  return (
    <div className="space-y-10">
      {/* header / why */}
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Measured evidence</h1>
          <Badge variant="default">not cherry-picked</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          A working demo shows the idea; it does not prove the radar is right more often than a
          smart generic reviewer. So we ran a benchmark: {data.n} human-labelled cases on real
          third-party ADRs, the radar (grounded) against the same model with no recorded intent
          (ungrounded). Here is the background, the method, the numbers, and what they mean.
        </p>
      </header>

      {/* context: why / why backstage / how */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {CONTEXT.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2">
                <c.Icon className="h-4 w-4 text-primary" />
                <span className="font-semibold">{c.title}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* results */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Results
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Model <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs">{data.model}</code>.
          Intent from{" "}
          <a
            href="https://github.com/backstage/backstage/tree/master/docs/architecture-decisions"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-foreground hover:text-primary"
          >
            Backstage's published ADRs <ExternalLink className="h-3 w-3" />
          </a>
          . Detection of the <span className="text-rose-300">violated</span> class:
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
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
        </div>
      </section>

      {/* killer example */}
      {q && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            The clearest case — why "best practice" isn't enough
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <Badge variant="unknown">UNGROUNDED → {q.ungrounded.result}</Badge>
                <p className="mt-3 text-sm italic text-muted-foreground">"{q.ungrounded.explanation}"</p>
              </CardContent>
            </Card>
            <Card className="border-primary/50">
              <CardContent className="p-5">
                <Badge variant="default">GROUNDED → {q.grounded.result}</Badge>
                <p className="mt-3 text-sm italic">"{q.grounded.explanation}"</p>
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

      {/* conclusion */}
      <section>
        <Card className="border-primary/40 bg-primary/[0.04]">
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="font-semibold uppercase tracking-wider">Conclusion</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Given the team's recorded intent, the radar flags{" "}
              <span className="text-foreground">every intent-specific violation</span> (P/R/F1 = 1.00)
              without false alarms. The <span className="text-foreground">same model with no intent</span>{" "}
              misses {metrics.ungrounded.fn} of {uViol} — and on the node-fetch case it even argues{" "}
              <em>for</em> the violation. The gap between "good engineering" and "what this team
              decided" is real and measurable — and closing it is the whole product.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              <FlaskConical className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
              Honest scope: a seeded corpus, so the numbers are illustrative, not a statistical
              significance claim. What it shows is that the grounded↔ungrounded gap reproduces on
              real, maintainer-authored ADRs — and the same harness scales to a repo's full merged
              history. Reproduce with{" "}
              <code className="rounded bg-secondary px-1.5 py-0.5 font-mono">npm run eval</code>.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
