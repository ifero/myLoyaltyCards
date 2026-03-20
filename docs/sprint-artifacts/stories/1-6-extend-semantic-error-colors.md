# Story 1.6: Extend Semantic Error Color Tokens

## Story Information

| Field        | Value                              |
| ------------ | ---------------------------------- |
| **Story ID** | 1.6                                |
| **Epic**     | 1 - Project Foundation & App Shell |
| **Sprint**   | Backlog                            |
| **Status**   | drafted                            |
| **Priority** | Low                                |
| **Estimate** | Small (< 1 day)                    |
| **Assigned** | Sally (UX Designer)                |

---

## User Story

**As a** developer,  
**I want** consistent error/destructive color tokens (background, text, border) in the design system,  
**So that** components don't hardcode hex color values and the palette stays consistent across the app.

---

## Context

Story 6.14 (Upgrade Guest to Account) introduced `MigrationBanner.tsx` which needed error-state colors beyond what `SEMANTIC_COLORS` currently provides. Only `SEMANTIC_COLORS.error` (`#EF4444`) existed — the error background and error text colors were added as local constants with a TODO.

As the app grows (delete-account confirmation, sync error states, form validation), more components will need these tokens. Defining them centrally avoids drift.

---

## Acceptance Criteria

### AC1: Extended Error Palette

```gherkin
Given the design system color tokens in shared/theme/colors.ts
When I need to render an error/destructive UI state
Then I can use semantic tokens for error background, error text, and error border
And these tokens are available in both light and dark themes
```

### AC2: Dark Mode Error Tokens

```gherkin
Given the app is in dark mode
When an error state banner or alert is displayed
Then the error colors have appropriate contrast for dark backgrounds
And meet WCAG AA contrast ratio (4.5:1 for text)
```

---

## Technical Details

### Current State

```typescript
// shared/theme/colors.ts — SEMANTIC_COLORS
export const SEMANTIC_COLORS = {
  success: '#22C55E',
  error: '#EF4444', // ← only error token today
  warning: '#F97316',
  info: '#3B82F6'
} as const;
```

### Proposed Extension

Sally to define the exact color values. Suggested structure:

```typescript
export const SEMANTIC_COLORS = {
  success: '#22C55E',
  successBg: '...', // light green background
  successText: '...', // dark green text

  error: '#EF4444',
  errorBg: '...', // currently hardcoded as #FEF2F2 in MigrationBanner
  errorText: '...', // currently hardcoded as #991B1B in MigrationBanner

  warning: '#F97316',
  warningBg: '...',
  warningText: '...',

  info: '#3B82F6',
  infoBg: '...',
  infoBg: '...',
  infoText: '...'
} as const;
```

### Files to Update After Design

- `shared/theme/colors.ts` — add tokens
- `features/auth/MigrationBanner.tsx` — replace `ERROR_BG`, `ERROR_TEXT` constants with theme tokens
- Any other components using hardcoded error/warning/success colors

---

## Acceptance Checklist

- [ ] Sally defines extended semantic color palette (bg, text, border for each status)
- [ ] Dark mode variants defined with WCAG AA contrast verification
- [ ] `SEMANTIC_COLORS` extended in `shared/theme/colors.ts`
- [ ] `MigrationBanner.tsx` updated to use new tokens (remove TODO)
- [ ] Existing components audited for hardcoded status colors

---

**Linked Epic:** Epic 1  
**Origin:** Story 6.14 code review — follow-up for hardcoded error colors in MigrationBanner
