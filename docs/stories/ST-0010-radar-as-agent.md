# ST-0010: radar as an investigative agent + pre-PR self-check

- **Status:** Todo · backlog (next wave)
- **Type:** architecture
- **Implements:** VIS-3 (the Agent form) · vision-log VL-002 · spec `FR-CONF-2` (capability #13)

## Story

As an autonomous coding agent, I want to run the radar's verdict logic on myself *before* I open a PR — and, when a verdict is uncertain, investigate (read more files, grep, check history) rather than guess — so alignment is carried by infrastructure and I escalate to a human only at decision points.

## Acceptance criteria

- [ ] Upgrade the single grounded LLM call into an investigative loop (tools: read / grep / git history) that gathers evidence before a verdict when confidence is low.
- [ ] A pre-PR self-check entrypoint usable inside an agent loop.

## Notes

Phase 2/3 — the bridge to long-horizon autonomy (vision §6). Per the honesty guardrail (vision §9), long-horizon autonomy stays "exploration," never presented as delivered.
