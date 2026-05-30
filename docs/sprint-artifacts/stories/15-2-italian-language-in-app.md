# Story 15.2: Italian Language In-App

## Story Information

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **Story ID** | 15-2                                        |
| **Epic**     | 15 - Internationalisation & Public Presence |
| **Sprint**   | Next sprint                                 |
| **Status**   | done                                        |
| **Priority** | High                                        |
| **Estimate** | 3 points                                    |
| **Owners**   | PM: Ifero · Dev: GitHub Copilot · QA: Quinn |

---

## Story

As an Italian user,
I want the app UI to be available in Italian,
so that I can use the product in my native language with consistent localized copy.

## Context

Sprint 13 delivered the GitHub Pages landing page and supporting infrastructure. The next priority is in-app Italian readiness for the next phase of internationalisation.

This story should enable the app to render translated UI strings in Italian and make sure copy is selectable/reviewable for future localization.

## Acceptance Criteria

- AC1 — The app includes Italian translations for all visible UI strings in the main flow: home, add card, auth, settings, and card details.
- AC2 — Users can switch or detect Italian language in the app without UI breakage.
- AC3 — Italian copy is reviewed and approved against the existing English source.
- AC4 — No hard-coded English strings remain in the translated screens.
- AC5 — Localization uses the app’s existing translation mechanism or a small, consistent i18n implementation.
- AC6 — Italian string metadata is stored in a translation file and included in source control.

## Implementation Approach

1. Identify the app’s current string handling for localization and translate the string catalog to Italian.
2. Add Italian resource files and wire the language selection or system-language detection.
3. Update the landing page / public-facing copy where needed to support Italian localization.
4. Validate translations across the main app flows and run smoke tests in Italian.

## Tasks

- [x] Add Italian translation resources for UI text.
- [x] Register Italian in app language configuration.
- [x] Update language selection / system locale detection.
- [x] Review Italian copy for accuracy and consistency.
- [x] Run the app in Italian to verify layout, buttons, and screens.
- [x] Add regression test for Italian language rendering.

## Notes

- This story is intentionally scoped to the initial Italian in-app experience, not full multi-language coverage.
- Keep text changes aligned with the GitHub Pages Italian landing page copy where appropriate.
- Use the same token conventions and translation keys already present in the app.

## Dev Agent Record

### Implementation Summary

1. Added and wired app-wide i18n with `i18next`, `react-i18next`, and `expo-localization`.
2. Added Italian and expanded English locale resources in typed translation files.
3. Implemented persisted language preference support for `system | en | it` and integrated selection in Settings.
4. Localized visible strings across main flows: home, add-card, auth, settings, onboarding, card details/edit/delete, and navigation titles.
5. Replaced remaining user-visible raw backend/exception messages in targeted auth/settings/card error paths with translated app copy.
6. Localized the reachable onboarding highlights screen and root fatal-init fallback copy.
7. Added/updated targeted tests for localization rendering, language preference behavior, and mapped error messaging.

### Validation

- `yarn test --runInBand features/onboarding/screens/FeatureHighlightsScreen.test.tsx features/auth/__tests__/SignInScreen.test.tsx features/auth/__tests__/CreateAccountScreen.test.tsx features/auth/__tests__/ForgotPasswordScreen.test.tsx features/auth/__tests__/ResetPasswordScreen.test.tsx features/settings/hooks/useImportData.test.ts features/settings/hooks/useLanguagePreference.test.ts features/cards/hooks/useAddCard.test.ts features/cards/hooks/useDeleteCard.test.ts`
- `yarn test --runInBand features/settings/screens/SettingsScreen.test.tsx features/settings/hooks/useExportData.test.ts features/cards/hooks/useEditCard.test.ts app/__tests__/onboarding.integration.test.tsx`
- `yarn test --runInBand core/settings/settings-repository.test.ts`
- `yarn test --runInBand features/auth/__tests__/CreateAccountScreen.test.tsx features/auth/__tests__/ForgotPasswordScreen.test.tsx features/auth/__tests__/ResetPasswordScreen.test.tsx shared/i18n/italian-rendering.test.tsx`
- `yarn typecheck`

### Review Outcomes

- Dev review cycle (`bmad-agent-bmm-dev`): **APPROVED**.
- QA cycle (`bmad-agent-tea-tea`): **PASS WITH RISKS**.
- Final dev re-review after risk-reduction updates: **APPROVED**.

## File List

- `shared/i18n/index.ts` — i18n bootstrap, system-language resolution, language switching helpers
- `shared/i18n/locales/en.ts` — expanded English source translation catalog
- `shared/i18n/locales/it.ts` — Italian translation catalog
- `shared/i18n/italian-rendering.test.tsx` — Italian rendering regression probe
- `jest.setup.js` — i18n and localization test bootstrap
- `core/settings/settings-repository.ts` — language preference support for `system | en | it`
- `core/settings/settings-repository.test.ts` — updated language preference expectations
- `features/settings/hooks/useLanguagePreference.ts` — language picker state + persistence + app language switching
- `features/settings/hooks/useLanguagePreference.test.ts` — updated language options assertions
- `features/settings/screens/SettingsScreen.tsx` — localized account/action errors and settings copy integration
- `features/settings/hooks/useExportData.ts` — localized export failures
- `features/settings/hooks/useImportData.ts` — localized import errors and analysis messaging
- `features/settings/hooks/useImportData.test.ts` — updated localized error expectations
- `features/auth/SignInScreen.tsx` — mapped translated sign-in error handling
- `features/auth/CreateAccountScreen.tsx` — translated create-account error mapping
- `features/auth/ForgotPasswordScreen.tsx` — translated forgot-password error mapping
- `features/auth/ResetPasswordScreen.tsx` — translated reset-password/session error mapping
- `features/auth/__tests__/CreateAccountScreen.test.tsx` — mapped error coverage
- `features/auth/__tests__/ForgotPasswordScreen.test.tsx` — mapped error coverage
- `features/auth/__tests__/ResetPasswordScreen.test.tsx` — updated mapped error assertions
- `features/onboarding/screens/FeatureHighlightsScreen.tsx` — localized reachable highlights flow
- `features/onboarding/screens/FeatureHighlightsScreen.test.tsx` — highlights behavior checks
- `app/_layout.tsx` — localized navigation titles + localized fatal-init fallback copy
- `core/utils/relative-time.ts` — locale-aware relative-time helper cleanup
- `features/cards/hooks/useAddCard.ts` — translated add-card failure messaging
- `features/cards/hooks/useDeleteCard.ts` — translated delete-card failure messaging
- `features/cards/hooks/useEditCard.ts` — translated edit-card failure messaging
- `features/cards/hooks/useAddCard.test.ts` — updated localized failure assertions
- `features/cards/hooks/useDeleteCard.test.ts` — updated localized failure assertions
- `features/cards/components/CardForm.tsx` — localized form labels/messages (story scope) and lint-order cleanup
- `features/cards/components/ColorPicker.tsx` — localized color labels and lint cleanup
- `features/settings/hooks/useThemePreference.ts` — import-order cleanup in touched story files

## Change Log

1. Implemented centralized i18n for app runtime and tests.
2. Added Italian resource catalog and expanded English source-of-truth keys.
3. Added persistent language preference with `system` mode and integrated Settings picker.
4. Localized main user flows and removed remaining high-priority hard-coded user-facing English in story scope.
5. Added targeted regression coverage for Italian rendering and mapped failure messaging.
6. Completed dev review + QA subagent cycles and addressed reported blockers.

## Status

- Status: done
- Pushed and opened for PR review.
