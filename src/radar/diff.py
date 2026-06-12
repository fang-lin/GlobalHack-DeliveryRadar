"""Unified-diff parsing — one pass over the PR diff shared by conformance and
(later) capture (FR-ARCH-1)."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_FILE_HEADER_RE = re.compile(r"^diff --git a/(?P<a>\S+) b/(?P<b>\S+)", re.MULTILINE)


@dataclass
class FileDiff:
    path: str  # post-change path
    text: str  # the file's full diff segment (headers + hunks)


def parse_unified_diff(text: str) -> list[FileDiff]:
    matches = list(_FILE_HEADER_RE.finditer(text))
    diffs: list[FileDiff] = []
    for i, m in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        segment = text[m.start():end]
        path = m.group("b")
        if "+++ /dev/null" in segment:  # deleted file — keep pre-change path
            path = m.group("a")
        diffs.append(FileDiff(path=path, text=segment.rstrip("\n")))
    return diffs


def load_diff(path: str | Path) -> list[FileDiff]:
    return parse_unified_diff(Path(path).read_text())
