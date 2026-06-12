# Ungrounded AI review (same model, no ADR grounding)

## Review

This change solves the symptom by introducing several serious problems. I would not approve it.

---

### Critical: `FOR UPDATE` on a display read

```python
"SELECT quantity FROM stock WHERE sku = %s FOR UPDATE"
```

`FOR UPDATE` acquires an **exclusive row-level lock**. It is designed for write transactions where you are about to modify the row (e.g., decrementing stock during checkout). Using it on a product-page display means:

- Every concurrent product page hit for the same SKU will **queue behind each other**, serializing all reads.
- Any actual write (purchase, restock) will be **blocked** until every in-flight page view releases its lock.
- Under normal traffic this will cause lock contention, timeouts, and potentially cascading failures on the primary.
- The lock scope depends entirely on when/whether the caller commits or rolls back the surrounding transaction, which is not managed here at all.

Remove `FOR UPDATE`. A plain `SELECT` is correct for a read.

---

### Major: Entire cache + replica path removed, all reads now hit primary

The cache and replica existed to absorb read traffic. Product pages are almost always read-heavy. Bypassing both on every page view will put severe load on the primary under any meaningful traffic. This is a scalability regression that could take the primary down.

---

### Major: Root cause is almost certainly cache invalidation, not the cache itself

The stale-count problem is almost certainly one of:

1. Cache TTL is too long.
2. Stock-mutation code (purchase, restock) doesn't invalidate `stock:{sku}`.

Deleting the cache is the wrong fix. The right fix is to invalidate (or update) the cache entry whenever stock changes, and/or shorten the TTL.

---

### Minor: No null guard for unknown SKU

```python
return int(row[0])   # TypeError if row is None (SKU not in table)
```

The original code had the same gap, but it's worth fixing here.

---

### Suggested direction

```python
def get_stock(self, sku: str) -> int:
    cached = self.cache.get(f"stock:{sku}")
    if cached is not None:
        return int(cached)
    # Read from replica for display; cache result with a short TTL.
    value = self.replica_db.query_stock(sku)
    self.cache.set(f"stock:{sku}", value, ttl=CACHE_TTL_SECONDS)
    return value
```

And in whatever code decrements stock (checkout path):

```python
self.cache.delete(f"stock:{sku}")   # or set the new value directly
```

If you genuinely need sub-second freshness on the product page (unusual), read from the primary with a plain `SELECT` — no lock, no cache bypass for writes.
