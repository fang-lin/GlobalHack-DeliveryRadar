# ADR-0004: CI/CD via GitHub Actions — deploy Pages from the main repo, semantic-release (GitHub-only)

- **Status:** Accepted
- **Date:** 2026-06-17
- **Deciders:** Lin Fang
- **Related:** ST-0015 (the pipeline work); supersedes the manual deploy recipe in [ST-0001]/the deploy memory.

## Context

The showcase was deployed by hand: `npm run build` → `cp -R web/dist/. <clone>/` → commit/push a **separate** Pages repo (`GlobalHack-DeliveryRadar-pages`). This broke twice in one session — a wiped `/tmp` clone (lost `.git`) and a stale shell cwd after a folder rename — and there were no automated checks, so a type error or broken build could only be caught locally. The maintainer asked for a real pipeline: lint, unit tests, semantic-release, and Pages publish.

## Decision

Automate everything in **GitHub Actions**, on **Node 22**:

1. **`ci.yml`** (PRs + pushes to `main`): ESLint, typecheck (radar `tsc`, web `tsc --noEmit`), unit tests (`vitest`), and `vite build`. **Advisory** — it does not block merges (matches the product's "advisory, never blocks" stance).
2. **`release.yml`** (push to `main`): `semantic-release`, then build + deploy the SPA to Pages.
3. **Deploy Pages from the main repo** via the official `actions/upload-pages-artifact` + `actions/deploy-pages` (Pages source = "GitHub Actions"). **No secrets.** The separate `-pages` repo is **retired** (left in place, no longer deployed to).
4. **semantic-release is GitHub-only**: version + `CHANGELOG.md` + git tag + GitHub Release from **Conventional Commits**. **No npm publish.**
5. **One product version = the radar/CLI.** The `web/` showcase is the CLI's **documentation** and is *not* separately versioned — it always builds from the same commit as the CLI (same repo, deployed on every `main` push), so it cannot drift out of sync. semantic-release ignores `web`/`showcase`-scoped commits (via `commit-analyzer.releaseRules`), so site/doc changes **redeploy** the showcase but do **not** bump the CLI version (correct semver — docs don't change the CLI's API). If browsable multi-version docs (v1 vs v2) are ever needed, adopt a docs framework with versioning (Docusaurus/Starlight) — out of scope now.

## Consequences

- **Public URL changes** from `https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/` to **`https://fang-lin.github.io/GlobalHack-DeliveryRadar/`**. Update any link that pointed at the old URL; the old one keeps serving its last deploy until the `-pages` repo is deleted (maintainer's call — not deleted here).
- **Conventional Commits is now required** for `main` (so semantic-release can compute versions). We already mostly follow it (`feat/fix/docs/chore`).
- **One manual step the workflow can't do for you:** set repo **Settings → Pages → Source = "GitHub Actions"** once. `deploy-pages` needs `permissions: pages: write, id-token: write`; semantic-release needs `contents: write` (uses the built-in `GITHUB_TOKEN`, no PAT).
- The Anthropic-API **eval harness stays out of CI** (it costs money — hackathon key) — manual / `workflow_dispatch` only.
- The radar-on-PR product action (ST-0013) is unaffected and remains separate.
