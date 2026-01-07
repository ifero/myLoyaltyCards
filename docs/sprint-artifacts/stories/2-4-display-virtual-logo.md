# Story 2.4: Display Virtual Logo

## Story Information

| Field        | Value                                 |
| ------------ | ------------------------------------- |
| **Story ID** | 2.4                                   |
| **Epic**     | 2 - Card Management & Barcode Display |
| **Sprint**   | 1                                     |
| **Status**   | ready-for-dev                         |
| **Priority** | High                                  |
| **Estimate** | Small (half day)                      |

---

## User Story

**As a** user,  
**I want** cards without official brand logos to show a distinctive visual,  
**So that** I can quickly recognize any card in my list.

---

## Acceptance Criteria

### AC1: Virtual Logo Display

```gherkin
Given a card does not have a brand logo (brandId is null)
When the card is displayed in the card list
Then it shows a Virtual Logo component
And the Virtual Logo has:
  - A colored background (the card's selected color)
  - 1-3 initials from the card name
  - High-contrast white text
```

### AC2: Initials Generation

```gherkin
Given a card named "Test Store"
When generating initials
Then the initials are "TS" (first letter of each word, max 3)

Given a card named "SuperMart"
When generating initials
Then the initials are "S" (single word = first letter only)

Given a card named "The Coffee Shop"
When generating initials
Then the initials are "TCS" (first 3 words)

Given a card named "A Very Long Store Name Here"
When generating initials
Then the initials are "AVL" (first 3 words only)
```

### AC3: Color Application

```gherkin
Given a card with color "blue"
When displaying the Virtual Logo
Then the background color is #3B82F6 (Blue)
And the text color is white (#FFFFFF)

Given a card with color "orange"
When displaying the Virtual Logo
Then the background color is #F97316 (Orange)
And the text color is white (#FFFFFF)
```

### AC4: Consistent Dimensions

```gherkin
Given the card list displays both brand logos and Virtual Logos
When viewing the grid
Then all visual identifiers have the same dimensions
And the grid layout is consistent (no jumping/misalignment)
And Virtual Logos are square with rounded corners
```

### AC5: Font Sizing

```gherkin
Given a Virtual Logo with 1 initial
When displaying the logo
Then the font size is 32px (larger for single letter)

Given a Virtual Logo with 2-3 initials
When displaying the logo
Then the font size is 24px (slightly smaller to fit)
```

---

## Technical Requirements

### Dependencies

- `@/core/schemas` - LoyaltyCard type, CardColor
- `@/shared/theme/colors` - CARD_COLORS palette

### New Files to Create

| File                                        | Purpose                     |
| ------------------------------------------- | --------------------------- |
| `features/cards/components/VirtualLogo.tsx` | Virtual Logo component      |
| `features/cards/utils/initials.ts`          | Initials generation utility |

### Files to Modify

| File                                     | Changes                                   |
| ---------------------------------------- | ----------------------------------------- |
| `features/cards/components/CardTile.tsx` | Use VirtualLogo for cards without brandId |
| `features/cards/index.ts`                | Export VirtualLogo component              |

### Initials Generation Logic

```typescript
/**
 * Generate initials from a card name
 * Rules:
 * - Split by whitespace
 * - Take first letter of each word
 * - Maximum 3 initials
 * - Uppercase
 */
export function generateInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  const initials = words
    .slice(0, 3)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return initials || '?'; // Fallback for empty names
}
```

### VirtualLogo Component Props

```typescript
interface VirtualLogoProps {
  name: string;
  color: CardColor;
  size?: number; // Default: 80
  style?: ViewStyle;
}
```

### Component Implementation

```tsx
export function VirtualLogo({ name, color, size = 80, style }: VirtualLogoProps) {
  const initials = generateInitials(name);
  const backgroundColor = CARD_COLORS[color];
  const fontSize = initials.length === 1 ? size * 0.4 : size * 0.3;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          backgroundColor,
          borderRadius: size * 0.1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      accessibilityLabel={`${name} card logo`}>
      <Text
        style={{
          color: '#FFFFFF',
          fontSize,
          fontWeight: '700',
          letterSpacing: 1,
        }}>
        {initials}
      </Text>
    </View>
  );
}
```

---

## UI/UX Specifications

### Visual Design

- Square shape with 10% border radius (8px for 80px logo)
- Background: Card's selected color from 5-color palette
- Text: White (#FFFFFF), bold weight (700)
- Centered text both horizontally and vertically
- Letter spacing: 1px for readability

### Color Palette

| Color  | Hex     | Usage                    |
| ------ | ------- | ------------------------ |
| Blue   | #3B82F6 | Vibrant, professional    |
| Red    | #EF4444 | Bold, attention-grabbing |
| Green  | #22C55E | Fresh, positive          |
| Orange | #F97316 | Warm, energetic          |
| Grey   | #6B7280 | Neutral, default         |

### Size Specifications

- Card list (grid): 80x80px
- Card detail screen: 120x120px (if used there)
- Watch app: 40x40px (future reference)

### Typography

- Font: System default (San Francisco on iOS, Roboto on Android)
- Weight: Bold (700)
- 1 initial: 32px font size (40% of container)
- 2-3 initials: 24px font size (30% of container)

---

## Testing Checklist

### Manual Testing

- [ ] Virtual Logo displays for cards without brandId
- [ ] Initials "TS" generated for "Test Store"
- [ ] Initials "S" generated for "SuperMart"
- [ ] Initials "TCS" generated for "The Coffee Shop"
- [ ] Max 3 initials for long names
- [ ] All 5 colors display correctly
- [ ] White text is visible on all background colors
- [ ] Consistent sizing in card grid
- [ ] Rounded corners are visible

### Edge Cases

- [ ] Empty name shows "?" fallback
- [ ] Single character name shows that character
- [ ] Name with numbers "Store 24" shows "S2"
- [ ] Name with special characters handled gracefully
- [ ] Very long single word truncates to 1 initial

### Visual Testing

- [ ] Compare side-by-side with brand logos (when available)
- [ ] Grid alignment is consistent
- [ ] Colors match design spec exactly

### Accessibility Testing

- [ ] Contrast ratio meets WCAG AA (white on all colors)
- [ ] AccessibilityLabel includes card name

---

## Definition of Done

- [ ] All acceptance criteria pass
- [ ] Code follows project conventions (ESLint passes)
- [ ] Components are properly typed with TypeScript
- [ ] Unit tests for initials generation (if time permits)
- [ ] No console errors or warnings
- [ ] Works on both iOS and Android
- [ ] Manual testing checklist complete
- [ ] Story marked as `done` in sprint-status.yaml

---

## Notes

- This is a foundational component used throughout the app
- Brand logos (from catalogue) will be added in Epic 3
- For now, ALL cards use Virtual Logo (no brand integration yet)
- The component should be reusable for different sizes (card list, detail, watch)

---

## References

- [Epic 2 in epics.md](../epics.md#story-24-display-virtual-logo)
- [UX Design: Virtual Logo Card](../ux-design-specification.md)
- [Card Color Palette](../architecture.md)
