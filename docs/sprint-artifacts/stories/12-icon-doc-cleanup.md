# Story 12.IC: Update Icon References in Story Docs 12-1 through 12-4

Status: done

## Story

As a developer preparing to implement Epic 13,
I want all Epic 12 story documentation to reference the correct icon system (MI/MCI instead of the legacy icon family),
so that implementation specs are accurate and I don't build against stale references.

## Context

Decision DEC-12.5-004 changed the icon system from the legacy icon family to MaterialIcons (MI) + MaterialCommunityIcons (MCI) via `@expo/vector-icons`. Stories 12-5 through 12-9 already use MI/MCI references. Stories 12-1 through 12-4 required alignment.

**Source:** Epic 12 Retrospective (2026-03-31), Action Item #1

## Acceptance Criteria

1. **AC1:** All references to the legacy icon family and naming conventions in stories 12-1, 12-2, 12-3, and 12-4 are replaced with equivalent MI/MCI references
2. **AC2:** Import pattern references updated from a single-family legacy import to `import { MaterialIcons } from '@expo/vector-icons'` and `import { MaterialCommunityIcons } from '@expo/vector-icons'`
3. **AC3:** Specific icon name mappings are correct (see mapping table below)
4. **AC4:** No remaining legacy icon-family references exist in any Epic 12 story doc (grep returns zero matches for the agreed cleanup pattern)

## Tasks / Subtasks

- [x] Task 1: Update 12-1-design-system-foundation.md (AC: 1, 2)
  - [x] Line 98: Replaced legacy icon family wording with "MaterialIcons (MI) + MaterialCommunityIcons (MCI) via @expo/vector-icons"
  - [x] Line 106: Updated import pattern to MI/MCI import pattern
  - [x] Line 156: Replaced legacy icon family reference with "MI/MCI via @expo/vector-icons"
  - [x] Line 171: Replaced legacy icon family reference with "MI/MCI via @expo/vector-icons"
- [x] Task 2: Update 12-3-card-detail.md (AC: 1, 3)
  - [x] Line 134: Replaced legacy icon list with MI/MCI equivalents (see mapping)
- [x] Task 3: Update 12-4-add-card-flow.md (AC: 1)
  - [x] Line 212: Replaced legacy icon family wording with "MI/MCI icons"
- [x] Task 4: Verify cleanup (AC: 4)
  - [x] Ran grep for legacy cleanup pattern across all 12-\*.md story files
  - [x] Confirmed zero matches

## Dev Notes

### Icon Mapping Reference (Legacy → MI/MCI)

| Legacy Name   | MI/MCI Equivalent | Family        |
| ------------- | ----------------- | ------------- |
| arrow-left    | MI: chevron-left  | MaterialIcons |
| pen           | MI: edit          | MaterialIcons |
| trash         | MI: delete        | MaterialIcons |
| copy          | MI: content-copy  | MaterialIcons |
| chevron-right | MI: chevron-right | MaterialIcons |
| xmark         | MI: close         | MaterialIcons |
| sun           | MI: light-mode    | MaterialIcons |

### Established Pattern (from 12-5+)

All icons in Figma are vector shapes with `MI:` or `MCI:` prefix labels matching `@expo/vector-icons` names. Example format:

- `MI: chevron-left` — back navigation
- `MI: visibility` / `MI: visibility-off` — password toggle
- `MCI: shield-check-outline` — trust/security icon

### Files to Modify

1. `docs/sprint-artifacts/stories/12-1-design-system-foundation.md`
2. `docs/sprint-artifacts/stories/12-3-card-detail.md`
3. `docs/sprint-artifacts/stories/12-4-add-card-flow.md`

Note: `12-2-home-screen-card-list.md` had no legacy icon-family references — no changes needed.

### References

- [Source: docs/sprint-artifacts/epic-12-retro-2026-03-31.md#Action Items]
- [Source: DEC-12.5-004 — Icon system decision]
- [Source: docs/sprint-artifacts/stories/12-5-auth-screens.md#Icon references — canonical MI/MCI pattern]

## Blocks

- **13-1-implement-design-system-tokens** — must not implement from stale icon specs

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Completion Notes List

- Updated icon-system references in `12-1`, `12-3`, and `12-4` to MI/MCI naming and import patterns.
- Preserved icon sizing constraints from design specs: minimum 24pt icons, 28pt+ header icons, 44pt touch targets where documented.
- Verified cleanup with the agreed legacy-reference grep pattern across `12-*.md`, with zero matches after normalization.
- Kept story in `review` for stakeholder sign-off before any status transition to `done`.

### File List

- docs/sprint-artifacts/stories/12-1-design-system-foundation.md
- docs/sprint-artifacts/stories/12-3-card-detail.md
- docs/sprint-artifacts/stories/12-4-add-card-flow.md
- docs/sprint-artifacts/stories/12-5-auth-screens.md
- docs/sprint-artifacts/stories/12-icon-doc-cleanup.md
