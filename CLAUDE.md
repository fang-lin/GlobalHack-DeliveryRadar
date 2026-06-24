# Delivery Radar — Claude Code project guide

Intent–Implementation Alignment & Convergence (IIAC) governance engine for the
Thoughtworks AI/works Global Hackathon. It extracts machine-checkable constraints
from ADRs and checks PR diffs against them via an LLM. Two faces: the `radar` CLI
and an (experimental) library API.

## Commands
- `pnpm build` — tsc → `dist/` (ESM + `.d.ts`)
- `pnpm test` — vitest (unit + integration)
- `pnpm lint` — eslint
- `node dist/cli/main.js <cmd>` — `extract | conformance | capture | comment` (add `--verbose` to trace requests)
- `pnpm eval --replay` — eval harness, no API/keys (drop `--replay` for a live run)
- `pnpm pack:check` — publint + attw (publish hygiene)
- Keep `lint + build + test` green before declaring work done. Real behaviour also needs a live smoke (mocks alone hide bugs).

## Architecture (layered — the structure IS the design)
- `src/core/` — pure domain (no fs, no SDK, no platform): models, retrieve, checker (`buildUserPrompt` + `toVerdict`), conformance-comment, capture-comment
- `src/io/` — filesystem edges: diff, extract, verdicts, notes
- `src/agent/` — the one investigative-agent engine (edge): `engine.ts` `runAgent({skill,user,tools,outputSchema,maxTokens?})` on the Vercel AI SDK + `tools.ts` (read/grep/read-only-git) + `model.ts` (`selectModel` from env) + `parse.ts` (tolerant JSON→zod)
- `src/cli/` — edge: `main.ts` (dispatch) + `commands/` (one file per command) + `util`
- `src/index.ts` — experimental public library API barrel

One model path (ADR-0010): every LLM operation (conformance, capture, drift) runs through the shared `runAgent` engine, parameterized by a skill (`skills/<op>/SKILL.md`) + an output schema + tools. The old `ModelClient` port + adapters (ADR-0007) are retired; the AI SDK lives ONLY in `src/agent/`, never in `src/core/`. Scope-first retrieval stays deterministic in `core/retrieve.ts` (the agent judges, it does not pick which constraints apply — ADR-0010-C2).

## Hard rules (ADR-enforced; the radar dogfoods these)
- **Commit messages carry NO AI co-author / signature.** Conventional Commits; cite story/ADR IDs.
- **Decisions → an ADR; code → a story (`docs/stories/ST-NNN`); CLI behaviour → a spec first.** Cite the IDs in commits.
- **CLI is platform-agnostic (ADR-0006):** `src/core/` must not call git/gh/host/VCS (C1; refined to the pure core by ADR-0009 — edge adapters like the capture agent under `src/capture/` may); config + secrets come from `process.env` ONLY — the CLI reads no `.env` file (C2, all of `src/`).
- **Every LLM operation runs through the one shared agent engine (`src/agent/runAgent`), not a bespoke provider/SDK call (ADR-0010-C1). The AI SDK lives only in `src/agent/`.** (Supersedes the retired `ModelClient` port / ADR-0007-C1.)
- **ESM-only — no CommonJS idioms in `src/` (ADR-0008-C1).**
- **Docs:** Chinese is authoritative and the English mirror is updated in the SAME commit; ADRs are English-only (`docs/governance/doc-management.zh.md`).

## Config (environment only — see `.env.example`)
`RADAR_PROVIDER` (`anthropic`|`openrouter`|`vercel`|`openai-compat`) · `RADAR_MODEL` · `RADAR_BASE_URL` · `RADAR_JSON_MODE` (`json_object` default | `json_schema`). Keys: the provider's native var (`ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `AI_GATEWAY_API_KEY`) or the universal `RADAR_API_KEY`. The CLI does NOT read `.env` — source it into your shell: `set -a; source .envrc; set +a`.
