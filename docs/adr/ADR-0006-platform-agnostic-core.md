# ADR-0006: The radar core (CLI) is platform-agnostic — no VCS/host coupling

- **Status:** Accepted
- **Date:** 2026-06-19
- **Deciders:** Lin Fang
- **Related:** ADR-0003 (TS rewrite) · FR-INT-1 / FR-INT-7 (integration) · ST-0021

## Context

The radar core reads recorded intent (ADRs → constraints), checks a diff against it, and renders the verdict projection. While wiring up the sticky progress review (ST-0021 / FR-INT-7), the `comment` command had grown to call `gh api` directly — `postReview`, and then `updateReview` — coupling the core to GitHub and the `gh` binary. That's the wrong layer: it makes the core untestable without a live platform + auth, locks it to one host, and tangles *"what is the verdict"* with *"how do we publish it."*

## Decision

The radar core (everything under `src/`) is **platform-agnostic**. It only reads inputs (ADRs, the diff, verdicts) and emits outputs (constraints, verdicts, rendered markdown) to **stdout / files**. It MUST NOT talk to git, GitHub, `gh`, or any host / VCS / CI API.

All platform I/O — fetching the diff, posting or editing a review, labels, status checks — lives in the **integration layer** (the GitHub Action workflow today; any adapter tomorrow), which drives the core and publishes its output. Concretely: `radar comment` *renders* the review body and prints it; it does **not** post it. The workflow runs `gh pr diff` and feeds the core via `--diff`, takes the rendered body, and posts/edits the review via `gh api`.

## Consequences

- The core is unit-testable with plain fixtures — no network, no auth, no platform.
- The radar can target another host (GitLab, Gitea, a local pre-commit) by writing a new adapter, without touching the core.
- The workflow carries a little more bash (the `gh` calls) — which is exactly where platform glue belongs.
- A new self-check (constraint below) guards against the coupling creeping back — dogfood: the radar enforces its own architecture.

## Machine-checkable constraints

```constraints
- id: ADR-0006-C1
  adr: ADR-0006
  title: radar core stays platform-agnostic (no git/host/VCS calls in src/)
  rule: >
    Domain code under src/ MUST NOT invoke or import platform / VCS / host
    tooling — no child_process/exec of `gh` or `git`, no GitHub/GitLab API or
    Octokit client, no posting/editing of reviews, comments, labels or status.
    The core only reads inputs (ADRs, diff, verdicts) and emits outputs
    (constraints, verdicts, rendered markdown) to stdout/files. All platform
    I/O lives in the integration layer (the workflow / an adapter) that drives
    the core. Adding such a call to src/ is a violation.
  polarity: prohibition
  driver: ADR-0006 — testable, host-portable core; separation of check from publish
  scope:
    paths: ["src/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "comment.ts renders markdown from verdicts and prints it; the workflow posts it via gh api"
        - "the CLI fetches nothing — the workflow runs `gh pr diff` and passes the file via --diff"
      violating:
        - "src/ calls execFileSync('gh', ['api', ...]) to post or edit a review"
        - "src/ imports an Octokit/GitHub client or shells out to git"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
