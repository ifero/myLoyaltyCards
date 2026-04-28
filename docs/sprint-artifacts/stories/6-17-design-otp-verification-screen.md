# Story 6.17: Design — OTP Email Verification Screen

**Epic:** 6 - User Authentication & Privacy
**Type:** Design (UX Deliverable)
**Status:** backlog

## Story

As a designer,
I want to design the OTP email verification screen that follows account creation,
so that developers have approved, pixel-accurate Figma frames to implement in Story 6.18 and users get a familiar, trustworthy in-app verification experience.

## Context

Currently the app sends a magic link email after registration. Magic links are fragile on mobile — they open Safari, lose the app's navigation state, and require deep link handling. Replacing them with OTP (one-time passcode) keeps the user entirely inside the app.

This is a **design-only story**. No code changes. The deliverable is Figma frames covering all states of the new `/verify-email` screen. Story 6.18 (OTP implementation) is **blocked** on Ifero's approval of these frames.

The new screen must feel visually consistent with the existing auth screens delivered in Story 13.5 — same layout language, tokens, components.

**Reference:** Story 13.5 auth screen frames in Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

## Acceptance Criteria

### AC1: Screen layout

- [ ] App icon at top centre (same treatment as Sign Up / Sign In screens from 13.5)
- [ ] Heading: "Verify your email"
- [ ] Subtitle: "We sent a 6-digit code to {email}" — email address is displayed so the user can confirm the right inbox
- [ ] 6 individual OTP cell inputs arranged horizontally with equal spacing
- [ ] Each cell: rounded square border, single-digit display, large readable font
- [ ] Active cell highlighted (primary colour border or fill)
- [ ] "Confirm" primary CTA button below the cells (disabled until all 6 digits entered)
- [ ] "Resend code" text link below the CTA — disabled and shows countdown timer ("Resend in 0:42") for 60s after send, then becomes active
- [ ] "Wrong email? Go back" text link at the bottom

### AC2: States designed

- [ ] **Empty** — all 6 cells empty, CTA disabled, resend in cooldown
- [ ] **Filling** — partial entry, CTA still disabled
- [ ] **Complete** — all 6 cells filled, CTA enabled (primary active state)
- [ ] **Loading** — CTA in loading state (spinner) while verifying
- [ ] **Error: wrong OTP** — cells highlighted in error red, error text below cells ("Incorrect code. Please try again.")
- [ ] **Error: expired OTP** — error state with message "This code has expired. Please request a new one." and Resend link active
- [ ] **Success** — brief success indicator before navigation (checkmark animation or green state)

### AC3: Light and dark mode variants

- [ ] Every state from AC2 exists in both light mode and dark mode
- [ ] Tokens match 13.5 auth screens: backgrounds, input field colours, border colours, error colours, primary button styling

### AC4: Figma delivery

- [ ] All frames added to the existing Figma file under a new "OTP Verification" page or section
- [ ] Frames named consistently: "OTP Verify — {State} — {Light/Dark}"
- [ ] Components reuse shared auth design components where applicable (app icon, button, error banner)
- [ ] Figma link shared with Ifero for approval before Story 6.18 begins

### AC5: Stakeholder approval gate

- [ ] Ifero reviews and approves Figma frames before Story 6.18 is moved to `ready-for-dev`
- [ ] Any requested changes to frames are applied and re-approved in the same story cycle

## Definition of Done

- [ ] All states (AC2) designed in both light and dark (AC3)
- [ ] Figma frames delivered and shared
- [ ] Ifero has explicitly approved the designs
- [ ] Story 6.18 unblocked and moved to `ready-for-dev`
