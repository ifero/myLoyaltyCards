---
baseline_commit: 2de61e7016dfab9c1e91a4b5964714224f38daf2
retroactive: true
completed_in: 'several, across `docs/cardi-redesign-carry-over`'
---

# Story 20.2: Nine screen patterns, drawn — every route has a reference frame

Status: done

Epic: 20 — Cardì Identity & Design System

> **📌 WRITTEN RETROACTIVELY (2026-09-01).** This work was completed across August 2026 and is
> committed; the epic was only written up afterwards. The story is a **record**, not a brief —
> its acceptance criteria describe what was delivered and are checkable against the repo today.

## What was delivered

Thirty-five frames across nine patterns in `docs/design/cardi/frames/`, and a matching Stitch
prompt file per pattern.

| pattern     | frames | covers                                                                           |
| ----------- | ------ | -------------------------------------------------------------------------------- |
| wallet      | 4      | populated · empty · single card · no results                                     |
| card-detail | 4      | at rest · blending · condensed · +                                               |
| barcode     | 3      | EAN-13 · QR · card not found                                                     |
| capture     | 4      | brand list · viewfinder · no camera · many codes                                 |
| form        | 4      | default · error · filled · saving                                                |
| settings    | 6      | signed in · guest · picker sheet · confirm sheet                                 |
| document    | 3      | prose · searchable FAQ · two-column table                                        |
| auth        | 6      | sign in · create account · forgot password · OTP · new password · request failed |
| onboarding  | 6      | welcome · modes · difference sheet · scan-or-add · highlights                    |

## Acceptance criteria

- [x] **All 21 routes are covered**, including the two that are not obvious: `data-summary` is in
      `stitch-prompts-document.txt`, and `recovery-otp` has no frame because it reuses
      `VerifyEmailScreen` (`const RecoveryOtpScreen = () => <VerifyEmailScreen purpose="recovery" />`).
- [x] Every frame is **393 × 852**; no desktop or tablet frames exist.
- [x] The states that actually break layouts are drawn, not just the happy path — empty, single
      item, no results, error, saving, permission refused.
- [x] **Each prompt block is standalone.** A prompt may not refer to anything outside itself,
      including a shared preamble or a common chrome section.
- [x] **Colours in prompts are literal hexes**, with an explicit rule forbidding semantic names.
- [x] The nine prompt files carry an explicit **accent direction** clause, stated three ways.

## The two rules that cost the most to learn

**A prompt may not refer to anything outside itself.** Three frames that said "apply the COMMON
CHROME above" came back as three _different_ invented screens. Divergence in different directions
is the signature of a dangling reference; divergence in one direction is a bad instruction.

**Audit the DOM, never the screenshot.** Stitch screenshots clip at 884px and wear a device
bezel, which produced three false-positive "defects" that did not exist in the markup.
