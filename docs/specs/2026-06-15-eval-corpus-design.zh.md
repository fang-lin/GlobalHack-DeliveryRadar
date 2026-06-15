# 回放评测台(F)真实语料设计 — Delivery Radar

> **权威:中文(本文件) · 产物(cases.yaml / report)英文 · 最后更新:2026-06-15**

## 1. 目标
把"一个 demo 裁定"升级为"在**带标注的真实语料**上量化准确率,并做 grounded(锚定 ADR+driver) vs ungrounded(纯最佳实践 LLM 评审)对照"。补评分里最弱的 **Business Impact**,消解"single demo / 挑出来的"质疑。

## 2. 为什么用 Backstage 真实仓库
- **意图是维护者写的**:Backstage 在 `docs/architecture-decisions/` 公开了 16 条 ADR(MADR 格式)——意图不是我们造的,堵死"自说自话"。
- **TypeScript**:和 radar 同栈,diff 好读。
- 我们只做两件事:把散文 ADR 忠实转成机读 `constraints` 块(附出处链接)+ **人工读 diff 打 gold 标注**(ground truth 由人判定,**不调用 radar/LLM**,不花 API)。

## 3. 关键认知(全量过完 16 条 ADR 后)
- **lint 可判的 ADR(003 default export / 006 React.FC / 010 Luxon)**:仓库治理太好,**open PR 与 main 里几乎无真实违规**,且 linter 已能判 → 不适合证明 radar 独有价值,只用于"ungrounded LLM 漏报项目特定意图"的对照。
- **语义/driver 型 ADR(012 日期 preset / 007 MSW / 002 catalog 格式 / 009 entity 引用)**:linter 判不了,**真实违规真实存在** → radar 主场,违规案例建在这上面。
- **ADR013 已被 ADR014 supersede**(仓库白纸黑字)→ 真实 supersede/drift 案例。

## 4. 两类能力都覆盖
- **Conformance(查 PR diff)= demo 主戏**:真实违规不在 open PR 里(被 CI 拦),改从**历史**取——对违规行 `blame → 提交 → 关联 PR → diff`,得到"**CI 全绿却引入/保留了 ADR 违规、还合并了**"的真实 PR。
- **Drift(扫现存代码)**:main 里的残留违规天然就是真实 drift。

## 5. 真实案例清单(真路径 + gold + 对照预期)

| # | ADR | 真实产物 | 能力 | gold | grounded vs ungrounded | 状态 |
|---|---|---|---|---|---|---|
| 1 | 012 | **PR #28986** diff:`FailedEntities.tsx` `convertTimeToLocalTimezone` 仍 `toFormat('yyyy-MM-dd hh:mm:ss ZZZZ')` 显示日期 | Conformance | **violated** | ungrounded:"日期格式化修好了"放行;grounded:违反 preset 规则(driver:locale 一致、避免 05/03 歧义)| ✅已读确认 |
| 2 | 012 | 现存 toFormat 残留(扫描定位) | Drift | **violated(drift)** | 同上 | 供给≈4,待 pin |
| 3 | 012 | 用 `toLocaleString` + preset 的真实文件 | Conformance | aligned | 正常对齐(不该报)| 待 pin |
| 4 | 007 | `global.fetch=jest.fn()` / nock 手动 mock 的真实测试 | Conformance/Drift | **violated** | ungrounded 不在意 mock 方式;grounded 知道项目规定用 MSW | 供给≈11+3,待 pin |
| 5 | 007 | `packages/integration/src/gitlab/GitLabIntegration.test.ts`(MSW `setupServer`)| Conformance | aligned | 正常对齐 | ✅候选 |
| 6 | 013→014 | `packages/backend-defaults/.../GithubUrlReader.ts`(仍 `import from 'node-fetch'`)| **Supersede/Drift** | **drift(意图已变)** | 演示 supersede:按旧 ADR013 合规、按新 ADR014 漂移——radar 标 drift,人确认是否 supersede 写回 | ✅候选 |
| 7 | 006 | `plugins/techdocs/.../dom.test.tsx`(残留 `React.FC`)| Drift | **violated(drift)** | ⭐灵魂:ungrounded 说"React.FC 没问题/甚至推荐",grounded 读 ADR006 才报 | ✅候选 |
| 8 | 008 | 非 `catalog-info.yaml` 命名的真实 catalog 文件 | Conformance | **不该报**(008 是软默认、非强制)| 测精度:别误报 | 待 pin |
| 9 | — | 仅改 `docs/`/`.css` 的真实 PR | Conformance | **out-of-scope** | 测检索:scope 不命中就别报 | 待 pin |

⭐ 全部锚在**真实 ADR + 真实代码**;违规为真实残留(Drift)或真实历史 PR(Conformance)。

## 6. 指标
- 头条:violated 类 **precision / recall / F1**(抓真违规、不误报)。
- `unknown` 当**诚实弃权**单列(不当错)。
- out-of-scope(#9)验**检索精度**;软默认(#8)验**不过度报**。
- grounded vs ungrounded 同口径对照(ungrounded = 去掉 ADR/driver 的同模型结构化输出)。
- 置信度校准(对/错平均 confidence)。

## 7. 诚实边界(写进 report/面板)
- **意图真实**(Backstage 维护者 ADR,附链接)、**代码真实**(真实文件/PR)。
- 语料规模 ≈9,**数字是 illustrative,不是统计结论**;价值在"机制可跑 + grounded/ungrounded 差距在多种真实约束上复现 + 跑在 Spotify Backstage 自己的 ADR 上"。
- gold 由人工读 diff 判定;判定准则与每条理由随 `cases.yaml` 一并留痕。

## 8. 落地
- 语料:`eval/cases.yaml`(每条:id / adr 出处 / diff 或文件 / scope / gold / 人工理由)。
- 跑批:`scripts/eval.ts`(`npm run eval`),`--save/--replay` 可复现;生成种子用 `.env` 的 hackathon key(sonnet-4-6),≈9×2 臂调用、几分钱。
- 输出:`eval/report.md` + dashboard "Measured on N cases" 面板。

## 9. 待办(写代码前先 pin 这几条真实文件/PR)
- [ ] #2 现存 toFormat 残留具体文件
- [ ] #3 ADR012 aligned(preset)真实文件
- [ ] #4 ADR007 violated 具体测试文件(+ 可选:考古引入 PR)
- [ ] #8 非默认命名的真实 catalog 文件
- [ ] #9 仅改文档/样式的真实 PR
