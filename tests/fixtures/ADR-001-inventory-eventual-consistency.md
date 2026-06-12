# ADR-001: Inventory reads tolerate eventual consistency

- **Status:** Accepted
- **Date:** 2026-04-02
- **Driver:** [EPIC-512 — Peak-sale resilience](https://tracker.example.com/epics/EPIC-512)

## Context

During peak sales events (Black Friday, flash deals) product-page traffic
amplifies inventory reads roughly 40x. The primary database cannot serve that
read load while also processing checkout writes; in the 2025 peak event,
synchronous stock reads caused lock contention that degraded checkout latency
by 8x and cost an estimated €400k in abandoned carts.

The business explicitly accepts displaying stock counts that are up to five
minutes stale, in exchange for conversion-critical page latency and primary
database stability (EPIC-512). Checkout performs the authoritative stock
re-check at reservation time, so a stale product-page count never oversells.

## Decision

All inventory read paths serve from the read-through cache (TTL 300s). Read
paths MUST NOT query the primary store synchronously and MUST NOT acquire row
locks on stock rows. Freshness guarantees belong exclusively to the checkout
reservation path.

## Consequences

- Product pages may display stock counts up to 5 minutes old; this is accepted
  and documented behavior, not a bug.
- "Stale count" complaints are resolved by explaining the trade-off or tuning
  the TTL — never by bypassing the cache.
- Checkout (reservation path) is the only component allowed strong reads.

```constraints
- id: ADR-001-C1
  adr: ADR-001
  title: Inventory reads tolerate eventual consistency
  rule: >
    Inventory read paths must tolerate up to 5 minutes of stale data and must
    not assume strong consistency: no synchronous reads of the primary store
    and no row locking (e.g. SELECT ... FOR UPDATE) on stock rows in any read
    path. Freshness belongs exclusively to the checkout reservation path.
  polarity: requirement
  driver: EPIC-512
  scope:
    paths: ["services/inventory/**"]
    layers: ["read-model"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "cache.get(f\"stock:{sku}\")"
        - "replica_db.query_stock(sku) with cache fill"
      violating:
        - "SELECT quantity FROM stock WHERE sku = %s FOR UPDATE"
        - "primary_db.execute(...) inside a read path"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
