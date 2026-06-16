# ST-0005: `radar capture` — detect implicit decisions in a PR and draft a Decision Note

- **Status:** Todo
- **Type:** feature / core operation (Capture)
- **Spec:** `FR-CAP-1..9`
- **Related:** ST-0008 (dogfood consumes it)

## Story

As a reviewer/maintainer, I want the radar to surface decisions a PR makes *implicitly* but that aren't recorded in any ADR, and draft a Decision Note for them, so that undocumented intent gets captured instead of silently becoming unrecorded precedent.

## Acceptance criteria

- [ ] `radar capture --diff <file>` reads a PR diff and, aware of the existing constraint set (so it knows what's already recorded), emits 0..n **draft Decision Notes**: each = a one-line decision + evidence (`file:lines`) + suggested class (architectural / behavioral) + `status: draft`.
- [ ] Reuses extract/retrieve/checker infra + structured (zod) output; emitting **nothing** is valid — do not invent decisions.
- [ ] Minimal real slice (not the full triage/graduation flow — that's capability #7); `--save`/`--replay` for demo determinism.

## Notes

Makes **Capture** a real operation, not just the seeded dashboard preview. Honesty guardrail (vision §9): keep it concrete.
