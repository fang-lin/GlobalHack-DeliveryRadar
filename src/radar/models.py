"""Shared data contracts.

The Constraint (DM-CONSTRAINT) is the single shared contract all operations
read and write; the Verdict (DM-VERDICT) is the single result shape. Do not
fork these per operation (requirements spec §0, §3.2).
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class Polarity(str, Enum):
    requirement = "requirement"
    prohibition = "prohibition"


class CheckType(str, Enum):
    semantic = "semantic"
    deterministic = "deterministic"


class Enforce(str, Enum):
    advisory = "advisory"
    gate = "gate"


class Severity(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ConstraintStatus(str, Enum):
    active = "active"
    superseded = "superseded"


class VerdictResult(str, Enum):
    aligned = "aligned"
    violated = "violated"
    unknown = "unknown"  # first-class result — never guess (FR-CONF-6)


class FixLocality(str, Enum):
    local = "local"
    structural = "structural"
    none = "none"


class Examples(BaseModel):
    compliant: list[str] = Field(default_factory=list)
    violating: list[str] = Field(default_factory=list)


class CheckSpec(BaseModel):
    type: CheckType
    matcher: Optional[str] = None  # semgrep/AST/regex rule for deterministic checks
    examples: Optional[Examples] = None  # few-shot anchors for the semantic checker


class Scope(BaseModel):
    paths: list[str]  # drives retrieval — NFR-RETRIEVAL-1
    layers: Optional[list[str]] = None


class Constraint(BaseModel):
    id: str
    adr: str
    title: str
    rule: str
    polarity: Polarity
    driver: Optional[str] = None  # link to business rationale (epic/story/PRD)
    scope: Scope
    check: CheckSpec
    enforce: Enforce = Enforce.advisory  # advisory is the default (NFR-GATE-1)
    severity: Severity
    status: ConstraintStatus = ConstraintStatus.active
    superseded_by: Optional[str] = None

    @model_validator(mode="after")
    def _dm_constraint_1(self) -> "Constraint":
        # DM-CONSTRAINT-1: enforce=gate is only permitted for deterministic checks.
        if self.enforce == Enforce.gate and self.check.type != CheckType.deterministic:
            raise ValueError(
                f"{self.id}: DM-CONSTRAINT-1 violated — enforce=gate requires "
                f"check.type=deterministic (got {self.check.type.value})"
            )
        return self

    @model_validator(mode="after")
    def _dm_constraint_2(self) -> "Constraint":
        # DM-CONSTRAINT-2: stable id derived from ADR number + ordinal (ADR-NNN-Cn).
        if not re.fullmatch(rf"{re.escape(self.adr)}-C\d+", self.id):
            raise ValueError(
                f"{self.id}: DM-CONSTRAINT-2 violated — id must be <adr>-C<ordinal> "
                f"derived from adr={self.adr}"
            )
        return self


class CodeEvidence(BaseModel):
    file: str
    lines: list[int]  # [start, end] in the post-change file


class Evidence(BaseModel):
    adr_clause: str  # the constraint id — links verdict back to recorded intent
    code: Optional[CodeEvidence] = None


class Verdict(BaseModel):
    """DM-VERDICT. `fix_direction` extends the spec shape to carry the
    'direction of the required change' that FR-CONF-7 requires structural
    comments to cite."""

    constraint_id: str
    result: VerdictResult
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: Evidence
    explanation: str
    fix_locality: FixLocality
    fix_direction: Optional[str] = None


class SemanticCheckOutput(BaseModel):
    """Structured output the semantic checker requests from the model for ONE
    constraint. The caller fills in constraint_id/adr_clause (FR-CONF-4)."""

    result: VerdictResult
    confidence: float
    explanation: str
    evidence_file: Optional[str] = None
    evidence_line_start: Optional[int] = None
    evidence_line_end: Optional[int] = None
    fix_locality: FixLocality
    fix_direction: Optional[str] = None
