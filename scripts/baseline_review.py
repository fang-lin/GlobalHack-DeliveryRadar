"""Ungrounded-LLM baseline (AC-1 contrast arm, demo slice).

Same model, same diff, same PR context — but NO ADR/constraint grounding.
Demonstrates the class of violations ungrounded review misses:
letter honored, reason defeated.
"""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from radar.checker import make_client, DEFAULT_MODEL  # noqa: E402

PR_TITLE = "Fix stale stock count on product page"
PR_BODY = (
    "Customers keep reporting that the product page shows items as in stock "
    "when they are actually sold out (support ticket #1287). Read the stock "
    "count directly from the primary database and lock the row, so the "
    "displayed count is always exact."
)

SYSTEM = (
    "You are an experienced AI code reviewer. Review the pull request diff "
    "and point out any problems — bugs, design issues, risks. If the change "
    "looks good, say so briefly."
)


def main() -> None:
    diff = Path(sys.argv[1]).read_text()
    client = make_client()
    response = client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=2000,
        thinking={"type": "adaptive"},
        system=SYSTEM,
        messages=[
            {
                "role": "user",
                "content": (
                    f"PR title: {PR_TITLE}\n\nPR description:\n{PR_BODY}\n\n"
                    f"Diff:\n```diff\n{diff}\n```"
                ),
            }
        ],
    )
    text = "\n".join(b.text for b in response.content if b.type == "text")
    out = Path("artifacts/baseline-review.md")
    out.write_text(f"# Ungrounded AI review (same model, no ADR grounding)\n\n{text}\n")
    print(text)


if __name__ == "__main__":
    main()
