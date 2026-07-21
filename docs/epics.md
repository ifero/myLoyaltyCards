---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - 'docs/prd.md'
  - 'docs/architecture.md'
  - 'docs/ux-design-specification.md'
workflowType: 'epics-stories'
lastStep: 4
workflowComplete: true
completedDate: '2025-01-03'
project_name: 'myLoyaltyCards'
user_name: 'Ifero'
date: '2025-01-03'
totalEpics: 17
totalStories: 138
aligned_with_tracker: '2026-07-21'
authoritative_source: 'docs/sprint-artifacts/sprint-status.yaml'
---

> [!NOTE]
> **Story catalogue — aligned with the tracker on 2026-07-21.** This file is the human-readable
> epic/story catalogue; `docs/sprint-artifacts/sprint-status.yaml` remains the **authoritative
> source of truth** for live status and the sprint blocks (`last_sprint`/`current_sprint`/
> `next_sprint`/`waves`). Every `### Story N.M` here maps 1:1 to a tracker `development_status`
> key, so `create-story` reads correct content. `bmad-sprint-planning` is safe to run **only**
> with the `_bmad/custom/bmad-sprint-planning.toml` guard, which preserves the tracker's sprint
> blocks (vanilla regeneration would strip them).

## Overview

This document provides the complete epic and story breakdown for myLoyaltyCards, decomposing the requirements from the PRD, UX Design, and Architecture into implementable stories.

## Epic Conventions & Dependency Map

### Conventions

- **Epic Type:** Each epic is labeled as **User-Facing** or **Enabling**. Enabling epics/stories are permitted only when they directly unlock a user-facing outcome in the same phase.
- **Enabling Stories:** Stories written from a developer perspective are explicitly tagged as **Enabling** and must map to a specific user-facing outcome.
- **Post-MVP Items:** Any requirement tagged post-MVP must be listed in **Future Enhancements** and referenced in the FR coverage map.

### Dependency Map (Phase 1)

1. Epic 1 → Foundation for all Phase 1 epics
2. Epic 2 → Core card flows (prereq for Epic 5)
3. Epic 3 → Catalogue (prereq for Epic 4)
4. Epic 4 → Onboarding (depends on Epic 3)
5. Epic 5 → Apple Watch app (depends on Epics 2–3)
6. Epic 6 → Authentication (prereq for Epic 7)
7. Epic 7 → Cloud Sync (depends on Epic 6)
8. Epic 8 → Settings & Help (depends on Epic 4)

## Requirements Inventory

### Functional Requirements

**Card Management (FR1-FR9)**

- FR1: Users can add a loyalty card by selecting a brand from the Italian catalogue
- FR2: Users can add a custom loyalty card by manually entering card details
- FR3: Users can scan a barcode using the device camera to capture loyalty card information
- FR4: Users can manually enter a barcode number as an alternative to scanning
- FR5: Users can view a list of all their stored loyalty cards
- FR6: Users can edit existing loyalty card information (name, barcode)
- FR7: Users can delete loyalty cards they no longer need
- FR8: Users can mark loyalty cards as favorites to pin them at the top of the list
- FR9: Users can view detailed information about a specific loyalty card

**Barcode Display (FR10-FR13)**

- FR10: Users can display a loyalty card's barcode in a scannable format
- FR11: The system can render barcodes in multiple formats (Code 128, EAN-13, EAN-8, QR Code, CODE39, UPCA)
- FR12: Users can display barcodes on wearable devices (Apple Watch, Android Wear)
- FR13: The system can optimize barcode brightness and contrast for scanner readability

**Italian Brand Catalogue (FR14-FR20)**

- FR14: Users can browse the Italian loyalty card catalogue on a dedicated screen
- FR15: The system can display catalogue brands with their names, logos, and aliases
- FR16: The system can fetch the latest catalogue from cloud storage
- FR17: The system can cache the catalogue locally for offline browsing
- FR18: The system can check for catalogue updates using ISO date-based versioning
- FR19: The system can automatically refresh the catalogue when users add a card
- FR20: The system can detect if local catalogue is outdated based on last sync timestamp

**Smart Card Sorting (FR21-FR24)**

- FR21: The system can automatically sort cards based on usage frequency
- FR22: The system can display most recently used cards at the top of the list
- FR23: Users can pin favorite cards to remain at the top regardless of usage
- FR24: The system can apply alphabetical sorting as a fallback for unused cards

**User Authentication & Account Management (FR25-FR33)**

- FR25: Users can use the app in guest mode without creating an account with full feature access
- FR26: Users can create an account using email and password
- FR27: Users can sign in using Sign in with Apple
- FR28: Users can sign in using Sign in with Google
- FR29: Users can log in to an existing account
- FR30: Users can log out of their account
- FR31: Users can reset their password if forgotten
- FR32: Users can delete their account and all associated cloud data
- FR33: Users can upgrade from guest mode to authenticated mode without losing data

**Data Synchronization (FR34-FR42)**

- FR34: The system can sync cards between phone and watch via Bluetooth in guest mode
- FR35: The system can sync cards to cloud backend when user is authenticated
- FR36: The system can sync cards across multiple devices for authenticated users
- FR37: The system can perform background synchronization automatically
- FR38: The system can detect network connectivity status for sync operations
- FR39: The system can queue sync operations when offline and retry when connection available
- FR40: The system can resolve sync conflicts using last-write-wins strategy
- FR41: The system can perform delta sync (only changed cards) for efficiency
- FR42: The system can sync bidirectionally (phone ↔ watch, phone ↔ cloud)

**Wearable Experience (FR43-FR47)**

- FR43: Users can open the wearable app and access cards without phone connection
- FR44: The system can store loyalty cards locally on the wearable device
- FR45: Users can navigate through their card list on the wearable interface
- FR46: Users can tap a card on the wearable to display its barcode
- FR47: The system can automatically sync new/edited/deleted cards between phone and watch

**Offline Functionality (FR48-FR52)**

- FR48: Users can access all core features without network connectivity
- FR49: Users can add, edit, and delete cards while offline
- FR50: Users can display barcodes while offline
- FR51: The system can store user cards and cached catalogue locally for offline access
- FR52: The system can function on wearables without phone or network connection

**Privacy & Data Management - GDPR (FR53-FR58)**

- FR53: Users can view what personal data is collected and stored
- FR54: Users can export all their loyalty card data in JSON format
- FR55: Users can request deletion of all their data from cloud storage
- FR56: The system can encrypt user data at rest in the cloud database
- FR57: Users can access the privacy policy from within the app
- FR58: Users can provide consent before account creation and data collection

**User Feedback & Error Handling (FR59-FR65)**

- FR59: The system can display loading indicators during data operations
- FR60: The system can show sync status indicators to users
- FR61: The system can display confirmation messages for successful operations
- FR62: The system can display error messages with clear explanations when operations fail
- FR63: The system can show overlay messages when sync fails
- FR64: The system can provide appropriate error messages when camera permission is denied
- FR65: The system can provide recovery options for failed operations

**App Settings & Preferences (FR66-FR69)**

- FR66: Users can select their preferred language for the app interface
- FR67: Users can toggle between light mode and dark mode
- FR68: Users can access app settings from a dedicated settings screen
- FR69: Users can view app version and build information

**Data Validation - Post-MVP (FR70-FR71)**

- FR70: The system can validate barcode format based on brand requirements
- FR71: The system can provide validation feedback when manually entering barcodes

**Onboarding & Help (FR72-FR74)**

- FR72: New users can view a welcome screen explaining the app concept
- FR73: Users can access help documentation or FAQs
- FR74: The system can provide onboarding guidance for first-time card addition

### NonFunctional Requirements

**Performance (NFR-P1 to NFR-P9)**

- NFR-P1: Card display on wearable devices must complete in ≤3 seconds from wrist raise to barcode visible
- NFR-P2: Mobile app cold start must complete in ≤1 second
- NFR-P3: Wearable app cold start must complete in ≤2 seconds
- NFR-P4: Barcode rendering must complete in ≤100ms
- NFR-P5: Phone-to-watch sync operations must complete within 30 seconds when devices are connected
- NFR-P6: UI interactions (scrolling, navigation) must maintain 60fps for smooth user experience
- NFR-P7: Wearable app must minimize battery impact during standby mode
- NFR-P8: Background sync operations must not noticeably impact device battery life
- NFR-P9: Catalogue caching must optimize storage usage without degrading performance

**Security & Privacy (NFR-S1 to NFR-S12)**

- NFR-S1: All user data must be encrypted at rest in cloud database using AES-256
- NFR-S2: All API communication must use HTTPS/TLS 1.2 or higher
- NFR-S3: User passwords must be hashed using bcrypt or equivalent
- NFR-S4: Authentication tokens must expire after reasonable timeframes and support secure refresh
- NFR-S5: System must comply with GDPR requirements for EU users
- NFR-S6: No user tracking, analytics, or advertising is permitted
- NFR-S7: User data export must be available in machine-readable JSON format
- NFR-S8: User account deletion must remove all associated data within 30 days
- NFR-S9: Privacy policy must be accessible before and after account creation
- NFR-S10: Guest mode users must have full feature access with data stored locally only
- NFR-S11: Authenticated users' cloud data must be accessible only by the account owner
- NFR-S12: Social login must follow platform security best practices

**Reliability & Availability (NFR-R1 to NFR-R10)**

- NFR-R1: 100% of core features must function without network connectivity
- NFR-R2: Offline data operations must succeed with zero data loss
- NFR-R3: Wearable app must function independently without phone or network connection
- NFR-R4: Sync conflict resolution must preserve user data integrity using last-write-wins
- NFR-R5: All error conditions must provide clear, actionable error messages
- NFR-R6: Failed sync operations must retry automatically when connectivity is restored
- NFR-R7: System must gracefully handle edge cases (low storage, permission denials, network interruptions)
- NFR-R8: No data loss during app updates or device sync operations
- NFR-R9: Local data must persist across app restarts and device reboots
- NFR-R10: Sync operations must maintain data consistency across devices

**Usability (NFR-U1 to NFR-U8)**

- NFR-U1: User experience must be consistent across iOS and Android mobile platforms
- NFR-U2: Wearable apps must provide adapted but consistent UX for screen size constraints
- NFR-U3: All platforms must achieve feature parity within MVP scope
- NFR-U4: Error messages must be clear and avoid technical jargon
- NFR-U5: Loading indicators must be present for all operations exceeding 500ms
- NFR-U6: User interface must support both light mode and dark mode
- NFR-U7: App interface must support user-selectable languages
- NFR-U8: Text labels and messages must be externalized for localization

**Maintainability & Code Quality (NFR-M1 to NFR-M8)**

- NFR-M1: Codebase must follow React Native and Expo best practices
- NFR-M2: Code must be well-documented with clear comments for complex logic
- NFR-M3: Project structure must be organized for easy navigation by contributors
- NFR-M4: Repository must include comprehensive README with setup instructions
- NFR-M5: Contribution guidelines must be clearly documented
- NFR-M6: Code must be released under MIT License with proper attribution
- NFR-M7: Critical user flows must have automated tests
- NFR-M8: Performance targets must be validated through testing on actual devices

**Accessibility - Post-MVP (NFR-A1 to NFR-A3)**

- NFR-A1: Future versions should support screen reader compatibility
- NFR-A2: Future versions should support voice control on supported platforms
- NFR-A3: Future versions should provide high contrast modes for visual accessibility

### Additional Requirements

**From Architecture - Starter Template & Foundation:**

- ARCH-1: Project initialized with Expo SDK 54.0.0, React 19.1.0, React Native 0.81.5, Expo Router 6.0.15, TypeScript 5.6.0
- ARCH-2: Phased development approach - Phase 1: iOS + watchOS; Phase 2: Android + Wear OS
- ARCH-3: Feature-first project structure with app/, features/, shared/, core/ directories
- ARCH-4: ESLint rules enforcing feature boundaries (features cannot import from other features)

**From Architecture - Data Layer:**

- ARCH-5: Phone Local DB using expo-sqlite with migration pattern
- ARCH-6: watchOS Storage using SwiftData (iOS 18+)
- ARCH-7: Cloud Database using Supabase (PostgreSQL) with Row-Level Security
- ARCH-8: Zod schemas as source of truth for data structures across all platforms
- ARCH-9: Card data schema: id, name, barcode, barcodeFormat, brandId, color, isFavorite, lastUsedAt, usageCount, createdAt, updatedAt
- ARCH-10: Client-generated UUIDs on all platforms (crypto.randomUUID, UUID().uuidString, UUID.randomUUID)
- ARCH-11: UTC timestamps with millisecond precision (ISO 8601)
- ARCH-12: JSON payloads must include ALL fields (use null, never omit)

**From Architecture - State & Communication:**

- ARCH-13: State Management using Zustand with Immer middleware
- ARCH-14: Data Fetching using TanStack Query with offline-first defaults (staleTime: Infinity)
- ARCH-15: Form Handling using React Hook Form with Zod validation
- ARCH-16: Phone ↔ Cloud sync via Supabase REST API with 5-minute throttling
- ARCH-17: iOS ↔ watchOS sync via WatchConnectivity framework (no throttling)
- ARCH-18: Android ↔ Wear OS sync via Wearable Data Layer API (Phase 2)
- ARCH-19: Sync Message Protocol with version field and typed messages (CARDS_UPDATED, CARD_ADDED, etc.)
- ARCH-20: Watch is READ-ONLY for card data (create/edit/delete/favourite only on phone); usage events (`CARD_USED`, card-opened) are permitted and applied commutatively on the phone — refined by ADR-2026-06-09-001 (2026-06-09)

**From Architecture - Infrastructure:**

- ARCH-21: CI/CD using GitHub Actions + Fastlane
- ARCH-22: Two environments: Dev (TestFlight/Internal Track) and Production (App Store/Google Play)
- ARCH-23: Error tracking using Sentry
- ARCH-24: OTA updates using Expo Updates for JS-only changes
- ARCH-25: expo-secure-store for token storage (Keychain/Keystore)
- ARCH-26: Supabase Auth for authentication (Email, Apple, Google)

**From Architecture - Catalogue:**

- ARCH-27: Single source catalogue at /catalogue/italy.json
- ARCH-28: Phone imports JSON directly, updates via Expo OTA
- ARCH-29: Watch apps use build-time code generation (Brands.swift, Brands.kt)
- ARCH-30: Generated files in .gitignore (never committed)

**From Architecture - Cross-Platform Patterns:**

- ARCH-31: Database naming: snake_case for tables/columns
- ARCH-32: TypeScript naming: camelCase for variables/functions, PascalCase for components/types
- ARCH-33: parseWithLogging function for all cross-platform data parsing
- ARCH-34: Enum serialization patterns for Swift and Kotlin matching TypeScript
- ARCH-35: Test fixtures at /test-fixtures/ for cross-platform validation

**From UX Design - Design System:**

- UX-1: NativeWind (Tailwind CSS) for React Native styling
- UX-2: 8px base grid for all spacing
- UX-3: Touch targets: minimum 44x44px on phone, 32x32px on watch
- UX-4: System Sans-Serif typeface (San Francisco/Roboto)

**From UX Design - Visual Design:**

- UX-5: Theme: Accessible Sage Minimalist
- UX-6: Primary Accent: Accessible Sage (#73A973) with 4.5:1 contrast ratio
- UX-7: Backgrounds: OLED Black (#000000) for watch, Off-White (#F8F9F8) for barcode display
- UX-8: 5-color palette for custom cards: Blue (#3B82F6), Red (#EF4444), Green (#22C55E), Orange (#F97316), Grey (#6B7280)
- UX-9: Semantic colors with double-encoding (color + icon for accessibility)

**From UX Design - Watch Experience:**

- UX-10: Carbon Utility approach: OLED-black, high-contrast, minimal styling
- UX-11: Vertical infinite scroll list with Digital Crown support
- UX-12: Single tap to display barcode (NO confirmation dialogs)
- UX-13: Haptic feedback on tap
- UX-14: Barcode Flash: full-screen white background with max brightness
- UX-15: Watch complication for quick launch (graphic circular type) **(Post-MVP)**

**From UX Design - Phone Experience:**

- UX-16: Soft Sage Grid approach with brand logos prominently displayed
- UX-17: Responsive grid: 2 columns (standard phones), 3+ columns (larger phones/tablets)
- UX-18: Landscape support: 4-5 columns with orientation lock option in settings **(orientation lock Post-MVP)**
- UX-19: Tab-based navigation: Dashboard, Add, Settings

**From UX Design - Custom Components:**

- UX-20: Virtual Logo Card: 1-3 initials + color background for cards without official logo
- UX-21: Barcode Flash Overlay: full-screen, white background, centered barcode
- UX-22: Carbon Watch Card: OLED-optimized list item with thin borders
- UX-23: Zippy Scanner Interface: viewfinder + fast save flow **(auto-save Post-MVP)**

**From UX Design - Interaction Patterns:**

- UX-24: Zero-Confirmation Policy: taps lead directly to actions
- UX-25: Catalogue-First Onboarding: lead with familiar brand visuals, not empty states
- UX-26: Button hierarchy: Primary (Sage Green), Secondary (outline), Destructive (red text)
- UX-27: Feedback patterns: haptic + checkmark for success, vibration + red border for errors
- UX-28: Inline form validation with auto-focus on primary field
- UX-29: Numeric keypad default for barcode entry

**From UX Design - Accessibility:**

- UX-30: WCAG 2.1 AA Compliance for contrast and touch targets
- UX-31: Dynamic Type support (respect system font size)
- UX-32: Screen reader navigation support for Add Card flow

### FR Coverage Map

| FR Range        | Epic                | Description                                          |
| --------------- | ------------------- | ---------------------------------------------------- |
| FR1-FR7, FR9    | Epic 2              | Card Management (add, view, edit, delete)            |
| FR8             | Epic 9              | Mark favorites (Phase 2)                             |
| FR10-FR13       | Epic 2              | Barcode Display (multi-format rendering, brightness) |
| FR14-FR20       | Epic 3              | Italian Brand Catalogue (browse, cache, update)      |
| FR21-FR24       | Epic 9              | Smart Card Sorting (Phase 2)                         |
| FR25-FR33       | Epic 6              | User Authentication & Account Management             |
| FR34            | Epic 5              | Phone-Watch Bluetooth Sync                           |
| FR35-FR42       | Epic 7              | Cloud Synchronization                                |
| FR43-FR47       | Epic 5              | Wearable Experience (watchOS)                        |
| FR48-FR51       | Epic 2              | Offline Functionality                                |
| FR52            | Epic 5              | Wearable Offline Operation                           |
| FR53, FR55-FR58 | Epic 6              | Privacy & GDPR                                       |
| FR54            | Epic 8              | Data Export (Settings)                               |
| FR59-FR65       | Epic 2              | User Feedback & Error Handling                       |
| FR66-FR69       | Epic 8              | App Settings & Preferences                           |
| FR70-FR71       | Future Enhancements | Data Validation (Post-MVP, not in scope)             |
| FR72-FR74       | Epic 4              | Onboarding & Help                                    |

**Coverage Summary:**

- Phase 1 (Epics 1-8): 68 FRs covered
- Phase 2 (Epics 9-10): 4 FRs (FR21-24 sorting) + FR43-47/FR52 for Wear OS
- Post-MVP: FR70-FR71 (data validation)

## Epic List

| Epic | Title                                  | Phase | Status                                         |
| ---- | -------------------------------------- | ----- | ---------------------------------------------- |
| 1    | Project Foundation & App Shell         | 1     | done                                           |
| 2    | Card Management & Barcode Display      | 1     | done                                           |
| 3    | Italian Brand Catalogue                | 1     | done                                           |
| 4    | Onboarding Experience                  | 1     | done                                           |
| 5    | Apple Watch App                        | 1     | done                                           |
| 6    | User Authentication & Privacy          | 1     | in-progress (6-12/6-13 social sign-in backlog) |
| 7    | Cloud Synchronization                  | 1     | done                                           |
| 8    | Settings & Preferences                 | 1     | absorbed → Epic 13                             |
| 9    | Smart Card Sorting                     | 2     | done                                           |
| 10   | Wear OS App                            | 2     | backlog (Sprint 18)                            |
| 11   | CI/CD & Quality Gates                  | 1     | done                                           |
| 12   | App-Wide Design Overhaul (Figma)       | 2     | done                                           |
| 13   | UI Implementation                      | 2     | done                                           |
| 14   | Household Collaboration                | 3     | in-progress (14-5a UX gates impl)              |
| 15   | Internationalisation & Public Presence | 2     | done                                           |
| 16   | Platform & Tech Debt (standing bucket) | —     | in-progress                                    |
| 17   | Apple Wallet Pass Support              | 3     | backlog (parked — spike first)                 |

---

## Epic 1: App Foundation & First Launch Experience

**Goal:** Users can launch the app quickly, navigate core screens, and trust that data persists offline from the first run.

**Phase:** 1 (MVP)

**Epic Type:** Enabling (directly supports Epic 2 user flows)

**FRs Covered:** Foundation enabling FR48 (offline access), FR51 (local storage)

**Scope:**

- Extend existing Expo SDK 54 setup with required dependencies
- Configure NativeWind with Sage Green theming (light/dark mode)
- Set up expo-sqlite database with Zod schemas
- Create app shell with header navigation (+/⚙️ buttons)
- Configure ESLint rules for feature boundaries
- Set up Zustand stores and TanStack Query with offline-first defaults

**Enabling Note:** Stories 1.1–1.4 are enabling tasks that unlock the first user-facing experience in Epic 2.

**Technical Notes:**

- Project already initialized with `npx create-expo-app@latest`
- Dependencies to add: NativeWind, Zustand, TanStack Query, React Hook Form, Zod, expo-sqlite, expo-camera
- Feature-first project structure: app/, features/, shared/, core/

---

### Story 1.1: Configure Development Environment [Enabling]

**As a** developer,
**I want** a properly configured TypeScript and ESLint environment,
**So that** I can write consistent, type-safe code with enforced feature boundaries.

**Acceptance Criteria:**

**Given** the existing Expo SDK 54 project
**When** I open the project in my IDE
**Then** TypeScript strict mode is enabled with `noUncheckedIndexedAccess`, `noImplicitReturns`, and `noFallthroughCasesInSwitch`
**And** ESLint rules enforce feature boundaries (features cannot import from other features)
**And** path aliases are configured (`@/features/*`, `@/shared/*`, `@/core/*`, `@/catalogue/*`)
**And** the feature-first folder structure is created (app/, features/, shared/, core/, catalogue/)

---

### Story 1.2: Implement Design System Foundation

**As a** user,
**I want** a visually polished app with consistent theming,
**So that** the interface feels premium and responds to my system preferences.

**Acceptance Criteria:**

**Given** I launch the app
**When** the app renders any screen
**Then** NativeWind (Tailwind CSS) is configured with the 8px base grid
**And** the Accessible Sage color palette is available (#73A973 primary, OLED black, Off-white)
**And** the 5-color card palette is defined (Blue #3B82F6, Red #EF4444, Green #22C55E, Orange #F97316, Grey #6B7280)
**And** light/dark mode themes are configured respecting system preferences
**And** minimum touch targets are enforced (44x44px)

---

### Story 1.3: Create Core Data Schema ✅ [Enabling]

**Status:** Complete

**As a** developer,
**I want** a single source of truth for data structures,
**So that** all platforms use consistent card data with runtime validation.

**Acceptance Criteria:**

**Given** I need to work with loyalty card data
**When** I import from `@/core/schemas`
**Then** the `loyaltyCardSchema` Zod schema is available with all fields:

- id (UUID), name (string max 50), barcode (string), barcodeFormat (enum)
- brandId (nullable string), color (enum of 5 colors), isFavorite (boolean)
- lastUsedAt (nullable ISO datetime), usageCount (integer), createdAt, updatedAt
  **And** TypeScript types are inferred from Zod schemas
  **And** `parseWithLogging` utility function is available for safe parsing
  **And** test fixtures exist at `/test-fixtures/card-valid.json`

---

### Story 1.4: Set Up Local Database ✅ [Enabling]

**Status:** Complete

**As a** user,
**I want** my cards stored reliably on my device,
**So that** they persist across app restarts and work offline.

**Acceptance Criteria:**

**Given** I am using the app for the first time
**When** I open the card list for the first time
**Then** expo-sqlite database is initialized with the loyalty_cards table
**And** the migration pattern handles both fresh installs and future upgrades
**And** database version tracking is implemented
**And** all database writes use transactions
**And** the database works completely offline

**Given** I have existing cards in the database
**When** I restart the app
**Then** all my cards are preserved exactly as I left them

---

### Story 1.5: Build App Shell with Header Navigation

**As a** user,
**I want** quick access to add cards and settings from any screen,
**So that** my card list has maximum screen space and I can navigate efficiently.

**Acceptance Criteria:**

**Given** I launch the app
**When** the main screen loads
**Then** I see my card list as the primary screen (placeholder/empty state is acceptable)
**And** the header displays the app name
**And** the header has a "+" button that navigates to the Add Card screen
**And** the header has a "⚙️" (settings) button that navigates to Settings
**And** navigation uses Expo Router file-based routing
**And** transitions are smooth (60fps target)

### Story 1.6: Extend Semantic Error Color Tokens

**As a** developer, **I want** consistent error/destructive color tokens (background, text, border) in the design system, **So that** components don't hardcode hex values and the palette stays consistent across the app.

**Acceptance Criteria:**

- Semantic tokens exist for error background, error text, and error border in `shared/theme/colors.ts`, available in both light and dark themes.
- Dark-mode error colours meet WCAG AA contrast (4.5:1 for text).
- `MigrationBanner.tsx` (Story 6.14) and future error states (delete-account, sync errors, form validation) consume the tokens instead of local hardcoded constants.

_Follow-up surfaced during the Story 6.14 review; owned by Sally (UX). Status: drafted._

---

## Epic 2: Card Management & Barcode Display

**Goal:** Users can add their loyalty cards and display their barcodes at checkout — the core product value.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing

**Dependencies:** Epic 1 (foundation)

**FRs Covered:** FR1-FR7, FR9-FR13, FR48-FR51, FR59-FR65 (FR8 favorites moved to Epic 9)

**Scope:**

- Card list screen (Soft Sage Grid, responsive 2-3 columns)
- Add card flow with camera barcode scanning (primary) and manual entry (fallback)
- Card detail view with edit and delete functionality
- Virtual Logo system (1-3 initials + 5-color palette) for cards without logos
- Static catalogue logo lookup (import italy.json for brand logo display)
- Barcode Flash overlay (full-screen white, max brightness, centered barcode)
- Multi-format barcode rendering (Code128, EAN-13, EAN-8, QR, CODE39, UPCA)
- Complete offline functionality (all CRUD operations work offline)
- User feedback: loading indicators, success confirmations, error messages

**Technical Notes:**

- Card schema includes sorting fields (lastUsedAt, usageCount, isFavorite) but they remain inactive until Phase 2
- Phase 1 list order: newest first (createdAt descending)
- Barcode round-trip testing required in CI

---

### Story 2.1: Display Card List

**As a** user,
**I want** to see all my loyalty cards in a clean grid,
**So that** I can quickly find and access any card.

**Acceptance Criteria:**

**Given** I have no cards saved
**When** I view the main screen
**Then** I see a friendly empty state encouraging me to add my first card
**And** the empty state includes a prominent "Add Card" call-to-action

**Given** I have cards saved
**When** I view the main screen
**Then** I see my cards in a responsive grid (2 columns on standard phones, 3 on larger screens)
**And** each card shows its name and visual identifier (logo or Virtual Logo)
**And** cards are ordered by creation date (newest first)
**And** the list scrolls smoothly at 60fps
**And** the list works completely offline

---

### Story 2.2: Add Card Manually

**As a** user,
**I want** to add a loyalty card by entering its details,
**So that** I can digitize any card even without scanning.

**Acceptance Criteria:**

**Given** I tap the "+" button in the header
**When** I choose to add a card manually
**Then** I see a form with fields for: card name (required, max 50 chars), barcode number (required)
**And** I can select a barcode format from a picker (Code128, EAN-13, EAN-8, QR, CODE39, UPCA)
**And** I can select a color for the card from the 5-color palette
**And** the barcode field shows a numeric keypad by default
**And** inline validation shows errors for empty required fields

**Given** I submit a valid card
**When** the save completes
**Then** the card is saved to the local database with a client-generated UUID
**And** I am returned to the card list showing my new card
**And** I see a brief success confirmation (haptic + checkmark)

---

### Story 2.3: Scan Barcode with Camera

**As a** user,
**I want** to scan a barcode using my camera,
**So that** I can add cards quickly without typing.

**Acceptance Criteria:**

**Given** I tap the "+" button and choose to scan
**When** I grant camera permission
**Then** I see a camera viewfinder with barcode detection active
**And** there is always a visible "Enter Manually" button below the viewfinder

**Given** the camera detects a valid barcode
**When** detection completes
**Then** the barcode value is automatically captured
**And** the detected format is identified (Code128, EAN-13, etc.)
**And** I am taken to a form pre-filled with the scanned barcode to enter a name
**And** I can save the card immediately

**Given** camera permission is denied
**When** I try to scan
**Then** I see a clear error message explaining why the camera is needed
**And** I am offered the manual entry option as fallback

---

### Story 2.4: Display Virtual Logo

**As a** user,
**I want** cards without official brand logos to show a distinctive visual,
**So that** I can quickly recognize any card in my list.

**Acceptance Criteria:**

**Given** a card does not have a brand logo (brandId is null)
**When** the card is displayed in the list
**Then** it shows a Virtual Logo: 1-3 initials from the card name on a colored background
**And** the background color is the color selected when the card was created
**And** the initials use high-contrast white text
**And** the Virtual Logo has the same dimensions as brand logos for consistent grid layout

---

### Story 2.5: Display Barcode (Barcode Flash)

**As a** user,
**I want** to display my card's barcode in a format optimized for scanning,
**So that** the cashier can scan it quickly at checkout.

**Acceptance Criteria:**

**Given** I tap on a card in my list
**When** the barcode displays
**Then** I see the Barcode Flash overlay: full-screen white background with centered barcode
**And** the barcode is rendered in the correct format (Code128, EAN-13, QR, etc.)
**And** barcode rendering completes in ≤100ms
**And** the barcode number is displayed as text below the barcode
**And** screen brightness is maximized automatically
**And** I can dismiss the overlay by tapping anywhere or swiping

**Given** I am in a location with no network
**When** I tap on a card
**Then** the barcode displays identically (100% offline)

---

### Story 2.6: View Card Details

**As a** user,
**I want** to view all details of a card,
**So that** I can see the full barcode number and manage the card.

**Acceptance Criteria:**

**Given** I am viewing the Barcode Flash
**When** I tap a "Details" button or swipe up
**Then** I see the card detail screen showing:

- Card name
- Barcode (displayed and as text for copying)
- Barcode format
- Card color
- Date added
  **And** I see options to Edit or Delete the card
  **And** I can return to the card list easily

---

### Story 2.7: Edit Card

**As a** user,
**I want** to update my card's information,
**So that** I can fix mistakes or update details.

**Acceptance Criteria:**

**Given** I am viewing a card's details
**When** I tap "Edit"
**Then** I see a form pre-filled with the card's current values
**And** I can update the name, barcode, format, and color
**And** validation rules are the same as when adding

**Given** I save my changes
**When** the update completes
**Then** the card is updated in the database with a new `updatedAt` timestamp
**And** I see the updated card details
**And** I see a brief success confirmation

---

### Story 2.8: Delete Card

**As a** user,
**I want** to remove a card I no longer need,
**So that** my card list stays clean and relevant.

**Acceptance Criteria:**

**Given** I am viewing a card's details
**When** I tap "Delete"
**Then** I see a confirmation dialog asking "Delete [Card Name]?"
**And** the dialog has Cancel and Delete buttons
**And** the Delete button is styled as destructive (red text)

**Given** I confirm deletion
**When** the delete completes
**Then** the card is removed from the database
**And** I am returned to the card list
**And** the deleted card no longer appears

### Story 2.9: Scan Cards from Image or Screenshot

**As a** user who has a loyalty card image or screenshot, **I want** to scan the barcode or QR code from that image, **So that** I can add the card without retyping it.

**Acceptance Criteria:**

- A "Scan from image" option is available in the add-card flow.
- The app imports an image or screenshot and detects a barcode or QR code from it, supporting the same formats as the camera scanner.
- Detected values preserve leading zeros exactly as captured (including EAN-13 leading-zero recovery from UPC-A results via `normalizeBarcode`).
- The detected code and inferred format prefill the existing `/add-card/setup` flow.
- If multiple readable codes are found in one image, the user can pick the correct one.
- If no code is found, a clear retry/error message is shown and manual entry remains available.
- The feature reuses the existing scan and card-setup routing without a separate workflow.

### Story 2.10: Fix Barcode and QR Readability + Quiet-Zone Padding

**As a** shopper presenting my loyalty card at checkout, **I want** generated barcodes and QR codes to be scanner-readable on the first try, **So that** I can complete checkout quickly without retrying scans.

**Acceptance Criteria:**

- QR code readability is reliable across all phone display surfaces (`CardDetails`, fullscreen barcode, barcode flash), passing 5/5 scans per surface on the QA sample payload.
- The renderer applies explicit quiet-zone padding for both QR and linear formats via generator options (not just container spacing).
- Symbols are never clipped at supported sizes and remain high-contrast black on white, with a scanner-safe minimum QR render size.
- Barcode value and format mapping remain unchanged; no stored card data is mutated.
- Automated coverage asserts the scanner-safety options and dimensions for the QR and linear generation paths.
- A QA validation matrix confirms one QR sample and one linear sample (EAN13 or CODE128) pass 5/5 consecutive on-screen scans in checkout-like conditions.

---

## Epic 3: Italian Brand Catalogue

**Goal:** Users can quickly add cards from popular Italian brands with recognizable logos.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing

**Dependencies:** Epic 1 (foundation)

**FRs Covered:** FR14-FR20

**Scope:**

- Catalogue browsing screen with brand logos grid
- Brand selection flow: tap logo → camera scanner → pre-filled form → Save
- Catalogue caching for offline browsing
- ISO date-based versioning for catalogue updates
- OTA catalogue updates via Expo Updates

**Technical Notes:**

- Source of truth: /catalogue/italy.json
- Top 20 Italian brands with logos (SVG preferred, PNG fallback)
- Build-time generation for watchOS (Brands.swift) occurs during Epic 5
- Catalogue updates delivered via OTA

**Enabling Note:** Story 3.1 is an enabling task that unlocks user-facing catalogue browsing.

---

### Story 3.1: Create Italian Catalogue Data [Enabling]

**As a** developer,
**I want** a structured catalogue of Italian loyalty brands,
**So that** users can add cards with recognizable logos.

**Acceptance Criteria:**

**Given** the project needs brand data
**When** I access `/catalogue/italy.json`
**Then** it contains at least 20 popular Italian retail brands
**And** each brand entry includes: id, name, aliases (alternative names), logoUrl
**And** logos are SVG format (preferred) or optimized PNG
**And** the file includes a version field with ISO date (e.g., "2025-12-31")
**And** the JSON schema is validated and documented

_Example brands: Esselunga, Conad, Coop, Carrefour, Lidl, Eurospin, Pam, Despar, etc._

---

### Story 3.2: Browse Catalogue Grid

**As a** user,
**I want** to browse Italian brands with their logos,
**So that** I can quickly find and add my loyalty cards.

**Acceptance Criteria:**

**Given** I tap the "+" button in the header
**When** the Add Card screen loads
**Then** I see the Italian Catalogue as the primary view (catalogue-first)
**And** brands are displayed in a visual grid with their logos
**And** each brand shows its name below the logo
**And** the grid scrolls smoothly at 60fps
**And** there is a "Add Custom Card" option visible for cards not in catalogue

**Given** I am offline
**When** I view the catalogue
**Then** the cached catalogue displays correctly

---

### Story 3.3: Add Card from Catalogue

**As a** user,
**I want** to select a brand and scan my card,
**So that** my card is saved with the official brand logo.

**Acceptance Criteria:**

**Given** I tap on a brand in the catalogue (e.g., Esselunga)
**When** the brand is selected
**Then** the camera scanner opens automatically
**And** the brand name is shown at the top confirming my selection

**Given** I scan a barcode successfully
**When** the scan completes
**Then** I see a form pre-filled with:

- Name pre-filled with the brand name (editable)
- The scanned barcode and detected format
- The brandId linking to the catalogue entry
  **And** I can tap Save to create the card
  **And** the card displays with the official brand logo (not Virtual Logo)
  **And** I see a success confirmation and return to the card list

**Given** I cannot scan the barcode
**When** I tap "Enter Manually"
**Then** I can type the barcode number and save the card with the brand logo

---

### Story 3.4: Cache Catalogue for Offline

**As a** user,
**I want** the catalogue to work without internet,
**So that** I can add cards from known brands anywhere.

**Acceptance Criteria:**

**Given** I have launched the app at least once with internet
**When** I am subsequently offline
**Then** the full Italian catalogue is available from local cache
**And** all brand logos display correctly
**And** I can add cards from the catalogue normally

**Given** the app is installed fresh
**When** I launch without internet
**Then** the bundled catalogue is available immediately (no network required)

---

### Story 3.5: Update Catalogue via OTA

**As a** user,
**I want** to receive new brands without updating the app,
**So that** my catalogue stays current.

**Acceptance Criteria:**

**Given** a new version of the catalogue is published
**When** the app checks for updates
**Then** the catalogue is updated in the background
**And** new brands appear in the catalogue on next app launch
**And** the update does not interrupt my current session

**Given** the local catalogue version is "2025-12-31"
**When** a newer version "2026-01-15" is available
**Then** the app detects the update using ISO date comparison
**And** downloads and applies the new catalogue

---

## Epic 4: Onboarding Experience

**Goal:** Users understand the app and can add their first card in under 60 seconds.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing

**Dependencies:** Epic 3 (catalogue)

**FRs Covered:** FR72-FR74

**Scope:**

- Welcome screen explaining the 'Fumble-Free Flash' concept
- Catalogue-first onboarding (lead with familiar brands, not empty state)
- First card guidance with scanner
- Help documentation / FAQs accessible from settings

**Technical Notes:**

- Onboarding showcases the Italian catalogue (requires Epic 3)
- Silent watch sync in background if Apple Watch is paired

---

### Story 4.1: Welcome Screen

**As a** new user,
**I want** to understand what this app does,
**So that** I know its value before I start.

**Acceptance Criteria:**

**Given** I launch the app for the first time
**When** the app opens
**Then** I see a welcome screen explaining the core concept:

- "Your loyalty cards, instantly on your wrist"
- Highlight: offline, fast, Apple Watch support
  **And** there is a single prominent "Get Started" button
  **And** the welcome screen only appears once (first launch)
  **And** the design uses the Sage Green accent color

**Given** I have used the app before
**When** I launch the app
**Then** I go directly to the card list (no welcome screen)

---

### Story 4.2: First Card Guidance

**As a** new user,
**I want** to be guided to add my first card,
**So that** I experience value quickly.

**Acceptance Criteria:**

**Given** I tap "Get Started" on the welcome screen
**When** the guidance begins
**Then** I am taken directly to the Italian Catalogue (catalogue-first)
**And** I see a brief prompt: "Tap a brand to add your first card"
**And** the prompt is dismissible and non-blocking

**Given** I successfully add my first card
**When** I return to the card list
**Then** I see a celebratory moment (subtle animation or message)
**And** the onboarding is marked complete
**And** I can now use the app normally

**Given** I dismiss the guidance without adding a card
**When** I navigate away
**Then** the guidance does not reappear (respects user choice)

---

### Story 4.3: Help & FAQ Access

**As a** user,
**I want** to access help when I'm confused,
**So that** I can learn how to use features.

**Acceptance Criteria:**

**Given** I am in the Settings screen
**When** I tap "Help & FAQ"
**Then** I see a list of common questions and answers:

- "How do I add a card?"
- "How does the Apple Watch work?"
- "What if my brand isn't in the catalogue?"
- "Is my data safe?"
  **And** each FAQ expands to show the answer
  **And** the content works offline (bundled, not fetched)

---

## Epic 5: Apple Watch App

**Goal:** Users can access their cards on their Apple Watch without needing their phone — the 'Fumble-Free Flash' experience.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing (with enabling tasks)

**Dependencies:** Epic 2 (card data), Epic 3 (catalogue generation)

**FRs Covered:** FR12, FR34, FR43-FR47, FR52

**Scope:**

- Native Swift/SwiftUI watchOS app
- Carbon Utility design (OLED-black, high-contrast, minimal)
- Vertical infinite scroll list with Digital Crown support
- Single-tap to display barcode (NO confirmation dialogs)
- Haptic feedback on card tap
- Barcode Flash: full-screen white background for scanning
- WatchConnectivity for phone ↔ watch sync
- Local SwiftData storage for standalone operation
- Build-time catalogue generation (Brands.swift from italy.json)

**Technical Notes:**

- Watch is READ-ONLY for card data (card editing only on phone); usage events permitted, applied commutatively on phone (ADR-2026-06-09-001)
- Card list order matches phone (newest first / alphabetical)
- Sync protocol uses versioned messages (CARDS_UPDATED, CARD_ADDED, etc.)

**Enabling Note:** Stories 5.1–5.2 are enabling tasks required for the watch user experience.

---

### Story 5.1: Create watchOS Project Structure [Enabling]

**As a** developer,
**I want** a properly structured watchOS project,
**So that** I can build the Apple Watch companion app.

**Acceptance Criteria:**

**Given** the existing Expo/React Native project
**When** I set up the watchOS project
**Then** the `/watch-ios/` folder contains a native watch app project
**And** the project targets the required watchOS version for local persistence
**And** the project structure follows Apple's recommended patterns
**And** a README documents that this is native Swift (not React Native)
**And** the project builds successfully with standard watchOS tooling

---

### Story 5.2: Generate Catalogue for watchOS [Enabling]

**As a** developer,
**I want** the Italian catalogue available as Swift code,
**So that** the watch app has brand data without JSON parsing at runtime.

**Acceptance Criteria:**

**Given** the `/catalogue/italy.json` file exists
**When** I run the catalogue generation step
**Then** it generates `Brands.swift` in the `/watch-ios/Generated/` folder
**And** the generated file contains a Swift struct with all brand data
**And** the generated file is in `.gitignore` (never committed)
**And** the build process runs this generation step before compiling

---

### Story 5.3: Implement Card List (Carbon UI)

**As a** user,
**I want** to see my cards in a clean list on my watch,
**So that** I can quickly find and select a card.

**Acceptance Criteria:**

**Given** I open the myLoyaltyCards app on my Apple Watch
**When** the app launches
**Then** I see my cards in a vertical list (Carbon Utility design)
**And** the background is OLED black (#000000) for battery efficiency
**And** each card shows: name and visual identifier (logo or initials + color)
**And** the list supports Digital Crown scrolling
**And** the app launches in ≤2 seconds (cold start)
**And** scrolling is smooth at 60fps

**Given** I have no cards synced
**When** the app opens
**Then** I see a message: "Open the iPhone app to add cards"

---

### Story 5.4: Display Barcode on Watch

**As a** user,
**I want** to display a barcode on my watch,
**So that** the cashier can scan it at checkout.

**Acceptance Criteria:**

**Given** I see my card list on the watch
**When** I tap a card
**Then** the barcode displays immediately (no confirmation dialog)
**And** the screen shows a white background with centered barcode
**And** I feel haptic feedback confirming the tap
**And** the barcode is rendered in the correct format
**And** the card name is shown above or below the barcode
**And** the total time from tap to barcode visible is ≤1 second

**Given** the barcode is displayed
**When** I tap the screen or press the Digital Crown
**Then** I return to the card list

**Given** I have no network connection
**When** I tap a card
**Then** the barcode displays identically (100% offline)

---

### Story 5.5: Store Cards Locally on Watch

**As a** user,
**I want** my cards stored on my watch,
**So that** they're available even without my phone nearby.

**Acceptance Criteria:**

**Given** cards have been synced to my watch
**When** I restart my watch or the app
**Then** all my cards are still available
**And** cards persist across app updates

**Given** my phone is not nearby (out of Bluetooth range)
**When** I open the watch app
**Then** I can still access all previously synced cards
**And** I can display any card's barcode

**Technical Note:** Uses SwiftData for persistence on watchOS 10+.

---

### Story 5.6: Sync Cards from Phone

**As a** user,
**I want** my cards to sync automatically to my watch,
**So that** new cards appear without manual action.

**Acceptance Criteria:**

**Given** I add a card on my phone
**When** my watch is connected via Bluetooth
**Then** the card syncs to my watch automatically (background)
**And** the sync completes within 30 seconds
**And** the card appears in my watch card list

**Given** I edit a card on my phone
**When** sync occurs
**Then** the updated card data appears on my watch

**Given** I delete a card on my phone
**When** sync occurs
**Then** the card is removed from my watch

**Given** sync fails (watch disconnected)
**When** the watch reconnects
**Then** sync retries automatically
**And** the watch receives all pending changes

**Technical Note:** Uses WatchConnectivity framework. Sync messages include version field for future compatibility.

### Story 5.6a: WatchConnectivity Payload Hardening

**As an** Apple Watch user, **I want** phone-to-watch sync payloads to respect WatchConnectivity's transport contract and preserve sorting metadata, **So that** my cards sync reliably and stay ordered by usage and recency.

**Acceptance Criteria:**

- Outbound phone-side messages are sanitized to property-list-safe values before `sendMessage`, `updateApplicationContext`, or `transferUserInfo`; `null`, `undefined`, and unsupported nested values are omitted.
- Both snapshot pushes (`type: 'cards'`) and nested one-shot messages (e.g. `syncCard`) are sanitized consistently.
- `WatchCard` decodes `usageCount`, `lastUsedAt`, and `createdAt` when present, remains backward compatible with legacy payloads that omit them, and re-encodes them in ISO 8601 form.
- `CardStore.migrateUserDefaults(to:)` preserves `usageCount`, `lastUsedAt`, and `createdAt`, and legacy fallback data remains importable without crashes.
- JS tests cover outbound sanitization for snapshot and nested payloads; watchOS unit tests cover decoding, encoding, and migration preservation.
- The targeted `core/watch-connectivity.test.ts` suite, the full JS suite, and watchOS validation all pass.

### Story 5.7: Create Watch Complication

**As an** Apple Watch user, **I want** a home screen complication showing my most relevant loyalty card or sync status, **So that** I can launch the app or check card readiness quickly without opening it.

**Acceptance Criteria:**

- A complication is implemented for at least one supported family (e.g. Circular Small or Modular Large).
- The complication provides a glanceable card title or sync status and, when tapped, opens the watch app to the card list or active card screen.
- The complication updates with the latest card data when the watch app syncs or the timeline reloads.
- The complication gracefully falls back to a static icon or "No cards" state (localized EN/IT) when no card is synced yet.
- The complication is included in the watch target build and passes watchOS compile/validation.

### Story 5.8: Incremental catalogue generation

**As a** developer, **I want** the watch catalogue code generator to run incrementally, **So that** iterative Xcode builds are fast while the committed generated file stays correct.

**Acceptance Criteria:**

- Given a clean repo and a previously-generated `watch-ios/Generated/Brands.swift`, a local watch build does not re-run the generator and build time is reduced (deterministic input hashing + `.xcfilelist` inputs/outputs).
- When `catalogue/italy.json` or the generator script changes, the watch build regenerates `Brands.swift` and the change is visible.
- CI runs a `check:catalogue-generated` job that regenerates and compares against the committed file, failing if they differ.
- The generated `Brands.swift` remains committed; any regenerating automation must update the committed artifact or fail CI.
- Unit and integration tests cover input hashing, regeneration on change, and stale-output detection.

### Story 5.9: Remove legacy UserDefaults fallback (watch.cards)

**As a** product engineer, **I want** the watch app to use SwiftData only, removing the legacy `UserDefaults` key `watch.cards` and its migration fallback, **So that** storage is consistent, tests use a single data surface, and dead legacy paths are gone before public release.

**Acceptance Criteria:**

- No `watch-ios` source references the `UserDefaults.standard` key `watch.cards`.
- Tests that previously used `UITEST_CARDS` are updated to seed an in-memory SwiftData ModelContainer (seeding moved to app launch) rather than the env-var → CardStore shim.
- `CardStore.migrateUserDefaults(to:)` and its UserDefaults-based unit tests are removed or archived/disabled.
- `CardListView` no longer reads or writes `watch.cards`; debug import inserts into `ModelContext`.
- All watchOS unit and UI tests pass locally and in CI.
- The PR includes the updated story file and `sprint-status.yaml` entry.

### Story 5.10: Watch Barcode Legibility and List Density Polish

**As a** watch user, **I want** a larger barcode, the card name shown as the screen title, and denser list rows, **So that** I can find a card faster and present a scan-ready code with less friction.

**Acceptance Criteria:**

- The barcode render area is increased for both linear and QR formats (target at least 80% of container width) while keeping scanner-safe contrast and no clipping.
- The barcode screen displays the selected card name as title-level context.
- Card list row padding/spacing is reduced to improve density on 41mm screens (target at least +1 visible row versus baseline) without truncation regressions.
- Row tap targets remain watch-usable and accessibility-safe (44pt minimum, VoiceOver labels preserved).
- Existing interaction behaviour is intact: tapping a row opens the barcode view; tapping the barcode or using the crown dismisses back to the list.
- Watch tests and validation artifacts are updated for any changed identifiers/layout assumptions, including a native Core Image QR render path plus a phone-synced pre-rendered QR image fallback, and automated checks pass.

---

## Epic 6: User Authentication & Privacy

**Goal:** Users can optionally create an account to enable cloud backup, with full control over their data (guest mode stays fully functional).

**Phase:** 1 (MVP) · **Epic Type:** User-Facing (with enabling tasks) · **Dependencies:** Epic 1

**FRs Covered:** FR25-FR33, FR53, FR55-FR58

### Story 6.1: Create Supabase Project (Production Only)

**As a** team, **I want** a single Production Supabase project provisioned with secure credentials, **So that** the app has a backend for cloud storage and authentication.

**Acceptance Criteria:**

- Supabase project exists, accessible, with the Production environment configured (no Dev) in the correct region
- Environment URL and API key documented and stored securely (never committed to the repo)
- Row-Level Security is enabled by default across tables
- Project setup steps are documented for the team

### Story 6.2: Define Cloud Schema & Row-Level Security

**As a** developer, **I want** a Supabase schema for loyalty cards and users protected by Row-Level Security, **So that** each user's cloud data is private and owner-scoped.

**Acceptance Criteria:**

- `loyalty_cards` table matches the Zod schema (id, name, barcode, etc.); `users` table holds profiles
- RLS policies restrict all access to the owning user only
- Schema, policies, and any migration scripts are documented

### Story 6.3: Configure App Client for Supabase

**As a** developer, **I want** the Expo/React Native app wired to Supabase via env vars and secure client init, **So that** the app can talk to the backend reliably.

**Acceptance Criteria:**

- Supabase client initialized in the app from environment variables for URLs and keys
- Connection-failure error handling implemented
- Credentials held in secure storage (expo-secure-store); setup and usage documented

### Story 6.4: Privacy Policy & Consent Flow

**As a** user, **I want** to view the privacy policy and give explicit consent before creating an account, **So that** my data is handled in a GDPR-compliant, transparent way.

**Acceptance Criteria:**

- Privacy policy accessible in onboarding and settings, with content available offline
- Consent checkbox required before account creation, and consent is stored and auditable
- GDPR compliance documented

### Story 6.5: Implement Guest Mode

**As a** user, **I want** to use every app feature without creating an account, **So that** I can manage cards locally with no sign-in friction.

**Acceptance Criteria:**

- No login required for core features; all card management and watch sync work in guest mode
- Data stored only on device (not cloud), with no account-creation prompts during normal use
- An upgrade path to account creation is visible in settings

### Story 6.6: Create Account with Email

**As a** user, **I want** to register with email and password, **So that** I can create an account for cloud backup.

**Acceptance Criteria:**

- Registration form (email, password, confirm password) with password requirements displayed and validated
- Secure token storage (expo-secure-store); automatic sign-in and success confirmation
- Error handling for invalid input

### Story 6.7: Sign In with Email

**As a** user, **I want** to authenticate with my email and password, **So that** I can access my account and its cloud data.

**Acceptance Criteria:**

- Login form with email and password; error messages for invalid credentials and success feedback
- Session persistence via secure storage
- Logout option available

### Story 6.8: Password Reset

**As a** user who forgot my password, **I want** to reset it via email, **So that** I can regain access without losing my data.

**Acceptance Criteria:**

- "Forgot Password?" link on the Sign In screen; user requests a reset by entering their email
- Clear feedback for success and error cases; reset email deep-links to an in-app new-password form
- User signed in automatically after reset, with no change to locally stored cards
- (Superseded by Story 6.19 — the deep-link recovery never lands on device)

### Story 6.9: Logout

**As a** signed-in user, **I want** to sign out on this device and return to guest mode, **So that** I keep my local cards while ending my session.

**Acceptance Criteria:**

- "Sign Out" clearly visible in Settings when signed in, with a confirmation dialog ("Your cards will remain on this device")
- Auth token removed from SecureStore; user returned to guest mode with local cards still accessible
- Settings updates to reflect guest mode (shows "Sign In" / "Create Account")

### Story 6.10: Delete Account

**As a** signed-in user, **I want** to permanently delete my cloud account and all associated data, **So that** my GDPR right to erasure is fulfilled and I control my data.

**Acceptance Criteria:**

- Destructive "Delete Account" entry in Settings, visible only when authenticated, behind a multi-step confirm (typing "DELETE")
- An Edge Function fully erases cloud data (loyalty_cards, users profile, privacy_log, auth.users) as a full GDPR erasure
- Local SQLite cards preserved; auth token cleared and state transitions to guest, navigating to the card list
- Loading feedback and clear error handling with retry; failures leave no partial state

### Story 6.11: Privacy & Consent

**As a** user, **I want** to review the Privacy Policy before signing up and see a summary of collected data in Settings, **So that** GDPR transparency obligations are met.

**Acceptance Criteria:**

- Privacy Policy link on the Create Account screen before submission, with required acknowledgement of terms before registering
- Privacy Policy reachable from Settings at any time (same content as the existing `app/privacy-policy.tsx`)
- Settings shows a read-only "What We Collect" summary; any "Download My Data" CTA is a labelled placeholder (export belongs to Epic 8)

### Story 6.12: Sign In with Apple

**As a** user, **I want** to create an account or sign in with my Apple ID, **So that** I get fast, private social sign-in and Apple's App Store requirement is satisfied.

**Acceptance Criteria:**

- "Sign in with Apple" button on both the Sign In and Create Account screens; the Apple authentication sheet appears on tap
- Account created or linked in Supabase on success; user signed in automatically with the auth token stored securely
- Apple private relay (hide-my-email) supported
- iOS only — button hidden on Android and Web
- Requires a provisioned physical iOS device from day one (Apple Sign In does not work on the Simulator)

### Story 6.13: Sign In with Google

**As a** user, **I want** to create an account or sign in with my Google account, **So that** I get one-tap sign-in on both iOS and Android.

**Acceptance Criteria:**

- "Sign in with Google" button on the Sign In and Create Account screens across iOS and Android
- Google account picker appears on tap
- Account created or linked in Supabase on success; user signed in automatically with the auth token stored securely
- Works on both iOS and Android

### Story 6.14: Upgrade Guest to Account

**As a** guest user, **I want** my local cards migrated to the cloud automatically when I first create an account (via any method), **So that** I transition to an authenticated session with no data loss.

**Acceptance Criteria:**

- All local cards uploaded to the cloud immediately after first successful authentication, staying visible and usable throughout
- Migration is idempotent (no duplicates if triggered more than once); guest session replaced by an authenticated session seamlessly
- User sees a backup confirmation; migration errors shown clearly with a retry option

### Story 6.15: Migration Banner Polish

**As a** developer, **I want** to clear the three low-severity polish items deferred from the Story 6.14 code review, **So that** the migration banner code is clean and the copy matches the UX with no functional change.

**Acceptance Criteria:**

- Remove the redundant `!message` guard in `MigrationBanner.tsx` (the hook always nulls `message` when idle), leaving only the `status === 'idle'` check
- Fix the error-banner copy in `useGuestMigration.ts` to drop the misleading "Tap to retry" (the banner has a distinct Retry button and is not tappable)
- Remove the unused `uuid` mock from `guest-migration.test.ts` (dead setup — the service never imports `uuid`)
- All 43 migration tests still passing and the full suite green

### Story 6.16: User Profile Creation on Signup

**As** the system, **I want** a `public.users` profile row created automatically whenever a new auth user registers, **So that** every authenticated user has a profile entry to anchor future features (e.g. Epic 14 household collaboration).

**Acceptance Criteria:**

- Migration `002_user_profile_trigger.sql` adds nullable `display_name` and `avatar_url` to `public.users` and creates an idempotent `handle_new_user()` function plus an `AFTER INSERT ON auth.users` trigger (`ON CONFLICT (id) DO NOTHING`)
- Existing `001_initial_schema.sql` RLS policies already cover the new columns (no new policies needed)
- `signUp()` in `shared/supabase/auth.ts` does a defensive idempotent upsert fallback (never fails signup on profile-insert error) and passes consent metadata through so it can be persisted
- `auth.test.ts` asserts the users upsert payload and conflict-safe behaviour

### Story 6.17: Design — OTP Email Verification Screen

**As a** designer, **I want** to design the in-app OTP email verification screen that follows account creation, **So that** developers have approved, pixel-accurate Figma frames for Story 6.18 and users verify without leaving the app.

**Acceptance Criteria:**

- Full screen layout: app icon, "Verify your email" heading, "We sent a 6-digit code to {email}" subtitle, 6 OTP cells, disabled-until-complete Confirm CTA, "Resend code" with 60s countdown, "Wrong email? Go back" link, auto-submit annotation
- Every state designed (empty, filling, complete, loading, wrong OTP, expired OTP, verification unavailable, resend success/failure, transition-only success) in both light and dark, reusing Story 13.5 auth tokens
- Frames delivered to the Figma "OTP Verification" page with consistent naming and prototype annotations (auto-advance, backspace, resend cooldown, wrong-email nav, keyboard-open, success handoff)
- Ifero approved the frames (2026-04-28) before Story 6.18 moved to ready-for-dev

### Story 6.18: OTP Email Verification Flow

**As a** new user who just created an account, **I want** to verify my email by entering a 6-digit OTP sent to my inbox, **So that** I can confirm my account without leaving the app or relying on unreliable magic links.

**Acceptance Criteria:**

- Replaces magic-link confirmation: after signup the user is routed to `/verify-email`, enters the emailed code, and on success is signed in and routed to the main app
- `enable_confirmations = true` set in `supabase/config.toml` and the production dashboard; OTP email template uses `{{ .Token }}`
- New `verifyEmailOtp()` and `resendVerificationEmail()` in `shared/supabase/auth.ts` expose stable error codes so UI and tests don't branch on raw Supabase strings
- Auto-submit on the 6th digit / full paste; success is transition-only (no terminal screen); built against the approved 6.17 handoff

### Story 6.18a: OTP Verification Follow-up — Single Field + 8-Digit Alignment

**As a** new user verifying my email, **I want** the app to accept the real 8-digit OTP in a single text field, **So that** verification succeeds reliably and entry stays readable on mobile.

**Acceptance Criteria:**

- Figma "OTP Verification" page updated first: OTP cell row replaced by a single text field, subtitle reads "We sent an 8-digit code to {email}", auto-submit annotation moved to the 8th digit (light and dark)
- `supabase/config.toml` sets `auth.email.otp_length = 8`; template stays OTP-based; stale 6-digit docs corrected
- `verifyEmailOtp(email, token)` uses the current `verifyOtp({ email, token, type: 'email' })` contract; UI error normalization (`invalid_otp`, `expired_otp`, `network_error`, `unknown_error`) preserved
- `VerifyEmailScreen` uses one digits-only field capped at 8, full paste works, auto-submits on the 8th digit, CTA disabled until exactly 8; regression coverage plus lint/typecheck/Jest green, dev review at 0 comments before QA

### Story 6.19: Password reset via OTP (replace the dead deep-link recovery)

**As a** user who forgot my password, **I want** to reset it with an emailed one-time code entered in the app, **So that** I can regain access without relying on a deep link that never lands.

**Acceptance Criteria:**

- Recovery email is OTP-based (8-digit `{{ .Token }}`, not a link): new `[auth.email.template.recovery]` + `recovery.html`, and the production dashboard recovery template switched to OTP
- New shared plumbing in `shared/supabase/auth.ts`: `sendPasswordResetOtp(email)` (no `redirectTo`, no user enumeration), `verifyPasswordResetOtp(email, token)` via `verifyOtp({ type: 'recovery' })` with normalized errors, reusing `updatePassword` and a renamed shared `normalizeOtpError`
- `ForgotPasswordScreen` sends and navigates to a reused OTP-verify screen (8-digit, parametrized `purpose: 'signup' | 'recovery'`) then a shared new-password screen; success routes to `/` via `router.replace`, clearing the back stack
- No redirect allowlist / `setSession` / deep-link handling; copy localized in en + it; tests ≥80% co-located (no `__tests__`); regression tests prove the signup path is unchanged

### Story 6.20: Change password in Settings (OTP-gated)

**As a** signed-in user, **I want** to change my password from Settings gated by an emailed OTP, **So that** I can rotate my password securely without signing out.

**Acceptance Criteria:**

- Non-destructive "Change Password" `ActionRow` between Sign Out and Delete Account (lock icon, testID, localized accessibilityLabel), hidden for guests
- Tapping it calls `sendPasswordResetOtp(currentUserEmail)` (email from `getSession`) and reuses the 6-19 recovery OTP-verify and shared new-password screens
- On success, route back to `/settings` (not `/`) with a success toast; the new-password screen takes a success-destination param
- OTP wrong/expired/network reuse the 6.18/6-19 inline states; `updatePassword` failure shows a localized error; copy localized (en + it); tests ≥80% co-located (no `__tests__`)
- Depends on and sequenced after 6.19 (reuses its plumbing); OTP gate is an app-level defense-in-depth decision, not a Supabase requirement

---

## Epic 7: Cloud Synchronization

**Goal:** Users' cards sync across all their devices when signed in.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing

**Dependencies:** Epic 6 (authentication)

**FRs Covered:** FR35-FR42

**Scope:**

- Supabase REST API integration for phone ↔ cloud sync
- Background synchronization (automatic)
- Delta sync (only changed cards)
- 5-minute cloud sync throttling (persistent)
- Offline queue with retry on reconnect
- Last-write-wins conflict resolution
- Multi-device sync for authenticated users
- Sync status indicators
- Error handling with overlay messages for sync failures

**Technical Notes:**

- Network connectivity detection
- Bidirectional sync: phone ↔ cloud, propagates to watch via Epic 5

---

### Story 7.1: Upload Cards to Cloud

**As a** user,
**I want** my local cards uploaded to the cloud when I sign in,
**So that** they're backed up and available on other devices.

**Acceptance Criteria:**

**Given** I sign in to my account for the first time
**When** authentication succeeds
**Then** all my local cards are uploaded to the cloud backend
**And** the upload respects the configured sync throttle window
**And** I see a subtle sync indicator during upload
**And** cards remain accessible during the upload process

**Given** I have many cards (e.g., 50+)
**When** upload occurs
**Then** cards are uploaded in batches for efficiency
**And** the process completes without timeout

---

### Story 7.2: Download Cards from Cloud

**As a** user,
**I want** my cloud cards downloaded to a new device,
**So that** I can access them everywhere.

**Acceptance Criteria:**

**Given** I sign in on a new device
**When** authentication succeeds
**Then** all my cards from the cloud backend are downloaded
**And** the cards appear in my card list
**And** brand logos display correctly (using bundled catalogue)
**And** I can use the cards immediately after download

**Given** I already have local cards on the new device (guest mode)
**When** I sign in and download
**Then** cloud cards are merged with local cards
**And** duplicate cards (same barcode) are handled gracefully

---

### Story 7.3: Sync Card Changes

**As a** user,
**I want** card changes to sync automatically,
**So that** all my devices stay up to date.

**Acceptance Criteria:**

**Given** I am signed in
**When** I add a new card
**Then** the card is uploaded to the cloud backend in the background
**And** the sync occurs within the configured throttle window

**Given** I am signed in
**When** I edit a card
**Then** the updated card is synced to the cloud backend
**And** the `updatedAt` timestamp is refreshed

**Given** I am signed in
**When** I delete a card
**Then** the card is marked as deleted in the cloud backend
**And** the deletion syncs to other devices

---

### Story 7.4: Implement Delta Sync

**As a** user,
**I want** only changed cards to sync,
**So that** sync is fast and data-efficient.

**Acceptance Criteria:**

**Given** I have 100 cards and edit 1
**When** sync occurs
**Then** only the 1 changed card is uploaded (not all 100)
**And** the sync uses `updatedAt` timestamps to detect changes

**Given** my device syncs after being offline
**When** sync resumes
**Then** only cards changed since last sync are transferred
**And** the sync completes quickly

---

### Story 7.5: Handle Offline Queue

**As a** user,
**I want** my changes saved when offline,
**So that** nothing is lost when I'm in a basement or on a plane.

**Acceptance Criteria:**

**Given** I am signed in but offline
**When** I add, edit, or delete a card
**Then** the operation is queued locally
**And** my local data reflects the change immediately

**Given** I have queued operations
**When** network connectivity is restored
**Then** queued operations are synced automatically
**And** I see a brief sync indicator
**And** no user intervention is required

**Given** a queued sync fails repeatedly
**When** max retries are exceeded
**Then** I see an error notification
**And** I can manually trigger a retry

---

### Story 7.6: Resolve Sync Conflicts

**As a** user,
**I want** sync conflicts resolved automatically,
**So that** I don't have to manually fix data issues.

**Acceptance Criteria:**

**Given** I edit a card on Device A
**And** I edit the same card on Device B before sync
**When** both devices sync
**Then** the card with the latest `updatedAt` wins (last-write-wins)
**And** the losing edit is overwritten
**And** no user prompt or manual resolution is required

**Given** conflicts are resolved
**When** I view the card on both devices
**Then** both devices show the same data

---

### Story 7.7: Display Sync Status

**As a** user,
**I want** to see if my data is synced,
**So that** I know my cards are backed up.

**Acceptance Criteria:**

**Given** I am signed in
**When** sync is in progress
**Then** I see a subtle sync indicator (spinning icon or pulse)
**And** the indicator does not block my interaction

**Given** sync completes successfully
**When** I look at the UI
**Then** the sync indicator disappears or shows a checkmark briefly

**Given** sync fails
**When** the error occurs
**Then** I see an overlay message: "Sync failed. Changes saved locally."
**And** I can tap to retry or dismiss
**And** the error is clear (not technical jargon)

---

> [!NOTE]
> **Epic 8 is ABSORBED into Epic 13 (DEC-S10-001).** Stories 8.1–8.5 were not built
> separately — the Settings screen shipped via Story 13.6. Retained for traceability.

## Epic 8: Settings & Preferences

**Goal:** Users can customize the app to their preferences and access their data.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing

**Dependencies:** Epic 4 (Help/FAQ content)

**FRs Covered:** FR54, FR57, FR66-FR69, FR73

**Scope:**

- Settings screen with organized sections
- Theme toggle (light/dark mode, respects system default)
- Language selection (English for MVP, externalized for future localization)
- JSON data export (GDPR data portability)
- Privacy policy link
- Help / FAQs link
- App version and build information
- Open source licenses

**Technical Notes:**

- Settings persisted in AsyncStorage
- Theme preference syncs with system but allows manual override

---

### Story 8.1: Create Settings Screen

**As a** user,
**I want** a dedicated settings screen,
**So that** I can find and adjust all app preferences.

**Acceptance Criteria:**

**Given** I tap the ⚙️ button in the header
**When** the Settings screen opens
**Then** I see organized sections:

- **Account** (if signed in: email, Sign Out, Delete Account)
- **Account** (if guest: Create Account, Sign In)
- **Appearance** (Theme)
- **Language**
- **Data** (Export Data)
- **About** (Help, Privacy Policy, App Info)
  **And** each section has clear headings
  **And** the screen matches the app's design system

---

### Story 8.2: Toggle Theme (Light/Dark)

**As a** user,
**I want** to choose between light and dark mode,
**So that** the app matches my preference or environment.

**Acceptance Criteria:**

**Given** I am in Settings > Appearance
**When** I see the Theme option
**Then** I can choose: System (default), Light, or Dark
**And** the current selection is highlighted

**Given** I select "System"
**When** my device is in dark mode
**Then** the app uses dark mode
**And** when my device switches to light mode, the app follows

**Given** I select "Dark" explicitly
**When** my device is in light mode
**Then** the app still uses dark mode (override)

**Given** I change the theme
**When** I return to other screens
**Then** the theme change is applied immediately
**And** my preference persists across app restarts

---

### Story 8.3: Select Language

**As a** user,
**I want** to choose my preferred language,
**So that** the app displays text in my language.

**Acceptance Criteria:**

**Given** I am in Settings > Language
**When** I see the Language option
**Then** I can choose from available languages (English for MVP)
**And** the current language is highlighted

**Given** I select a different language
**When** the change is applied
**Then** all app text updates to the selected language
**And** my preference persists across app restarts

**Technical Note:** MVP supports English only. UI is externalized via i18next for future localization.

---

### Story 8.4: Export Data as JSON

**As a** user,
**I want** to export all my card data,
**So that** I can have a portable backup (GDPR data portability).

**Acceptance Criteria:**

**Given** I am in Settings > Data
**When** I tap "Export Data"
**Then** a JSON file is generated containing all my cards
**And** each card includes: name, barcode, barcodeFormat, color, brandId, dates

**Given** the export is ready
**When** the file is generated
**Then** the system share sheet opens
**And** I can save the file, send via email, or share to other apps

**Given** I am offline
**When** I tap "Export Data"
**Then** the export still works (local data only)

---

### Story 8.5: Display App Info

**As a** user,
**I want** to see app information,
**So that** I know the version and can access legal info.

**Acceptance Criteria:**

**Given** I am in Settings > About
**When** I view the About section
**Then** I see:

- App version and build number
- "Help & FAQ" link (opens FAQ from Epic 4)
- "Privacy Policy" link (opens privacy policy)
- "Open Source Licenses" link (shows MIT license and dependencies)

**Given** I tap "Privacy Policy"
**When** the policy loads
**Then** I see the full privacy policy text (bundled or webview)

**Given** I tap "Open Source Licenses"
**When** the licenses load
**Then** I see the MIT license and a list of open source dependencies used

---

## Epic 9: Smart Card Sorting

**Goal:** Users' most-used cards are always at the top for quick access.

**Phase:** 2 (Enhancement)

**Epic Type:** User-Facing

**Dependencies:** Epic 2 (card list + display)

**FRs Covered:** FR8, FR21-FR24

**Scope:**

- Usage tracking: increment usageCount and update lastUsedAt on card display
- Sorting algorithm: favorites first → frequency → recency → alphabetical
- Favorites/pinning functionality (long-press to pin)
- Visual indicator for pinned cards
- Sorting applies to both phone and watch lists

**Technical Notes:**

- Schema fields already exist from Epic 2 (just inactive)
- Activate tracking and sorting logic
- Target: correct card in top 3 positions 95% of time

---

### Story 9.1: Track Card Usage

**As a** user,
**I want** the app to remember which cards I use most,
**So that** they can be surfaced quickly.

**Acceptance Criteria:**

**Given** I tap a card to display its barcode
**When** the barcode is shown
**Then** the card's `usageCount` is incremented by 1
**And** the card's `lastUsedAt` is updated to the current timestamp
**And** this tracking works offline

---

### Story 9.2: Mark Card as Favorite

**As a** user,
**I want** to pin my most important cards,
**So that** they always appear at the top.

**Acceptance Criteria:**

**Given** I am viewing a card's details
**When** I tap the favorite/star icon
**Then** the card's `isFavorite` is toggled
**And** the icon reflects the current state (filled = favorite)
**And** the change persists and syncs to cloud if signed in

**Given** a card is marked as favorite
**When** I view my card list
**Then** the card shows a visual indicator (star badge)

---

### Story 9.3: Implement Sorting Algorithm

**As a** user,
**I want** my cards automatically sorted by relevance,
**So that** the right card is near the top when I need it.

**Acceptance Criteria:**

**Given** I have multiple cards with varying usage
**When** I view my card list
**Then** cards are sorted by:

1. Favorites first (isFavorite = true)
2. Then by usage frequency (usageCount descending)
3. Then by recency (lastUsedAt descending)
4. Then alphabetically by name (fallback)

**Given** I have 10 cards with usage data
**When** I visit my usual store
**Then** the correct card appears in the top 3 positions at least 95% of the time

---

### Story 9.4: Sync Sorting to Watch

**As a** user,
**I want** my watch to use the same card order,
**So that** my most-used cards are on top there too.

**Acceptance Criteria:**

**Given** cards are sorted on my phone
**When** the watch syncs
**Then** the watch card list uses the same sort order
**And** usage data (usageCount, lastUsedAt, isFavorite) syncs to the watch
**And** favourite cards show a star/pin indicator on the watch _(AC added 2026-06-09 — C3 folded in via correct-course; see `sprint-artifacts/sprint-change-proposal-2026-06-09.md`)_

---

### Story 9.5: Selectable Watch Sort

_Added 2026-06-09 via correct-course (`sprint-artifacts/sprint-change-proposal-2026-06-09.md`)._

**As a** user,
**I want** to choose how my cards are sorted on the Watch,
**So that** the order matches how I think about my cards.

**Acceptance Criteria:**

**Given** I am on the Watch card list
**When** I open the sort control (toolbar button → picker)
**Then** I can choose Frequently used / Recently added / A‑Z (the same modes as the phone)
**And** the default is A‑Z
**And** my choice persists on the Watch across launches, independently of the phone's selected mode

**Dependencies:** Story 9.4. **Needs:** PRD FR25, UX watch-picker spec.

---

### Story 9.6a: Watch Usage-Event Architecture (Spike / ADR) [Enabling]

_Added 2026-06-09 via correct-course. Gates Story 9.6 (spike-first per Sprint 14 retro)._

**As an** architect,
**I want** a validated design for watch→phone usage events,
**So that** counting watch card opens never reintroduces edit conflicts.

**Acceptance Criteria:**

**Given** the watch read-only-for-data invariant
**When** the ADR is produced
**Then** it specifies a `CARD_USED` (watch → phone) message in the versioned sync protocol
**And** proves conflict-free reconciliation (commutative usageCount increments; lastUsedAt = max)
**And** refines the "watch read-only" wording to "read-only for card data; usage events permitted"
**And** confirms Wear OS (Epic 10) can adopt the same protocol

---

### Story 9.6: Count Card Opens on the Watch

_Added 2026-06-09 via correct-course. Depends on the 9.6a ADR + PM scope confirmation._

**As a** user,
**I want** opening a card on my Watch to count toward usage,
**So that** "most used" is accurate on both Watch and phone.

**Acceptance Criteria:**

**Given** I open a card on the Watch
**When** the phone is (or becomes) reachable
**Then** the phone increments that card's usageCount and updates lastUsedAt
**And** events queue offline on the Watch and flush on reachability
**And** the Watch remains read-only for card data (no create/edit/delete/favourite from the watch)

---

## Epic 10: Wear OS App

**Goal:** Users can access their cards on their Android smartwatch.

**Phase:** 2 (Enhancement)

**Epic Type:** User-Facing (with enabling tasks)

**Dependencies:** Epic 2 (card data), Epic 3 (catalogue generation)

**FRs Covered:** FR12, FR43-FR47, FR52 (Wear OS specific)

**Scope:**

- Native Kotlin/Compose Wear OS app
- Carbon Utility design (same as watchOS)
- Wearable Data Layer API for phone ↔ watch sync
- Room database for local storage
- Build-time catalogue generation (Brands.kt from italy.json)
- Apply learnings from watchOS development

**Technical Notes:**

- Same sync protocol as watchOS (versioned messages)
- Watch is READ-ONLY for card data (consistent with watchOS). A usage-event channel (`CARD_USED`, card-opened → phone) is **ratified** for Epic 9 Story 9.6 by **ADR-2026-06-09-001** (Accepted 2026-06-09) — Wear OS mirrors it via the Wearable Data Layer (`MessageClient`/`DataClient`): same `{ id, usedAt }` payload + commutative reconciliation (`usageCount += 1`, `lastUsedAt = max`). _(Updated 2026-06-09 via correct-course; ratified 2026-06-09.)_

**Parity scope added 2026-06-09 (correct-course — mirror the watchOS Epic 9 changes):**

- Per-surface selectable sort (Frequently used / Recently added / A‑Z), persisted independently (mirror Story 9.5)
- Favourite (pin) indicator on rows (mirror Story 9.4 / C3)
- Usage-event emission for card opens (mirror Story 9.6, per ADR-2026-06-09-001 — Accepted)

**Enabling Note:** Stories 10.1–10.2 are enabling tasks required for the Wear OS experience.

---

### Story 10.1: Create Wear OS Project Structure [Enabling]

**As a** developer,
**I want** a properly structured Wear OS project,
**So that** I can build the Android watch companion app.

**Acceptance Criteria:**

**Given** the existing project
**When** I set up the Wear OS project
**Then** the `/watch-android/` folder contains a native Kotlin/Compose project
**And** the project targets Wear OS 3+ (API 30+)
**And** a README documents that this is native Kotlin (not React Native)
**And** the project builds successfully in Android Studio

---

### Story 10.2: Generate Catalogue for Wear OS [Enabling]

**As a** developer,
**I want** the Italian catalogue available as Kotlin code,
**So that** the watch app has brand data without JSON parsing at runtime.

**Acceptance Criteria:**

**Given** the `/catalogue/italy.json` file exists
**When** I run the build script `/watch-android/scripts/generate-catalogue.kts`
**Then** it generates `Brands.kt` in the generated folder
**And** the generated file contains a Kotlin data class with all brand data
**And** the generated file is in `.gitignore`
**And** the build process runs this script before compiling

---

### Story 10.3: Implement Card List (Carbon UI)

**As a** user,
**I want** to see my cards on my Wear OS watch,
**So that** I can access them from my Android wearable.

**Acceptance Criteria:**

**Given** I open myLoyaltyCards on my Wear OS watch
**When** the app launches
**Then** I see my cards in a vertical list (Carbon Utility design)
**And** the background is OLED black
**And** the list supports touch scrolling and rotary input (if available)
**And** the app launches in ≤2 seconds

---

### Story 10.4: Display Barcode on Wear OS

**As a** user,
**I want** to display a barcode on my Wear OS watch,
**So that** I can use it at checkout.

**Acceptance Criteria:**

**Given** I see my card list
**When** I tap a card
**Then** the barcode displays immediately (no confirmation)
**And** the screen shows white background with centered barcode
**And** haptic feedback confirms the tap
**And** the display works offline

---

### Story 10.5: Store Cards Locally

**As a** user,
**I want** my cards stored on my Wear OS watch,
**So that** they work without my phone.

**Acceptance Criteria:**

**Given** cards have been synced
**When** my phone is not nearby
**Then** I can still access and display all synced cards

**Technical Note:** Uses Room database for persistence.

---

### Story 10.6: Sync Cards from Phone

**As a** user,
**I want** cards to sync from my Android phone,
**So that** my watch stays up to date.

**Acceptance Criteria:**

**Given** I add a card on my phone
**When** sync occurs via Wearable Data Layer API
**Then** the card appears on my Wear OS watch
**And** edits and deletes also sync

---

## Epic 11: CI/CD & Quality Gates

**Goal:** Establish automated CI/CD pipelines and quality gates that block bad merges, build efficiently, ship iOS/watchOS/Android to TestFlight and the stores, and keep the project contribution-ready.

**Phase:** 1 · **Epic Type:** Enabling · **Dependencies:** Epic 1

### Story 11.1: Block PR on Quality Gates

**As a** maintainer, **I want** PR merges blocked when lint, typecheck, tests, or coverage fail, **So that** only quality-verified code reaches `main`.

**Acceptance Criteria:**

- CI (`ci-quality-gates.yml`) runs ESLint, TypeScript, and Jest on every PR
- Merge is blocked and a clear report is shown on GitHub when any check fails
- Minimum 80% line/statement coverage enforced via `jest.config.js` (scoped to `features/` and `core/`)
- CI + coverage badges in `README.md`; pipeline left ready for future visual-regression checks

### Story 11.2: Build on main only if app code changes

**As a** maintainer, **I want** main-branch builds to trigger only when app or native code changes, **So that** CI resources aren't wasted on docs/config/test edits.

**Acceptance Criteria:**

- Build runs only on changes in `app/`, `core/`, `features/`, `shared/`, `android/`, `ios/`
- No build on `docs/`, `config/`, `test/`, `assets/`, `scripts/`, `.github/` changes
- Native (`android/`/`ios/`) changes always trigger the build
- Path filters documented in `docs/cicd.md` and easy to update

### Story 11.3: Notify on Build Status

Consciously cancelled — GitHub shows build status natively, so dedicated Slack/email build notifications are not needed.

### Story 11.4: Rollback on Failed Deploy

Consciously cancelled — rollback does not apply to mobile app-store binaries, so a rollback strategy is not applicable.

### Story 11.5: Document CI/CD Pipeline

**As a** developer or maintainer, **I want** complete, accurate CI/CD documentation, **So that** anyone can ship to TestFlight or production without tribal knowledge.

**Acceptance Criteria:**

- Remove inaccurate claims (Slack/email notifications, rollback strategy) so every statement reflects what's implemented
- Add a Mermaid pipeline-architecture diagram covering PR gates, watchOS tests, main-branch builds, RC-tag beta releases, and release-tag store uploads (iOS, Android, watchOS)
- Include release runbooks: ship to TestFlight, release to production, and manual/ad-hoc builds
- Document watchOS CI/CD, `fastlane match` provisioning/certificates, a troubleshooting section, and a maintainable structure (TOC, "last updated", relative workflow links)

### Story 11.6: Embed watchOS App in iOS Build via @bacons/apple-targets

**As a** developer, **I want** the watchOS app embedded in the iOS archive via Expo Continuous Native Generation, **So that** one `fastlane ios beta` run produces a TestFlight build containing both apps.

**Acceptance Criteria:**

- Install and register `@bacons/apple-targets`; migrate watch source from `watch-ios/` to `targets/watch/` with an `expo-target.config.js`
- `expo prebuild --clean` regenerates an iOS project with a native `watch` target (bundle ID `com.iferoporefi.myloyaltycards.watch`) and an "Embed Watch Content" phase
- Fastlane `beta`, `adhoc`, and `upload_release` lanes sign both the iOS and watch targets (separate match + `update_code_signing_settings` calls)
- `watchos-tests.yml` and `package.json` scripts updated to the new path; old `watch-ios/` removed with no lingering references; TestFlight smoke test shows the watch companion

### Story 11.7: Open-Source Contribution Infrastructure & Story-Status Automation

**As a** maintainer and prospective contributor, **I want** accurate docs, a license, GitHub templates, and automated story-status bookkeeping, **So that** contributions follow the BMAD spec-first process and sprint tracking stays accurate automatically.

**Acceptance Criteria:**

- Rewrite `README.md` (accurate paths, tech stack, architecture) and add a BMAD-SDD-enforcing `CONTRIBUTING.md` plus an MIT `LICENSE`
- Add GitHub PR template, bug/feature/brand-catalogue issue forms with `config.yml`, and supporting labels
- On PR merge, `scripts/mark-story-done.mjs` sets the referenced story to `done` in both `sprint-status.yaml` and the story file, committed with `[skip ci]`
- CI (`pr-conventions.yml` / `check-pr-conventions.mjs`) fails PRs with non-Conventional-Commit titles, off-convention branches, or code changes lacking a story reference (docs/chore and catalogue PRs exempt)

---

## Epic 12: App-Wide Design Overhaul (Figma)

**Goal:** Produce the full Figma design system and per-screen designs that Epic 13 implements in code.

**Phase:** 2 · **Epic Type:** Design/Enabling

### Story 12.1: Design System Foundation

**As a** designer and developer, **I want** a complete design system defined in Figma with reusable tokens and components, **So that** all subsequent screen designs are consistent and developers have clear specs to implement against.

**Acceptance Criteria:**

- Color palette for light + dark modes (primary `#1A73E8` / `#4DA3FF`, surfaces, text hierarchy, semantic + interactive colors), all WCAG 2.1 AA compliant; dark mode purposefully designed on true black.
- Typography scale (11 levels, Large Title 34pt → Caption 2 11pt) with weights, line-heights, and letter-spacing for iOS (SF Pro) and watchOS (SF Compact).
- Button system (Primary/Secondary/Tertiary/Destructive) with default/pressed/disabled/loading states and 44pt minimum touch targets; the primary CTA is never washed out.
- Card component system (catalogue brand-color + logo, custom color + letter avatar), icon set (MI/MCI via `@expo/vector-icons`), form inputs, and a 7-step spacing/layout token scale.

### Story 12.1a: Source Real Brand Logos

**As a** designer, **I want** real official-quality SVG logos for all 20 Italian catalogue brands, **So that** card tiles show authentic, instantly recognizable brand identity instead of approximations.

**Acceptance Criteria:**

- Each brand's `assets/images/brands/{brand}.svg` is the real logo, sourced from official/high-quality vector sources and cleanly vectorized (not rasterized).
- Logos on transparent background, 200×200px centered canvas, in the correct color variant for the brand background (white for dark backgrounds, dark for light like Esselunga yellow / Douglas teal).
- Figma Design System AC4 cards updated to use the real logos.

### Story 12.2: Home Screen (Card List)

**As a** user opening the app, **I want** to see my loyalty cards in a visually appealing, scannable grid with real brand identities, **So that** I can quickly find and tap the card I need at checkout.

**Acceptance Criteria:**

- 2-column grid of Klarna-style brand-colored tiles (catalogue logo / custom letter avatar) with card names, scrollable, light + dark.
- Header with centered app name and clearly visible, high-contrast add and settings icons (28pt+, 44pt touch targets).
- Search bar ("Search loyalty cards") with empty and active states, shown only when multiple cards exist.
- Dedicated empty state, single-card state, and a card count + sort control ("Frequently used").

### Story 12.3: Card Detail Screen

**As a** user at checkout, **I want** to see my card's barcode large and clear with brand identity, **So that** the cashier can scan it quickly and I can manage the card easily.

**Acceptance Criteria:**

- Brand-colored hero header with logo (catalogue) or color + letter avatar (custom), brand name prominent.
- Large barcode on white background (white even in dark mode for scanner readability), spaced number, "Tap to enlarge" hint / fullscreen state.
- Card info section as clean secondary rows (barcode number with copy action, color for custom cards, date added).
- "Manage" section using icon + label + chevron rows: Edit as primary action, Delete de-emphasized and positioned last; branded nav header with back arrow.

### Story 12.4: Add Card Flow

**As a** user adding a new loyalty card, **I want** a smooth flow to pick from the catalogue, scan a barcode, or enter details manually, **So that** adding a card is fast, intuitive, and covers all scenarios.

**Acceptance Criteria:**

- Full-screen push card-type selection: searchable catalogue with "Popular cards", "All cards" (alphabetical), real logos, and an "Other card" custom option.
- Catalogue brand → scanner-first flow; barcode format auto-detected and never shown to the user.
- Full-bleed camera scanner with brand context and an "Enter card number manually" alternative; card auto-added on detection.
- Card setup (pre-filled number for catalogue; store name + inline scan CTA + color picker for custom), confirmed by a home-screen toast + highlighted new card (no dedicated success screen).

### Story 12.5: Auth Screens

**As a** user creating an account or signing in, **I want** clear, trustworthy auth screens with obvious CTAs, **So that** I feel confident providing my credentials and can complete the flow without confusion.

**Acceptance Criteria:**

- Sign Up screen: app icon, email field with validation, password field with show/hide toggle + strength indicator, bold "Create Account" CTA, and a sign-in link.
- Sign In screen: "Welcome Back", email/password fields, "Forgot password?", human-readable error banner + red field borders.
- Password reset flow with instruction copy, "Send Reset Link", and a "Check your email" confirmation screen.
- Guest mode upgrade banner (home screen) framed as an invitation, plus consistent inline/form-level validation states; all icons MI/MCI (DEC-12.5-004), light + dark.

### Story 12.6: Settings Screen

**As a** user managing my app preferences, **I want** a well-organized, visually clear settings screen with discoverable options, **So that** I can customize the app and manage my account without hunting for hidden options.

**Acceptance Criteria:**

- Account section (signed-in: email, status, Sign Out, de-emphasized Delete Account; guest: indicator + Create Account / Sign In CTAs).
- Preferences (Theme Light/Dark/System, Language) and Data section (Export/Import JSON, sync status) using icon + label + value/chevron rows.
- About section (app version, catalogue version, visible Help & FAQ, Privacy Policy) at the bottom.
- Grouped, scrollable layout with dedicated frames for every sub-screen, confirmation bottom sheet, and error/empty state (light + dark).

### Story 12.7: Onboarding Flow

**As a** first-time user, **I want** a welcoming, engaging onboarding experience, **So that** I understand the app's value and can add my first card with confidence.

**Acceptance Criteria:**

- Welcome screen with app icon, value proposition, fanned-card illustration, "Get Started" CTA, and an "I already have an account" sign-in link (no device detection — DEC-12.7-004).
- Outcome-based mode selection ("Keep cards on this device" recommended vs "Sync across all devices"), replacing "guest mode" language (DEC-12.7-001/002), with a "What's the difference?" info tooltip.
- Three swipeable feature highlights (including "Your data, your rules") with Skip affordance and bottom-pinned CTAs.
- First-card guidance screen transitioning into the Add Card flow; all screens use 12-1 design system, light + dark.

### Story 12.8: Sync & Status Indicators

**As a** signed-in user with cloud sync enabled, **I want** clear, non-intrusive sync status indicators, **So that** I know my cards are backed up and can trust the sync state.

**Acceptance Criteria:**

- Non-blocking inline "Syncing..." strip above the card grid and a brief auto-dismissing success confirmation.
- Actionable inline error banner with Retry + dismiss using semantic error colors (not a modal).
- Reassuring offline strip ("Offline • N changes will sync when online"), informational rather than alarming.
- Calm conflict-resolution dialog with side-by-side local-vs-cloud comparison and Keep local / Keep cloud / Keep both choices; light + dark.

### Story 12.9: Apple Watch Screens

**As an** Apple Watch user, **I want** my loyalty cards in a clear, glanceable format optimized for the small screen, **So that** I can show my barcode at checkout without pulling out my phone.

**Acceptance Criteria:**

- Scrollable card list with small brand logo + name, brand-color accents (catalogue) / color + letter avatar (custom), sorted by frequency/recency.
- Barcode display maximized to screen width on white background, with brand context header and boosted brightness for scanner readability.
- Watch-adapted brand identity consistent with the phone app, readable at arm's length.
- Complication variants (small: app/most-used card icon; medium: most-used card + name) following watchOS guidelines; designed for 41mm/45mm/49mm using SF Compact.

### Story 12.IC: Update Icon References in Story Docs 12-1 through 12-4

**As a** developer preparing to implement Epic 13, **I want** Epic 12 story docs 12-1 through 12-4 to reference the correct MI/MCI icon system, **So that** implementation specs are accurate and I don't build against stale legacy-icon references.

**Acceptance Criteria:**

- All legacy icon-family references in 12-1, 12-2, 12-3, 12-4 replaced with MI/MCI equivalents per the agreed mapping table.
- Import pattern updated to `import { MaterialIcons } from '@expo/vector-icons'` and `import { MaterialCommunityIcons } from '@expo/vector-icons'`.
- Grep for the legacy cleanup pattern across all `12-*.md` returns zero matches.

### Story 12.FI: Update Figma Design System Page — Icon Section

**As a** developer implementing Epic 13, **I want** the Figma design system page to show MI/MCI icons instead of the legacy icon family, **So that** the design source of truth matches the implementation icon system.

**Acceptance Criteria:**

- Legacy icon section on the Design System page replaced with MI/MCI vector shapes; labels match `@expo/vector-icons` names exactly.
- Icon section includes the complete inventory used across stories 12-1 through 12-9, visually consistent with the 12-5+ pages.
- `MI: star` and `MI: error-outline` clearly visible with AA contrast in both light and dark; no remaining legacy/`FA:` labels anywhere in the file.

---

## Epic 13: UI Implementation

**Goal:** Implement the Figma designs in code across every screen; absorbs Epic 8 (Settings) via Story 13.6.

**Phase:** 2 · **Epic Type:** Feature/Implementation

### Story 13.1: Implement Design System Tokens & Components

**As a** user of myLoyaltyCards, **I want** the app's visual foundation to match the approved Figma designs, **So that** every screen has consistent, polished colors, typography, spacing, and component styles.

**Acceptance Criteria:**

- Replace the sage-green palette with the new light/dark color tokens (primary `#1A73E8` / `#4DA3FF`), add brand-color lookup from `italy.json`, wire into Tailwind, with WCAG AA maintained.
- Implement the 11-level typography scale and spacing/layout tokens matching Figma.
- Build reusable shared UI components in `shared/components/ui/` (Button, CardShell, TextField, ToggleSwitch, ColorPicker, ActionRow) with dark variants and unit tests.
- Establish the MI/MCI icon pattern, update ThemeProvider backward-compatibly, and keep all tests passing at the 80% coverage threshold.

### Story 13.2: Restyle Home Screen (Card List)

**As a** user opening myLoyaltyCards, **I want** my cards in a polished 2-column grid with real brand logos on brand-colored tiles, **So that** I can quickly find and tap the card I need at checkout speed.

**Acceptance Criteria:**

- Fixed 2-column grid of 171×140pt brand-colored tiles (catalogue logo / custom letter avatar) with names, drop shadows, and dark-mode borders on black brands.
- Redesigned header with MI add/settings icons (centered title, 44pt targets) and a real-time search bar shown when 2+ cards exist.
- Dedicated empty state (wallet illustration + shared Button CTA) and enlarged centered single-card state.
- Sort/filter controls (card count + persisted "Frequently used"/"Recently added"/"A-Z"), full dark-mode + accessibility compliance, tests passing.

### Story 13.3: Restyle Card Detail Screen

**As a** user viewing my loyalty card at checkout, **I want** a branded hero, a large clear barcode, and clean management actions, **So that** I can quickly scan my card and easily manage it.

**Acceptance Criteria:**

- Brand hero (catalogue color + logo / custom color + letter avatar) and a large barcode on a white background (white even in dark mode) with spaced number and enlarge hint.
- Secondary info section (barcode number + copy, color for custom only, date added; format row removed) and a "Manage" section with ActionRow Edit + de-emphasized destructive Delete.
- Branded condensing nav header, fullscreen barcode overlay with close + brightness hint, and a brightness hint on the detail screen.
- Legacy `SAGE_COLORS`/emoji cleanup, full dark-mode support, tests passing at threshold.

### Story 13.4: Restyle Add Card Flow

**As a** user adding a new loyalty card, **I want** the add-card flow to feel polished, fast, and consistent with the redesigned app, **So that** picking a brand, scanning a barcode, or entering details manually is intuitive.

**Acceptance Criteria:**

- Full-screen push card-type selection with search, Popular/All cards sections (real logo circles), and an "Other card" option.
- Scanner-first flow for all paths: full-bleed camera with floating back button + brand pill, "Enter manually" ActionRow, barcode format auto-detected and hidden.
- Card setup screens — catalogue (pre-filled number) and custom (store name + inline scan CTA + 8-color picker) — with a "Done" primary button.
- Home toast + fading green highlight confirmation (no success screen), full dark-mode parity, accessibility, and 80% test coverage.

### Story 13.5: Restyle Auth Screens

**As a** user creating an account, signing in, or resetting my password, **I want** the auth screens to feel polished, trustworthy, and visually consistent, **So that** I feel confident providing my credentials and can complete every auth flow without confusion.

**Acceptance Criteria:**

- Restyle Sign Up (app icon, TextField email, PasswordInput + strength indicator, primary CTA), Sign In ("Welcome Back", error banner + red borders, forgot-password link), and password reset + confirmation screens.
- Add a home-screen Guest Mode Banner (shield icon, "Protect your cards", Create Account / Sign In, dismiss persisted) per DEC-12.5-001.
- Inline + form-level validation with human-readable Supabase error mapping; MI/MCI icons only; no auth logic changes.
- Full dark-mode parity (14 frames), accessibility, and co-located tests at 80% coverage.

### Story 13.6: Implement Settings Screen (Absorbs Epic 8)

**As a** user managing my app preferences and account, **I want** a polished settings screen with theme, language, data export, sync, and account management, **So that** I can customize my experience and manage my account from one unified location.

**Acceptance Criteria:**

- Sectioned, scrollable screen (Account, Preferences, Data Management, About) built on ActionRow/Button/BottomSheet, with signed-in and guest account variants.
- Theme picker (Light/Dark/System, persisted, ThemeProvider override) and language picker via bottom sheets.
- Export Data as JSON (confirmation + empty-state sheets, share sheet), Import entry-point scaffold (full flow deferred to 13-7a), and a manual sync trigger with relative timestamp.
- Sign Out and multi-step Delete Account confirmation bottom sheets (inverted destructive CTA order), replacing `Alert.alert`/`Modal`; dark mode, accessibility, and tests.

### Story 13.7: Restyle Onboarding Flow

**As a** first-time user, **I want** a polished, visually engaging onboarding with clear outcome-based storage choices, **So that** I understand the app's value, feel confident about privacy, and can add my first card within seconds.

**Acceptance Criteria:**

- Restyled welcome screen (branded icon, fanned-card illustration, "Get Started", sign-in link — no device detection).
- Mode selection with outcome-based options ("Keep cards on this device" recommended vs "Sync across all devices"), a "What's the difference?" info tooltip, and internal guest-mode mapping (no "guest" label in UI).
- Three swipeable feature highlights with Skip and bottom-pinned CTAs, plus a first-card guidance screen leading into the Add Card flow.
- Full navigation wiring, dark-mode parity, accessibility, and 80% test coverage.

### Story 13.7a: Import Data from JSON

**As a** user who previously exported my card data, **I want** to import cards from a JSON file, **So that** I can restore my data on a new device or recover from data loss without re-entering every card.

**Acceptance Criteria:**

- Import entry point in Settings Data Management triggers the system document picker filtered to JSON.
- Valid file → preview bottom sheet (file name, card count, duplicate note) with Cancel/Import; successful import inserts via transaction, skips duplicates (barcode + brandId), and triggers cloud sync when signed in.
- Invalid/empty file → clear error/empty bottom sheets with no data modified; Zod schema validation with partial-import reporting of skipped entries.
- All new and existing tests pass at the 80% coverage threshold.

### Story 13.7b: Fix Onboarding Welcome Redirect Loop for Account Users

**As a** user who creates an account or signs in, **I want** the app to open straight to my card list every time, **So that** I am not repeatedly thrown back to the welcome/onboarding screen on every launch.

**Acceptance Criteria:**

- On cold start, a user with a persisted Supabase session always lands on the card list (never `/welcome`), across all account/sign-in/restored-session paths; the `first_launch` flag is cleared for signed-in users.
- Genuinely new signed-out users still see welcome; the session check resolves during boot with no wrong-screen flash.
- Remove dead onboarding code (unrouted `FirstCardGuidanceScreen`, `useOnboardingFlow`, stale exports, orphaned i18n keys).
- Regression test `welcome-redirect.test.tsx` added; suite, typecheck, and lint pass.

### Story 13.8: Restyle Sync & Status Indicators

**As a** user who syncs loyalty cards across devices, **I want** polished non-intrusive sync indicators, a clear offline reassurance strip, and a calm conflict dialog, **So that** I always understand my data's sync state without being alarmed or blocked.

**Acceptance Criteria:**

- Restyle the syncing-active strip (animated glyph, tokens) and add an auto-dismissing success strip, both above the card grid.
- Restyle the inline error banner (semantic tokens, Retry + dismiss) and the offline strip (neutral reassurance, shown only when offline with pending changes).
- New conflict-resolution modal with side-by-side local/cloud comparison cards and Keep local / Keep cloud / Keep both / Decide later actions.
- Strip priority orchestration (error > syncing > offline > success), zero hardcoded colors, accessibility, and co-located tests at threshold.

### Story 13.9: Update Apple Watch UI

**As an** Apple Watch user, **I want** the watch app to match the new design language from Story 12-9, **So that** I can find and display my loyalty card barcode quickly and confidently at checkout.

**Acceptance Criteria:**

- Native Swift/SwiftUI restyle of the card list (OLED-black, brand-color accents, SF Compact, usage/recency sort) and barcode display (maximized width, white background, brand header).
- Full hex color parsing with contrast/black-brand handling, restyled empty state, and adaptive layout across 41mm/45mm/49mm.
- WidgetKit complication support (small: app icon; medium: most-used card) with timeline reload and graceful no-cards fallback.
- Performance targets (launch and card→barcode under budget), accessibility labels, and passing unit/UI tests.

### Story 13.10: Fix Dark Mode System Preference

**As a** user who has configured my phone to use dark mode, **I want** the app to honour my system preference automatically, **So that** the app looks native instead of always showing a bright white interface.

**Acceptance Criteria:**

- Add `darkMode: 'media'` to `tailwind.config.js` so NativeWind `dark:` classes activate with system preference, with no light-mode regressions.
- Fix the pre-ThemeProvider loading screen to use a mode-independent brand token instead of `LIGHT_THEME.primary`.
- ThemeProvider is the single source of truth: `'system'` resolves to and reacts to the device scheme at runtime; explicit `'light'`/`'dark'` overrides win and sync into NativeWind.
- ThemeProvider tests updated, including `dark:` class activation coverage; all existing tests pass.

---

## Epic 14: Household Collaboration

Let users share loyalty cards and shopping lists within a household, building on the cloud-sync foundation.

Epic 14 evolves myLoyaltyCards from a single-user loyalty card manager into a lightweight collaborative tool, split into two phases. Phase A ships single-user features that work fully in local mode with no account (card sharing via deeplink, a local shopping list). Phase B adds the cloud household layer (membership, household card visibility, shopping list sync) as an additive experience that never gates the single-user flows. Bill splitting is explicitly descoped and may return as its own epic. Story 14.5a is a UX-design prerequisite that gates 14.5.

### Story 14.1: Household Collaboration — Epic Scoping & Discovery

**As a** product owner, **I want** to define and align on the scoped Epic 14 plan covering card sharing, shopping list, and the household layer, **So that** the team has clear phases, resolved caveats, and ready-to-refine stories before any implementation begins.

**Acceptance Criteria:**

- Team has reviewed and aligned on the Phase A / Phase B split and the story map (14-1 through 14-6).
- PRD updated to reflect the revised Epic 14 scope (Phase A + Phase B; bill splitting explicitly descoped).
- Sprint backlog contains Epic 14 with stories 14-2 through 14-6 estimated and prioritised.
- All Phase A caveats (deeplink payload design, SQLite schema, local-to-cloud migration path) captured and assigned to stories.
- All Phase B caveats (privacy rules, household ownership transfer, invite token, GDPR) captured and assigned to stories.
- Deeplink HTTPS-fallback decision recorded: silent failure accepted; a "Copy card code" plain-text fallback is included in the share sheet.

### Story 14.2: Card Sharing via Deeplink

**As a** user, **I want** to share a loyalty card with someone via a link, **So that** they can add it to their own myLoyaltyCards app without scanning the card manually.

**Acceptance Criteria:**

- Tapping "Share card" on a card detail screen opens the native share sheet with the deeplink URL and a "Copy card code" plain-text option.
- The deeplink URL encodes the card payload as base64 JSON following the versioned schema (`v`, `name`, `barcodeValue`, `barcodeFormat`, `brandId?`, `color?`); image data is never included and the payload stays under ~800 bytes.
- Opening the deeplink while the app is already running navigates to the card import preview screen.
- Opening the deeplink from a cold start (app closed) navigates to the card import preview screen after launch.
- The import preview screen shows the card name, barcode value, and brand logo (resolved from the catalogue by `brandId`) before saving.
- Tapping "Add to my cards" creates the card in local storage and navigates to the card detail or list.
- If the recipient already has a card with the same `barcodeValue`, a conflict UI is shown; a duplicate is only created on explicit confirmation.
- A malformed, truncated, or tampered payload shows a user-facing error ("This link is invalid or expired") and never crashes; unknown `barcodeFormat` values are rejected.
- The feature works in both local mode (no account) and cloud mode, with no auth check on import.
- The "Copy card code" fallback copies the raw base64 payload to the clipboard with a toast confirmation.
- `myloyaltycards://` deeplink routing is validated end-to-end on a real iOS device (cold start and in-app) before refinement; Android `intentFilters` and `assetlinks.json` provisioning are confirmed.

### Story 14.3: Shopping List — Single User

**As a** user, **I want** a simple shopping list I can add items to and tick off, **So that** I can plan my shopping alongside my loyalty cards in one app.

**Acceptance Criteria:**

- A shopping list screen is accessible from the main app navigation.
- The screen shows an input field and "Add" button at the top, with the item list below.
- Adding an item prepends it to the top of the list; duplicate item names are allowed.
- Tapping an item toggles its ticked state, shown via strikethrough or check state; ticked items stay visible until deleted.
- Swiping an item left reveals a delete action; confirming removes it.
- The list persists across app restarts, stored in `expo-sqlite`.
- Empty state: a friendly message is shown when no items exist (no blank screen).
- Item name is limited to 100 characters; input prevents exceeding the limit.
- The schema uses UUID primary keys plus nullable `household_id`, `synced_at`, and timestamp columns so it is forward-compatible with Phase B cloud sync without a destructive migration.
- The feature works in both local mode (no account) and cloud mode.
- When a local-mode user upgrades to a cloud account, shopping list items migrate via the existing guest-migration pattern (`core/auth/guest-migration.ts`).
- The shopping list is out of scope for the watch app in Phase A.

### Story 14.4: Household Membership

**As a** signed-in user, **I want** to create or join a household, **So that** I can share cards and shopping lists with the people I live with.

**Acceptance Criteria:**

- Household entry points (create / join) are hidden in local mode; a "Create an account to use household features" prompt is shown instead.
- A signed-in user can create a named household and becomes its owner.
- The owner can generate an invite link containing a cryptographically random, opaque, single-use token, shareable via the native share sheet.
- Invite tokens expire after 48 hours; an expired token shows an "Invite link expired" error.
- A used token cannot be reused; a second join attempt shows an error.
- Membership is capped at 6 (owner + 5), enforced server-side in the join Edge Function; joining a full household shows a "Household is full" error.
- A member can leave a household; their membership row is deleted without affecting other members.
- The household screen lists current members with their roles (`owner` | `member`; no guest tier).
- When an owner initiates account deletion and the household has other members: prompt 1 (nominate a successor) blocks deletion until a member is selected; prompt 2 (shared card disposition — transfer to nominee or remove from household) must be completed before deletion proceeds. Personal cards are deleted with the account (GDPR), with no per-card prompting.
- If the owner's household has no other members, account deletion dissolves the household silently with no prompts.
- All household operations (create, invite, join, leave) are reflected in the UI without a manual refresh.
- Informed GDPR consent is shown at join time, and a leaving member can delete their contributed data without breaking the household for others.

### Story 14.5a: Household Cards UX Design

**As a** UX designer, **I want** to define the placement, layout, and interaction patterns for household cards in the card list, **So that** the implementation team has a clear, approved design before building story 14-5.

**Acceptance Criteria:**

- Wireframes or Figma screens cover: the card list with household cards present, the empty household-cards state, and the household card detail view a non-owner sees.
- All six open design questions are explicitly answered in the design or its annotations: placement (inline vs separate tab), visual treatment, empty state, owner attribution, actions available to a non-owner, and behaviour when a card is unshared mid-session.
- The visual treatment for household cards is consistent with the existing design system and NativeWind styling conventions.
- The design is reviewed and approved by Ifero before story 14-5 moves to refinement (this story blocks 14-5).
- The approved design is linked from story 14-5 and stored in `docs/ux-designs/` or the Figma file.

### Story 14.5: Household Card Sharing

**As a** household member, **I want** to share a loyalty card with my household, **So that** other members can use it when they shop.

**Acceptance Criteria:**

- A "Visible to household" toggle is shown on the card detail screen for signed-in household members, and hidden in local mode or when the user has no household.
- Card sharing is explicit opt-in per card (private by default); enabling the toggle immediately marks the card household-visible with no extra confirmation, and disabling it immediately removes visibility.
- Only the card owner can toggle their own card; a member cannot change the visibility of another member's card.
- Household members see shared cards in a distinct "Household cards" section or tab, separate from their own cards, using the shared card component.
- Each household-visible card shows the owner's name or avatar as an attribution badge.
- When a member who shared cards leaves the household, their shared cards are removed from the household view for all remaining members.
- Household card changes (share, unshare, member departure) are reflected without a manual refresh (within the Realtime/sync cycle).
- Cards shared to the household are not duplicated on members' devices; they render from a server-side snapshot (`name`, `barcode_value`, `barcode_format`, `brand_id`, `color`) stored alongside the visibility row, updated when the owner edits the card.
- This mechanism coexists with the Phase A deeplink share (14-2) without interfering with it.
- Storage uses a `household_card_visibility` table with RLS scoped to household membership: readable by any member, insertable/deletable only by the card owner.

### Story 14.6: Household Shopping List Sync

**As a** household member, **I want** my shopping list to sync with my household, **So that** anyone in the household can add, tick, or remove items and we all see the same list.

**Acceptance Criteria:**

- When a member adds an item, it appears on all other members' lists within the sync cycle.
- When a member ticks an item, the ticked state is reflected for all other members within the sync cycle.
- When a member deletes an item, it is removed from all members' lists within the sync cycle.
- Offline: a member can add, tick, and delete items while offline; changes are queued locally (`pending_sync` flag) and flushed when connectivity is restored.
- Concurrent offline edits: if two members add items offline and both sync, both items appear for everyone (duplicates acceptable — no data lost).
- Concurrent tick conflicts resolve deterministically via last-write-wins on `updated_at`, with no error shown to the user.
- A member who leaves the household retains their local list state but no longer sends or receives sync updates; a removed member loses sync access without a crash or error loop.
- A subtle pending-sync indicator is shown while items are unsynced and cleared once sync completes.
- Local-mode users are unaffected: their personal shopping list continues to work and household sync simply does not activate.
- The Phase A SQLite schema (UUID keys, nullable `household_id`, timestamps) is extended additively (`pending_sync`) with no destructive migration; sync uses a Supabase Realtime channel per household plus foreground polling against `household_shopping_list_items` with RLS scoped to current members.
- The watch app is out of scope for this story.

---

## Epic 15: Internationalisation & Public Presence

**Goal:** Reach a wider audience — a public landing page and full Italian localisation of the app and watch.

**Phase:** 1 · **Epic Type:** User-Facing · **Dependencies:** Epic 1

### Story 15.1: GitHub Pages Landing Page (EN + IT)

**As a** developer or potential user discovering myLoyaltyCards, **I want** a polished landing page at `ifero.github.io/myLoyaltyCards`, **So that** I can understand the app, see its features, and find the store links.

**Acceptance Criteria:**

- Pure HTML/CSS page served from `docs/` (`index.html` + `style.css`), no frameworks, build tools, or CDN dependencies
- Locked section order: Header, Hero, Features (2×2), How it works, Screenshots, Footer — with official App Store / Google Play badges as the hero CTAs showing bilingual "Coming soon" alerts
- Accessible EN/IT language toggle: `navigator.language` default detection, `localStorage` persistence, English-first raw HTML, and assistive-tech-safe inactive-language hiding
- Responsive light/dark design via CSS variables (44px touch targets, no horizontal scroll), replaceable screenshot placeholders, OG/meta tags, and Ifero-approved Italian copy

### Story 15.2: Italian Language In-App

**As an** Italian user, **I want** the app UI available in Italian, **So that** I can use the product in my native language with consistent localized copy.

**Acceptance Criteria:**

- Italian translations for all visible UI strings across the main flows (home, add card, auth, settings, card details)
- Users can switch to or auto-detect Italian without UI breakage, with a persisted `system | en | it` preference in Settings
- No hard-coded English strings remain in translated screens; Italian copy reviewed against the English source
- Localization built on a consistent i18n implementation (`i18next` / `react-i18next` / `expo-localization`) with translation files (`shared/i18n/locales/en.ts`, `it.ts`) in source control plus regression tests

---

## Epic 16: Platform & Tech Debt

**Goal:** A durable home for cross-cutting platform, foundation, and tech-debt work that doesn't map to a feature epic. A standing bucket that accumulates stories over time.

**Phase:** 2 · **Epic Type:** Enabling / Tech-Debt

### Story 16.1: Migrate Styling Engine — NativeWind → Unistyles [Enabling]

**As a** developer maintaining myLoyaltyCards, **I want** to replace NativeWind (Tailwind) with react-native-unistyles as the styling engine, **So that** styling is faster (no React re-render on theme/breakpoint changes), type-safe, and unified with the existing `shared/theme` token system — with zero visual regression for users.

**Acceptance Criteria:**

- `react-native-unistyles` v3.x (+ Nitro/edge-to-edge native deps) is installed and configured, with light + dark themes registered via `StyleSheet.configure` sourced from the existing `shared/theme/` tokens.
- `shared/theme/` remains the single source of truth — Unistyles themes are derived from it, not duplicated — and system/in-app theme switching (Story 13-10) is preserved.
- All 31 `className`-using files are migrated to Unistyles `StyleSheet.create`; NativeWind + Tailwind deps and config files (`tailwind.config.js`, `global.css`, `nativewind-env.d.ts`) are fully removed.
- Zero visual regression (value-level pixel/colour parity) and green gates: full suite, coverage ≥ 80%, `tsc` + ESLint clean.

### Story 16.2: Implement logger/Sentry wrapper and migrate console.\* call sites

**As a** maintainer, **I want** a single logging wrapper that gates debug output on `__DEV__` and routes errors to Sentry in production, **So that** production error reporting actually fires and logging is consistent across the codebase.

**Acceptance Criteria:**

- `core/utils/logger.ts` keeps its `info`/`warn`/`error` API: `info`/`warn` are `__DEV__`-gated; `error` always logs and, in production, calls `Sentry.captureException`.
- Sentry is installed and initialised per environment with a `beforeSend` PII/card-data scrub (GDPR) so no PII leaves the device.
- All ~30 `console.*` call sites across `features/`, `core/`, `shared/`, `app/` (incl. `consent-logger.ts`) are migrated to the wrapper.
- An ESLint `no-console` rule (wrapper-allowed) enforces the convention; lint/typecheck/test all pass with coverage maintained.

### Story 16.3: Establish a design-in-code contribution workflow (docs + GitHub scaffolding)

**As a** maintainer of an open-source project, **I want** a documented, PR-based path for anyone to propose UX/UI changes against the git repo, **So that** design contributors aren't gated behind Figma seats and every design change is versioned and reviewed like code.

**Acceptance Criteria:**

- A new `docs/design/CONTRIBUTING-DESIGN.md` documents the three design layers (tokens / components / flows), the per-layer PR path, and a story-vs-no-story decision table (token/visual polish → `design`-label fast-path; new screen/component/behavior → spec-first story).
- A `design` issue template and PR-template updates exist (Storybook/Chromatic preview option with a native-watch-UI screenshot carve-out); `CONTRIBUTING.md` gains a Design/UI pointer.
- A `design` PR label is created and `scripts/check-pr-conventions.mjs` is extended so `design`-labelled PRs are story-exempt (no new Conventional-Commit type introduced).
- The two hardcoded Figma node-ID comments are re-anchored to the repo as canonical, and `docs/design/` is established as the home for versionable diagram sources.

### Story 16.4: Make design tokens a portable DTCG source via Style Dictionary

**As a** design contributor, **I want** the design tokens available in a portable, human-diffable JSON format that generates the existing TypeScript, **So that** token changes are easy to review in a PR and the tokens are portable to other tools (Figma Tokens, Penpot) — without breaking the app.

**Acceptance Criteria:**

- `tokens/*.json` (DTCG format) author the primitive + semantic color/spacing/layout maps (MVP; typography tuple + sync-tokens deferred).
- A Style Dictionary config generates a committed `shared/theme/tokens.generated.ts` with the exact existing constant names and `as const` shapes (no build step for Metro/Jest/tsc).
- `colors.ts`/`spacing.ts` import the generated primitives while keeping derived/runtime exports hand-authored; all public `@/shared/theme` exports stay byte-stable.
- `tokens:build`/`tokens:check` scripts exist with a CI drift guard; typecheck + tests pass and the WCAG contrast canary stays green.

### Story 16.5: Component preview gallery — Storybook + Chromatic [Blocked by 16-1]

**As a** reviewer or design contributor, **I want** a public component gallery with visual-regression review on every PR, **So that** UI/design changes are reviewable without building the app locally or holding a Figma seat.

**Acceptance Criteria:**

- A web Storybook (`react-native-web-vite`) renders the 7 `shared/components/ui` primitives in light and dark via a real-`ThemeProvider` decorator (built against Unistyles, after 16-1).
- Stories exist for all 7 primitives; `storybook`/`build-storybook`/`chromatic` scripts are added.
- A separate, path-filtered `chromatic.yml` publishes per-PR previews + visual diffs using `onlyChanged`/TurboSnap, kept off the merge critical path (no-ops until the human Chromatic-token prereq is met).
- An ESLint override for `*.stories.tsx` keeps `yarn lint` green.

### Story 16.6: Stand up an open Penpot design space for visual designers

**As a** maintainer who wants non-coding visual designers to contribute, **I want** an open, no-seat-limit Penpot instance set up as a shared design space, **So that** designers can explore and propose UI/UX visually without a Figma seat — while the git repo (tokens + Storybook components) remains the single canonical source of truth.

**Acceptance Criteria:**

- The cloud-vs-self-host decision is made and recorded (ADR-style note or a section in `docs/design/CONTRIBUTING-DESIGN.md`); default recommendation is Penpot cloud (zero-ops, no seat cost).
- An open, no-seat-limit Penpot workspace exists with access open to contributors (open team / invite link, or open registration if self-hosted).
- The repo-is-canonical relationship is documented in `docs/design/CONTRIBUTING-DESIGN.md`, including a one-line "how to take a Penpot exploration to a repo PR" path, and the Figma deprecation note is updated to point at Penpot as the open exploration surface.
- The current palette/typography/spacing from `shared/theme/*.ts` are represented in Penpot as a lightweight starter reference (manual/one-off — no automated token sync).
- No change to the canonical pipeline: tokens, Storybook, and `docs/ux-designs/` remain the source of truth; nothing in the app build depends on Penpot.
- Demand-triggered: work starts only when a real visual (non-coding) designer actually wants to contribute — not speculatively.

### Story 16.7: Fix Android beta (alpha) Play upload — authoritative versionCode through Expo prebuild

**As a** maintainer/release engineer, **I want** the Android RC build to upload to Google Play with a correct, monotonically-incrementing versionCode (and to be signed with the real upload key), **So that** the beta (alpha-track) upload stops failing with "Version code 1 has already been used" and RC builds reliably reach testers.

**Acceptance Criteria:**

- An Android RC upload succeeds without the "Version code N has already been used" error — the AAB manifest versionCode is strictly greater than the highest code across all Play tracks.
- The versionCode is set in a prebuild-safe way (a new `app.config.ts` extending `app.json`, sourced from `GITHUB_RUN_NUMBER`), never by editing gitignored native files; the production lane uses a distinct offset band (`+1_000_000`) to avoid cross-workflow collision, and the same fix is applied there.
- The release build is signed with the real upload key, not the debug-keystore fallback (a signing-env guard / prebuild-safe `release` signingConfig removes the unguarded fallback).
- `docs/cicd.md` is corrected to reflect the actual alpha track, and the built AAB's versionCode is verified before upload.

### Story 16.8: Fix cloud sync failure on cold app open (auth/network readiness race)

**As a** signed-in user, **I want** cloud sync to reliably run when I open the app — and to recover on its own if the first attempt hits a cold-start hiccup, **So that** my cards sync on every open instead of failing until I manually pull-to-refresh.

**Acceptance Criteria:**

- Root cause: the `useCloudSync` auto-trigger latch (`autoTriggeredRef`) is set only after a successful sync, so a failed first attempt no longer permanently suppresses auto-sync — it re-attempts on the next auth/network event.
- A transient first cold-start failure auto-retries and recovers (reaching the same healthy state a manual pull-to-refresh reaches) with no manual action.
- The auto-trigger fires only once the session is restored and the network is confirmed reachable (not on the optimistic default), and transient failures are retried with backoff before surfacing the error banner.
- Guest-mode (no auto-sync) and manual `forceSync` behaviour are preserved; tests cover latch-on-success, auto-recovery, and auth+network gating, with gates green.

### Story 16.9: Relocate screens from the app/ routing layer into features/

**As a** maintainer of myLoyaltyCards, **I want** every screen implementation (and its tests) moved out of the `app/` routing layer into the correct `features/` module, with the documented-but-missing route-file lint rule implemented, **So that** `app/` stays a thin, enforceably re-export-only routing boundary and this debt cannot silently recur.

**Acceptance Criteria:**

- The four fat screens (`HomeScreen`, `CardDetailScreen`, `CardEditScreen`, `BarcodeScreen`) are moved verbatim into a new `features/cards/screens/`, and their route files become thin re-exports.
- A documented `cards → auth` boundary exception and the route-file `no-restricted-imports` rule (banning `useState`/`useEffect`/`useCallback`/`useMemo` in `app/**/*.tsx` except `_layout.tsx`) are added to `eslint.config.mjs`, with `yarn lint` green as the migration's done-signal.
- `app/scan.tsx` is refactored to a hook-free declarative `<Redirect>`; `app/__tests__/` is removed with its tests relocated/co-located (no `__tests__` folder introduced).
- Green gates, zero behavioral/visual regression; coverage restored to ≥ 80% via co-located screen tests.

### Story 16.10: Fix offline cold-start hang (app stuck on the loading spinner with no connectivity)

**As a** user opening the app with no internet connection, **I want** the app to boot into my cached cards instead of hanging on the loading spinner, **So that** the "offline-first" promise actually holds — my loyalty cards are usable in a shop with no signal.

**Acceptance Criteria:**

- Offline cold-start reaches the main UI with cached cards within a bounded time and never hangs — no blocking network call gates `isReady` (auth state is derived storage-only, no network round-trip).
- Signed-in users (online or offline, incl. an expired-but-persisted token) are not flashed/bounced to the welcome screen — auth state is known before first paint.
- When connectivity returns, the session recovers via background auto-refresh / `onAuthStateChange` (no restart); the Expo update check is bounded so it can't stall boot.
- A defensive safety timeout guarantees `isReady` flips to a safe default even if the auth listener never fires; tests cover offline boot, no-flash, recovery, and the timeout, with gates green.

### Story 16.11: Fix card-deletion cloud resurrection (deletion-aware cloud sync)

**As a** signed-in user who deletes a loyalty card, **I want** the deletion to persist through cloud sync, **So that** deleted cards never reappear on the next cold open or pull-to-refresh.

**Acceptance Criteria:**

- Root cause: the download path is made deletion-aware by reviving the previously-dead `mergeWithDeletions`, so a pending-deletion card is not re-added locally on cold-open auto-sync or pull-to-refresh.
- Drained cloud deletions are removed from the cloud via `deleteCardFromCloud`; on success their ids are cleared from the queue (targeted, per-id), and on failure they are retained for retry while the local merge still excludes them.
- Back-compatible by construction (`mergeWithDeletions(local, cloud, [])` ≡ `mergeCards`); guest mode and 16-8's singleton store (latch, dedup, force semantics, cooldown) are preserved.
- Both sync engines are unified on the deletion-aware merge (closing the Engine B blind-clear race); a real-SQLite regression test proves no resurrection, with gates green and coverage ≥ 80%.

### Story 16.12: Bound the OTA update download at boot so a stalled fetch can't hang the app

**As a** user launching the app on a poor/flaky connection while an OTA update is available, **I want** the app to boot within a bounded time even if the update download stalls, **So that** a degraded network can never leave me stuck on the loading spinner.

**Acceptance Criteria:**

- `Updates.fetchUpdateAsync()` is bounded by a separate generous budget (`UPDATE_FETCH_TIMEOUT_MS`, 30s) via `withTimeout`; on timeout the app boots the current bundle, `reloadAsync` is not called, and any staged download applies on a later cold start.
- The healthy happy path is unchanged (a slow-but-completing download within budget still fetches then reloads); a fetch timeout/error is logged via `logger.warn` and boot continues (no crash, no `dbError`).
- `reloadAsync` is deliberately not wrapped in `withTimeout` (network-free, terminal), with the rationale documented; 16.10's offline path is unchanged.
- Reuses `core/utils/with-timeout.ts` — single-file change plus tests; gates green.

### Story 16.13: Widen the Jest coverage gate to `shared/**`

**As a** developer relying on the coverage gate to catch untested code, **I want** `shared/**` included in Jest's coverage collection, **So that** safety-critical logic in `shared/` (Supabase auth/session, sync hooks) is held to the same 80% threshold as `core/` and `features/`.

**Acceptance Criteria:**

- `collectCoverageFrom` in `jest.config.js` includes `'shared/**/*.{ts,tsx}'`, retaining the `d.ts`/`index.ts` excludes.
- `yarn test:coverage` passes the global 80% threshold on all four metrics with `shared/` collected, without lowering any threshold.
- `shared/toast.ts` (the only untested logic file) gets a co-located test to ≥ 80%; each new `shared/`-scoped exclude (`!shared/types/**`, `!shared/theme/spacing.ts`) is enumerated with a one-line justification.
- The CI Quality-gates job stays green with no flaky suites.

### Story 16.14: Surface boot-time OTA update failures in production telemetry

**As a** maintainer who ships fixes via OTA updates, **I want** boot-time OTA update failures (manifest check and bundle download) to be visible in production telemetry, **So that** I can measure how often real users hit flaky-network update stalls and confirm the 16.12 download budget is well-calibrated — instead of the failures being silently swallowed.

**Acceptance Criteria:**

- A production build emits a non-fatal Sentry warning-level event on a boot-time OTA manifest-check failure (timeout or error), where today `logger.warn` is a prod no-op.
- The same non-fatal warning-level event is emitted on a boot-time OTA download/reload failure.
- The signal is strictly non-fatal: it MUST NOT set `dbError`, render the boot-error screen, or `captureException`/crash — boot proceeds on the current bundle exactly as in 16.10 / 16.12.
- No PII / card data leaves the device: the event carries only the stable message + error and passes through `beforeSend`/`scrubEvent` (GDPR); assert nothing sensitive is attached.
- Dev behaviour is preserved (`__DEV__` still logs to console only, no Sentry transmit), and the mechanism (a new non-fatal `logger.notify` → `Sentry.captureMessage('warning')`) is applied centrally — one logger method reused by both call sites, not duplicated.
- Unit tests cover the new logger method (prod → `captureMessage('warning')` with scrubbable context; dev → console only, no capture); `logger.error`/`warn`/`info` behaviour is unchanged; the `_layout` boot tests stay green with coverage maintained (`core/utils/logger.ts` is measured).

### Story 16.15: Fix `formatRelativeTime` crash on Hermes (`Intl.RelativeTimeFormat` unsupported)

**As a** user opening the Settings sync indicator, **I want** the "last synced" relative-time label to render without crashing, **So that** the app does not throw an unhandled `TypeError` (and, on the interval path, a fatal error) on production Hermes builds.

**Acceptance Criteria:**

- `core/utils/relative-time.ts` no longer references `Intl.RelativeTimeFormat` (nor any `Intl.*` API) — the root cause of the Hermes crash (Hermes ships no `RelativeTimeFormat`).
- Italian output is unchanged vs the previous `Intl.RelativeTimeFormat(..., { numeric: 'always' })` behaviour (verified byte-for-byte against Node ICU), and English output is unchanged.
- The Italian locale path gains explicit test coverage including the singular↔plural boundaries (1 vs N) for minutes/hours/days — the gap that let this ship.
- Typecheck, lint on the changed files, and the `relative-time` suite all pass; no new dependency added.

### Story 16.16: Adopt a Hermes-safe `Intl` polyfill (FormatJS) and enforce it via lint

**As a** developer adding internationalised formatting (relative time, numbers, dates, plurals), **I want** `Intl` to be reliably available on every runtime the app ships to — including iOS Hermes — **So that** using a standard `Intl.*` API can never again ship a green build that crashes fatally in production (the 16.15 class), and future i18n work has a safe, standard formatting foundation instead of hand-rolled per-locale strings.

**Acceptance Criteria:**

- The FormatJS polyfill chain (`intl-getcanonicallocales`, `intl-locale`, `intl-pluralrules`, `intl-relativetimeformat`) is installed and imported in dependency order via a single dedicated module (`shared/i18n/intl-polyfill.ts`) loaded before any `Intl` consumer runs.
- Every import uses the `/polyfill-force` variant (not the auto-detecting entry, which may no-op over Hermes' broken partial `Intl`), and only `en` + `it` locale data are registered for `intl-pluralrules` and `intl-relativetimeformat` (no world dataset).
- On a real iOS Hermes build, `new Intl.RelativeTimeFormat('it', { numeric: 'always' }).format(-5, 'minute')` returns the correct Italian string (verified on device/sim, not only Jest), and the measured bundle-size delta is recorded.
- A lint rule (`no-restricted-properties`) fails on any not-yet-polyfilled `Intl.*` API (e.g. `Intl.ListFormat`, `Intl.DisplayNames`, `Intl.Segmenter`) with a message pointing to this story, proven to fail on an offending line and pass once removed.
- A startup/guard test asserts `Intl.RelativeTimeFormat`/`Intl.PluralRules` are defined at runtime, so removing the polyfill entry import fails CI.
- Existing behaviour is preserved: current `relative-time` EN/IT tests stay green and no user-facing copy changes unless a UX-copy sign-off explicitly approves migrating `relative-time.ts` (default: leave 16.15's tested implementation as-is); a grep audit confirms no unguarded `Intl` consumer remains, with all gates green.

---

## Epic 17: Apple Wallet Pass Support

Evaluate (feasibility-first) letting users add loyalty cards to Apple Wallet. Parked until a spike de-risks it.

This epic is parked. Before any build story is written, a feasibility spike must resolve the signing, native-integration, and App Store review unknowns below. No implementation work should begin until the spike reports back and the epic is un-parked.

### Story 17.1: Spike — Apple Wallet Feasibility

**As a** product engineer, **I want** to investigate what adding loyalty cards to Apple Wallet actually requires, **So that** we can decide whether to build it before committing any implementation effort.

**Acceptance Criteria:**

- The spike documents that pass signing requires an Apple Pass Type ID and certificate, and that signing must happen server-side (e.g. an EAS API route) rather than in-app.
- The spike confirms Expo has no first-party Wallet support: adding a pass needs a config plugin plus a native module wrapping `PKAddPassesViewController`, and estimates that effort.
- The spike records that the app can only generate GENERIC passes (not trademarked brand passes) and assesses the resulting App Store review risk.
- The spike verifies that PassKit barcode formats (QR, PDF417, Aztec, Code128) cover the loyalty-card formats the app uses.
- The spike identifies the entitlements the feature likely touches and any provisioning implications.
- The spike concludes with a go / no-go recommendation and, if go, a proposed breakdown of build stories; the epic stays parked until that recommendation is reviewed.
