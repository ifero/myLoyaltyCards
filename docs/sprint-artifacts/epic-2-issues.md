# Epic 2: Card Management & Barcode Display - GitHub Issues

This document contains GitHub issue templates for all stories in Epic 2. Each section can be used to create a GitHub issue.

**Epic 2 Goal:** Users can add their loyalty cards and display their barcodes at checkout — the core product value.

**Phase:** 1 (MVP)

**FRs Covered:** FR1-FR7, FR9-FR13, FR48-FR51, FR59-FR65 (FR8 favorites moved to Epic 9)

---

## Issue 1: Story 2.1 - Display Card List

**Title:** [Epic 2] Story 2.1: Display Card List

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `UI`

**Description:**

### User Story

**As a** user,
**I want** to see all my loyalty cards in a clean grid,
**So that** I can quickly find and access any card.

### Acceptance Criteria

**Given** I have no cards saved
**When** I view the main screen
**Then** I see a friendly empty state encouraging me to add my first card
**And** the empty state includes a prominent "Add Card" call-to-action

**Given** I have cards saved
**When** I view the main screen
**Then** I see my cards in a responsive grid (2 columns on standard phones, 3 on larger screens)
**And** each card shows its name and visual identifier (logo or Virtual Logo)
**And** cards are ordered by creation date (newest first)
**And** the list scrolls smoothly at 60fps
**And** the list works completely offline

### Technical Notes

- Phase 1 list order: newest first (createdAt descending)
- Card schema includes sorting fields (lastUsedAt, usageCount, isFavorite) but they remain inactive until Phase 2
- Responsive grid: 2 columns (standard phones), 3+ columns (larger phones/tablets)

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 1.4 (Set Up Local Database), Story 1.5 (Build App Shell)

---

## Issue 2: Story 2.2 - Add Card Manually

**Title:** [Epic 2] Story 2.2: Add Card Manually

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `feature`

**Description:**

### User Story

**As a** user,
**I want** to add a loyalty card by entering its details,
**So that** I can digitize any card even without scanning.

### Acceptance Criteria

**Given** I tap the "+" button in the header
**When** I choose to add a card manually
**Then** I see a form with fields for: card name (required, max 50 chars), barcode number (required)
**And** I can select a barcode format from a picker (Code128, EAN-13, EAN-8, QR, CODE39, UPCA)
**And** I can select a color for the card from the 5-color palette
**And** the barcode field shows a numeric keypad by default
**And** inline validation shows errors for empty required fields

**Given** I submit a valid card
**When** the save completes
**Then** the card is saved to the local database with a client-generated UUID
**And** I am returned to the card list showing my new card
**And** I see a brief success confirmation (haptic + checkmark)

### Technical Notes

- Use React Hook Form for form handling
- Use Zod schema validation (loyaltyCardSchema)
- Client-generated UUIDs
- Save to expo-sqlite database within transaction
- 5-color palette: Blue (#3B82F6), Red (#EF4444), Green (#22C55E), Orange (#F97316), Grey (#6B7280)
- Haptic feedback on success

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 1.3 (Core Data Schema), Story 1.4 (Local Database), Story 1.5 (App Shell)

---

## Issue 3: Story 2.3 - Scan Barcode with Camera

**Title:** [Epic 2] Story 2.3: Scan Barcode with Camera

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `feature`, `camera`

**Description:**

### User Story

**As a** user,
**I want** to scan a barcode using my camera,
**So that** I can add cards quickly without typing.

### Acceptance Criteria

**Given** I tap the "+" button and choose to scan
**When** I grant camera permission
**Then** I see a camera viewfinder with barcode detection active
**And** there is always a visible "Enter Manually" button below the viewfinder

**Given** the camera detects a valid barcode
**When** detection completes
**Then** the barcode value is automatically captured
**And** the detected format is identified (Code128, EAN-13, etc.)
**And** I am taken to a form pre-filled with the scanned barcode to enter a name
**And** I can save the card immediately

**Given** camera permission is denied
**When** I try to scan
**Then** I see a clear error message explaining why the camera is needed
**And** I am offered the manual entry option as fallback

### Technical Notes

- Use expo-camera for barcode scanning
- Support formats: Code128, EAN-13, EAN-8, QR, CODE39, UPCA
- Auto-detect barcode format
- Zippy Scanner Interface: viewfinder + auto-save on barcode detection
- Always provide manual entry fallback
- Handle permission denial gracefully

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.2 (Add Card Manually)

---

## Issue 4: Story 2.4 - Display Virtual Logo

**Title:** [Epic 2] Story 2.4: Display Virtual Logo

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `UI`

**Description:**

### User Story

**As a** user,
**I want** cards without official brand logos to show a distinctive visual,
**So that** I can quickly recognize any card in my list.

### Acceptance Criteria

**Given** a card does not have a brand logo (brandId is null)
**When** the card is displayed in the list
**Then** it shows a Virtual Logo: 1-3 initials from the card name on a colored background
**And** the background color is the color selected when the card was created
**And** the initials use high-contrast white text
**And** the Virtual Logo has the same dimensions as brand logos for consistent grid layout

### Technical Notes

- Virtual Logo Card: 1-3 initials + color background for cards without official logo
- Extract 1-3 initials from card name (first letter of each word, max 3)
- Use card's color property for background
- White text color for contrast
- Same dimensions as brand logos (consistent grid)
- Fallback when brandId is null

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.1 (Display Card List)

---

## Issue 5: Story 2.5 - Display Barcode (Barcode Flash)

**Title:** [Epic 2] Story 2.5: Display Barcode (Barcode Flash)

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `feature`, `critical`

**Description:**

### User Story

**As a** user,
**I want** to display my card's barcode in a format optimized for scanning,
**So that** the cashier can scan it quickly at checkout.

### Acceptance Criteria

**Given** I tap on a card in my list
**When** the barcode displays
**Then** I see the Barcode Flash overlay: full-screen white background with centered barcode
**And** the barcode is rendered in the correct format (Code128, EAN-13, QR, etc.)
**And** barcode rendering completes in ≤100ms
**And** the barcode number is displayed as text below the barcode
**And** screen brightness is maximized automatically
**And** I can dismiss the overlay by tapping anywhere or swiping

**Given** I am in a location with no network
**When** I tap on a card
**Then** the barcode displays identically (100% offline)

### Technical Notes

- Barcode Flash Overlay: full-screen, white background, centered barcode
- Multi-format barcode rendering: Code128, EAN-13, EAN-8, QR, CODE39, UPCA
- Performance target: ≤100ms rendering
- Max brightness during display
- Zero-Confirmation Policy: tap leads directly to barcode display
- Haptic feedback on tap
- Dismiss: tap anywhere or swipe gesture
- Complete offline functionality
- Barcode round-trip testing required in CI

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.1 (Display Card List)

---

## Issue 6: Story 2.6 - View Card Details

**Title:** [Epic 2] Story 2.6: View Card Details

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `UI`

**Description:**

### User Story

**As a** user,
**I want** to view all details of a card,
**So that** I can see the full barcode number and manage the card.

### Acceptance Criteria

**Given** I am viewing the Barcode Flash
**When** I tap a "Details" button or swipe up
**Then** I see the card detail screen showing:
  - Card name
  - Barcode (displayed and as text for copying)
  - Barcode format
  - Card color
  - Date added
**And** I see options to Edit or Delete the card
**And** I can return to the card list easily

### Technical Notes

- Show all card properties
- Display barcode visually and as copyable text
- Provide Edit and Delete actions
- Easy navigation back to list
- Consider swipe-up gesture from Barcode Flash

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.5 (Display Barcode)

---

## Issue 7: Story 2.7 - Edit Card

**Title:** [Epic 2] Story 2.7: Edit Card

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `feature`

**Description:**

### User Story

**As a** user,
**I want** to update my card's information,
**So that** I can fix mistakes or update details.

### Acceptance Criteria

**Given** I am viewing a card's details
**When** I tap "Edit"
**Then** I see a form pre-filled with the card's current values
**And** I can update the name, barcode, format, and color
**And** validation rules are the same as when adding

**Given** I save my changes
**When** the update completes
**Then** the card is updated in the database with a new `updatedAt` timestamp
**And** I see the updated card details
**And** I see a brief success confirmation

### Technical Notes

- Reuse form component from Story 2.2 (Add Card Manually)
- Pre-fill form with current card values
- Same validation rules as add
- Update database within transaction
- Update `updatedAt` timestamp (ISO 8601 UTC)
- Success confirmation with haptic feedback
- Preserve `id` and `createdAt` fields

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.6 (View Card Details), Story 2.2 (Add Card Manually)

---

## Issue 8: Story 2.8 - Delete Card

**Title:** [Epic 2] Story 2.8: Delete Card

**Labels:** `epic-2`, `story`, `phase-1`, `mvp`, `feature`

**Description:**

### User Story

**As a** user,
**I want** to remove a card I no longer need,
**So that** my card list stays clean and relevant.

### Acceptance Criteria

**Given** I am viewing a card's details
**When** I tap "Delete"
**Then** I see a confirmation dialog asking "Delete [Card Name]?"
**And** the dialog has Cancel and Delete buttons
**And** the Delete button is styled as destructive (red text)

**Given** I confirm deletion
**When** the delete completes
**Then** the card is removed from the database
**And** I am returned to the card list
**And** the deleted card no longer appears

### Technical Notes

- Confirmation dialog required (prevent accidental deletion)
- Destructive button style (red text)
- Delete from database within transaction
- Navigate back to card list after deletion
- Card should be immediately removed from list
- Consider: soft delete vs hard delete (hard delete for MVP)

### Related

- Epic 2: Card Management & Barcode Display
- Depends on: Story 2.6 (View Card Details)

---

## Summary

**Epic 2 consists of 8 stories:**

1. ✅ Story 2.1: Display Card List - Core UI foundation
2. ✅ Story 2.2: Add Card Manually - Primary input method
3. ✅ Story 2.3: Scan Barcode with Camera - Quick input method
4. ✅ Story 2.4: Display Virtual Logo - Visual identity for cards without logos
5. ✅ Story 2.5: Display Barcode (Barcode Flash) - Core product value
6. ✅ Story 2.6: View Card Details - Information display
7. ✅ Story 2.7: Edit Card - Update functionality
8. ✅ Story 2.8: Delete Card - Remove functionality

**Suggested Implementation Order:**
1. Stories 2.1, 2.2 (foundation)
2. Story 2.5 (core value - barcode display)
3. Story 2.4 (visual polish)
4. Story 2.6, 2.7, 2.8 (management features)
5. Story 2.3 (enhancement - camera scanning)

**Dependencies:**
- All stories depend on Epic 1 foundation (data schema, database, app shell)
- Stories build on each other in logical sequence
- Camera scanning (2.3) can be added later if needed

**Epic Status Tracking:**
Update `docs/sprint-artifacts/sprint-status.yaml` as stories progress through:
`backlog → drafted → ready-for-dev → in-progress → review → done`
