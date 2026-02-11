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
totalEpics: 10
totalStories: 65
phase1Epics: 8
phase1Stories: 55
phase2Epics: 2
phase2Stories: 10
frsConvered: 72
---

# myLoyaltyCards - Epic Breakdown

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
- ARCH-6: watchOS Storage using SwiftData (iOS 17+)
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
- ARCH-20: Watch is READ-ONLY for MVP (editing only happens on phone)

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

---

## Epic List

### Phase 1 — Core MVP 🚀

| Epic | Title                             | FRs                       | User Value                               |
| ---- | --------------------------------- | ------------------------- | ---------------------------------------- |
| 1    | Project Foundation & App Shell    | Foundation for FR48, FR51 | Launch a fast, responsive app            |
| 2    | Card Management & Barcode Display | FR1-13, FR48-51, FR59-65  | Add cards, display barcodes at checkout  |
| 3    | Italian Brand Catalogue           | FR14-20                   | Quick add from Italian brands            |
| 4    | Onboarding Experience             | FR72-74                   | Guided first-run in <60 seconds          |
| 5    | Apple Watch App ⌚                | FR12, FR34, FR43-47, FR52 | Cards on wrist — 'Fumble-Free Flash'     |
| 6    | User Authentication & Privacy     | FR25-33, FR53, FR55-58    | Optional cloud account with GDPR control |
| 7    | Cloud Synchronization             | FR35-42                   | Cards sync across all devices            |
| 8    | Settings & Preferences            | FR54, FR57, FR66-69, FR73 | Customize app, export data               |

### Phase 2 — Enhancements 📈

| Epic | Title              | FRs                 | User Value                    |
| ---- | ------------------ | ------------------- | ----------------------------- |
| 9    | Smart Card Sorting | FR21-24             | Most-used cards always on top |
| 10   | Wear OS App        | FR12, FR43-47, FR52 | Cards on Android watch        |

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

- Watch is READ-ONLY for MVP (card editing only on phone)
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

---

## Epic 6: User Authentication & Privacy

**Goal:** Users can optionally create an account to enable cloud backup, with full control over their data.

**Phase:** 1 (MVP)

**Epic Type:** User-Facing (with enabling tasks)

**Dependencies:** Epic 1 (foundation)

**FRs Covered:** FR25-FR33, FR53, FR55-FR58

**Scope:**

- Guest mode with full feature access (no account required)
- Supabase Auth: Email/password registration and login
- Sign in with Apple (required for iOS)
- Sign in with Google
- Password reset flow
- Upgrade from guest to authenticated preserving all data
- Logout functionality
- Account deletion (removes all cloud data within 30 days)
- Privacy policy accessible before and during account creation
- Consent flow before data collection
- View collected data summary

**Technical Notes:**

- expo-secure-store for token storage (Keychain/Keystore)
- Supabase Row-Level Security policies for data protection
- GDPR compliant: right to access, portability, erasure

**Enabling Note:** Story 6.1 is an enabling task required before user-facing auth flows.

---

### Story 6.1: Create Supabase Project & Environments [Enabling]

**As a** developer,
**I want** a Supabase project with Dev and Production environments,
**So that** the app can be configured for secure cloud storage.

**Acceptance Criteria:**

**Given** the project needs cloud storage
**When** I create Supabase environments
**Then** a Supabase project exists with Dev and Production environments
**And** environment URLs/keys are available for configuration

---

### Story 6.2: Define Cloud Schema & RLS [Enabling]

**As a** developer,
**I want** the cloud schema and security policies defined,
**So that** user data is stored safely and access is restricted.

**Acceptance Criteria:**

**Given** the Supabase project is available
**When** I define the database schema
**Then** the `loyalty_cards` table is created with proper schema (matching Zod)
**And** the `users` table stores user profiles
**And** Row-Level Security (RLS) policies ensure users only access their own data

---

### Story 6.3: Configure App Client [Enabling]

**As a** developer,
**I want** the app configured to connect to Supabase,
**So that** authenticated flows can call the backend.

**Acceptance Criteria:**

**Given** Supabase keys and URLs are available
**When** I configure the app
**Then** environment variables are configured in `app.config.ts`
**And** the Supabase client is initialized in the app

---

### Story 6.4: Implement Guest Mode

**As a** user,
**I want** to use the app without creating an account,
**So that** I can experience its value before committing.

**Acceptance Criteria:**

**Given** I launch the app for the first time
**When** I complete onboarding
**Then** I can use all card management features without signing up
**And** my cards are stored locally only
**And** my cards sync to my Apple Watch via Bluetooth (no cloud)
**And** I see no prompts or pressure to create an account during normal use

**Given** I am in guest mode
**When** I access Settings
**Then** I see an option to "Create Account" or "Sign In"
**And** the option is presented as a benefit (backup, multi-device) not a requirement

---

### Story 6.5: Create Account with Email

**As a** user,
**I want** to create an account with my email,
**So that** I can back up my cards to the cloud.

**Acceptance Criteria:**

**Given** I am in guest mode and tap "Create Account"
**When** I choose email registration
**Then** I see a form with: email, password, confirm password
**And** password requirements are displayed (min 8 chars)
**And** inline validation shows errors for invalid input

**Given** I submit valid registration details
**When** registration succeeds
**Then** my account is created in the cloud backend
**And** I am automatically signed in
**And** my auth token is stored securely (expo-secure-store)
**And** I see a success confirmation

---

### Story 6.6: Sign In with Email

**As a** returning user,
**I want** to sign in with my email and password,
**So that** I can access my backed-up cards.

**Acceptance Criteria:**

**Given** I tap "Sign In" in Settings
**When** I enter my email and password
**Then** I am authenticated successfully
**And** my auth token is stored securely
**And** I am returned to the app with my account active

**Given** I enter incorrect credentials
**When** I tap Sign In
**Then** I see a clear error message: "Invalid email or password"
**And** I can retry

---

### Story 6.7: Sign In with Apple

**As a** user,
**I want** to sign in with my Apple ID,
**So that** I can create an account with one tap.

**Acceptance Criteria:**

**Given** I tap "Sign In with Apple"
**When** Apple's authentication sheet appears
**Then** I can authenticate using Face ID, Touch ID, or password
**And** the app receives my Apple ID credentials

**Given** Apple authentication succeeds
**When** the callback completes
**Then** my account is created or linked in the cloud backend
**And** I am signed in automatically
**And** I can use my Apple email or a private relay email

---

### Story 6.8: Sign In with Google

**As a** user,
**I want** to sign in with my Google account,
**So that** I can create an account quickly.

**Acceptance Criteria:**

**Given** I tap "Sign In with Google"
**When** Google's authentication flow starts
**Then** I see the Google account picker or sign-in
**And** I can choose or enter my Google account

**Given** Google authentication succeeds
**When** the callback completes
**Then** my account is created or linked in the cloud backend
**And** I am signed in automatically

---

### Story 6.9: Upgrade Guest to Account

**As a** guest user,
**I want** to create an account without losing my cards,
**So that** my existing data is preserved.

**Acceptance Criteria:**

**Given** I am in guest mode with cards saved locally
**When** I create an account (any method: email, Apple, Google)
**Then** all my local cards are uploaded to my new cloud account
**And** my cards remain visible throughout the process
**And** I see a confirmation that my data was backed up
**And** my guest mode is upgraded to authenticated mode seamlessly

---

### Story 6.10: Password Reset

**As a** user,
**I want** to reset my password if I forget it,
**So that** I can regain access to my account.

**Acceptance Criteria:**

**Given** I tap "Forgot Password" on the sign-in screen
**When** I enter my email address
**Then** the system sends a password reset email
**And** I see a message: "Check your email for reset instructions"

**Given** I receive the reset email
**When** I tap the reset link
**Then** I can set a new password
**And** I am signed in with the new password

---

### Story 6.11: Logout

**As a** user,
**I want** to sign out of my account,
**So that** I can switch accounts or use guest mode.

**Acceptance Criteria:**

**Given** I am signed in
**When** I tap "Sign Out" in Settings
**Then** I see a confirmation: "Sign out? Your cards will remain on this device."
**And** the Sign Out button is clearly visible

**Given** I confirm sign out
**When** the logout completes
**Then** my auth token is removed from secure storage
**And** I am returned to guest mode
**And** my locally stored cards remain accessible

---

### Story 6.12: Delete Account

**As a** user,
**I want** to delete my account and all cloud data,
**So that** I can exercise my GDPR right to erasure.

**Acceptance Criteria:**

**Given** I am signed in
**When** I tap "Delete Account" in Settings
**Then** I see a warning: "This will permanently delete your account and all cloud data. Cards on this device will remain."
**And** I must confirm by typing "DELETE" or similar

**Given** I confirm deletion
**When** the deletion completes
**Then** my cloud account is deleted
**And** all my cards are deleted from the cloud backend
**And** my auth token is removed
**And** I am returned to guest mode
**And** my local cards remain on the device

---

### Story 6.13: Privacy & Consent

**As a** user,
**I want** to understand how my data is used,
**So that** I can make informed choices about my privacy.

**Acceptance Criteria:**

**Given** I am creating an account
**When** the registration form is displayed
**Then** I see a link to the Privacy Policy before submitting
**And** I must accept the terms to proceed (checkbox or button text)

**Given** I am signed in
**When** I access Settings
**Then** I can view the Privacy Policy
**And** I can see what data is collected (summary view):

- Email address
- Card names and barcodes
- Timestamps
  **And** I can access the data export feature (Epic 8)

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
- Watch is READ-ONLY (consistent with watchOS behavior)

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

## Future Enhancements (Post-MVP Backlog)

_This section captures ideas for future development beyond Phase 2._

### Potential Future Epics:

| Epic                      | Description                                             | Source          |
| ------------------------- | ------------------------------------------------------- | --------------- |
| EU Market Expansion       | Expand catalogue to Spain, France, Germany, etc.        | PRD Vision      |
| Contextual Card Detection | Location-based auto-card selection                      | PRD Vision      |
| Data Validation           | Barcode format validation per brand (FR70-FR71)         | PRD Post-MVP    |
| Accessibility             | Screen reader, voice control, high contrast (NFR-A1-A3) | PRD Post-MVP    |
| Admin Panel               | Web-based catalogue management                          | PRD Growth      |
| Watch Complication        | Quick launch complication (Apple Watch)                 | UX / PRD Future |
| Biometric/PIN Lock        | Optional app lock in settings                           | UX Future       |
| Orientation Lock Toggle   | Lock portrait orientation in settings                   | UX Future       |
| Auto-Save on Scan         | Skip confirmation after barcode scan                    | UX Future       |

### How to Add Future Features:

1. **Update this document** — Add new epics at the end, following the same structure
2. **Assign phase numbers** — Phase 3, 4, etc. to group related work
3. **Map to requirements** — Reference PRD FRs or create new ones
4. **Break into stories** — Same format with acceptance criteria
5. **Update coverage map** — Ensure all FRs are tracked
