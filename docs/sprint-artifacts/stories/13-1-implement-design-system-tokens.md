# Story 13.1: Implement Design System Tokens & Components

Status: review

## Story

As a user of myLoyaltyCards,
I want the app's visual foundation to match the approved Figma designs,
so that every screen has consistent, polished colors, typography, spacing, and component styles.

## Context

This is the **foundation story** for Epic 13. Every subsequent restyle story (13-2 through 13-9) depends on the tokens and shared components defined here. The Figma designs were approved in Epic 12 (Sprint 10). This story replaces the existing sage-green palette with the new `#1A73E8` primary blue, updates all design tokens, and creates reusable shared components (buttons, form inputs, action rows, card shells).

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Design System Foundation (Story 12-1)
**Design story reference:** [Source: docs/sprint-artifacts/stories/12-1-design-system-foundation.md]

## Acceptance Criteria

### AC1: Color Token Replacement

- [x] Light mode palette: 13 semantic tokens updated (primary → `#1A73E8`, backgrounds, surfaces, text hierarchy, semantic colors)
- [x] Dark mode palette: 13 semantic tokens updated (primary → `#4DA3FF`, true black `#000000` background, elevated surfaces)
- [x] Brand catalogue colors: 20 brand hex values available as a lookup (from `catalogue/data/italy.json` `brandColor` field)
- [x] WCAG 2.1 AA contrast compliance maintained (4.5:1 text, 3:1 large text/UI)
- [x] Old sage-green palette (`#73A973`) fully replaced — zero references remain
- [x] Tailwind config updated: all color tokens available as Tailwind classes

### AC2: Typography Scale

- [x] 11-level type scale implemented matching Figma specs (Large Title 34pt → Caption 2 11pt)
- [x] Font weights mapped: Regular, Medium, Semibold, Bold
- [x] Line-height and letter-spacing values match Figma specs
- [x] Typography tokens exported for Tailwind and inline style usage
- [x] iOS uses SF Pro (system default), watchOS uses SF Compact (system default) — no custom font imports needed

### AC3: Spacing & Layout Tokens

- [x] 7-step spacing scale: 4, 8, 12, 16, 24, 32, 48 (already exists — verify alignment with Figma)
- [x] Layout constants: screen margins (24px horizontal), content padding, grid specs
- [x] Card aspect ratio token defined
- [x] Safe area handling tokens for notch/Dynamic Island
- [x] Tailwind spacing scale updated if any values changed

### AC4: Button Component System

- [x] 4 button types: Primary (filled `#1A73E8`), Secondary (outlined), Tertiary (text-only), Destructive (red)
- [x] 4 states each: Default, Pressed, Disabled, Loading
- [x] 44pt minimum touch target on all buttons
- [x] Shared `Button` component in `shared/components/ui/` with `variant` prop
- [x] Dark mode variants for all button types
- [x] Unit tests for all variants and states

### AC5: Card Shell Component

- [x] Catalogue card variant: brand hex background + centered logo slot
- [x] Custom card variant: user-selected color + first-letter avatar fallback
- [x] Grid thumbnail size and detail hero size variants
- [x] Dark mode: 1pt border for black-branded cards (`#000000`) to avoid disappearing on dark surfaces
- [x] Unit tests for both variants, both sizes, light/dark

### AC6: Form Input Components

- [x] Text field with 5 states: Default, Focused, Filled, Error, Disabled
- [x] Toggle switch: ON/OFF states (distinguishable by shape/position, not just color)
- [x] Color picker: 5-color palette for custom card color selection
- [x] Error message placement and styling matching Figma
- [x] Dark mode variants for all form components
- [x] Unit tests for all states

### AC7: Action Row Component

- [x] Klarna-style pattern: icon + label + chevron-right
- [x] Tappable with 44pt minimum touch target
- [x] Supports MI/MCI icon on the left
- [x] Dark mode variant
- [x] Unit tests

### AC8: Icon System Integration

- [x] MI (MaterialIcons) and MCI (MaterialCommunityIcons) import pattern established
- [x] `import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'`
- [x] Minimum icon size: 24pt standard, 28pt+ for headers
- [x] Icon color follows semantic text color tokens
- [x] No FontAwesome imports remain in the codebase after this story

### AC9: ThemeProvider Update

- [x] `useTheme()` hook returns updated token values
- [x] System color scheme detection still works
- [x] All existing consumers of `useTheme()` receive new values without breaking
- [x] Backward-compatible: screens not yet restyled (13-2+) should still render (may look mixed but not crash)

### AC10: All Tests Pass

- [x] All new component tests pass
- [x] All existing tests pass (no regressions)
- [x] Coverage threshold maintained (80% branches/functions/lines/statements)

## Tasks / Subtasks

- [x] **Task 1: Update color tokens** (AC: 1)
  - [x] Replace `SAGE_COLORS` with new primary blue palette in `shared/theme/colors.ts`
  - [x] Update `LIGHT_THEME` and `DARK_THEME` objects with all 13 semantic tokens each
  - [x] Add brand color lookup utility that reads from `catalogue/data/italy.json`
  - [x] Update `CARD_COLORS` if the 5-color custom card palette changed
  - [x] Remove all sage-green references
  - [x] Update `tailwind.config.js` color extensions

- [x] **Task 2: Add typography tokens** (AC: 2)
  - [x] Create `shared/theme/typography.ts` with 11-level scale
  - [x] Export as both raw values and Tailwind-compatible config
  - [x] Add to barrel export in `shared/theme/index.ts`
  - [x] Update `tailwind.config.js` fontSize extensions

- [x] **Task 3: Verify spacing tokens** (AC: 3)
  - [x] Audit `shared/theme/spacing.ts` against Figma specs
  - [x] Add any missing layout constants (screen margins, card aspect ratio)
  - [x] Update Tailwind config if values changed

- [x] **Task 4: Create Button component** (AC: 4)
  - [x] Create `shared/components/ui/Button.tsx`
  - [x] Props: `variant: 'primary' | 'secondary' | 'tertiary' | 'destructive'`, `loading?: boolean`, `disabled?: boolean`
  - [x] Use NativeWind classes + theme tokens for styling
  - [x] Create `shared/components/ui/Button.test.tsx`

- [x] **Task 5: Create CardShell component** (AC: 5)
  - [x] Create `shared/components/ui/CardShell.tsx`
  - [x] Props: `type: 'catalogue' | 'custom'`, `brandColor?: string`, `size: 'grid' | 'hero'`
  - [x] Handle dark mode 1pt border for black brands
  - [x] Create `shared/components/ui/CardShell.test.tsx`

- [x] **Task 6: Create form input components** (AC: 6)
  - [x] Create `shared/components/ui/TextField.tsx` (5 states)
  - [x] Create `shared/components/ui/ToggleSwitch.tsx`
  - [x] Create `shared/components/ui/ColorPicker.tsx`
  - [x] Create tests for each

- [x] **Task 7: Create ActionRow component** (AC: 7)
  - [x] Create `shared/components/ui/ActionRow.tsx`
  - [x] Props: `icon: string`, `iconFamily: 'MI' | 'MCI'`, `label: string`, `onPress: () => void`
  - [x] Create `shared/components/ui/ActionRow.test.tsx`

- [x] **Task 8: Establish icon import pattern** (AC: 8)
  - [x] Verify `@expo/vector-icons` already installed (it should be — bundled with Expo)
  - [x] Remove any FontAwesome imports if they exist in code
  - [x] Create icon usage example in shared components

- [x] **Task 9: Update ThemeProvider** (AC: 9)
  - [x] Update `shared/theme/ThemeProvider.tsx` to expose new token structure
  - [x] Ensure `useTheme()` hook API is backward-compatible or update all consumers
  - [x] Test that existing screens render without crashes

- [x] **Task 10: Run full test suite** (AC: 10)
  - [x] Run `npm test` — all tests must pass
  - [x] Verify coverage thresholds met
  - [x] Fix any regressions

## Dev Notes

### Existing Files to Modify

| File                             | Change                                                          |
| -------------------------------- | --------------------------------------------------------------- |
| `shared/theme/colors.ts`         | Replace sage palette → blue `#1A73E8`, update all theme objects |
| `shared/theme/spacing.ts`        | Verify alignment, add layout constants if missing               |
| `shared/theme/ThemeProvider.tsx` | Update to expose new tokens, keep backward-compat               |
| `shared/theme/index.ts`          | Add typography export                                           |
| `tailwind.config.js`             | Update color/spacing/fontSize extensions                        |

### New Files to Create

| File                                                 | Purpose                                      |
| ---------------------------------------------------- | -------------------------------------------- |
| `shared/theme/typography.ts`                         | 11-level type scale tokens                   |
| `shared/components/ui/Button.tsx`                    | Shared button (4 variants, 4 states)         |
| `shared/components/ui/CardShell.tsx`                 | Card container (catalogue/custom, grid/hero) |
| `shared/components/ui/TextField.tsx`                 | Text input (5 states)                        |
| `shared/components/ui/ToggleSwitch.tsx`              | Toggle ON/OFF                                |
| `shared/components/ui/ColorPicker.tsx`               | 5-color custom card picker                   |
| `shared/components/ui/ActionRow.tsx`                 | Klarna-style icon+label+chevron row          |
| `shared/components/ui/index.ts`                      | Barrel export for all UI components          |
| + corresponding `.test.tsx` files for each component |

### Color Token Reference (from Figma)

**Light Mode:**

- Primary: `#1A73E8`
- Background: off-white (check Figma for exact hex)
- Surface / Card: white or near-white
- Text Primary: dark (near-black)
- Text Secondary: medium grey
- Text Tertiary: light grey
- Semantic: success (green), warning (amber), error (red), info (blue)

**Dark Mode:**

- Primary: `#4DA3FF` (brightened for 5.2:1 contrast on dark)
- Background: `#000000` (true OLED black)
- Surface: elevated dark grey
- Text Primary: white/near-white
- Text Secondary: light grey
- Text Tertiary: medium grey

**Brand Colors (20 from italy.json):**

- Conad `#DA291C`, Coop `#E2231A`, Carrefour `#00338D`, Esselunga `#FFCC00`
- IKEA `#0058AB`, Lidl `#0050AA`, H&M `#E50010`, Zara `#000000`
- Sephora `#000000`, Douglas `#7BB4AE`, Eurospin `#7B8D97`, etc.
- Special cases: Esselunga yellow needs dark text, Douglas teal needs dark text, black brands need 1pt border in dark mode

### Typography Scale (from Figma)

| Level       | Size | Weight   | Use Case        |
| ----------- | ---- | -------- | --------------- |
| Large Title | 34pt | Bold     | Screen headers  |
| Title 1     | 28pt | Bold     | Section headers |
| Title 2     | 22pt | Bold     | Sub-sections    |
| Title 3     | 20pt | Semibold | Card titles     |
| Headline    | 17pt | Semibold | Emphasized body |
| Body        | 17pt | Regular  | Default text    |
| Callout     | 16pt | Regular  | Supporting text |
| Subheadline | 15pt | Regular  | Secondary info  |
| Footnote    | 13pt | Regular  | Fine print      |
| Caption 1   | 12pt | Regular  | Labels          |
| Caption 2   | 11pt | Regular  | Smallest text   |

### Icon System (MI/MCI)

```typescript
// Correct import pattern:
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

// Usage:
<MaterialIcons name="chevron-left" size={24} color={theme.text.primary} />
<MaterialCommunityIcons name="shield-check-outline" size={24} color={theme.text.primary} />
```

### Architecture Compliance

- **Layer boundaries:** New components go in `shared/components/ui/` (cross-feature)
- **Import convention:** Other features import via `@/shared/components/ui`
- **No React in core/:** Theme tokens in `shared/theme/` can export pure values + React context
- **Naming:** Components PascalCase, files PascalCase.tsx, tokens camelCase
- **Testing:** Co-located `.test.tsx` files, 80% coverage threshold
- **NativeWind:** Use className for layout/spacing, theme tokens for dynamic colors

### Backward Compatibility Strategy

This story changes the design system foundation but does NOT restyle individual screens (that's stories 13-2 through 13-9). After this story:

- Token values change (sage → blue, etc.)
- New shared components exist but aren't used in screens yet
- Existing screens will render with new colors but old layouts — this is expected
- No screen should crash — ThemeProvider API must stay compatible

### Project Structure Notes

- Alignment with feature-first organization: tokens in `shared/theme/`, components in `shared/components/ui/`
- Barrel exports: `shared/theme/index.ts` and `shared/components/ui/index.ts`
- Follows existing pattern: `shared/components/` already has SyncIndicator, OfflineIndicator, etc.

### References

- [Source: docs/sprint-artifacts/stories/12-1-design-system-foundation.md — Complete Figma specs]
- [Source: docs/project_context.md — Implementation rules, naming, layer boundaries]
- [Source: docs/architecture.md — Tech stack, NativeWind patterns]
- [Source: shared/theme/colors.ts — Current color tokens to replace]
- [Source: shared/theme/spacing.ts — Current spacing tokens to verify]
- [Source: tailwind.config.js — Tailwind integration to update]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test — Design System Foundation page]

## Blocks

- **Blocked by:** `12-icon-doc-cleanup`, `12-figma-icon-update` (icon specs must be accurate first)
- **Blocks:** All stories 13-2 through 13-9 (every screen restyle depends on these tokens and components)

## Dev Agent Record

### Agent Model Used

GPT-5.3-Codex

### Debug Log References

- Context7 docs check: `/facebook/react-native-website` and `/oblador/react-native-vector-icons`
- Unit tests (new UI components): 16 passed, 0 failed
- Full suite: 1037 passed, 0 failed
- Coverage run: 1037 passed, 0 failed

### Completion Notes List

- Replaced legacy sage token system with blue-first semantic themes and dark true-black foundation.
- Added brand color lookup sourced from `catalogue/italy.json` via `BRAND_COLORS` and `getBrandColor`.
- Added typography token scale + Tailwind `fontSize` mappings.
- Added spacing/layout constants (margins, card ratio, safe-area minima).
- Built reusable UI kit in `shared/components/ui/` with tests: `Button`, `CardShell`, `TextField`, `ToggleSwitch`, `ColorPicker`, `ActionRow`.
- Established MI/MCI icon pattern in shared component implementation (`ActionRow`).
- Updated `ThemeProvider` to expose typography/spacing/layout/touch-target while preserving existing `theme` API.
- Removed all runtime/test references to `#73A973` and `SAGE_COLORS` in source files.

### File List

- shared/theme/colors.ts
- shared/theme/typography.ts
- shared/theme/spacing.ts
- shared/theme/index.ts
- shared/theme/ThemeProvider.tsx
- tailwind.config.js
- shared/components/ui/Button.tsx
- shared/components/ui/Button.test.tsx
- shared/components/ui/CardShell.tsx
- shared/components/ui/CardShell.test.tsx
- shared/components/ui/TextField.tsx
- shared/components/ui/TextField.test.tsx
- shared/components/ui/ToggleSwitch.tsx
- shared/components/ui/ToggleSwitch.test.tsx
- shared/components/ui/ColorPicker.tsx
- shared/components/ui/ColorPicker.test.tsx
- shared/components/ui/ActionRow.tsx
- shared/components/ui/ActionRow.test.tsx
- shared/components/ui/index.ts
- app/\_layout.tsx
- app/card/[id].tsx
- app/card/[id]/edit.tsx
- features/cards/components/CardDetails.tsx
- features/cards/components/CardForm.tsx
- shared/components/SyncIndicator.test.tsx
- app/**tests**/help.test.tsx
- app/**tests**/onboarding.integration.test.tsx
- app/**tests**/welcome.test.tsx
- features/auth/**tests**/CreateAccountScreen.test.tsx
- features/auth/**tests**/ForgotPasswordScreen.test.tsx
- features/auth/**tests**/MigrationBanner.test.tsx
- features/auth/**tests**/ResetPasswordScreen.test.tsx
- features/auth/**tests**/SignInScreen.test.tsx
- features/cards/components/BarcodeScanner.test.tsx
- features/cards/components/CardDetails.test.tsx
- features/cards/components/CardForm.test.tsx
- features/cards/components/CardList.test.tsx
- features/cards/components/CardTile.test.tsx
- features/cards/components/EmptyState.test.tsx
- features/privacy/**tests**/DataSummaryScreen.test.tsx
- features/settings/SettingsScreen.test.tsx
