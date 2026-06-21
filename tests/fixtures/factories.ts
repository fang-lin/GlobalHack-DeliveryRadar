/**
 * Shared test fixtures. One Constraint/Verdict factory so the 13-field shapes
 * live in one place — when src/models.ts changes, only this file updates (the
 * `as unknown as` casts otherwise hide schema drift across copies).
 */
import type { Constraint, Verdict } from "../../src/core/models.js";

export const makeConstraint = (over: Partial<Constraint> = {}): Constraint =>
  ({
    id: "ADR-001-C1",
    adr: "ADR-001",
    title: "Title One",
    rule: "Must do X.",
    polarity: "requirement",
    driver: null,
    scope: { paths: ["**"], layers: null },
    check: { type: "semantic", matcher: null, examples: null },
    enforce: "advisory",
    severity: "high",
    status: "active",
    superseded_by: null,
    ...over,
  }) as unknown as Constraint;

export const makeVerdict = (over: Partial<Verdict> = {}): Verdict =>
  ({
    constraint_id: "ADR-001-C1",
    result: "violated",
    confidence: 0.9,
    evidence: { adr_clause: "ADR-001-C1", code: null },
    explanation: "because the recorded intent says so",
    fix_locality: "none",
    fix_direction: null,
    ...over,
  }) as unknown as Verdict;
