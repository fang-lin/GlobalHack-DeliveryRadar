"""Semantic conformance checker (FR-CONF-4..6).

Each semantic constraint is evaluated by Claude grounded with the constraint
rule, the business driver rationale, and the few-shot examples (FR-CONF-5).
`unknown` is a first-class result: the model is explicitly instructed to emit
it rather than guess when evidence is insufficient (FR-CONF-6).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import anthropic

from .diff import FileDiff
from .models import (
    Constraint,
    Evidence,
    CodeEvidence,
    SemanticCheckOutput,
    Verdict,
)

# Hackathon workspace policy: Opus-tier models are blocked (0 RPM); Sonnet is
# the strongest permitted model.
DEFAULT_MODEL = "claude-sonnet-4-6"

_SYSTEM = """You are the conformance checker of Delivery Radar, an \
intent-implementation governance engine. You evaluate whether a pull-request \
diff conforms to ONE architectural constraint extracted from an Architecture \
Decision Record (ADR).

Judge the diff against both the LETTER of the rule and the REASON behind it \
(the business driver). A change can honor the letter while defeating the \
reason — that is a violation.

Rules of judgement:
- Only judge what the diff shows. Do not invent code that is not present.
- If the evidence is insufficient to decide, emit result "unknown" with a low \
confidence. Never guess.
- "aligned" means the changed code is compatible with the constraint.
- Evidence lines refer to the post-change file (the "+" side of the diff).
- fix_locality: "local" if a small in-place edit fixes it, "structural" if the \
fix requires changing the approach, "none" if no fix is needed.
- fix_direction: one or two sentences pointing at the direction of the \
required change (cite the ADR's intent), or null when result is "aligned".
- Keep explanation to one or two sentences."""


def _load_dotenv(start: Path | None = None) -> None:
    """Minimal .env loader: sets ANTHROPIC_API_KEY from the nearest .env if the
    variable is not already set. No third-party dependency."""
    if os.environ.get("ANTHROPIC_API_KEY"):
        return
    directory = (start or Path.cwd()).resolve()
    for candidate in [directory, *directory.parents]:
        env_file = candidate / ".env"
        if env_file.is_file():
            for line in env_file.read_text().splitlines():
                line = line.strip()
                if line.startswith("ANTHROPIC_API_KEY="):
                    os.environ["ANTHROPIC_API_KEY"] = line.split("=", 1)[1].strip().strip('"')
                    return


def make_client() -> anthropic.Anthropic:
    _load_dotenv()
    return anthropic.Anthropic()


def build_user_prompt(
    constraint: Constraint, diffs: list[FileDiff], driver_context: str = ""
) -> str:
    examples = constraint.check.examples
    parts = [
        f"## Constraint {constraint.id} (from {constraint.adr})",
        f"Title: {constraint.title}",
        f"Polarity: {constraint.polarity.value}",
        f"Rule: {constraint.rule.strip()}",
    ]
    if constraint.driver:
        parts.append(f"Business driver: {constraint.driver}")
    if driver_context:
        parts.append(f"Driver rationale (ADR Context section):\n{driver_context}")
    if examples and (examples.compliant or examples.violating):
        parts.append(
            "Examples of compliant code patterns: "
            + json.dumps(examples.compliant)
            + "\nExamples of violating code patterns: "
            + json.dumps(examples.violating)
        )
    diff_text = "\n\n".join(fd.text for fd in diffs)
    parts.append(f"## Pull-request diff (in-scope files only)\n```diff\n{diff_text}\n```")
    parts.append(
        "Evaluate the diff against this single constraint and return the verdict."
    )
    return "\n\n".join(parts)


def check_constraint(
    client: anthropic.Anthropic,
    constraint: Constraint,
    diffs: list[FileDiff],
    driver_context: str = "",
    model: str = DEFAULT_MODEL,
) -> Verdict:
    response = client.messages.parse(
        model=model,
        max_tokens=16000,
        thinking={"type": "adaptive"},
        system=_SYSTEM,
        messages=[
            {
                "role": "user",
                "content": build_user_prompt(constraint, diffs, driver_context),
            }
        ],
        output_format=SemanticCheckOutput,
    )
    out: SemanticCheckOutput = response.parsed_output
    code = None
    if out.evidence_file and out.evidence_line_start is not None:
        end = out.evidence_line_end or out.evidence_line_start
        code = CodeEvidence(file=out.evidence_file, lines=[out.evidence_line_start, end])
    return Verdict(
        constraint_id=constraint.id,
        result=out.result,
        confidence=max(0.0, min(1.0, out.confidence)),
        evidence=Evidence(adr_clause=constraint.id, code=code),
        explanation=out.explanation,
        fix_locality=out.fix_locality,
        fix_direction=out.fix_direction,
    )


def save_verdicts(verdicts: list[Verdict], path: str | Path) -> None:
    Path(path).write_text(
        json.dumps([v.model_dump(mode="json") for v in verdicts], indent=2)
    )


def load_verdicts(path: str | Path) -> list[Verdict]:
    return [Verdict.model_validate(v) for v in json.loads(Path(path).read_text())]
