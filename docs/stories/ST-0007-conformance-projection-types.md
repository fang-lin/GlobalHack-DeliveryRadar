# ST-0007: Conformance — additional comment projection types (beyond structural)

- **Status:** Todo
- **Type:** enhancement (Conformance)
- **Spec:** `FR-CONF-7..9`

## Story

As a PR author, I want the advisory review to project a verdict in the most actionable form — an inline **suggestion** for a local fix, a line-anchored inline comment, or a folded summary — so feedback meets me where the change is, not only as one structural comment.

## Acceptance criteria

- [ ] Add at least one projection beyond today's structural comment: a GitHub `suggestion` block for `local` fixes and/or line-anchored inline review comments.
- [ ] Projection chosen from the verdict's `fix_locality` (`local` → suggestion; `structural` → comment).
- [ ] Falls back to the existing structural markdown if a richer projection isn't applicable.

## Notes

Conformance is already ✅ live; this is polish toward FR-CONF-7's full projection set. Lower priority than ST-0005/0006 (which turn vapor into real operations).
