# Contributing Design (Design-in-Code)

This guide explains how to propose **UX/UI changes** to myLoyaltyCards through the
git repository — the same versioned, peer-reviewed path the code uses. You do **not**
need a Figma seat to contribute design.

> **Defers to [`CONTRIBUTING.md`](../../CONTRIBUTING.md).** This document covers only
> what is _design-specific_. The golden rules — spec-first, never bypass quality gates,
> don't merge your own PR, branching/commit conventions — live in `CONTRIBUTING.md` and
> are **not** repeated here. Read it first.

---

## The repo is canonical; Figma is ideation-only

myLoyaltyCards started with a seat-gated **Figma file** (`4PSsX8SyTUU0GCUdBAAEED`) as the
UX/UI source of truth. That coupling even leaked into the code (hardcoded Figma node IDs
in component comments). As of Epic 16 the project moved to **design-in-code**:

- ✅ **The repository is the canonical, versioned source of truth for design.**
- 🎨 **Figma (and successors like Penpot) is ideation-only** — a sketchpad for exploring
  ideas, not the record of what the app _is_. Anything that must be true of the product
  lives in the repo and changes via PR.

This is the single canonical statement of that policy; other docs and code comments point
here rather than restating it.

---

## The three design layers

Design in this repo lives in three layers. Know which layer your change touches — it
determines where you edit and whether you need a story (see the
[decision table](#does-my-change-need-a-story)).

| Layer                  | What it is                                            | Where it lives                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Tokens**          | Colors, spacing, typography, radii — the design atoms | [`shared/theme/*.ts`](../../shared/theme/)                                                                                                                                 |
| **2. Components**      | Reusable UI: buttons, fields, cards, illustrations    | [`shared/components/`](../../shared/components/), [`features/**/components/`](../../features/)                                                                             |
| **3. Flows / screens** | How screens compose and how a user moves through them | [`docs/ux-designs/`](../ux-designs/), [`docs/ux-design-specification.md`](../ux-design-specification.md) + this folder's [`flows/`](flows/) & [`wireframes/`](wireframes/) |

> **Tokens note:** the portable token source (DTCG JSON → generated TS) is owned by
> story 16-4. Until it lands, tokens are the hand-authored `shared/theme/*.ts` files.

---

## How to propose a change, per layer

All three follow the standard [contribution workflow](../../CONTRIBUTING.md#the-contribution-workflow-step-by-step)
(branch → change → quality gates → PR → maintainer merges). The layer only changes _what_
you edit and _whether a story is required_.

### Layer 1 — Tokens

1. Edit the relevant file in `shared/theme/` (e.g. a color value, a spacing primitive).
2. If this is pure visual polish with **no behavior change**, use the
   [`design`-label fast-path](#the-design-label-fast-path) — no story required.
3. Open a PR. Show the before/after (a Storybook/Chromatic preview is ideal; see
   [Reviewer preview](#how-reviewers-preview-design-changes)).

### Layer 2 — Components

1. Edit the component under `shared/components/` or `features/**/components/`, respecting
   the [layer boundaries](../../CONTRIBUTING.md#coding-standards) (`app → features → shared → core`).
2. **Restyling an existing component** with no new behavior → `design` fast-path.
   **A new component, new prop, or new behavior** → this is new scope: it needs a
   `ready-for-dev` story (normal spec-first flow).
3. Add/extend co-located tests for any behavior change. Open a PR with a preview.

### Layer 3 — Flows / screens

1. For a **new screen or a changed user flow**, the design is specified in markdown
   (`docs/ux-designs/*.md`, `docs/ux-design-specification.md`) and/or as a versionable
   diagram in this folder (see [`docs/design/README.md`](README.md)).
2. A **new screen or changed user flow** is **always new scope** → it needs a story, and
   usually a planning update first (see `CONTRIBUTING.md` on new scope). Open the discussion
   as a [design request issue](https://github.com/ifero/myLoyaltyCards/issues/new?template=design_request.yml).
3. **Correcting an existing diagram/spec** to match already-shipped behavior (no new scope)
   is a documentation fix, not a flow change — use a `docs:` PR (already story-exempt); no
   `design` label needed.

---

## Does my change need a story?

The project is **spec-first**: normally no production code merges without a
`ready-for-dev` story. Design gets **one narrow exemption** — token/visual polish that
changes how something _looks_ but not how it _behaves_.

| Your change                                                | Story required? | Path                                              |
| ---------------------------------------------------------- | --------------- | ------------------------------------------------- |
| Token tweak (color, spacing, radius) — no behavior change  | ❌ No           | `design`-label fast-path                          |
| Restyle an existing component — no new behavior            | ❌ No           | `design`-label fast-path                          |
| Copy / icon / illustration swap — purely visual            | ❌ No           | `design`-label fast-path                          |
| Fix a stale diagram/spec to match already-shipped behavior | ❌ No           | `docs:` PR (docs titles are already story-exempt) |
| New component, new variant, or new prop                    | ✅ Yes          | Normal spec-first story flow                      |
| New screen or changed user flow                            | ✅ Yes          | Story (+ likely a planning update for new scope)  |
| Anything that adds/changes behavior, navigation, or data   | ✅ Yes          | Normal spec-first story flow                      |

**Rule of thumb:** if a reviewer could verify the change purely from a before/after
visual — and nothing about _what the app does_ changed — it's fast-path eligible. If you
have to explain new behavior, it needs a story. Beware changes that look identical but are
still behavioral (e.g. enlarging a tap target / `hitSlop`, or altering a gesture): a
screenshot can't catch them, so they change _what the app does_ and need a story.

### The `design`-label fast-path

For fast-path-eligible changes:

1. Open the PR with a `design`-type title using an **allowed** Conventional-Commit type —
   typically `docs:` (for spec/diagram changes) or `refactor:`/`fix:` for purely visual
   code tweaks. **There is no `design:` commit type** (it would fail the title check).
2. Apply the **`design`** label to the PR — ideally **before opening it**. This makes the
   PR **story-exempt** in the
   [PR-conventions check](../../.github/workflows/pr-conventions.yml) — the same seam the
   `catalogue` label already uses. If you add the label _after_ opening, re-run the check
   (or push a commit) so it re-evaluates with the label applied. First-time or external
   contributors often can't self-apply labels — if so, say so in the PR description and a
   maintainer will apply `design` during review.
3. Provide a visual before/after (Storybook/Chromatic preview preferred).

The exemption is deliberately **narrow**: it is for visual polish only. Anything with
behavior still needs a story — applying the `design` label does not change that
obligation, it only relaxes the automated story link for genuine polish PRs.

---

## How reviewers preview design changes

The goal is to review design like code: from a reproducible artifact, not a screenshot
someone pasted.

- **Storybook + Chromatic** (story 16-5) will give a web preview with visual diffs — but its
  scope is the **`shared/components/ui/` primitives only** (Button, TextField, ToggleSwitch,
  CardShell, ActionRow, ColorPicker, BottomSheet). For a change to one of those, once 16-5
  lands, **link the Chromatic build** in the PR and reviewers approve from the visual diff.
  _(16-5 isn't built yet — it needs a Chromatic project/token set up first.)_
- **Everything else is reviewed from before/after screenshots** — feature-level components
  (`features/**/components/`), non-`ui/` shared components, full screens, and the native Apple
  Watch (SwiftUI) UI all fall outside 16-5's Storybook scope, so screenshots stay the reviewer
  artifact even after it ships. (Storybook renders isolated RN primitives, not the watch's
  native UI or composed screens.) The PR template carves out the watch case explicitly.
- For flows/wireframes, reviewers read the versioned diagram source in
  [`docs/design/`](README.md) (Excalidraw `.svg` + Mermaid).

Reviewer focus for design PRs: token usage over hardcoded values, light/dark + safe-area
correctness, accessibility (contrast, tap targets), and that no behavior crept into a
"polish" PR.

---

## Related

- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) — the golden rules and full workflow.
- [`docs/design/README.md`](README.md) — where versionable diagram sources live.
- Design request issue template: [`.github/ISSUE_TEMPLATE/design_request.yml`](../../.github/ISSUE_TEMPLATE/design_request.yml).
- Sibling stories: 16-4 (token source), 16-5 (Storybook/Chromatic preview), 16-6 (Penpot follow-up, backlog).
