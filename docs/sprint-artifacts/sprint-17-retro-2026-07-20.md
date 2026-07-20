# Sprint 17 Retrospective — Reliability & Auth Hardening

- **Date:** 2026-07-20
- **Facilitator:** Amelia (Senior Software Engineer) — party mode (SM role dissolved in the 6.10 migration)
- **Participants:** ifero (Project Lead), Amelia (Developer), Winston (System Architect), John (Product Manager)
- **Scope:** Sprint 17 — 6 stories across Epic 16 (Platform & Tech-Debt bucket) + Epic 6 (Authentication). **Sprint-scoped** retro: neither epic closed (Epic 16 is a standing bucket with 16-6/16-14 outstanding; Epic 6 still has 6-12/6-13 social sign-in in backlog).
- **Tracker:** `docs/sprint-artifacts/sprint-status.yaml`

---

## 1. Sprint Summary

**Goal:** Fix the remaining stakeholder-reported defects and harden the platform — stop deleted cards resurrecting on cloud sync (16-11); rebuild password management on OTP: reset-via-OTP (6-19) + change-password-in-Settings (6-20); bound the OTA update download at boot (16-12); close the coverage blind spot by widening the jest gate to `shared/**` (16-13).

**Delivered: 6/6 stories, all `done` and merged to main.**

- **Wave 1 (reliability + tech-debt):** 16-11, 16-12, 16-13 — plus **16-15** folded in mid-sprint as a fast-tracked production hotfix.
- **Wave 2 (auth/OTP, sequenced):** 6-19 → 6-20.

| Metric                       | Result                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Stories delivered            | 6/6 (100%)                                                                   |
| Tests                        | ~1675 → **1747** (≈ +72); 80% global gate held; branch ~85%                  |
| Production defects **fixed** | 16-15 (fatal Hermes crash), 16-11 (deleted-card resurrection)                |
| New production incidents     | 0                                                                            |
| Tech-debt spawned            | 16-14 (OTA observability — `logger.warn` is `__DEV__`-only → prod-blind)     |
| Device / RC validation       | ✅ **Completed by ifero** (watch usage/favourite + all stacked device gates) |

---

## 2. What Went Well

- **Bug-clearing focus felt good (ifero's headline).** Every story was a real, user-facing wound — cards resurrecting, the app crashing on launch for Italian users, a silently-dead forgot-password flow. Tangible, satisfying work rather than abstract tickets.
- **Reuse compounding paid off exactly as the Sprint 16 retro predicted.** The sprint leaned hard on prior investment:
  - `withTimeout` (built in 16-10) carried **16-12** — no new code, no new dependency.
  - The 6.18 OTP screen/plumbing carried **6-19**, which then carried **6-20** through a single `origin` route param (6-20 was nearly free).
  - **16-11** revived `mergeWithDeletions` — deletion-aware merge code that had existed since Story 7.6 with _zero callers_.
- **Root-cause fixes, not band-aids.** 16-11 revived purpose-built dead code rather than patching; 16-15 removed the `Intl` dependency entirely rather than papering over it; 16-13 widened the coverage gate at the config root.
- **Process hygiene from the last retro stuck.** `baseline_commit` frontmatter is now standard; mid-sprint stories self-registered into the sprint record (16-15 into wave 1).
- **Device-validation debt was CLEARED.** What looked like two sprints of compounding debt turned out to be completed work that simply hadn't been recorded — the RC/watch/device validation is done, unblocking Sprint 18.

---

## 3. What Was Hard / Challenges

- **16-15: a fatal production crash our own gates were blind to.** `formatRelativeTime` built `new Intl.RelativeTimeFormat` unconditionally (`core/utils/relative-time.ts:21`). Node/Jest ships full ICU → the suite was **green**. Hermes on iOS ships only a limited `Intl` subset that omits `RelativeTimeFormat` → `new undefined(...)` → fatal `TypeError`. It escaped **CI and executing review**; only production Sentry (RN-1: 7 events handled; RN-2: 2 events fatal) caught it. This is the exact "green tests ≠ works" failure the Sprint 16 retro predicted — realized one sprint later, and worse (fatal, not cosmetic).
- **The tracker lags reality — in the "done" direction.** Three separate records were _more pessimistic than the truth_: `current_sprint.status` still read `planned` (all 6 done); the machine-tracked `action_items` were all still `open` (several completed); and the device-validation debt was recorded as outstanding when it was actually cleared. A tracker that under-reports completion is safer than one that over-reports, but it still misleads planning.
- **Process friction caused the one real gap.** The device validation was skipped before RC because doing it correctly required putting a personal account on a simulator — a **system** friction, since resolved by a dedicated test account.

---

## 4. Key Insights / Lessons

1. **Aggregate coverage hides per-path holes.** The global gate was ≥80%, but the _only consumer path_ of the crashing code (the Italian branch) had zero coverage. A high aggregate number masked a total blind spot on the one branch that ran in prod. Coverage % is necessary, not sufficient.
2. **The failure class is "API exists in my dev runtime but not my prod runtime."** `Intl` behaves _three_ ways: full on Node/Jest, backed by OS ICU on Android Hermes, and a limited subset on iOS Hermes. No amount of Node-side testing closes this class — only exercising the real prod runtime does. (Validates the standing memory: _verify Hermes support before using Node/stdlib APIs_.)
3. **FormatJS polyfill footguns** (for the D story): import the chain in dependency order (`getcanonicallocales → locale → pluralrules → relativetimeformat`) at the very top of app entry, and use `/polyfill-force` — Hermes advertises a partial `Intl`, so a polite feature-detecting polyfill skips itself and leaves the broken subset in place. Import only `en` + `it` locale data.

---

## 5. Previous-Retro (Sprint 16 / Epic 16) Follow-Through

| #           | Action (owner)                                                  | Verdict                                                                                                                                             |
| ----------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1           | Consolidated RC device-validation pass (ifero)                  | ✅ **Done** — completed by ifero; watch usage/favourite + all stacked device gates cleared. Unblocks Sprint 18.                                     |
| 2           | Close Sentry prod-firing verification (ifero + Amelia)          | ✅ **Done** — 16-15 diagnosed a real, symbolicated production crash from Sentry; release-build error reporting confirmed working.                   |
| 3           | Reconcile `current_sprint` inside every correct-course (Amelia) | ⏳ **In-progress** — story-level reconciliation held, but the `action_items` block itself went stale this sprint. Reconciled at this retro's close. |
| 4           | Commit-on-green / record base commit (Amelia + ifero)           | ✅ **Done** — `baseline_commit` frontmatter is now a standing convention; prompt per-story PRs.                                                     |
| 5           | Prioritize 16-13 early in Sprint 17 (Amelia)                    | ✅ **Done** — shipped in wave 1; `shared/**` now in the coverage gate.                                                                              |
| 6           | Re-baseline stale stories at dev-start (Amelia)                 | ✅ **Done** — 16-13/6-19/16-12 each caught and corrected stale draft text against current main.                                                     |
| (Epic 9 #5) | Epic 5 complication — parked into Epic 10 (ifero)               | ✅ **Still parked** — resumes with Wear OS work.                                                                                                    |

---

## 6. Decisions

- **Invest in the FormatJS `Intl` polyfill** (ifero) — the app is EN/IT and growing; hardcoding per-locale strings won't scale. Adopt as the standard for `Intl` usage.
- **Leave 16-15's hardcoded Italian version as-is** (tested, byte-verified, zero-dependency); migrate `relative-time.ts` to the polyfill _opportunistically_ inside the D story rather than rushing a revert.
- **No standalone interim lint rule** (ifero) — fold the guardrail into D's definition-of-done as a rule that enforces the polyfill entry import (not a bare ban).

---

## 7. Action Items

| #   | Action                                                                                                                                                                                                                                                                                                                                                                                                            | Owner                            | Category  | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | --------- | ------ |
| D   | Draft & scope a story for **FormatJS `Intl` polyfill adoption**: `@formatjs/intl-getcanonicallocales → intl-locale → intl-pluralrules → intl-relativetimeformat`, imported with `/polyfill-force` + `en`/`it` locale data at app entry (before any `Intl` use); fold in an enforcing lint rule; opportunistically migrate `core/utils/relative-time.ts`. Prevents recurrence of the 16-15 iOS-Hermes crash class. | Amelia (draft) + Winston (scope) | tech-debt | open   |

**Resolved during / heading into this retro (no longer tracked):** dedicated test account created (ifero); RC + watch/device validation completed (ifero); prod Supabase OTP reset template verified working (ifero).

---

## 8. Readiness Assessment

- **Testing & Quality:** ✅ Suite green (1747), gate held; iOS-runtime class now validated on device.
- **Deployment:** ✅ All stories on main; 6-19 genuinely live (prod OTP reset verified).
- **Stakeholder acceptance:** ✅ ifero (Project Lead / stakeholder) accepted.
- **Technical health:** ✅ Net-positive — root-cause fixes, dead code revived, coverage widened to `shared/**`. Device-validation debt cleared.
- **Blockers carried forward:** None. Sprint 18 (Wear OS) is unblocked.

---

## 9. Next Sprint — Sprint 18: Wear OS App (Epic 10) — UNBLOCKED

The RC watch/device validation that gated Sprint 18 is complete. Remaining before dev: **create-story refinement** of the six 10-x stories (currently `backlog`) → `ready-for-dev`, then **sprint-planning** to commit. The FormatJS polyfill (action D) is a fast-follow — it is **not** a Wear OS dependency (Android Hermes has ICU) and can slot into Sprint 18 or the Epic 16 bucket independently. Alternative still available if priorities shift: Epic 14 (Household Collaboration), which needs UX design (14-5a) first.

---

## 10. Closing

A healthy, high-leverage sprint: six real defects cleared, heavy reuse of prior investment, root-cause fixes throughout, and — once the record caught up with reality — no carried blockers. The standout lesson is durable: **green tests on Node do not prove a Hermes build works**; exercise the real prod runtime, and prefer polyfilling `Intl` over assuming it exists. The standout _process_ lesson: keep the tracker honest at close, in both directions.
