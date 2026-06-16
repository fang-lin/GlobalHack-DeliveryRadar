# ST-0013: GitHub Action — auto-run the radar on PR events

- **Status:** Todo · backlog (tier C — bigger bet)
- **Type:** integration (capability #6)
- **Spec:** `FR-INT-1`

## Story

As a team, I want the radar to run automatically on every PR (open / push) and post its advisory review, so it is a real CI-integrated product rather than a manual CLI invocation.

## Acceptance criteria

- [ ] A GitHub Action that, on PR events, runs `radar extract` + `radar check` over the PR diff and posts the advisory review via `radar comment`.
- [ ] Wired on a live repo (e.g. shop-demo) for a demo.
- [ ] API key handled as a secret; the check stays advisory (never blocks).

## Notes

Bigger bet (needs CI config + an API-key secret + a live repo). Moves the radar from CLI to integrated product. Lower priority than making the three operations real (ST-0005/0006) and the dogfood (ST-0008).
