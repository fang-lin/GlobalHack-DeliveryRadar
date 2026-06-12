"""Scope-first constraint retrieval (NFR-RETRIEVAL-1).

Only constraints whose scope.paths match the changed files are evaluated.
Over-retrieval is the primary cause of false positives and is treated as a
defect; path matching is primary, semantic similarity would only ever be a
secondary signal (not implemented in this slice).
"""

from __future__ import annotations

import re

from .diff import FileDiff
from .models import Constraint, ConstraintStatus


def glob_to_regex(pattern: str) -> re.Pattern[str]:
    """Translate a path glob with ** support into a regex.

    ``**`` matches across directory separators, ``*``/``?`` do not.
    """
    out: list[str] = []
    i = 0
    while i < len(pattern):
        ch = pattern[i]
        if ch == "*":
            if pattern[i : i + 2] == "**":
                out.append(".*")
                i += 2
                if i < len(pattern) and pattern[i] == "/":
                    i += 1  # "**/" already covered by ".*"
                continue
            out.append("[^/]*")
        elif ch == "?":
            out.append("[^/]")
        else:
            out.append(re.escape(ch))
        i += 1
    return re.compile("^" + "".join(out) + "$")


def in_scope(constraint: Constraint, path: str) -> bool:
    return any(glob_to_regex(p).match(path) for p in constraint.scope.paths)


def retrieve(
    constraints: list[Constraint], file_diffs: list[FileDiff]
) -> list[tuple[Constraint, list[FileDiff]]]:
    """Return (constraint, matching file diffs) pairs for active, in-scope
    constraints only."""
    result: list[tuple[Constraint, list[FileDiff]]] = []
    for c in constraints:
        if c.status != ConstraintStatus.active:
            continue
        matching = [fd for fd in file_diffs if in_scope(c, fd.path)]
        if matching:
            result.append((c, matching))
    return result
