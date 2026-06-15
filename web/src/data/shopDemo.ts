// Static demo data for the "product in use" dashboard.
// Subject: the GlobalHack-shop-demo repository (our staged demo repo).
// Conformance verdicts mirror the real radar run on shop-demo PR #1; drift /
// at-risk / triage are seeded to preview the full loop.

export interface Verdict {
  pr: number;
  prUrl: string;
  title: string;
  adr: string;
  constraint: string;
  result: "violated" | "aligned" | "unknown";
  confidence: number;
  severity: "high" | "medium" | "low";
  file: string;
  lines: string;
  driver: string;
  ci: "green" | "red";
  explanation: string;
}

export interface AtRiskAdr {
  adr: string;
  title: string;
  health: number; // 0..1 conformance health
  trend: "down" | "flat" | "up";
  note: string;
}

export interface TriageItem {
  id: string;
  kind: "Decision Note" | "Drift report";
  pr?: number;
  title: string;
  proposal: string;
  summary: string;
}

export const shopDemo = {
  repo: "GlobalHack-shop-demo",
  repoUrl: "https://github.com/fang-lin/GlobalHack-shop-demo",
  stats: { adrs: 2, constraints: 2, openPrs: 2, violations: 1, aligned: 1 },

  conformance: [
    {
      pr: 1,
      prUrl: "https://github.com/fang-lin/GlobalHack-shop-demo/pull/1",
      title: "Fix stale stock count on product page",
      adr: "ADR-001",
      constraint: "ADR-001-C1",
      result: "violated",
      confidence: 0.99,
      severity: "high",
      file: "services/inventory/reader.py",
      lines: "L19–L23",
      driver: "EPIC-512",
      ci: "green",
      explanation:
        "Removes the cache/replica read path and replaces it with a synchronous SELECT … FOR UPDATE on the primary — the exact row-locking pattern ADR-001 prohibits. The business accepts ≤5-min staleness for page latency and DB stability; freshness belongs to the checkout reservation path.",
    },
    {
      pr: 2,
      prUrl: "https://github.com/fang-lin/GlobalHack-shop-demo/pull/2",
      title: "Add product-page view counter",
      adr: "ADR-001",
      constraint: "ADR-001-C1",
      result: "aligned",
      confidence: 0.97,
      severity: "high",
      file: "services/inventory/views.py",
      lines: "L8–L14",
      driver: "EPIC-512",
      ci: "green",
      explanation:
        "Reads the stock count through the existing read-through cache with replica fallback; no synchronous primary reads and no row locks. Compatible with ADR-001.",
    },
  ] satisfies Verdict[],

  // ADR-001 conformance health over the last 8 weeks (the dip = PR #1 landing in review).
  driftSeries: [
    { week: "W-8", health: 0.98 },
    { week: "W-7", health: 0.98 },
    { week: "W-6", health: 0.95 },
    { week: "W-5", health: 0.95 },
    { week: "W-4", health: 0.9 },
    { week: "W-3", health: 0.88 },
    { week: "W-2", health: 0.82 },
    { week: "now", health: 0.62 },
  ],

  atRisk: [
    {
      adr: "ADR-001",
      title: "Inventory reads tolerate eventual consistency",
      health: 0.62,
      trend: "down",
      note: "1 open PR reintroduces a banned primary read pattern; decay accelerating.",
    },
    {
      adr: "ADR-002",
      title: "Checkout owns authoritative stock reservation",
      health: 0.96,
      trend: "flat",
      note: "Stable; reservation path unchanged this cycle.",
    },
  ] satisfies AtRiskAdr[],

  triage: [
    {
      id: "DN-7",
      kind: "Decision Note",
      pr: 1,
      title: "Sub-second freshness requested on product page",
      proposal: "Supersede?",
      summary:
        "PR #1 implies the team may now want strong freshness on the product page — which would contradict ADR-001's driver (EPIC-512). Draft a Decision Note: confirm the trade-off still holds, or supersede ADR-001 with a new decision. Machine drafts; human decides.",
    },
    {
      id: "DN-6",
      kind: "Decision Note",
      pr: 2,
      title: "New read path added to inventory service",
      proposal: "Graduate?",
      summary:
        "PR #2 adds a cache-fronted read path consistent with ADR-001. Capture as a worked example, or graduate a finer-grained constraint for view-counter reads.",
    },
  ] satisfies TriageItem[],
};
