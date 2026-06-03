# Contributing to myLoyaltyCards

Thank you for your interest in contributing! 🎉 myLoyaltyCards is a community-driven, open-source project with no monetization — it grows through code, brand-catalogue additions, bug reports, and ideas from people like you.

This project is built **spec-first** using the [BMAD-METHOD](https://github.com/bmad-code-org/BMAD-METHOD) **Spec-Driven Development (SDD)** methodology. Contributing here is a little different from a typical "fork and PR" project: **work follows a spec, and every code change traces back to a documented story.** This guide explains exactly how to do that.

> **The golden rule:** No production code is written without a spec. Before you write code, there must be a **story** (for changes inside an existing epic) or, for genuinely new scope, a planning artifact (PRD/epic) that the story derives from. This is non-negotiable and is what keeps the codebase coherent, testable, and contribution-friendly.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [The BMAD SDD Methodology](#the-bmad-sdd-methodology)
- [Where the Specs Live](#where-the-specs-live)
- [Local Setup](#local-setup)
- [The Contribution Workflow (step by step)](#the-contribution-workflow-step-by-step)
- [Branching Conventions](#branching-conventions)
- [Commit Conventions](#commit-conventions)
- [Quality Gates (never bypass)](#quality-gates-never-bypass)
- [Coding Standards](#coding-standards)
- [Code Review & Pull Requests](#code-review--pull-requests)
- [Contributing Brand Catalogue Entries](#contributing-brand-catalogue-entries)
- [Reporting Bugs & Requesting Features](#reporting-bugs--requesting-features)
- [Using the BMAD Agents](#using-the-bmad-agents)
- [Quick Reference](#quick-reference)

---

## Code of Conduct

Be respectful, constructive, and inclusive. This is a hobby project maintained in people's spare time — assume good intent, keep discussions focused on the work, and welcome newcomers. Harassment or hostile behavior is not tolerated.

---

## Ways to Contribute

| Contribution                 | Path                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| 🐛 **Bug report**            | Open a GitHub issue (see [Reporting Bugs](#reporting-bugs--requesting-features)).                      |
| 💡 **Feature idea**          | Open a GitHub issue/discussion. New features enter through **planning**, not a direct PR.              |
| 🏷️ **Brand catalogue entry** | The lightest path — see [Contributing Brand Catalogue Entries](#contributing-brand-catalogue-entries). |
| 💻 **Code change**           | Must follow the [SDD workflow](#the-contribution-workflow-step-by-step) below.                         |
| 📝 **Docs / specs**          | Same SDD workflow, using a `docs/` story or a `docs:` change.                                          |

---

## The BMAD SDD Methodology

BMAD is installed under [`_bmad/`](_bmad/) (v6.0.4: modules `core`, `bmm`, `bmb`, `cis`, `tea`). It drives the project through **four phases**, each owned by a specialized agent and producing a tangible artifact:

```
Phase 0 — Discovery        (optional)
  Analyst:    brainstorming · research · product brief

Phase 1 — Planning
  PM:          PRD              → docs/prd.md            (Functional & Non-Functional Requirements)
  UX Designer: UX design        → docs/ux-design-specification.md

Phase 2 — Solutioning
  Architect:   Architecture     → docs/architecture.md
  PM:          Epics & Stories  → docs/epics.md
  Test Arch.:  Test design      → docs/test-design-system.md
  Architect:   Implementation Readiness gate → docs/implementation-readiness-report-*.md

Phase 3 — Implementation        (this is where most contributions happen)
  Scrum Master: Sprint planning  → docs/sprint-artifacts/sprint-status.yaml
  Scrum Master: Create story      → docs/sprint-artifacts/stories/<id>.md
  Dev:          Implement story   (code + tests)
  Dev/QA:       Code review
  Maintainer:   Merge PR
  Team:         Retrospective     → docs/sprint-artifacts/epic-*-retro-*.md
```

**Why this matters for you as a contributor:**

- A **small change inside an existing epic** (bug fix, refinement, an already-planned story) → you work in **Phase 3**: create/claim a story, implement it, and PR.
- A **brand-new capability** (new screen, new platform behavior, new requirement) → it must first be reflected in **Planning/Solutioning** (PRD/epic) before a story can be drafted. Open an issue to discuss scope; a maintainer (or you, with the PM/Architect agents) updates the relevant spec, then a story is created.

This prevents "drive-by" features that don't fit the architecture and keeps every PR reviewable against clear, pre-agreed acceptance criteria.

---

## Where the Specs Live

| Artifact                                     | Location                                                                               | Phase |
| -------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| Product Requirements (PRD)                   | [`docs/prd.md`](docs/prd.md)                                                           | 1     |
| UX Design                                    | [`docs/ux-design-specification.md`](docs/ux-design-specification.md)                   | 1     |
| Architecture                                 | [`docs/architecture.md`](docs/architecture.md)                                         | 2     |
| Epics & stories breakdown                    | [`docs/epics.md`](docs/epics.md)                                                       | 2     |
| Test design                                  | [`docs/test-design-system.md`](docs/test-design-system.md)                             | 2     |
| Enforced implementation rules                | [`docs/project_context.md`](docs/project_context.md)                                   | —     |
| Sprint status (source of truth for progress) | [`docs/sprint-artifacts/sprint-status.yaml`](docs/sprint-artifacts/sprint-status.yaml) | 3     |
| Individual story specs                       | [`docs/sprint-artifacts/stories/`](docs/sprint-artifacts/stories/)                     | 3     |
| Agent operating rules                        | [`AGENTS.md`](AGENTS.md)                                                               | —     |

Read [`docs/project_context.md`](docs/project_context.md) and [`AGENTS.md`](AGENTS.md) **before writing any code** — they contain the rules CI and reviewers enforce.

---

## Local Setup

See the [README — Getting Started](README.md#getting-started) for prerequisites (Node 24, Yarn, Ruby 4.0.5, Xcode/Android Studio) and install/run commands. In short:

```bash
git clone https://github.com/ifero/myLoyaltyCards.git
cd myLoyaltyCards
yarn install
cp .env.example .env   # fill in values
yarn ios               # or: yarn android / yarn start
```

---

## The Contribution Workflow (step by step)

Follow these steps for any **code or docs** contribution. Steps 1–2 are the SDD part; steps 3–9 are the implementation loop.

### 1. Find or define the work

- **Browse existing stories** in [`docs/sprint-artifacts/stories/`](docs/sprint-artifacts/stories/) and the current sprint in [`sprint-status.yaml`](docs/sprint-artifacts/sprint-status.yaml). If a story already exists for what you want to do, comment on the related issue/PR to claim it.
- **New scope?** Open a GitHub issue describing the problem and proposed change. A maintainer will confirm whether it fits the current epics or needs a planning update (PRD/epic) first. **Do not start coding new scope before this is agreed.**

### 2. Make sure a story exists (spec-first gate)

Every implementation needs a story file in `docs/sprint-artifacts/stories/<epic>-<n>-<slug>.md` containing, at minimum:

- **Status** (`drafted` → `ready-for-dev` before dev starts)
- **Story** (the user-facing goal)
- **Context** (links to PRD/epic/architecture sections)
- **Acceptance Criteria** (testable ACs — `AC1`, `AC2`, …)
- **Tasks / Subtasks** (mapped to ACs)
- **Tech Notes** and a **Definition of Ready** checklist

Create it with the Scrum Master agent (`create-story`) or by copying the structure of a recent story. A story must be **`ready-for-dev`** (acceptance criteria approved) before implementation begins.

### 3. Create a branch

Branch from `main` using the [naming convention](#branching-conventions):

```bash
git checkout main && git pull
git checkout -b feature/5-9-watch-complication
```

### 4. Implement the story

- Implement **only what the story's acceptance criteria require** — keep scope tight.
- Follow [`docs/project_context.md`](docs/project_context.md) and [`AGENTS.md`](AGENTS.md): layer boundaries, Zod-as-source-of-truth, client-side UUIDs, ISO-8601 UTC dates, transactional DB writes, the `logger` wrapper, etc.
- **Add/extend tests** co-located with the source (`Foo.tsx` → `Foo.test.tsx`). New behavior needs new tests.
- For libraries, consult the official docs (Context7 / Expo docs) and install with `npx expo install <pkg>` — **not** `yarn add` — for Expo-managed packages.

### 5. Keep commits atomic and conventional

Commit small, logical units using [Conventional Commits](#commit-conventions). Reference the story where relevant.

### 6. Pass the quality gates locally

The pre-push hook runs them automatically, but you can run them yourself:

```bash
yarn lint
yarn typecheck
yarn test           # or: yarn test:all  (includes watchOS tests)
```

**Never use `--no-verify`.** If a gate fails, fix it.

### 7. Update sprint status

Update [`sprint-status.yaml`](docs/sprint-artifacts/sprint-status.yaml) to move the story to `review`, and reflect progress in the story file.

### 8. Request a code review

Push your branch and request review. The project favors a **fresh-context review** (a different reviewer/agent than the author) against the [review checklist](#code-review--pull-requests). Address feedback with focused follow-up commits and re-request review until approved.

### 9. Open the Pull Request

Open a PR following the [PR requirements](#code-review--pull-requests). **Do not merge your own PR** — a maintainer reviews and merges. After merge, the story is marked `done`; once an epic completes, a retrospective is run.

---

## Branching Conventions

Branch from `main` with a descriptive, prefixed name. Where a story exists, include its id:

```
feature/<story-id>-<short-description>     # new feature / planned story
fix/<short-description>                     # bug fix
refactor/<short-description>                # behavior-preserving refactor
docs/<short-description>                     # documentation / specs

# examples
feature/5-9-watch-complication
fix/barcode-scanner-crash
docs/contributing-guide
```

| Prefix      | Use for                             |
| ----------- | ----------------------------------- |
| `feature/`  | New features or planned stories     |
| `fix/`      | Bug fixes                           |
| `refactor/` | Refactors with no functional change |
| `docs/`     | Documentation & spec updates        |

---

## Commit Conventions

Use **[Conventional Commits](https://www.conventionalcommits.org/)**. Each commit should be small, focused, and self-contained.

```
<type>(<scope>): <short summary>

- what changed and why
- acceptance criteria addressed (e.g. AC2)
```

**Allowed types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`.

Example:

```
feat(watch): render barcode complication on the watch face (Story 5.9)

- add ComplicationProvider entry for the active card
- map card color to complication tint
- covers AC1, AC2
```

---

## Quality Gates (never bypass)

Quality is enforced at three levels. **All must pass — bypassing them is forbidden.**

| Gate           | When                      | What runs                                                 |
| -------------- | ------------------------- | --------------------------------------------------------- |
| **pre-commit** | `git commit`              | `lint-staged` → ESLint `--fix` + Prettier on staged files |
| **pre-push**   | `git push`                | `yarn typecheck` → `yarn lint` → `yarn test`              |
| **CI**         | every PR & push to `main` | `lint` → `typecheck` → `test:coverage` (+ watchOS tests)  |

🚫 **`--no-verify` is strictly forbidden** for both `git commit` and `git push`. If a hook fails:

1. Read the error.
2. Fix the underlying issue (lint, type error, failing test).
3. Re-run the command.

Do not bypass gates "just this once" — CI will fail anyway, and it keeps shared branches green for everyone.

---

## Coding Standards

The authoritative rules are in [`docs/project_context.md`](docs/project_context.md) and [`AGENTS.md`](AGENTS.md). Highlights:

- **TypeScript, strict mode** for all new code. No `any` escapes without justification.
- **`const` arrow functions** everywhere (including exported/async) — no `function` declarations.
- **Layer boundaries** (ESLint-enforced): `app → features → shared → core` (+ `catalogue`). No cross-feature imports, no `core → features` imports.
- **Route files re-export only** — no `useState`/`useEffect`/business logic in `app/`.
- **Zod schemas are the source of truth** for data types.
- **Client-side UUIDs**, **ISO-8601 UTC** date strings, **all JSON fields present** (`null`, never omitted).
- **Transactional DB writes** (`withTransactionAsync`); use the `logger` wrapper, not `console.log`.
- **Tests co-located** with source; cross-platform fixtures live in `test-fixtures/`.
- **Apple Watch is read-only** — never add mutation paths to the watch.
- **UI:** respect safe-area insets for edge controls; avoid `Pressable` `style={({pressed}) => …}` callbacks (use `onPressIn`/`onPressOut` + state) — see `AGENTS.md` for the rationale.

Run `yarn lint` and `yarn typecheck` to catch most violations automatically.

---

## Code Review & Pull Requests

### Before opening a PR

- [ ] A `ready-for-dev` story exists and its acceptance criteria are met.
- [ ] `yarn lint`, `yarn typecheck`, and `yarn test` all pass locally.
- [ ] New behavior has tests; coverage is not regressed.
- [ ] `sprint-status.yaml` and the story file are updated.

### PR description must include

- **Title:** `feat(scope): description (Story X.Y)` (or appropriate type).
- **Summary** of the changes.
- **Acceptance-criteria checklist** with completed items checked.
- **Test results** (counts / coverage where relevant).
- **Link** to the story and to any review approval.

### Reviewer checklist

- [ ] Follows project conventions, patterns, and layer boundaries.
- [ ] Acceptance criteria are fully satisfied.
- [ ] Test coverage is adequate (new tests for new behavior).
- [ ] No performance, security, or privacy/GDPR regressions.
- [ ] TypeScript types are sound; no unjustified `any`.
- [ ] Edge cases handled; comments/docs are clear and necessary.

### Merging

- **Do not merge your own PR.** A maintainer reviews and merges to `main`.
- **Status update is automated.** When a PR is **merged**, the [`mark-story-done`](.github/workflows/mark-story-done.yml) workflow reads the story referenced in the PR and commits its status → `done` (in both `sprint-status.yaml` and the story file) directly to the default branch. The commit is tagged `[skip ci]` so it doesn't re-run any pipelines. This works for fork PRs too. _(Maintainers can also apply it by hand: `node scripts/mark-story-done.mjs <story-id>`.)_
- When an epic completes, run a **retrospective** and capture lessons in `docs/sprint-artifacts/`.

---

## Contributing Brand Catalogue Entries

Expanding the brand catalogue is the easiest and most-welcomed way to contribute — and it's how the app grows across the EU.

1. The catalogue source of truth lives in [`catalogue/`](catalogue/) (e.g. `catalogue/italy.json`).
2. Add or correct a brand entry, matching the existing JSON shape and the schema in `catalogue/types.ts`. Keep all fields present.
3. **Regenerate the watch catalogue** so the watch app stays in sync:
   ```bash
   yarn watch:catalogue:generate
   ```
   CI runs `yarn check:catalogue-generated` to ensure the generated watch catalogue matches the source — commit the regenerated output.
4. Run `yarn lint && yarn test` (catalogue files have tests, e.g. `catalogue/italy.test.ts`).
5. Open a PR titled `feat(catalogue): add <brand> to <country>`. Catalogue-only PRs are lighter-weight and usually don't need a full story, but please reference an issue if one exists.

---

## Reporting Bugs & Requesting Features

**Bugs** — open a GitHub issue with:

- What you expected vs. what happened.
- Steps to reproduce.
- Platform & version (iOS/Android/watchOS, app version, device/OS).
- Logs/screenshots if available. For watch-sync issues, Console.app traces are especially helpful (watch sync must be verified on a **physical device**, not just by code review).

**Features** — open an issue or discussion describing the problem to solve and the proposed value. Remember: features enter through **planning** (PRD/epic), so this is the first step toward a future story — not a direct PR.

---

## Using the BMAD Agents

You don't have to drive the methodology by hand. BMAD ships agents and workflows you can invoke from your AI IDE (Claude Code, Cursor, or GitHub Copilot — all preconfigured under [`_bmad/_config/ides/`](_bmad/_config/)). The workflows most relevant to contributors:

| You want to…                        | Agent / workflow                               |
| ----------------------------------- | ---------------------------------------------- |
| Draft the next story                | Scrum Master — `create-story`                  |
| Implement a `ready-for-dev` story   | Dev — `dev-story`                              |
| Review code against the checklist   | Dev/QA — `code-review`                         |
| Plan a sprint from the epics        | Scrum Master — `sprint-planning`               |
| Add/refine requirements (new scope) | PM — `create-prd` / `create-epics-and-stories` |
| Make a system design decision       | Architect — `create-architecture`              |
| Handle a mid-sprint scope change    | `correct-course`                               |
| Check we're ready to implement      | Architect — `check-implementation-readiness`   |
| Close out an epic                   | `retrospective`                                |

For very small, well-scoped changes, the **Quick Flow** (`quick-spec` → `quick-dev`) provides a lighter spec path — still spec-first, just leaner.

---

## Quick Reference

**Story lifecycle:**

```
backlog → drafted → ready-for-dev → in-progress → review → done
```

**The loop, in one line:**

```
find/create story → branch → implement (+ tests) → atomic conventional commits
→ pass gates → update sprint-status → code review → PR → maintainer merges → done
```

**Three rules you must not break:**

1. **Spec-first** — no code without a `ready-for-dev` story (or an agreed planning update for new scope).
2. **Never bypass quality gates** — `--no-verify` is forbidden; fix the failure instead.
3. **Don't merge your own PR** — a maintainer reviews and merges.

Welcome aboard, and thank you for helping make checkout friction a thing of the past! 🚀
