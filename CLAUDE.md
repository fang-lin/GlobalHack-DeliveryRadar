# Delivery Radar — Claude Code project guide

Intent–Implementation Alignment & Convergence (IIAC) governance engine for the
Thoughtworks AI/works Global Hackathon. It extracts machine-checkable constraints
from ADRs and checks PR diffs against them via an LLM. Two faces: the `radar` CLI
and an (experimental) library API.

## Commands
- `pnpm build` — tsc → `dist/` (ESM + `.d.ts`)
- `pnpm test` — vitest (unit + integration)
- `pnpm lint` — eslint
- `node dist/cli/main.js <cmd>` — `extract | check | comment` (add `--verbose` to trace requests)
- `pnpm eval --replay` — eval harness, no API/keys (drop `--replay` for a live run)
- `pnpm pack:check` — publint + attw (publish hygiene)
- Keep `lint + build + test` green before declaring work done. Real behaviour also needs a live smoke (mocks alone hide bugs).

## Architecture (layered — the structure IS the design)
- `src/core/` — pure domain (no fs, no SDK, no platform): models, retrieve, checker, comment
- `src/io/` — filesystem edges: diff, extract, verdicts
- `src/llm/` — analysis-engine port + adapters (port, anthropic-adapter, openai-compat-adapter, factory); `src/llm.ts` is the barrel
- `src/cli/` — edge: `main.ts` (dispatch) + `commands/` (one file per command) + `util`
- `src/index.ts` — experimental public library API barrel

Ports & adapters: the core depends only on the `ModelClient` port (ADR-0007), never a provider SDK.

## Hard rules (ADR-enforced; the radar dogfoods these)
- **Commit messages carry NO AI co-author / signature.** Conventional Commits; cite story/ADR IDs.
- **Decisions → an ADR; code → a story (`docs/stories/ST-NNN`); CLI behaviour → a spec first.** Cite the IDs in commits.
- **CLI is platform-agnostic (ADR-0006):** `src/` must not call git/gh/host/VCS (C1); config + secrets come from `process.env` ONLY — the CLI reads no `.env` file (C2).
- **Core LLM access goes through the `ModelClient` port, not a provider SDK (ADR-0007-C1).**
- **ESM-only — no CommonJS idioms in `src/` (ADR-0008-C1).**
- **Docs:** Chinese is authoritative and the English mirror is updated in the SAME commit; ADRs are English-only (`docs/governance/doc-management.zh.md`).

## Config (environment only — see `.env.example`)
`RADAR_PROVIDER` (`anthropic`|`openrouter`|`vercel`|`openai-compat`) · `RADAR_MODEL` · `RADAR_BASE_URL` · `RADAR_JSON_MODE` (`json_object` default | `json_schema`). Keys: the provider's native var (`ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `AI_GATEWAY_API_KEY`) or the universal `RADAR_API_KEY`. The CLI does NOT read `.env` — source it into your shell: `set -a; source .envrc; set +a`.
