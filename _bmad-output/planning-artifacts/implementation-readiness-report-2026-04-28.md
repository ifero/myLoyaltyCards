---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
	- 'docs/prd.md'
	- 'docs/architecture.md'
	- 'docs/epics.md'
	- 'docs/ux-design-specification.md'
	- 'docs/sprint-artifacts/sprint-status.yaml'
	- 'docs/sprint-artifacts/stories/6-17-design-otp-verification-screen.md'
	- 'docs/sprint-artifacts/stories/6-18-otp-email-verification-flow.md'
	- 'docs/sprint-artifacts/stories/15-1-github-pages-landing-page.md'
workflowType: 'implementation-readiness'
lastStep: 6
workflowComplete: true
project_name: 'myLoyaltyCards'
user_name: 'Ifero'
date: '2026-04-28'
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-28
**Project:** myLoyaltyCards
**Assessor:** John (BMAD Product Manager)

## Document Discovery

Canonical planning documents used for this assessment:

- PRD: `docs/prd.md`
- Architecture: `docs/architecture.md`
- Epics: `docs/epics.md`
- UX: `docs/ux-design-specification.md`
- Sprint tracker: `docs/sprint-artifacts/sprint-status.yaml`

No duplicate whole-vs-sharded planning documents were found for the selected source set.

## PRD Analysis

### Functional Requirements

FR1: Users can add a loyalty card by selecting a brand from the Italian catalogue.
FR2: Users can add a custom loyalty card by manually entering card details.
FR3: Users can scan a barcode using the device camera to capture loyalty card information.
FR4: Users can manually enter a barcode number as an alternative to scanning.
FR5: Users can view a list of all their stored loyalty cards.
FR6: Users can edit existing loyalty card information (name, barcode).
FR7: Users can delete loyalty cards they no longer need.
FR8: Users can mark loyalty cards as favorites to pin them at the top of the list.
FR9: Users can view detailed information about a specific loyalty card.
FR10: Users can display a loyalty card's barcode in a scannable format.
FR11: The system can render barcodes in multiple formats (Code 128, EAN-13, EAN-8, QR Code).
FR12: Users can display barcodes on wearable devices (Apple Watch, Android Wear).
FR13: The system can optimize barcode brightness and contrast for scanner readability.
FR14: Users can browse the Italian loyalty card catalogue on a dedicated screen.
FR15: The system can display catalogue brands with their names, logos, and aliases.
FR16: The system can fetch the latest catalogue from cloud storage.
FR17: The system can cache the catalogue locally for offline browsing.
FR18: The system can check for catalogue updates using ISO date-based versioning.
FR19: The system can automatically refresh the catalogue when users add a card.
FR20: The system can detect if local catalogue is outdated based on last sync timestamp.
FR21: The system can automatically sort cards based on usage frequency.
FR22: The system can display most recently used cards at the top of the list.
FR23: Users can pin favorite cards to remain at the top regardless of usage.
FR24: The system can apply alphabetical sorting as a fallback for unused cards.
FR25: Users can use the app in guest mode without creating an account with full feature access.
FR26: Users can create an account using email and password.
FR27: Users can sign in using Sign in with Apple.
FR28: Users can sign in using Sign in with Google.
FR29: Users can log in to an existing account.
FR30: Users can log out of their account.
FR31: Users can reset their password if forgotten.
FR32: Users can delete their account and all associated cloud data.
FR33: Users can upgrade from guest mode to authenticated mode without losing data.
FR34: The system can sync cards between phone and watch via Bluetooth in guest mode.
FR35: The system can sync cards to cloud backend when user is authenticated.
FR36: The system can sync cards across multiple devices for authenticated users.
FR37: The system can perform background synchronization automatically.
FR38: The system can detect network connectivity status for sync operations.
FR39: The system can queue sync operations when offline and retry when connection available.
FR40: The system can resolve sync conflicts using last-write-wins strategy.
FR41: The system can perform delta sync (only changed cards) for efficiency.
FR42: The system can sync bidirectionally (phone ↔ watch, phone ↔ cloud).
FR43: Users can open the wearable app and access cards without phone connection.
FR44: The system can store loyalty cards locally on the wearable device.
FR45: Users can navigate through their card list on the wearable interface.
FR46: Users can tap a card on the wearable to display its barcode.
FR47: The system can automatically sync new/edited/deleted cards between phone and watch.
FR48: Users can access all core features without network connectivity.
FR49: Users can add, edit, and delete cards while offline.
FR50: Users can display barcodes while offline.
FR51: The system can store user cards and cached catalogue locally for offline access.
FR52: The system can function on wearables without phone or network connection.
FR53: Users can view what personal data is collected and stored.
FR54: Users can export all their loyalty card data in JSON format.
FR55: Users can request deletion of all their data from cloud storage.
FR56: The system can encrypt user data at rest in the cloud database.
FR57: Users can access the privacy policy from within the app.
FR58: Users can provide consent before account creation and data collection.
FR59: The system can display loading indicators during data operations.
FR60: The system can show sync status indicators to users.
FR61: The system can display confirmation messages for successful operations.
FR62: The system can display error messages with clear explanations when operations fail.
FR63: The system can show overlay messages when sync fails.
FR64: The system can provide appropriate error messages when camera permission is denied.
FR65: The system can provide recovery options for failed operations.
FR66: Users can select their preferred language for the app interface.
FR67: Users can toggle between light mode and dark mode.
FR68: Users can access app settings from a dedicated settings screen.
FR69: Users can view app version and build information.
FR70: The system can validate barcode format based on brand requirements.
FR71: The system can provide validation feedback when manually entering barcodes.
FR72: New users can view a welcome screen explaining the app concept.
FR73: Users can access help documentation or FAQs.
FR74: The system can provide onboarding guidance for first-time card addition.

Total FRs: 74

### Non-Functional Requirements

NFR-P1: Card display on wearable devices must complete in ≤3 seconds from wrist raise to barcode visible.
NFR-P2: Mobile app cold start must complete in ≤1 second.
NFR-P3: Wearable app cold start must complete in ≤2 seconds.
NFR-P4: Barcode rendering must complete in ≤100ms.
NFR-P5: Phone-to-watch sync operations must complete within 30 seconds when devices are connected.
NFR-P6: UI interactions (scrolling, navigation) must maintain 60fps for smooth user experience.
NFR-P7: Wearable app must minimize battery impact during standby mode.
NFR-P8: Background sync operations must not noticeably impact device battery life.
NFR-P9: Catalogue caching must optimize storage usage without degrading performance.
NFR-S1: All user data must be encrypted at rest in cloud database using industry-standard encryption (AES-256).
NFR-S2: All API communication must use HTTPS/TLS 1.2 or higher.
NFR-S3: User passwords must be hashed using secure hashing algorithms (bcrypt or equivalent).
NFR-S4: Authentication tokens must expire after reasonable timeframes and support secure refresh mechanisms.
NFR-S5: System must comply with GDPR requirements for EU users.
NFR-S6: No user tracking, analytics, or advertising is permitted.
NFR-S7: User data export must be available in machine-readable JSON format.
NFR-S8: User account deletion must remove all associated data from cloud storage within 30 days.
NFR-S9: Privacy policy must be accessible before and after account creation.
NFR-S10: Guest mode users must have full feature access with data stored locally only.
NFR-S11: Authenticated users' cloud data must be accessible only by the account owner.
NFR-S12: Social login (Sign in with Apple, Google) must follow platform security best practices.
NFR-R1: 100% of core features must function without network connectivity.
NFR-R2: Offline data operations must succeed with zero data loss.
NFR-R3: Wearable app must function independently without phone or network connection.
NFR-R4: Sync conflict resolution must preserve user data integrity using last-write-wins strategy.
NFR-R5: All error conditions must provide clear, actionable error messages to users.
NFR-R6: Failed sync operations must retry automatically when connectivity is restored.
NFR-R7: System must gracefully handle edge cases (low storage, permission denials, network interruptions).
NFR-R8: No data loss during app updates or device sync operations.
NFR-R9: Local data must persist across app restarts and device reboots.
NFR-R10: Sync operations must maintain data consistency across devices.
NFR-U1: User experience must be consistent across iOS and Android mobile platforms.
NFR-U2: Wearable apps must provide adapted but consistent UX accounting for screen size constraints.
NFR-U3: All platforms must achieve feature parity within MVP scope.
NFR-U4: Error messages must be clear and avoid technical jargon.
NFR-U5: Loading indicators must be present for all operations exceeding 500ms.
NFR-U6: User interface must support both light mode and dark mode.
NFR-U7: App interface must support user-selectable languages.
NFR-U8: Text labels and messages must be externalized for localization.
NFR-M1: Codebase must follow React Native and Expo best practices.
NFR-M2: Code must be well-documented with clear comments for complex logic.
NFR-M3: Project structure must be organized for easy navigation by contributors.
NFR-M4: Repository must include comprehensive README with setup instructions.
NFR-M5: Contribution guidelines must be clearly documented.
NFR-M6: Code must be released under MIT License with proper attribution requirements.
NFR-M7: Critical user flows must have automated tests.
NFR-M8: Performance targets must be validated through testing on actual devices.
NFR-A1: Future versions should support screen reader compatibility.
NFR-A2: Future versions should support voice control on supported platforms.
NFR-A3: Future versions should provide high contrast modes for visual accessibility.

Total NFRs: 50

### Additional Requirements

- Italy launch is the MVP validation market, with the catalogue limited to the top 20 Italian brands.
- Guest mode is first-class, with local-only storage and direct phone-to-watch sync even without an account.
- Authenticated mode adds cloud backup and multi-device sync through optional email/password, Apple, and Google sign-in.
- Cloud data handling must satisfy GDPR rights to access, portability, and erasure.
- Photo library access and custom logo uploads were removed from MVP later in the PRD, despite earlier product-scope text that still mentions optional logo upload.
- watchOS distribution is constrained to an iOS-embedded companion app rather than a separately distributed binary.
- NativeWind remains under evaluation, so future UI implementation should treat styling approach as an active technical decision rather than a closed one.
- App store submission requires privacy disclosures, policy URLs, and cross-device screenshots.
- The open-source operating model is part of scope: MIT licensing, contributor-friendly docs, and community-maintained catalogue updates are expected.

### PRD Completeness Assessment

- The PRD is strong for traceability because it includes an explicit FR inventory, explicit NFR inventory, MVP boundaries, and post-MVP exclusions.
- The main internal ambiguity is custom logo handling: the product-scope section still mentions user logo upload, while the later mobile and scoped MVP sections explicitly remove photo-library access and custom uploads from MVP.
- Minimum OS versions remain intentionally unresolved, so implementation stories should avoid claiming platform-floor certainty until the Expo and wearable constraints are locked.
- Story readiness checks can rely on the PRD baseline, but story writers should use the later phased-scope sections as the tie-breaker when earlier narrative sections conflict.

## Epic Coverage Validation

### Coverage Matrix

| FR Number | PRD Requirement                                      | Epic Coverage                        | Status                      |
| --------- | ---------------------------------------------------- | ------------------------------------ | --------------------------- |
| FR1       | Add card from Italian catalogue                      | Epic 2                               | Covered                     |
| FR2       | Add custom loyalty card manually                     | Epic 2                               | Covered                     |
| FR3       | Scan barcode with camera                             | Epic 2                               | Covered                     |
| FR4       | Enter barcode manually                               | Epic 2                               | Covered                     |
| FR5       | View stored card list                                | Epic 2                               | Covered                     |
| FR6       | Edit card information                                | Epic 2                               | Covered                     |
| FR7       | Delete cards                                         | Epic 2                               | Covered                     |
| FR8       | Mark cards as favorites                              | Epic 9                               | Covered (Phase 2)           |
| FR9       | View card details                                    | Epic 2                               | Covered                     |
| FR10      | Display barcode in scannable format                  | Epic 2                               | Covered                     |
| FR11      | Render multiple barcode formats                      | Epic 2                               | Covered                     |
| FR12      | Display barcodes on wearable devices                 | Epic 5, Epic 10                      | Covered                     |
| FR13      | Optimize barcode readability                         | Epic 2                               | Covered                     |
| FR14      | Browse Italian catalogue screen                      | Epic 3                               | Covered                     |
| FR15      | Show brands with names, logos, aliases               | Epic 3                               | Covered                     |
| FR16      | Fetch latest catalogue from cloud storage            | Epic 3                               | Covered                     |
| FR17      | Cache catalogue locally for offline browsing         | Epic 3                               | Covered                     |
| FR18      | Check catalogue updates using ISO date versioning    | Epic 3                               | Covered                     |
| FR19      | Refresh catalogue automatically when adding cards    | Epic 3                               | Covered                     |
| FR20      | Detect outdated local catalogue                      | Epic 3                               | Covered                     |
| FR21      | Sort cards by usage frequency                        | Epic 9                               | Covered (Phase 2)           |
| FR22      | Show most recently used cards first                  | Epic 9                               | Covered (Phase 2)           |
| FR23      | Pin favorites at top                                 | Epic 9                               | Covered (Phase 2)           |
| FR24      | Alphabetical fallback sorting                        | Epic 9                               | Covered (Phase 2)           |
| FR25      | Use app in guest mode with full access               | Epic 6                               | Covered                     |
| FR26      | Create account with email/password                   | Epic 6                               | Covered                     |
| FR27      | Sign in with Apple                                   | Epic 6                               | Covered                     |
| FR28      | Sign in with Google                                  | Epic 6                               | Covered                     |
| FR29      | Log in to existing account                           | Epic 6                               | Covered                     |
| FR30      | Log out                                              | Epic 6                               | Covered                     |
| FR31      | Reset password                                       | Epic 6                               | Covered                     |
| FR32      | Delete account and cloud data                        | Epic 6                               | Covered                     |
| FR33      | Upgrade guest mode to authenticated mode             | Epic 6                               | Covered                     |
| FR34      | Sync phone and watch via Bluetooth in guest mode     | Epic 5                               | Covered                     |
| FR35      | Sync cards to cloud backend                          | Epic 7                               | Covered                     |
| FR36      | Sync cards across authenticated devices              | Epic 7                               | Covered                     |
| FR37      | Perform background synchronization automatically     | Epic 7                               | Covered                     |
| FR38      | Detect network connectivity for sync                 | Epic 7                               | Covered                     |
| FR39      | Queue offline sync operations and retry              | Epic 7                               | Covered                     |
| FR40      | Resolve sync conflicts with last-write-wins          | Epic 7                               | Covered                     |
| FR41      | Perform delta sync                                   | Epic 7                               | Covered                     |
| FR42      | Sync bidirectionally across phone, watch, and cloud  | Epic 7                               | Covered                     |
| FR43      | Open wearable app without phone connection           | Epic 5, Epic 10                      | Covered                     |
| FR44      | Store cards locally on wearable                      | Epic 5, Epic 10                      | Covered                     |
| FR45      | Navigate card list on wearable                       | Epic 5, Epic 10                      | Covered                     |
| FR46      | Tap wearable card to display barcode                 | Epic 5, Epic 10                      | Covered                     |
| FR47      | Sync card changes between phone and watch            | Epic 5, Epic 10                      | Covered                     |
| FR48      | Access core features without network                 | Epic 2                               | Covered                     |
| FR49      | Add, edit, and delete cards offline                  | Epic 2                               | Covered                     |
| FR50      | Display barcodes offline                             | Epic 2                               | Covered                     |
| FR51      | Store cards and cached catalogue locally             | Epic 2                               | Covered                     |
| FR52      | Wearables function without phone or network          | Epic 5, Epic 10                      | Covered                     |
| FR53      | View collected personal data                         | Epic 6                               | Covered                     |
| FR54      | Export all loyalty card data in JSON                 | Epic 8                               | Covered                     |
| FR55      | Request cloud-data deletion                          | Epic 6                               | Covered                     |
| FR56      | Encrypt cloud data at rest                           | Epic 6                               | Covered                     |
| FR57      | Access privacy policy in app                         | Epic 6; also listed in Epic 8 header | Covered (Duplicate mapping) |
| FR58      | Provide consent before account creation              | Epic 6                               | Covered                     |
| FR59      | Show loading indicators during operations            | Epic 2                               | Covered                     |
| FR60      | Show sync status indicators                          | Epic 2                               | Covered                     |
| FR61      | Show success confirmations                           | Epic 2                               | Covered                     |
| FR62      | Show clear failure explanations                      | Epic 2                               | Covered                     |
| FR63      | Show overlay messages on sync failure                | Epic 2                               | Covered                     |
| FR64      | Show camera-permission denial recovery               | Epic 2                               | Covered                     |
| FR65      | Provide failed-operation recovery options            | Epic 2                               | Covered                     |
| FR66      | Select preferred language                            | Epic 8                               | Covered                     |
| FR67      | Toggle light/dark mode                               | Epic 8                               | Covered                     |
| FR68      | Access settings screen                               | Epic 8                               | Covered                     |
| FR69      | View app version and build info                      | Epic 8                               | Covered                     |
| FR70      | Validate barcode format by brand requirements        | Future Enhancements                  | Deferred (Post-MVP)         |
| FR71      | Provide validation feedback for manual barcode entry | Future Enhancements                  | Deferred (Post-MVP)         |
| FR72      | Show welcome screen                                  | Epic 4                               | Covered                     |
| FR73      | Access help docs or FAQs                             | Epic 4; also listed in Epic 8 header | Covered (Duplicate mapping) |
| FR74      | Guide first-time card addition                       | Epic 4                               | Covered                     |

### Missing Requirements

- No PRD functional requirement is untracked in the epics document.
- FR70 and FR71 are intentionally deferred to the post-MVP backlog rather than assigned to a current epic. That is a scope decision, not an accidental omission.
- FR57 and FR73 have duplicate ownership signals across the epic headers and the FR coverage map. They are still covered, but the document should nominate a single primary owner epic for cleaner traceability.

### Coverage Statistics

- Total PRD FRs: 74
- FRs mapped to a current epic: 72
- FRs deferred to future backlog: 2
- Current-epic coverage percentage: 97.3%
- Full roadmap traceability percentage: 100%

## UX Alignment Assessment

### UX Document Status

- Found: `docs/ux-design-specification.md`
- Reference architecture reviewed: `docs/architecture.md`

### Alignment Issues

- Navigation pattern conflict: the UX spec still calls for tab-based phone navigation (Dashboard, Add, Settings), while the PRD, epics, and architecture all describe header-driven navigation with `+` and `⚙️` entry points.
- Card-name constraint conflict: the UX spec describes custom card names up to 20 characters, while the PRD and architecture schema both allow up to 50 characters.
- Watch-complication conflict: the UX spec marks complications as post-MVP, while the architecture currently documents a simple watchOS complication as an MVP quick-launch path.
- Platform-scope conflict: the architecture still frames delivery as iOS-first MVP with Android expansion in Phase 2, while the PRD and epics continue to describe both iOS and Android phone apps as MVP scope.
- Styling decision conflict: the UX spec treats NativeWind as the chosen foundation, while the architecture revision history explicitly marks NativeWind as under evaluation after Sprint 11 rework.
- Scanner-save behavior conflict: the UX component section still mentions an auto-save scanner trigger, while the UX journey notes and epic stories use the pre-filled form plus explicit Save flow for MVP.
- Sorting expectation conflict: the UX spec treats recency and pinning as part of the core experience, while the epic plan defers favorites and smart sorting to Phase 2.

### Warnings

- The product-level UX direction is strong on the core experience: offline-first usage, one-tap barcode display, high-contrast scanning surfaces, and minimal watch interactions all align well across PRD, UX, and architecture.
- The OTP verification design work for Story 6.17 is functioning as a local source of truth for the auth flow, because the master UX document does not yet spell out OTP-specific layouts, resend states, or verification error recovery.
- Story 6.18 should therefore inherit final OTP behavior from the approved Story 6.17 deliverable, not from older generic auth assumptions in the broader UX artifacts.

## Epic Quality Review

### Findings

1. Story 6.17 is complete and no longer a live blocker. The approved Figma handoff now explicitly locks the verify-trigger decision, resend outcome treatment, keyboard-open behavior, and success handoff timing that Story 6.18 must inherit.
2. Technical-writer review remains incorporated into Story 15.1. That story continues to stand independently and does not affect the auth-flow readiness decision.
3. Story 6.18 is materially stronger after refinement. The stale conditional submit language was removed, the approved 6.17 interaction contract is now treated as fixed, and a structured readiness-evidence ledger now records what is verified versus still blocked.
4. Story 6.18 remains blocked, but now for concrete reasons: the local repo still shows `[auth.email] enable_confirmations = false`, and production confirmation/email-template evidence is still missing from the story.

### Current Sprint Status Recommendation

- Keep `6-17-design-otp-verification-screen` at `done`.
- Keep `15-1-github-pages-landing-page` at `ready-for-dev`.
- Keep `6-18-otp-email-verification-flow` below `ready-for-dev` until local and production confirmation/email-template evidence is recorded.

## Summary and Recommendations

### Overall Readiness Status

NEEDS WORK

### Critical Issues Requiring Immediate Action

1. Story 6.18 is still blocked because the local repo-backed Supabase config shows `[auth.email] enable_confirmations = false`.
2. Story 6.18 still lacks recorded production evidence for both the confirmation toggle and the OTP email template behavior.

### Recommended Next Steps

1. Update local Supabase email confirmation configuration and record the verification result in Story 6.18's readiness ledger.
2. Verify the production confirmation toggle and OTP email template, then record owner and date in the same ledger.
3. Promote Story 6.18 from `drafted` to `ready-for-dev` only after those evidence rows are complete; Story 15.1 can continue independently.

### Final Note

The planning artifacts are aligned overall. The remaining readiness issue is localized to a single blocked Sprint 13 story, not a product-wide planning defect.
