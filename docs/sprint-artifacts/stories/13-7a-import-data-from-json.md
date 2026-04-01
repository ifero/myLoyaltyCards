# Story 13.7a: Import Data from JSON

Status: ready-for-dev

## Story

As a user who previously exported my card data (or received a backup file),
I want to import cards from a JSON file back into the app,
so that I can restore my data on a new device or recover from data loss without re-entering every card manually.

## Context

Export Data (JSON) is implemented in story 13-6. Export without Import is a one-way door -- users can back up but never restore. This feature was discovered during the 12-6 design session when ifero observed that "export without import is incomplete." The Import flow was designed alongside Export in the 12-6 Figma deliverables.

**Origin:** Discovered during 12-6 design session
**Depends on:** 13-6 (settings screen scaffold + export format definition)
**Figma:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test — Settings page (Import frames)

## Acceptance Criteria

### AC1: Import Entry Point

- [ ] "Import Data" ActionRow in Settings Data Management section (MI: file-upload icon)
- [ ] Tapping opens system file picker via `DocumentPicker.getDocumentAsync()` from expo-document-picker
- [ ] File picker filters for JSON files (`.json` mime type)
- [ ] Works in both light and dark mode

### AC2: Import Preview & Confirmation

- [ ] Valid JSON selected → preview bottom sheet appears
- [ ] Shows: file name, number of cards found, duplicate handling note ("X cards will be added. Duplicates will be skipped.")
- [ ] Two CTAs: "Cancel" (secondary outlined), "Import" (primary filled)
- [ ] Light + dark mode bottom sheet styling matching 13-6 bottom sheet patterns

### AC3: Successful Import

- [ ] Cards from file added to local SQLite database via transaction
- [ ] Duplicates skipped (matched by barcode value + programme/brandId combination)
- [ ] Success confirmation: "X cards imported successfully" (toast or bottom sheet update)
- [ ] Imported cards appear in card list immediately
- [ ] If user is signed in, triggers cloud sync for newly imported cards

### AC4: Invalid File Handling

- [ ] Non-JSON file or malformed JSON → error state in bottom sheet
- [ ] Error icon (MI: error-outline) in amber/warning color
- [ ] Message: "This file doesn't contain valid card data. Please select a different file."
- [ ] Single "OK" button to dismiss
- [ ] No data modified on error

### AC5: Empty File Handling

- [ ] Valid JSON with zero cards → message: "This file contains no card data."
- [ ] Single "OK" button to dismiss
- [ ] No data modified

### AC6: Schema Validation

- [ ] JSON must match the Export format from 13-6 (cards array with required fields)
- [ ] Validate using Zod schema (reuse or extend `loyaltyCardSchema` from `core/schemas/card.ts`)
- [ ] Partial import: if some cards valid and some invalid, import valid ones and report count of skipped invalid entries

### AC7: All Tests Pass

- [ ] Unit tests for JSON parsing, validation, duplicate detection, import logic
- [ ] Component tests for bottom sheet states (preview, error, empty, success)
- [ ] All existing tests still pass
- [ ] 80% coverage threshold maintained

## Tasks / Subtasks

- [ ] **Task 1: Install expo-document-picker** (AC: 1)
  - [ ] Add `expo-document-picker` dependency
  - [ ] Verify Expo config plugin setup if needed

- [ ] **Task 2: Create import service** (AC: 3, 4, 5, 6)
  - [ ] Create `core/settings/importCards.ts` (or extend existing settings module)
  - [ ] Implement JSON parsing and Zod validation
  - [ ] Implement duplicate detection logic (barcode + brandId match)
  - [ ] Implement database insert via transaction
  - [ ] Implement sync trigger for signed-in users
  - [ ] Create `core/settings/importCards.test.ts`

- [ ] **Task 3: Create ImportPreviewSheet component** (AC: 2)
  - [ ] Create `features/settings/components/ImportPreviewSheet.tsx`
  - [ ] Display file name, card count, duplicate note
  - [ ] Cancel and Import CTAs
  - [ ] Reuse bottom sheet pattern from 13-6 (export/sign-out sheets)
  - [ ] Create test file

- [ ] **Task 4: Create ImportErrorSheet component** (AC: 4, 5)
  - [ ] Create `features/settings/components/ImportErrorSheet.tsx`
  - [ ] Error state: MI: error-outline icon, error message, OK button
  - [ ] Empty state: informational message, OK button
  - [ ] Create test file

- [ ] **Task 5: Wire import flow into settings screen** (AC: 1)
  - [ ] Add Import ActionRow to Data Management section (already scaffolded in 13-6)
  - [ ] Wire document picker trigger
  - [ ] Connect preview/error sheets to picker result

- [ ] **Task 6: Run full test suite** (AC: 7)
  - [ ] All new tests pass
  - [ ] All existing tests pass
  - [ ] Coverage threshold met

## Dev Notes

### Files to Create

| File                                                  | Purpose                                            |
| ----------------------------------------------------- | -------------------------------------------------- |
| `core/settings/importCards.ts`                        | Import logic: parse, validate, deduplicate, insert |
| `core/settings/importCards.test.ts`                   | Unit tests for import logic                        |
| `features/settings/components/ImportPreviewSheet.tsx` | Preview bottom sheet                               |
| `features/settings/components/ImportErrorSheet.tsx`   | Error/empty bottom sheet                           |
| + corresponding test files                            |

### Files to Modify

| File                                                  | Change                         |
| ----------------------------------------------------- | ------------------------------ |
| `features/settings/` (main settings screen from 13-6) | Wire import ActionRow + sheets |
| `package.json`                                        | Add expo-document-picker       |

### Export JSON Schema (must match)

The import schema must match whatever 13-6 defines for export. Expected shape:

```typescript
{
  exportedAt: string; // ISO 8601
  appVersion: string;
  cards: Array<{
    name: string;
    barcode: string;
    barcodeFormat: 'CODE128' | 'EAN13' | 'EAN8' | 'QR' | 'CODE39' | 'UPCA';
    brandId: string | null;
    color: string;
    // ... other LoyaltyCard fields
  }>;
}
```

### Duplicate Detection

Match on `barcode` + `brandId` combination. If both match an existing card, skip. This prevents double-imports but allows same barcode for different programmes.

### Architecture Compliance

- Import logic in `core/settings/` (business logic, no React)
- UI components in `features/settings/components/`
- Zod validation reuses/extends existing schema from `core/schemas/card.ts`
- Database writes use `withTransactionAsync`
- File picker uses Expo SDK (expo-document-picker)

### Icon References

- `MI: file-upload` — Import Data ActionRow icon
- `MI: error-outline` — Error state icon

### Figma Frame References

| Frame                                    | Content                             |
| ---------------------------------------- | ----------------------------------- |
| Import Data preview — Light              | Bottom sheet with card count + CTAs |
| Import Data preview — Dark               | Dark variant                        |
| Import Data — invalid file error — Light | Error state bottom sheet            |
| Import Data — invalid file error — Dark  | Dark variant                        |

### References

- [Source: docs/sprint-artifacts/stories/12-6-settings-screen.md — Import frames designed here]
- [Source: docs/sprint-artifacts/stories/13-6-implement-settings-screen.md — Settings scaffold this builds on]
- [Source: core/schemas/card.ts — LoyaltyCard Zod schema for validation]
- [Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test — Settings page]

## Blocks

- **Blocked by:** 13-6 (settings screen scaffold must exist, export format must be defined)
- **Depends on:** 13-1 (design system tokens and shared components)

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
