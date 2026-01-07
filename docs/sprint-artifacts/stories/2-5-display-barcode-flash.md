# Story 2.5: Display Barcode (Barcode Flash)

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.5                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | ready-for-dev                         |
| **Priority** | High                                  |
| **Estimate** | Medium (1-2 days)                     |

---

## User Story

**As a** user,  
**I want** to display my card's barcode in a format optimized for scanning,  
**So that** the cashier can scan it quickly at checkout.

---

## Acceptance Criteria

### AC1: Trigger Barcode Display

```gherkin
Given I am viewing the Card Details screen (Story 2.6)
When I tap on the barcode image OR tap "Show Full Screen" button
Then the Barcode Flash overlay appears immediately
And the transition is smooth (no flicker or delay)
```

### AC2: Barcode Flash Layout

```gherkin
Given the Barcode Flash overlay is displayed
When I view the screen
Then I see:
  - Full-screen white background (#FFFFFF)
  - Centered barcode image
  - Card name displayed above the barcode
  - Barcode number displayed below the barcode as text
And the barcode is large enough to scan easily
```

### AC3: Barcode Rendering

```gherkin
Given a card with barcode "1234567890" and format "CODE128"
When displaying the barcode
Then the barcode is rendered in Code 128 format
And the barcode is high-contrast (black on white)
And rendering completes in ≤100ms
```

### AC4: Multi-Format Support

```gherkin
Given cards with different barcode formats
When displaying each card's barcode
Then each format renders correctly:
  - Code 128: Standard linear barcode
  - EAN-13: 13-digit product barcode
  - EAN-8: 8-digit compact barcode
  - QR Code: Square 2D barcode
  - Code 39: Alphanumeric linear barcode
  - UPC-A: 12-digit retail barcode
```

### AC5: Screen Brightness

```gherkin
Given I am displaying a barcode
When the Barcode Flash overlay appears
Then the screen brightness is maximized automatically
And when I dismiss the overlay, brightness returns to previous level
```

### AC6: Dismiss Overlay

```gherkin
Given the Barcode Flash overlay is displayed
When I tap anywhere on the screen
Then the overlay dismisses
And I return to the Card Details screen

When I swipe down on the overlay
Then the overlay dismisses with a slide animation

When I press the hardware back button (Android)
Then the overlay dismisses
And I return to the Card Details screen
```

### AC7: Offline Display

```gherkin
Given I am in airplane mode (no network)
When I tap on a card to display its barcode
Then the barcode displays correctly
And there is no error or loading state
And functionality is identical to online mode
```

### AC8: Barcode Number Display

```gherkin
Given a card with barcode "1234567890123"
When viewing the Barcode Flash
Then the barcode number is displayed as text below the barcode
And the text is selectable/copyable (long press)
And the font is monospace for clarity
```

---

## Technical Requirements

### Dependencies

- `react-native-barcode-builder` or `react-native-svg` + barcode library
- `expo-brightness` - Screen brightness control
- `@/core/schemas` - LoyaltyCard type, BarcodeFormat

### New Files to Create

| File                                            | Purpose                                    |
| ----------------------------------------------- | ------------------------------------------ |
| `features/cards/components/BarcodeFlash.tsx`    | Full-screen barcode overlay                |
| `features/cards/components/BarcodeRenderer.tsx` | Multi-format barcode rendering             |
| `features/cards/hooks/useBrightness.ts`         | Hook for brightness control                |
| `app/barcode/[id].tsx`                          | Barcode screen (Expo Router dynamic route) |

### Files to Modify

| File                                        | Changes                                    |
| ------------------------------------------- | ------------------------------------------ |
| `features/cards/components/CardDetails.tsx` | Add barcode tap handler, "Full Screen" btn |
| `app/_layout.tsx`                           | Add barcode screen to stack (modal)        |
| `features/cards/index.ts`                   | Export barcode components                  |

### Barcode Library Options

**Option 1: `react-native-barcode-builder`**

```bash
npx expo install react-native-barcode-builder
```

**Option 2: `jsbarcode` + `react-native-svg`**

```bash
npx expo install react-native-svg jsbarcode
```

### Navigation Flow

```
Card Details (app/card/[id].tsx)
    └── tap barcode OR "Show Full Screen" button
        └── router.push(`/barcode/${card.id}`) as modal
            └── BarcodeFlash (app/barcode/[id].tsx)
                └── fetch card by ID
                └── BarcodeRenderer
                └── dismiss → router.back() → Card Details
```

### Brightness Control

```typescript
import * as Brightness from 'expo-brightness';

export function useBrightness() {
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);

  const maximize = async () => {
    const current = await Brightness.getBrightnessAsync();
    setOriginalBrightness(current);
    await Brightness.setBrightnessAsync(1.0); // Max brightness
  };

  const restore = async () => {
    if (originalBrightness !== null) {
      await Brightness.setBrightnessAsync(originalBrightness);
    }
  };

  return { maximize, restore };
}
```

### Barcode Renderer Props

```typescript
interface BarcodeRendererProps {
  value: string;
  format: BarcodeFormat;
  width?: number;
  height?: number;
}
```

---

## UI/UX Specifications

### Layout

- Full screen overlay (covers entire screen including status bar)
- White background (#FFFFFF) for maximum contrast
- Barcode centered vertically and horizontally
- Card name: 24px above barcode, centered
- Barcode number: 16px below barcode, centered

### Barcode Sizing

- Linear barcodes (Code128, EAN, UPC, Code39):
  - Width: 80% of screen width
  - Height: 120px
- QR Code:
  - Width & Height: 200px (square)
  - Centered on screen

### Typography

- Card name: 20px, bold, dark text (#1F2937)
- Barcode number: 16px, monospace font, dark text
- Both texts centered

### Animations

- Entry: Fade in (200ms ease-out)
- Exit (tap): Fade out (150ms ease-in)
- Exit (swipe): Slide down + fade (200ms)

### Touch Targets

- Entire screen is tappable to dismiss
- No specific button needed

### Safe Areas

- Content should respect safe areas but background covers full screen
- Barcode should not be obscured by notch or home indicator

---

## Testing Checklist

### Manual Testing

- [ ] Tapping barcode in Card Details opens Barcode Flash
- [ ] "Show Full Screen" button opens Barcode Flash
- [ ] White background covers entire screen
- [ ] Barcode renders correctly for Code 128
- [ ] Barcode renders correctly for EAN-13
- [ ] Barcode renders correctly for EAN-8
- [ ] Barcode renders correctly for QR Code
- [ ] Barcode renders correctly for Code 39
- [ ] Barcode renders correctly for UPC-A
- [ ] Card name displays above barcode
- [ ] Barcode number displays below barcode
- [ ] Barcode number is copyable (long press)
- [ ] Screen brightness increases on open
- [ ] Brightness restores on dismiss
- [ ] Tap anywhere dismisses overlay
- [ ] Swipe down dismisses overlay
- [ ] Back button dismisses overlay (Android)
- [ ] Works offline (airplane mode)

### Performance Testing

- [ ] Barcode renders in under 100ms
- [ ] No visible delay when opening overlay
- [ ] Smooth animations (60fps)

### Device Testing

- [ ] Works on iPhone SE (small screen)
- [ ] Works on iPhone 15 Pro Max (large screen)
- [ ] Works on Android phone
- [ ] Barcode scannable by actual scanner

### Edge Cases

- [ ] Very long barcode number displays correctly
- [ ] Barcode with special characters renders
- [ ] Works immediately after app cold start

### Accessibility Testing

- [ ] Screen reader announces card name and barcode
- [ ] Dismiss gesture is discoverable

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] Barcode rendering library integrated
- [ ] Brightness control working
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android
- [ ] **Actually scannable by barcode scanner hardware**
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- **Triggered from Card Details screen** (not directly from card list)
- This is the optimized "scanning mode" — full screen, max brightness
- Barcode must be scannable in real retail environments
- Test with actual barcode scanners (phone camera apps work too)
- Consider printing test barcodes to verify scannability
- The "Flash" name refers to the bright white screen optimized for scanning
- Dismiss returns to Card Details, not card list

### Testing with Real Scanners

- Use phone barcode scanner apps to verify
- Test in varying lighting conditions
- Verify at actual store self-checkout if possible

---

## References

- [Epic 2 in epics.md](../epics.md#story-25-display-barcode-barcode-flash)
- [UX Design: Barcode Flash Overlay](../ux-design-specification.md)
- [Architecture: Barcode Rendering](../architecture.md)
