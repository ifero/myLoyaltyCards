# Story 3.3: Add Card from Catalogue

**As a** user,
**I want** to select a brand and scan my card,
**So that** my card is saved with the official brand logo.

## Acceptance Criteria

- [ ] **Context Awareness**: The `AddCardScreen` (or scanner) knows a brand is selected (passed via params).
- [ ] **UI State**:
  - Top bar shows "Adding [Brand Name] Card".
  - Brand logo is displayed near input fields.
- [ ] **Data Persistence**:
  - When saving, `brandId` is written to the database.
  - `name` defaults to the Brand Name (user can still edit, e.g. "My Esselunga").
  - `color` defaults to the Brand's primary color (from JSON).
- [ ] **Virtual Logo Bypass**: Since `brandId` is present, the card list (Story 2.1) ensures the official logo image is rendered instead of the Virtual Logo initials.
- [ ] **Fallback**: "Enter Manually" flow also preserves the selected Brand context.

## Technical Notes

- **Database**: Ensure `brandId` column in `loyalty_cards` table is actually being used (it was defined in schema but likely null until now).
- **Navigation**:
  - Route: `/add-card/scan?brandId=xyz` or keep state in a transient store? (Route params preferred).
- **Hooks**: Update `useAddCard` to accept optional `brandId` and `brandColor`.

## Implementation Plan

1.  Update the Scanner/Manual Input screens to accept `brandId` route param.
2.  Update `useAddCard` hook to merge brand data into the form default values.
3.  Verify `CardItem` component (from Story 2.1/2.4) correctly prefers Logo Image over `VirtualLogo` when `brandId` is resolved.
4.  Add integration test: Select Brand -> Save -> Verify DB entry has `brandId`.
