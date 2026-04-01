# Story 13.6: Implement Settings Screen (Absorbs Epic 8)

Status: ready-for-dev

## Story

As a user managing my app preferences and account,
I want a polished settings screen with theme toggle, language picker, data export, sync controls, and account management,
so that I can customize my experience, back up my cards, and manage my account from one unified location that matches the quality of the redesigned app.

## Context

This is the **heaviest story in Wave 3** -- it absorbs the entirety of Epic 8 (Settings & Preferences) into the Epic 13 restyle. It implements the approved Figma designs from Story 12-6, which delivered 26 frames (13 concepts x light + dark).

The existing `features/settings/SettingsScreen.tsx` is a monolithic 506-line component built incrementally across Stories 1.5, 6.5, 6.9, 6.10, 6.11, and 7.7. It uses inline `Pressable` buttons with hardcoded colors, `Alert.alert()` for confirmations, a React Native `Modal` for delete confirmation, and emoji-based icons. This story replaces that architecture with a sectioned, scrollable screen built on the 13-1 design system components (`ActionRow`, `Button`, `BottomSheet`) and design tokens.

**New features added by this story (from Epic 8):**

- Theme picker (Light / Dark / System) via bottom sheet -- currently the app only follows system preference with no user override
- Language picker with chevron navigation to language list
- Export Data as JSON with confirmation bottom sheet and empty-state handling
- Import Data entry point (scaffold only -- full implementation is 13-7a)
- Manual sync trigger button alongside existing sync status

**Existing features restyled by this story:**

- Account section (signed-in: email + status + Sign Out + Delete Account; guest: badge + upgrade CTAs)
- Sync status display (last synced timestamp)
- About section (app version, catalogue version, Help & FAQ, Privacy Policy)
- Sign Out confirmation dialog (Alert.alert -> bottom sheet)
- Delete Account multi-step confirmation (Modal -> bottom sheet with destructive CTA ordering)

Story 13-1 provides the design system foundation: `ActionRow`, `Button`, `BottomSheet`, and all color/typography/spacing tokens.

**Figma file:** https://www.figma.com/design/4PSsX8SyTUU0GCUdBAAEED/Test
**Figma page:** Settings
**Design story reference:** docs/sprint-artifacts/stories/12-6-settings-screen.md

## Acceptance Criteria

### AC1: Screen Layout & Section Structure

- [ ] Scrollable screen with section groups: Account, Preferences, Data Management, About
- [ ] Each section has a header label (e.g., "Preferences", "Data Management", "About")
- [ ] Sections use consistent vertical spacing between groups (design tokens from 13-1)
- [ ] 24px horizontal padding throughout (matches design token reference)
- [ ] Content scrolls if it exceeds viewport height
- [ ] No tab bar overlap -- content bottom inset accounts for tab bar height
- [ ] Light mode: white background; Dark mode: #000000 background
- [ ] Matches Figma frames: "Settings (Light)" / "Settings (Dark)"

### AC2: Account Section -- Signed In

- [ ] Displayed at top of screen when user is authenticated
- [ ] Shows user email address and account status
- [ ] "Sign Out" action row: icon + label + chevron, triggers sign-out confirmation bottom sheet
- [ ] "Delete Account" action row: destructive styling (red text), de-emphasized placement below Sign Out
- [ ] Uses `ActionRow` component from 13-1 for both actions
- [ ] Email and status text uses typography tokens from 13-1
- [ ] Matches Figma frames: "Settings Signed In (Light)" / "Settings Signed In (Dark)"

### AC3: Account Section -- Guest Mode

- [ ] Displayed at top of screen when user is NOT authenticated
- [ ] Guest mode indicator badge (icon + "Guest Mode" label)
- [ ] "Create Account" upgrade CTA using `Button` variant: primary from 13-1
- [ ] "Sign In" CTA using `Button` variant: secondary/outlined from 13-1
- [ ] Brief description text explaining benefits of creating an account
- [ ] Navigates to `/create-account` and `/sign-in` respectively
- [ ] Matches Figma frames: "Settings Guest (Light)" / "Settings Guest (Dark)"

### AC4: Theme Picker

- [ ] `ActionRow` in Preferences section: icon (MI: brightness-6 or equivalent) + "Theme" label + current value (Light/Dark/System) + chevron
- [ ] Tapping opens a `BottomSheet` with three selectable options: Light, Dark, System
- [ ] "System" option follows device OS preference (current default behavior)
- [ ] Selecting an option immediately applies the theme, persists to storage, and dismisses the sheet
- [ ] Theme preference persisted via `expo-sqlite/kv-store` in `core/settings/settings-repository.ts`
- [ ] `ThemeProvider` updated to read user preference: if "System", use `useColorScheme()`; if "Light"/"Dark", override
- [ ] Selected option shows a checkmark or highlight indicator in the bottom sheet
- [ ] Matches Figma frames: "Theme Picker (Light)" / "Theme Picker (Dark)"

### AC5: Language Picker

- [ ] `ActionRow` in Preferences section: icon (MI: language) + "Language" label + current language name + chevron
- [ ] Tapping navigates to a language list screen (push navigation)
- [ ] Language list shows available languages with selection indicator on current choice
- [ ] Selecting a language persists the choice and navigates back
- [ ] Language preference persisted via `expo-sqlite/kv-store`
- [ ] Initial implementation supports English only (scaffolding for future i18n)
- [ ] Matches Figma frames: "Language Picker (Light)" / "Language Picker (Dark)"

### AC6: Export Data as JSON

- [ ] `ActionRow` in Data Management section: icon (MI: file-download) + "Export Data as JSON" label + chevron
- [ ] Tapping opens an export confirmation `BottomSheet`:
  - Summary: "Export X cards as a JSON file"
  - "Export" primary `Button` CTA
  - "Cancel" secondary/text CTA
- [ ] On confirm: generates JSON from all local cards via `card-repository`, triggers share sheet / file save via `expo-sharing` or `expo-file-system`
- [ ] Export JSON schema includes: cards array (store name, card number, barcode format, color, created date), export metadata (app version, export date, card count)
- [ ] Empty state: if user has zero cards, bottom sheet shows empty state message ("No cards to export") with only a "Done" / dismiss CTA -- no export action
- [ ] Success feedback after export completes (toast or inline confirmation)
- [ ] Matches Figma frames: "Export Confirmation (Light)" / "Export Confirmation (Dark)" and "Export Empty State (Light)" / "Export Empty State (Dark)"

### AC7: Import Data Entry Point

- [ ] `ActionRow` in Data Management section: icon (MI: file-upload) + "Import Data from JSON" label + chevron
- [ ] Tapping opens the system file picker filtered to `.json` files
- [ ] This story implements ONLY the entry point and file picker trigger
- [ ] Actual import logic (preview, validation, duplicate handling, card creation) is deferred to Story 13-7a
- [ ] If 13-7a is not yet implemented, show a "Coming Soon" bottom sheet or gracefully handle the picked file with a placeholder message
- [ ] Matches Figma frames: "Import Preview (Light)" / "Import Preview (Dark)" (scaffold only)

### AC8: Sync Status & Manual Trigger (Signed In Only)

- [ ] Displayed in Data Management section only when user is authenticated
- [ ] `ActionRow` with icon (MCI: cloud-sync-outline) + "Sync" label + last synced timestamp value
- [ ] Timestamp updates in real-time using relative time format (e.g., "2 minutes ago", "Never")
- [ ] Tapping triggers a manual sync operation (reuses existing sync infrastructure)
- [ ] Shows loading indicator while sync is in progress
- [ ] Updates timestamp on successful sync completion
- [ ] Matches Figma frames: "Settings Signed In (Light)" / "Settings Signed In (Dark)" (sync row within Data Management)

### AC9: About Section

- [ ] App version displayed (read from `expo-constants` or app config)
- [ ] Catalogue version + date displayed (from `catalogueRepository.getVersion()`)
- [ ] "Help & FAQ" `ActionRow`: icon + label + chevron, navigates to `/help`
- [ ] "Privacy Policy" `ActionRow`: icon + label + chevron, navigates to `/privacy-policy`
- [ ] About section positioned at bottom of scrollable content
- [ ] Version info uses secondary text color from theme tokens
- [ ] Matches Figma frames: "Settings (Light)" / "Settings (Dark)" (about section)

### AC10: Sign Out Confirmation Bottom Sheet

- [ ] Replaces current `Alert.alert()` with a `BottomSheet` component
- [ ] Title: "Sign Out?"
- [ ] Description: "You will return to guest mode. Your cards will remain on this device."
- [ ] "Sign Out" destructive `Button` CTA (red/destructive variant)
- [ ] "Cancel" secondary/text CTA
- [ ] On confirm: calls existing `signOut()`, clears sync timestamp, navigates to home in guest mode
- [ ] Error state: shows inline error message if sign-out fails
- [ ] Matches Figma frames: "Sign Out Confirmation (Light)" / "Sign Out Confirmation (Dark)"

### AC11: Delete Account Confirmation Bottom Sheet

- [ ] Replaces current `Alert.alert()` + `Modal` two-step flow with bottom sheet flow
- [ ] Step 1 bottom sheet: Title "Delete Account?", description warns about permanent deletion, "Continue" destructive CTA, "Cancel" secondary CTA
- [ ] Step 2 bottom sheet: Title "Confirm Account Deletion", type "DELETE" text input for confirmation, "Delete" destructive CTA (disabled until "DELETE" typed), "Cancel" secondary CTA
- [ ] **Inverted CTA order**: destructive action button is NOT in the primary/right position -- placed on left or bottom to prevent accidental taps (per Figma design spec)
- [ ] Loading state on delete button while operation is in progress
- [ ] Error state: shows inline error if deletion fails
- [ ] Success: dismisses sheet, shows success banner/toast, navigates to home in guest mode
- [ ] Matches Figma frames: "Delete Account Confirmation (Light)" / "Delete Account Confirmation (Dark)"

### AC12: Dark Mode Parity

- [ ] Every section and every bottom sheet has dark mode variant matching Figma dark frames
- [ ] Backgrounds: white light / #000000 dark
- [ ] Elevated surfaces (bottom sheets, section cards): white light / #1C1C1E dark
- [ ] Primary buttons: #1A73E8 light / #4DA3FF dark
- [ ] Destructive buttons: appropriate red tones in both modes
- [ ] Input fields: #F5F5F5 light / #2C2C2E dark
- [ ] Text: theme.textPrimary / theme.textSecondary from tokens
- [ ] All `ActionRow` icons and text respect theme tokens
- [ ] Visual QA pass against all 26 Figma frames (13 concepts x 2 themes)

### AC13: Accessibility

- [ ] All interactive elements have 44pt minimum touch targets
- [ ] All `ActionRow` items have appropriate `accessibilityRole="button"` and `accessibilityLabel`
- [ ] Bottom sheets are announced by screen readers on open/close
- [ ] Delete confirmation text input has `accessibilityLabel` and `accessibilityHint`
- [ ] Destructive actions clearly labeled for screen readers (e.g., "Delete Account, destructive action")
- [ ] Theme changes announced to assistive technology
- [ ] Section headers have `accessibilityRole="header"`

### AC14: Test Coverage

- [ ] Unit tests for the refactored `SettingsScreen` component (>= 80% coverage)
- [ ] Unit tests for theme picker logic and persistence
- [ ] Unit tests for export data flow (generation, empty state, share trigger)
- [ ] Unit tests for all bottom sheet interactions (open, confirm, cancel, dismiss)
- [ ] Unit tests for guest vs signed-in conditional rendering
- [ ] Unit tests for sync trigger and timestamp display
- [ ] Unit tests for language picker navigation
- [ ] Tests co-located with source files

## Tasks / Subtasks

### T1: Refactor `features/settings/` Directory Structure

- [ ] Create new directory structure:
  - `features/settings/screens/SettingsScreen.tsx` (main screen, replaces root `SettingsScreen.tsx`)
  - `features/settings/screens/LanguageListScreen.tsx`
  - `features/settings/components/AccountSection.tsx`
  - `features/settings/components/AccountSectionGuest.tsx`
  - `features/settings/components/PreferencesSection.tsx`
  - `features/settings/components/DataManagementSection.tsx`
  - `features/settings/components/AboutSection.tsx`
  - `features/settings/components/ThemePickerSheet.tsx`
  - `features/settings/components/ExportConfirmationSheet.tsx`
  - `features/settings/components/ExportEmptyStateSheet.tsx`
  - `features/settings/components/ImportPlaceholderSheet.tsx`
  - `features/settings/components/SignOutSheet.tsx`
  - `features/settings/components/DeleteAccountSheet.tsx`
  - `features/settings/hooks/useThemePreference.ts`
  - `features/settings/hooks/useLanguagePreference.ts`
  - `features/settings/hooks/useExportData.ts`
  - `features/settings/hooks/useSyncTrigger.ts`
  - `features/settings/types.ts`
  - `features/settings/index.ts`
- [ ] Update barrel export `features/settings/index.ts`
- [ ] Update `app/settings.tsx` thin re-export to point to new screen location

### T2: Extend Settings Repository for Theme & Language (AC4, AC5)

- [ ] Add `THEME_PREFERENCE` key to `core/settings/settings-repository.ts` KEYS constant
- [ ] Add `LANGUAGE_PREFERENCE` key to KEYS constant
- [ ] Implement `getThemePreference(): 'light' | 'dark' | 'system'` -- returns `'system'` as default
- [ ] Implement `setThemePreference(value: 'light' | 'dark' | 'system'): void`
- [ ] Implement `getLanguagePreference(): string` -- returns `'en'` as default
- [ ] Implement `setLanguagePreference(value: string): void`
- [ ] Export new functions from `features/settings/settings-repository.ts` barrel
- [ ] Unit tests: `core/settings/settings-repository.test.ts` -- add test cases for new getters/setters, default values, persistence round-trip

### T3: Update ThemeProvider for User Override (AC4)

- [ ] Modify `shared/theme/ThemeProvider.tsx` to accept theme preference override
- [ ] Add state/context for user's theme preference (read from settings repository on mount)
- [ ] Logic: if preference is `'system'`, use `useColorScheme()` as today; if `'light'` or `'dark'`, override
- [ ] Expose `setThemePreference` function from context so components can update it
- [ ] Expose `themePreference` value from context ('light' | 'dark' | 'system') for UI display
- [ ] Ensure theme changes apply immediately without app restart
- [ ] Unit tests: `shared/theme/ThemeProvider.test.tsx` -- test system mode, forced light, forced dark, preference persistence

### T4: Implement `useThemePreference` Hook (AC4)

- [ ] Create `features/settings/hooks/useThemePreference.ts`
- [ ] Hook reads current preference from `ThemeProvider` context
- [ ] Hook provides `openThemePicker` / `closeThemePicker` bottom sheet state management
- [ ] Hook provides `selectTheme(value)` that calls `setThemePreference` on context and persists to storage
- [ ] Unit tests: `features/settings/hooks/useThemePreference.test.ts`

### T5: Implement `useLanguagePreference` Hook (AC5)

- [ ] Create `features/settings/hooks/useLanguagePreference.ts`
- [ ] Hook reads current language from settings repository
- [ ] Hook provides language display name mapping (e.g., `'en'` -> `'English'`)
- [ ] Hook provides `setLanguage(code)` that persists to storage
- [ ] Initial supported languages list: `[{ code: 'en', name: 'English' }]`
- [ ] Unit tests: `features/settings/hooks/useLanguagePreference.test.ts`

### T6: Implement `useExportData` Hook (AC6)

- [ ] Create `features/settings/hooks/useExportData.ts`
- [ ] Hook reads card count from card repository
- [ ] Hook provides `hasCards: boolean` for empty state check
- [ ] Hook provides `cardCount: number` for confirmation summary
- [ ] Hook provides `exportCards(): Promise<void>`:
  - Reads all cards from local database via card-repository
  - Constructs JSON object: `{ version: "1.0", exportDate: ISO string, appVersion: string, cardCount: number, cards: Card[] }`
  - Writes JSON to temp file via `expo-file-system`
  - Opens share sheet via `expo-sharing` (or save dialog)
- [ ] Hook provides `isExporting: boolean` loading state
- [ ] Hook provides `exportError: string | null` error state
- [ ] Unit tests: `features/settings/hooks/useExportData.test.ts` -- test JSON generation, empty cards, share trigger (mocked), error handling

### T7: Implement `useSyncTrigger` Hook (AC8)

- [ ] Create `features/settings/hooks/useSyncTrigger.ts`
- [ ] Hook reads last sync timestamp (reuse existing `getLastSyncAt` logic from current SettingsScreen)
- [ ] Hook provides `syncLabel: string` with relative time formatting
- [ ] Hook provides `triggerSync(): Promise<void>` that invokes existing sync infrastructure
- [ ] Hook provides `isSyncing: boolean` loading state
- [ ] Hook manages 30-second interval for timestamp label refresh (move from current SettingsScreen)
- [ ] Unit tests: `features/settings/hooks/useSyncTrigger.test.ts`

### T8: Implement Account Section Components (AC2, AC3)

- [ ] Implement `AccountSection.tsx` (signed-in variant):
  - User email display from auth state
  - Account status indicator
  - `ActionRow` for "Sign Out" with appropriate icon
  - `ActionRow` for "Delete Account" with destructive text color, de-emphasized styling
  - Uses `useAuthState()` hook
- [ ] Implement `AccountSectionGuest.tsx`:
  - Guest mode badge with icon (MI: person-outline or equivalent, NOT emoji)
  - "Create Account" `Button` (primary variant, navigates to `/create-account`)
  - "Sign In" `Button` (secondary/outlined variant, navigates to `/sign-in`)
  - Brief description text
- [ ] Unit tests for both components: conditional rendering, navigation calls, accessibility attributes

### T9: Implement Preferences Section (AC4, AC5)

- [ ] Implement `PreferencesSection.tsx`:
  - Section header: "Preferences"
  - Theme `ActionRow`: icon (MI: brightness-6) + "Theme" + current value + chevron
  - Language `ActionRow`: icon (MI: language) + "Language" + current language name + chevron
  - Theme row `onPress` opens ThemePickerSheet
  - Language row `onPress` navigates to LanguageListScreen
- [ ] Unit tests: renders both rows, displays current values, fires correct handlers

### T10: Implement Data Management Section (AC6, AC7, AC8)

- [ ] Implement `DataManagementSection.tsx`:
  - Section header: "Data Management"
  - Export `ActionRow`: icon (MI: file-download) + "Export Data as JSON" + chevron
  - Import `ActionRow`: icon (MI: file-upload) + "Import Data from JSON" + chevron
  - Sync `ActionRow` (auth only): icon (MCI: cloud-sync-outline) + "Sync" + timestamp + loading indicator
  - Export row `onPress` opens ExportConfirmationSheet (or ExportEmptyStateSheet if no cards)
  - Import row `onPress` triggers file picker (or placeholder sheet if 13-7a not ready)
  - Sync row `onPress` triggers manual sync
- [ ] Conditionally render sync row based on `isAuthenticated`
- [ ] Unit tests: renders correct rows for auth/guest states, fires handlers, shows sync loading state

### T11: Implement About Section (AC9)

- [ ] Implement `AboutSection.tsx`:
  - Section header: "About"
  - App version row: label + version from `expo-constants` or `Application.nativeApplicationVersion`
  - Catalogue version row: label + version + date from `catalogueRepository.getVersion()`
  - "Help & FAQ" `ActionRow`: icon + label + chevron, navigates to `/help`
  - "Privacy Policy" `ActionRow`: icon + label + chevron, navigates to `/privacy-policy`
- [ ] Unit tests: renders version info, navigation handlers fire correctly

### T12: Implement Theme Picker Bottom Sheet (AC4)

- [ ] Implement `ThemePickerSheet.tsx`:
  - Uses `BottomSheet` component from 13-1
  - Three selectable rows: "Light", "Dark", "System"
  - Current selection has checkmark indicator or highlight
  - Selecting an option calls `selectTheme()`, applies immediately, dismisses sheet
  - Accessible labels for each option
- [ ] Unit tests: renders three options, shows current selection, fires selectTheme on tap, dismisses on selection

### T13: Implement Export Bottom Sheets (AC6)

- [ ] Implement `ExportConfirmationSheet.tsx`:
  - Title or summary: "Export {cardCount} cards as a JSON file"
  - "Export" primary `Button` CTA
  - "Cancel" secondary/text CTA
  - Loading state on Export button while generating/sharing
  - Error inline display if export fails
- [ ] Implement `ExportEmptyStateSheet.tsx`:
  - Message: "No cards to export" (or equivalent from Figma)
  - Description text explaining user needs to add cards first
  - "Done" / dismiss CTA only -- no export action
- [ ] Unit tests for both: renders correct content, CTAs fire correct handlers, loading/error states

### T14: Implement Sign Out Confirmation Bottom Sheet (AC10)

- [ ] Implement `SignOutSheet.tsx`:
  - Title: "Sign Out?"
  - Description: "You will return to guest mode. Your cards will remain on this device."
  - "Sign Out" destructive `Button` CTA
  - "Cancel" secondary CTA
  - Error inline display if sign-out fails
  - On confirm: calls `signOut()`, clears sync timestamp, navigates to `/`
- [ ] Port sign-out logic from current `SettingsScreen.tsx` `confirmSignOut` / `handleSignOutPress`
- [ ] Unit tests: renders content, confirm triggers sign-out flow, cancel dismisses, error display

### T15: Implement Delete Account Confirmation Bottom Sheet (AC11)

- [ ] Implement `DeleteAccountSheet.tsx`:
  - Two-step flow managed via internal state
  - Step 1: Warning with "Continue" destructive CTA + "Cancel"
  - Step 2: "DELETE" text input confirmation + "Delete" CTA (disabled until match) + "Cancel"
  - **Inverted CTA order** per Figma: destructive button NOT in primary/right position
  - Loading state on delete button during API call
  - Error display if deletion fails
  - On confirm: calls `deleteAccount()`, clears sync, shows success, navigates to `/`
- [ ] Port delete logic from current `SettingsScreen.tsx` (handleDeleteAccountPress, handleDeleteConfirm, handleDeleteCancel)
- [ ] Unit tests: both steps render, input validation, disabled state, confirm flow, cancel flow, error/loading states

### T16: Implement Import Placeholder (AC7)

- [ ] Implement `ImportPlaceholderSheet.tsx`:
  - If 13-7a is implemented: trigger `DocumentPicker.getDocumentAsync({ type: 'application/json' })` and hand off to import flow
  - If 13-7a is NOT yet implemented: show "Coming Soon" bottom sheet with dismiss CTA
  - This provides the scaffold that 13-7a will build upon
- [ ] Add `expo-document-picker` dependency if not already present
- [ ] Unit tests: file picker triggers on press, placeholder sheet renders when feature not ready

### T17: Implement Language List Screen (AC5)

- [ ] Implement `LanguageListScreen.tsx`:
  - Full-screen push navigation from settings
  - Back arrow in header
  - List of available languages with selection indicator (checkmark on current)
  - Tapping a language sets it, persists, and navigates back
  - Currently only "English" is available -- but UI scaffolding supports future additions
- [ ] Create route file `app/settings/language.tsx` (or inline if Expo Router supports it) as thin re-export
- [ ] Unit tests: renders language list, shows current selection, fires setLanguage, navigates back

### T18: Compose Main Settings Screen (AC1)

- [ ] Implement new `features/settings/screens/SettingsScreen.tsx`:
  - `ScrollView` with section components in order: Account -> Preferences -> Data Management -> About
  - Conditionally renders `AccountSection` or `AccountSectionGuest` based on auth state
  - Manages bottom sheet open/close state for all sheets (theme picker, export, sign out, delete)
  - Passes callbacks from hooks to section components
  - 24px horizontal padding, section spacing per design tokens
  - Bottom inset for tab bar
- [ ] Wire all hooks: `useAuthState`, `useThemePreference`, `useLanguagePreference`, `useExportData`, `useSyncTrigger`
- [ ] Remove old `features/settings/SettingsScreen.tsx` after new screen is verified
- [ ] Update `features/settings/index.ts` barrel export
- [ ] Update `app/settings.tsx` re-export if path changed

### T19: Route Files & Navigation (AC1, AC5)

- [ ] Evaluate whether `app/settings/language.tsx` route is needed for language list screen
- [ ] If Expo Router nested layout needed, create `app/settings/_layout.tsx` stack layout
- [ ] Ensure back navigation from language list returns to settings
- [ ] Verify hardware back button (Android) works correctly from all bottom sheets and nested screens

### T20: Dark Mode Implementation (AC12)

- [ ] Apply theme tokens from 13-1 to all new section components and bottom sheets
- [ ] Verify backgrounds: white / #000000
- [ ] Verify elevated surfaces (bottom sheets): white / #1C1C1E
- [ ] Verify input fields: #F5F5F5 / #2C2C2E
- [ ] Verify primary buttons: #1A73E8 / #4DA3FF
- [ ] Verify destructive button tones in both modes
- [ ] Verify all ActionRow icons and text respect theme
- [ ] Visual QA pass on all 26 Figma frames (13 concepts x 2 themes)

### T21: Accessibility Pass (AC13)

- [ ] All `ActionRow` items: `accessibilityRole="button"`, descriptive `accessibilityLabel`
- [ ] Section headers: `accessibilityRole="header"`
- [ ] Bottom sheets: announced on open/close, focus trapped while open
- [ ] Delete confirmation input: `accessibilityLabel="Type DELETE to confirm"`, `accessibilityHint`
- [ ] Destructive actions: labeled for screen readers (e.g., "Delete Account, destructive action")
- [ ] Theme change: announce new theme to assistive technology
- [ ] 44pt minimum touch targets on all interactive elements
- [ ] Verify VoiceOver / TalkBack traversal order matches visual order

### T22: Unit Tests (AC14)

- [ ] `features/settings/screens/SettingsScreen.test.tsx`:
  - Renders all four sections
  - Renders AccountSection when authenticated
  - Renders AccountSectionGuest when not authenticated
  - Scrollable content
- [ ] `features/settings/components/AccountSection.test.tsx`:
  - Renders email and status
  - Sign Out ActionRow fires handler
  - Delete Account ActionRow fires handler
- [ ] `features/settings/components/AccountSectionGuest.test.tsx`:
  - Renders guest badge (no emoji)
  - Create Account button navigates to /create-account
  - Sign In button navigates to /sign-in
- [ ] `features/settings/components/PreferencesSection.test.tsx`:
  - Renders theme row with current value
  - Renders language row with current language
  - Theme row fires openThemePicker
  - Language row fires navigation
- [ ] `features/settings/components/DataManagementSection.test.tsx`:
  - Renders export and import rows
  - Renders sync row only when authenticated
  - Export fires handler
  - Import fires handler
  - Sync fires trigger and shows loading
- [ ] `features/settings/components/AboutSection.test.tsx`:
  - Renders app version
  - Renders catalogue version
  - Help & FAQ navigates to /help
  - Privacy Policy navigates to /privacy-policy
- [ ] `features/settings/components/ThemePickerSheet.test.tsx`:
  - Renders three options
  - Highlights current selection
  - Fires selectTheme on tap
  - Dismisses after selection
- [ ] `features/settings/components/ExportConfirmationSheet.test.tsx`:
  - Shows card count
  - Export CTA fires export
  - Cancel dismisses
  - Loading state displayed
- [ ] `features/settings/components/ExportEmptyStateSheet.test.tsx`:
  - Shows empty state message
  - No export CTA present
  - Done/dismiss CTA
- [ ] `features/settings/components/SignOutSheet.test.tsx`:
  - Renders title and description
  - Sign Out CTA fires sign-out flow
  - Cancel dismisses
  - Error display on failure
- [ ] `features/settings/components/DeleteAccountSheet.test.tsx`:
  - Step 1 renders warning and Continue
  - Step 2 renders input and Delete (disabled initially)
  - Input "DELETE" enables Delete button
  - Confirm fires delete flow
  - Cancel at both steps dismisses
  - Loading and error states
  - Inverted CTA order
- [ ] `features/settings/hooks/useExportData.test.ts`:
  - Returns card count
  - Returns hasCards boolean
  - exportCards generates correct JSON schema
  - exportCards triggers share
  - Handles export error
- [ ] `features/settings/hooks/useSyncTrigger.test.ts`:
  - Returns sync label
  - triggerSync calls sync infrastructure
  - isSyncing reflects loading state
  - Timestamp refreshes on interval

### T23: Cleanup Legacy Code

- [ ] Remove old `features/settings/SettingsScreen.tsx` (replaced by `features/settings/screens/SettingsScreen.tsx`)
- [ ] Remove old `features/settings/SettingsScreen.test.tsx`
- [ ] Remove emoji usage: guest badge `👤` replaced by vector icon (MI: person-outline)
- [ ] Remove inline `Alert.alert()` calls (replaced by bottom sheets)
- [ ] Remove React Native `Modal` for delete confirmation (replaced by bottom sheet)
- [ ] Remove hardcoded color values (#ef4444, #dc2626, #b91c1c, #991b1b, #065f46, #d1d5db) -- all colors from theme tokens
- [ ] Remove inline Pressable button patterns -- replaced by `Button` component from 13-1
- [ ] Verify no dead imports or unused state variables remain
- [ ] Run `npx tsc --noEmit` to verify no type errors introduced

## Dev Notes

### Files to Modify

- `core/settings/settings-repository.ts` -- add theme preference and language preference getters/setters
- `features/settings/settings-repository.ts` -- update barrel exports for new settings functions
- `shared/theme/ThemeProvider.tsx` -- add user theme override support (currently system-only)
- `app/settings.tsx` -- update re-export if screen path changes
- Possibly `app/` route files for language list screen

### New Files

- `features/settings/screens/SettingsScreen.tsx` -- new main screen replacing monolithic component
- `features/settings/screens/LanguageListScreen.tsx` -- language selection list
- `features/settings/components/AccountSection.tsx` -- signed-in account UI
- `features/settings/components/AccountSectionGuest.tsx` -- guest mode account UI
- `features/settings/components/PreferencesSection.tsx` -- theme + language rows
- `features/settings/components/DataManagementSection.tsx` -- export + import + sync rows
- `features/settings/components/AboutSection.tsx` -- version info + links
- `features/settings/components/ThemePickerSheet.tsx` -- theme selection bottom sheet
- `features/settings/components/ExportConfirmationSheet.tsx` -- export confirm bottom sheet
- `features/settings/components/ExportEmptyStateSheet.tsx` -- export no-cards bottom sheet
- `features/settings/components/ImportPlaceholderSheet.tsx` -- import entry scaffold
- `features/settings/components/SignOutSheet.tsx` -- sign out confirmation bottom sheet
- `features/settings/components/DeleteAccountSheet.tsx` -- delete account multi-step bottom sheet
- `features/settings/hooks/useThemePreference.ts` -- theme picker state + persistence
- `features/settings/hooks/useLanguagePreference.ts` -- language picker state + persistence
- `features/settings/hooks/useExportData.ts` -- export generation + share logic
- `features/settings/hooks/useSyncTrigger.ts` -- manual sync trigger + timestamp
- `features/settings/types.ts` -- shared types (ThemePreference, ExportSchema, etc.)
- All corresponding `.test.tsx` / `.test.ts` files co-located with source

### Architecture Compliance

- Route files in `app/` are thin re-exports only -- all logic in `features/settings/`
- Import convention: relative within `features/settings/`, absolute `@/shared/...` for shared components, absolute `@/core/...` for core modules
- Shared components from 13-1 (`ActionRow`, `Button`, `BottomSheet`) imported from `@/shared/components/ui/`
- Theme tokens from `@/shared/theme/` -- NO hardcoded color values in component files
- Tests co-located: every `.tsx`/`.ts` file has a `.test.tsx`/`.test.ts` sibling
- 80% coverage threshold enforced
- TypeScript strict mode -- all types explicit, no `any`

### Icon System

- MI: brightness-6 (or MI: palette) -- theme picker row
- MI: language -- language picker row
- MI: file-download -- export data row
- MI: file-upload -- import data row
- MCI: cloud-sync-outline -- sync status row
- MI: person-outline -- guest mode badge (replaces emoji)
- MI: chevron-right -- ActionRow trailing indicator (via ActionRow component)
- MI: help-outline -- Help & FAQ row
- MI: shield -- Privacy Policy row (or MI: policy if available)
- All icons via `@expo/vector-icons` MaterialIcons (MI) and MaterialCommunityIcons (MCI)

### Key Design Decisions (from 12-6)

- All confirmations use bottom sheets, NOT `Alert.alert()` or React Native `Modal`
- Delete Account has inverted CTA order -- destructive button NOT in default right/primary position
- Theme picker is a bottom sheet with three options, NOT inline radio buttons
- Language picker is a push navigation screen, NOT a bottom sheet (allows future long language lists)
- Export generates JSON and opens native share sheet -- does NOT auto-save to a fixed location
- Import entry point is just the file picker trigger -- full flow deferred to 13-7a
- Sync row only visible when authenticated -- guests have no cloud data to sync
- "System" theme means follow OS preference -- this is the default and matches pre-restyle behavior
- Guest mode replaces emoji with vector icon

### Export JSON Schema Reference

```json
{
  "version": "1.0",
  "appVersion": "1.0.0",
  "exportDate": "2026-03-31T12:00:00.000Z",
  "cardCount": 5,
  "cards": [
    {
      "storeName": "Example Store",
      "cardNumber": "1234567890",
      "barcodeFormat": "QR_CODE",
      "color": "#FF5722",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

### Dependencies (npm packages)

- `expo-sharing` -- for share sheet on export (check if already installed)
- `expo-file-system` -- for writing temp JSON file (likely already installed)
- `expo-document-picker` -- for import file selection (check if already installed)
- `expo-constants` or `expo-application` -- for reading app version

### Figma Frame Reference

| #   | Concept               | Light Frame    | Dark Frame    | Component                                |
| --- | --------------------- | -------------- | ------------- | ---------------------------------------- |
| 1   | Settings (Signed In)  | Frame 1 Light  | Frame 1 Dark  | `SettingsScreen` + `AccountSection`      |
| 2   | Settings (Guest)      | Frame 2 Light  | Frame 2 Dark  | `SettingsScreen` + `AccountSectionGuest` |
| 3   | Theme Picker          | Frame 3 Light  | Frame 3 Dark  | `ThemePickerSheet`                       |
| 4   | Language Picker       | Frame 4 Light  | Frame 4 Dark  | `LanguageListScreen`                     |
| 5   | Export Confirmation   | Frame 5 Light  | Frame 5 Dark  | `ExportConfirmationSheet`                |
| 6   | Export Empty State    | Frame 6 Light  | Frame 6 Dark  | `ExportEmptyStateSheet`                  |
| 7   | Import Preview        | Frame 7 Light  | Frame 7 Dark  | `ImportPlaceholderSheet` (scaffold)      |
| 8   | Import Invalid File   | Frame 8 Light  | Frame 8 Dark  | Deferred to 13-7a                        |
| 9   | Sign Out Confirmation | Frame 9 Light  | Frame 9 Dark  | `SignOutSheet`                           |
| 10  | Delete Account Step 1 | Frame 10 Light | Frame 10 Dark | `DeleteAccountSheet` (step 1)            |
| 11  | Delete Account Step 2 | Frame 11 Light | Frame 11 Dark | `DeleteAccountSheet` (step 2)            |
| 12  | Sync In Progress      | Frame 12 Light | Frame 12 Dark | `DataManagementSection` (sync loading)   |
| 13  | Theme Preview         | Frame 13 Light | Frame 13 Dark | `ThemePickerSheet` (live preview)        |

## Blocks

- **Blocked by 13-1** (Implement Design System Tokens & Components) -- requires `ActionRow`, `Button`, `BottomSheet` components and all color/typography/spacing tokens to be in place before development begins.
- **Blocks 13-7a** (Import Data from JSON) -- 13-7a depends on the settings screen scaffold, import entry point, and `DataManagementSection` component being in place.

## Dev Agent Record

### Attempt Log

| #   | Date | Agent | Result | Reason |
| --- | ---- | ----- | ------ | ------ |

### Decisions Made During Dev

_(none yet)_

### Open Questions

- Confirm exact `BottomSheet` component API from 13-1 (props for title, description, children, onDismiss)
- Confirm whether `expo-sharing` is already a dependency or needs to be added
- Confirm whether `expo-document-picker` is already a dependency or needs to be added
- Determine if `app/settings/language.tsx` nested route is needed or if language list can be handled differently in Expo Router
- Confirm exact icon names for Help & FAQ and Privacy Policy rows from Figma frames
