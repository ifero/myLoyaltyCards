# Story 13.5: Restyle Auth Screens

Status: review

## Story

As a user creating an account, signing in, or resetting my password,
I want the auth screens to feel polished, trustworthy, and visually consistent with the redesigned app,
so that I feel confident providing my credentials and can complete every auth flow without confusion.

## Context

This story implements the approved Figma designs from Story 12-5 (Auth Screens). It is a **visual restyle only** -- all auth logic (Supabase email auth, password reset, guest mode) already exists from Epic 6 and remains unchanged.

The auth feature lives in `features/auth/` with four screen files (`CreateAccountScreen.tsx`, `SignInScreen.tsx`, `ForgotPasswordScreen.tsx`, `ResetPasswordScreen.tsx`) plus `MigrationBanner.tsx`. Route files in `app/` (`create-account.tsx`, `sign-in.tsx`, `forgot-password.tsx`, `reset-password.tsx`) are thin re-exports. Tests live in `features/auth/__tests__/`.

Story 13-1 provides the design system foundation: `Button`, `TextField`, `CardShell`, `ActionRow` shared components, plus all color/typography/spacing tokens. This story consumes those components and tokens to restyle the auth screens and add a new Guest Mode Banner to the home screen.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Auth Screens
**Design story reference:** docs/sprint-artifacts/stories/12-5-auth-screens.md

## Acceptance Criteria

### AC1: Sign Up Screen (Create Account)

- [x] App icon displayed at top center in soft primary-tinted circle
- [x] "Create Account" heading with "Join My Loyalty Cards" hero subtitle text
- [x] Email input field using `TextField` component with inline validation
  - Error state: red border + 12px red text 4px below field ("Please enter a valid email address")
- [x] Password input field using `TextField` component with:
  - Show/hide toggle (MI: visibility / MI: visibility-off)
  - Strength indicator bar below field (red bar + "Weak" label for weak passwords)
- [x] "Create Account" primary CTA using `Button` variant: primary (52px height, #1A73E8 light / #4DA3FF dark, 14px corner radius)
- [x] "Already have an account? Sign in" secondary link below CTA
- [x] Vertically centered form layout with generous whitespace
- [x] Light mode: white background, #F5F5F5 input fields
- [x] Dark mode: #000000 background, #2C2C2E input fields
- [x] Matches Figma frames: "Sign Up -- Empty -- Light/Dark", "Sign Up -- Validation Error -- Light/Dark"

### AC2: Sign In Screen

- [x] App icon displayed at top center (same treatment as Sign Up)
- [x] "Welcome Back" hero heading text
- [x] Email input field using `TextField` component
- [x] Password input field using `TextField` with show/hide toggle (MI: visibility / MI: visibility-off)
- [x] "Sign In" primary CTA using `Button` variant: primary (52px height, same styling as Sign Up)
- [x] "Forgot password?" link positioned below password field
- [x] "Don't have an account? Create one" secondary link below CTA
- [x] Error states:
  - Red error banner at top of form with MI: error-outline icon and human-readable message ("Incorrect email or password. Please try again.")
  - Red field borders on fields with errors
- [x] Light/dark mode token parity matching AC1 backgrounds and input styling
- [x] Matches Figma frames: "Sign In -- Empty -- Light/Dark", "Sign In -- Error -- Light/Dark"

### AC3: Password Reset Flow

- [x] "Reset Password" heading in navigation header
- [x] Back chevron (MI: chevron-left) in header for navigation back
- [x] Email input field using `TextField` component
- [x] Instruction text: "No worries. Enter your email and we'll send you a link..."
- [x] "Send Reset Link" primary CTA using `Button` variant: primary
- [x] "Back to Sign In" secondary link below CTA
- [x] Confirmation screen after sending:
  - MI: mail-outline icon (large, centered)
  - "Check your email" heading text
  - Instructional subtitle text
  - "Try again" link for re-sending
- [x] Light/dark mode token parity
- [x] Matches Figma frames: "Password Reset -- Light/Dark", "Password Reset -- Confirmation -- Light/Dark"

### AC4: Guest Mode Banner (Home Screen)

- [x] Banner renders on home screen when user is in guest mode (DEC-12.5-001: home screen, NOT settings)
- [x] MCI: shield-check-outline icon as trust indicator
- [x] Soft blue tint background (primary color at low opacity)
- [x] "Protect your cards" headline text
- [x] Subtitle: "Create a free account to back up your cards and access them on all your devices"
- [x] "Create Account" primary CTA using `Button` variant: primary
- [x] "Sign In" secondary text link next to or below CTA
- [x] Dismissible: MI: close icon button + "Not now" text
- [x] Dismissed state persisted (banner does not reappear after dismissal within session or via AsyncStorage)
- [x] Banner positioned above card list on home screen
- [x] Light mode: soft blue tint on white
- [x] Dark mode: soft blue tint on dark surface (#1C1C1E)
- [x] Matches Figma frames: "Guest Upgrade Banner -- Light/Dark"

### AC5: Error & Validation States

- [x] Field-level validation errors: #FF3B30 light / #FF453A dark border color on errored fields
- [x] Inline error text: 12px, red (#FF3B30 light / #FF453A dark), 4px below the field
- [x] Form-level error banner: red-tinted background with MI: error-outline vector icon + human-readable message
- [x] Error messages use plain language, not technical codes (e.g., "Incorrect email or password. Please try again." not "auth/invalid-credentials")
- [x] All error states have both light and dark mode variants

### AC6: Auth Visual Language Consistency (DEC-12.5-003)

- [x] All auth screens share: app icon at top in soft primary circle, centered form layout, generous whitespace
- [x] Design system typography tokens used for all headings, body text, labels, links
- [x] Design system spacing tokens used for all margins and padding (24px horizontal screen margins)
- [x] No hardcoded color values -- all colors reference theme tokens from 13-1
- [x] Icon system uses MI/MCI via @expo/vector-icons (DEC-12.5-004) -- no FontAwesome, no emoji

### AC7: Dark Mode Parity

- [x] Every screen has a dark mode variant matching the corresponding Figma dark frame
- [x] Primary buttons: #1A73E8 light / #4DA3FF dark
- [x] Input fields: #F5F5F5 light / #2C2C2E dark
- [x] Backgrounds: white light / #000000 dark
- [x] Elevated surfaces (banner, cards): white light / #1C1C1E dark
- [x] Error colors: #FF3B30 light / #FF453A dark
- [x] 14 total frames verified (7 screens x 2 themes)

### AC8: Accessibility

- [x] All interactive elements have 44pt minimum touch targets
- [x] All elements have appropriate `accessibilityRole` and `accessibilityLabel`
- [x] Password show/hide toggle announces state to screen reader ("Show password" / "Hide password")
- [x] Error messages announced to screen reader via `accessibilityLiveRegion="polite"` or equivalent
- [x] Guest mode banner dismiss button has `accessibilityLabel="Dismiss banner"`
- [x] Form fields have proper `accessibilityHint` for validation requirements

### AC9: Test Coverage

- [x] Unit tests for each restyled screen component (>= 80% coverage)
- [x] Unit tests for password strength indicator logic
- [x] Unit tests for Guest Mode Banner (render, dismiss, CTA navigation)
- [x] Unit tests for error banner component
- [x] Unit tests for form validation display states
- [x] Tests co-located in `features/auth/__tests__/`

## Tasks / Subtasks

### T1: Shared Auth Components (AC1, AC2, AC3, AC5, AC6)

- [x] Create `features/auth/components/AuthScreenLayout.tsx`
  - Shared layout wrapper for all auth screens: app icon at top, centered content area, safe area insets, 24px horizontal padding
  - Accepts `children`, optional `heading`, optional `subtitle` props
  - Uses theme tokens for background (#FFFFFF light / #000000 dark)
- [x] Create `features/auth/components/AppIconHeader.tsx`
  - App icon in soft primary-tinted circle (primary color at ~10% opacity background)
  - Centered, consistent size across all auth screens
- [x] Create `features/auth/components/PasswordInput.tsx`
  - Wraps `TextField` from `@/shared/components/ui/TextField`
  - Adds show/hide toggle button using MI: visibility / MI: visibility-off
  - Toggle button is inside the field as right adornment
  - `accessibilityLabel` toggles between "Show password" and "Hide password"
- [x] Create `features/auth/components/PasswordStrengthIndicator.tsx`
  - Horizontal bar below password field
  - Color states: red (weak), orange (fair), green (strong) using semantic tokens
  - Text label next to bar: "Weak", "Fair", "Strong"
  - Logic: length-based + complexity heuristic (letters + numbers + special chars)
- [x] Create `features/auth/components/ErrorBanner.tsx`
  - Red-tinted banner with MI: error-outline icon + message text
  - Background: error color at low opacity
  - Text color: error red (#FF3B30 light / #FF453A dark)
  - `accessibilityLiveRegion="polite"` for screen reader announcement
- [x] Create `features/auth/components/AuthLink.tsx`
  - Styled text link for secondary navigation ("Already have an account? Sign in", etc.)
  - Supports inline bold segment (e.g., "Already have an account? **Sign in**")
  - Uses theme text colors (secondary text token)

### T2: Restyle Sign Up Screen (AC1, AC5, AC6)

- [x] Refactor `features/auth/CreateAccountScreen.tsx`:
  - Wrap in `AuthScreenLayout` with `AppIconHeader`
  - Replace existing email input with `TextField` from `@/shared/components/ui/`
  - Replace existing password input with `PasswordInput` (T1)
  - Add `PasswordStrengthIndicator` below password field
  - Replace existing submit button with `Button` variant: primary from `@/shared/components/ui/`
  - Replace existing "Already have an account?" text with `AuthLink` component
  - Wire inline validation: email format check shows error state on blur
  - Apply all theme tokens (no hardcoded colors)
- [x] Verify layout matches Figma "Sign Up -- Empty" and "Sign Up -- Validation Error" frames

### T3: Restyle Sign In Screen (AC2, AC5, AC6)

- [x] Refactor `features/auth/SignInScreen.tsx`:
  - Wrap in `AuthScreenLayout` with `AppIconHeader`
  - "Welcome Back" hero heading
  - Replace email input with `TextField` from `@/shared/components/ui/`
  - Replace password input with `PasswordInput` (no strength indicator on sign-in)
  - Replace submit button with `Button` variant: primary
  - Add "Forgot password?" link below password field (navigates to `forgot-password`)
  - Add "Don't have an account? Create one" `AuthLink` below CTA
  - Integrate `ErrorBanner` for form-level auth errors (wrong password, account not found)
  - Show red border on fields when form-level error is active
  - Map Supabase error codes to human-readable messages
- [x] Verify layout matches Figma "Sign In -- Empty" and "Sign In -- Error" frames

### T4: Restyle Password Reset Screens (AC3, AC6)

- [x] Refactor `features/auth/ForgotPasswordScreen.tsx`:
  - Wrap in `AuthScreenLayout` (no app icon -- uses header with back chevron instead)
  - "Reset Password" as screen heading
  - MI: chevron-left back button in header
  - Email `TextField` with instruction text below heading
  - "Send Reset Link" `Button` variant: primary
  - "Back to Sign In" `AuthLink` below CTA
  - Apply theme tokens throughout
- [x] Refactor `features/auth/ResetPasswordScreen.tsx` (confirmation state):
  - MI: mail-outline icon, large and centered
  - "Check your email" heading
  - Instructional subtitle text
  - "Try again" link to re-send reset email
  - Apply theme tokens throughout
- [x] Verify layouts match Figma "Password Reset" and "Password Reset -- Confirmation" frames

### T5: Guest Mode Banner (AC4)

- [x] Create `features/auth/components/GuestModeBanner.tsx`:
  - MCI: shield-check-outline icon (24pt or per Figma spec)
  - "Protect your cards" headline (semibold, primary text color)
  - Subtitle body text (secondary text color)
  - "Create Account" `Button` variant: primary
  - "Sign In" text link (secondary action)
  - MI: close dismiss button (top-right) + "Not now" text link
  - Soft blue tint background: primary color at ~8-10% opacity
  - Rounded corners matching design system card radius
  - Light: soft blue on white surface
  - Dark: soft blue on #1C1C1E elevated surface
- [x] Implement dismiss persistence:
  - On dismiss, store flag in AsyncStorage (`guest_banner_dismissed`)
  - Check flag on mount -- do not render if dismissed
  - Consider: reset flag after account-related events or app updates (product decision)
- [x] Integrate banner into home screen:
  - Import `GuestModeBanner` in home screen component
  - Render above card list, only when `useAuthState` indicates guest mode AND banner not dismissed
  - Banner should not interfere with card list scroll behavior (static position above list, or part of list header)

### T6: Dark Mode Implementation (AC7)

- [x] Apply theme tokens from 13-1 to all new and restyled components
- [x] Verify all backgrounds: white / #000000
- [x] Verify all input fields: #F5F5F5 / #2C2C2E
- [x] Verify all elevated surfaces (guest banner): white / #1C1C1E
- [x] Verify primary button colors: #1A73E8 / #4DA3FF
- [x] Verify error colors: #FF3B30 / #FF453A
- [x] Visual QA pass on all 14 Figma frames (7 screens x 2 themes)

### T7: Accessibility Pass (AC8)

- [x] Add `accessibilityRole="button"` to all tappable elements (CTAs, links, toggles, dismiss)
- [x] Add `accessibilityLabel` to all interactive elements
- [x] Password toggle: label updates on state change ("Show password" / "Hide password")
- [x] Error banner: `accessibilityLiveRegion="polite"` to announce errors
- [x] Guest banner dismiss: `accessibilityLabel="Dismiss banner"`
- [x] Ensure 44pt minimum touch targets on all buttons, links, and toggles
- [x] Form fields: `accessibilityHint` describing validation requirements

### T8: Unit Tests (AC9)

- [x] `features/auth/__tests__/CreateAccountScreen.test.tsx` (update existing):
  - Renders app icon header
  - Renders email and password fields with new styling
  - Password show/hide toggle works
  - Password strength indicator updates on input
  - Inline validation shows error on invalid email (blur)
  - "Already have an account? Sign in" link navigates correctly
  - Submit calls existing auth logic
- [x] `features/auth/__tests__/SignInScreen.test.tsx` (update existing):
  - Renders app icon header and "Welcome Back" heading
  - Renders email and password fields
  - Password show/hide toggle works
  - Error banner renders on auth failure with human-readable message
  - Field borders turn red on error
  - "Forgot password?" link navigates to forgot-password
  - "Don't have an account? Create one" link navigates to create-account
- [x] `features/auth/__tests__/ForgotPasswordScreen.test.tsx` (update existing):
  - Renders "Reset Password" heading
  - Renders email field and instruction text
  - "Send Reset Link" button submits
  - Back chevron navigates back
  - "Back to Sign In" link navigates to sign-in
- [x] `features/auth/__tests__/ResetPasswordScreen.test.tsx` (update existing):
  - Renders mail icon and "Check your email" heading
  - "Try again" link triggers re-send
- [x] `features/auth/__tests__/GuestModeBanner.test.tsx` (new):
  - Renders shield icon, headline, subtitle, CTAs
  - "Create Account" navigates to create-account
  - "Sign In" navigates to sign-in
  - Dismiss button hides banner
  - Banner does not render when previously dismissed
  - Banner does not render when user is authenticated (not guest)
- [x] `features/auth/components/__tests__/PasswordInput.test.tsx` (new):
  - Renders password field with hidden text by default
  - Toggle shows/hides password
  - Toggle accessibility label changes
- [x] `features/auth/components/__tests__/PasswordStrengthIndicator.test.tsx` (new):
  - Shows "Weak" for short/simple passwords
  - Shows "Fair" for medium complexity
  - Shows "Strong" for high complexity
  - Bar color changes with strength level
- [x] `features/auth/components/__tests__/ErrorBanner.test.tsx` (new):
  - Renders error icon and message
  - Has accessibility live region
  - Does not render when no error
- [x] Coverage >= 80% across all auth feature files

### T9: Cleanup & Remove Legacy Styling

- [x] Remove old inline styles from `CreateAccountScreen.tsx` (replaced by theme tokens + NativeWind)
- [x] Remove old inline styles from `SignInScreen.tsx`
- [x] Remove old inline styles from `ForgotPasswordScreen.tsx`
- [x] Remove old inline styles from `ResetPasswordScreen.tsx`
- [x] Remove or refactor `MigrationBanner.tsx` if its function is replaced by `GuestModeBanner`
  - If `MigrationBanner` serves a different purpose (data migration vs. account creation), keep both
  - If overlapping, consolidate into `GuestModeBanner` and remove `MigrationBanner`
- [x] Remove any emoji usage from auth screens (replace with vector icons)
- [x] Verify no dead imports or unused style objects remain
- [x] Verify route files (`app/create-account.tsx`, `app/sign-in.tsx`, `app/forgot-password.tsx`, `app/reset-password.tsx`) remain thin re-exports

## Dev Notes

### Files to Modify

- `features/auth/CreateAccountScreen.tsx` -- restyle with design system components and tokens
- `features/auth/SignInScreen.tsx` -- restyle with design system components and tokens
- `features/auth/ForgotPasswordScreen.tsx` -- restyle with design system components and tokens
- `features/auth/ResetPasswordScreen.tsx` -- restyle with design system components and tokens
- `features/auth/MigrationBanner.tsx` -- evaluate overlap with new GuestModeBanner; refactor or remove
- `features/auth/index.ts` -- update barrel exports with new components
- Home screen component -- integrate `GuestModeBanner` above card list
- `features/auth/__tests__/CreateAccountScreen.test.tsx` -- update test assertions for new UI
- `features/auth/__tests__/SignInScreen.test.tsx` -- update test assertions for new UI
- `features/auth/__tests__/ForgotPasswordScreen.test.tsx` -- update test assertions for new UI
- `features/auth/__tests__/ResetPasswordScreen.test.tsx` -- update test assertions for new UI

### New Files

- `features/auth/components/AuthScreenLayout.tsx` -- shared auth screen wrapper
- `features/auth/components/AppIconHeader.tsx` -- branded icon header
- `features/auth/components/PasswordInput.tsx` -- password field with show/hide toggle
- `features/auth/components/PasswordStrengthIndicator.tsx` -- strength bar + label
- `features/auth/components/ErrorBanner.tsx` -- form-level error display
- `features/auth/components/AuthLink.tsx` -- styled secondary navigation link
- `features/auth/components/GuestModeBanner.tsx` -- home screen guest upgrade prompt
- `features/auth/components/__tests__/PasswordInput.test.tsx`
- `features/auth/components/__tests__/PasswordStrengthIndicator.test.tsx`
- `features/auth/components/__tests__/ErrorBanner.test.tsx`
- `features/auth/__tests__/GuestModeBanner.test.tsx`

### Architecture Compliance

- Route files in `app/` remain thin re-exports -- all logic stays in `features/auth/`
- Import convention: relative within `features/auth/`, absolute `@/shared/...` for shared components
- Shared components from 13-1 (`Button`, `TextField`) imported from `@/shared/components/ui/`
- Theme tokens from `@/shared/theme/` -- no hardcoded color values in component files
- Tests co-located: screen tests in `features/auth/__tests__/`, component tests in `features/auth/components/__tests__/`
- 80% coverage threshold enforced
- Auth business logic (Supabase calls, hooks) is NOT modified -- this is visual restyle only

### Icon System (DEC-12.5-004)

All icons use `@expo/vector-icons` -- MaterialIcons (MI) and MaterialCommunityIcons (MCI):

| Icon                   | Library | Usage                                   |
| ---------------------- | ------- | --------------------------------------- |
| `chevron-left`         | MI      | Back navigation (password reset header) |
| `visibility`           | MI      | Password show toggle                    |
| `visibility-off`       | MI      | Password hide toggle                    |
| `error-outline`        | MI      | Form-level error banner icon            |
| `mail-outline`         | MI      | Password reset confirmation icon        |
| `close`                | MI      | Guest banner dismiss button             |
| `shield-check-outline` | MCI     | Guest banner trust icon                 |

### Key Design Decisions (from 12-5)

- **DEC-12.5-001:** Guest banner on HOME screen, not settings -- banner integrates into home screen above card list
- **DEC-12.5-003:** Auth visual language -- app icon in circle, centered forms, generous whitespace, design system tokens throughout
- **DEC-12.5-004:** MI/MCI icon system via @expo/vector-icons -- no FontAwesome, no emoji as icons

### Error Message Mapping

Map Supabase auth error codes to human-readable strings:

| Supabase Error        | Display Message                                         |
| --------------------- | ------------------------------------------------------- |
| `invalid_credentials` | "Incorrect email or password. Please try again."        |
| `user_already_exists` | "An account with this email already exists."            |
| `weak_password`       | "Password is too weak. Use at least 8 characters."      |
| `email_not_confirmed` | "Please verify your email address first."               |
| Network error         | "Unable to connect. Check your internet and try again." |
| Default/unknown       | "Something went wrong. Please try again."               |

### Figma Frame Reference

| Frame                          | Light         | Dark         | Component                           |
| ------------------------------ | ------------- | ------------ | ----------------------------------- |
| Sign Up -- Empty               | Frame 1 Light | Frame 1 Dark | `CreateAccountScreen`               |
| Sign Up -- Validation Error    | Frame 2 Light | Frame 2 Dark | `CreateAccountScreen` (error state) |
| Sign In -- Empty               | Frame 3 Light | Frame 3 Dark | `SignInScreen`                      |
| Sign In -- Error               | Frame 4 Light | Frame 4 Dark | `SignInScreen` (error state)        |
| Password Reset                 | Frame 5 Light | Frame 5 Dark | `ForgotPasswordScreen`              |
| Password Reset -- Confirmation | Frame 6 Light | Frame 6 Dark | `ResetPasswordScreen`               |
| Guest Upgrade Banner           | Frame 7 Light | Frame 7 Dark | `GuestModeBanner` (on home screen)  |

## Blocks

- **Blocked by 13-1** (Implement Design System Tokens & Components) -- requires `Button`, `TextField` shared components and all color/typography/spacing tokens to be in place before development begins.

## Dev Agent Record

### Attempt Log

| #   | Date       | Agent        | Result    | Reason                                                                |
| --- | ---------- | ------------ | --------- | --------------------------------------------------------------------- |
| 1   | 2026-04-07 | Amelia (Dev) | Completed | Implemented T1-T9, tests green, QA APPROVED, Dev review loop APPROVED |

### Decisions Made During Dev

- Story 12-5/13-5 frame specs used when direct Figma node context was unavailable without active node selection.

### Open Questions

- None.

### File List

- app/index.tsx
- app/**tests**/home-highlight.test.tsx
- features/auth/CreateAccountScreen.tsx
- features/auth/SignInScreen.tsx
- features/auth/ForgotPasswordScreen.tsx
- features/auth/ResetPasswordScreen.tsx
- features/auth/MigrationBanner.tsx
- features/auth/index.ts
- features/auth/components/AppIconHeader.tsx
- features/auth/components/AuthScreenLayout.tsx
- features/auth/components/AuthLink.tsx
- features/auth/components/ErrorBanner.tsx
- features/auth/components/PasswordInput.tsx
- features/auth/components/PasswordStrengthIndicator.tsx
- features/auth/components/GuestModeBanner.tsx
- features/auth/components/index.ts
- features/auth/**tests**/CreateAccountScreen.test.tsx
- features/auth/**tests**/SignInScreen.test.tsx
- features/auth/**tests**/ForgotPasswordScreen.test.tsx
- features/auth/**tests**/ResetPasswordScreen.test.tsx
- features/auth/**tests**/GuestModeBanner.test.tsx
- features/auth/components/**tests**/PasswordInput.test.tsx
- features/auth/components/**tests**/PasswordStrengthIndicator.test.tsx
- features/auth/components/**tests**/ErrorBanner.test.tsx
- shared/components/ui/Button.tsx
- shared/components/ui/TextField.tsx
- shared/theme/colors.ts
- docs/sprint-artifacts/stories/13-5-restyle-auth-screens.md
- docs/sprint-artifacts/sprint-status.yaml
