# Story 2.2: Add Card Manually

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.2                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | ready-for-dev                         |
| **Priority** | High                                  |
| **Estimate** | Large (2-3 days)                      |

---

## User Story

**As a** user,  
**I want** to add a loyalty card by entering its details,  
**So that** I can digitize any card even without scanning.

---

## Acceptance Criteria

### AC1: Access Add Card Form

```gherkin
Given I am on the main card list screen
When I tap the "+" button in the header
Then I navigate to the Add Card screen
And I see a form for entering card details
```

### AC2: Form Fields

```gherkin
Given I am on the Add Card screen
When the form loads
Then I see the following fields:
  - Card Name (text input, required)
  - Barcode Number (text input, required)
  - Barcode Format (picker/selector)
  - Card Color (color picker with 5 options)
And the Card Name field is auto-focused
And the keyboard appears automatically
```

### AC3: Card Name Validation

```gherkin
Given I am filling out the add card form
When I enter a card name
Then the name is limited to 50 characters maximum
And I see a character counter (e.g., "15/50")

When I try to submit with an empty card name
Then I see an inline error: "Card name is required"
And the field is highlighted with error styling (red border)
And focus moves to the card name field
```

### AC4: Barcode Number Input

```gherkin
Given I am entering a barcode number
When I tap the barcode number field
Then the numeric keypad appears (not full keyboard)
And I can enter digits and some special characters

When I try to submit with an empty barcode
Then I see an inline error: "Barcode number is required"
```

### AC5: Barcode Format Selection

```gherkin
Given I am selecting a barcode format
When I tap the format picker
Then I see options for:
  - Code 128 (default)
  - EAN-13
  - EAN-8
  - QR Code
  - Code 39
  - UPC-A
And the default selection is "Code 128"
```

### AC6: Card Color Selection

```gherkin
Given I am selecting a card color
When I see the color picker
Then I see 5 color options displayed as circles:
  - Blue (#3B82F6)
  - Red (#EF4444)
  - Green (#22C55E)
  - Orange (#F97316)
  - Grey (#6B7280) - default
And I can tap to select a color
And the selected color shows a checkmark or border
```

### AC7: Successful Save

```gherkin
Given I have filled in valid card details:
  - Name: "Test Store"
  - Barcode: "1234567890"
  - Format: "Code 128"
  - Color: "Blue"
When I tap the "Save" button
Then the card is saved to the local database
And a UUID is generated for the card
And createdAt and updatedAt timestamps are set to now
And usageCount is set to 0
And isFavorite is set to false
And lastUsedAt is set to null
And brandId is set to null (custom card)
And I see a brief success feedback (haptic + toast/checkmark)
And I am navigated back to the card list
And the new card appears at the top of the list
```

### AC8: Cancel/Back Navigation

```gherkin
Given I have partially filled the form
When I tap the back button
Then I see a confirmation dialog: "Discard changes?"
And I can choose "Discard" or "Keep Editing"

Given I have not entered any data
When I tap the back button
Then I navigate back immediately (no confirmation)
```

### AC9: Form Persistence (Optional Enhancement)

```gherkin
Given I am filling out the form
When I accidentally close the app
Then when I return, I see my form data is cleared (fresh start)
(Note: Form persistence is NOT required for MVP)
```

---

## Technical Requirements

### Dependencies

- `react-hook-form` - Form state management
- `zod` - Validation (using existing `loyaltyCardSchema`)
- `@/core/database` - Card repository for saving
- `@/core/schemas` - LoyaltyCard type, BarcodeFormat, CardColor
- `expo-haptics` - Haptic feedback on save
- `burnt` - Native toast notifications

### New Files to Create

| File                                         | Purpose                                |
| -------------------------------------------- | -------------------------------------- |
| `features/cards/components/CardForm.tsx`     | **Shared** form component (Add & Edit) |
| `features/cards/components/ColorPicker.tsx`  | 5-color selection component            |
| `features/cards/components/FormatPicker.tsx` | Barcode format selection               |
| `features/cards/hooks/useAddCard.ts`         | Hook for form submission logic         |

### Files to Modify

| File                      | Changes                         |
| ------------------------- | ------------------------------- |
| `app/add-card.tsx`        | Integrate AddCardForm component |
| `features/cards/index.ts` | Export new components           |

### Data Flow

```
app/add-card.tsx
    └── CardForm (shared component)
        ├── useForm() (react-hook-form)
        ├── zodResolver(cardInputSchema)
        ├── ColorPicker → setValue('color', ...)
        ├── FormatPicker → setValue('barcodeFormat', ...)
        └── onSubmit → useAddCard()
            └── cardRepository.create(cardData)
                └── Burnt.toast({ title: 'Card added', preset: 'done' })
                └── navigate back to index
```

### Form Schema (for react-hook-form)

```typescript
const addCardSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(50),
  barcode: z.string().min(1, 'Barcode number is required'),
  barcodeFormat: barcodeFormatSchema.default('CODE128'),
  color: cardColorSchema.default('grey'),
});

type AddCardInput = z.infer<typeof addCardSchema>;
```

### Shared CardForm Component

The `CardForm` component is shared between Add Card (this story) and Edit Card (Story 2.7):

```typescript
interface CardFormProps {
  defaultValues?: Partial<CardFormInput>;
  onSubmit: (data: CardFormInput) => Promise<void>;
  submitLabel: string; // "Add Card" or "Save"
  isLoading?: boolean;
}

// Usage in Add Card:
<CardForm
  onSubmit={handleAddCard}
  submitLabel="Add Card"
/>

// Usage in Edit Card (Story 2.7):
<CardForm
  defaultValues={existingCard}
  onSubmit={handleUpdateCard}
  submitLabel="Save"
/>
```

### Card Creation Logic

```typescript
async function createCard(input: AddCardInput): Promise<LoyaltyCard> {
  const now = new Date().toISOString();
  const card: LoyaltyCard = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    barcode: input.barcode.trim(),
    barcodeFormat: input.barcodeFormat,
    brandId: null, // Custom card
    color: input.color,
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  await cardRepository.create(card);
  return card;
}
```

---

## UI/UX Specifications

### Layout

- Single column form layout
- 16px horizontal padding
- 16px vertical spacing between fields
- Sticky "Save" button at bottom (or in header)

### Form Field Styling

- Label above input (12px, secondary text color)
- Input with border (1px, border color from theme)
- 12px padding inside inputs
- 8px border radius
- Error state: red border (#EF4444), red error text below

### Color Picker

- Horizontal row of 5 circles
- Each circle: 44px diameter (touch target)
- 8px gap between circles
- Selected: 2px white border + checkmark overlay

### Format Picker

- Native picker on iOS (ActionSheet style)
- Dropdown or modal on Android
- Current selection displayed in a button/field

### Save Button

- Full width, 48px height
- Sage Green background (#73A973)
- White text, 16px, semibold
- Disabled state: 50% opacity when form invalid

### Haptic Feedback

- `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` on save

### Toast Notification

```typescript
import * as Burnt from 'burnt';

// On successful save:
Burnt.toast({
  title: 'Card added',
  preset: 'done', // Shows ✓ checkmark
});
```

---

## Testing Checklist

### Manual Testing

- [ ] Form displays all fields correctly
- [ ] Card name auto-focuses on load
- [ ] Character counter works for card name
- [ ] Numeric keypad shows for barcode field
- [ ] All 6 barcode formats are selectable
- [ ] All 5 colors are selectable with visual feedback
- [ ] Save button is disabled when form is invalid
- [ ] Inline validation errors display correctly
- [ ] Successful save shows haptic + visual feedback
- [ ] Navigation back to card list works
- [ ] New card appears in list immediately
- [ ] Back button shows confirmation when data entered
- [ ] Back button navigates directly when no data

### Edge Cases

- [ ] Very long card name (50 chars) displays correctly
- [ ] Card name with special characters saves correctly
- [ ] Barcode with leading zeros saves correctly
- [ ] Rapid double-tap on save doesn't create duplicate

### Accessibility Testing

- [ ] All form fields have accessible labels
- [ ] Error messages are announced by screen reader
- [ ] Color picker is accessible (color names announced)

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] react-hook-form integration working
- [ ] Zod validation working
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android simulators
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- This story creates custom cards only (no brand/catalogue integration)
- Catalogue-based card addition is in Epic 3
- Camera scanning is in Story 2.3 (can be done in parallel)
- The form can pre-fill barcode from scan results (integration point)
- **CardForm is a shared component** — also used by Edit Card (Story 2.7)
- Install toast library: `npx expo install burnt`

---

## References

- [Epic 2 in epics.md](../epics.md#story-22-add-card-manually)
- [UX Design: Form Patterns](../ux-design-specification.md)
- [Architecture: Form Handling](../architecture.md)
