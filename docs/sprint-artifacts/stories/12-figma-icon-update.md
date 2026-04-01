# Story 12.FI: Update Figma Design System Page — Icon Section

Status: ready-for-dev

## Story

As a developer implementing Epic 13,
I want the Figma design system page to show MI/MCI icons instead of FontAwesome,
so that the design source of truth matches the implementation icon system.

## Context

Decision DEC-12.5-004 changed the icon system from FontAwesome to MaterialIcons (MI) + MaterialCommunityIcons (MCI). Stories 12-5 through 12-9 Figma pages already use MI/MCI vector shapes with correct labels. The design system foundation page (from Story 12-1) still shows the original FontAwesome icon section.

**Source:** Epic 12 Retrospective (2026-03-31), Action Item #2
**Owner:** Sally (UX Designer)

## Acceptance Criteria

1. **AC1:** Figma design system page icon section replaced — FontAwesome icons removed, MI/MCI vector shapes with correct `MI:` / `MCI:` prefix labels added
2. **AC2:** Icon labels match `@expo/vector-icons` names exactly (e.g., `MI: chevron-left`, not `MI: back-arrow`)
3. **AC3:** Icon section includes all icons used across stories 12-1 through 12-9 (complete icon inventory)
4. **AC4:** Visual style of icon shapes is consistent with the MI/MCI icons already present on stories 12-5 through 12-9 Figma pages

## Tasks / Subtasks

- [ ] Task 1: Audit complete icon inventory across all Epic 12 Figma pages (AC: 3)
  - [ ] Catalog all unique icons used in stories 12-1 through 12-9
  - [ ] Map each to its MI or MCI name
- [ ] Task 2: Update Figma design system page (AC: 1, 2, 4)
  - [ ] Remove FontAwesome icon section from design system page
  - [ ] Add MI/MCI icon grid with vector shapes
  - [ ] Label each icon with `MI:` or `MCI:` prefix + exact @expo/vector-icons name
  - [ ] Match visual style to icons already on 12-5+ pages
- [ ] Task 3: Verify consistency (AC: 4)
  - [ ] Spot-check icon labels on 12-5, 12-6, 12-7 pages match the design system page

## Dev Notes

### Figma File

- **URL:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
- **Target page:** Design System Foundation (from Story 12-1)
- **Section to update:** Icon set / icon grid

### Known Icon Inventory (from story docs)

**From 12-5 (Auth Screens):**

- `MI: chevron-left`, `MI: visibility`, `MI: visibility-off`, `MI: error-outline`
- `MI: mail-outline`, `MI: add`, `MI: settings`, `MI: close`
- `MCI: shield-check-outline`

**From 12-6 (Settings):**

- `MI: file-download`, `MI: file-upload`
- `MCI: cloud-sync-outline`

**From 12-3 mapped equivalents (Card Detail):**

- `MI: chevron-left`, `MI: edit`, `MI: delete`, `MI: content-copy`
- `MI: chevron-right`, `MI: close`, `MI: light-mode`

### References

- [Source: docs/sprint-artifacts/epic-12-retro-2026-03-31.md#Action Items]
- [Source: DEC-12.5-004 — Icon system decision]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test]

## Blocks

- **13-1-implement-design-system-tokens** — design system page is the canonical reference for token extraction

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
