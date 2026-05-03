# Story 6.18a: OTP Verification Follow-up — Single Field + 8-Digit Alignment

**Epic:** 6 - User Authentication & Privacy
**Type:** Bug Fix + Design Alignment
**Status:** done

## Story

As a new user verifying my email address,
I want the app to accept the real 8-digit OTP in a single text field,
so that verification succeeds reliably and the entry UI stays readable on mobile.

## Context

This is a post-merge bugfix follow-up to Story 6.18.

Production-style validation exposed three regressions in the shipped OTP flow:

1. **Length mismatch across the stack**
   - The verification screen, tests, copy, and local Supabase config were hardcoded to 6 digits.
   - The intended verification flow now uses an 8-digit email OTP and the merged UI does not match it.

2. **Design mismatch for longer OTP entry**
   - Story 6.17 delivered 6 individual OTP cells.
   - That pattern becomes visually noisy and awkward for an 8-digit code.
   - The approved follow-up direction for this bugfix is a **single OTP text field** on the existing `OTP Verification` Figma page, in both light and dark variants.

3. **Verification call needs current-contract alignment**
   - The existing auth wrapper still verifies email OTPs using the older `type: 'signup'` branch documented in Story 6.18.
   - Current Supabase documentation for email OTP verification uses `verifyOtp({ email, token, type: 'email' })`.
   - The follow-up must revalidate the live flow against the current auth contract and update the client/tests accordingly.

**Design update order (locked by stakeholder request):** update Figma first, then update the code.

**Figma file:** `https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test`
**Figma page:** `OTP Verification`
**Parent story:** `6.18 — OTP Email Verification Flow`

## Acceptance Criteria

### AC1: Figma follow-up is applied first

- [x] Existing `OTP Verification` Figma page updated before app-code changes continue
- [x] All light/dark state frames replace the OTP cell row with a single text field
- [x] Subtitle copy reads `We sent an 8-digit code to {email}`
- [x] Interaction annotation is updated from auto-submit on 6th digit to auto-submit on 8th digit

### AC2: Supabase/email OTP configuration aligns to 8 digits

- [x] `supabase/config.toml` sets `auth.email.otp_length = 8` for the email confirmation flow
- [x] Confirmation email template remains OTP-based (`{{ .Token }}`) and still presents the longer code cleanly
- [x] Any repo docs that still define the email verification OTP as 6 digits are corrected or superseded by this story

### AC3: Auth verification flow uses the current email OTP contract

- [x] `verifyEmailOtp(email, token)` verifies with the current Supabase email OTP type expected by the live flow
- [x] `shared/supabase/auth.test.ts` asserts the exact `verifyOtp(...)` payload used by the client
- [x] Existing stable UI error normalization remains intact (`invalid_otp`, `expired_otp`, `network_error`, `unknown_error`)

### AC4: `/verify-email` screen uses a single 8-digit field

- [x] `VerifyEmailScreen` uses one OTP `TextInput` / text field instead of per-digit cells
- [x] The field accepts digits only and caps entry at 8 characters
- [x] Full 8-digit paste works
- [x] Entering the 8th digit triggers verification automatically
- [x] The Confirm CTA stays disabled until exactly 8 digits are present
- [x] Existing resend / error / success / wrong-email navigation states still work

### AC5: Regression coverage and validation

- [x] `features/auth/__tests__/VerifyEmailScreen.test.tsx` covers the new single-field 8-digit flow
- [x] `shared/supabase/auth.test.ts` covers the aligned verification payload
- [x] Targeted OTP tests pass
- [x] `yarn lint`, `yarn typecheck`, and the relevant Jest coverage pass

### AC6: Review workflow

- [x] Dev review completed by a different model/agent with **0 comments / approved** before QA starts
- [x] QA review runs only after dev approval and finishes approved

## Technical Notes

- Preserve current route and stack behavior from Story 6.18.
- Keep resend cooldown persistence based on absolute expiry timestamps.
- Prefer a centered, code-friendly single field over a generic left-aligned form input if that better matches the auth-screen layout.
- Record any unavoidable production/dashboard follow-up separately if repo config and hosted config still need manual sync.

## Tasks / Subtasks

- [x] **Task 1: Re-baseline the failing OTP contract** (AC2, AC3, AC5)
  - [x] 1.1 Add/update failing tests for 8-digit verification input and the expected `verifyOtp(...)` payload
  - [x] 1.2 Align local Supabase email OTP length config to 8 digits
  - [x] 1.3 Reconfirm OTP error normalization coverage stays stable

- [x] **Task 2: Replace the cell row with a single field** (AC1, AC4)
  - [x] 2.1 Update Figma `OTP Verification` page first
  - [x] 2.2 Refactor `VerifyEmailScreen` to a single centered OTP field
  - [x] 2.3 Preserve resend, error, loading, and navigation states

- [x] **Task 3: Validate the follow-up slice** (AC5)
  - [x] 3.1 Run targeted OTP/auth tests
  - [x] 3.2 Run lint + typecheck
  - [x] 3.3 Run any broader Jest validation needed by touched auth files

- [x] **Task 4: Review the fix in sequence** (AC6)
  - [x] 4.1 Request dev review from a different model/agent
  - [x] 4.2 Address review findings until approval with zero comments remaining
  - [x] 4.3 Request QA review after dev approval

## Dev Agent Record

### Agent Model Used

GPT-5.4

### Debug Log References

- 2026-05-03: Follow-up story created after stakeholder reported the merged OTP flow as broken in production-style usage.
- 2026-05-03: Existing Figma `OTP Verification` page updated first to replace the OTP cell row with a single 8-digit field across all approved states.
- 2026-05-03: Investigation confirmed the repo still hardcoded 6 digits in UI/tests/docs and was still using the older verification contract.
- 2026-05-03: Validation passed with targeted OTP/auth tests (70), full Jest suite (1320), `yarn lint`, and `yarn typecheck`.
- 2026-05-03: First external review pass requested one substantive fix: allow formatted 8-digit paste values to sanitize correctly before auto-submit.
- 2026-05-03: Second dev review returned `APPROVED`; QA review then requested only story/sprint tracking alignment to the real `review` phase.
- 2026-05-03: Final QA review returned `APPROVED` after the story artifact and sprint tracking were aligned and the new story file was git-tracked.

### Completion Notes List

- Updated the existing Figma `OTP Verification` page first, replacing the OTP cell row with a single 8-digit field across all 20 light/dark state frames.
- Switched local email OTP config to 8 digits and tightened the confirmation email OTP block styling for the longer token.
- Refactored `VerifyEmailScreen` from per-digit cells to a single centered OTP field while preserving resend cooldown, error handling, and stack-reset navigation.
- Aligned `verifyEmailOtp()` to the current email OTP verification payload and updated auth tests accordingly.
- Added regression coverage for sequential entry, raw 8-digit paste, and formatted paste sanitization.
- Dev review and QA review were both approved; stakeholder sign-off is now recorded and the story is marked `done` for handoff.

### Change Log

- 2026-05-03: Story created and moved directly to `in-progress` because stakeholder requested immediate follow-up implementation.
- 2026-05-03: Figma page updated first per stakeholder instruction.
- 2026-05-03: Updated local email OTP config, confirmation email styling, auth verification payload, and `VerifyEmailScreen` to the new 8-digit single-field flow.
- 2026-05-03: Added OTP regression coverage, ran targeted + full validation, and addressed the first external review finding on formatted paste handling.
- 2026-05-03: Moved the story artifact to `review` after dev approval and aligned tracking metadata to the latest validation run.
- 2026-05-03: Recorded final QA approval after git-tracking the new story artifact and confirming sprint/story state alignment.
- 2026-05-03: Recorded stakeholder approval, moved the follow-up to `done`, and prepared the change set for atomic commits + PR creation.

### File List

- `docs/sprint-artifacts/stories/6-18a-otp-verification-followup.md` — NEW: tracks the OTP single-field and 8-digit follow-up bugfix
- `docs/sprint-artifacts/sprint-status.yaml` — MODIFIED: adds Story 6.18a to Sprint 14 tracking
- `features/auth/VerifyEmailScreen.tsx` — MODIFIED: replaces the OTP cell row with a single centered 8-digit input and preserves existing verification states
- `features/auth/__tests__/VerifyEmailScreen.test.tsx` — MODIFIED: updates the OTP component coverage for 8-digit entry, paste, and formatted paste sanitization
- `shared/supabase/auth.ts` — MODIFIED: aligns email OTP verification to the current `verifyOtp(...)` payload
- `shared/supabase/auth.test.ts` — MODIFIED: updates auth payload assertions and 8-digit OTP fixtures
- `supabase/config.toml` — MODIFIED: sets email OTP length to 8 digits
- `supabase/templates/confirmation.html` — MODIFIED: improves OTP token presentation for the longer code

## Status

done
