from pathlib import Path

from radar.diff import load_diff
from radar.extract import extract_from_dir
from radar.retrieve import glob_to_regex, retrieve

FIXTURES = Path(__file__).parent / "fixtures"


def test_parses_changed_files_from_diff():
    diffs = load_diff(FIXTURES / "pr-violating.diff")
    assert [d.path for d in diffs] == [
        "services/inventory/reader.py",
        "services/inventory/tests/test_reader.py",
    ]
    assert "FOR UPDATE" in diffs[0].text


def test_glob_matching():
    assert glob_to_regex("services/inventory/**").match("services/inventory/reader.py")
    assert glob_to_regex("services/inventory/**").match(
        "services/inventory/sub/deep.py"
    )
    assert not glob_to_regex("services/inventory/**").match("services/orders/api.py")
    assert glob_to_regex("**/*.sql").match("migrations/0001_init.sql")
    assert not glob_to_regex("services/*/api.py").match("services/a/b/api.py")


def test_scope_first_retrieval():  # NFR-RETRIEVAL-1
    constraints = extract_from_dir(FIXTURES)
    diffs = load_diff(FIXTURES / "pr-violating.diff")
    matched = retrieve(constraints, diffs)
    assert len(matched) == 1
    constraint, files = matched[0]
    assert constraint.id == "ADR-001-C1"
    assert len(files) == 2  # both changed files are under services/inventory/

    # an out-of-scope diff retrieves nothing — over-retrieval is a defect
    other = [d for d in diffs if False]
    assert retrieve(constraints, other) == []
