# Story 12.5: Auth Screens

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
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

### AC1: Sign Up Screen

```
Given I choose to create an account
Then the screen shows:
  - Clear heading: "Create Account" or similar
  - Email input field (with validation states)
  - Password input field (with show/hide toggle and strength indicator)
  - Primary CTA: bold filled "Create Account" button
  - Secondary link: "Already have an account? Sign in"
And the form is vertically centered and not cramped
And the design conveys trust and simplicity
```

### AC2: Sign In Screen

```
Given I choose to sign in
Then the screen shows:
  - Clear heading: "Sign In" or "Welcome Back"
  - Email input field
  - Password input field (with show/hide toggle)
  - Primary CTA: bold filled "Sign In" button
  - Link: "Forgot password?"
  - Secondary link: "Don't have an account? Create one"
And error states are clearly shown (wrong password, account not found)
```

### AC3: Password Reset Flow

```
Given I tap "Forgot password?"
Then the screen shows:
  - Heading: "Reset Password"
  - Email input with instruction text
  - Primary CTA: "Send Reset Link"
  - Back/cancel navigation
And a confirmation screen after sending: "Check your email"
```

### AC4: Guest Mode Banner

```
Given I am using the app in guest mode
Then a contextual banner/prompt appears (in settings or home screen):
  - Explains benefits of creating an account (backup, sync)
  - Primary CTA: "Create Account" (filled, high contrast)
  - Secondary: "Sign In" (if they already have an account)
  - Dismissible: "Not now" or swipe to dismiss
And the banner feels like an upgrade invitation, not a nag
```

### AC5: Error & Validation States

```
Given any auth form
Then field-level validation errors are shown inline (red text below field)
And form-level errors are shown as a banner/toast above the form
And error messages are human-readable, not technical
```

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
- Consider adding the app logo/icon at top of auth screens for brand identity
- Guest mode banner tone: friendly invitation, not a warning or limitation message
