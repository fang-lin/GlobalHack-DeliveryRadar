"""Constraint extraction core (FR-EXT-1, FR-EXT-3).

Parses the fenced ``constraints`` YAML block of an ADR markdown file into
DM-CONSTRAINT objects. ADRs remain the source of truth (FR-INT-2); any dump
produced here is a derived cache.
"""

from __future__ import annotations

import re
from pathlib import Path

import yaml

from .models import Constraint

_FENCE_RE = re.compile(r"^```constraints\s*$(.*?)^```\s*$", re.DOTALL | re.MULTILINE)
_SECTION_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)


def extract_from_text(text: str, source: str = "<text>") -> list[Constraint]:
    """Extract all constraints from one ADR document."""
    constraints: list[Constraint] = []
    for match in _FENCE_RE.finditer(text):
        data = yaml.safe_load(match.group(1))
        if data is None:
            continue
        items = data if isinstance(data, list) else [data]
        for item in items:
            try:
                constraints.append(Constraint.model_validate(item))
            except Exception as exc:  # surface the offending source file
                raise ValueError(f"{source}: invalid constraint: {exc}") from exc
    return constraints


def extract_from_dir(adr_dir: str | Path) -> list[Constraint]:
    """Extract constraints from every ADR-*.md under adr_dir; reject duplicate ids."""
    constraints: list[Constraint] = []
    for path in sorted(Path(adr_dir).glob("ADR-*.md")):
        constraints.extend(extract_from_text(path.read_text(), source=str(path)))
    seen: dict[str, str] = {}
    for c in constraints:
        if c.id in seen:
            raise ValueError(f"duplicate constraint id {c.id} (DM-CONSTRAINT-2)")
        seen[c.id] = c.adr
    return constraints


def adr_section(adr_dir: str | Path, adr_id: str, section: str = "Context") -> str:
    """Return one section's prose from an ADR file (used to ground the semantic
    checker with the driver rationale, FR-CONF-5)."""
    matches = sorted(Path(adr_dir).glob(f"{adr_id}-*.md")) or sorted(
        Path(adr_dir).glob(f"{adr_id}.md")
    )
    if not matches:
        return ""
    text = matches[0].read_text()
    sections = _SECTION_RE.split(text)
    # sections = [preamble, title1, body1, title2, body2, ...]
    for title, body in zip(sections[1::2], sections[2::2]):
        if title.strip().lower() == section.lower():
            return body.strip()
    return ""


def dump_constraints(constraints: list[Constraint], path: str | Path) -> None:
    payload = [c.model_dump(mode="json", exclude_none=True) for c in constraints]
    Path(path).write_text(yaml.safe_dump(payload, sort_keys=False, allow_unicode=True))


def load_constraints(path: str | Path) -> list[Constraint]:
    data = yaml.safe_load(Path(path).read_text()) or []
    return [Constraint.model_validate(item) for item in data]
