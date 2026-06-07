---
stepsCompleted:
  [
    'step-01-load-context',
    'step-02-discover-tests',
    'step-03-quality-evaluation',
    'step-03f-aggregate-scores',
    'step-04-generate-report'
  ]
lastStep: 'step-04-generate-report'
lastSaved: '2026-06-06'
workflowType: 'testarch-test-review'
inputDocuments:
  - 'core/database/card-repository.test.ts'
  - 'features/cards/hooks/useTrackCardUsage.test.ts'
  - 'docs/sprint-artifacts/stories/9-1-track-card-usage.md'
  - '_bmad/tea/testarch/knowledge/test-quality.md'
  - '_bmad/tea/testarch/knowledge/test-levels-framework.md'
---

# Test Quality Review: Story 9.1 — Track Card Usage

**Quality Score**: 96/100 (A - Excellent) — ⬆️ re-review, up from 93/100
**Review Date**: 2026-06-07 (re-review) · 2026-06-06 (initial)
**Review Scope**: directory (3 files — Story 9.1 test additions)
**Reviewer**: TEA Agent (Murat) — re-review on a different/stronger model per best practice

---

## 🔁 Re-Review Note (2026-06-07)

All three recommendations from the initial review were implemented and verified. Re-graded cold against current code:

| Rec                         | Status      | Evidence                                                                                                |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------------------- |
| #1 ISO-8601 assertion       | ✅ Resolved | `card-repository.test.ts:241-244` asserts `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/`             |
| #2 Local focus-cycle mock   | ✅ Resolved | `useTrackCardUsage.test.ts:21-50` captures + re-fires a genuine focus callback                          |
| #3 Real-DB integration test | ✅ Resolved | new `card-repository.integration.test.ts` — 3 tests against in-memory SQLite from real migration schema |

**Result:** Maintainability B(82)→A(93); the three B-grade drivers are gone. Score 93→**96**. All Medium findings closed; only minor Lows remain. Suite green: 23/23 across the three files (149 suites / 1445 total repo-wide).

---

Note: This review audits existing tests; it does not generate tests.
Coverage mapping and coverage gates are out of scope here. Use `trace` for coverage decisions.

## Executive Summary

**Overall Assessment**: Excellent

**Recommendation**: Approve with Comments

### Key Strengths

✅ Strict TDD discipline — every test maps to an explicit AC (`(AC1)`…`(AC5)`), giving 1:1 requirement traceability without a formal ID scheme
✅ Exemplary isolation — fresh `makeDb()` mock per test, `jest.restoreAllMocks()` / `clearAllMocks()` teardown, scoped `console.error` spy with restore; fully parallel-safe
✅ Deterministic & fast — no hard waits, no flow conditionals, no `Math.random`; `waitFor` (not `setTimeout`) for the async rejection path; 20 tests in 0.84s

### Key Weaknesses

❌ AC1's "UTC **ISO** timestamp" is not actually asserted — the test only checks `typeof string` + equality of the two timestamp params, so a non-ISO value would pass
❌ The re-focus test (AC2) leans on the **global** `useFocusEffect` mock re-invoking its callback every render, rather than modeling a real blur→focus cycle — couples intent to mock internals
❌ No test exercises real SQL against an in-memory DB — increment semantics are asserted only as a SQL _string_, so a column-name typo could pass undetected

### Summary

The Story 9.1 test additions are high quality and production-ready. Both files are deterministic, isolated, and fast, with assertions kept explicit in the test bodies and a clean red→green TDD trail. The deductions are all enhancement-grade: the tests verify that the _right SQL is issued_ and that the _hook fires on focus_, but stop short of verifying two AC-level semantics — that the timestamp is genuinely ISO-8601, and that the increment actually lands in the database. These are consistent with the repo's existing mock-the-DB convention, so they are recommendations rather than blockers.

---

## Quality Criteria Assessment

| Criterion                            | Status  | Violations | Notes                                                                              |
| ------------------------------------ | ------- | ---------- | ---------------------------------------------------------------------------------- |
| BDD Format (Given-When-Then)         | ✅ PASS | 0          | Story ACs are full GWT; test names encode the AC concisely                         |
| Test IDs                             | ⚠️ WARN | 0          | No `{EPIC}.{STORY}-LEVEL-SEQ` IDs; AC references used instead (project convention) |
| Priority Markers (P0/P1/P2/P3)       | ⚠️ WARN | 0          | Not used in this codebase; informational only                                      |
| Hard Waits (sleep, waitForTimeout)   | ✅ PASS | 0          | None — `waitFor` used for async assertion                                          |
| Determinism (no conditionals)        | ✅ PASS | 0          | Single execution path per test                                                     |
| Isolation (cleanup, no shared state) | ✅ PASS | 0          | Per-test mocks + teardown; spy restored                                            |
| Fixture Patterns                     | ✅ PASS | 0          | `makeDb()` factory is a clean local fixture                                        |
| Data Factories                       | ✅ PASS | 0          | `sampleRow` / `sampleCard` shared builders                                         |
| Network-First Pattern                | N/A     | —          | Pure unit tests, no browser/network                                                |
| Explicit Assertions                  | ✅ PASS | 0          | All `expect()` in test bodies                                                      |
| Test Length (≤300 lines)             | ⚠️ WARN | 293        | `card-repository.test.ts` at 293 lines — approaching limit                         |
| Test Duration (≤1.5 min)             | ✅ PASS | 0          | 20 tests / 0.84s                                                                   |
| Flakiness Patterns                   | ✅ PASS | 0          | No timing/order coupling                                                           |

**Total Violations**: 0 Critical, 0 High, 3 Medium, 2 Low

---

## Quality Score Breakdown

```
Re-review (2026-06-07) — weighted:
  Determinism      98/100 × 0.30 = 29.4
  Isolation        97/100 × 0.30 = 29.1
  Maintainability  93/100 × 0.25 = 23.25
  Performance      98/100 × 0.15 = 14.7
                                  -------
Final Score:                       96/100
Grade:                             A
```

| Dimension       | Score | Grade | Δ   | Rationale (re-review)                                                                         |
| --------------- | ----- | ----- | --- | --------------------------------------------------------------------------------------------- |
| Determinism     | 98    | A     | +3  | Focus-mock intent-coupling removed; integration test fully deterministic                      |
| Isolation       | 97    | A     | −1  | Fresh in-memory DB per test + `close()`; integration `beforeEach` lacks `clearAllMocks` (LOW) |
| Maintainability | 93    | A     | +11 | ISO assert + local focus mock + real-DB test landed; intent well-documented                   |
| Performance     | 98    | A     | —   | In-memory SQLite trivial (~12ms / 3 tests); suite still ~6s                                   |

_Initial review (2026-06-06): Determinism 95 / Isolation 98 / Maintainability 82 / Performance 98 → 93._

---

## Critical Issues (Must Fix)

No critical issues detected. ✅

---

## Recommendations (Should Fix)

### 1. Assert the timestamp is a real ISO-8601 value (AC1)

**Severity**: P2 (Medium)
**Location**: `core/database/card-repository.test.ts:240` (test: "increments usage_count by 1 and sets last_used_at + updated_at (AC1)")
**Criterion**: Explicit Assertions / Requirement Fidelity
**Knowledge Base**: [test-quality.md](../../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
AC1 requires `lastUsedAt` to be "the current UTC ISO timestamp." The test asserts the two params are equal and `typeof === 'string'`, but never that the string is ISO-8601. A regression returning `"now"` or a locale string would still pass.

**Current Code**:

```typescript
// ⚠️ Could be improved
expect(params[0]).toBe(params[1]); // same ISO timestamp for both columns
expect(typeof params[0]).toBe('string');
```

**Recommended Improvement**:

```typescript
// ✅ Asserts the AC's "ISO timestamp" contract
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
expect(params[0]).toMatch(ISO_8601);
expect(params[0]).toBe(params[1]); // both columns stamped identically
```

**Benefits**: Locks the AC contract; catches format regressions in `new Date().toISOString()` usage.
**Priority**: P2 — strengthens an AC assertion; not a blocker since the implementation is correct today.

---

### 2. Model a real focus cycle instead of relying on the global mock's per-render callback (AC2)

**Severity**: P2 (Medium)
**Location**: `features/cards/hooks/useTrackCardUsage.test.ts:34` (test: "increments again on re-focus (AC2)")
**Criterion**: Maintainability / Determinism-of-intent
**Knowledge Base**: [test-quality.md](../../../_bmad/tea/testarch/knowledge/test-quality.md)

**Issue Description**:
The re-focus assertion works because `jest.setup.js` mocks `useFocusEffect` to invoke its callback on **every render**, so `rerender({})` triggers a second call. Real `useFocusEffect` fires on screen _focus_, not on every render. The test passes for the wrong reason and is coupled to global setup behavior; a future change to the shared mock could silently invalidate it.

**Current Code**:

```typescript
// ⚠️ Relies on global mock re-invoking the callback per render
const { rerender } = renderHook(() => useTrackCardUsage('card-1'));
expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(1);
rerender({});
expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(2);
```

**Recommended Improvement**:

```typescript
// ✅ Locally model focus callbacks so intent is explicit
const focusCallbacks: Array<() => void> = [];
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    focusCallbacks.push(cb);
  }
}));
// ...render once, then explicitly re-fire "focus":
renderHook(() => useTrackCardUsage('card-1'));
focusCallbacks.at(-1)!(); // simulate a genuine re-focus event
expect(cardRepository.incrementUsageCount).toHaveBeenCalledTimes(2);
```

**Benefits**: Test documents the real behaviour (one usage event per focus) and is resilient to global-mock changes.
**Priority**: P2 — current test is green and correct in practice; this hardens intent.

---

### 3. Add one in-memory-SQLite integration test for actual increment semantics (AC1/AC2/AC5)

**Severity**: P2 (Medium)
**Location**: `core/database/card-repository.test.ts` (whole `incrementUsageCount` suite)
**Criterion**: Test Levels Framework
**Knowledge Base**: [test-levels-framework.md](../../../_bmad/tea/testarch/knowledge/test-levels-framework.md)

**Issue Description**:
All repo tests mock `db.runAsync`, so they verify the _SQL text and params_ but never that `usage_count` truly goes 1→2, or that an unknown id genuinely affects 0 rows. Per the Test Levels matrix, "database operations" belong at the integration level. A typo (`usage_count` → `usagecount`) or a bad `WHERE` clause would pass every current test. This matches the repo's established mock-the-DB convention, so it is a recommendation, not a defect.

**Recommended Improvement**: Add a thin integration test using an in-memory SQLite instance that inserts a card, calls `incrementUsageCount` twice, and asserts `usageCount === 2` and `lastUsedAt` is set; plus an unknown-id call that leaves the row untouched (AC5).

**Benefits**: Closes the gap between "correct SQL string" and "correct database effect"; defends the smart-sort feature that 9.3 builds on these fields.
**Priority**: P2 — high value, low effort; can land in a follow-up PR without blocking 9.1.

---

### 4. Watch the growing `card-repository.test.ts` file length

**Severity**: P3 (Low)
**Location**: `core/database/card-repository.test.ts:1-293`
**Criterion**: Test Length (≤300 lines)

**Issue Description**: At 293 lines the file is just under the 300-line guideline. As Epic 9 adds favourite/sort writes, consider splitting per-function `describe` blocks into co-located files (e.g., `card-repository.usage.test.ts`).
**Priority**: P3 — preventative; no action needed now.

---

### 5. Priority/ID markers absent (convention note)

**Severity**: P3 (Low / Informational)
**Location**: both files
**Criterion**: Test IDs / Priority Markers

**Issue Description**: TEA's `{EPIC}.{STORY}-LEVEL-SEQ` IDs and P0–P3 markers are not used. The team's AC-reference style provides equivalent traceability, so no change is required unless standardizing across the suite.
**Priority**: P3 — informational.

---

## Best Practices Found

### 1. AC-anchored test naming

**Location**: both files (e.g., `card-repository.test.ts:238`, `useTrackCardUsage.test.ts:22`)
**Pattern**: Requirement traceability in the test title
**Why This Is Good**: `'silently no-ops for unknown id — no throw (AC5)'` ties the test to the spec at a glance — failures point straight at the violated AC. Use as the reference pattern across the suite.

### 2. Fire-and-forget safety is explicitly tested

**Location**: `useTrackCardUsage.test.ts:43`
**Pattern**: Negative-path resilience with `waitFor`
**Why This Is Good**: Asserts the hook never throws when the DB rejects, using `waitFor` to deterministically await the logged error instead of a hard wait — exactly the right tool for an async fire-and-forget path.

### 3. Local mock factory (`makeDb`)

**Location**: `card-repository.test.ts:31`
**Pattern**: Composable per-test fixture
**Why This Is Good**: One small factory yields a fresh, fully-stubbed `SQLiteDatabase` per test — clean isolation with zero shared mutable state.

---

## Test File Analysis

### Files

| File                                             | Lines | Framework | Language   | Tests              |
| ------------------------------------------------ | ----- | --------- | ---------- | ------------------ |
| `core/database/card-repository.test.ts`          | 293   | Jest      | TypeScript | 16 (6 new for 9.1) |
| `features/cards/hooks/useTrackCardUsage.test.ts` | 55    | Jest      | TypeScript | 4                  |

### Test Scope (Story 9.1 additions)

- **AC coverage in tests**: AC1 ✅, AC2 ✅ (see Rec #2), AC3 ✅ (watch push via `getAllAsync`), AC4 ✅ (default `getDatabase`), AC5 ✅
- **Priority Distribution**: not marked (project convention)
- **Assertions**: explicit, in-body; SQL verified via `toContain` substring checks

---

## Context and Integration

### Related Artifacts

- **Story File**: [9-1-track-card-usage.md](../../../docs/sprint-artifacts/stories/9-1-track-card-usage.md) — Status: review
- **Test Design**: none found (not required at this scope)

---

## Knowledge Base References

- **[test-quality.md](../../../_bmad/tea/testarch/knowledge/test-quality.md)** — DoD: no hard waits, <300 lines, <1.5 min, self-cleaning, explicit assertions
- **[test-levels-framework.md](../../../_bmad/tea/testarch/knowledge/test-levels-framework.md)** — unit vs integration for DB operations (Rec #3)

For coverage mapping, consult the `trace` workflow.

---

## Next Steps

### Immediate Actions (Before Merge)

_None required._ No critical or high-severity findings. Tests are green (20/20, 0.84s) and production-ready.

### Follow-up Actions (Future PRs)

1. **Assert ISO-8601 timestamp (Rec #1)** — Priority: P2 — Target: this PR or next — ~10 min
2. **In-memory SQLite increment test (Rec #3)** — Priority: P2 — Target: backlog / 9.3 prep — ~30 min
3. **Local focus-cycle mock (Rec #2)** — Priority: P2 — Target: next PR — ~15 min

### Re-Review Needed?

✅ No re-review needed — approve as-is. Recommendations can be addressed in follow-up without re-review.

---

## Decision

**Recommendation (re-review 2026-06-07): ✅ Approve**

**Rationale**:
At 96/100 (Grade A) all four dimensions are A-grade. The three Medium findings from the initial review are resolved and verified: AC1 now asserts a real ISO-8601 timestamp; the AC2 re-focus test models a genuine focus event via a local mock; and a real-SQLite integration test proves the actual 0→1→2 increment, single-row targeting, and unknown-id no-op against the production migration schema. The latter gives the suite genuine teeth — a column or `WHERE`-clause typo now fails. Only cosmetic Lows remain (file length watch, an integration `clearAllMocks` hygiene nit, pragmatic adapter casts). No blockers.

> Test quality is excellent with 96/100 score. All prior recommendations addressed. Tests are production-ready and follow best practices; merge with confidence. Cross-level overlap on AC2/AC5 (unit asserts SQL issued, integration asserts DB effect) is justified per the Duplicate Coverage Guard.

> _Initial decision (2026-06-06): Approve with Comments at 93/100._

---

## Remaining Low-Severity Items (non-blocking)

| Location                                     | Severity    | Issue                                                               | Suggested fix                                              |
| -------------------------------------------- | ----------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| `card-repository.test.ts:1-293`              | P3 (Low)    | 293 lines, nearing the 300 guideline                                | Split per-function as Epic 9 grows                         |
| ~~`card-repository.integration.test.ts:71`~~ | ✅ Resolved | `beforeEach` now calls `jest.clearAllMocks()` (fixed 2026-06-07)    | —                                                          |
| `card-repository.integration.test.ts:34-40`  | P3 (Low)    | `as never[]` casts in the better-sqlite3 adapter reduce type safety | acceptable for isolated test infra; optional typed wrapper |
| both files                                   | P3 (Info)   | No TEA `{EPIC}.{STORY}-LEVEL-SEQ` IDs / P0–P3 markers               | optional — AC references suffice                           |

---

## Quality Trends

| Review Date | Score  | Grade | Medium+ Issues | Trend       |
| ----------- | ------ | ----- | -------------- | ----------- |
| 2026-06-06  | 93/100 | A     | 3 Medium       | (baseline)  |
| 2026-06-07  | 96/100 | A     | 0              | ⬆️ Improved |

---

## Appendix: Violation Summary by Location

| Location                          | Severity | Criterion           | Issue                                     | Fix                                   |
| --------------------------------- | -------- | ------------------- | ----------------------------------------- | ------------------------------------- |
| `card-repository.test.ts:240`     | P2       | Assertions/Fidelity | ISO timestamp not asserted (AC1)          | `toMatch(ISO_8601)`                   |
| `useTrackCardUsage.test.ts:34`    | P2       | Maintainability     | Re-focus relies on global mock per-render | Local focus-cycle mock                |
| `card-repository.test.ts` (suite) | P2       | Test Levels         | No real-DB test for increment semantics   | Add in-memory SQLite integration test |
| `card-repository.test.ts:1-293`   | P3       | Test Length         | 293 lines, nearing 300 limit              | Split per-function as it grows        |
| both files                        | P3       | IDs/Priority        | No TEA IDs / P0–P3 markers                | Optional — AC refs suffice            |

---

## Review Metadata

**Generated By**: BMad TEA Agent (Test Architect)
**Workflow**: testarch-test-review
**Review ID**: test-review-9-1-track-card-usage-20260606
**Version**: 1.0
