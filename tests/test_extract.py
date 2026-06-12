from pathlib import Path

import pytest

from radar.extract import adr_section, extract_from_dir, extract_from_text
from radar.models import CheckType, Enforce, Severity

FIXTURES = Path(__file__).parent / "fixtures"


def test_extracts_constraint_from_fixture_adr():
    constraints = extract_from_dir(FIXTURES)
    assert len(constraints) == 1
    c = constraints[0]
    assert c.id == "ADR-001-C1"
    assert c.adr == "ADR-001"
    assert c.check.type == CheckType.semantic
    assert c.enforce == Enforce.advisory
    assert c.severity == Severity.high
    assert c.driver == "EPIC-512"
    assert c.scope.paths == ["services/inventory/**"]
    assert "FOR UPDATE" in c.check.examples.violating[0]


def test_adr_context_section_carries_driver_rationale():
    context = adr_section(FIXTURES, "ADR-001", "Context")
    assert "EPIC-512" in context
    assert "five" in context or "5" in context  # the staleness rationale


GATE_SEMANTIC = """
```constraints
- id: ADR-009-C1
  adr: ADR-009
  title: Bad combination
  rule: anything
  polarity: requirement
  scope: {paths: ["x/**"]}
  check: {type: semantic}
  enforce: gate
  severity: low
  status: active
```
"""

BAD_ID = """
```constraints
- id: ADR-007-X1
  adr: ADR-007
  title: Bad id
  rule: anything
  polarity: requirement
  scope: {paths: ["x/**"]}
  check: {type: semantic}
  enforce: advisory
  severity: low
  status: active
```
"""


def test_rejects_gate_plus_semantic():  # DM-CONSTRAINT-1
    with pytest.raises(ValueError, match="DM-CONSTRAINT-1"):
        extract_from_text(GATE_SEMANTIC)


def test_rejects_unstable_id():  # DM-CONSTRAINT-2
    with pytest.raises(ValueError, match="DM-CONSTRAINT-2"):
        extract_from_text(BAD_ID)
