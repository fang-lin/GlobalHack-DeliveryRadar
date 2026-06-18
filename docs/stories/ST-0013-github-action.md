# ST-0013: GitHub Action — radar-check a PR against recorded intent (manual, advisory)

- **Status:** In progress — building (decisions locked); pending the API-key secret + a maintainer run.
- **Type:** integration (capability #6)
- **Spec:** `FR-INT-1`, `FR-INT-6` (manual gating), `NFR-COST-1` (LLM cost gatable), advisory per `NFR-GATE-1`.

## Story

As the maintainer, I want to run the radar on a chosen PR with one click and have it post an advisory review citing the team's recorded intent — so the radar is a CI-integrated product, not just a manual CLI, while LLM cost stays fully under my control.

## Design (decisions locked 2026-06-17)

- **Repo:** this repo (Delivery Radar) — **dogfood**, the radar checks its own PRs. Ties to ST-0008.
- **Trigger:** **`workflow_dispatch` only** (manual). GitHub renders a "Run workflow" button in the Actions tab; an input `pr` (PR number) is the form field. No auto-on-PR → **zero API cost until clicked** (NFR-COST-1).
- **Name:** workflow `name: "Does this PR still match what we decided?"`; `run-name` appends the PR number. This is what shows in Actions / PR checks — the product's pitch line, aimed at the judges' pain point.
- **What it does:** checkout → `pnpm build` → `gh pr diff <pr>` → `radar extract` (free) → `radar check --diff` (LLM, `claude-sonnet-4-6`) → `radar comment --post --all` → advisory review via the Reviews API `COMMENT` event (**never blocks**).
- **Secret:** needs `ANTHROPIC_API_KEY` as a repo Actions secret (the **maintainer adds it**; the assistant never handles the key). The built-in `GITHUB_TOKEN` posts the review (`pull-requests: write`).
- `--all` posts the full review (aligned + violated) — demo-friendly; drop it for violated-only in real use.

## Acceptance criteria

- [ ] `.github/workflows/radar.yml` — `workflow_dispatch` with a `pr` input; checkout → build → diff → extract → check → comment; advisory (COMMENT, never blocks); `ANTHROPIC_API_KEY` from a secret; named the pitch line.
- [ ] The "Run workflow" button appears in the Actions tab (workflow on `main`).
- [ ] A manual run on a real PR posts the advisory review citing the ADR + driver.
- [ ] No API key committed; LLM cost gated to manual runs only.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | ci.yml still green (repo builds; workflow YAML parses) | ⬜ |
| Live / web behaviour | `qa-engineer` — N/A; verification is a manual run posting a correct advisory comment | ⬜ |
| Maintainer sign-off | add the secret → click the button on a PR → confirm the advisory review posts correctly | ⬜ pending |

## Notes

Builds on the one-off local dogfood (ST-0008, 2026-06-17). Manual gating (`FR-INT-6` / `NFR-COST-1`) is the cost-control choice given the hackathon key. Auto-on-PR + Checks-API *status* is a later step. **To run:** Actions tab → "Does this PR still match what we decided?" → **Run workflow** → enter the PR number.
