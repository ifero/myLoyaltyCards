# Story 6.17: Design — OTP Email Verification Screen

**Epic:** 6 - User Authentication & Privacy
**Type:** Design (UX Deliverable)
**Status:** done

## Story

As a designer,
I want to design the OTP email verification screen that follows account creation,
so that developers have approved, pixel-accurate Figma frames to implement in Story 6.18 and users get a familiar, trustworthy in-app verification experience.

## Context

Currently the app sends a magic link email after registration. Magic links are fragile on mobile — they open Safari, lose the app's navigation state, and require deep link handling. Replacing them with OTP (one-time passcode) keeps the user entirely inside the app.

This is a **design-only story**. No code changes. The deliverable is Figma frames covering all states of the new `/verify-email` screen. Ifero approved these frames on 2026-04-28, clearing the design dependency for Story 6.18.

The new screen must feel visually consistent with the existing auth screens delivered in Story 13.5 — same layout language, tokens, components.

**Reference:** Story 13.5 auth screen frames in Figma: https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

**Refinement input incorporated:** UX specialist review, 2026-04-28

## UX Handoff Notes

These notes lock the interaction details that Story 6.18 needs for implementation and QA.

### Interaction contract

- The approved prototype locks verification to auto-submit immediately on entry of the 6th digit or after a full 6-digit paste.
- Focus starts on the first OTP cell when the screen loads.
- Entering one numeric digit advances focus to the next cell.
- Pressing backspace on an empty cell moves focus to the previous cell and clears that digit.
- Pasting a full 6-digit numeric code distributes digits across all cells left-to-right.
- Any edit after an error clears the error styling and inline error copy immediately.
- The Confirm CTA stays disabled until all 6 cells contain numeric characters.
- The Loading state begins immediately on the 6th digit and the CTA/loading visuals remain visually in sync with the OTP cells.
- A successful resend restarts the 60-second cooldown; a failed resend does not.
- Verification-unavailable, resend-success, and resend-failure outcomes must have explicit approved visual treatment in both light and dark mode.

### Layout and responsive notes

- The email line must support long addresses without pushing the OTP row off-screen; annotate whether the design wraps to two lines max or truncates the middle.
- The OTP row must still fit cleanly at 320px width without clipping.
- With the software keyboard visible on smaller devices, the OTP row, active cell, Confirm CTA, and bottom navigation link must remain reachable.
- Safe-area spacing should match the existing 13.5 auth screens for top and bottom edges.

### Navigation and handoff notes

- Success is transition-only and practically instant: any success styling is visible only momentarily before immediate navigation to the main app, with no terminal confirmation screen.
- The prototype must annotate the "Wrong email? Go back" behavior: it returns to Create Account and explicitly states what is preserved versus reset.

### Deliverable frame inventory

- OTP Verify — Empty — Light
- OTP Verify — Filling — Light
- OTP Verify — Complete — Light
- OTP Verify — Loading — Light
- OTP Verify — Wrong OTP — Light
- OTP Verify — Expired OTP — Light
- OTP Verify — Verification Unavailable — Light
- OTP Verify — Resend Success — Light
- OTP Verify — Resend Failure — Light
- OTP Verify — Success — Light
- OTP Verify — Empty — Dark
- OTP Verify — Filling — Dark
- OTP Verify — Complete — Dark
- OTP Verify — Loading — Dark
- OTP Verify — Wrong OTP — Dark
- OTP Verify — Expired OTP — Dark
- OTP Verify — Verification Unavailable — Dark
- OTP Verify — Resend Success — Dark
- OTP Verify — Resend Failure — Dark
- OTP Verify — Success — Dark

### Review notes

- Reuse the approved auth tokens, spacing, button styles, and icon treatment from Story 13.5.
- Include prototype annotations for auto-advance, backspace, resend cooldown, verify trigger, wrong-email navigation, and keyboard-open behavior.
- Record the final approved frame names and the locked verify-trigger decision in Story 6.18 once approval is complete.

## Acceptance Criteria

### AC1: Screen layout

- [x] App icon at top centre (same treatment as Sign Up / Sign In screens from 13.5)
- [x] Heading: "Verify your email"
- [x] Subtitle: "We sent a 6-digit code to {email}" — email address is displayed so the user can confirm the right inbox
- [x] 6 individual OTP cell inputs arranged horizontally with equal spacing
- [x] Each cell: rounded square border, single-digit display, large readable font
- [x] Active cell highlighted (primary colour border or fill)
- [x] "Confirm" primary CTA button below the cells (disabled until all 6 digits entered)
- [x] "Resend code" text link below the CTA — disabled and shows countdown timer ("Resend in 0:42") for 60s after send, then becomes active
- [x] "Wrong email? Go back" text link at the bottom
- [x] Prototype annotations explicitly lock auto-submit on the 6th digit

### AC2: States designed

- [x] **Empty** — all 6 cells empty, CTA disabled, resend in cooldown
- [x] **Filling** — partial entry, CTA still disabled
- [x] **Complete** — all 6 cells filled, CTA enabled (primary active state)
- [x] **Loading** — CTA in loading state (spinner) while verifying
- [x] **Error: wrong OTP** — cells highlighted in error red, error text below cells ("Incorrect code. Please try again.")
- [x] **Error: expired OTP** — error state with message "This code has expired. Please request a new one." and Resend link active
- [x] **Error: verification unavailable** — error state with message "Couldn't verify right now. Check your connection and try again."
- [x] **Resend success** — inline confirmation state/message ("Code resent") with cooldown restarted
- [x] **Resend failure** — inline error state/message with cooldown unchanged
- [x] **Success** — transition-only success feedback, visible only momentarily before immediate navigation

### AC3: Light and dark mode variants

- [x] Every state from AC2 exists in both light mode and dark mode
- [x] Tokens match 13.5 auth screens: backgrounds, input field colours, border colours, error colours, primary button styling

### AC4: Figma delivery

- [x] All frames added to the existing Figma file under a new "OTP Verification" page or section
- [x] Frames named consistently: "OTP Verify — {State} — {Light/Dark}"
- [x] Components reuse shared auth design components where applicable (app icon, button, error banner)
- [x] Prototype annotations cover keyboard-open behavior, wrong-email navigation behavior, and success handoff destination/timing
- [x] Figma link shared with Ifero for approval before Story 6.18 begins

### AC5: Stakeholder approval gate

- [x] Ifero reviews and approves Figma frames before Story 6.18 is moved to `ready-for-dev`
- [x] Any requested changes to frames are applied and re-approved in the same story cycle

## Definition of Done

- [x] All states (AC2) designed in both light and dark (AC3)
- [x] Figma frames delivered and shared
- [x] Ifero has explicitly approved the designs
- [x] Story 6.18 design dependency cleared; remaining non-design readiness items are tracked in Story 6.18

## Definition of Ready Checklist

| #   | Gate               | Status                                                                         |
| --- | ------------------ | ------------------------------------------------------------------------------ |
| 1   | Design Approved    | N/A — this is the design-deliverable story extending approved 13.5 auth frames |
| 2   | Story Spec Final   | ✅ Acceptance criteria and handoff notes are documented                        |
| 3   | Interaction Spec   | ✅ OTP focus, paste, backspace, cooldown, and success handoff defined          |
| 4   | Dependencies Clear | ✅ Story 13.5 is done; no future story is required before this one             |
| 5   | Edge Cases Defined | ✅ Empty, partial, loading, wrong OTP, expired OTP, success, dark mode         |
| 6   | Tech Notes         | ✅ Frame inventory and reuse constraints documented above                      |
| 7   | Testability        | ✅ ACs and DoD define a reviewable frame/state checklist                       |
