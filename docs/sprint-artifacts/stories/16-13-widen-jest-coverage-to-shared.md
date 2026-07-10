# Story 16.13: Widen Jest coverage collection to `shared/`

Status: drafted

## Story

As a developer relying on the coverage gate to catch untested code,
I want `shared/**` included in Jest's coverage collection,
so that safety-critical logic in `shared/` (Supabase auth/session, sync hooks) is held to the same 80% threshold as `core/` and `features/`.

## Context

Follow-up from **Story 16.10** QA review. `jest.config.js` `collectCoverageFrom` currently spans only `core/**` + `features/**`. The 16.10 hotfix's safety-critical logic (`shared/supabase/useBootAuthGate.ts`, `shared/supabase/client.ts`) sits **outside** the enforced 80% global threshold — it is well tested, but "coverage maintained" is only _measured_ for the collected subset.

`shared/` holds Supabase auth/session, hooks (`useCloudSync`, `useAutoSync`, `useNetworkStatus`), theme, and i18n — plenty worth gating. Pre-existing repo policy gap, **not** introduced by 16.10.

### Why this is a story, not a one-line config change

Adding `shared/**` pulls previously-unmeasured files into the **global** threshold calculation. Some may fall below 80%, which would **fail the coverage gate**. The real work is the triage: backfill tests where the logic warrants it, or add narrowly-justified excludes (generated files, storybook stories, pure type modules). That investigation — not the one-line glob edit — is the deliverable.

## Acceptance Criteria

1. `collectCoverageFrom` in `jest.config.js` includes `shared/**/*.{ts,tsx}` (retaining the existing `!**/*.d.ts` / `!**/index.ts` excludes plus any newly-justified excludes).
2. `yarn test:coverage` passes the **80% global threshold** with `shared/` included — via backfilled tests and/or documented excludes. The global threshold is **not** lowered.
3. Every exclude added is enumerated with a one-line justification (e.g. generated tokens, storybook `*.stories.tsx`, type-only modules, `*.test.*` helpers).
4. CI `Quality gates` job stays green; no flaky suites introduced.

## Tasks / Subtasks

- [ ] Add `shared/**/*.{ts,tsx}` to `collectCoverageFrom`; run `yarn test:coverage` to capture the baseline `shared/` numbers (AC: 1)
- [ ] Triage below-threshold `shared/` files: backfill tests where logic warrants; exclude generated/type-only/storybook files with justification (AC: 2, 3)
- [ ] Confirm the global threshold passes and CI `Quality gates` is green (AC: 2, 4)
- [ ] Consider (and document the decision on) whether a temporary per-directory ramp is needed, but prefer a single global gate (AC: 2)

## Dev Notes

### References

- `jest.config.js` — `collectCoverageFrom` + `coverageThreshold` (global 80%).
- `shared/` tree (supabase, hooks, theme, i18n, components).
- Story 16.10 QA review — the deferred coverage-scope finding that motivates this story.

### Definition of Ready (not yet met — needs SM/Architect refinement)

- [ ] Baseline `shared/` coverage measured so the size of the backfill is known
- [ ] Agreement on exclude policy (what legitimately shouldn't be gated)
- [ ] Confirmation this stays a single global threshold (no per-file ratchet sprawl)

### Project Structure Notes

Config + test-backfill only; **no product behaviour change**. Chore / tech-debt. Part of Epic 16 — Platform & Tech Debt; follow-up to 16.10.

## Change Log

| Date       | Change                                                                                                       | Author       |
| ---------- | ------------------------------------------------------------------------------------------------------------ | ------------ |
| 2026-07-10 | Drafted as a Story 16.10 QA follow-up (coverage scope excludes `shared/`). Needs refinement → ready-for-dev. | Amelia (Dev) |
