# Story 12.7: Onboarding Flow

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
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

### AC1: Welcome Screen

```
Given I open the app for the first time
Then I see a welcome screen that:
  - Shows the app logo/icon prominently
  - Has a clear, concise value proposition (1-2 lines)
  - Optionally shows 2-3 swipeable feature highlights with illustrations
  - Has a primary CTA: "Get Started" or "Add Your First Card"
  - Has a secondary option: "I already have an account — Sign In"
And the screen establishes the app's visual identity and personality
```

### AC2: First Card Guidance

```
Given I've passed the welcome screen and have no cards
Then I see contextual guidance to add my first card:
  - Visual prompt (illustration or animated hint)
  - Clear CTA to start adding a card
  - Brief explanation of what the app does
And this transitions smoothly to the Add Card flow (12-4)
```

### AC3: Visual Consistency

```
Given the onboarding screens
Then they use the design system colors, typography, and components from 12-1
And illustrations/graphics match the app's visual identity
And the experience feels polished, not template-generic
```

---

## Figma Deliverable

**Page name:** `Onboarding`

**Frames (light + dark for each):**

1. Welcome screen — first page
2. Feature highlights (if multi-page: 2-3 slides)
3. First card guidance (empty home with prompt)

---

## Design Notes

- First impressions matter — this is where the app establishes brand trust
- Keep it brief — users want to get to the app, not read a tutorial
- The transition from onboarding → empty home → add first card should feel like one smooth journey
- Consider if the welcome screen needs to work as a "splash" for returning users or only for first launch
