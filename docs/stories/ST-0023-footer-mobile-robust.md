# ST-0023: Footer on mobile — robust fix (recurring ST-0014 regression)

- **Status:** In progress
- **Type:** showcase / frontend / bugfix
- **Related:** ADR-0001 (SPA + deck) · ST-0014 (original footer fix that kept regressing) · ST-0018 (deck on mobile)

## Story

The homepage footer keeps going **invisible on mobile** — and at narrow widths its second line ("built at · logo · Innovation that AI/works™ · Global Hackathon 2026") **wrapped each piece onto its own line**. This has recurred several times. Fix it robustly this time, not with another height-dependent patch.

## Root cause (why it kept recurring)

1. **Invisible:** the homepage is a deck — `html.deck { scroll-snap-type: y mandatory }` with full-height sections. The **last** section was also full-height, so the short global footer (which lives *after* the deck) was pushed below the fold, and mandatory snap rested on the last section's `start`. The ST-0014 patch (`html.deck footer { scroll-snap-align: end }`) "worked" only for that day's exact heights — any content change (e.g. the id pass that grew sections) shifted the snap points and it regressed. **Patch on a fragile mechanism, not a root fix.**
2. **Wrapping:** the footer's second line used a no-wrap `flex` row; at narrow widths the flex items shrank below their content and each text unit squished onto its own line.
3. **No guard:** each fix was verified once by hand, then nothing asserted "footer reachable on mobile" — so it regressed *silently*, only caught when a human looked on a phone. This is the real reason it "kept coming back".

## Fix

- **`index.css`** — `html.deck .deck-main > section:last-child { min-height: 0 }`: the last slide sizes to its content so the closing card **and** the footer share the final screen. The footer is then within view **by layout**, independent of snap/touch behaviour — no magic numbers, robust to content changes. (Kept the existing end-snap; the layout is what guarantees it.)
- **`App.tsx`** (footer) — second line: `flex flex-wrap items-center justify-center gap-x-1.5` + each text unit wrapped in `whitespace-nowrap`; the row centers on mobile (`justify-center text-center`) and keeps the desktop spread (`sm:justify-between sm:text-left`). Units now wrap at clean boundaries, never mid-unit.

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `ci.yml` (typecheck/build/lint) green | ⬜ (tsc + build green locally) |
| Footer visible (mobile) | DOM at 430px: `elementFromPoint` at viewport bottom hits `#site-footer`; `footer.bottom === innerH` | ✅ |
| Second line clean | DOM at 430px: each 2nd-line unit is one line tall (16/14px), no mid-unit wrap | ✅ |
| Maintainer sign-off | maintainer reviews + merges + confirms on a real device | ⬜ pending |

> Tooling note: real touch-scroll + screenshots weren't reliable in the automation window (extension disconnect, viewport jitter). Verified via DOM measurement, which is the faithful check for a **layout-based** fix (footer is in the final screen regardless of scroll).

## The durable anti-recurrence measure (follow-up)

The fix above is structural, but the honest reason this recurred is **no regression guard**. Proposed: a **Playwright e2e** in CI — load the homepage at a phone width, scroll to the bottom, assert `#site-footer` is in the viewport. Then any future change that hides the footer fails CI instead of shipping. Tracked as a follow-up (adds a dev dep + a CI job).
