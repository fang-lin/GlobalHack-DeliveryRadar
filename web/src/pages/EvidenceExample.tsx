import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEFT_UNGROUNDED, RIGHT_GROUNDED } from "@/data/workedExample";

function Md({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}

export default function EvidenceExample() {
  return (
    <div className="space-y-5">
      <header id="example-header">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Worked example</h1>
          <Badge variant="default">shop-demo</Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The same model, the same diff — a CI-green "fix stale stock count" PR — reviewed{" "}
          <span className="text-foreground">with and without recorded intent</span>. Left: a generic
          reviewer treats the staleness as a bug to fix and even proposes reading the primary
          directly — itself an ADR-001 violation. Right: grounded in the decision and its driver, it
          becomes a governable verdict.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card id="example-ungrounded">
          <CardContent className="p-5">
            <Badge variant="unknown">UNGROUNDED — generic review</Badge>
            <Md>{LEFT_UNGROUNDED}</Md>
          </CardContent>
        </Card>
        <Card id="example-grounded" className="border-primary/50 shadow-[0_0_32px_rgba(55,232,194,.07)]">
          <CardContent className="p-5">
            <Badge variant="default">GROUNDED — Delivery Radar</Badge>
            <Md>{RIGHT_GROUNDED}</Md>
          </CardContent>
        </Card>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        left: treats staleness as a bug — and proposes a primary read, itself an ADR-001 violation ·
        right: cites the decision, its reason, the evidence, the direction
      </p>
    </div>
  );
}
