# Story 12.IC: Update Icon References in Story Docs 12-1 through 12-4

Status: ready-for-dev

## Story

As a developer preparing to implement Epic 13,
I want all Epic 12 story documentation to reference the correct icon system (MI/MCI instead of FontAwesome),
so that implementation specs are accurate and I don't build against stale references.

## Context

Decision DEC-12.5-004 changed the icon system from FontAwesome to MaterialIcons (MI) + MaterialCommunityIcons (MCI) via `@expo/vector-icons`. Stories 12-5 through 12-9 already use MI/MCI references. Stories 12-1 through 12-4 still reference FontAwesome and need updating.

**Source:** Epic 12 Retrospective (2026-03-31), Action Item #1

## Acceptance Criteria

1. **AC1:** All references to "FontAwesome", "FA:", "fa-", and "font-awesome" in stories 12-1, 12-2, 12-3, and 12-4 are replaced with equivalent MI/MCI references
2. **AC2:** Import pattern references updated from `import FontAwesome from '@expo/vector-icons/FontAwesome'` to `import { MaterialIcons } from '@expo/vector-icons'` and `import { MaterialCommunityIcons } from '@expo/vector-icons'`
3. **AC3:** Specific icon name mappings are correct (see mapping table below)
4. **AC4:** No remaining FontAwesome references exist in any Epic 12 story doc (grep returns zero matches)

## Tasks / Subtasks

- [ ] Task 1: Update 12-1-design-system-foundation.md (AC: 1, 2)
  - [ ] Line 98: Replace "FontAwesome (via @expo/vector-icons, bundled with Expo)" with "MaterialIcons (MI) + MaterialCommunityIcons (MCI) via @expo/vector-icons"
  - [ ] Line 106: Replace FontAwesome import pattern with MI/MCI import pattern
  - [ ] Line 156: Replace "FontAwesome via @expo/vector-icons" with "MI/MCI via @expo/vector-icons"
  - [ ] Line 171: Replace "FontAwesome via @expo/vector-icons" with "MI/MCI via @expo/vector-icons"
- [ ] Task 2: Update 12-3-card-detail.md (AC: 1, 3)
  - [ ] Line 134: Replace Font Awesome icon list with MI/MCI equivalents (see mapping)
- [ ] Task 3: Update 12-4-add-card-flow.md (AC: 1)
  - [ ] Line 212: Replace "Font Awesome 6 Free icons" with "MI/MCI icons"
- [ ] Task 4: Verify cleanup (AC: 4)
  - [ ] Run grep for "FontAwesome|FA:|fa-|font-awesome" across all 12-\*.md story files
  - [ ] Confirm zero matches

## Dev Notes

### Icon Mapping Reference (FA → MI/MCI)

| FontAwesome Name | MI/MCI Equivalent | Family        |
| ---------------- | ----------------- | ------------- |
| fa-arrow-left    | MI: chevron-left  | MaterialIcons |
| fa-pen           | MI: edit          | MaterialIcons |
| fa-trash         | MI: delete        | MaterialIcons |
| fa-copy          | MI: content-copy  | MaterialIcons |
| fa-chevron-right | MI: chevron-right | MaterialIcons |
| fa-xmark         | MI: close         | MaterialIcons |
| fa-sun           | MI: light-mode    | MaterialIcons |

### Established Pattern (from 12-5+)

All icons in Figma are vector shapes with `MI:` or `MCI:` prefix labels matching `@expo/vector-icons` names. Example format:

- `MI: chevron-left` — back navigation
- `MI: visibility` / `MI: visibility-off` — password toggle
- `MCI: shield-check-outline` — trust/security icon

### Files to Modify

1. `docs/sprint-artifacts/stories/12-1-design-system-foundation.md`
2. `docs/sprint-artifacts/stories/12-3-card-detail.md`
3. `docs/sprint-artifacts/stories/12-4-add-card-flow.md`

Note: `12-2-home-screen-card-list.md` has no FontAwesome references -- no changes needed.

### References

- [Source: docs/sprint-artifacts/epic-12-retro-2026-03-31.md#Action Items]
- [Source: DEC-12.5-004 — Icon system decision]
- [Source: docs/sprint-artifacts/stories/12-5-auth-screens.md#Icon references — canonical MI/MCI pattern]

## Blocks

- **13-1-implement-design-system-tokens** — must not implement from stale icon specs

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
