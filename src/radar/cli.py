"""radar CLI — extract / check / comment."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import checker, comment as comment_mod, extract as extract_mod
from .diff import load_diff
from .models import VerdictResult
from .retrieve import retrieve


def _cmd_extract(args: argparse.Namespace) -> int:
    constraints = extract_mod.extract_from_dir(args.adr_dir)
    if args.out:
        extract_mod.dump_constraints(constraints, args.out)
    for c in constraints:
        print(f"{c.id}  [{c.check.type.value}/{c.enforce.value}/{c.severity.value}]  {c.title}")
    print(f"extracted {len(constraints)} constraint(s)", file=sys.stderr)
    return 0


def _cmd_check(args: argparse.Namespace) -> int:
    constraints = extract_mod.extract_from_dir(args.adr_dir)
    file_diffs = load_diff(args.diff)
    in_scope = retrieve(constraints, file_diffs)
    print(
        f"changed files: {len(file_diffs)}; in-scope constraints: "
        f"{[c.id for c, _ in in_scope]}",
        file=sys.stderr,
    )

    if args.replay:
        verdicts = checker.load_verdicts(args.replay)
    else:
        client = checker.make_client()
        verdicts = []
        for constraint, diffs in in_scope:
            context = extract_mod.adr_section(args.adr_dir, constraint.adr, "Context")
            verdicts.append(
                checker.check_constraint(
                    client, constraint, diffs, driver_context=context, model=args.model
                )
            )

    for v in verdicts:
        print(f"{v.constraint_id}: {v.result.value} (confidence {v.confidence:.2f})")
        print(f"  {v.explanation}")
    if args.save and not args.replay:
        checker.save_verdicts(verdicts, args.save)
        print(f"saved verdicts to {args.save}", file=sys.stderr)
    return 0


def _cmd_comment(args: argparse.Namespace) -> int:
    constraints = extract_mod.extract_from_dir(args.adr_dir)
    verdicts = checker.load_verdicts(args.verdicts)
    if not args.all:
        verdicts = [v for v in verdicts if v.result == VerdictResult.violated]
    if not verdicts:
        print("nothing to post (no violated verdicts; use --all to include others)")
        return 0
    driver_contexts = {
        c.adr: extract_mod.adr_section(args.adr_dir, c.adr, "Context")
        for c in constraints
    }
    body = comment_mod.review_markdown(verdicts, constraints, driver_contexts)
    if args.post:
        comment_mod.post_review(args.repo, args.pr, body)
        print(f"posted advisory review on {args.repo}#{args.pr}", file=sys.stderr)
    else:
        print(body)
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="radar", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_extract = sub.add_parser("extract", help="ADR constraints block -> DM-CONSTRAINT")
    p_extract.add_argument("--adr-dir", default="docs/adr")
    p_extract.add_argument("--out", help="write derived constraint cache (YAML)")
    p_extract.set_defaults(func=_cmd_extract)

    p_check = sub.add_parser("check", help="PR diff -> verdicts")
    p_check.add_argument("--adr-dir", default="docs/adr")
    p_check.add_argument("--diff", required=True, help="unified diff file")
    p_check.add_argument("--model", default=checker.DEFAULT_MODEL)
    p_check.add_argument("--save", help="persist verdicts JSON (for replay)")
    p_check.add_argument("--replay", help="skip the LLM, load persisted verdicts")
    p_check.set_defaults(func=_cmd_check)

    p_comment = sub.add_parser("comment", help="verdicts -> PR review (advisory)")
    p_comment.add_argument("--adr-dir", default="docs/adr")
    p_comment.add_argument("--verdicts", required=True)
    p_comment.add_argument("--repo", help="owner/name (required with --post)")
    p_comment.add_argument("--pr", type=int, help="PR number (required with --post)")
    p_comment.add_argument("--post", action="store_true", help="post via gh api")
    p_comment.add_argument("--all", action="store_true", help="include non-violated verdicts")
    p_comment.set_defaults(func=_cmd_comment)

    args = parser.parse_args(argv)
    if getattr(args, "post", False) and (not args.repo or not args.pr):
        parser.error("--post requires --repo and --pr")
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
