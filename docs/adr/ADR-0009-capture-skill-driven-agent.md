# ADR-0009: Decision Capture is a skill-driven investigative agent (hand-written on the AI SDK, at the edge)

- **Status:** Accepted
- **Date:** 2026-06-22
- **Deciders:** Lin Fang
- **Related:** ADR-0006 (platform-agnostic core — the agent lives at the edge) · ADR-0007 (pluggable model layer — the agent uses the AI SDK's provider routing, so the model stays pluggable) · FR-CAP-1..9 (capture) · FR-CONF-2 (pre-PR self-check) · ST-0005 (capture) · ST-0009 (IIAC skill) · ST-0010 (radar as investigative agent)

## Context

The radar's first operation, `conformance`, is a deterministic pipeline: retrieve in-scope constraints, then make one stateless `complete()` call per constraint through the `ModelClient` port (ADR-0007). That shape is right for "does this diff violate a *known* rule" — the rule and its scope are handed in; the model only judges.

`capture` is different in kind. Its job (FR-CAP-2) is to notice a decision the PR makes **implicitly**, that is **net-new** (covered by no active constraint), and **architecturally significant**. Judging "net-new" and "significant" needs context the diff hunk does not contain: is this pattern already used elsewhere in the repo? does an existing ADR already cover it? what does git history say about how this area evolved? A single `complete()` call sees only what we feed it and cannot investigate. Hand-coded signal detectors (new-dependency / new-datastore / new-cross-service scanners) are brittle, stack-specific, and structurally blind to the *implicit* decisions that are the highest-value captures.

Investigation through a tool-use loop (read files, grep, inspect git history) is exactly what an autonomous agent does well — and encoding the *method* as a portable skill, rather than as bespoke heuristics in our code, matches this project's vision (the agent long-horizon pillar) and its roadmap (ST-0009 "IIAC methodology as a skill", ST-0010 "radar as investigative agent + pre-PR self-check").

We surveyed agent frameworks and turnkey agents before committing (verified 2026-06-22). Two facts settled the design. First, provider lock-in is not a real constraint in 2026, and `SKILL.md` is an open, self-implementable standard — so an agent + skill need not bind us to one vendor or runtime. Second, an agent is at its core a small loop (offer the model tools → run the tool it asks for → feed the result back → repeat → final answer); the **Vercel AI SDK** already provides that multi-step tool-calling loop, Zod-validated structured output, and provider routing. A heavier agent framework (e.g. Mastra) is built on top of that same AI SDK and adds workflows / sub-agents / memory / evals we would not use for a single capture agent. So we **write the agent ourselves directly on the AI SDK** — owning a thin seam rather than renting a framework, consistent with the project's ADR-0006/0007 philosophy.

## Decision

1. **Capture is a skill-driven investigative agent, not a single LLM call.** The agent is given tools to read repo files, grep, and inspect (read-only) git history, runs a bounded tool-use loop over the checked-out PR, and emits draft Decision Notes.

2. **We write the agent ourselves on the Vercel AI SDK — no agent framework.** The AI SDK (`ai` + a provider/gateway package) gives us the multi-step tool-calling loop and Zod-validated structured output; we own a thin agent loop in the capture adapter (~a couple hundred lines), not a framework. The model stays **pluggable** via the AI SDK's provider routing — capture runs on the same cheap config as conformance: DeepSeek via the Vercel AI Gateway (`AI_GATEWAY_API_KEY`), OpenRouter, or any OpenAI-compatible `baseURL`. Owning the seam (no framework lock-in, a single focused dependency) is consistent with ADR-0006/0007; Mastra and turnkey agents were evaluated and set aside as more than a single capture agent needs.

3. **The agent loop, the AI SDK, and the agent's repo-touching tools live at the edge** — the capture adapter (`src/capture/`) / the integration layer — **never in the pure core.** `src/core/` (models, retrieve, comment) stays SDK-free and platform-free, reinforcing ADR-0006. Capture *reuses* the pure core (the constraint set it must dedup against; the shared diff parse) but the *investigation* is edge code, behind a small seam so the model/agent internals are swappable.

4. **The IIAC capture methodology is authored as a `SKILL.md`** (ST-0009) and injected as the agent's instructions — the skill, not hardcoded heuristics, drives detection. The skill also carries **how to use git** (which read-only commands to run, how to interpret them); our code only provides a small, generic read-only command tool. Because `SKILL.md` is an open, runtime-agnostic format, the methodology is portable across agents and providers.

5. **Output is a Zod-validated list of Decision Notes** (the `DM-DECISION-NOTE` shape) via the AI SDK's structured output (`Output.object` with a Zod schema). For weaker providers that lack reliable native structured output under a tool loop, fall back to putting the schema in the prompt and/or a separate structuring pass; validation is handled leniently in CI (log / return empty, never crash) — capture is advisory and must never crash the check.

6. **Capture runs at PR time and surfaces findings on the open PR for human review.** *(Revised 2026-06-25 — see the revision note below; the first cut of this ADR ran capture after-merge and opened an issue.)* On PR `opened` (and on a manual `/capture`), capture investigates the PR's diff and posts its findings as a **sticky, foldable, advisory Decision-Note review on the open PR** — parallel to the conformance review, with its own stable hidden marker `<!-- radar:capture -->` so the two streams fold independently and a human can tell them apart. Findings land **where a human can still act on them** (discuss / record / reconsider before merge), and surfacing never blocks the merge (a `COMMENT` review). It posts a review **only when it finds something** (notes > 0); on nothing-found it writes only a run summary, to avoid noise on every PR. Capture is the heavier (whole-diff investigative agent) operation, so it runs on `opened` + on-demand, **not** on every `synchronize` (conformance covers per-push); repeated runs fold prior capture reviews to `OUTDATED`, and a finding disappears once it is recorded (the net-new check stops flagging a now-recorded decision). **Surfacing ≠ recording:** turning a confirmed Decision Note into recorded intent (graduation, FR-CAP-6/7) is a separate, **human-confirmed** step that produces a draft ADR PR / issue — capture does NOT auto-create those each run, and MUST NOT merge/accept an ADR unattended, push to the default branch, or block any PR's merge (NFR-TRUST-1). FR-CAP-1 / FR-CAP-4 / FR-CAP-5 are updated accordingly.

   **Revision note (2026-06-25):** the first cut ran capture *after merge* and opened an issue per finding. Changed to PR-time because capture's value is the window where a human can still act on a flagged decision — surfacing it on the open PR (next to conformance) beats a detached post-merge issue that rots unread in the backlog. This stays non-blocking (advisory) while gaining shift-left, and matches the spec's original per-diff-engine framing (conformance + capture over the PR diff, FR-ARCH-1). The issue/draft-PR is kept for the *graduation* step (human-confirmed), where a durable, separate work item is the right artifact.

This ADR **extends** ADR-0006 and ADR-0007; it supersedes neither. Single-shot operations (`conformance`, later `drift`) keep using the `ModelClient` port; `capture` adds an investigative-agent seam at the edge. Capture's git access follows from the agent+skill model: the **git operations live in the skill** (which read-only commands to run, how to read them); our code provides only a small, generic read-only command tool in the capture edge adapter. `src/core/` stays git-free and platform-free. ADR-0006-C1 is therefore read as governing the **pure core (`src/core/`)**, with edge adapters (io, llm, cli, and the capture agent) performing their I/O at the edge as ADR-0006 already intends; the exact scope wording is settled in the design spec, pending maintainer confirmation.

## Consequences

- The investigation can look **beyond the diff** (grep / git history) — materially better at judging "net-new / implicit" than a single call could be.
- **A light, owned implementation.** The AI SDK supplies the tool loop + structured output + provider routing; we write the thin agent loop, the (read-only) tools, and the structured-output handling ourselves — full control, no framework to track, easy to unit-test with a mock model.
- Debuts the **agent pillar** (ST-0010) and **methodology-as-skill** (ST-0009) — the strongest showcase narrative — while staying provider-cheap.
- The pure core stays unit-testable with fixtures; the agent edge is faked or recorded for tests.
- **Cost of the decision — we own the loop.** We write (and maintain) the tool-loop wiring and the structured-output retry/fallback ourselves, rather than getting them from a framework. The AI SDK is a single, focused dependency at the edge.
- **Config hygiene (ADR-0006-C2):** the agent's model and keys come only from `process.env` (the AI SDK reads env vars such as `AI_GATEWAY_API_KEY`); no `.env` reading in `src/`.
- Agent loops are **non-deterministic, pricier, slower, and harder to `--replay`** than a single call. Capture runs once per PR — after it merges, not on every push — which also bounds cost (NFR-COST-1 / NFR-PERF-1); record/replay for demo determinism is a design concern.
- DeepSeek's structured-output + tool-calling reliability under a tool loop is uncertain — we carry the fallback plan (decision 5) into implementation and re-verify.

*Provenance: the Vercel AI SDK's capabilities (the multi-step tool-calling loop, Zod-validated structured output via `Output.object`, provider routing incl. DeepSeek via the Vercel AI Gateway / OpenRouter / an OpenAI-compatible `baseURL`) and the broader open-source agent survey behind this decision (including Mastra, evaluated and set aside) were verified against the vendors' repos/docs on 2026-06-22, not from memory. Exact URLs, the survey, and the risks above are recorded in the design spec's "参考与查证 (provenance)" section (`docs/specs/2026-06-22-decision-capture-design.zh.md`). Agent tooling moves fast — re-check at implementation.*

## Machine-checkable constraints

```constraints
- id: ADR-0009-C1
  adr: ADR-0009
  title: the agent lives at the edge — the pure core stays SDK-free and platform-free
  rule: >
    The pure domain core under src/core/ MUST NOT import the agent's LLM / agent
    SDK (e.g. the Vercel AI SDK `ai` package or a provider SDK) or embed
    agent-loop / tool-execution logic. The capture investigative agent — its tool
    loop, the AI SDK, and its repo-touching tools (file read, grep, read-only
    git) — lives ONLY in the capture adapter (src/capture/) / the integration
    layer at the edge, behind a small seam so the model/agent internals are
    swappable. The core's role is limited to pure data (the constraint set, the
    parsed diff) and pure rendering. Importing the AI SDK into src/core/, or
    putting the agent loop / tool execution there, is a violation.
  polarity: prohibition
  driver: ADR-0009 / ADR-0006 — keep the core testable, platform-agnostic, and free of SDK/framework lock-in
  scope:
    paths: ["src/core/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "the capture agent (its loop + the AI SDK + read/grep/read-only-git tools) lives in src/capture/ at the edge; src/core imports none of it"
        - "src/core only consumes the constraint list and the parsed diff, and renders Decision Notes to markdown"
      violating:
        - "src/core/ imports the AI SDK (`ai`) or defines the agent loop / a tool"
        - "tool execution that shells out to git or reads the working tree is placed in src/core/"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
- id: ADR-0009-C2
  adr: ADR-0009
  title: capture drafts for human review — it never produces accepted intent unattended
  rule: >
    Decision Capture's outputs are DRAFTS for human review: it MAY open a DRAFT
    pull request (an ADR with Status: Proposed) or an issue, because a branch PR
    or an issue changes nothing until a human acts on it — that is the draft step,
    and the human confirms by merging or closing it. Capture MUST NOT produce
    ACCEPTED recorded intent unattended: it MUST NOT merge or accept an ADR, push
    to the default branch, mark an ADR Accepted, or auto-apply a change without
    human action, and it MUST NOT block any PR's merge (advisory only). Machine
    drafts, human confirms (NFR-TRUST-1). Code in the capture path that
    merges/accepts intent, pushes to the default branch, or fails/blocks a PR is
    a violation.
  polarity: prohibition
  driver: ADR-0009 / NFR-TRUST-1 — machine drafts (incl. a draft PR/issue), human confirms by merging; capture never accepts intent unattended
  scope:
    paths: ["src/**", ".github/workflows/**"]
    layers: ["radar-core", "integration"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "capture drafts a Decision Note; the workflow opens a draft PR proposing the ADR (Status: Proposed) for the maintainer to merge or close"
        - "capture opens an issue 'record a decision for X'; nothing is accepted until a human acts"
      violating:
        - "the capture step merges the ADR PR automatically or pushes the ADR to the default branch"
        - "capture sets a PR review to Request changes or a failing required status"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
