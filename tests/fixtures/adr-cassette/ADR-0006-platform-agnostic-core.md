# ADR-0006: The radar core (CLI) is platform-agnostic — no VCS/host coupling

- **Status:** Accepted
- **Date:** 2026-06-19

## Context

The radar core reads recorded intent (ADRs → constraints), checks a diff against it,
and renders the verdict projection. Domain code under src/core/ must remain free of
platform/VCS coupling so it stays testable without network or auth.

## Decision

Domain code under src/core/ MUST NOT invoke platform or VCS tooling.

## Machine-checkable constraints

```constraints
- id: ADR-0006-C1
  adr: ADR-0006
  title: radar core stays platform-agnostic (no git/host/VCS calls in src/core/)
  rule: >
    Domain code under src/core/ (the pure domain) MUST NOT invoke or import
    platform / VCS / host tooling — no child_process/exec of `gh` or `git`, no
    GitHub/GitLab API or Octokit client, no posting/editing of reviews, comments,
    labels or status. Adding such a call to src/core/ is a violation.
  polarity: prohibition
  driver: ADR-0006 — testable, host-portable core; separation of check from publish
  scope:
    paths: ["src/core/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "comment.ts renders markdown from verdicts and prints it; the workflow posts it via gh api"
      violating:
        - "src/ calls execFileSync('gh', ['api', ...]) to post or edit a review"
        - "src/ imports an Octokit/GitHub client or shells out to git"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
