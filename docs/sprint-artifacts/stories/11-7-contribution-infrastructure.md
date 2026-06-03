# Story 11-7: Open-Source Contribution Infrastructure & Story-Status Automation

**Epic:** 11 — CI/CD & Quality Gates
**Status:** review
**Sprint:** 14
**Priority:** Low — developer-experience / open-source readiness follow-up
**Type:** Follow-up (added after Epic 11 closed; `epic-11` remains `done`, same pattern as Story 1-6 under Epic 1)

## Story

As a project maintainer and prospective open-source contributor,
I want accurate project documentation, a license, standardized GitHub PR/issue templates, and automated story-status bookkeeping,
so that contributions consistently follow the BMAD spec-first process and sprint tracking stays accurate without manual effort.

## Context

The repository was missing the basics that make an open-source project contribution-ready, and the existing README had drifted from reality:

- `README.md` referenced the old `.bmad-core/` path, contained a mixed-language watch-sync section, and listed libraries (Zustand, TanStack Query) that are not actually used.
- No `CONTRIBUTING` guide, no `LICENSE`, and no GitHub PR/issue templates — leaving contributors without a clear, enforceable process.
- Closing a story still required manually editing two files (`sprint-status.yaml` and the story file), which is easy to forget.

This work directly satisfies **NFR-M3** (_"project structure must be organized for easy navigation by contributors"_) and **NFR-M5** (_"contribution guidelines must be clearly documented"_), and extends the Epic 11 process/automation theme.

**Reference:** `README.md`, `CONTRIBUTING.md`, `LICENSE`, `.github/`, `scripts/mark-story-done.mjs`.

## Acceptance Criteria

### AC1: Project README (English)

- [x] Full English project description: value proposition, key features, platforms & status, accurate tech stack, layered architecture, Apple Watch sync, setup, scripts, testing/quality gates, BMAD SDD overview, and a documentation index.
- [x] Stale content corrected (`_bmad/` path, English watch-sync section, actual libraries only).

### AC2: Contribution guide (BMAD SDD enforced)

- [x] `CONTRIBUTING.md` documents the spec-first rule (no code without a `ready-for-dev` story), the four BMAD phases, the story lifecycle, branch & Conventional Commit conventions, the quality gates (with `--no-verify` forbidden), code-review/PR rules, and the brand-catalogue path.

### AC3: License

- [x] `LICENSE` file (MIT) added at the repo root and linked from the README.

### AC4: GitHub community templates

- [x] PR template (`.github/PULL_REQUEST_TEMPLATE.md`) aligned with the CONTRIBUTING checklist (linked story, AC checklist, screenshots, gates).
- [x] Issue forms for bug report, feature request, and brand-catalogue request, plus `config.yml`.
- [x] Supporting labels `needs-triage` and `catalogue` created in the repo.

### AC5: Story-status automation

- [x] On PR **merge**, the story referenced by the PR is set to `done` in **both** `sprint-status.yaml` and the story file, committed to the default branch with `[skip ci]`.
- [x] Backed by `scripts/mark-story-done.mjs` (resolves the story from the PR body path or a `(Story X.Y)` title; idempotent; supports `DRY_RUN=1`) and `.github/workflows/mark-story-done.yml`.

### AC6: CI enforces the contribution rules

- [x] A CI check fails any PR that violates the machine-checkable CONTRIBUTING rules: a non-Conventional-Commit title, an off-convention branch name, or a code change with no story reference (`docs:`/`chore:` titles and catalogue PRs are exempt).
- [x] Implemented as `scripts/check-pr-conventions.mjs` (sharing the story resolver in `scripts/lib/story-refs.mjs`) and run by `.github/workflows/pr-conventions.yml`.

## Tasks / Subtasks

- [x] **T1 (AC1):** Rewrite `README.md`.
- [x] **T2 (AC2):** Write `CONTRIBUTING.md`.
- [x] **T3 (AC3):** Add `LICENSE` (MIT) and link it from the README.
- [x] **T4 (AC4):** Add the PR template, three issue forms, and `config.yml`; create the labels.
- [x] **T5 (AC5):** Add `scripts/mark-story-done.mjs` + `.github/workflows/mark-story-done.yml`; verify with a dry-run and a real run + revert.
- [x] **T6 (AC6):** Extract the shared story resolver (`scripts/lib/story-refs.mjs`), add `scripts/check-pr-conventions.mjs` and `.github/workflows/pr-conventions.yml`; verify pass/fail scenarios locally.

## Tech Notes

- The automation triggers on `pull_request: [closed]` guarded by `merged == true`, and pushes to `github.event.pull_request.base.ref`. It prefers a `STORY_BOT_TOKEN` secret (for branches protected against direct pushes) and falls back to `GITHUB_TOKEN`.
- The commit is tagged `[skip ci]` so the docs-only change does not re-run pipelines.
- A temporary `sync-labels.yml` workflow was used to bootstrap the labels and then removed once the labels existed.
- **Self-reference caveat:** because the automation is introduced in this same change, the workflow on the default branch cannot auto-complete Story 11-7 on its own merge. This story is therefore moved to `done` manually (or by running `node scripts/mark-story-done.mjs 11-7`); subsequent stories are handled automatically.

## Definition of Done

- [x] All acceptance criteria met.
- [x] `yarn lint`, `yarn typecheck`, and `yarn test` pass; all docs/templates pass Prettier.
- [x] Updater script verified on a real story (non-destructive; reverted after testing).
- [ ] PR reviewed and merged by the maintainer; story marked `done`.
