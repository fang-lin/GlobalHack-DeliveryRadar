# Stream-marker + positioning-line change report

## What was added

### `src/core/conformance-comment.ts` — `reviewMarkdown`
- First line of every returned body: `<!-- radar:conformance -->`
- Positioning sentence after the header: `_Does this PR still match what we decided — the recorded ADRs?_`
- Applied to both the empty-result (nothing-flagged) branch and the non-empty (cards) branch.
- MARKER and POSITIONING are local constants inside `reviewMarkdown`; no module-level export.

### `src/core/capture-comment.ts` — `decisionNotesMarkdown`
- First line of every returned body: `<!-- radar:capture -->`
- Positioning sentence after the header: `_Did this PR make an architectural decision that isn't recorded in any ADR?_`
- Applied to both the empty-result branch and the non-empty branch.
- Same local-constants pattern.

### `tests/unit/conformance-comment.test.ts`
Three new `it` blocks added at the top of the `reviewMarkdown` suite:
1. `startsWith("<!-- radar:conformance -->")` — verifies exact first-line position.
2. `toContain("<!-- radar:conformance -->")` — verifies presence on both paths (empty + non-empty).
3. `toContain(positioning)` — verifies positioning sentence on both paths.

### `tests/unit/capture-comment.test.ts`
Three new `it` blocks added at the top of the `decisionNotesMarkdown` suite:
1. `startsWith("<!-- radar:capture -->")` — both paths.
2. `toContain("<!-- radar:capture -->")` — both paths.
3. `toContain(positioning)` — both paths.

All existing assertions unchanged and still passing.

## Test result

```
Test Files  18 passed (18)
     Tests  66 passed (66)
```

`pnpm lint && pnpm build && pnpm test` — all green.
