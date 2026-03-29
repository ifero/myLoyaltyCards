# Story 13.7a: Import Data from JSON

**Epic:** 13 - UI Implementation
**Type:** Feature
**Status:** drafted
**Sprint:** TBD (after Epic 12 design approval)
**Depends On:** 13-6 (Implement Settings Screen)
**Origin:** Discovered during 12-6 design session — Export without Import is incomplete

---

## Story

**As a** user who previously exported my card data (or received a backup file),
**I want** to import cards from a JSON file back into the app,
**So that** I can restore my data on a new device or recover from data loss without re-entering every card manually.

---

## Context & Motivation

- Export Data (JSON) is designed in story 12-6 and will be implemented in 13-6
- Export without Import is a one-way door — users can back up but never restore
- Key use cases: new device migration, reinstall recovery, sharing card collections
- The Import flow was designed alongside Export in the 12-6 Figma deliverables

---

## Acceptance Criteria

### AC1: Import Entry Point

```
Given I am on the settings screen
And I tap "Import Data"
Then the system file picker opens
And I can select a JSON file from device storage
```

### AC2: Import Preview & Confirmation

```
Given I have selected a valid JSON file
Then a preview bottom sheet shows:
  - The file name
  - Number of cards found in the file
  - Duplicate handling note: "X cards will be added. Duplicates will be skipped."
And I see two CTAs:
  - "Cancel" (secondary outlined)
  - "Import" (primary filled)
```

### AC3: Successful Import

```
Given I tap "Import" on the preview sheet
Then the cards from the file are added to my local database
And duplicate cards (matched by barcode value + programme) are skipped
And I see a success confirmation: "X cards imported successfully"
And the imported cards appear in my card list
```

### AC4: Invalid File Handling

```
Given I select a file that is not valid JSON
Or the JSON does not match the expected card data schema
Then I see an error state in the bottom sheet:
  - Error icon (MI: error-outline) in amber
  - Message: "This file doesn't contain valid card data. Please select a different file."
  - Single "OK" button to dismiss
And no data is modified
```

### AC5: Empty File Handling

```
Given I select a valid JSON file that contains zero cards
Then I see a message: "This file contains no card data."
And a single "OK" button to dismiss
And no data is modified
```

---

## Technical Notes

- JSON schema must match the Export format (cards array with programme, barcode, notes, etc.)
- Use `DocumentPicker.getDocumentAsync()` from expo-document-picker for file selection
- Parse and validate JSON before showing preview
- Duplicate detection: match on barcode_value + programme_id combination
- Imported cards should trigger sync if user is signed in

---

## Design Reference

- Figma frames designed in Story 12-6 Settings page:
  - Import Data Preview (bottom sheet) — light + dark
  - Import Data — Invalid File error state (bottom sheet) — light + dark
