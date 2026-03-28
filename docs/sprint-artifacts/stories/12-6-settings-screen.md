# Story 12.6: Settings Screen

**Epic:** 12 - App-Wide Design Overhaul
**Type:** Design
**Status:** ready-for-design
**Sprint:** 10
**Depends On:** 12-1 (Design System Foundation)
**Figma File:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test

---

## Story

**As a** user managing my app preferences,
**I want** a well-organized, visually clear settings screen with discoverable options,
**So that** I can customize the app and manage my account without hunting for hidden options.

---

## Context & Problems to Solve

**Current state:**

- Three giant pale-yellow cards floating in white space — no structure
- "Guest Mode", "Create an Account", "Already have an account?" are text blocks, not actionable UI elements
- No icons, no chevrons, no visual affordance for any action
- "Help & FAQ" is tiny green text at the bottom — invisible
- "Catalogue Version" is shown but feels like debug info, not user-facing content
- No theme toggle, language picker, or export option (Epic 8 features — design them now)

**Klarna reference:**

- Uses a "More" tab with organized sections and icon + label + chevron rows
- Clean section grouping with headers

---

## Acceptance Criteria

### AC1: Account Section

```
Given I am signed in
Then the top of settings shows my account info:
  - Email address or user identifier
  - Account status indicator
  - "Sign Out" action
  - "Delete Account" action (destructive, de-emphasized)

Given I am in guest mode
Then the top shows a guest mode indicator with upgrade CTAs:
  - "Create Account" (primary CTA)
  - "Sign In" (secondary CTA)
```

### AC2: Preferences Section

```
Given I am on the settings screen
Then a "Preferences" section shows:
  - Theme: Light / Dark / System toggle or picker (with preview of current theme)
  - Language: current language with picker (chevron to language list)
And each row uses the icon + label + value/chevron pattern
And toggles/pickers follow the design system components
```

### AC3: Data Management Section

```
Given I am on the settings screen
Then a "Data" section shows:
  - "Export Data as JSON" with file/export icon
  - Sync status (if signed in): last synced timestamp, manual sync trigger
And actions are clearly labeled with appropriate icons
```

### AC4: About Section

```
Given I am on the settings screen
Then an "About" section shows:
  - App version
  - Catalogue version (with date)
  - "Help & FAQ" link (clearly visible, not hidden)
  - "Privacy Policy" link
And the section is at the bottom but still discoverable
```

### AC5: Overall Layout

```
Given I am on the settings screen
Then sections are visually grouped with clear headers
And each setting row uses consistent icon + label + value/chevron pattern
And the screen is scrollable if content exceeds viewport
And there is proper spacing between sections
And the design works in both light and dark mode
```

---

## Figma Deliverable

**Page name:** `Settings`

**Frames (light + dark for each):**

1. Settings — signed in user
2. Settings — guest mode
3. Theme picker expanded
4. Language picker expanded

---

## Design Notes

- This screen is the #1 pain point ifero identified — it must be night and day improvement
- Use grouped list rows (iOS Settings pattern) with icons for each item
- Account section at top (most important), About at bottom (least accessed)
- Destructive actions (sign out, delete account) should be clearly marked but not prominent
- Consider using SF Symbols for setting icons to stay native
