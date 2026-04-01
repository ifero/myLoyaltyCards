# Story 12.5: Auth Screens

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** review
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

---

## Story

**As a** user creating an account or signing in,
**I want** clear, trustworthy auth screens with obvious CTAs,
**So that** I feel confident providing my credentials and can complete the flow without confusion.

---

## Context & Problems to Solve

**Current state (from Settings screen):**

- "Create an Account" and "Already have an account?" are presented as pale yellow cards with text — no button affordance at all
- These are KEY conversion CTAs and they have zero visual weight
- Guest mode banner works functionally but feels like a warning, not a feature
- No visual distinction between "create account" (primary) and "sign in" (secondary)

**Auth screens exist but were built function-first without design attention.**

---

## Acceptance Criteria

### AC1: Sign Up Screen ✅

```
Given I choose to create an account
Then the screen shows:
  - Clear heading: "Create Account" or similar ✅ → "Create Account" header + "Join My Loyalty Cards" hero text
  - Email input field (with validation states) ✅ → with inline error "Please enter a valid email address"
  - Password input field (with show/hide toggle and strength indicator) ✅ → eye toggle + red strength bar + "Weak" label
  - Primary CTA: bold filled "Create Account" button ✅ → 52px, #1A73E8 filled, rounded-14
  - Secondary link: "Already have an account? Sign in" ✅
And the form is vertically centered and not cramped ✅ → generous spacing, app icon at top
And the design conveys trust and simplicity ✅ → minimal layout, brand icon, reassuring subtitle
```

**Figma frames:** "Sign Up — Empty — Light/Dark", "Sign Up — Validation Error — Light/Dark"

### AC2: Sign In Screen ✅

```
Given I choose to sign in
Then the screen shows:
  - Clear heading: "Sign In" or "Welcome Back" ✅ → "Welcome Back" hero text
  - Email input field ✅
  - Password input field (with show/hide toggle) ✅ → eye toggle
  - Primary CTA: bold filled "Sign In" button ✅ → 52px, primary filled
  - Link: "Forgot password?" ✅ → positioned below password field
  - Secondary link: "Don't have an account? Create one" ✅
And error states are clearly shown (wrong password, account not found) ✅ → red error banner + red field borders
```

**Figma frames:** "Sign In — Empty — Light/Dark", "Sign In — Error — Light/Dark"

### AC3: Password Reset Flow ✅

```
Given I tap "Forgot password?"
Then the screen shows:
  - Heading: "Reset Password" ✅ → header title
  - Email input with instruction text ✅ → "No worries. Enter your email and we'll send you a link..."
  - Primary CTA: "Send Reset Link" ✅
  - Back/cancel navigation ✅ → back chevron + "Back to Sign In" link
And a confirmation screen after sending: "Check your email" ✅ → mail icon, success state, "try again" link
```

**Figma frames:** "Password Reset — Light/Dark", "Password Reset — Confirmation — Light/Dark"

### AC4: Guest Mode Banner ✅

```
Given I am using the app in guest mode
Then a contextual banner/prompt appears (in settings or home screen):
  - Explains benefits of creating an account (backup, sync) ✅ → "Create a free account to back up your cards and access them on all your devices"
  - Primary CTA: "Create Account" (filled, high contrast) ✅ → primary filled button
  - Secondary: "Sign In" (if they already have an account) ✅ → text link next to CTA
  - Dismissible: "Not now" or swipe to dismiss ✅ → ✕ close + "Not now" text
And the banner feels like an upgrade invitation, not a nag ✅ → shield icon, soft blue tint bg, warm "Protect your cards" headline
```

**Figma frames:** "Guest Upgrade Banner — Light/Dark" (contextual on home screen with card list)

### AC5: Error & Validation States ✅

```
Given any auth form
Then field-level validation errors are shown inline (red text below field) ✅ → red 12px text, 4px below field
And form-level errors are shown as a banner/toast above the form ✅ → red banner with ⚠ icon (Sign In error frame)
And error messages are human-readable, not technical ✅ → "Incorrect email or password. Please try again."
```

**Shown across:** Sign Up validation error frames + Sign In error frames

---

## Figma Deliverable

**Page name:** `Auth Screens`

**Frames (light + dark for each):**

1. Sign Up — empty state
2. Sign Up — filled with validation error
3. Sign In — empty state
4. Sign In — error state (wrong password)
5. Password Reset — email input
6. Password Reset — confirmation ("Check your email")
7. Guest mode upgrade banner (contextual)

---

## Design Notes

- Auth screens should feel secure and minimal — no distractions
- Primary CTA contrast is critical — "Create Account" must be unmissable
- Consider adding the app logo/icon at top of auth screens for brand identity ✅ → branded card icon in soft primary circle
- Guest mode banner tone: friendly invitation, not a warning or limitation message ✅ → shield icon + "Protect your cards"

## Design Decisions (Party Mode Session — 2026-03-29)

### DEC-12.5-001: Guest Banner Placement — Home Screen, Not Settings

- **Context:** Sign-up CTAs were only reachable from Settings. Users who don't explore settings would never see them.
- **Decision:** Guest mode upgrade banner is designed for the HOME screen, shown contextually above the card grid when the user has cards worth protecting. The banner includes primary "Create Account", secondary "Sign In", and a dismissible "Not now".
- **Status:** Approved by creative team (Sally, John, Maya, Winston)

### DEC-12.5-002: Returning User on New Device — Flagged for 12-7

- **Context:** When a returning user installs the app on a new device, they land in guest mode with no prompt to sign in. They must manually navigate to Settings to find "Sign In".
- **Decision:** This is a UX gap. The fix belongs in story **12-7 (Onboarding redesign)** — onboarding should include a fork: "New here?" / "Already have an account?". NOT in scope for 12-5.
- **Status:** Flagged — to be addressed in 12-7

### DEC-12.5-003: Auth Screen Visual Language

- **Context:** Auth screens need to feel trustworthy and minimal.
- **Decision:** All auth screens share: app brand icon at top (card in soft circle), generous whitespace, centered content, Inter font family, design system color tokens. Error states use red (#FF3B30 light / #FF453A dark) for borders + inline text. Form-level errors use a tinted banner with vector error-outline icon.
- **Status:** Implemented in Figma

### DEC-12.5-004: Icon System — MaterialIcons + MaterialCommunityIcons

- **Context:** Story 12-1 originally specified a legacy icon family via @expo/vector-icons. After reviewing the full expo/vector-icons library, MaterialIcons offers better coverage and cleaner glyphs for our use cases.
- **Decision:** Auth screens use **MaterialIcons** (MI) as primary icon family and **MaterialCommunityIcons** (MCI) for specialty icons. All icons in Figma are vector shapes with `MI:` or `MCI:` prefix labels matching expo/vector-icons names. Icon mapping:
  - `MI: chevron-left` — back navigation
  - `MI: visibility` / `MI: visibility-off` — password show/hide toggle
  - `MI: error-outline` — form-level error banner
  - `MI: mail-outline` — password reset confirmation
  - `MI: add` — add card header action
  - `MI: settings` — settings header action
  - `MI: close` — dismiss banner
  - `MCI: shield-check-outline` — guest upgrade trust icon
- **Impact:** This decision should propagate to all Epic 12 stories. Story 12-1 design system icon set to be updated.
- **Status:** Applied in 12-5 Figma frames
