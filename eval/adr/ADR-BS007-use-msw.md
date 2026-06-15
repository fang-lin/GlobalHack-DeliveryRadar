# ADR-BS007: Mock HTTP in tests with MSW, not hand-rolled fetch mocks

- **Status:** Accepted (Backstage ADR 007)
- **Source:** https://github.com/backstage/backstage/blob/master/docs/architecture-decisions/adr007-use-msw-to-mock-service-requests.md
- **Driver:** one consistent HTTP-mocking approach in tests

## Context

react-testing-library recommends MSW (Mock Service Worker) over mocking `fetch`
directly. Backstage standardised on MSW to replace the fragmented ad-hoc mocking
across unit/integration tests (monkey-patching `global.fetch`, `jest.fn()` fetch
stubs, `nock`, etc.), giving an express-style route declaration and consistent
behaviour across environments.

## Decision

Tests MUST mock HTTP requests with MSW (`setupServer` + `rest`/`http` handlers).
Tests MUST NOT hand-roll HTTP mocks by reassigning `global.fetch`, stubbing fetch
with `jest.fn()`, or using `nock`.

```constraints
- id: ADR-BS007-C1
  adr: ADR-BS007
  title: Mock HTTP in tests with MSW
  rule: >
    Tests must mock HTTP via MSW (setupServer with rest/http handlers). They must
    not hand-roll HTTP mocks by reassigning global.fetch, stubbing fetch with
    jest.fn(), or using nock.
  polarity: prohibition
  driver: "ADR007 — consistent MSW-based HTTP mocking in tests"
  scope:
    paths: ["**/*.test.ts", "**/*.test.tsx"]
    layers: ["test"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "const server = setupServer(rest.get(url, (req,res,ctx)=>res(ctx.json(x))))"
      violating:
        - "global.fetch = jest.fn().mockResolvedValue({ ok: true })"
  enforce: advisory
  severity: low
  status: active
  superseded_by: null
```
