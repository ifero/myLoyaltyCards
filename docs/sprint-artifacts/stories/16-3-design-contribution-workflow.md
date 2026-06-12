# Story 16.3: Establish a design-in-code contribution workflow (docs + GitHub scaffolding)

Status: ready-for-dev

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

- [ ] Draft `docs/design/CONTRIBUTING-DESIGN.md` (layers, per-layer PR path, story-vs-no-story decision table, reviewer guide).
- [ ] Add the _Ways to Contribute_ row + ToC pointer in `CONTRIBUTING.md`.
- [ ] Create `.github/ISSUE_TEMPLATE/design_request.yml` (mirror `feature_request.yml`).
- [ ] Add `|| LABELS.includes('design')` to `storyExempt` in `scripts/check-pr-conventions.mjs` + header comment; create the `design` GitHub label (`gh label create design`).
- [ ] Update `.github/PULL_REQUEST_TEMPLATE.md` (Storybook/Chromatic link option + watch-UI screenshot carve-out + `design` type hint).
- [ ] Re-anchor the 2 hardcoded Figma node-ID comments; add the canonical deprecation note to the guide.
- [ ] Create `docs/design/` (`wireframes/`, `flows/`, `README.md` index).

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
