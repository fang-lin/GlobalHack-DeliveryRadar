export const IIAC_LOOP_SVG = `
  <svg viewBox="0 0 980 672" style="width:100%;height:auto;min-width:520px;max-width:980px;margin:0 auto;display:block">
    <defs>
      <marker id="mSlate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8"/></marker>
      <marker id="mViolet" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a78bfa"/></marker>
    </defs>

    <!-- intent band: the real center; documents are carriers -->
    <text x="340" y="28" text-anchor="middle" fill="#64748b" font-size="11" font-family="JetBrains Mono" letter-spacing="2">SOURCE OF TRUTH</text>
    <rect x="100" y="40" width="480" height="62" rx="12" fill="#11182e" stroke="#a78bfa" stroke-width="2.5"/>
    <text x="340" y="67" text-anchor="middle" fill="#a78bfa" font-size="19" font-weight="700" font-family="Space Grotesk">Intent</text>
    <text x="340" y="89" text-anchor="middle" fill="#94a3b8" font-size="11">carried by ADRs, RFCs, specs, stories, tickets — linked to business drivers</text>

    <rect x="650" y="42" width="230" height="58" rx="12" fill="#11182e" stroke="#a78bfa" stroke-width="2"/>
    <text x="765" y="67" text-anchor="middle" fill="#a78bfa" font-size="16" font-weight="700" font-family="Space Grotesk">Constraints</text>
    <text x="765" y="88" text-anchor="middle" fill="#94a3b8" font-size="11">addressable · stable IDs</text>
    <line x1="580" y1="71" x2="644" y2="71" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <text x="612" y="60" text-anchor="middle" fill="#64748b" font-size="10" font-family="JetBrains Mono">extract</text>

    <!-- fan-out to the three operations: feed runs to the horizontal center (x=490),
         then splits symmetrically over the three branches -->
    <path d="M 765 100 V 120 H 530 V 148" fill="none" stroke="#94a3b8" stroke-width="2"/>
    <path d="M 530 148 H 230 V 184" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <path d="M 530 148 V 184" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <path d="M 530 148 H 830 V 184" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>

    <!-- row 1: the three detection operations -->
    <rect x="115" y="190" width="230" height="64" rx="12" fill="#11182e" stroke="#34d399" stroke-width="2"/>
    <text x="230" y="217" text-anchor="middle" fill="#34d399" font-size="17" font-weight="700" font-family="Space Grotesk">Conformance</text>
    <text x="230" y="240" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="JetBrains Mono">on PR open + push</text>

    <rect x="415" y="190" width="230" height="64" rx="12" fill="#11182e" stroke="#34d399" stroke-width="2"/>
    <text x="530" y="217" text-anchor="middle" fill="#34d399" font-size="17" font-weight="700" font-family="Space Grotesk">Decision Capture</text>
    <text x="530" y="240" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="JetBrains Mono">on PR open</text>

    <rect x="715" y="190" width="230" height="64" rx="12" fill="#11182e" stroke="#34d399" stroke-width="2"/>
    <text x="830" y="217" text-anchor="middle" fill="#34d399" font-size="17" font-weight="700" font-family="Space Grotesk">Drift Detection</text>
    <text x="830" y="240" text-anchor="middle" fill="#94a3b8" font-size="11" font-family="JetBrains Mono">cron · on intent change</text>

    <!-- arrows ops -> artifacts -->
    <line x1="230" y1="254" x2="230" y2="296" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <line x1="530" y1="254" x2="530" y2="296" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <line x1="830" y1="254" x2="830" y2="296" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>

    <!-- row 2: intermediate artifacts -->
    <rect x="115" y="300" width="230" height="64" rx="12" fill="#141b33" stroke="#475569" stroke-width="1.5"/>
    <text x="230" y="327" text-anchor="middle" fill="#e2e8f0" font-size="16" font-weight="700" font-family="Space Grotesk">Report</text>
    <text x="230" y="350" text-anchor="middle" fill="#94a3b8" font-size="11">→ advisory PR review</text>

    <rect x="415" y="300" width="230" height="64" rx="12" fill="#141b33" stroke="#475569" stroke-width="1.5"/>
    <text x="530" y="327" text-anchor="middle" fill="#e2e8f0" font-size="16" font-weight="700" font-family="Space Grotesk">Decision Note</text>
    <text x="530" y="350" text-anchor="middle" fill="#94a3b8" font-size="11">draft, on the PR · human triage</text>

    <rect x="715" y="300" width="230" height="64" rx="12" fill="#141b33" stroke="#475569" stroke-width="1.5"/>
    <text x="830" y="327" text-anchor="middle" fill="#e2e8f0" font-size="16" font-weight="700" font-family="Space Grotesk">Drift report</text>
    <text x="830" y="350" text-anchor="middle" fill="#94a3b8" font-size="11">+ decay trend per ADR</text>

    <!-- column 2: graduate -->
    <line x1="530" y1="364" x2="530" y2="406" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <rect x="415" y="410" width="230" height="58" rx="12" fill="#11182e" stroke="#a78bfa" stroke-width="2"/>
    <text x="530" y="435" text-anchor="middle" fill="#a78bfa" font-size="15" font-weight="700" font-family="Space Grotesk">Graduate → new intent</text>
    <text x="530" y="456" text-anchor="middle" fill="#94a3b8" font-size="10">architectural→ADR · behavioral→story/AC</text>

    <!-- column 3: remediation + supersede -->
    <line x1="830" y1="364" x2="830" y2="406" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <rect x="715" y="410" width="230" height="52" rx="12" fill="#141b33" stroke="#475569" stroke-width="1.5"/>
    <text x="830" y="438" text-anchor="middle" fill="#e2e8f0" font-size="15" font-weight="600" font-family="Space Grotesk">Remediation issue</text>
    <text x="830" y="454" text-anchor="middle" fill="#94a3b8" font-size="9">code fix · no intent change</text>

    <path d="M 715 332 H 680 V 513 H 711" fill="none" stroke="#94a3b8" stroke-width="2" marker-end="url(#mSlate)"/>
    <rect x="715" y="487" width="230" height="52" rx="12" fill="#11182e" stroke="#a78bfa" stroke-width="2"/>
    <text x="830" y="519" text-anchor="middle" fill="#a78bfa" font-size="15" font-weight="700" font-family="Space Grotesk">Supersede → replace intent</text>

    <!-- return loop: graduate/supersede flow IN from the right; updated intent feeds back ONLY if the human confirms -->
    <!-- in → gate: supersede drops to the rail, graduate joins at x=530, both arrow into the gate's right edge -->
    <path d="M 530 468 V 600" fill="none" stroke="#a78bfa" stroke-width="2"/>
    <path d="M 830 539 V 600 H 382" fill="none" stroke="#a78bfa" stroke-width="2" marker-end="url(#mViolet)"/>

    <!-- the human gate: one decision, two exits (matches the README flowchart's diamond) -->
    <rect x="200" y="586" width="180" height="28" rx="8" fill="#0b1020" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="290" y="605" text-anchor="middle" fill="#e2e8f0" font-size="12" font-weight="600" font-family="Space Grotesk">human confirms?</text>

    <!-- yes → write back to intent, out the gate's left edge along the violet rail -->
    <path d="M 200 600 H 60 V 71 H 94" fill="none" stroke="#a78bfa" stroke-width="2" marker-end="url(#mViolet)"/>
    <text x="150" y="592" text-anchor="middle" fill="#a78bfa" font-size="11" font-weight="700" font-family="JetBrains Mono">yes</text>
    <text x="640" y="614" text-anchor="middle" fill="#a78bfa" font-size="11" font-family="JetBrains Mono">updated intent → constraints re-extracted ↻</text>

    <!-- no → dismissed, no change to intent -->
    <path d="M 290 586 V 526" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="5 4" marker-end="url(#mSlate)"/>
    <text x="303" y="558" text-anchor="start" fill="#64748b" font-size="11" font-weight="700" font-family="JetBrains Mono">no</text>
    <rect x="205" y="488" width="170" height="38" rx="16" fill="#0b1020" stroke="#64748b" stroke-width="1.5" stroke-dasharray="5 4"/>
    <text x="290" y="512" text-anchor="middle" fill="#94a3b8" font-size="12" font-weight="600" font-family="Space Grotesk">dismissed — no change</text>

    <!-- legend -->
    <rect x="180" y="638" width="14" height="14" rx="4" fill="#11182e" stroke="#a78bfa" stroke-width="2"/>
    <text x="202" y="650" fill="#94a3b8" font-size="12">intent · its updates</text>
    <rect x="450" y="638" width="14" height="14" rx="4" fill="#11182e" stroke="#34d399" stroke-width="2"/>
    <text x="472" y="650" fill="#94a3b8" font-size="12">detection operations</text>
    <rect x="660" y="638" width="14" height="14" rx="4" fill="#141b33" stroke="#475569" stroke-width="1.5"/>
    <text x="682" y="650" fill="#94a3b8" font-size="12">intermediate artifacts</text>
  </svg>
`;
