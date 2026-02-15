# Story 5.9: Remove legacy UserDefaults fallback (watch.cards)

## Story Information

| Field        | Value                                     |
| ------------ | ----------------------------------------- |
| **Story ID** | 5.9                                       |
| **Epic**     | 5 - Apple Watch App                       |
| **Sprint**   | 5                                         |
| **Status**   | ready-for-dev                             |
| **Priority** | Medium                                    |
| **Estimate** | Small (half-day to 1 day)                 |
| **Owners**   | Dev: Ifero · QA: TBD · Tech Writer: Paige |

---

## User story

**As a** product engineer,  
**I want** the watch app to use SwiftData only (remove legacy `UserDefaults` key `watch.cards` and legacy migration fallback),  
**so that** storage is consistent, tests use a single data surface (SwiftData ModelContainer) and we remove dead/legacy paths before public release.

---

## Acceptance criteria

- AC1 — No source code in the `watch-ios` target references `UserDefaults.standard` key `watch.cards`.
- AC2 — All unit & UI tests that previously used `UITEST_CARDS` are updated to seed SwiftData ModelContainer (in-memory) or otherwise inject SwiftData entities.
- AC3 — `CardStore.migrateUserDefaults(to:)` and its UserDefaults-based unit tests are removed or converted to archived/disabled tests.
- AC4 — `CardListView` no longer reads/writes `watch.cards`; debug import inserts into `ModelContext`.
- AC5 — All watchOS unit + UI tests pass locally and in CI.
- AC6 — PR includes updated story file + `sprint-status.yaml` entry.

---

## Technical requirements / constraints

- Replace legacy fallback with SwiftData-only behavior.
- Keep UI test seed capability — but implement by seeding SwiftData ModelContainer at app launch (in-memory) instead of env-var → CardStore shim.
- Preserve debug import behavior (still available in DEBUG) but write to SwiftData ModelContext.
- Do not ship any `watch.cards` UserDefaults behavior to production.
- Follow project test patterns (use `ModelContainer(for:)` for in-memory tests).

---

## Implementation plan (Dev)

High-level approach:

- Remove all `UserDefaults` access for key `watch.cards` in `watch-ios`.
- Move UI test seeding from `CardStore`/env-reading into app-level SwiftData seeding (ModelContainer) so UI tests continue to use `UITEST_CARDS` env var but via SwiftData injection.
- Delete/ archive legacy migration helper and tests.
- Update debug import to insert into `ModelContext`.

Exact files to change

- Modify:
  - `watch-ios/MyLoyaltyCardsWatch/MyLoyaltyCardsWatchApp.swift` — add app-level SwiftData seeding when `UITEST_CARDS` env var is present.
  - `watch-ios/MyLoyaltyCardsWatch/CardListView.swift` — remove all `UserDefaults` references and `migrateUserDefaults(to:)`; change `importSampleCards()` to insert into `ModelContext`.
- Update tests:
  - `watch-ios/MyLoyaltyCardsWatchTests/CardStoreTests.swift` — remove UserDefaults/env-based tests; add SwiftData-seeding unit tests.
  - `watch-ios/MyLoyaltyCardsWatchUITests/CardListUITests.swift` — keep tests but rely on app-level SwiftData seeding (no change to test code required in most cases).
- Add helper:
  - `watch-ios/MyLoyaltyCardsWatch/Testing/TestSeed.swift` — small test helper to seed a `ModelContainer` from `UITEST_CARDS` JSON (used by app + unit tests).
- Optional (archive old tests):
  - Move legacy tests to `watch-ios/Archived/` or convert them to skipped tests.

Key code patterns (examples)

- App-level seeding (in `MyLoyaltyCardsWatchApp.swift`) — seed an in-memory ModelContainer from `UITEST_CARDS` env var and inject via `.modelContainer(...)`.
- Remove `UserDefaults` usage in `CardStore` (make it an in-memory test/dev fallback only).
- Change `importSampleCards()` to insert SwiftData entities.

---

## Tests to add / update (granular)

Unit tests to update/remove

- Remove or archive:
  - `CardStoreTests.test_loadPersistedCards_readsFromUserDefaults`
  - `CardStoreTests.test_loadPersistedCards_prefersUITestEnvironment`
  - `CardStoreTests.test_migration_fromUserDefaults_to_SwiftData` (archive/remove)
- Add / keep:
  - `CardStoreTests.test_watchCardEntity_persistence_inModelContext` (keep)
  - Add `CardStoreTests.test_cardStore_no_longer_reads_userdefaults` — verify `CardStore().cards` is empty even if `UserDefaults` key present.
  - Add `TestSeedTests.test_seed_swiftdData_from_env_inserts_entities` — validates the new seed helper creates `WatchCardEntity` entries in an in-memory container.

UI tests to update

- `CardListUITests` — no code-level change required for most tests (they already call `app.launchEnvironment["UITEST_CARDS"] = json`); confirm tests pass after seeding is moved to app-level.
- Add optional: `CardListUITests.test_seededCards_come_from_swiftdData`.

CI / integration

- Ensure Xcode watchOS test target runs unchanged.
- Add CI job step: run watchOS unit tests + watchOS UI tests against a simulator.

---

## Risk / rollback

Risks

- Missed references to `watch.cards` in tests or build scripts causing CI to fail.
- Slight behavior change in UI tests if seeding timing differs (fix by seeding ModelContainer at App init time).
- Unexpected persistent data leftover during local dev (rare — warn devs to clear simulator).

Rollback strategy

- Revert the branch/PR (safe — app not yet released).
- If necessary, reintroduce a short-term feature flag `USE_LEGACY_WATCH_USERDEFAULTS` (but not required because app is unreleased).
- Keep archived copy of legacy migration tests in `/watch-ios/Archived/` for future reference.

Estimated timeline

- Developer work: 0.5 — 1 day (Small)
- QA (local + CI): 0.5 day
- Total: up to 1 day.

---

## Definition of done

- [ ] No references to `UserDefaults.standard` key `watch.cards` remain in `watch-ios` source.
- [ ] `CardListView` uses SwiftData only; debug import writes to `ModelContext`.
- [ ] `UITEST_CARDS` still usable by UI tests but implemented as SwiftData seeding at app start.
- [ ] Legacy migration helper and its UserDefaults-based tests removed/archived.
- [ ] All watchOS unit + UI tests pass locally and in CI.
- [ ] Story file added and `sprint-status.yaml` updated.

---

## Acceptance checklist for PR body

- [ ] No `watch.cards` occurrences remain (run: `rg "watch\.cards" -n`).
- [ ] All watchOS tests pass locally & in CI.
- [ ] Story file added at `docs/sprint-artifacts/stories/5-9-remove-userdefaults-fallback.md`.
- [ ] `sprint-status.yaml` updated to mark story `ready-for-dev`.

---

_Prepared by Architect subagent — ready for dev work._
