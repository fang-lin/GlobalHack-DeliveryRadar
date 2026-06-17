# ST-NNNN: <short imperative title>

<!-- Copy this file to `ST-NNNN-<kebab-title>.md`, fill it in, and add a row to README.md. -->

- **Status:** Todo <!-- Todo · In progress · In review · Done · Dropped -->
- **Type:** <feature / frontend / infra / tooling / docs / dogfood / …>
- **Implements / Relates:** <VIS-n · FR-… · ADR-NNNN · sibling ST-NNNN>

## Story

As a <role>, I want <capability>, so that <outcome>.

## Acceptance criteria

- [ ] <observable, testable outcome>
- [ ] …

## Verification / QA

How each AC is checked **before Done** — we don't self-declare Done (see the verification gate in `README.md`):

- **Automated:** CI green on the PR — lint · typecheck · unit tests · build.
- **`qa-engineer` agent** (`.claude/agents/qa-engineer.md`): for any live/deployed/web behaviour (redirects, routes, rendering, responsive) — produces a pass/fail evidence table. Dispatch it (or, for code-only stories, note "N/A — covered by CI/tests").
- **Maintainer sign-off:** the maintainer reviews/tests and confirms → only then flip the status to **Done**.

## Notes

<context · decisions · links to commits/PRs · evidence>
