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

Status flips to **Done** only after this gate passes (see `README.md`). **Fill the `result` column in as you verify** — a finished story must show a concrete `qa-engineer` verdict, not just the intent to run it.

| gate | how | result (fill in) |
|---|---|---|
| Automated | CI on the PR — lint · typecheck · unit tests · build | ⬜ pending → ✅ green (run #___) |
| Live / web behaviour | **`qa-engineer`** agent (`.claude/agents/qa-engineer.md`) — pass/fail evidence table | ⬜ N/A (code-only) · ⬜ pending · ✅ ___/___ pass — paste or link the table |
| Maintainer sign-off | maintainer reviews/tests the result | ⬜ pending → ✅ \<who\>, \<date\> |

> Example of a filled-in QA table: ST-0016 (the `qa-engineer` run that verified the `-pages` redirects, 8/8).

## Notes

<context · decisions · links to commits/PRs · evidence>
