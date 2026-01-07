# Story 2.7: Edit Card

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.7                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | ready-for-dev                         |
| **Priority** | Medium                                |
| **Estimate** | Medium (1-2 days)                     |

---

## User Story

**As a** user,  
**I want** to update my card's information,  
**So that** I can fix mistakes or update details.

---

## Acceptance Criteria

### AC1: Access Edit Form

```gherkin
Given I am viewing a card's details (Story 2.6)
When I tap "Edit Card"
Then I see an edit form pre-filled with the current card values
And the screen title is "Edit Card"
```

### AC2: Pre-Filled Form

```gherkin
Given I am editing a card named "Test Store" with barcode "1234567890"
When the edit form loads
Then the Card Name field shows "Test Store"
And the Barcode Number field shows "1234567890"
And the Barcode Format picker shows the current format
And the Card Color picker shows the current color selected
```

### AC3: Edit Card Name

```gherkin
Given I am editing a card
When I change the Card Name from "Test Store" to "My Grocery Store"
And I tap "Save"
Then the card name is updated in the database
And I return to the card details screen
And the new name "My Grocery Store" is displayed
```

### AC4: Edit Barcode Number

```gherkin
Given I am editing a card
When I change the Barcode Number
And I tap "Save"
Then the barcode is updated in the database
And the Barcode Flash shows the new barcode
```

### AC5: Edit Barcode Format

```gherkin
Given I am editing a card with format "Code 128"
When I change the format to "EAN-13"
And I tap "Save"
Then the barcode format is updated
And the barcode renders in the new format
```

### AC6: Edit Card Color

```gherkin
Given I am editing a card with color "Blue"
When I select "Orange" from the color picker
And I tap "Save"
Then the card color is updated
And the Virtual Logo displays with orange background
```

### AC7: Validation Rules

```gherkin
Given I am editing a card
When I clear the Card Name field (make it empty)
And I try to save
Then I see an inline error: "Card name is required"
And the save is blocked

When I clear the Barcode Number field
And I try to save
Then I see an inline error: "Barcode number is required"
And the save is blocked
```

### AC8: Timestamp Update

```gherkin
Given I am editing a card
When I save changes
Then the card's updatedAt timestamp is set to the current time
And the createdAt timestamp remains unchanged
```

### AC9: Save Success Feedback

```gherkin
Given I have made changes to a card
When I tap "Save" and the update succeeds
Then I see a brief success feedback (haptic + toast)
And I am navigated back to the card details screen
And the updated information is displayed immediately
```

### AC10: Cancel/Discard Changes

```gherkin
Given I have made changes to the form
When I tap the back button
Then I see a confirmation: "Discard changes?"
And I can choose "Discard" or "Keep Editing"

Given I have not made any changes
When I tap the back button
Then I navigate back immediately (no confirmation)
```

### AC11: No Changes Detection

```gherkin
Given I am editing a card
When I have not changed any values
Then the "Save" button shows "No changes" state (disabled or different text)
And tapping it does nothing or navigates back
```

---

## Technical Requirements

### Dependencies

- `react-hook-form` - Form state management
- `zod` - Validation
- `@/core/database` - Card repository for updating
- `@/core/schemas` - LoyaltyCard type
- `expo-haptics` - Haptic feedback
- `burnt` - Native toast notifications

### New Files to Create

| File                                  | Purpose                        |
| ------------------------------------- | ------------------------------ |
| `features/cards/hooks/useEditCard.ts` | Hook for edit submission logic |
| `app/card/[id]/edit.tsx`              | Edit screen (Expo Router)      |

**Note:** Uses shared `CardForm` component created in Story 2.2 — no new form component needed.

### Files to Modify

| File                                        | Changes                  |
| ------------------------------------------- | ------------------------ |
| `features/cards/components/CardDetails.tsx` | Navigate to edit screen  |
| `app/_layout.tsx`                           | Add edit screen to stack |
| `features/cards/index.ts`                   | Export useEditCard hook  |

### Shared CardForm Usage

This story uses the shared `CardForm` component created in Story 2.2:

```typescript
// In app/card/[id]/edit.tsx
import { CardForm } from '@/features/cards';
import * as Burnt from 'burnt';

export default function EditCardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { card, isLoading } = useCard(id);
  const { updateCard, isUpdating } = useEditCard();

  const handleSubmit = async (data: CardFormInput) => {
    await updateCard(id, data);
    Burnt.toast({ title: 'Card saved', preset: 'done' });
    router.back();
  };

  return (
    <CardForm
      defaultValues={card}
      onSubmit={handleSubmit}
      submitLabel="Save"
      isLoading={isUpdating}
    />
  );
}
```

### Update Logic

```typescript
import * as Burnt from 'burnt';

async function updateCard(id: string, input: CardFormInput): Promise<LoyaltyCard> {
  const now = new Date().toISOString();
  const updates = {
    name: input.name.trim(),
    barcode: input.barcode.trim(),
    barcodeFormat: input.barcodeFormat,
    color: input.color,
    updatedAt: now,
  };
  await cardRepository.update(id, updates);
  return cardRepository.getById(id);
}

// On success:
Burnt.toast({ title: 'Card saved', preset: 'done' });
```

### Dirty State Detection

```typescript
const {
  formState: { isDirty },
} = useForm({
  defaultValues: existingCard,
});

// isDirty = true when any field has changed from default
```

---

## UI/UX Specifications

### Layout

- Same layout as Add Card form (Story 2.2)
- Screen title: "Edit Card"
- Save button instead of "Add Card" button

### Differences from Add Form

| Aspect         | Add Card              | Edit Card                     |
| -------------- | --------------------- | ----------------------------- |
| Title          | "Add Card"            | "Edit Card"                   |
| Button         | "Add Card"            | "Save"                        |
| Initial values | Empty (with defaults) | Pre-filled from existing card |
| On success     | Navigate to card list | Navigate to card details      |

### Form Fields (Same as Add)

- Card Name (text, required, max 50)
- Barcode Number (text, required, numeric keyboard)
- Barcode Format (picker)
- Card Color (5-color picker)

### Discard Changes Dialog

- Title: "Discard changes?"
- Message: "You have unsaved changes that will be lost."
- Buttons: "Discard" (destructive), "Keep Editing" (primary)

### Save Button States

- Default: Sage Green background, "Save" text
- No changes: Grey background, "No changes" or disabled
- Saving: Loading spinner, disabled

---

## Testing Checklist

### Manual Testing

- [ ] Edit screen opens from card details
- [ ] Form is pre-filled with current values
- [ ] Card name can be edited
- [ ] Barcode number can be edited
- [ ] Barcode format can be changed
- [ ] Card color can be changed
- [ ] Validation errors display for empty fields
- [ ] Save button disabled when no changes made
- [ ] Successful save shows feedback
- [ ] Navigate back to details after save
- [ ] Updated values display correctly
- [ ] updatedAt timestamp is updated
- [ ] Discard dialog appears when changes made
- [ ] Discard dialog does NOT appear when no changes

### Edge Cases

- [ ] Edit card with very long name
- [ ] Change barcode format and verify rendering
- [ ] Rapid save button taps don't cause issues
- [ ] Network offline still allows save (local DB)

### Accessibility Testing

- [ ] Form fields have accessible labels
- [ ] Error messages are announced
- [ ] Dialog is accessible

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] Shared form components with Add Card
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- **Uses shared `CardForm` component** from Story 2.2 — no duplicate form code
- This story completes the CRUD operations (Create in 2.2, Read in 2.1/2.6, Update here, Delete in 2.8)
- The edit form should feel familiar to users who've used the add form
- Toast library: `burnt` (native toasts)

---

## References

- [Epic 2 in epics.md](../epics.md#story-27-edit-card)
- [Story 2.2: Add Card Manually](./2-2-add-card-manually.md)
- [Story 2.6: View Card Details](./2-6-view-card-details.md)
