# ST-0019: Trigger radar from the PR — comment command

- **Status:** In progress — comment trigger built on `main`; the `radar` label was later removed (ST-0025) and the keyword generalized to `/conformance` · `/capture` ([ST-0028](ST-0028-capture-pr-time-and-unified-triggers.md)). Pending a real trigger + maintainer sign-off.
- **Type:** integration
- **Implements / Relates:** `FR-INT-6` (user-initiated triggers) · builds on [ST-0013](ST-0013-github-action.md) (the radar-on-PR workflow) · **split out of ST-0013 on 2026-06-18** so this follow-up increment has its own card (was folded in — corrected per the new-increment-→-new-story rule) · **superseded keyword / label →** [ST-0028](ST-0028-capture-pr-time-and-unified-triggers.md).

## Story

As the maintainer, I want to trigger the radar check **from the PR itself** — by commenting `/radar` or adding a `radar` label — instead of going to the Actions tab, so running it is one natural action on the PR.

## Design

> **Superseded by [ST-0028](ST-0028-capture-pr-time-and-unified-triggers.md) (2026-06-25):** the `radar` **label** trigger was removed (ST-0025); the comment keyword `/radar` (which overlapped both ops) became **`/conformance`**, and capture got its own symmetric **`/capture`** comment trigger. The write-access guard below is unchanged. The original two-trigger design is kept here as the record.

Adds two user-initiated triggers to `radar.yml` (alongside ST-0013's `workflow_dispatch`):

- **`issue_comment` (created):** fires on a `/radar` comment on a PR; runs only if the commenter has write access (`author_association` ∈ OWNER/MEMBER/COLLABORATOR — abuse/cost guard). Uses **main's** workflow → works on **any** PR, including existing ones.
- **`pull_request` (labeled):** fires when the `radar` label is added. *Caveat: GitHub runs `pull_request` workflows from the PR head, so the label only triggers on PRs whose branch already contains this workflow (i.e. branched after it landed on main).*
- A **"Resolve PR number"** step picks the PR number per event; checkout `ref: main` so the diff is always checked against main's ADRs. Advisory, never blocks (same engine as ST-0013).

## Acceptance criteria

- [ ] Commenting `/radar` on a PR (write-access user) runs the radar and posts the advisory review.
- [ ] Adding the `radar` label to an eligible PR runs it.
- [ ] Non-privileged or non-`/radar` comments do **not** trigger it (cost + abuse guard).
- [ ] Still advisory and cost-gated (only on explicit trigger).

## Verification / QA

| gate | how | result |
|---|---|---|
| Automated | `radar.yml` YAML valid; triggers + `if` parse | ✅ js-yaml + structure checked |
| Live / web behaviour | n/a — this is CI, not web (`qa-engineer` not applicable) | — |
| Maintainer sign-off | maintainer comments `/radar` on a PR, confirms the advisory posts | ⬜ pending |

## Notes

**The maintainer triggers it, not the assistant** (see the radar-button rule). Test on the next open PR, or `/radar` on a closed/merged PR (the `issue_comment` trigger still fires).
