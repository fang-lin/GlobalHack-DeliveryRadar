# ADR-0008: Distribution & build — publish the CLI to npm now, defer a stable library API; build with tsc (no bundler), ESM-only

- **Status:** Accepted (decided via a 4-perspective design panel — see Decision process)
- **Date:** 2026-06-21
- **Deciders:** Lin Fang
- **Related:** ADR-0003 (TS rewrite) · ADR-0006 (platform-agnostic core) · ADR-0007 (model layer) · **supersedes ADR-0004-C3 (releases were GitHub-only / no npm publish)**

## Context

The radar is no longer just an internal CI script: it is a reusable engine, structured as both a **CLI** (`radar` extract / check / comment) and a **library** (it exports `makeModelClient`, the `ModelClient` port, and core checker/retrieve/render). The maintainer wants it distributed. ADR-0004-C3 had kept releases GitHub-only with no npm publish; that is now revisited.

Two questions had to be answered deliberately rather than improvised: **(1) what do we actually want to distribute, and when?** and **(2) what build/packaging toolchain?** An earlier draft of this ADR jumped straight to "bundle with tsdown," which was rightly challenged for (a) recommending tsup→tsdown without comparing alternatives, and (b) assuming a bundler at all. Key technical fact that reframes everything: **the runtime deps (`@anthropic-ai/sdk`, `openai`) are external** (not bundled into the package), so a bundler's headline wins — tree-shaking and single-file output — are largely moot here.

## Options considered (build toolchain)

(All verified 2026-06; correcting a common myth: with `module: NodeNext` + `type: module`, plain `tsc` emits **valid ESM + per-file `.d.ts`** — it is not "CJS-only".)

| Option | Maturity / churn risk | `.d.ts` | Config | New deps | Fit here |
|---|---|---|---|---|---|
| **tsc only** | Official compiler; cannot be abandoned | per-file (unbundled), sufficient | ~none (already used) | **0** | Strong — ESM + d.ts out of the box; hand-write the (tiny) `exports` |
| **tsdown** (Rolldown) | New (~500k wk dl), tsup's successor, Vite-endorsed direction | bundled, auto | zero-config | +1 (young) | Weak payoff — built for bundling, but we have little to bundle |
| **unbuild** (UnJS/Rollup) | Mature (~3M wk dl, Nuxt backbone) | bundled, auto | medium | +1 | Capable but heavier than needed |
| **rollup (+plugins)** | Most mature / max control | via plugin | high | +several | Overkill for ~851 LOC |
| pkgroll / esbuild | pkgroll = zero-config rollup wrapper; esbuild fast but **no type-check, no d.ts alone** | varies | low / manual | +1 | pkgroll a viable lightweight middle; esbuild insufficient alone |

`tsc --noEmit` for type-checking is required regardless of tool (esbuild/swc skip types). Bundlers that emit `.d.ts` mostly delegate to tsc/api-extractor under the hood.

## Decision process (4-perspective panel)

The decision was stress-tested by four independent agent perspectives:

- **YAGNI / minimalist** → **tsc-only, publish now.** A bundler buys ~nothing with external deps and adds a dependency + config + (Rolldown/Rollup) failure surface to a tool that should model restraint.
- **Library / consumer DX** → leaned tsdown, but its decisive point was that **the real failure mode is NodeNext type-resolution + `exports`-map correctness, not bundling** — so whatever the tool, **`publint` + `attw` in CI is non-negotiable** (tsc-only leaves more hand-authored correctness surface: wrong `exports` order or a missing `.js` makes `attw` flip to "masquerading" while `tsc` still passes).
- **Long-term maintainer** → **tsc-only.** The tsup lesson is exactly churn: a convenience wrapper went unmaintained and stranded users. tsc has zero successor-migration risk; convenience tools are themselves deps with their own lifecycle.
- **Product / strategy skeptic** → **don't freeze a library API now.** The Phase-1 deliverable is the product/showcase, not an importable 851-LOC package. Make `npx delivery-radar` work (zero new tooling); defer a stable library API until a real importer exists.

**Convergence:** 3 of 4 chose **tsc-only** (the DX vote is compatible once `publint`/`attw` gate the output); the skeptic added the key reframe — **distribute the CLI now, defer the stable library API.**

## Decision

1. **Publish to npm, CLI-first.** Ship so `npx delivery-radar` (and `npm i -g`) works. The library API (`makeModelClient`, `ModelClient`, core) is exported via a minimal `src/index.ts` but documented as **experimental / unstable** — not a frozen contract. A stable, SemVer-guaranteed library API is **deferred** until a real consumer exists. (This reverses ADR-0004-C3, which is marked superseded.)
2. **Build with `tsc` only — no bundler.** NodeNext + `type: module` emits ESM + per-file `.d.ts`; `tsc --noEmit` stays the type-check gate. Chosen for zero churn / supply-chain risk and because external deps make a bundler's wins moot. (tsdown/unbuild reconsidered only if we later need bundled types or a single-file artifact.)
3. **ESM-only** (`"type": "module"`, no CJS/dual) — Node 23+ `require(ESM)` covers CJS consumers; avoids the dual-package hazard.
4. **package.json:** `"exports"` `"."` → `{ "types": "./dist/index.d.ts", "default": "./dist/index.js" }` (**types first**) + `"./package.json"`; top-level `"types"`; `"bin": { "radar": "./dist/cli/main.js" }`; `"files": ["dist"]`; `"sideEffects": false`; `"prepublishOnly": "tsc"`.
5. **Publish is gated by `publint` + `@arethetypeswrong/cli` (`attw`)** in CI — non-negotiable insurance for the hand-written `exports`/types.
6. **Release** via the existing semantic-release pipeline + `@semantic-release/npm` (needs an `NPM_TOKEN` CI secret the maintainer provisions; never committed).
7. **`.js` import ergonomics** (if we want to drop the extensions) → TypeScript 5.7 `rewriteRelativeImportExtensions`, **not** a bundler.

## Consequences

- `npx delivery-radar` works for anyone; ships `.d.ts`. "We shipped, it's runnable" is real showcase credibility without committing to a stable API.
- Not freezing the library API keeps us free to refactor internals (the layered core/io/llm/cli) without SemVer breakage during the hackathon.
- Adds devDeps `publint` + `@arethetypeswrong/cli` and a publish step; **no bundler dependency** is added — `dist/` is plain `tsc` output.
- Hand-written `exports`/per-file `.d.ts` is more correctness surface; the `publint`/`attw` gate is what makes that safe.
- Reverses ADR-0004-C3 (marked superseded).

## Provenance (references & verification, 2026-06-21)

- **tsup is no longer actively maintained**; tsdown is its successor — [Alex Lichter](https://x.com/TheAlexLichter/status/1956248974203007334), [tsdown migrate-from-tsup](https://tsdown.dev/guide/migrate-from-tsup). (Surfaced when an earlier "use tsup" suggestion was challenged — recorded here so the reversal is traceable.)
- **Build-tool comparison** (tsup vs tsdown vs unbuild; tsc-only viability; "you may not need a bundler") — [PkgPulse 2026](https://www.pkgpulse.com/guides/tsup-vs-tsdown-vs-unbuild-typescript-library-bundling-2026), [You may not need a bundler](https://cmdcolin.github.io/posts/2022-05-27-youmaynotneedabundler/), [unbuild — UnJS](https://unjs.io/packages/unbuild/), [tsdown guide](https://tsdown.dev/guide/).
- **ESM-only recommended for new 2026 packages** (Node 23+ `require(ESM)`; avoid dual-package hazard); **`types` first in `exports`**; validate with **publint + attw** — [Publishing npm Packages 2026](https://reintech.io/blog/publishing-npm-packages-complete-guide-2026), [esmodules.com publishing](https://esmodules.com/publishing/).
- **Decision process:** a 4-perspective agent panel (YAGNI / DX / maintainer / skeptic), 2026-06-21 — summarized above; converged 3:1 on tsc-only + defer library API.
- **To verify at implementation:** npm name `delivery-radar` availability; exact `dist/` paths for `bin`; whether to adopt TS 5.7 `rewriteRelativeImportExtensions`.

## Machine-checkable constraints

```constraints
- id: ADR-0008-C1
  adr: ADR-0008
  title: package stays ESM-only (no CommonJS idioms in src/)
  rule: >
    Source under src/ MUST be ESM-only — no CommonJS idioms: no require(),
    module.exports / exports.x, and no reliance on CJS-only globals __dirname or
    __filename (use import / import.meta.url instead). The package ships a single
    ESM build ("type":"module"); a CJS idiom breaks the ESM-only distribution.
  polarity: prohibition
  driver: ADR-0008 — ESM-only distribution; avoid the dual-package hazard
  scope:
    paths: ["src/**"]
    layers: ["radar-core"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "import { x } from './y.js'; const dir = dirname(fileURLToPath(import.meta.url))"
      violating:
        - "const x = require('./y'); module.exports = foo;"
        - "reading __dirname / __filename directly in an ESM source file"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
- id: ADR-0008-C2
  adr: ADR-0008
  title: npm publish is gated by publint + attw
  rule: >
    Any npm-publish path (release workflow / .releaserc) MUST run `publint` and
    `@arethetypeswrong/cli` (attw) and fail the release if either fails. Because
    the package's exports/types are hand-authored (no bundler generates them),
    publishing without this gate risks broken type resolution that tsc does not
    catch locally. A publish step without both checks is a violation.
  polarity: requirement
  driver: ADR-0008 — hand-written exports/types need a publishing safety gate
  scope:
    paths: [".releaserc.json", ".github/workflows/release.yml", "package.json"]
    layers: ["ci", "release"]
  check:
    type: semantic
    matcher: null
    examples:
      compliant:
        - "release CI runs `publint` and `attw --pack .` before npm publish"
      violating:
        - "npm publish with no publint/attw step"
  enforce: advisory
  severity: medium
  status: active
  superseded_by: null
```
