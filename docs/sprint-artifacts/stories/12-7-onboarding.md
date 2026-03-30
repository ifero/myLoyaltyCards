# Story 12.7: Onboarding Flow

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** review
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

---

## Story

**As a** first-time user,
**I want** a welcoming, engaging onboarding experience,
**So that** I understand the app's value and can add my first card with confidence.

---

## Context & Problems to Solve

**Current state:**

- Onboarding exists (Epic 4) but was built function-first
- Welcome screen, first-card guidance, and help/FAQ are implemented
- Visual quality likely matches the rest of the app (minimal design effort)
- No clear visual identity or brand personality established in the first impression

---

## Acceptance Criteria

### AC1: Welcome Screen ✅

```
Given I open the app for the first time
Then I see a welcome screen that:
  - Shows the app logo/icon prominently ✅ → branded card icon in soft primary circle (100px)
  - Has a clear, concise value proposition (1-2 lines) ✅ → "Your loyalty cards, always with you"
  - Optionally shows 2-3 swipeable feature highlights with illustrations ✅ → 3 highlight slides with Skip
  - Has a primary CTA: "Get Started" or "Add Your First Card" ✅ → "Get Started" 52px primary filled
  - Has a secondary option: "I already have an account — Sign In" ✅ → "I already have an account" text link
And the screen establishes the app's visual identity and personality ✅ → fanned card illustration, brand colors
```

**Figma frames:** "Welcome — Light/Dark"

### AC2: First Card Guidance ✅

```
Given I've passed the welcome screen and have no cards
Then I see contextual guidance to add my first card:
  - Visual prompt (illustration or animated hint) ✅ → card-with-plus icon in 120px circle
  - Clear CTA to start adding a card ✅ → "Add Your First Card" 52px primary filled
  - Brief explanation of what the app does ✅ → "Add your first loyalty card to get started. It only takes a few seconds!"
And this transitions smoothly to the Add Card flow (12-4) ✅ → CTA leads to Add Card
```

**Figma frames:** "First Card Guidance — Light/Dark"

### AC3: Visual Consistency ✅

```
Given the onboarding screens
Then they use the design system colors, typography, and components from 12-1 ✅ → Inter font, primary #1A73E8/#0A84FF, 24px padding
And illustrations/graphics match the app's visual identity ✅ → consistent icon circles, card shapes, brand palette
And the experience feels polished, not template-generic ✅ → custom illustrations, thoughtful copy, smooth flow
```

---

## Figma Deliverable

**Page name:** `Onboarding`

**Frames (light + dark for each):**

1. Welcome screen — first page ✅
2. Mode Selection — "Keep cards on this device" vs "Sync across all devices" ✅
3. Feature highlight 1 — "All your cards in one place" ✅
4. Feature highlight 2 — "Scan or add manually" ✅
5. Feature highlight 3 — "Your data, your rules" ✅
6. First card guidance — empty home with prompt ✅
7. Mode Selection — info tooltip edge case ✅

**Total: 14 frames (7 concepts × light + dark)**

---

## Design Notes

- First impressions matter — this is where the app establishes brand trust
- Keep it brief — users want to get to the app, not read a tutorial
- The transition from onboarding → empty home → add first card should feel like one smooth journey
- Consider if the welcome screen needs to work as a "splash" for returning users or only for first launch

## Design Decisions (Party Mode Session — 2026-03-30)

### DEC-12.7-001: Reframe "Guest Mode" as Outcome-Based Choice

- **Context:** The original story and existing codebase use "guest mode" terminology. ifero flagged that users are not guests — choosing local storage is a valid preference, not a limitation.
- **Decision:** Onboarding presents the choice as outcomes, not modes:
  - **"Keep cards on this device"** (MI: smartphone) — Fast and private. Primary/recommended option.
  - **"Sync across all devices"** (MI: cloud-upload) — Create a free account. Secondary option.
  - No "guest" or "local mode" label in the UI. Internally, local mode maps to the existing guest mode behavior (Epic 6, story 6-5).
- **Rationale:** "Keep cards on this device" is immediately understandable. "Guest mode" implies second-class status and creates anxiety about data loss.
- **Status:** Approved by creative team (Sally, John, Maya, Winston)

### DEC-12.7-002: Local-First Default with Easy Upgrade Path

- **Context:** First-time users at the checkout counter need to add a card NOW, not create an account.
- **Decision:** "Keep cards on this device" is the recommended/primary option with a "Recommended" badge. Cloud sync is secondary. The local card includes "You can create an account later" reassurance. The home screen upgrade banner (designed in 12-5) handles conversion later.
- **Rationale:** Reduces friction to first card. Conversion happens when users have cards worth protecting, not before they've seen value.
- **Status:** Approved by creative team

### DEC-12.7-003: Data Ownership Highlight Slide

- **Context:** Export (existing) and Import (13-7a) are planned features. Users who choose local mode need confidence they won't be locked in.
- **Decision:** Third highlight slide is "Your data, your rules" — emphasizing export/import capabilities and no lock-in. The mode selection footer also reinforces: "Your data is always yours. Export or import your cards anytime from Settings."
- **Rationale:** Trust signal that reduces account-creation anxiety and differentiates from competitor apps.
- **Status:** Approved by creative team

### DEC-12.7-004: No Device Detection — Direct Sign-In Link (DEC-12.5-002 Resolution)

- **Context:** DEC-12.5-002 flagged that returning users on a new device land in local mode with no sign-in prompt. Initial proposal was a "Welcome back!" screen that detected returning users.
- **Decision:** Detecting returning users requires storing/reading device information, which directly contradicts the privacy-first "your data, your choice" philosophy. Instead, the Welcome screen simply includes "I already have an account" as a secondary CTA that navigates directly to the Sign In screen (12-5). No detection, no separate screen — just a clear path for anyone who already has an account.
- **Rationale:** Privacy-consistent. The user tells us who they are — we don't try to figure it out.
- **Status:** Approved — resolves DEC-12.5-002 without device fingerprinting

### DEC-12.7-006: Info Tooltip Trigger — "What's the difference?" Link

- **Context:** The Mode Selection info tooltip modal was designed but had no visible trigger on the Mode Selection screen.
- **Decision:** Added underlined "What's the difference?" link below the data ownership footer text on Mode Selection. Tapping it opens the info tooltip modal explaining both storage options.
- **Status:** Applied

### DEC-12.7-007: Highlight CTAs Pinned to Bottom

- **Context:** Original layout had CTAs in the middle of the screen, wasting space for illustrations.
- **Decision:** "Next" / "Let's go!" buttons and pagination dots are pinned to the bottom of highlight screens, freeing the middle area for larger, more impactful illustrations.
- **Status:** Applied

### DEC-12.7-005: Skip Affordance on Highlights

- **Context:** Feature highlight slides are informative but not critical. Some users will want to skip.
- **Decision:** Each highlight slide has a "Skip" text link at top-right. Tapping it jumps directly to the first card guidance screen. No skip confirmation — respecting the user's time IS the onboarding experience.
- **Status:** Approved by creative team
