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

The same platform-agnosticism applies to **configuration**: the core takes its config and secrets **only from the process environment** (`process.env`). It MUST NOT read a `.env` file, walk the filesystem looking for one, or assume any other runtime precondition the shell doesn't guarantee — a CI pipeline has no `.env`; it injects env vars / secrets directly. `.env` is a developer convenience sourced into the shell (`set -a; source .env; set +a`), never read by the CLI. (Surfaced 2026-06-21: the model layer had grown a filesystem `.env` walker, which silently no-op'd in any non-`.env` shell — exactly the hidden precondition this forbids.)

## Consequences

- The core is unit-testable with plain fixtures — no network, no auth, no platform.
- The radar can target another host (GitLab, Gitea, a local pre-commit) by writing a new adapter, without touching the core.
- The workflow carries a little more bash (the `gh` calls) — which is exactly where platform glue belongs.
- A new self-check (constraint below) guards against the coupling creeping back — dogfood: the radar enforces its own architecture.
- Config is reproducible across local shells and CI with no hidden file dependency — given the same environment, the CLI runs identically (constraint ADR-0006-C2).

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
- id: ADR-0006-C2
  adr: ADR-0006
  title: radar config comes only from the environment (no .env / file / runtime preconditions)
  rule: >
    Code under src/ MUST read configuration and secrets only from the process
    environment (process.env). It MUST NOT read a .env file (or any other config
    file) from disk, walk the filesystem looking for one, or otherwise assume a
    runtime precondition the shell does not guarantee. The runtime is a plain
    shell; a CI pipeline injects env vars / secrets and has no .env. A developer
    may source .env into their own shell, but that is outside the CLI. Adding
    .env / config-file reading to src/ is a violation.
  polarity: prohibition
  driver: ADR-0006 — standardized, platform-agnostic CLI interface; no hidden preconditions; local/CI parity
  scope:
    paths: ["src/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "makeModelClient reads RADAR_PROVIDER / RADAR_MODEL / keys from process.env only"
        - "a developer runs `set -a; source .env; set +a` then invokes the CLI; the CLI itself reads only env"
      violating:
        - "src/ opens, parses, or walks parent directories for a .env file"
        - "the CLI assumes a config file exists at a fixed path and reads it on startup"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
