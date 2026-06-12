// Dashboard data feed. The top conformance entry mirrors the REAL verdict
// produced by `radar check` on shop-demo PR #1; drift/capture sections are
// seeded demo data illustrating the Phase 2 product vision.
window.RADAR_DATA = {
  repo: "fang-lin/shop-demo",
  generated_at: "2026-06-12T14:30:00+02:00",
  kpis: {
    adrs: 2,
    active_constraints: 2,
    alignment_rate: 0.87,
    open_violations: 7,
    notes_awaiting_triage: 1,
  },
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
      {
        adr: "ADR-001",
        title: "Inventory reads tolerate eventual consistency",
        trend: [0, 0, 1, 0, 1, 1, 2, 2],
        violations: 2,
        health: "decaying",
      },
      {
        adr: "ADR-002",
        title: "Cross-service integration goes through the event bus",
        trend: [1, 1, 2, 3, 3, 4, 5, 5],
        violations: 5,
        health: "at-risk",
      },
    ],
    at_risk: {
      adr: "ADR-002",
      title: "Cross-service integration goes through the event bus",
      driver: "EPIC-340",
      violations: 5,
      trend_note: "+4 violations in 8 weeks, 3 different services",
      options: [
        {
          kind: "remediation",
          label: "Remediation",
          summary:
            "Draft issue: replace 5 direct HTTP call sites with event consumption or local views (est. 3 PRs, assignable to an agent).",
        },
        {
          kind: "supersede",
          label: "Supersede",
          summary:
            "Draft ADR-007: allow synchronous calls inside the fulfilment domain boundary; keep the event bus mandatory across domains.",
        },
      ],
    },
  },
  capture_queue: [
    {
      id: "DN-2026-0042",
      pr: 38,
      detected:
        "Introduces a direct HTTP call from orders to inventory for pre-checkout stock validation.",
      suggested_class: "architectural",
      evidence: "services/orders/checkout.py L44–L61",
      status: "draft",
    },
  ],
};
