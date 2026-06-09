# Story 16.6: Stand up an open Penpot design space for visual designers

Status: backlog

Epic: 16 — Platform & Tech Debt

## Story

As a maintainer who wants non-coding visual designers to contribute,
I want an open, no-seat-limit Penpot instance set up as a shared design space,
so that designers can explore and propose UI/UX visually without a Figma seat — while the git repo (tokens + Storybook components) remains the single canonical source of truth.

## Background / Context

myLoyaltyCards is moving to a **design-in-code** model (see 16-3): tokens in `shared/theme/*.ts`, components in Storybook (16-5), flows in `docs/ux-designs/` — all versioned in git and reviewed via PR. The repo is canonical.

The legacy design source of truth was **Figma** (file `4PSsX8SyTUU0GCUdBAAEED`), used through the Epic 12/13 design overhaul. Figma is proprietary and seat-limited — a poor fit for a community-driven OSS project, because it gates exactly the contributors we most want: non-coding visual designers who can't or won't edit `shared/theme/*.ts` directly.

**Penpot** is open-source, web-based, and has no per-seat cost — a natural **open ideation/exploration surface**. This is the follow-up explicitly requested when the design-in-code direction was chosen (party mode, 2026-06-08). It is **demand-triggered, not speculative.**

> **The rule this story must preserve:** Penpot = **exploration / ideation**; the repo = **canonical**. A Penpot mock is never "the design" — it becomes real only when it lands in the repo via the design-contribution PR flow (16-3). Penpot replaces Figma as an _open_ place to explore; the source-of-truth role moves to the repo regardless.

## Trigger condition (do NOT start before this)

Start only when **real visual (non-coding) designers actually want to contribute** — e.g. someone opens a 🎨 Design issue/discussion asking for a visual workspace, or a maintainer is actively onboarding a designer. Until then this stays `backlog`. Standing up and maintaining a Penpot instance with no designers using it is wasted effort.

## Acceptance Criteria (draft — refine before dev)

1. The **cloud vs self-host** decision is made and recorded (a short ADR-style note or a section in `docs/design/CONTRIBUTING-DESIGN.md`). Default recommendation: **Penpot cloud** (zero-ops, no seat cost) to start.
2. An **open, no-seat-limit** Penpot workspace exists, with access open to contributors (open team / invite link, or open registration on a self-hosted instance).
3. The repo-is-canonical relationship is documented in `docs/design/CONTRIBUTING-DESIGN.md`, including a one-line "how to take a Penpot exploration to a repo PR" path.
4. **Lightweight seeding:** the current palette / typography / spacing from `shared/theme/*.ts` are represented in Penpot (a starter library or single reference page) so designers explore against the real system. Manual/one-off is fine — **no automated token sync is in scope.**
5. The Figma deprecation note is updated to point at Penpot as the open exploration surface (coordinate with the 16-3 Figma demotion).
6. **No change to the canonical pipeline:** tokens, Storybook, and `docs/ux-designs/` remain the source of truth; nothing in the app build depends on Penpot.

## Tasks / Subtasks (draft)

- [ ] Decide self-host vs cloud; record the decision (AC1).
- [ ] Create the workspace/team; configure open access (AC2).
- [ ] Seed a starter library/reference page from `shared/theme/*.ts` (AC4).
- [ ] Document "Penpot = ideation, repo = canonical" + the explore→PR path in `docs/design/CONTRIBUTING-DESIGN.md` (AC3).
- [ ] Update the Figma deprecation note to mention Penpot (AC5).
- [ ] (If self-host) document the deploy (Docker Compose), backups, and who operates it.

## Tech Notes

- **Effort:** ~S for Penpot cloud (create team, invite link, seed one page, write docs — ~half a day); ~M for self-host (Docker Compose, domain/TLS, auth, backups, ongoing ops). Start on cloud; self-host only if ownership/scale justify it later.
- **Out of scope (keep lean):** automated Penpot↔repo token sync, Penpot→code generation, wholesale migration of existing Figma frames. Seeding is a manual reference snapshot only.
- Does not touch CI, the app build, or quality gates — it is an external collaboration surface, not a repo dependency.

## Definition of Ready (before moving to ready-for-dev)

- [ ] Trigger condition met: a real visual designer wants to contribute.
- [ ] Self-host vs cloud decided (or deferred to the implementer with a cloud default).
- [ ] Owner identified for the instance/workspace (especially if self-hosting).
- [ ] `docs/design/CONTRIBUTING-DESIGN.md` exists (depends on 16-3 landing first).

## Blocks

- **Soft-depends on:** 16-3 (the design-contribution guide it documents the Penpot relationship in).
