# Onboarding Overlay — First Card Guidance

**Story:** `4.2 — First-Card Guidance` ✅

## Purpose 🎯

Help new users add their first loyalty card with a short, focused, and friendly guided flow so they experience value immediately.

## Overview

A lightweight overlay that appears only when the user has zero cards and `onboarding_completed` is false. The overlay guides the user through 2–3 short steps and offers quick actions to either scan a barcode or add a card manually.

## Key Requirements 🔧

- Reusable component: `OnboardingOverlay` (to be implemented at `features/onboarding/OnboardingOverlay.tsx`)
- Add the following `testID`s: `onboard-overlay`, `onboard-add-manual`, `onboard-scan`
- Tracks `onboarding_completed` via `features/settings`
- Navigates to `add-card` or `scan` flows
- Handles camera permission denial with inline explanation and link to Settings

---

## UX Flow & Copy ✨

1. Initial modal (overlay):
   - Title: **"Add your first card"**
   - Short body: "Use your camera to scan a barcode or add details manually."
   - Primary action: **"Scan barcode"** (`testID="onboard-scan"`) — leads to `scan` flow
   - Secondary action: **"Add manually"** (`testID="onboard-add-manual"`) — leads to `add-card`
   - Dismiss: `Skip` (text button) — sets `onboarding_completed=true` and dismisses overlay

2. Permission denied state (if user chooses Scan and camera permission denied):
   - Inline explanation text: "Camera access is required to scan. Enable camera in Settings."
   - Action: **Open Settings** (calls `Linking.openSettings()`), and a back button to return to overlay
   - Test note: Mock `Linking.openSettings` in tests

3. Success confirmation (after card added):
   - Microcopy: "Nice! Your card is ready" with a subtle check animation
   - Sets `onboarding_completed=true` and dismisses overlay

---

## Visual & Layout Guidelines 🔍

- Overlay style: translucent dark scrim with subtle blur. Keep contrast accessible.
- Focus highlight: soft rounded rectangle highlight around the Add Card CTA (or the center CTA) to orient the user.
- Modal card: center-aligned on mobile, max width 90% on small screens, 480px max on larger screens.
- Touch targets: 44px minimum.
- Motion: subtle fade/scale for entrance and exit; no long animations.
- Illustration: optional small icon (e.g., barcode + spark) to the left of heading — keep lightweight.

---

## Accessibility ♿

- Ensure overlay has `accessibilityViewIsModal={true}` and `accessibilityLabel` summarizing action
- All actionable elements must be focusable and have accessible labels (e.g., `accessibilityLabel="Onboarding: Scan barcode"`)
- Provide clear contrast and readable font sizes
- VoiceOver: read Title → Body → Primary action → Secondary action → Skip

---

## States & Component API

Props (suggested):

- `visible: boolean`
- `onRequestClose: () => void`
- `onScan: () => Promise<void> | void`
- `onAddManual: () => void`
- `onComplete: () => void`

Internal states:

- `step: 'intro' | 'permission-denied' | 'success'`

Events:

- On dismiss/skip: set `onboarding_completed=true`
- On primary/secondary action: navigate to existing flows and close overlay when appropriate

---

## Acceptance Test Hooks & Notes 🧪

- Add `testID="onboard-overlay"` on the root overlay view
- `onboard-scan` and `onboard-add-manual` wired to their respective buttons
- Integration test: simulate 0 cards and `onboarding_completed=false`, tap `onboard-scan`, then simulate camera permission denial and expect an inline message and a link to Settings
- Add unit tests for: visibility when flag is false, `onRequestClose` sets flag, on success shows success message

---

## Design Assets / Handoff

- Provide a small set of tokens: spacing (16/24), corner radius (12), color tokens from `shared/theme`.
- Add an example Figma frame (recommended) with 3 states: intro, permission-denied, success. (Link placeholder to be added during handoff.)

---

## Developer Notes / Implementation Tips 💡

- Prefer pure RN components (no extra native libs)
- Use existing navigation helpers (router, navigate) for quick flows
- Reuse the same permission handling patterns from `2-3-scan-barcode-with-camera.md`
- Keep the overlay deterministic and lightweight to avoid long render blocks on app start

---

If you want, I can draft the `OnboardingOverlay` component and accompanying unit + integration tests next. ✅
