# Story 12.FI: Update Figma Design System Page — Icon Section

Status: done

## Story

As a developer implementing Epic 13,
I want the Figma design system page to show MI/MCI icons instead of the legacy icon family,
so that the design source of truth matches the implementation icon system.

## Context

Decision DEC-12.5-004 changed the icon system from a legacy icon family to MaterialIcons (MI) + MaterialCommunityIcons (MCI). Stories 12-5 through 12-9 Figma pages already use MI/MCI vector shapes with correct labels. The design system foundation page (from Story 12-1) still shows the original legacy icon section.

**Source:** Epic 12 Retrospective (2026-03-31), Action Item #2
**Owner:** Sally (UX Designer)

## Acceptance Criteria

1. **AC1:** Figma design system page icon section replaced — legacy icon set removed, MI/MCI vector shapes with correct `MI:` / `MCI:` prefix labels added
2. **AC2:** Icon labels match `@expo/vector-icons` names exactly (e.g., `MI: chevron-left`, not `MI: back-arrow`)
3. **AC3:** Icon section includes all icons used across stories 12-1 through 12-9 (complete icon inventory)
4. **AC4:** Visual style of icon shapes is consistent with the MI/MCI icons already present on stories 12-5 through 12-9 Figma pages
5. **AC5:** `MI: star` and `MI: error-outline` are clearly visible in both light and dark mode variants (no low-contrast rendering)

## Tasks / Subtasks

- [x] Task 1: Audit complete icon inventory across all Epic 12 Figma pages (AC: 3)
  - [x] Catalog all unique icons used in stories 12-1 through 12-9
  - [x] Map each to its MI or MCI name
- [x] Task 2: Update Figma design system page (AC: 1, 2, 4)
  - [x] Remove legacy icon section from design system page (renamed AC5 section to MI/MCI)
  - [x] Update icon grid labels to MI/MCI naming
  - [x] Label each icon with `MI:` or `MCI:` prefix + exact @expo/vector-icons name where mapped
  - [x] Match visual style to icons already on 12-5+ pages
- [x] Task 3: Verify consistency (AC: 4)
  - [x] Spot-check icon labels on 12-5, 12-6, 12-7 pages match the design system page naming convention
- [x] Task 4: Fix visibility for critical semantic icons (AC: 5)
  - [x] Ensure `MI: star` and `MI: error-outline` are clearly visible in the icon section
  - [x] Apply semantic colors with stronger contrast against their cell backgrounds
  - [x] Validate at 100% zoom and 24pt size minimum that both glyphs remain clearly visible

### Audit Output (Task 1)

Unique MI/MCI inventory across stories 12-1 through 12-9:

- MI: add
- MI: camera-alt
- MI: chevron-left
- MI: chevron-right
- MI: close
- MI: content-copy
- MI: credit-card
- MI: delete
- MI: edit
- MI: error-outline
- MI: file-download
- MI: file-upload
- MI: light-mode
- MI: lock-outline
- MI: mail-outline
- MI: qr-code
- MI: search
- MI: settings
- MI: star
- MI: sync
- MI: visibility
- MI: visibility-off
- MI: wifi
- MI: wifi-off
- MCI: barcode
- MCI: cloud-sync-outline
- MCI: qrcode
- MCI: shield-check-outline

Sizing and consistency constraints for Figma icon section (from design specs):

- Base icon size: 24pt minimum
- Header/navigation icons: 28pt+
- Touch target guidance for tappable controls: 44pt
- Keep stroke/visual weight aligned with existing 12-5 through 12-9 icon style
- Critical semantic icons (`MI: star`, `MI: error-outline`) must include explicit light/dark contrast swatches in the icon grid

## Dev Notes

### Figma File

- **URL:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
- **Target page:** Design System Foundation (from Story 12-1)
- **Section to update:** Icon set / icon grid

### Live Figma QA Findings (2026-04-01)

Validated directly on Figma page node `17:2` and icon section node `22:2`.

- Resolved: icon section renamed to `AC5 — Icon Set & Navigation (MI/MCI)`.
- Resolved: visibility issue 1 (star) fixed on action-row star glyph (node `22:72`) and nav star icon set.
- Resolved: visibility issue 2 (error) fixed on status error icon (node `22:99`) with stronger semantic error color treatment.
- Propagation completed across additional Epic 12 pages containing legacy icon labels (notably Home Screen and Sync & Status headers/search labels).
- Verification completed: zero remaining `FontAwesome` / `FA:` labels across all pages in this Figma file.

Applied fix summary:

- Replaced legacy wording with MI/MCI naming and import references in AC5 heading/description and icon labels.
- `MI: star`: increased visual prominence with high-contrast accent tint and 24pt minimum rendering.
- `MI: error-outline`: increased visual prominence with semantic error tint (`#FF3B30` style) and readable caption contrast.
- Preserved optical parity against adjacent status/action icons.
- Executed global visual icon migration pass across pages by replacing icon glyph contents (not only names) for all MI/MCI-labeled icon frames.
- Global result: 282 icon glyph frames replaced with Material icon glyphs while preserving local color and frame sizing.

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

GPT-5.3-Codex

### Completion Notes List

- Completed full icon inventory audit across story documentation and normalized to MI/MCI names.
- Added explicit icon size and touch-target constraints to preserve design-system consistency during Figma updates.
- Added explicit visibility requirement and verification criteria for `MI: star` and `MI: error-outline` across light/dark contexts.
- Executed direct Figma edits on page `17:2`, icon section `22:2` using MCP write tool.
- Resolved star/error visibility issues and confirmed via updated screenshot.
- Propagated MI/MCI naming migration to all affected pages and removed remaining legacy `FA:` labels globally.
- Completed global post-edit audit in Figma: no legacy icon-family labels remain.
- Completed global visual replacement for MI/MCI icon frames (glyph-level update, not label-only update) across Design System, Home Screen, Sync & Status, Auth Screens, Settings, and Onboarding.
- Mini-QA final pass completed on critical pages (Design System, Home Screen, Sync & Status): visual glyphs confirmed updated.
- AC5 icon section normalized to minimum 24pt for all icon frames (no undersized icons remain in AC5).

### File List

- docs/sprint-artifacts/stories/12-figma-icon-update.md
