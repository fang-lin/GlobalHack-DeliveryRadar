"""Review projection (FR-CONF-7 — structural type, NFR-EXPLAIN-1).

Every violated verdict carries evidence (ADR clause <-> code lines) and a short
explanation; the comment cites the direction of the required change and stays
advisory (review event COMMENT, never Request changes — NFR-GATE-1 for this
slice where all constraints are semantic/advisory).
"""

from __future__ import annotations

import json
import subprocess

from .models import Constraint, Verdict, VerdictResult

_HEADER = "## 🛰️ Delivery Radar — Architecture Conformance"


def _adr_link(constraint: Constraint) -> str:
    return f"`{constraint.adr}` · constraint `{constraint.id}`"


def _rationale_quote(driver_context: str, driver: str | None, limit: int = 420) -> str:
    """Pick the most driver-relevant paragraph of the ADR Context section —
    quoting the actual business reason is the differentiator, not boilerplate."""
    paragraphs = [p.strip().replace("\n", " ") for p in driver_context.split("\n\n") if p.strip()]
    if not paragraphs:
        return ""
    chosen = next((p for p in paragraphs if driver and driver in p), paragraphs[0])
    return chosen if len(chosen) <= limit else chosen[: limit - 1].rsplit(" ", 1)[0] + "…"


def verdict_markdown(
    verdict: Verdict, constraint: Constraint, driver_context: str = ""
) -> str:
    badge = {
        VerdictResult.violated: "🔴 **VIOLATED**",
        VerdictResult.aligned: "🟢 **ALIGNED**",
        VerdictResult.unknown: "⚪ **UNKNOWN**",
    }[verdict.result]
    lines = [
        f"### {badge} — {constraint.title}",
        "",
        f"{_adr_link(constraint)} · severity **{constraint.severity.value}** · "
        f"confidence **{verdict.confidence:.2f}**",
        "",
        f"> **Rule:** {constraint.rule.strip()}",
    ]
    if constraint.driver:
        quote = _rationale_quote(driver_context, constraint.driver)
        lines.append(">")
        if quote:
            lines.append(
                f"> **Why this rule exists** (driver `{constraint.driver}`, "
                f"from {constraint.adr}): {quote}"
            )
        else:
            lines.append(
                f"> **Why this rule exists**: see driver `{constraint.driver}` "
                f"in {constraint.adr} — violating it defeats the reason, not just the letter."
            )
    if verdict.evidence.code:
        c = verdict.evidence.code
        lines += ["", f"**Evidence:** `{c.file}` L{c.lines[0]}–L{c.lines[1]}"]
    lines += ["", f"**Explanation:** {verdict.explanation}"]
    if verdict.fix_direction:
        lines += ["", f"**Direction:** {verdict.fix_direction}"]
    return "\n".join(lines)


def review_markdown(
    verdicts: list[Verdict],
    constraints: list[Constraint],
    driver_contexts: dict[str, str] | None = None,
) -> str:
    by_id = {c.id: c for c in constraints}
    contexts = driver_contexts or {}
    blocks = [_HEADER, ""]
    ordered = sorted(
        verdicts, key=lambda v: (v.result != VerdictResult.violated, -v.confidence)
    )
    for v in ordered:
        constraint = by_id.get(v.constraint_id)
        if constraint is None:
            continue
        blocks += [
            verdict_markdown(v, constraint, contexts.get(constraint.adr, "")),
            "",
            "---",
            "",
        ]
    blocks.append(
        "_Advisory — this check does not block your merge. The cited ADR is the "
        "source of truth; react with 👍/👎 to calibrate the checker._"
    )
    return "\n".join(blocks)


def post_review(repo: str, pr: int, body: str) -> None:
    """Post an advisory review via gh api (FR-INT-1, Reviews API).

    Review state is COMMENT — non-blocking by default (FR-CONF-9).
    """
    payload = {"event": "COMMENT", "body": body}
    subprocess.run(
        ["gh", "api", f"repos/{repo}/pulls/{pr}/reviews", "--input", "-"],
        input=json.dumps(payload).encode(),
        check=True,
        capture_output=True,
    )
