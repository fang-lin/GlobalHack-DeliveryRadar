# ST-0017: Bump CI/CD GitHub Actions to current (Node 24) majors

- **Status:** Done (2026-06-17) — actions on current Node 24 majors; both workflows green; Node 20 annotation gone; maintainer signed off.
- **Type:** infra / tooling / maintenance
- **Relates to:** ST-0015 / ADR-0004 (the pipeline)

## Story

As the maintainer, I want the workflow actions on their current majors (Node 24 runtimes), so CI stops emitting the "Node.js 20 is deprecated" warning and we're not on soon-to-be-removed runners.

## Acceptance criteria

- [x] All actions in `ci.yml` + `release.yml` bumped to current majors: `checkout@v6` · `setup-node@v6` · `pnpm/action-setup@v6` · `configure-pages@v6` · `upload-pages-artifact@v5` · `deploy-pages@v5`.
- [x] CI + release runs stay green — no behavioural regression (pnpm install, lint/test/build, semantic-release, Pages deploy all still work; site 200).
- [x] The "Node.js 20 is deprecated" annotation no longer appears.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` + `release.yml` runs on `main` | ✅ both green 2026-06-17 (CI run 27695345432 · Release&Deploy 27695345400) — **no Node 20 annotation** |
| Live / web behaviour | `qa-engineer` — N/A (CI-internal); deploy re-ran, site returns 200 | ✅ |
| Maintainer sign-off | maintainer confirms green + warning gone | ✅ 2026-06-17 |

## Notes

Latest majors checked 2026-06-17. `pnpm/action-setup@v6` is the one to watch — it reads the `packageManager` field (`pnpm@9.15.9`); confirm pnpm still provisions. Roll back any single action that regresses. CI-internal change, so the `qa-engineer` web check is N/A beyond confirming the deployed site still returns 200.
