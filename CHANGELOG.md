## [1.4.1](https://github.com/fang-lin/GlobalHack-DeliveryRadar/compare/v1.4.0...v1.4.1) (2026-06-24)


### Bug Fixes

* **capture:** grep tool matches literally (-F), not as a regex (ST-0005) ([3bc093b](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/3bc093b6b5d616574c9bb39cc949135f795dcd63))

# [1.4.0](https://github.com/fang-lin/GlobalHack-DeliveryRadar/compare/v1.3.0...v1.4.0) (2026-06-23)


### Bug Fixes

* **capture:** openrouter provider branch + tighten DecisionNote bounds (ST-0005) ([ac70021](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/ac70021f96d54a3c75573ab65a51bdf79848f4e1))


### Features

* **capture:** investigative agent on the AI SDK (ST-0005, ADR-0009) ([fdea89d](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/fdea89df6a957411ba413b6b1120f1e0bb195a3c))
* **capture:** read-only investigation tools (read/grep/git) (ST-0005, ADR-0009) ([4ea02c7](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/4ea02c73cb040c85f03cf25da4f74a49bc1ec523))
* **capture:** select agent model from env (ST-0005, ADR-0007) ([bd195ba](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/bd195baa303e07bd6f0cd2bbb264b33abb1b0aaa))
* **capture:** tolerant parser for agent output (ST-0005) ([9a17747](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/9a17747826ef552632609caff27b758aa3c52fa6))
* **ci:** add radar-capture workflow; ship skills/ in package (ST-0005, ADR-0009) ([a6a2066](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a6a2066a186e566ef4e4f3c503bae97711661f71))
* **cli:** radar capture command (--diff/--save/--replay) (ST-0005) ([a568f56](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a568f5643d54f61cf83dfc356d73234acf8e2d86))
* **core:** DecisionNote data contract (DM-DECISION-NOTE) (ST-0005) ([3c3ddec](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/3c3ddec766117815b00f8c1edd036b3bf0eb6eda))
* **core:** render Decision Notes to markdown (ST-0005) ([5af550f](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/5af550f2192b92f001c8add000ae12bbc556613b))
* **io:** save/load Decision Notes for --save/--replay (ST-0005) ([b00972c](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/b00972cd9636bbbac95000236672d5e32770aac4))
* **skills:** IIAC capture methodology skill (ST-0009, ST-0005) ([bdeb435](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/bdeb435349bd64b90f39ff533212388a8b50655a))

# [1.3.0](https://github.com/fang-lin/GlobalHack-DeliveryRadar/compare/v1.2.0...v1.3.0) (2026-06-21)


### Features

* **radar:** empty conformance review says "Nothing flagged" (ST-0026) ([bf671ff](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/bf671ff5c6eef393bcedcbf9382e878e750fff8d)), closes [#10](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/10)

# [1.2.0](https://github.com/fang-lin/GlobalHack-DeliveryRadar/compare/v1.1.0...v1.2.0) (2026-06-21)


### Bug Fixes

* **ci:** radar.yml runs the CLI via tsx (no build); gate npm publish off until ready ([db4587c](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/db4587c1d015c1f86fc00c3768690679290c6c64))
* **ci:** radar.yml runs the PR's radar engine, ADR baseline from main ([3e12231](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/3e1223143b4f14edbdffabf999fb79420bcec385))
* **radar:** coherent env config + self-review fixes (ST-0022, ADR-0007) ([8ee4b5e](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/8ee4b5e2f9533bfd6b6c24f576b0b325bfe76043))
* **web:** footer visible + clean on mobile — robust fix (ST-0023, recurring ST-0014) ([d33d12e](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/d33d12ed6071ec75a9a61c771614e2f0131a769c)), closes [#site-footer](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/site-footer)


### Features

* **eval:** select provider/model so the Backstage benchmark runs across providers (ST-0022, ADR-0007) ([6259727](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/62597270ce89f23f2decde2113496554755adf45))
* **radar:** cli check builds the model client from env at the edge (ST-0022, ADR-0007) ([569221a](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/569221a7f5e4d44051f3473fb725149278b9e812))
* **radar:** distribute as an npm package — CLI now, library API experimental (ADR-0008) ([7628d41](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/7628d41c495e91a1235e2d94c6d2bdd9fdbe1453))
* **radar:** makeModelClient(env) factory — provider/gateway presets + escape hatch (ST-0022, ADR-0007) ([e9693bf](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/e9693bf7f5a0b174f16a48be1e2a11ff6f9f5ef3))
* **radar:** OpenAICompatAdapter — json_object/json_schema + zod-validate + retry (ST-0022, ADR-0007) ([c939b45](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/c939b45fa91df445e3d90415601666e0fff1ae72))
* **web:** id Dashboard + Evidence surfaces — complete the showcase id pass (ST-0020, ADR-0005-C1) ([5eb0e34](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/5eb0e34494a5019216fbb3136e51e0d2d53a6e3e))

# [1.1.0](https://github.com/fang-lin/GlobalHack-DeliveryRadar/compare/v1.0.0...v1.1.0) (2026-06-19)


### Bug Fixes

* **web:** homepage deck — slide-scroll on mobile, not just desktop (ST-0018) ([3ffe7f0](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/3ffe7f06a947b23f13ecaef5f0df00786b81feb0))
* **web:** id mobile-nav items + explore links — radar caught ADR-0005-C1 gap on PR [#4](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/4) (ST-0020) ([bf8fa66](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/bf8fa66b4ac5af90081a89d657a048c2ab307c0a))


### Features

* **radar:** sticky progress review — post 'started', then edit it into the verdict (ST-0021) ([51189ab](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/51189abd839beafd99b1023e1ab92aea8c928ef2))
* **web:** complete homepage id pass — crux card, why-table + rows, system-map legend/columns/items, paths & roadmap cards (ST-0020, ADR-0005-C1) ([b38829d](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/b38829db18d5114cc07767544107a8d41a3ad6de))
* **web:** stable ids on significant UI elements — nav, header, footer, homepage sections, hero CTAs (ST-0020 / ADR-0005-C1) ([fe833d4](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/fe833d4b812b2001cb271d4f647cec0ce2278ec9)), closes [#site-header](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/site-header) [#nav-logo](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/nav-logo) [#nav-github](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/nav-github) [#mobile-nav](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/mobile-nav) [#site-footer](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/site-footer)

# 1.0.0 (2026-06-17)


### Bug Fixes

* apply English-review must-fix items — narration speakability, brand tagline, README fluency, slide phrasing, spec typo ([5323608](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/5323608b6a738ed58a9eca2cfa157d6d53bddbfd))
* apply subagent audit findings + convergence-needs-memory insight ([5a35a80](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/5a35a80cbf06bfc14719da97c27a3a10df839c4b))
* center the constraints fan-out over the three operation branches ([1bc8483](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/1bc8483ab9650184824b6a8f053ffbf6b0452e92))
* graduate-box subtitle no longer overflows the border ([9526936](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/95269365d3f890067c71ff037cde87ebf772dfd3))
* move return-loop label below the line, clear of the supersede feeder ([a705c0b](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a705c0bdeb6bce7fa7191678153feaaa7a238492))
* shift the three operation pipelines right by 40px for visual balance ([ef74d92](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/ef74d92eddd94f71660345034f8435177ec0d062))
* **slides:** inbound arrow now touches the gate's right border (stop at x=382 so arrowhead tip lands on the pill edge, still outside the fill); recenter 'updated intent → re-extracted' directly under the gate ([1f798ef](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/1f798efce6d01695da1f877dcfd40219d05baa77))
* **slides:** make the human-gate inbound arrow visible (stop short of the pill so the pill fill no longer covers the arrowhead); move 'updated intent → re-extracted' to the yes/output side where it belongs ([e75a467](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/e75a467a704953a29f486550970253d1c8d6c6da))
* **slides:** move 'updated intent → re-extracted' caption into the open band below the inbound rail (x=640), clear of the legend ([2316fc7](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/2316fc72c32266fae7e7f602f5d96a388ad864a1))
* **web:** footer unreachable in deck mode — give it a snap point (ST-0014) ([ae36786](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/ae367860e6b4c048b33d05c1ec3bdc1b0533dbc2))
* **web:** homepage deck — mandatory scroll-snap + flex-centered full-screen sections (was proximity + content-at-top, which looked sparse); move CTA grid into an inner div so section-level flex centering doesn't override it ([dea7117](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/dea71170437890e142513c2ca2bb438910e4a5e7))


### Features

* 4-of-13 stat on system-map slide and narration; Action-automation-next note ([2b1960f](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/2b1960f25a53ff17f042f5c86458db045888b5dc))
* add Thoughtworks tagline 'Innovation that AI/works™' to attributions ([c658feb](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/c658feb81384495fd78f4573aa01b3c679b0c9a1))
* alignment-vs-convergence framing on loop slide and segment 8 narration ([a9df244](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a9df244f434f7bfee39c68291408a549110b1f44))
* close the showcase on the Thoughtworks tagline (roadmap slide + narration) ([6d37dc1](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/6d37dc1cb34162fbec4bd4d69664c9ddc5b3b245))
* cross-navigation — slides link to subpages, subpages link back ([6c15ecd](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/6c15ecda9ebf3ca510070eb23d6977ddd0a4921a))
* demo dashboard — conformance feed, drift health, capture queue ([218f581](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/218f581113eef7cec78ab4169169005b4d82f4b3)), closes [#1](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/1)
* **eval:** expand corpus to 7 cases across 4 real Backstage ADRs; isolate confounds ([2a45867](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/2a45867a067c2c0e593439fb5acdde4d6d8a507f)), closes [#28986](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/28986)
* **eval:** replay/precision harness — grounded vs ungrounded on real Backstage ADRs ([08f8504](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/08f850414c3192e5647c7f7de8f85760ad64c612)), closes [#28986](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/28986)
* loop diagram v3 — Intent as center (ADR demoted to carrier), human-confirms gate on write-back, convergence strip; reviewable design doc ([f89c46f](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/f89c46f801c1830bd68c36445038c3ed0081a093))
* name the loop — IIAC Loop across slides, dashboard, README, spec (zh+en), scripts ([1bcb943](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/1bcb9436a5e9d49218d378cbb46ece3be3777c29))
* prominent pill-style cross-navigation on all pages; README lists every showcase page ([2848b9e](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/2848b9e309ef893e72c864edc98e13848f73307d))
* radar CLI core — extract/check/comment with fixture tests ([04e8886](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/04e88868b78111f51d89a783034099af8f0fc7b5))
* real PR [#1](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/1) verdicts, posted review, ungrounded baseline + honest contrast reframe ([e1d1c67](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/e1d1c675b5f9efcabfd57876724b4795a4a641ac))
* redesign loop slide as two-layers-three-bridges diagram (conformance/drift down, capture/supersede up) ([34ee3e8](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/34ee3e8b1c5b6360487391bad447b2f1dcf41d5e))
* relayout IIAC Loop slide — convergence chart folded into the diagram's empty quadrant, single-screen height ([74d4362](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/74d436264560f3baa3bb5cdc7bfb5def65ab8968))
* responsive dashboard layout for mobile screens ([ab0a7af](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/ab0a7af1e79800eb9a3113d472e6a9446dea6b84))
* scene-4 contrast page from real artifacts; recording checklist complete ([f1b654f](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/f1b654fd840fbabcca2d1a609939c4ef96f7a319))
* **showcase:** add Measured-evidence section to contrast page (data-driven from eval) ([409ce85](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/409ce85c80b25cf3d0bd937ac2fd1c566f2628fa))
* slides become the showcase landing page (index); dashboard moves to dashboard.html ([df7a8ab](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/df7a8abc51c1d3ce61861ff000744b2196c7310c))
* switch to claude-sonnet-4-6 (hackathon model policy), sonnet artifacts canonical ([a071644](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a07164475ea2f06f9a869e6d6add426ad60ec671)), closes [shop-demo#1](https://github.com/shop-demo/issues/1)
* system-map slide — audit/convergence card, autonomy hook, intent-carriers header ([2aa8122](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/2aa8122bc5606a675b3d314b046d091b55132d42))
* Thoughtworks hackathon attribution — slides footer badge + README acknowledgement ([a7f760b](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/a7f760b2f121bf1b23f08ef323b4d86572150414))
* three-era slide (writing -> steering -> autonomy) + audit strip; scripts synced ([0a23303](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/0a23303f34e62884a7bb91fa128417e67735a0af))
* video slides — closed-loop diagram + roadmap (scenes 5 & 7) ([7179f75](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/7179f75a4ceb7bd1bd56a6f7afc1ecfa2a6c578d))
* vision-led second half — circular loop, full-system map, two-paths+audit slide ([9d39f3e](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/9d39f3e05e4da1ef408ae3fb3de89cc6a0c61ddb))
* **web:** migrate contrast worked example into the SPA as an Evidence sub-page (ST-0003) ([64edc6c](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/64edc6cfd5d899c15da39ff26214822a5313d0f6))
* **web:** mobile/responsive layout (ST-0014, in review — pending real-device verification) ([b2b61c6](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/b2b61c6f7b175f9dda1e748f69668eeaf96ab943))
* **web:** page-by-page deck scroll-snap on homepage; restore Thoughtworks logo; rebuild Evidence as a full narrative (why / why Backstage / method / results / conclusion); fix flex-paragraph layout in honesty notes ([733363e](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/733363e12d7fca12d8a9937dd64c15a968f34afa))
* **web:** port the slide deck into the homepage — embed the IIAC Loop SVG + system map / dual-path / roadmap sections ([94028a4](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/94028a4ed909834b353d958d9856a136b9bb6786))
* **web:** React+shadcn showcase SPA source (Vite, HashRouter, Recharts) ([144bce5](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/144bce5e11bc51cc5da74168252efd9ecc7d10bf))
* **web:** two dashboards via subject switcher — rich shop-demo dashboard ported faithfully from legacy data.js (parity: 5 KPIs, multi-verdict feed incl. unknown + ADR-002 line, per-ADR sparklines, at-risk Remediation-vs-Supersede card, Capture queue) + seeded Backstage dashboard anchored on real ADRs (PR [#28986](https://github.com/fang-lin/GlobalHack-DeliveryRadar/issues/28986) real). DashboardLayout sub-nav + DashboardView; removed the thin re-authored Dashboard.tsx/shopDemo.ts. (ST-0004, ADR-0002) ([4873052](https://github.com/fang-lin/GlobalHack-DeliveryRadar/commit/4873052f9908b637f77c0f8d91dcbdb9969d9a9f))
