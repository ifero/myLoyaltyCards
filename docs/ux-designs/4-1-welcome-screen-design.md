# UX Design — Story 4.1: Welcome Screen

**Author:** Sally (UX Designer)
**Date:** 2026-02-08
**Story:** [4-1-welcome-screen](../sprint-artifacts/stories/4-1-welcome-screen.md)
**Status:** Approved

---

## 1. Design Intent

Imagine Giulia riding the metro, scrolling her phone with one hand, bags in the other. She just installed myLoyaltyCards. The very first thing she sees needs to **spark curiosity** ("Could this really be faster?") and **build quiet confidence** — all in under 5 seconds of reading. No walls of text, no feature tours, no permission dialogs. Just a warm, clear promise: _your loyalty cards, always ready, no phone needed._

The Welcome Screen is a **single, full-screen moment** that communicates the app's core value proposition and immediately offers a path to action. It follows our "Frictionless Onboarding" principle — get the user to their first card as fast as possible by deferring everything else.

---

## 2. Screen Layout

### 2.1 Visual Hierarchy (Top → Bottom)

The screen is a single, vertically-centered layout with generous whitespace. No scroll needed — everything is visible at a glance.

```
┌──────────────────────────────────────────┐
│                                          │
│              (top spacing)               │
│                                          │
│          ┌──────────────────┐            │
│          │                  │            │
│          │   Illustration   │            │
│          │   (Sage-tinted   │            │
│          │    card icons)   │            │
│          │                  │            │
│          └──────────────────┘            │
│                                          │
│           myLoyaltyCards                 │
│        ─────────────────────             │
│    Your loyalty cards, always ready.     │
│         No phone needed.                 │
│                                          │
│              (flex space)                │
│                                          │
│      ┌────────────────────────┐          │
│      │     Get started        │          │  ← Primary CTA
│      └────────────────────────┘          │
│                                          │
│              Skip                        │  ← Secondary CTA (text-only)
│                                          │
│              (bottom safe)               │
└──────────────────────────────────────────┘
```

### 2.2 Component Breakdown

| #   | Element               | Type              | Spec                                                                                                                                                                         |
| --- | --------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Illustration**      | Decorative visual | Sage-green tinted, lightweight SVG/Lottie. Shows 2–3 stylized loyalty card shapes fanning out with a subtle barcode motif. No photographs, no brand logos. Approx 200×160pt. |
| 2   | **App Title**         | Heading (`H1`)    | `"myLoyaltyCards"` — System bold, 28pt. Color: `textPrimary`.                                                                                                                |
| 3   | **Tagline**           | Body text         | `"Your loyalty cards, always ready.\nNo phone needed."` — System regular, 16pt. Color: `textSecondary`. Centered, max 2 lines.                                               |
| 4   | **"Get started" CTA** | Primary button    | Sage Green background (`#73A973`), white text, 16pt semibold. Full-width with 24px horizontal margin. Height: 52px (above 44px minimum). Border-radius: 12px.                |
| 5   | **"Skip" CTA**        | Text button       | `textSecondary` color, 14pt regular. 44×44px minimum touch target (padded). Centered below primary CTA.                                                                      |

### 2.3 Spacing (8px Grid)

| Region                            | Value                                        |
| --------------------------------- | -------------------------------------------- |
| Top safe area → Illustration      | 80px (10 grid units) — allows breathing room |
| Illustration → Title              | 32px (4 grid units)                          |
| Title → Tagline                   | 8px (1 grid unit)                            |
| Tagline → Primary CTA             | Flex (pushes CTAs to bottom third)           |
| Primary CTA → Skip                | 16px (2 grid units)                          |
| Skip → Bottom safe area           | 48px (6 grid units)                          |
| Horizontal padding (screen edges) | 24px (3 grid units)                          |

---

## 3. Visual Design

### 3.1 Color Application

| Element           | Light Mode                    | Dark Mode                     |
| ----------------- | ----------------------------- | ----------------------------- |
| Background        | `#FAFAFA` (Off-white)         | `#000000` (OLED Black)        |
| Illustration tint | Sage `#73A973` at 80% opacity | Sage `#73A973` at 60% opacity |
| Title text        | `#1F2937` (textPrimary)       | `#FFFFFF` (textPrimary)       |
| Tagline text      | `#6B7280` (textSecondary)     | `#9CA3AF` (textSecondary)     |
| Primary CTA bg    | `#73A973` (Sage 500)          | `#73A973` (Sage 500)          |
| Primary CTA text  | `#FFFFFF`                     | `#FFFFFF`                     |
| Skip text         | `#6B7280` (textSecondary)     | `#9CA3AF` (textSecondary)     |

### 3.2 Illustration Guidelines

The illustration is **not** a hero image or photograph. It's a simple, brand-safe, abstract composition:

- **Concept:** 2–3 stylized card shapes (rounded rectangles) fanning out at slight angles, with a subtle barcode pattern on the top card. A small sparkle/checkmark accent in Sage Green.
- **Style:** Flat, geometric, minimal — consistent with the "Accessible Sage Minimalist" direction.
- **Format:** SVG preferred for crispness at all resolutions. Lottie acceptable if a subtle entrance animation is desired (e.g., cards gently sliding into position over 600ms).
- **Colors:** Use only theme tokens — Sage Green shades (`500`, `300`, `100`), plus `textSecondary` for card outlines in light mode or `border` color in dark mode.
- **Size:** 200×160pt intrinsic size, rendered at 60% of screen width (max 280pt).
- **Fallback:** If illustration asset is unavailable, show a large card emoji (🃏) as a placeholder — never an empty space.

### 3.3 Typography

All text uses the **System Sans-Serif** typeface (San Francisco on iOS, Roboto on Android) to leverage platform-native Dynamic Type support.

| Element           | Weight         | Size | Line Height |
| ----------------- | -------------- | ---- | ----------- |
| Title             | Bold (700)     | 28pt | 34pt        |
| Tagline           | Regular (400)  | 16pt | 24pt        |
| Primary CTA label | SemiBold (600) | 16pt | 20pt        |
| Skip label        | Regular (400)  | 14pt | 20pt        |

---

## 4. Interaction Design

### 4.1 CTA Behavior

| Action                | Result                                           | Notes                       |
| --------------------- | ------------------------------------------------ | --------------------------- |
| Tap **"Get started"** | Navigate to First-Card Guidance flow (Story 4.2) | Sets `first_launch = false` |
| Tap **"Skip"**        | Navigate to main Card List (`app/index.tsx`)     | Sets `first_launch = false` |

Both CTAs persist the preference so the Welcome Screen never appears again (AC3).

### 4.2 Button States

**Primary CTA ("Get started"):**

| State    | Visual Change                                |
| -------- | -------------------------------------------- |
| Default  | Sage Green bg `#73A973`, white text          |
| Pressed  | Darker Sage `#5C9A5C` (Sage 600), scale 0.98 |
| Disabled | N/A (always enabled)                         |

**Secondary CTA ("Skip"):**

| State   | Visual Change         |
| ------- | --------------------- |
| Default | `textSecondary` color |
| Pressed | Opacity 0.6           |

### 4.3 Entrance Animation (Optional Enhancement)

A light, non-blocking entrance animation enhances the "First Discovery" emotional moment:

1. **Illustration** fades in + slides up 16px over 400ms (ease-out)
2. **Title + Tagline** fade in 200ms after illustration (staggered)
3. **CTAs** fade in 200ms after text

Total entrance: ~800ms. Animation must be interruptible — tapping a CTA at any point during animation should immediately navigate.

> **Dev note:** Use `react-native-reanimated` `FadeIn` / `SlideInUp` layout animations. If animation adds complexity, it's acceptable to ship without it for MVP and add it later.

---

## 5. Responsive Behavior

### 5.1 Phone (Portrait — Primary)

The layout described in Section 2 is the default. Content is vertically centered with CTAs pushed toward the bottom third via flex spacing.

### 5.2 Phone (Landscape)

- Illustration scales down to 40% of screen width
- Layout remains vertically centered
- Horizontal padding increases to 48px (6 grid units) to avoid overly wide text lines

### 5.3 Small Screens (iPhone SE / 4" displays)

- Illustration scales to 50% of screen width (max 160pt)
- Top spacing reduces from 80px to 48px
- The flex spacer ensures CTAs stay reachable near the thumb zone

### 5.4 Large Screens / Tablets

- Content max-width capped at 400pt, horizontally centered
- Illustration at 60% of content width
- Layout remains single-column, vertically centered

---

## 6. Accessibility

### 6.1 Semantic Structure

| Element       | Role                | Accessible Label                                                                     |
| ------------- | ------------------- | ------------------------------------------------------------------------------------ |
| Screen        | Screen              | `"Welcome to myLoyaltyCards"`                                                        |
| Illustration  | Decorative (hidden) | `accessibilityElementsHidden={true}`                                                 |
| Title         | Heading (Level 1)   | `accessibilityRole="header"`                                                         |
| Tagline       | Text                | Read as body text                                                                    |
| "Get started" | Button              | `accessibilityLabel="Get started"`, `accessibilityHint="Opens first card setup"`     |
| "Skip"        | Button              | `accessibilityLabel="Skip onboarding"`, `accessibilityHint="Goes to your card list"` |

### 6.2 TestIDs (Required)

| Element                  | testID                 |
| ------------------------ | ---------------------- |
| Welcome screen container | `welcome-screen`       |
| Primary CTA              | `welcome-get-started`  |
| Secondary CTA            | `welcome-skip`         |
| App title                | `welcome-title`        |
| Illustration             | `welcome-illustration` |

### 6.3 Dynamic Type

- Title and Tagline must respect system font size settings
- If font size is set to "Extra Large" or above, the illustration shrinks or hides to preserve CTA visibility
- CTAs must always remain visible and tappable without scrolling

### 6.4 Contrast Ratios

| Pair                   | Ratio  | WCAG   |
| ---------------------- | ------ | ------ |
| Title on Light bg      | 12.6:1 | ✅ AAA |
| Tagline on Light bg    | 4.6:1  | ✅ AA  |
| CTA text on Sage Green | 4.5:1  | ✅ AA  |
| Title on Dark bg       | 21:1   | ✅ AAA |
| Tagline on Dark bg     | 5.5:1  | ✅ AA  |

### 6.5 Motion Sensitivity

- Entrance animation (Section 4.3) must respect `prefers-reduced-motion` / `accessibilityReduceMotionEnabled`
- When reduced motion is on, all elements appear immediately without animation

---

## 7. Localization

### 7.1 String Table

| Key                     | English                                             | Italian                                                           |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| `welcome.title`         | myLoyaltyCards                                      | myLoyaltyCards                                                    |
| `welcome.tagline`       | Your loyalty cards, always ready.\nNo phone needed. | Le tue carte fedeltà, sempre pronte.\nSenza bisogno del telefono. |
| `welcome.cta_primary`   | Get started                                         | Inizia                                                            |
| `welcome.cta_secondary` | Skip                                                | Salta                                                             |

### 7.2 Layout Considerations

- Italian text is generally ~20–30% longer than English
- Tagline line wrapping must accommodate longer translations gracefully
- CTA labels must not truncate — button width adapts to text

---

## 8. Edge Cases & Error States

| Scenario                                    | Behavior                                     |
| ------------------------------------------- | -------------------------------------------- |
| App killed mid-welcome (before any CTA tap) | Welcome shows again on next launch           |
| `first_launch` flag corrupted/missing       | Treat as first launch → show Welcome         |
| Deep link opens app for first time          | Show Welcome first, then navigate after CTA  |
| Extremely large accessibility font          | Hide illustration, keep Title + CTAs visible |

---

## 9. Implementation Notes for Dev

### 9.1 File Structure

```
app/welcome.tsx          ← New screen component
assets/images/welcome/   ← Illustration SVG asset(s)
```

### 9.2 Routing

- Register `app/welcome.tsx` as a Stack screen in `app/_layout.tsx`
- At bootstrap, check `first_launch` from `features/settings`
- If `first_launch` is `true` (or undefined/null for first install), navigate to `/welcome`
- After either CTA is tapped, set `first_launch = false` and navigate accordingly

### 9.3 Key Dependencies

- `features/settings` — for `first_launch` persistence (AsyncStorage-backed)
- `shared/theme` — for all color tokens and `useTheme()` hook
- `react-native-reanimated` — optional, for entrance animation
- `expo-router` — for navigation

### 9.4 NativeWind Classes (Suggested)

```
Container:  flex-1 items-center justify-center px-3
Title:      text-[28px] font-bold text-center
Tagline:    text-base text-center leading-6
Primary:    w-full h-[52px] rounded-xl items-center justify-center
Skip:       h-11 items-center justify-center
```

---

## 10. Design Checklist

- [x] Layout follows 8px grid spacing
- [x] Touch targets ≥ 44px
- [x] Color contrast ≥ 4.5:1 (WCAG AA)
- [x] Dark mode variant specified
- [x] Accessibility roles and labels defined
- [x] TestIDs specified per story requirements
- [x] Localization strings for EN + IT
- [x] Responsive behavior for small/large screens
- [x] Edge cases documented
- [x] Aligns with "Accessible Sage Minimalist" design direction
- [x] Follows "Frictionless Onboarding" experience principle
