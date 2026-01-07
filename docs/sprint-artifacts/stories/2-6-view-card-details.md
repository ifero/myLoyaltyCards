# Story 2.6: View Card Details

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.6                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | ready-for-dev                         |
| **Priority** | High                                  |
| **Estimate** | Medium (1-2 days)                     |

---

## User Story

**As a** user,  
**I want** to view all details of a card,  
**So that** I can see the full barcode number and manage the card.

---

## Acceptance Criteria

### AC1: Access Card Details

```gherkin
Given I am viewing my card list
When I tap on a card
Then I navigate to the Card Details screen
And the transition is smooth (standard push animation)
```

### AC2: Card Information Display

```gherkin
Given I am on the Card Details screen
When the screen loads
Then I see the following information:
  - Card name (large, prominent)
  - Virtual Logo (or brand logo when available)
  - Barcode displayed as image
  - Barcode number as copyable text
  - Barcode format (e.g., "Code 128")
  - Card color indicator
  - Date added (formatted nicely, e.g., "Jan 7, 2026")
```

### AC3: Copy Barcode Number

```gherkin
Given I am viewing card details
When I tap the barcode number text
Then the barcode number is copied to clipboard
And I see a brief confirmation: "Copied to clipboard"
And I feel haptic feedback
```

### AC4: Action Buttons

```gherkin
Given I am viewing card details
When I scroll to the bottom
Then I see two action buttons:
  - "Edit Card" (primary style)
  - "Delete Card" (destructive style - red text)
And both buttons are clearly labeled and accessible
```

### AC5: Edit Navigation

```gherkin
Given I am on the Card Details screen
When I tap "Edit Card"
Then I navigate to the Edit Card screen (Story 2.7)
And the form is pre-filled with the current card data
```

### AC6: Delete Navigation

```gherkin
Given I am on the Card Details screen
When I tap "Delete Card"
Then I see a confirmation dialog (Story 2.8)
And I can confirm or cancel the deletion
```

### AC7: Back Navigation

```gherkin
Given I am on the Card Details screen
When I tap the back button OR swipe from left edge
Then I return to the card list
```

### AC8: Full-Screen Barcode (Barcode Flash)

```gherkin
Given I am viewing card details
When I tap on the barcode image OR tap "Show Full Screen" button
Then the Barcode Flash overlay opens (Story 2.5)
And the screen brightness is maximized
And I can dismiss it to return to Card Details
```

---

## Technical Requirements

### Dependencies

- `expo-clipboard` - Copy to clipboard functionality
- `expo-haptics` - Haptic feedback
- `@/core/database` - Card repository for fetching
- `@/core/schemas` - LoyaltyCard type

### New Files to Create

| File                                        | Purpose                           |
| ------------------------------------------- | --------------------------------- |
| `features/cards/components/CardDetails.tsx` | Card details display component    |
| `features/cards/components/DetailRow.tsx`   | Reusable detail row component     |
| `app/card/[id].tsx`                         | Card details screen (Expo Router) |

### Files to Modify

| File                                     | Changes                          |
| ---------------------------------------- | -------------------------------- |
| `app/_layout.tsx`                        | Add card details screen to stack |
| `features/cards/components/CardTile.tsx` | Navigate to card details on tap  |
| `features/cards/index.ts`                | Export details components        |

### Navigation Flow

```
Card List (app/index.tsx)
    └── CardTile.onPress
        └── router.push(`/card/${card.id}`)
            └── Card Details (app/card/[id].tsx)
                    │
                    ├── tap barcode → Barcode Flash (overlay)
                    │                     └── dismiss → back to Card Details
                    │
                    ├── Edit → Edit Screen (Story 2.7)
                    ├── Delete → Confirmation (Story 2.8)
                    └── Back → Card List
```

### Data Requirements

Card details fetched from local database:

```typescript
const card = await cardRepository.getById(id);
// Returns: LoyaltyCard | null
```

### Date Formatting

```typescript
import { format } from 'date-fns';

function formatDate(isoString: string): string {
  return format(new Date(isoString), 'MMM d, yyyy');
  // e.g., "Jan 7, 2026"
}
```

### Copy to Clipboard

```typescript
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

async function copyBarcode(barcode: string) {
  await Clipboard.setStringAsync(barcode);
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  // Show toast notification
}
```

---

## UI/UX Specifications

### Layout

- ScrollView for content (in case of long details)
- 16px horizontal padding
- Card visual (Virtual Logo) centered at top, 120px size
- Card name below visual, 24px font, bold, centered
- Details section with labeled rows
- Action buttons at bottom with 16px spacing

### Detail Rows

Each detail row:

- Label: 14px, secondary text color, left-aligned
- Value: 16px, primary text color, right-aligned
- Full width with space-between
- 12px vertical padding per row
- Subtle divider line between rows

### Details to Show

| Label   | Value                              |
| ------- | ---------------------------------- |
| Barcode | (rendered barcode image, tappable) |
| Number  | 1234567890 (with copy icon)        |
| Format  | Code 128                           |
| Color   | Blue (with color dot indicator)    |
| Added   | Jan 7, 2026                        |

### Barcode Section

- Small barcode preview (60% width, centered)
- Tappable to open full Barcode Flash
- "Tap to enlarge" hint text below

### Action Buttons

- Edit Card:
  - Full width, 48px height
  - Sage Green background (#73A973)
  - White text, semibold
- Delete Card:
  - Full width, 48px height
  - Transparent background
  - Red text (#EF4444)
  - 16px gap from Edit button

### Copy Feedback

- Toast notification: "Copied to clipboard ✓"
- Position: Bottom of screen, above safe area
- Duration: 2 seconds
- Style: Dark background, white text

---

## Testing Checklist

### Manual Testing

- [ ] Tapping card in list opens Card Details screen
- [ ] Card name displays correctly
- [ ] Virtual Logo displays correctly
- [ ] Barcode preview displays correctly
- [ ] Barcode number displays correctly
- [ ] Barcode format displays correctly
- [ ] Card color indicator displays correctly
- [ ] Date added displays in readable format
- [ ] Tap barcode number copies to clipboard
- [ ] Copy confirmation toast appears
- [ ] Haptic feedback on copy
- [ ] Tap barcode preview opens Barcode Flash
- [ ] "Edit Card" button navigates to edit screen
- [ ] "Delete Card" button shows confirmation
- [ ] Back button returns to card list
- [ ] Swipe back gesture works (iOS)

### Edge Cases

- [ ] Long card name wraps or truncates gracefully
- [ ] Long barcode number scrolls or wraps
- [ ] Card not found shows error state
- [ ] All 6 barcode formats display correctly

### Accessibility Testing

- [ ] Screen reader announces all details
- [ ] Copy action is announced
- [ ] Buttons have proper labels
- [ ] Touch targets meet 44x44px minimum

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] Clipboard functionality working
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- **This is the primary destination when tapping a card** (changed from Barcode Flash)
- This screen is the "hub" for card management actions
- Edit and Delete stories (2.7, 2.8) build on this screen
- Consider adding "Favorite" toggle here (for Phase 2 Epic 9)
- The embedded barcode should be scannable at medium size
- Full-screen mode (Barcode Flash) available for optimal scanning conditions

---

## References

- [Epic 2 in epics.md](../epics.md#story-26-view-card-details)
- [UX Design: Card Detail Screen](../ux-design-specification.md)
