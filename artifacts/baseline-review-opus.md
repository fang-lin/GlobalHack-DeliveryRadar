# Ungrounded AI review (same model, no ADR grounding)

## Review

This change "works" in the narrow sense that it returns a fresh value, but it's the wrong fix and introduces serious problems. I'd block it.

### Critical issues

**1. `FOR UPDATE` on a read/display path is a bad idea**
This is the product page — a high-traffic, read-heavy path. `SELECT ... FOR UPDATE` takes a row lock. Every concurrent view of the same SKU will now serialize on that lock, and any process actually mutating stock (checkout, restock) will contend with display reads. Expect lock waits, timeouts, and deadlocks under load. A display value should never lock the row.

**2. The lock is also probably useless here**
There's no surrounding transaction shown. `FOR UPDATE` only holds a lock for the duration of the transaction; if this runs in autocommit it provides no real consistency guarantee, and if it doesn't autocommit you may be leaking held locks because nothing commits/rolls back. Either way the lock buys you nothing for a read.

**3. Cache and replica are now completely dead code**
Every call hits the primary directly. You've removed caching entirely, which will dramatically increase primary DB load. The injected `cache` and `replica_db` are now unused. This is a scalability regression, not just a style nit.

**4. `NoneType` crash for unknown/zero-row SKUs**
```python
row = ...fetchone()
return int(row[0])
```
If the SKU isn't found, `fetchone()` returns `None` and `int(row[0])` throws `TypeError`. The old replica path presumably handled this. Need a `None` guard.

### Root cause concern

Stale stock is almost certainly a **cache invalidation** problem: when stock changes, the `stock:{sku}` key isn't being invalidated/updated, so it serves until TTL expiry. The correct fix is to invalidate (or write-through update) the cache entry when stock is decremented/restocked — not to throw away caching and lock rows on the read path.

If a small consistency window is genuinely unacceptable for this display, a far cheaper approach would be a plain primary read (no `FOR UPDATE`) with a short TTL cache, but I'd push back even on that until invalidation is ruled out.

### Suggested direction
- Keep the cache; fix invalidation at the write site (decrement/restock).
- If you must read fresher data, do a normal `SELECT` (no lock) and handle `None`.
- Drop `FOR UPDATE` entirely from this code path.

Happy to look again once invalidation is addressed.
