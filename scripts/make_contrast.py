"""Generate dashboard/contrast.html — the scene-4 split screen:
ungrounded baseline review (left) vs Delivery Radar verdict comment (right).
Both sides are the real, persisted artifacts."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

baseline = (ROOT / "artifacts" / "baseline-review.md").read_text()
radar = subprocess.run(
    [
        str(ROOT / ".venv" / "bin" / "radar"),
        "comment",
        "--adr-dir",
        str(Path.home() / "Projects" / "shop-demo" / "docs" / "adr"),
        "--verdicts",
        str(ROOT / "artifacts" / "pr1-verdicts.json"),
    ],
    capture_output=True,
    text=True,
    check=True,
).stdout

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Same model, with and without grounding</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
<style>
  body { background: radial-gradient(1200px 600px at 75% -10%, #16224a 0%, #0b1020 55%); font-family: "Space Grotesk", sans-serif; }
  .md { font-size: 13px; line-height: 1.55; color: #cbd5e1; }
  .md h1, .md h2, .md h3 { color: #e2e8f0; font-weight: 700; margin: 0.9em 0 0.4em; }
  .md h2 { font-size: 1.05rem; } .md h3 { font-size: 0.95rem; }
  .md p { margin: 0.5em 0; }
  .md ul { list-style: disc; margin: 0.5em 0 0.5em 1.2em; }
  .md code { font-family: "JetBrains Mono", monospace; font-size: 0.85em; background: #1f2b4a; padding: 0.1em 0.35em; border-radius: 4px; }
  .md pre { background: #0d1429; border: 1px solid #1f2b4a; border-radius: 8px; padding: 0.7em; overflow-x: auto; margin: 0.5em 0; }
  .md pre code { background: none; padding: 0; }
  .md blockquote { border-left: 3px solid #37e8c2; padding-left: 0.8em; margin: 0.6em 0; color: #94a3b8; }
  .md hr { border-color: #1f2b4a; margin: 1em 0; }
  mark { background: rgba(245, 158, 11, 0.35); color: #fcd34d; padding: 0.05em 0.15em; border-radius: 3px; }
</style>
</head>
<body class="text-slate-200 min-h-screen p-6">
<nav class="fixed top-4 right-4 z-50 flex gap-2 font-mono text-xs">
  <a href="index.html" class="px-3 py-1.5 rounded-lg border border-[#37e8c2]/50 bg-[#11182e]/90 text-[#37e8c2] hover:bg-[#37e8c2]/10 transition-colors">&larr; slides</a>
  <a href="dashboard.html" class="px-3 py-1.5 rounded-lg border border-[#37e8c2]/50 bg-[#11182e]/90 text-[#37e8c2] hover:bg-[#37e8c2]/10 transition-colors">📊 dashboard &rarr;</a>
</nav>
<div class="max-w-7xl mx-auto">
  <div class="text-center mb-5">
    <div class="text-xs uppercase tracking-[0.3em] text-slate-500">same model · same diff</div>
    <h1 class="text-2xl font-bold mt-1">With and without recorded intent</h1>
  </div>
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <section class="bg-[#11182e] border border-edge border-[#1f2b4a] rounded-xl p-5">
      <div class="flex items-center gap-2 pb-3 border-b border-[#1f2b4a]">
        <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-500/15 text-slate-300 border border-slate-500/40">UNGROUNDED</span>
        <span class="text-sm text-slate-400">generic AI review — engineering opinion</span>
      </div>
      <div class="md mt-3" id="left"></div>
    </section>
    <section class="bg-[#11182e] border border-[#37e8c2]/50 rounded-xl p-5 shadow-[0_0_32px_rgba(55,232,194,.07)]">
      <div class="flex items-center gap-2 pb-3 border-b border-[#1f2b4a]">
        <span class="text-[11px] font-mono px-2 py-0.5 rounded bg-[#37e8c2]/15 text-[#37e8c2] border border-[#37e8c2]/40">GROUNDED</span>
        <span class="text-sm text-slate-400">Delivery Radar — verdict against ADR-001</span>
      </div>
      <div class="md mt-3" id="right"></div>
    </section>
  </div>
  <div class="text-center text-xs text-slate-500 mt-4">
    left: treats staleness as a bug to fix — and proposes a primary read, <span class="text-amber-400">itself an ADR-001 violation</span>
    · right: cites the decision, its reason, the evidence, the direction
  </div>
</div>
<script>
const LEFT = __LEFT__;
const RIGHT = __RIGHT__;
let leftHtml = marked.parse(LEFT);
// highlight the self-violating suggestion
leftHtml = leftHtml.replace(/(read from the primary with a plain <code>SELECT<\\/code>|read from the primary with a plain SELECT)/i, "<mark>$1</mark>");
document.getElementById("left").innerHTML = leftHtml;
document.getElementById("right").innerHTML = marked.parse(RIGHT);
</script>
</body>
</html>
"""

html = TEMPLATE.replace("__LEFT__", json.dumps(baseline)).replace(
    "__RIGHT__", json.dumps(radar)
)
out = ROOT / "dashboard" / "contrast.html"
out.write_text(html)
print(f"wrote {out}", file=sys.stderr)
