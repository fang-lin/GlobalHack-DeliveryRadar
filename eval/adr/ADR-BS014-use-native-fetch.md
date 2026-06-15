# ADR-BS014: Use native fetch in Node.js code (supersedes ADR013)

- **Status:** Accepted (Backstage ADR 014) — **supersedes ADR013 (node-fetch)**
- **Source:** https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr014-use-fetch.md
- **Driver:** one HTTP client; native fetch on Node 20+

## Context

ADR013 originally mandated `node-fetch` for backend code. Node.js 20+ now ships a
stable, reliable `undici`-based native `fetch`, and `node-fetch` caused issues
that only appeared on newer Node versions. ADR014 therefore **supersedes ADR013**:
Node.js code should use the native global `fetch` and stop importing `node-fetch`.
Code written under ADR013 was correct then, but now drifts from the current
decision — the kind of change a human should confirm as a Supersede.

## Decision

Node.js code MUST use the native global `fetch`. It MUST NOT import `node-fetch`
(nor `axios` / `got`) for HTTP. Isomorphic packages accept an injected `fetch`.

```constraints
- id: ADR-BS014-C1
  adr: ADR-BS014
  title: Use native fetch in Node.js code (not node-fetch)
  rule: >
    Node.js code must use the native global fetch and must not import
    'node-fetch' (or 'axios'/'got') for HTTP requests. This supersedes the
    earlier node-fetch decision (ADR013); existing node-fetch imports are drift
    from the current intent.
  polarity: prohibition
  driver: "ADR014 — single native fetch client; supersedes ADR013"
  scope:
    paths: ["**/*.ts"]
    layers: ["backend"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "const res = await fetch(url, init);"
      violating:
        - "import fetch from 'node-fetch';"
  enforce: advisory
  severity: low
  status: active
  superseded_by: null
```
