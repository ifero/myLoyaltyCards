# Story 15.2: Italian Language In-App

## Story Information

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| **Story ID** | 15-2                                        |
| **Epic**     | 15 - Internationalisation & Public Presence |
| **Sprint**   | Next sprint                                 |
| **Status**   | Backlog                                     |
| **Priority** | High                                        |
| **Estimate** | 3 points                                    |
| **Owners**   | PM: Ifero · Dev: — · QA: —                  |

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

- [ ] Add Italian translation resources for UI text.
- [ ] Register Italian in app language configuration.
- [ ] Update language selection / system locale detection.
- [ ] Review Italian copy for accuracy and consistency.
- [ ] Run the app in Italian to verify layout, buttons, and screens.
- [ ] Add regression test for Italian language rendering.

## Notes

- This story is intentionally scoped to the initial Italian in-app experience, not full multi-language coverage.
- Keep text changes aligned with the GitHub Pages Italian landing page copy where appropriate.
- Use the same token conventions and translation keys already present in the app.
