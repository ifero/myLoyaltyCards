# Story 5.4: Display Barcode on Watch

## Story Information

| Field        | Value                                                   |
| ------------ | ------------------------------------------------------- |
| **Story ID** | 5.4                                                     |
| **Epic**     | 5 - Apple Watch App                                     |
| **Sprint**   | 4                                                       |
| **Status**   | in-progress                                             |
| **Priority** | High                                                    |
| **Estimate** | Medium (1-2 days)                                       |
| **Owners**   | PM: John · UX: Sally · Dev: Amelia · Tech Writer: Paige |

---

## User Story

**As a** user,
**I want** to display a barcode on my watch instantly,
**So that** it can be scanned at checkout without delay.

---

## Acceptance Criteria

### AC1: Tap to Display

```gherkin
Given I see my card list on watch
When I tap a card
Then the barcode displays immediately on a white background
And I feel haptic feedback confirming the tap
```

### AC2: Close Behavior

```gherkin
Given the barcode is displayed
When I tap the screen or press the Digital Crown
Then I return to the card list
```

### AC3: Offline

```gherkin
Given the watch is offline
When I tap a card
Then the barcode still displays correctly
```

---

## Technical Requirements

- Full-screen Barcode Flash view (white background)
- Haptic feedback on tap (watchOS haptic)
- Render barcode in the correct format per card data
- Display card name on the barcode screen (top or bottom)
- Maximize brightness if allowed by platform guidelines
- Companion-only: no editing or card creation actions from the barcode screen

Testing notes:

- Validate rendering for Code128, EAN-13, EAN-8, QR, CODE39, UPCA
- Measure tap-to-display latency (target ≤1s)

---

## Tasks/Subtasks

- [x] Implement BarcodeFlashView in watch-ios
- [x] Add haptic feedback on card tap
- [x] Render barcode with correct format mapping
- [ ] Add tap-to-dismiss behavior

---

## Testing Checklist

- [ ] Barcode displays in ≤1s after tap
- [ ] Haptics trigger on display
- [ ] Works with offline data

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Barcode renders correctly across supported formats
- [ ] Latency target met on simulator and device
