# Story 13.3: Restyle Card Detail Screen

Status: review

## Story

As a user viewing my loyalty card at checkout,
I want the card detail screen to show a branded hero section, a large clear barcode, and clean management actions,
so that I can quickly scan my card and easily manage it.

## Context

This story resyles the Card Detail screen (`features/cards/components/CardDetails.tsx`) and its route (`app/card/[id].tsx`) to match the approved Figma design from Story 12-3. The shared design system tokens and components from Story 13-1 (Button, CardShell, ActionRow) will already be in place.

**Current state:** The screen has a centered letter avatar, adequate but not maximized barcode, nearly invisible green "Edit" text, and a red "Delete" that dominates. Uses `SAGE_COLORS` and emoji clipboard icon. No brand identity.

**Target state:** Brand-colored hero header with logo (catalogue) or user color + letter avatar (custom), large barcode on white card, Klarna-style ActionRow pattern for Edit/Delete, condensing scroll header, fullscreen barcode overlay with white background even in dark mode.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Card Detail
**Design story reference:** docs/sprint-artifacts/stories/12-3-card-detail.md

## Acceptance Criteria

### AC1: Brand Hero Section

- [x] Catalogue cards (`card.brandId !== null`) display a brand-colored header using the brand's hex color from `catalogue/data/italy.json`
- [x] Catalogue cards show the brand logo centered in the hero (sourced via `useBrandLogo` hook)
- [x] Brand name is displayed prominently below the hero header
- [x] Custom cards (`card.brandId === null`) display the user-selected `card.color` as the hero background
- [x] Custom cards show a first-letter avatar (via `VirtualLogo` or equivalent) centered in the hero
- [x] Hero section matches Figma frames: "Catalogue Card Detail" and "Custom Card Detail"
- [x] Dark mode: hero colors remain the same (brand colors are constant), text contrast maintained

### AC2: Barcode Display Area

- [x] Barcode is rendered large and clear inside a white/light card container
- [x] White barcode background is maintained even in dark mode (scanner readability)
- [x] Barcode number displayed below in a readable, spaced format (e.g., `1234 5678 9012`)
- [x] "Tap to enlarge" hint text shown below barcode area
- [x] Tapping barcode area opens fullscreen barcode overlay (AC6)
- [x] Barcode card has proper padding and subtle shadow/elevation for visual separation
- [x] Matches Figma frame: barcode section within Card Detail

### AC3: Card Info Section

- [x] Info section displays metadata in labeled rows:
  - Barcode number with copy-to-clipboard action (MI: content-copy icon)
  - Color row shown ONLY for custom cards (catalogue cards show brand color in hero)
  - Date added
- [x] Barcode format row is NOT displayed (removed per design review -- implementation detail, not user-relevant)
- [x] Copy-to-clipboard triggers haptic feedback and shows a toast confirmation via `burnt`
- [x] Info section is visually secondary to the barcode (smaller type, muted labels)
- [x] Dark mode: surface color for info card, text colors follow semantic tokens

### AC4: Manage Actions Section

- [x] "Manage" section header label displayed above action rows
- [x] "Edit card" action row using shared `ActionRow` component: MI: edit icon + "Edit card" label + MI: chevron-right
- [x] "Delete card" action row: MI: delete icon + "Delete card" label, red/destructive text color, positioned LAST
- [x] Delete row is visually de-emphasized compared to Edit (no chevron, quiet destructive style)
- [x] Visual separator between Edit and Delete rows
- [x] Tapping Edit navigates to `/card/[id]/edit`
- [x] Tapping Delete shows confirmation `Alert.alert` dialog (existing behavior preserved)
- [x] 44pt minimum touch target on all action rows
- [x] Dark mode: action rows use dark surface, destructive red remains visible

### AC5: Navigation Header

- [x] Header shows MI: chevron-left back arrow on the left
- [x] Card name centered in header
- [x] Header uses brand color as background (catalogue) or primary color (custom)
- [x] Header text is white (or contrast-appropriate for the brand color)
- [x] On scroll, header condenses (smaller title, more compact)
- [x] Back arrow navigates to previous screen
- [x] Matches Figma frame: navigation header in Card Detail

### AC6: Fullscreen Barcode Overlay

- [x] Tapping barcode area opens a fullscreen barcode modal/overlay
- [x] Fullscreen overlay uses white background even in dark mode (scanner readability)
- [x] MI: close icon in top-right (or top-left) to dismiss the overlay
- [x] Barcode is rendered at maximum width for the screen
- [x] Barcode number shown below in spaced format
- [x] Screen brightness hint displayed (MI: light-mode icon + text)
- [x] Overlay is dismissible via close icon tap
- [x] Matches Figma frame: "Barcode enlarged/fullscreen state"

### AC7: Screen Brightness Hint

- [x] A brightness hint (MI: light-mode icon + "Increase brightness for scanning") is visible on the detail screen near the barcode area
- [x] Hint uses secondary/muted text styling
- [x] Existing `useBrightness` hook behavior preserved (auto-brightness on fullscreen)

### AC8: Dark Mode Support

- [x] White background in light mode, true black `#000000` background in dark mode
- [x] All text follows semantic color tokens (textPrimary, textSecondary)
- [x] Barcode area remains white in both modes
- [x] Brand hero colors are consistent across light/dark
- [x] Action rows use appropriate dark surface colors
- [x] Destructive red text meets contrast requirements on dark surfaces
- [x] Matches Figma dark frames for all four Card Detail states

### AC9: Old Code Cleanup

- [x] All `SAGE_COLORS` references removed from `CardDetails.tsx` and `app/card/[id].tsx`
- [x] Emoji clipboard icon (`clipboard`) replaced with MI: content-copy vector icon
- [x] Inline `StyleSheet.create` styles migrated to NativeWind classes where appropriate (layout/spacing)
- [x] Dynamic theme colors applied via `useTheme()` tokens from 13-1

### AC10: Tests Pass

- [x] All new and modified component tests pass
- [x] All existing tests pass (no regressions)
- [x] Coverage threshold maintained (80% branches/functions/lines/statements)
- [x] Snapshot tests updated if applicable

## Tasks / Subtasks

- [ ] **Task 1: Refactor CardDetails component — Brand Hero Section** (AC: 1)
  - [ ] Add `brandId` awareness: detect catalogue vs custom card via `card.brandId`
  - [ ] Create `BrandHero` sub-component in `features/cards/components/BrandHero.tsx`
  - [ ] Catalogue variant: brand-colored background + brand logo (via `useBrandLogo`) + brand name
  - [ ] Custom variant: user color background + `VirtualLogo` first-letter avatar + card name
  - [ ] Look up brand hex color from catalogue data (use existing catalogue repository or brand color lookup from 13-1)
  - [ ] Create `features/cards/components/BrandHero.test.tsx`

- [ ] **Task 2: Restyle Barcode Display Area** (AC: 2, 7)
  - [ ] Refactor barcode section in `CardDetails.tsx` into a white card container
  - [ ] Force white background (`#FFFFFF`) regardless of dark mode
  - [ ] Increase barcode render size to near-max width
  - [ ] Format barcode number with spaces for readability (e.g., groups of 4)
  - [ ] Keep "Tap to enlarge" hint text
  - [ ] Add brightness hint row (MI: light-mode + muted text)
  - [ ] Add subtle shadow/elevation to barcode card

- [ ] **Task 3: Restyle Card Info Section** (AC: 3)
  - [ ] Remove barcode format row (not user-relevant per design review)
  - [ ] Conditionally show color row only when `card.brandId === null`
  - [ ] Replace emoji clipboard icon with `<MaterialIcons name="content-copy" />`
  - [ ] Update `DetailRow` or use themed styling from 13-1 tokens
  - [ ] Ensure muted label styling with secondary text color tokens
  - [ ] Add bottom padding after last row per Figma specs

- [ ] **Task 4: Implement Manage Actions Section** (AC: 4)
  - [ ] Add "Manage" section header text
  - [ ] Replace Edit button with shared `ActionRow` component from `@/shared/components/ui/ActionRow`
    - Props: `icon="edit"`, `iconFamily="MI"`, `label="Edit card"`, `onPress={handleEditCard}`
  - [ ] Replace Delete button with `ActionRow` (or custom destructive variant)
    - Red text color, MI: delete icon, no trailing chevron
  - [ ] Add visual separator between Edit and Delete rows
  - [ ] Remove old `editButton` and `deleteButton` StyleSheet styles
  - [ ] Preserve existing `handleDeleteCard` Alert.alert confirmation logic
  - [ ] Preserve `isDeleting` disabled state

- [ ] **Task 5: Implement Condensing Navigation Header** (AC: 5)
  - [ ] Update `Stack.Screen` options in `app/card/[id].tsx` for custom header
  - [ ] Implement brand-colored header background (catalogue brand color or primary token)
  - [ ] MI: chevron-left as back button icon (replace default)
  - [ ] Card name centered in header
  - [ ] Implement scroll-aware header condensing using `Animated.ScrollView` or `onScroll` handler
  - [ ] White/contrast-appropriate header text

- [ ] **Task 6: Implement Fullscreen Barcode Overlay** (AC: 6)
  - [ ] Create `features/cards/components/FullscreenBarcode.tsx` (or refactor existing `BarcodeFlash.tsx`)
  - [ ] White background enforced even in dark mode
  - [ ] MI: close icon to dismiss (replace any existing dismiss mechanism)
  - [ ] Barcode at maximum width
  - [ ] Spaced barcode number below
  - [ ] Brightness hint with MI: light-mode icon
  - [ ] Decide: modal overlay within CardDetails vs separate route (`/barcode/[id]`)
    - If keeping separate route, update `app/barcode/[id].tsx` and `BarcodeFlash.tsx`
    - If inline overlay, add modal state to `CardDetails.tsx`
  - [ ] Create `features/cards/components/FullscreenBarcode.test.tsx`

- [ ] **Task 7: Apply Dark Mode Styles** (AC: 8)
  - [ ] Verify true black `#000000` background via theme token
  - [ ] Verify barcode card stays white in dark mode
  - [ ] Verify brand hero colors are preserved in dark mode
  - [ ] Verify destructive red text contrast on dark surfaces
  - [ ] Verify info section uses dark surface token
  - [ ] Verify action rows use dark surface token
  - [ ] Test all four Figma dark mode frames are matched

- [ ] **Task 8: Clean Up Legacy Code** (AC: 9)
  - [ ] Remove all `SAGE_COLORS` imports and references from `CardDetails.tsx`
  - [ ] Remove all `SAGE_COLORS` imports and references from `app/card/[id].tsx`
  - [ ] Replace hardcoded color values with theme tokens
  - [ ] Migrate applicable `StyleSheet.create` styles to NativeWind `className`
  - [ ] Ensure imports use `@/shared/components/ui` for shared components (ActionRow, etc.)
  - [ ] Use relative imports for feature-local components (BrandHero, etc.)

- [ ] **Task 9: Update Tests** (AC: 10)
  - [ ] Update `features/cards/components/CardDetails.test.tsx` for new component structure
  - [ ] Add tests for BrandHero (catalogue variant, custom variant, dark mode)
  - [ ] Add tests for fullscreen barcode overlay (open, close, white bg in dark mode)
  - [ ] Add tests for Manage section (Edit row tap, Delete row tap + confirm, disabled state)
  - [ ] Add tests for conditional info rows (format hidden, color hidden for catalogue)
  - [ ] Add tests for copy-to-clipboard with MI icon
  - [ ] Update `DetailRow.test.tsx` if DetailRow interface changed
  - [ ] Run full suite: `npm test -- --coverage`
  - [ ] Verify 80% coverage threshold met

- [ ] **Task 10: Visual QA Against Figma** (AC: 1-8)
  - [ ] Compare catalogue card detail (light) against Figma frame
  - [ ] Compare custom card detail (light) against Figma frame
  - [ ] Compare catalogue card detail (dark) against Figma frame
  - [ ] Compare custom card detail (dark) against Figma frame
  - [ ] Compare fullscreen barcode (light + dark) against Figma frame
  - [ ] Compare scrolled/condensed header state against Figma frame
  - [ ] Verify 24px horizontal screen margins
  - [ ] Verify 44pt touch targets on all interactive elements

## Dev Notes

### Existing Files to Modify

| File                                              | Change                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `features/cards/components/CardDetails.tsx`       | Major restyle: brand hero, barcode card, info section, manage section     |
| `features/cards/components/CardDetails.test.tsx`  | Update for new structure, add new test cases                              |
| `features/cards/components/DetailRow.tsx`         | May need interface updates for new styling                                |
| `features/cards/components/DetailRow.test.tsx`    | Update if DetailRow interface changes                                     |
| `features/cards/components/BarcodeFlash.tsx`      | Restyle or replace with FullscreenBarcode overlay                         |
| `features/cards/components/BarcodeFlash.test.tsx` | Update for new fullscreen barcode design                                  |
| `app/card/[id].tsx`                               | Update Stack.Screen options for custom branded header, remove SAGE_COLORS |
| `app/barcode/[id].tsx`                            | Update if fullscreen barcode route is retained                            |
| `features/cards/index.ts`                         | Add new component exports (BrandHero, FullscreenBarcode)                  |

### New Files to Create

| File                                                   | Purpose                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `features/cards/components/BrandHero.tsx`              | Brand-colored hero section (catalogue logo or custom avatar)       |
| `features/cards/components/BrandHero.test.tsx`         | Tests for catalogue and custom hero variants                       |
| `features/cards/components/FullscreenBarcode.tsx`      | Fullscreen barcode overlay with white bg + close + brightness hint |
| `features/cards/components/FullscreenBarcode.test.tsx` | Tests for fullscreen overlay behavior                              |

### Architecture Compliance

- **Feature module boundary:** All new components go in `features/cards/components/` (screen-specific)
- **Shared components:** Import `ActionRow`, `Button`, `CardShell` from `@/shared/components/ui/` (cross-boundary absolute import)
- **Theme tokens:** Import from `@/shared/theme` — use semantic tokens, not hardcoded colors
- **Relative imports within feature:** `./BrandHero`, `./DetailRow`, `./BarcodeRenderer`
- **Route file stays thin:** `app/card/[id].tsx` re-exports/composes, does not contain layout logic
- **NativeWind:** Use `className` for layout and spacing, theme tokens for dynamic colors
- **Naming:** PascalCase components, PascalCase.tsx files, co-located .test.tsx files
- **Coverage:** 80% threshold for branches/functions/lines/statements

### Icon Reference (MI = MaterialIcons from @expo/vector-icons)

```typescript
import { MaterialIcons } from '@expo/vector-icons';

// Navigation
<MaterialIcons name="chevron-left" size={28} color={headerTextColor} />

// Actions
<MaterialIcons name="edit" size={24} color={theme.text.primary} />
<MaterialIcons name="delete" size={24} color={theme.semantic.error} />
<MaterialIcons name="content-copy" size={20} color={theme.primary} />
<MaterialIcons name="chevron-right" size={24} color={theme.text.tertiary} />

// Overlay
<MaterialIcons name="close" size={28} color="#333333" />
<MaterialIcons name="light-mode" size={20} color={theme.text.secondary} />
```

### Key Data Model Fields

```typescript
// From core/schemas/card.ts
interface LoyaltyCard {
  id: string;
  name: string;
  barcode: string;
  barcodeFormat: BarcodeFormat;
  color: string; // User-selected color key for custom cards
  brandId: string | null; // null = custom card, non-null = catalogue card
  createdAt: string;
  // ...
}
```

- `card.brandId !== null` --> catalogue card (show brand hero with logo)
- `card.brandId === null` --> custom card (show user color + letter avatar)

### Barcode Number Formatting

```typescript
// Space the barcode number for readability
function formatBarcodeNumber(barcode: string): string {
  return barcode.replace(/(.{4})/g, '$1 ').trim();
}
// "1234567890123" --> "1234 5678 9012 3"
```

### Scroll Condensing Header Strategy

Use `Animated.ScrollView` with `onScroll` to track scroll offset. Interpolate header height and title font size between expanded and condensed values. The brand hero collapses into a compact colored header bar as the user scrolls down.

### Fullscreen Barcode Decision

The current implementation uses a separate route (`/barcode/[id]`). Options:

1. **Keep separate route** -- restyle `BarcodeFlash.tsx` and `app/barcode/[id].tsx` in place. Simpler routing but two separate screens to maintain.
2. **Inline modal overlay** -- render within `CardDetails.tsx` as a `Modal` component. Closer to Figma "overlay" concept, no navigation transition.

Recommend option 2 (inline modal) for a smoother UX matching the Figma overlay design. If choosing option 2, deprecate the `/barcode/[id]` route and remove it in a cleanup pass.

### References

- [Design: docs/sprint-artifacts/stories/12-3-card-detail.md -- Approved Figma specs and design decisions]
- [Foundation: docs/sprint-artifacts/stories/13-1-implement-design-system-tokens.md -- Tokens and shared components]
- [Current impl: features/cards/components/CardDetails.tsx -- Existing component to restyle]
- [Current route: app/card/[id].tsx -- Route file to update]
- [Current fullscreen: features/cards/components/BarcodeFlash.tsx -- Existing fullscreen barcode]
- [Brand logo hook: features/cards/hooks/useBrandLogo.ts -- Existing hook for catalogue logos]
- [Brightness hook: features/cards/hooks/useBrightness.ts -- Existing auto-brightness logic]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test -- Card Detail page]

## Blocks

- **Blocked by:** 13-1 (Design system tokens and shared components: Button, CardShell, ActionRow must exist)
- **Blocks:** None directly (but should be completed before 13-4+ for visual consistency)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
