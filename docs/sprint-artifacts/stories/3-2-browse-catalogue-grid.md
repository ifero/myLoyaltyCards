# Story 3.2: Browse Catalogue Grid

**As a** user,
**I want** to browse Italian brands with their logos,
**So that** I can quickly find and add my loyalty cards.

## Acceptance Criteria

- [ ] **Data Source**: Displays data from the `CatalogueRepository` (which wraps `italy.json`).
- [ ] **Entry Point**: The default view of the "Add Card" screen (`app/add-card.tsx`) is now the Catalogue Grid.
- [ ] **Grid Layout**: Brands displayed in a responsive grid.
  - Mobile: 3 columns.
  - Tablet/Desktop: Adaptive (min-width columns).
- [ ] **Visuals**:
  - Logo: Centered, contain-fit.
  - Label: Brand name below logo, truncated if too long.
- [ ] **Performance**: Uses `FlashList` (or optimized FlatList) for 60fps scrolling.
- [ ] **Fallback Action**: Prominent "Add Custom Card" button (Sticky header or top of list) for manual entry/scan flow (legacy flow).
- [ ] **Navigation**: Tapping a brand navigates to the Scanner/Input screen with `brandId` and `brandName` as params.

## Technical Notes

- **Component**: Create `features/cards/components/CatalogueGrid.tsx`.
- **Image Handling**: Use `expo-image` for efficient logo rendering.
- **Search**: (Optional for this specific story, but good to have) A search bar to filter brands by `name` or `aliases`.
- **Router**: The current `add-card.tsx` logic forces a choice between "Scan" or "Manual". This story changes that paradigm to "Browse Catalogue" OR "Custom Action".
- **Styles**: Use NativeWind grid utilities (`grid-cols-3` or flex wrap equivalent for RN).

## Implementation Plan

1.  Refactor `app/add-card.tsx` to handle the new layout.
2.  Implement `CatalogueGrid` component.
3.  Implement `BrandCard` item component.
4.  Connect navigation (pass brand data to scanner).

## Tasks/Subtasks

- [x] Update Add Card entry point
  - [x] Make catalogue grid the default view in `app/add-card.tsx`
- [ ] Build catalogue grid UI
  - [ ] Create `features/cards/components/CatalogueGrid.tsx`
  - [ ] Create `BrandCard` item component
  - [ ] Use `expo-image` for logo rendering
- [ ] List performance
  - [ ] Use `FlashList` (or optimized FlatList) for smooth scrolling
- [ ] Add Custom Card CTA
  - [ ] Add prominent “Add Custom Card” action (sticky header or top of list)
- [ ] Navigation
  - [ ] On brand tap, navigate to scanner/input with `brandId` and `brandName`
- [ ] Tests
  - [ ] Add UI or integration coverage for grid render and navigation params

## Dev Notes

- Use NativeWind grid utilities or flex-wrap to achieve responsive columns.
- Keep list virtualization tuned for low memory and 60fps scrolling.

## Dev Agent Record

### Implementation Plan

Task 1: Update Add Card entry point

- Following red-green-refactor: wrote failing tests first
- Created stub CatalogueGrid component
- Refactored add-card.tsx to show catalogue by default
- Added view mode toggle (catalogue vs form)
- Tests pass ✓

### Debug Log

- None

### Completion Notes

Task 1 complete:

- add-card.tsx now shows catalogue grid by default (AC: Entry Point)
- "Add Custom Card" button provides fallback to manual/scan flow (AC: Fallback Action)
- All tests passing

## File List

- app/add-card.tsx
- app/**tests**/add-card.test.tsx
- features/cards/components/CatalogueGrid.tsx
- features/cards/index.ts

## Change Log

- 2026-02-05: Task 1 complete - refactored add-card.tsx for catalogue grid default view

## Status

- Status: ready-for-dev
