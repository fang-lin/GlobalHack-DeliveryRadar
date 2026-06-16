// Dashboard data, per subject. Drives the rich product-runtime dashboard.
//
// `shop-demo` is migrated VERBATIM from the legacy dashboard/data.js (ST-0004 parity
// bar — do not re-author). `backstage` is a seeded preview anchored on Backstage's
// real ADRs, with the one real merged-PR violation (toFormat / PR #28986) marked real.

export interface Verdict {
  constraint_id: string;
  constraint_title: string;
  adr: string;
  driver: string;
  result: "violated" | "aligned" | "unknown";
  confidence: number;
  severity: string;
  evidence: string;
  explanation: string;
}
export interface FeedPR {
  pr: number;
  title: string;
  author: string;
  ci: string;
  live?: boolean;
  verdicts: Verdict[];
}
export interface DriftAdr {
  adr: string;
  title: string;
  trend: number[];
  violations: number;
  health: string;
}
export interface AtRiskOption {
  kind: "remediation" | "supersede";
  label: string;
  summary: string;
}
export interface AtRisk {
  adr: string;
  title: string;
  driver: string;
  violations: number;
  trend_note: string;
  options: AtRiskOption[];
}
export interface CaptureNote {
  id: string;
  pr: number;
  detected: string;
  suggested_class: string;
  evidence: string;
  status: string;
}
export interface DashboardData {
  subject: string;
  repo: string;
  repoUrl: string;
  generated_at: string;
  feedNote: string; // honesty: what's real vs seeded
  kpis: {
    adrs: number;
    active_constraints: number;
    alignment_rate: number;
    open_violations: number;
    notes_awaiting_triage: number;
  };
  conformance_feed: FeedPR[];
  drift: { adrs: DriftAdr[]; at_risk: AtRisk };
  capture_queue: CaptureNote[];
}

// ---- shop-demo: verbatim from legacy dashboard/data.js ----
export const shopDemo: DashboardData = {
  subject: "shop-demo",
  repo: "fang-lin/GlobalHack-shop-demo",
  repoUrl: "https://github.com/fang-lin/GlobalHack-shop-demo",
  generated_at: "2026-06-12T14:30:00+02:00",
  feedNote: "Top entry mirrors the real `radar check` verdict on PR #1; drift / capture are seeded to preview the Phase-2 product.",
  kpis: { adrs: 2, active_constraints: 2, alignment_rate: 0.87, open_violations: 7, notes_awaiting_triage: 1 },
  conformance_feed: [
    {
      pr: 1,
      title: "Fix stale stock count on product page",
      author: "fang-lin",
      ci: "green",
      live: true,
      verdicts: [
        {
          constraint_id: "ADR-001-C1",
          constraint_title: "Inventory reads tolerate eventual consistency",
          adr: "ADR-001",
          driver: "EPIC-512",
          result: "violated",
          confidence: 0.99,
          severity: "high",
          evidence: "services/inventory/reader.py L19–L23",
          explanation:
            "Removes the compliant cache+replica read path and replaces it with SELECT ... FOR UPDATE against the primary — reintroducing the lock contention that caused the 8x checkout latency degradation during the 2025 peak event (EPIC-512).",
        },
        {
          constraint_id: "ADR-002-C1",
          constraint_title: "No direct synchronous calls between services",
          adr: "ADR-002",
          driver: "EPIC-340",
          result: "aligned",
          confidence: 0.92,
          severity: "medium",
          evidence: "services/inventory/reader.py L16–L22",
          explanation:
            "The diff only modifies how the inventory service reads its own database; no synchronous HTTP call to another service is introduced.",
        },
      ],
    },
    {
      pr: 47,
      title: "Add category-level stock badges",
      author: "m-keller",
      ci: "green",
      verdicts: [
        {
          constraint_id: "ADR-001-C1",
          constraint_title: "Inventory reads tolerate eventual consistency",
          adr: "ADR-001",
          driver: "EPIC-512",
          result: "aligned",
          confidence: 0.88,
          severity: "high",
          evidence: "services/inventory/badges.py",
          explanation: "Badge counts read from the cache-fed materialized view.",
        },
      ],
    },
    {
      pr: 44,
      title: "Refactor warehouse sync job",
      author: "s-okafor",
      ci: "green",
      verdicts: [
        {
          constraint_id: "ADR-002-C1",
          constraint_title: "No direct synchronous calls between services",
          adr: "ADR-002",
          driver: "EPIC-340",
          result: "unknown",
          confidence: 0.41,
          severity: "medium",
          evidence: "services/fulfilment/sync.py",
          explanation:
            "The new client wrapper hides the transport; cannot determine from the diff whether calls cross a service boundary.",
        },
      ],
    },
    {
      pr: 41,
      title: "Order intake validation hardening",
      author: "fang-lin",
      ci: "green",
      verdicts: [
        {
          constraint_id: "ADR-002-C1",
          constraint_title: "No direct synchronous calls between services",
          adr: "ADR-002",
          driver: "EPIC-340",
          result: "aligned",
          confidence: 0.95,
          severity: "medium",
          evidence: "services/orders/api.py",
          explanation: "Validation stays local; integration remains event-only.",
        },
      ],
    },
  ],
  drift: {
    adrs: [
      { adr: "ADR-001", title: "Inventory reads tolerate eventual consistency", trend: [0, 0, 1, 0, 1, 1, 2, 2], violations: 2, health: "decaying" },
      { adr: "ADR-002", title: "Cross-service integration goes through the event bus", trend: [1, 1, 2, 3, 3, 4, 5, 5], violations: 5, health: "at-risk" },
    ],
    at_risk: {
      adr: "ADR-002",
      title: "Cross-service integration goes through the event bus",
      driver: "EPIC-340",
      violations: 5,
      trend_note: "+4 violations in 8 weeks, 3 different services",
      options: [
        { kind: "remediation", label: "Remediation", summary: "Draft issue: replace 5 direct HTTP call sites with event consumption or local views (est. 3 PRs, assignable to an agent)." },
        { kind: "supersede", label: "Supersede", summary: "Draft ADR-007: allow synchronous calls inside the fulfilment domain boundary; keep the event bus mandatory across domains." },
      ],
    },
  },
  capture_queue: [
    {
      id: "DN-2026-0042",
      pr: 38,
      detected: "Introduces a direct HTTP call from orders to inventory for pre-checkout stock validation.",
      suggested_class: "architectural",
      evidence: "services/orders/checkout.py L44–L61",
      status: "draft",
    },
  ],
};

// ---- backstage: seeded preview on Backstage's real ADRs (PR #28986 violation is real) ----
export const backstage: DashboardData = {
  subject: "backstage",
  repo: "backstage/backstage",
  repoUrl: "https://github.com/backstage/backstage",
  generated_at: "2026-06-16T10:00:00+02:00",
  feedNote: "Seeded preview anchored on Backstage's real ADRs. PR #28986 (toFormat) is a REAL merged violation; the others are representative.",
  kpis: { adrs: 16, active_constraints: 12, alignment_rate: 0.9, open_violations: 4, notes_awaiting_triage: 2 },
  conformance_feed: [
    {
      pr: 28986,
      title: "Fix date parsing and formatting in convertTimeToLocalTimezone",
      author: "backstage-contrib",
      ci: "green",
      live: true,
      verdicts: [
        {
          constraint_id: "ADR-BS012-C1",
          constraint_title: "Display dates with Luxon locale presets, not custom toFormat",
          adr: "ADR-BS012",
          driver: "locale-consistent dates",
          result: "violated",
          confidence: 0.97,
          severity: "low",
          evidence: "plugins/catalog-unprocessed-entities/.../FailedEntities.tsx L104",
          explanation:
            "A merged PR that 'fixes date formatting' yet still returns a custom toFormat('yyyy-MM-dd hh:mm:ss ZZZZ') for a UI-displayed value — violates ADR012 (use locale presets). [real]",
        },
      ],
    },
    {
      pr: 33012,
      title: "Add StatusLabel badge component",
      author: "seed-bot",
      ci: "green",
      verdicts: [
        {
          constraint_id: "ADR-BS006-C1",
          constraint_title: "Avoid React.FC / React.SFC in new code",
          adr: "ADR-BS006",
          driver: "explicit component typing",
          result: "violated",
          confidence: 0.94,
          severity: "low",
          evidence: "plugins/catalog/.../StatusLabel.tsx",
          explanation: "New component typed as `React.FC<Props>` — ADR006 prohibits React.FC in new code. [seeded]",
        },
      ],
    },
    {
      pr: 33044,
      title: "Add GitLab integration tests",
      author: "seed-bot",
      ci: "green",
      verdicts: [
        {
          constraint_id: "ADR-BS007-C1",
          constraint_title: "Mock HTTP in tests with MSW",
          adr: "ADR-BS007",
          driver: "consistent test mocking",
          result: "aligned",
          confidence: 0.95,
          severity: "low",
          evidence: "packages/integration/.../GitLabIntegration.test.ts",
          explanation: "Mocks HTTP via MSW setupServer + rest handlers — compliant with ADR007. [seeded]",
        },
      ],
    },
  ],
  drift: {
    adrs: [
      { adr: "ADR-BS012", title: "Use Luxon locale presets for displayed dates", trend: [0, 1, 1, 2, 2, 3, 3, 4], violations: 4, health: "decaying" },
      { adr: "ADR-BS014", title: "Use native fetch (supersedes node-fetch)", trend: [6, 6, 5, 5, 5, 5, 6, 6], violations: 6, health: "at-risk" },
    ],
    at_risk: {
      adr: "ADR-BS014",
      title: "Use native fetch in Node.js code (supersedes ADR013)",
      driver: "single native fetch client",
      violations: 6,
      trend_note: "6 files still import node-fetch after ADR014 superseded ADR013",
      options: [
        { kind: "remediation", label: "Remediation", summary: "Draft issue: migrate the 6 remaining `import from 'node-fetch'` sites to the native global fetch." },
        { kind: "supersede", label: "Supersede", summary: "Draft an addendum: permit node-fetch where a Node-style stream body is required (e.g. UrlReader), keep native fetch elsewhere." },
      ],
    },
  },
  capture_queue: [
    {
      id: "DN-BS-0007",
      pr: 33051,
      detected: "A test stubs the network with `global.fetch = jest.fn()` instead of MSW.",
      suggested_class: "test-convention",
      evidence: "plugins/foo-backend/.../FooClient.test.ts",
      status: "draft",
    },
  ],
};

export const DASHBOARDS: Record<string, DashboardData> = {
  "shop-demo": shopDemo,
  backstage,
};
