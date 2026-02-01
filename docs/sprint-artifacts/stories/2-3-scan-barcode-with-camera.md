# Story 2.3: Scan Barcode with Camera

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.3                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | Ready for Review                      |
| **Priority** | Medium                                |
| **Estimate** | Large (2-3 days)                      |

---

## User Story

**As a** user,  
**I want** to scan a barcode using my camera,  
**So that** I can add cards quickly without typing.

---

## Acceptance Criteria

### AC1: Access Scanner

```gherkin
Given I am on the Add Card screen
When I tap "Scan Barcode" option
Then I see the camera viewfinder interface
And there is a visible "Enter Manually" button below the viewfinder
```

### AC2: Camera Permission Request

```gherkin
Given I have never used the camera in this app
When I try to access the scanner
Then I see a system permission dialog asking for camera access
And the dialog explains why the camera is needed

Given I deny camera permission
When the dialog closes
Then I see a friendly error message:
  "Camera access is needed to scan barcodes.
   You can enable it in Settings, or enter the barcode manually."
And I see buttons: "Open Settings" and "Enter Manually"
```

### AC3: Camera Viewfinder

```gherkin
Given I have granted camera permission
When the scanner opens
Then I see a live camera preview
And I see a rectangular viewfinder overlay (scan area indicator)
And I see instructional text: "Point camera at barcode"
And the "Enter Manually" button is always visible at the bottom
```

### AC4: Barcode Detection

```gherkin
Given the camera is active and pointed at a barcode
When a valid barcode is detected within the viewfinder
Then the barcode value is captured automatically
And the barcode format is identified (Code128, EAN-13, etc.)
And I feel haptic feedback confirming detection
And the scanner closes automatically
```

### AC5: Auto-Navigate to Form

```gherkin
Given a barcode has been successfully scanned
When the scan completes
Then I am taken to the Add Card form (Story 2.2)
And the barcode field is pre-filled with the scanned value
And the barcode format is pre-selected based on detection
And the Card Name field is focused for input
And I see a brief success indicator: "Barcode scanned!"
```

### AC6: Supported Barcode Formats

```gherkin
Given I am scanning a barcode
When the barcode is one of these formats:
  - Code 128
  - EAN-13
  - EAN-8
  - QR Code
  - Code 39
  - UPC-A
Then it is detected and captured correctly
And the format is correctly identified
```

### AC7: Manual Entry Fallback

```gherkin
Given the scanner is open
When I tap "Enter Manually"
Then I am taken to the Add Card form
And no barcode data is pre-filled
And the barcode field is focused for manual input
```

### AC8: Scanner Error Handling

```gherkin
Given the camera is active
When an error occurs (camera crash, etc.)
Then I see an error message: "Camera error. Please try again."
And I can tap "Retry" or "Enter Manually"
And the app does not crash
```

### AC9: Flash/Torch Toggle (Optional Enhancement)

```gherkin
Given the scanner is open
When I tap the flashlight icon
Then the device torch toggles on/off
And this helps scan in low-light conditions
(Note: This is optional for MVP)
```

---

## Technical Requirements

### Dependencies

- `expo-camera` - Camera access and barcode scanning
- `expo-haptics` - Haptic feedback on detection
- `@/core/schemas` - BarcodeFormat enum

### New Files to Create

| File                                           | Purpose                             |
| ---------------------------------------------- | ----------------------------------- |
| `features/cards/components/BarcodeScanner.tsx` | Scanner component with viewfinder   |
| `features/cards/hooks/useBarcodeScanner.ts`    | Hook for camera and detection logic |
| `app/scan.tsx`                                 | Scanner screen (Expo Router)        |

### Files to Modify

| File                      | Changes                                        |
| ------------------------- | ---------------------------------------------- |
| `app/add-card.tsx`        | Add "Scan Barcode" button, handle scan results |
| `app/_layout.tsx`         | Add scan screen to stack                       |
| `features/cards/index.ts` | Export scanner components                      |

### Barcode Format Mapping

```typescript
// Map expo-camera barcode types to our schema
const BARCODE_FORMAT_MAP: Record<string, BarcodeFormat> = {
  code128: 'CODE128',
  ean13: 'EAN13',
  ean8: 'EAN8',
  qr: 'QR',
  code39: 'CODE39',
  upc_a: 'UPCA'
};

function mapBarcodeFormat(expoFormat: string): BarcodeFormat {
  return BARCODE_FORMAT_MAP[expoFormat.toLowerCase()] ?? 'CODE128';
}
```

### Navigation Flow

```
Add Card Screen
    ├── "Scan Barcode" button → navigate to /scan
    │       └── BarcodeScanner
    │           ├── onScan → navigate back with params
    │           └── "Enter Manually" → navigate back (no params)
    │
    └── AddCardForm
        └── receives scanned barcode via route params
```

### Camera Configuration

```typescript
const cameraConfig = {
  barcodeScannerSettings: {
    barcodeTypes: ['code128', 'ean13', 'ean8', 'qr', 'code39', 'upc_a']
  }
};
```

---

## UI/UX Specifications

### Scanner Layout

- Full screen camera preview
- Semi-transparent overlay (rgba(0,0,0,0.5)) around viewfinder
- Clear rectangular viewfinder area (70% screen width)
- Rounded corners on viewfinder (16px radius)
- Animated scanning line (optional enhancement)

### Text Overlay

- Instructional text: "Point camera at barcode"
- White text with dark shadow for visibility
- Positioned above the viewfinder

### Manual Entry Button

- Always visible at bottom of screen
- Text: "Enter Manually"
- Secondary button style (outline or text-only)
- 48px touch target height
- Safe area aware (above home indicator)

### Permission Denied State

- Centered content
- Camera icon with X overlay
- Error message text
- Two buttons: "Open Settings" (primary), "Enter Manually" (secondary)

### Success Feedback

- Brief haptic (success notification)
- Optional: Green flash or checkmark animation on viewfinder
- Auto-dismiss within 300ms

---

## Testing Checklist

### Manual Testing

- [ ] Scanner opens when tapping "Scan Barcode"
- [ ] Camera permission dialog appears on first use
- [ ] Permission denied shows helpful error with options
- [ ] Viewfinder overlay displays correctly
- [ ] Can scan Code 128 barcode
- [ ] Can scan EAN-13 barcode
- [ ] Can scan QR code
- [ ] Haptic feedback on successful scan
- [ ] Auto-navigates to form with barcode pre-filled
- [ ] Format is correctly detected and pre-selected
- [ ] "Enter Manually" button works from scanner
- [ ] Scanner closes properly when navigating away
- [ ] App doesn't crash if camera errors

### Device Testing

- [ ] Works on iOS simulator (with test barcodes)
- [ ] Works on Android emulator (with test barcodes)
- [ ] Works on physical iOS device
- [ ] Works on physical Android device

### Edge Cases

- [ ] Scanning same barcode twice doesn't cause issues
- [ ] Very long barcode values are captured correctly
- [ ] Damaged/blurry barcodes eventually timeout or allow manual entry
- [ ] Camera works after granting permission via Settings

### Accessibility Testing

- [ ] Screen reader announces camera status
- [ ] "Enter Manually" button is accessible
- [ ] Permission error is announced properly

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] Camera permissions handled gracefully
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- Scanner is a separate screen for cleaner UX (full focus on scanning)
- This story integrates with Story 2.2 (Add Card Manually)
- Camera permission should be requested at scan time, not app launch
- Test with real physical barcodes for best validation

### Test Barcodes

- EAN-13: `5901234123457`
- EAN-8: `96385074`
- Code 128: `ABC-1234`
- UPC-A: `012345678905`

---

## References

- [Epic 2 in epics.md](../epics.md#story-23-scan-barcode-with-camera)
- [Expo Camera Documentation](https://docs.expo.dev/versions/latest/sdk/camera/)
- [UX Design: Zippy Scanner Interface](../ux-design-specification.md)

---

## Dev Agent Record

### Implementation Date

2026-01-23

### Files Created/Modified

**New Files:**

- None (files already existed from previous partial implementation)

**Modified Files:**

- `app/_layout.tsx` - Added scan screen to Stack navigation with fullScreenModal presentation
- `app/add-card.tsx` - Added "Scan Barcode" button, route param handling for scanned barcode, success indicator
- `app/scan.tsx` - Updated imports to use feature module exports
- `features/cards/index.ts` - Exported BarcodeScanner, useBarcodeScanner, and ScanResult type
- `features/cards/components/BarcodeScanner.tsx` - Fixed CameraType import (type vs value), fixed import order
- `features/cards/components/BarcodeScanner.test.tsx` - Fixed Linking mock, fixed format mapping test
- `features/cards/components/CardForm.tsx` - Added focusNameOnMount prop for scanner integration
- `features/cards/hooks/useBarcodeScanner.ts` - Fixed setTimeout type, fixed import order
- `features/cards/hooks/useBarcodeScanner.test.ts` - Fixed format mapping test to properly reset between iterations

### Implementation Notes

1. **Partial Implementation Found**: BarcodeScanner component, useBarcodeScanner hook, and app/scan.tsx already existed but were not fully integrated.

2. **Integration Completed**:
   - Registered `/scan` screen in Stack navigator with fullScreenModal presentation
   - Added "Scan Barcode" button to Add Card screen (shown only when no barcode is scanned)
   - Implemented route params handling to receive scanned barcode/format from scanner
   - Added success indicator ("✓ Barcode scanned!") that shows for 3 seconds after scan
   - Card Name field auto-focuses after scan per AC5

3. **Test Fixes**:
   - Fixed Linking.openSettings mock using jest.spyOn instead of module mock
   - Fixed format mapping test by creating fresh hook instance for each format

4. **TypeScript Fixes**:
   - Fixed CameraType - it's a type alias, not an enum object in expo-camera
   - Fixed setTimeout return type using `ReturnType<typeof setTimeout>`
   - Fixed useEffect cleanup return value consistency

### Acceptance Criteria Status

- [x] AC1: Access Scanner - "Scan Barcode" button navigates to /scan screen
- [x] AC2: Camera Permission Request - useBarcodeScanner handles permission flow
- [x] AC3: Camera Viewfinder - BarcodeScanner shows overlay with instructions
- [x] AC4: Barcode Detection - handleBarcodeScanned with haptic feedback
- [x] AC5: Auto-Navigate to Form - router.replace with params, success indicator shown
- [x] AC6: Supported Barcode Formats - All 6 formats mapped in BARCODE_FORMAT_MAP
- [x] AC7: Manual Entry Fallback - "Enter Manually" button calls onManualEntry
- [x] AC8: Scanner Error Handling - Error state with Retry and Enter Manually options
- [ ] AC9: Flash/Torch Toggle - Not implemented (marked optional for MVP)

### Test Results

- All 120 tests pass
- 21 tests specifically for BarcodeScanner and useBarcodeScanner
- 40 tests for scanner/form related functionality
