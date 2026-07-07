# Story 16.3: Establish a design-in-code contribution workflow (docs + GitHub scaffolding)

Status: review

Epic: 16 — Platform & Tech Debt

## Story

<!-- Status: ready-for-dev (refined 2026-06-11) -->

As a maintainer of an open-source project,
I want a documented, PR-based path for anyone to propose UX/UI changes against the git repo,
so that design contributors aren't gated behind Figma seats and every design change is versioned and reviewed like code.

## Background / Context

myLoyaltyCards is MIT-licensed and public, but the UX/UI source of truth is a **Figma file** (`4PSsX8SyTUU0GCUdBAAEED`) — a seat-gated space not every contributor can edit. The coupling even leaks into code: Figma node IDs are hardcoded in component comments (`features/cards/components/CardList.tsx:39`, `features/cards/components/EmptyState.tsx:21`).

The decision (party mode, 2026-06-08) is to move to **design-in-code**: the repo becomes the versioned source of truth for design, contributable via PRs. This story covers the **process + documentation + GitHub scaffolding** layer — the part that lets contributors actually find and follow the path. It is **engine-agnostic** (independent of NativeWind vs Unistyles).

It must reconcile with the project's **spec-first** rule (`CONTRIBUTING.md`: no production code without a `ready-for-dev` story). The reconciliation is the crux: not every design tweak should require a full story, but new scope still must.

Sibling stories: 16-4 (token source), 16-5 (Storybook/Chromatic preview — blocked by 16-1), 16-6 (Penpot follow-up).

## Acceptance Criteria (draft — refine before dev)

1. A new guide `docs/design/CONTRIBUTING-DESIGN.md` exists and documents:
   - The **three design layers** and where each lives: tokens → `shared/theme/*.ts`; components → `shared/components/`, `features/**/components/`; flows/screens → `docs/ux-designs/*.md`, `docs/ux-design-specification.md`.
   - How to propose a change to each layer via PR.
   - How reviewers use the Storybook/Chromatic preview (links to 16-5 once it lands).
   - A **decision table** answering "does this design change need a `ready-for-dev` story?" — token/visual polish with no behavior change → no (use the `design`-label fast-path); new screen/component/behavior → yes (normal spec-first flow).
   - It **defers** to `CONTRIBUTING.md` for the golden rules rather than duplicating them.
2. `CONTRIBUTING.md` gains a "🎨 Design / UI change" row in the _Ways to Contribute_ table and a short pointer subsection linking to the new guide (no rule duplication).
3. A design issue template exists at `.github/ISSUE_TEMPLATE/design_request.yml`, mirroring `feature_request.yml` (YAML form, spec-first preamble, a `layer` dropdown: token / component / flow / not-sure, labels `design` + `needs-triage`).
4. A `design` PR label is defined, and `scripts/check-pr-conventions.mjs` is extended so `design`-labelled PRs are story-exempt — a one-line addition (`|| LABELS.includes('design')`) to the existing `storyExempt` expression (currently `scripts/check-pr-conventions.mjs:58-59`), reusing the label seam already wired via `PR_LABELS`. The script header comment documents the new exemption. **No new Conventional-Commit type is introduced** (`design:` would fail the title regex; allowed types stay feat|fix|refactor|docs|test|chore).
5. `.github/PULL_REQUEST_TEMPLATE.md` is updated so design PRs may link a Storybook/Chromatic preview in lieu of manual before/after screenshots — **with the explicit carve-out that the native (Swift) Apple Watch UI and any screen not covered by Storybook still require screenshots**. A `design`-label hint is added to the _Type of change_ list.
6. The **Figma coupling is gracefully demoted**: the two hardcoded node-ID comments (`CardList.tsx:39`, `EmptyState.tsx:21`) are re-anchored to repo references (token names / Storybook story IDs once available), preserving the old node ID as a one-line historical breadcrumb. A single canonical "Figma is now ideation-only, the repo is canonical" note lives in the design guide. The ~11 soft "Figma: …" prose comments (no node ID) are left untouched this round.
7. `docs/design/` is established as the home for versionable diagram sources — Excalidraw (`.excalidraw` JSON + exported `.svg`) for wireframes and Mermaid-in-markdown for flows — with a `docs/design/README.md` index. Existing `docs/ux-designs/` and `docs/ux-design-specification.md` are unchanged.

## Tasks / Subtasks (draft)

- [x] Draft `docs/design/CONTRIBUTING-DESIGN.md` (layers, per-layer PR path, story-vs-no-story decision table, reviewer guide).
- [x] Add the _Ways to Contribute_ row + ToC pointer in `CONTRIBUTING.md`.
- [x] Create `.github/ISSUE_TEMPLATE/design_request.yml` (mirror `feature_request.yml`).
- [x] Add `|| LABELS.includes('design')` to `storyExempt` in `scripts/check-pr-conventions.mjs` + header comment; create the `design` GitHub label (`gh label create design`).
- [x] Update `.github/PULL_REQUEST_TEMPLATE.md` (Storybook/Chromatic link option + watch-UI screenshot carve-out + `design` type hint).
- [x] Re-anchor the 2 hardcoded Figma node-ID comments; add the canonical deprecation note to the guide.
- [x] Create `docs/design/` (`wireframes/`, `flows/`, `README.md` index).

## Tech Notes

- Keep it **lean** — this is process scaffolding, not a framework. Reuse the existing label-exemption mechanism rather than inventing new CI.
- The `design`-label story exemption is the one genuinely new policy; keep it narrow (token/visual polish only).
- Engine-agnostic: unaffected by 16-1 (NativeWind → Unistyles).
- Reviewer-preview wording should link to 16-5 deliverables and degrade gracefully until 16-5 lands.

## Definition of Ready (resolved 2026-06-11)

- [x] `design` GitHub label — created during dev via `gh label create design` (AC4).
- [x] `docs/design/` location + structure confirmed — `docs/design/` with `wireframes/`, `flows/`, and a `README.md` index (AC7); existing `docs/ux-designs/` + `docs/ux-design-specification.md` unchanged.
- [x] **Story-vs-no-story policy — CONFIRMED (ifero, 2026-06-11):** token / visual polish with NO behavior change → no story (use the `design`-label fast-path); new screen / component / behavior → story required (normal spec-first flow). Narrow exemption, per AC1's decision table.

> Refinement note: two PR-template files exist (`.github/PULL_REQUEST_TEMPLATE.md` + `.github/pull_request_template.md`) — dev should reconcile/confirm the canonical one before applying AC5.

## Dev Agent Record

### Context

- Agent: Amelia (Dev) · Workflow: dev-story · Branch: `feature/16-3-design-contribution-workflow`
- Engine-agnostic process-scaffolding story (docs + GitHub config + one one-line CI-script change). No app behavior changed.

### Implementation Plan / Decisions

- **PR-template reconciliation (refinement note):** the macOS filesystem is case-insensitive, so the worried-about "two files" (`PULL_REQUEST_TEMPLATE.md` vs `pull_request_template.md`) are the **same single file**. `ls .github/` shows exactly one: `PULL_REQUEST_TEMPLATE.md`. AC5 applied there; no second file exists to reconcile.
- **AC4 testing approach (flagged):** the repo has **no test harness for `scripts/*.mjs`** — zero `scripts/**/*.test.*`, and `check-pr-conventions.mjs` self-executes + `process.exit`s at import, so it is not unit-testable as written. Per the story's "keep it lean" Tech Note and the existing untested `catalogue` label seam this mirrors, AC4 was verified **functionally via CLI** (env-var invocation, asserting exit codes) rather than introducing a new mjs-Jest harness. Three cases verified: (1) `design`-labelled feat PR w/ no story → exit 0 (exempt); (2) same w/o label → exit 1 (spec-first enforced); (3) `design:` as commit type → exit 1 (title regex rejects — confirms no new Conventional-Commit type introduced).
- **AC4 label:** `design` GitHub label created on the live repo (`gh label create design --color 5319E7`), as the Definition of Ready specifies (created during dev). This is the only outward-facing side effect of this story; it is reversible (`gh label delete design`).
- **AC6 re-anchor:** the two node-ID comments (`CardList.tsx`, `EmptyState.tsx`) now anchor to the repo as canonical, preserving the old Figma node `52:64` as a one-line historical breadcrumb. The single canonical "Figma is ideation-only, repo is canonical" statement lives in `docs/design/CONTRIBUTING-DESIGN.md`. The ~11 soft `Figma: …` prose comments (no node ID) were left untouched per AC6.
- **`docs/design/` subfolders:** `wireframes/` and `flows/` each carry a short `README.md` (git does not track empty dirs, and they double as per-folder format guidance).

### Completion Notes

- All 7 ACs satisfied. Gates: `yarn typecheck` ✓, `yarn lint` ✓, `yarn test` ✓ (154 suites / 1564 tests passing — comment-only `.tsx` edits, no regressions). New issue-template YAML validated (labels `design` + `needs-triage`, 4 layer options). AC4 script behavior verified via the three CLI cases above.

### File List

**Added**

- `docs/design/CONTRIBUTING-DESIGN.md` (AC1, AC6 canonical note)
- `docs/design/README.md` (AC7 index)
- `docs/design/wireframes/README.md` (AC7)
- `docs/design/flows/README.md` (AC7)
- `.github/ISSUE_TEMPLATE/design_request.yml` (AC3)

**Modified**

- `CONTRIBUTING.md` — Ways-to-Contribute row + ToC entry + Design/UI pointer subsection (AC2)
- `scripts/check-pr-conventions.mjs` — `design`-label story exemption + header-comment doc (AC4)
- `.github/workflows/pr-conventions.yml` — summary comment updated to include the `design` exemption (AC4 consistency); `labeled`/`unlabeled` added to the trigger list + a `state == 'open'` job guard so a late-applied `design`/`catalogue` label re-runs the check on open PRs only (2026-07-07)
- `.github/PULL_REQUEST_TEMPLATE.md` — Storybook/Chromatic option + watch-UI screenshot carve-out + `design` type hint + fast-path checklist caveats (AC5)
- `features/cards/components/CardList.tsx` — re-anchored Figma node-ID comment (AC6)
- `features/cards/components/EmptyState.tsx` — re-anchored Figma node-ID comment (AC6)

**External (non-file)**

- GitHub `design` label created via `gh label create` (AC4 / Definition of Ready)

### Code Review (AI, Sonnet) — Round 1

Independent Sonnet code-review subagent raised 7 findings; resolved as follows:

- ✅ [MAJOR] Stale spec-first violation message didn't mention the `design` exemption → updated (`scripts/check-pr-conventions.mjs`).
- ✅ [MAJOR] CONTRIBUTING.md Quality-Gates paragraph didn't list the `design` exemption → updated.
- ✅ [MAJOR] Story `.md` + `sprint-status.yaml` not yet at `review` → both moved to `review`.
- ⛔ [MINOR] "one-line addition" not literal (4-line `storyExempt`) → **kept as-is, justified**: `prettier --check` passes on the 4-line form; reverting to a one-liner exceeds the repo's print width and would fail the prettier gate (prettier wraps the `||` chain once a 4th condition is added). Semantics identical — one condition added.
- ✅ [MINOR] PR-template `design` not backtick-wrapped → fixed.
- ✅ [MINOR] Live "Storybook/Chromatic" body line cluttered non-design PRs → folded into the HTML comment guidance.
- ✅ [NIT] "catalogue PRs" phrasing → aligned to "catalogue-/design-labelled PRs".

### Code Review (AI, Sonnet) — Round 2

Fresh Sonnet subagent raised 2 MINOR findings (both in `.github/PULL_REQUEST_TEMPLATE.md`); resolved:

- ✅ [MINOR] "Related story / issue" comment didn't cover the new design fast-path → added a `design`-label note.
- ✅ [MINOR] Author-checklist "story exists" item was untickable for story-exempt PRs → marked skip-for-`design`/`catalogue`.

### Code Review (AI, Sonnet) — Round 3

- ✅ [MINOR] Directional error in the round-2 fix: comment said the `design` checkbox is "above" when it is below → corrected to "under 'Type of change' below".

Round 4: **APPROVED — zero comments.**

### QA Review (AI, Sonnet) — Round 1

Independent Sonnet QA pass; AC-by-AC verified (incl. live AC4 exit-code checks: design-labelled→0, no-label→1, `design:` title→1) and `design` label confirmed live. 1 MINOR finding, resolved:

- ✅ [MINOR] PR template linked the design guide via `../docs/...`; PR-body markdown resolves relative links from the repo root, so `../` would break. Removed the `../` (now root-relative, matching CONTRIBUTING.md).

QA Round 2: **APPROVED — zero comments.**

### Re-verification (AI, Sonnet) — 2026-07-07

The Round-1/2 reviews above were recorded 2026-06-19, but the work was left **uncommitted on `main`**, which then advanced 4 commits (brand assets). Re-verified on a fresh branch (`feature/16-3-design-contribution-workflow` recreated from current `main` — lossless; the stale branch had no unique commits). Gates re-run green on the new base: `yarn typecheck` ✓, `yarn lint` ✓, `yarn test` ✓ (154 suites / 1564 tests — unchanged), `prettier --check` ✓, and the AC4 CLI exit-code cases ✓ (design-labelled→0, no-label→1, `design:` title→1; `catalogue` label/scope regression checks→0).

**Fresh code review (Sonnet) — 4 rounds → APPROVED zero comments.** Fixed:

- ✅ [MINOR] `.github/workflows/pr-conventions.yml` summary comment omitted the `design` exemption (the `.mjs` header + `CONTRIBUTING.md` were updated but this third sibling was missed) → aligned.
- ✅ [MINOR] Guide claimed 16-5 was "blocked by the 16-1 styling-engine migration" — 16-1 is `done`; reworded to the real remaining prerequisite (Chromatic project/token).
- ✅ [MAJOR] `CardList.tsx`/`EmptyState.tsx` comments promised a "CardList/EmptyState Storybook story (16-5)" — 16-5 scopes only `shared/components/ui/` primitives, not these feature-level components → dropped the over-claim (repo/this-file stays the canonical anchor per AC6).
- ✅ [NIT] Guide "Related" omitted sibling 16-6 → added (Penpot, backlog).

**Fresh QA review (Sonnet) — 3 rounds → APPROVED zero comments.** Fixed:

- ✅ [MINOR ×2] Decision table didn't distinguish a stale-diagram correction (→ `docs:`, no story) from a new-flow proposal; rule-of-thumb missed visually-identical-but-behavioral changes (e.g. `hitSlop`/gesture) → both clarified.
- ✅ [MINOR/NIT] Fast-path lacked a label-timing note; guide linked the raw `.yml` instead of the issue form → added the note; link now `issues/new?template=design_request.yml`.
- ✅ [MAJOR] Fast-path told contributors to self-apply the `design` label, but external/first-time contributors lack label permissions (unlike `catalogue`, `design` has no `scope ===` fallback) → documented the "ask a reviewer to apply it" path.
- ✅ [MAJOR] Reviewer-preview section implied 16-5's Storybook would cover "changed components" generally → scoped it to the `shared/components/ui/` primitives; feature/non-`ui/` components, screens, and watch UI stay screenshot-based even after 16-5.
- ✅ [MINOR] PR-template checklist item (`sprint-status.yaml`/story updated) lacked the `design`/`catalogue` caveat its neighbour had → added.
- ✅ [NIT] This Dev Agent Record's AC6 note over-described the comments (claimed a 16-5 Storybook anchor) → corrected to match the shipped text.

**CI-trigger fix (folded in 2026-07-07, per ifero):** `.github/workflows/pr-conventions.yml` `on.pull_request.types` previously omitted `labeled`/`unlabeled`, so a `design`/`catalogue` label applied _after_ a PR opened wouldn't auto-re-run the check (pre-existing, shared with the `catalogue` seam). Added `labeled`/`unlabeled` to the trigger list, plus a `github.event.pull_request.state == 'open'` job guard (those events also fire post-merge — don't re-run on resolved PRs). `PR_LABELS` already sources from `github.event.pull_request.labels`, which is current on label events. Reviewed to zero comments (Sonnet, 2 focused rounds). The in-doc fast-path workaround remains as belt-and-braces.

## Change Log

- 2026-06-19 — Implemented Story 16.3 (design-in-code contribution workflow): design guide + `docs/design/` home, CONTRIBUTING pointer, design issue template, PR-conventions `design`-label exemption + label, PR-template preview carve-out, Figma node-ID comment demotion. (Amelia / dev-story)
- 2026-06-19 — Addressed AI code-review findings — 6 resolved, 1 rejected-with-justification (prettier). (Amelia / dev-story)
- 2026-07-07 — Re-verified on a fresh branch off current `main` (work had been left uncommitted while `main` advanced 4 commits). Re-ran gates (green) + fresh Sonnet code-review (4 rounds) and QA (3 rounds) loops to zero comments; fixed 8 findings incl. 2 MAJOR (external-contributor label-permission gap; 16-5 Storybook-scope accuracy). Added `.github/workflows/pr-conventions.yml` to the change set (design-exemption comment). Then folded in the CI-trigger fix per ifero — `labeled`/`unlabeled` triggers + `state == 'open'` guard, reviewed to zero. (Claude / dev-story re-verification)
