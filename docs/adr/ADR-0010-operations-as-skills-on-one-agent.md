# ADR-0010: Radar operations are skills on one investigative agent (supersede the ModelClient port)

- **Status:** Proposed (flips to Accepted on merge)
- **Date:** 2026-06-24
- **Deciders:** Lin Fang
- **Related:** ADR-0009 (capture as a skill-driven agent — the first instance of this pattern) · ADR-0007 (the ModelClient port — superseded here for the LLM operations) · ADR-0006 (platform-agnostic core) · ADR-0003 (typed structured outputs — its C1 is reworded here) · FR-CONF-1..10 (conformance) · FR-CAP-1..9 (capture) · NFR-RETRIEVAL-1 · NFR-EVAL-1 / AC-2 (the quality gate) · ST-0009 (methodology as skills) · ST-0010 (radar as investigative agent)

## Context

The radar now reaches an LLM two different ways:

- **Conformance** (and, later, drift) go through the **`ModelClient` port** (ADR-0007): one stateless `complete({system, user, schema})` call per constraint, backed by two adapters (`@anthropic-ai/sdk` `messages.parse`; the `openai` SDK).
- **Capture** (ADR-0009) bypasses the port and runs a **skill-driven investigative agent**: a tool-use loop on the Vercel AI SDK (read / grep / read-only git), its methodology authored as a `SKILL.md`, emitting a zod-validated result.

Capture exists separately not because it uses a different provider, but because its interaction *shape* is different: a single-shot `complete()` cannot express a tool loop. But that observation generalizes. Capture is, in essence, **a generic investigative agent + a capture skill**. Conformance is **the same engine + a conformance skill**: hand the agent a constraint and a diff, let it investigate when the evidence in the diff is insufficient, and have it emit a verdict — instead of the single-shot checker's only option today, which is to give up with `unknown`.

So the cleaner architecture is one engine, many skills. This also unblocks the long-standing intent of ST-0009 (methodology as skills) and ST-0010 (the radar as an investigative agent), and removes the awkward two-model-paths split. The cost objection (an agent loop on every PR is pricier than one call) is set aside by decision: the radar runs on a cheap provider (DeepSeek via the gateway), and cost is acceptable at this scale.

## Decision

1. **One generic investigative agent engine.** A single tool-loop runner on the Vercel AI SDK, parameterized by `{ skill (instructions), tools, outputSchema }`, returning a zod-validated object. It owns the loop, the tools (read / grep / read-only git), the structured-output handling, and provider selection from the environment.

2. **Each operation is a skill + an output schema + a deterministic shell.**
   - **conformance** → the conformance skill + the `Verdict` schema; deterministic **scope-first retrieval picks the in-scope constraints first** (NFR-RETRIEVAL-1, unchanged — retrieval stays code, never the LLM's job), then **one agent run per in-scope constraint**, grounded by that constraint's `rule` + `driver` rationale + `examples`. The agent MAY investigate beyond the diff (read / grep / git) when the diff alone is insufficient, rather than defaulting to `unknown`. `unknown` remains a valid result (FR-CONF-6).
   - **capture** → the capture skill + the `DecisionNote` schema; refactored to run on this shared engine (today its agent is bespoke).
   - **drift** (future) → the same engine + a drift skill.

3. **The `ModelClient` port (ADR-0007) is superseded for the LLM operations.** Conformance no longer calls `complete()`. The `anthropic-adapter` and `openai-compat-adapter`, and the `@anthropic-ai/sdk` and `openai` dependencies, retire; every LLM call routes through the AI SDK via the engine. The eval harness rewires to drive the engine. (ADR-0007's *intent* — a pluggable, cheap, testable model layer selected at the edge — is preserved; the engine still selects the provider from `RADAR_PROVIDER` env. Only the port mechanism is replaced.)

4. **ADR-0003-C1 is reworded to be provider-agnostic.** It currently hardwires the Anthropic SDK's `messages.parse + zodOutputFormat`. The reliability guarantee is the *intent* (typed, schema-validated verdicts; no trusting raw free text), not that specific SDK call. The constraint is reworded to require typed, zod-validated structured output regardless of SDK.

5. **CLI rename `check` → `conformance`.** The operation is named "conformance" everywhere in the spec; the CLI verb catches up. No `check` alias (internal tool).

6. **Quality is a hard gate (NFR-EVAL-1 / AC-2).** The agent conformance is measured against the current single-shot baseline on the replay eval corpus (precision / recall) and MUST NOT regress before it replaces the calibrated checker. This is independent of the cost decision — it is about not shipping a worse checker blind.

This ADR **supersedes** ADR-0007's port mechanism (the `ModelClient` interface and its adapters) and **generalizes** ADR-0009 (capture becomes the first instance of the shared engine, not a one-off). ADR-0007-C1 is marked superseded by this ADR; ADR-0003-C1 is reworded (decision 4).

## Consequences

- **One architecture, one model path.** capture / conformance / drift are the same engine with different skills — simpler to reason about, and the strongest showcase narrative ("the radar is one skill-driven investigative agent; its operations are skills").
- **Conformance gets more capable.** It can investigate (read the enclosing code, grep for how a pattern is used elsewhere, check git history) instead of emitting `unknown` when the diff alone is ambiguous — directly serving the agent-pillar of the vision and ST-0010.
- **Methodology becomes portable skills** (ST-0009): `skills/conformance/SKILL.md`, `skills/capture/SKILL.md`, …
- **Cost: every PR conformance check is now a tool loop**, not one call per constraint — pricier and slower on the every-PR hot path. Accepted by decision (cheap provider, advisory, non-blocking).
- **Non-determinism**: agent runs vary; `--replay` (saved verdicts) preserves demo determinism.
- **Quality risk**: the calibrated single-shot checker is being replaced — mitigated by the eval gate (decision 6) and the existing fixture unit tests.
- **Blast radius**: `checker.ts`, the CLI, `eval.ts`, and the model layer all change; the `ModelClient` port and two adapters are deleted. Larger than an SDK swap — hence design-first.
- **Retrieval stays the noise lever**: scope-first retrieval remains deterministic code (NFR-RETRIEVAL-1); the agent judges, it does not choose which constraints apply.

*Provenance: the Vercel AI SDK capabilities relied on here (tool-loop `generateText`/`stopWhen`, `Output.object` zod-validated structured output, provider routing incl. DeepSeek via the gateway) were verified against ai-sdk.dev on 2026-06-22 (recorded in the capture design spec). The eval comparison required by decision 6 has NOT yet been run — it is a gate on implementation, not a claim made here.*

## Machine-checkable constraints

```constraints
- id: ADR-0010-C1
  adr: ADR-0010
  title: every LLM operation runs through the one shared agent engine, not a bespoke model call or the retired port
  rule: >
    Radar operations that call an LLM (conformance, capture, drift) MUST run
    through the single shared investigative-agent engine, parameterized by a
    skill + an output schema + tools. They MUST NOT embed a bespoke provider/SDK
    call of their own, nor depend on the retired ModelClient port
    (complete({system,user,schema})) or the old per-provider adapters
    (@anthropic-ai/sdk messages.parse, the openai SDK). Provider / gateway / SDK
    specifics live ONLY in the engine (and its model-selection module), never in
    an operation's own logic. Adding a direct provider-SDK call inside an
    operation, or reintroducing the ModelClient port, is a violation.
  polarity: requirement
  driver: ADR-0010 — one model path; operations differ only by skill + schema
  scope:
    paths: ["src/**"]
    layers: ["radar-core", "agent"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "conformance retrieves in-scope constraints, then runs the shared agent per constraint with the conformance skill + Verdict schema"
        - "capture runs the same engine with the capture skill + DecisionNote schema"
      violating:
        - "an operation imports @anthropic-ai/sdk or the openai SDK and calls it directly"
        - "an operation calls a ModelClient.complete() port instead of the shared engine"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
- id: ADR-0010-C2
  adr: ADR-0010
  title: scope-first retrieval stays deterministic — the agent judges, it does not pick which constraints apply
  rule: >
    Choosing WHICH constraints apply to a diff (scope-first retrieval,
    NFR-RETRIEVAL-1) MUST be deterministic code (path/scope matching), never
    delegated to the LLM/agent. The agent receives already-retrieved, in-scope
    constraints and judges them; it does not decide relevance. Over-retrieval is
    the primary source of false positives and is controlled in code, not by the
    model. Letting the agent select the constraint set, or removing scope-first
    retrieval, is a violation.
  polarity: requirement
  driver: NFR-RETRIEVAL-1 — over-retrieval is the primary false-positive source; keep relevance deterministic
  scope:
    paths: ["src/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "retrieve() filters constraints by scope.paths against the changed files; the agent only judges the survivors"
      violating:
        - "the whole constraint set is handed to the agent and the model is asked to decide which are relevant"
  enforce: advisory
  severity: high
  status: active
  superseded_by: null
```
