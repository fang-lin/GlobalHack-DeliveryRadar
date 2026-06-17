# ST-0015: CI/CD pipeline (GitHub Actions)

- **Status:** In progress — building (decisions locked, see below); will go to the maintainer for review/test before Done.
- **Type:** infra / tooling
- **Relates to:** ADR-0004 (to be written once the deploy target is chosen); distinct from [ST-0013](ST-0013-github-action.md) (that runs the *radar* on PRs — a product feature; this is the *repo's own* build/test/deploy).

## Story

As the maintainer, I want the repo's checks and the showcase deploy to run automatically in GitHub Actions, so that (a) type errors / broken builds are caught on every PR, and (b) pushing to `main` publishes the showcase without the manual `npm run build` → `cp dist` → push-to-pages-repo dance (which broke twice this session: a wiped `/tmp` clone and a stale cwd).

## Scope

Five capabilities, all requested:

1. **Lint** — ESLint over the radar (TS) and web (TS + React). **No ESLint config exists yet**, so this includes adding one (typescript-eslint recommended + `eslint-plugin-react-hooks`/`react-refresh` for web). The first run will likely surface existing issues → a one-off cleanup pass is part of the work.
2. **Unit tests** — run `vitest` (`npm test`) for the radar. Free, already present; just wire it into CI.
3. **Typecheck + build** — radar `tsc`; web `tsc --noEmit` then `vite build` (note: `vite build` alone does **not** typecheck).
4. **semantic-release** — on push to `main`, derive the next version from **Conventional Commits**, then generate a CHANGELOG + git tag + GitHub Release. Requires commit messages to follow Conventional Commits — we mostly already do (`feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`); this makes it a hard rule going forward.
5. **Publish to GitHub Pages** — build the SPA and deploy it (mechanism per **Q1**).

**Workflow shape (proposed):**
- `ci.yml` — on PRs + pushes to `main`: lint → typecheck → unit tests → web build. Goes red on any failure. Advisory for now (not a required/blocking check).
- `release.yml` — on push to `main`, after CI is green: `semantic-release` (version / CHANGELOG / tag / GitHub Release), then build + deploy Pages.

**Out (explicitly, for now):**
- **Eval harness in CI** — `npm run eval` hits the Anthropic API and costs money (hackathon key, sonnet-4-6, "省着用"). Manual only; at most a `workflow_dispatch` job later, never on every push.
- **Hard gating** — keep checks advisory; don't block merges yet (matches the product's "advisory, never blocks" stance).
- The radar-on-PR action (that's [ST-0013](ST-0013-github-action.md)).

## Decisions (locked 2026-06-17)

**Chosen — Q1 → Option A** (deploy from the main repo; URL → `https://fang-lin.github.io/GlobalHack-DeliveryRadar/`; no secrets; retire the `-pages` repo, left in place but no longer deployed to). **Q2 → Option A** (GitHub-only releases — no npm). Recorded in ADR-0004. Options kept below as rationale.

**Q1 — Pages deploy target / public URL.** Today the SPA lives in the **main** repo (`web/`) but is published to a **separate** repo `GlobalHack-DeliveryRadar-pages`, served at `https://fang-lin.github.io/GlobalHack-DeliveryRadar-pages/`.
- **Option A — Deploy Pages from the main repo** (official `upload-pages-artifact` + `deploy-pages`). Cleanest, **no secrets**, fewer moving parts; retire the `-pages` repo. **But the URL changes** to `https://fang-lin.github.io/GlobalHack-DeliveryRadar/`.
- **Option B — Keep publishing to the `-pages` repo** from the Action (cross-repo push via a deploy key / PAT stored as an Actions **secret**). **URL stays the same**, but needs a secret and keeps two repos.

**Q2 — semantic-release publish target.**
- **Option A — GitHub-only (recommended)** — tags + CHANGELOG + GitHub Releases (`@semantic-release/github` + `@semantic-release/git` + `@semantic-release/changelog`). No registry publish. Right for a showcase repo not meant to be `npm install`-ed.
- **Option B — also publish to npm** — additionally publish the radar to the npm registry (needs an `NPM_TOKEN` secret + a real package name + `"private": false`). Only if you want people to `npm i` the radar.

## Versioning model (web tracks the CLI)

The `web/` showcase is (becoming) the CLI's **documentation** and must stay in sync with the radar. Best practice for "docs co-located with the tool", and what we do:

- **One product version = the radar/CLI.** The web is **not** separately versioned; it always builds from the **same commit** as the CLI (same repo, deployed on every `main` push), so it can't drift.
- semantic-release **ignores `web`/`showcase`-scoped commits** (`commit-analyzer.releaseRules`): site/doc changes **redeploy** the showcase but do **not** bump the CLI version (docs don't change the CLI's API).
- **Optional (recommended, not yet built):** surface the CLI version in the web footer (inject `package.json` version at build) so visitors see which version the docs describe.
- **Future:** browsable multi-version docs (v1 vs v2) → a docs framework with versioning (Docusaurus/Starlight). Out of scope now.

Recorded in ADR-0004.

## Acceptance criteria (provisional — finalised after Q1/Q2)

- [ ] ESLint config added; `ci.yml` lints radar + web and goes red on lint errors (after the initial cleanup pass).
- [ ] `ci.yml` runs `vitest`, radar `tsc`, and web `tsc --noEmit` + `vite build` on PRs + pushes to `main`.
- [ ] `release.yml` runs `semantic-release` on `main`: version bump + CHANGELOG + git tag + GitHub Release from Conventional Commits (scope per Q2).
- [ ] Pushing to `main` auto-publishes `web/dist` to GitHub Pages (per Q1), replacing the manual deploy.
- [ ] No secrets committed; any token lives in Actions secrets only.
- [ ] README + deploy memory updated: deploy is automatic, releases are automatic, and Conventional Commits is now required.

## Notes

Pins Node 22 (project runtime). **Package manager migrated to pnpm + workspaces** (one `pnpm-workspace.yaml`, single `pnpm install` for radar + web; `corepack` provisions pnpm, no global install). CI caching: `actions/setup-node` with `cache: pnpm` (after `pnpm/action-setup`). The manual-deploy pain this session is the direct motivation — see the deploy-pitfalls note in the project deploy memory.
