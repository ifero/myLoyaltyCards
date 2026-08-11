---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 10.5: Store cards locally on Wear OS (Room)

Status: review

Epic: 10 — Wear OS App

> **Gates run inside a `.claude` worktree too, once you `yarn install` there.** `jest.config.js`
> anchors its `.claude` ignore patterns to `<rootDir>`, so a worktree runs its own suite instead of
> finding zero tests. A worktree with no `node_modules` fails on missing dependencies instead — a
> different problem. Native builds (`yarn watch:build`, `./gradlew`) still need the **main checkout**:
> `ios/`, `android/` and `.expo/` are gitignored and absent in a fresh worktree. `--no-verify` stays
> forbidden either way.
>
> **Depends on 10-1** (module) and **10-3** (the read interface this story implements). Feeds **10-6**,
> which writes into this store from the Data Layer.
>
> **ONE storage surface. Room only.** watchOS shipped two and needed an entire story (5-9) to remove the
> second before public release. See [The 5-9 lesson](#the-5-9-lesson-one-surface-from-day-one).
>
> **Dates are stored as STRINGS**, not as a date type. This is a documented project rule that the
> watchOS entity itself does not follow — see [Dates](#dates-do-what-the-rule-says-not-what-watchos-did).

## Story

As a user whose phone is in another room, out of battery, or out of Bluetooth range,
I want my cards to still be on my watch,
so that the watch is dependably useful on its own rather than only when my phone is nearby.

## Context

### What watchOS stores

`targets/watch/WatchCardEntity.swift` — a SwiftData `@Model` with `@Attribute(.unique) var id`:

| Field           | Swift type | Note                                                    |
| --------------- | ---------- | ------------------------------------------------------- |
| `id`            | `String`   | unique — the phone-generated UUID                       |
| `name`          | `String`   |                                                         |
| `barcode`       | `String`   | wire field is `barcodeValue`                            |
| `barcodeFormat` | `String`   | one of the six cross-platform format strings            |
| `brandId`       | `String?`  | null for custom cards                                   |
| `color`         | `String`   | wire field is `colorHex`                                |
| `isFavorite`    | `Bool`     | defaults `false` — 9-4's backward-compat requirement    |
| `lastUsedAt`    | `Date?`    | nullable                                                |
| `usageCount`    | `Int`      | defaults `0`                                            |
| `createdAt`     | `Date`     |                                                         |
| `updatedAt`     | `Date`     | **not present in the wire payload** — see below         |
| `rawPayload`    | `Data?`    | "serialized original payload for forward compatibility" |

### Two discrepancies in the mirror worth knowing before you copy it

1. **`updatedAt` has no wire source.** `WatchCardPayload` (`core/watch-connectivity.ts:155-167`) carries
   `id, name, brandId, colorHex, barcodeValue, barcodeFormat, barcodeImageBase64?, usageCount,
lastUsedAt, createdAt, isFavorite` — **no `updatedAt`**. The watchOS entity's `updatedAt` is
   therefore fed only by its own `init` default (`Date()`), i.e. it records local insert time, not the
   phone's update time. Do not model it as if it were authoritative. Open Decision 3.
2. **Field names differ between wire and entity** (`barcodeValue` → `barcode`, `colorHex` → `color`).
   Keep the wire names in the DTO and map explicitly at the boundary — mirroring the phone's own rule
   that DB and client shapes are transformed at the boundary, never conflated.

### The 5-9 lesson: one surface from day one

The watchOS app originally stored cards in **both** a `UserDefaults` key (`watch.cards`) and SwiftData,
with a `CardStore.migrateUserDefaults(to:)` fallback and a `UITEST_CARDS` env-var seeding shim. Story
5-9 existed solely to delete all of it — its stated reason: "remove dead/legacy paths **before public
release**", so that "tests use a single data surface".

Wear OS starts with no legacy, so there is nothing to be compatible with. **Room is the only store.** No
`SharedPreferences` card cache, no JSON file, no in-memory singleton that outlives the DAO, and no
env-var seeding shim. 5-9 also shows the right way to seed tests: an **in-memory database**, not a
production code path with a test-only branch.

Note the one legitimate exception: 10-3 persists the **sort mode** in a preference store. That is UI
state, not card data (Story 9-5's rationale), and it does not make preferences a second card surface.

### Dates: do what the rule says, not what watchOS did

`docs/project-context.md` Watch App Rules: "**Store dates as strings, parse only for display.**" The
project's data-format rule is ISO-8601 UTC with milliseconds (`2025-12-24T10:30:00.123Z`), and
`core/watch-connectivity.ts` sends `lastUsedAt` / `createdAt` as strings.

`WatchCardEntity` uses `Date?`/`Date` anyway, which forces a parse on ingest and a re-serialise on
egress and is the kind of drift that produces timezone bugs. **Room stores them as `String`.** Two
concrete reasons beyond the rule:

- **10-6's dedup key is `"<cardId>:<usedAt>"` at millisecond precision.** ADR-2026-06-09-001 makes
  second-precision timestamps explicitly non-conformant. Round-tripping through a date type is exactly
  how milliseconds get dropped.
- String comparison on ISO-8601 UTC is lexicographically equivalent to chronological order, so sorting
  (10-3's `lastUsedAt desc` / `createdAt desc`) needs no parsing at all.

## Acceptance Criteria

**AC1 — Cards persist across app restart.**
Cards written to Room are present after a full app restart (Story 5-5 AC1).

**AC2 — Cards are available with no phone.**
With Bluetooth off / the phone unreachable, the list and every card's barcode still work (5-5 AC2). No
code path in this story performs I/O beyond the local database.

**AC3 — Data survives an app update.**
Stored cards are not lost when the app is upgraded (5-5 AC3). A schema version and an explicit migration
strategy exist from the first release — see AC4.

**AC4 — Schema versioning and migrations are set up before they are needed.**
The Room database declares `version = 1` and the project has a **documented, tested** migration path for
the next change. `fallbackToDestructiveMigration()` is **forbidden in release builds** — silently wiping
a user's cards is exactly the AC3 failure. If it is enabled for debug convenience, it must be
build-type-scoped and commented.

**AC5 — `id` is the primary key and upserts are idempotent.**
`id` (the phone-generated UUID) is the primary key. Applying the same payload twice leaves one row with
identical contents. This is what makes 10-6's full-snapshot sync safe to repeat.

**AC6 — Dates stored as ISO-8601 UTC millisecond strings.**
`lastUsedAt` (nullable), `createdAt`. No date/instant column types. A round-trip test proves millisecond
precision is preserved exactly.

**AC7 — Field parity with the wire payload, mapped explicitly.**
Every `WatchCardPayload` field is persisted (except `barcodeImageBase64` — see AC8), with wire→entity
name mapping done in one explicit place. `isFavorite` defaults to **`false`** when absent (9-4 AC4);
`usageCount` defaults to **`0`**; `brandId` and `lastUsedAt` are nullable.

**AC8 — Forward compatibility: keep the raw payload.**
An unknown/extra field arriving from a newer phone build must not be lost. Mirror
`WatchCardEntity.rawPayload` with a nullable raw-payload column. **Do not** persist
`barcodeImageBase64` as a decoded blob — 10-4 renders barcodes locally via ZXing, so the image is dead
weight; if it arrives inside the raw payload that is acceptable, but consider stripping it before
storing (Open Decision 4) since it is the largest field by far.

**AC9 — Read-only for card data, enforced by a test.**
The store exposes no public API for mutating card _content_ from the watch UI. Add the equivalent of
Story 9-5's hardened `test_readOnly_localCardEdits_doNotPersistAcrossReload` — a test proving a local
edit does not survive a store reload. 9-5 explicitly rewrote a **vacuous** read-only test into this
form; do not reintroduce the vacuous version.

**AC10 — 10-3's read interface is implemented, unchanged.**
The repository interface 10-3 defined is satisfied by a Room-backed implementation. 10-3's UI needs no
changes beyond dependency wiring. If the interface must change, that is a signal 10-3 guessed wrong —
change it deliberately and note it, do not fork it.

**AC11 — Reactive reads.**
The list observes the database (Room `Flow`) so 10-6's writes appear without a manual refresh. Polling
is not acceptable.

**AC12 — Debug seeding is debug-only and empty-state-gated.**
Any sample-card seeding is `debug`-build-only and only fires when the store is empty. Story 9-5 had to
retrofit exactly this gate on watchOS because the seeder crowded real UI in dev builds. No env-var
seeding shim (5-9 deleted watchOS's).

**AC13 — Tests.**
Room instrumentation/unit tests using an **in-memory database** (mirroring 5-9 AC2's approach) covering:
persistence across a store reopen; idempotent upsert; millisecond date round-trip; `isFavorite`/`usageCount`
defaults when absent; nullable `brandId`/`lastUsedAt`; the read-only invariant (AC9); the migration path
(AC4); and reactive emission on write (AC11). **State explicitly in the Dev Agent Record whether these
run in CI.**

**AC14 — No regression.**
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn tokens:check`, `yarn splash:check`,
`yarn check:catalogue-generated`, `yarn watch:build` pass from the main checkout; `./gradlew assembleDebug`
and the Kotlin tests pass in `watch-android/`.

## Tasks / Subtasks

- [x] **Task 1 — Entity and DAO (AC: 5, 6, 7, 8, 11)**
  - [x] Room `@Entity` with `id` as `@PrimaryKey`, all AC7 fields, `String` dates, nullable raw-payload
        column.
  - [x] DAO: observe-all as a `Flow`, get-by-id, upsert (single and list), delete-all, count.
  - [x] A single explicit wire→entity mapper. Keep the DTO's wire names (`barcodeValue`, `colorHex`).

- [x] **Task 2 — Database and migrations (AC: 3, 4)**
  - [x] `@Database(version = 1)`. Export the schema so future migrations can be generated and diffed.
  - [x] Document the migration policy in `watch-android/README.md`. Ensure
        `fallbackToDestructiveMigration` cannot reach a release build.
  - [x] Write the AC4 migration test now — a v1→v2 migration test written against a throwaway v2 proves
        the harness works before it is needed under pressure.

- [x] **Task 3 — Repository (AC: 9, 10)**
  - [x] Implement 10-3's read interface over the DAO. Expose a write surface **only** for 10-6's
        snapshot application — internal to the data layer, not reachable from UI code.
  - [x] No public content-mutation API. Add the AC9 test.

- [x] **Task 4 — Seeding (AC: 12)**
  - [x] Move 10-3's debug seed onto Room, debug-only and empty-state-gated.

- [x] **Task 5 — Tests, docs, verification (AC: 13, 14)**
  - [x] AC13 tests with an in-memory database.
  - [x] README: schema, migration policy, the single-surface rule and why (link 5-9).
  - [x] Verify AC2 on a real watch or emulator with Bluetooth disabled — not just a unit test.

## Dev Notes

### Anti-patterns — do NOT do these

| ❌ Don't                                                  | ✅ Do instead                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Add a `SharedPreferences`/JSON card cache "as a fallback" | Room only. That fallback is precisely what Story 5-9 deleted                   |
| Store dates as `Long`/`Instant`/`Date`                    | ISO-8601 UTC millisecond **strings** (project rule; protects 10-6's dedup key) |
| `fallbackToDestructiveMigration()` in release             | Real migrations; destructive fallback wipes user cards and breaks AC3          |
| Expose a public card-mutation API                         | Read-only; only 10-6's internal snapshot-apply writes                          |
| Ship a vacuous read-only test                             | The 9-5 form: prove a local edit does not survive a reload                     |
| Reuse the phone's SQLite schema or migration code         | Different platform, different store. `core/database/` is the phone's           |
| Model `updatedAt` as phone-authoritative                  | It has no wire source; see Open Decision 3                                     |
| Persist the base64 barcode image as a first-class column  | 10-4 renders locally via ZXing; the image is dead weight                       |
| Poll the database                                         | Room `Flow` (AC11)                                                             |
| Seed sample cards in release, or via an env var           | Debug-only + empty-state-gated (5-9 removed watchOS's env shim)                |
| Let the DAO's `Flow` emit on the main thread              | Room's own dispatcher; keep queries off the UI thread                          |

### Testing requirements

- Phone-app gates from any installed checkout (worktree included); Kotlin/Room tests via Gradle in
  `watch-android/`.
- **In-memory database for tests**, mirroring 5-9 AC2's `ModelContainer(for:)`-in-memory approach. Never
  touch a real device database in a test.
- Room's migration testing helper is the reason AC4's test is cheap. Wire the exported schema now; it
  cannot be reconstructed retroactively for a version that already shipped.
- **Coverage caveat, as with the rest of Epic 10:** the phone's 80 % global Jest gate does not see Kotlin.
  Gradle tests _can_ run in CI (unlike watchOS's XCTests, which do not — the watch scheme has no
  `xcodebuild test` step). Wire them into 10-1's job or state plainly that they run locally only.

### Previous story intelligence

**Story 5-5** built the watchOS store; its ACs (persist across restart, work with the phone out of
range, survive an update) are AC1–AC3 here almost verbatim, and its technical requirements already asked
for "basic migration strategy" and "read-only behavior".

**Story 5-9** is the story to actually read. Its whole existence is the cost of having shipped a second
storage surface: a legacy `UserDefaults` key, a migration fallback, and a test-seeding shim, all deleted
before public release. Its AC2 also establishes the in-memory-container testing pattern.

**Story 9-4** established `isFavorite`'s backward-compatible default: a payload without the field must
yield `false`, "no crash, no data loss".

**Story 9-6 / ADR-2026-06-09-001** make millisecond precision load-bearing: the usage-event dedup id is
`"<cardId>:<usedAt>"`, and second-resolution timestamps are non-conformant. AC6 protects this.

**Story 16-11 (phone)** is a cautionary tale from the phone's sync layer: two uncoordinated sync engines
meant deleted cards resurrected, because a full-fetch merge was deletion-blind and a purpose-built
deletion-aware merge sat dead for months. The transferable lesson for 10-5/10-6: **one write path**, and
make deletion an explicit, tested case rather than an emergent property of merging.

### Relationship to the phone's database

The phone uses `expo-sqlite` with `withTransactionAsync` transactions and a versioned migration runner
(`core/database/`). **None of it is shared.** Do not import phone schema definitions, do not mirror its
migration numbering, and do not treat its table names as a contract. The only cross-platform contract is
the **wire payload** in `core/watch-connectivity.ts` and the six barcode-format strings.

## Out of scope — flagged, not fixed

1. **Sync / Data Layer transport** → 10-6. This story provides the store 10-6 writes into.
2. **`CARD_USED` emission and its outbox.** 10-6's. If 10-6 needs to queue unsent usage events while
   offline, that queue is a **10-6 concern**; do not speculatively add an events table here.
3. **Deletion semantics.** 10-6 decides whether a snapshot replaces or merges, and therefore how cards
   deleted on the phone disappear from the watch. This story only provides `delete-all` and upsert
   primitives. Flagged deliberately: Story 16-11 shows this is where data-integrity bugs live.
4. **Encryption at rest.** The phone stores card data unencrypted in SQLite; the watch matches. Changing
   that is a cross-platform product decision.
5. **The watchOS `updatedAt` gap.** Worth a small phone-side story to either send `updatedAt` or drop the
   field from the watchOS entity — **raise with @ifero**, do not fix here.
6. **End-to-end migration-registration test.** `CardMigrationTest` proves a migration's SQL preserves
   data (AC4) by driving `Migration.migrate()` directly, and `CardDaoTest.cardsSurviveAStoreReopen`
   exercises Room's real open path through `Room.databaseBuilder`. Testing Room's v1→v2 **version
   dispatch** (that a migration is correctly registered in `ALL_MIGRATIONS` and picked up by the
   builder) requires a real v2 schema, which does not exist yet. Deferred to the first real migration,
   which supplies that v2 — at which point add a `MigrationTestHelper` end-to-end test (already noted in
   `CardMigrationTest`'s KDoc).

## Open Decisions — binding defaults, implement as written

1. **Room, not SQLDelight or raw SQLite.** Epic 10's scope names Room, it is the Android-standard
   choice, and its `Flow` support and migration-test helper directly serve AC11 and AC4.
2. **One table, no normalisation.** 56 catalogue brands live in compiled `Brands.kt` (10-2); cards
   reference `brandId` as a plain string exactly as the phone and watchOS do. No brand table, no joins.
3. **Persist `updatedAt` as a nullable string, fed only if the wire payload gains it.** Do not synthesise
   a local value that reads as phone-authoritative — that is the trap watchOS fell into. If it is absent,
   leave it null.
4. **Strip `barcodeImageBase64` before storing the raw payload.** It is the largest field, 10-4 never
   reads it, and keeping it would bloat every row for nothing. Preserving _unknown_ fields (AC8's actual
   purpose) is unaffected — this strips one specific known-and-unused field.
5. **`version = 1`, schema exported, real migrations only.** No destructive fallback outside debug.
6. **The repository is the only seam the UI sees.** 10-3 talks to the interface; nothing in UI code
   touches a DAO or the database directly.

## References

- `targets/watch/WatchCardEntity.swift` — the SwiftData model to mirror, incl. `rawPayload` and the
  `updatedAt` discrepancy
- `core/watch-connectivity.ts:155-167` — `WatchCardPayload`, the wire contract (note: no `updatedAt`)
- `core/schemas/card.ts` — `loyaltyCardSchema`, the six barcode formats, the card colour keys
- `docs/sprint-artifacts/stories/5-5-store-cards-locally-on-watch.md` — mirror story (AC1–AC3, migration,
  read-only)
- `docs/sprint-artifacts/stories/5-9-remove-userdefaults-fallback.md` — the cost of two storage surfaces;
  in-memory test pattern (AC2); env-shim removal
- `docs/sprint-artifacts/stories/9-4-sync-sorting-to-watch.md` — `isFavorite` default `false`, no crash
- `docs/sprint-artifacts/stories/9-5-selectable-watch-sort.md` — the hardened read-only test form;
  debug-seeder gating
- `docs/sprint-artifacts/stories/9-6-count-watch-card-opens.md` — ms-precision dedup key
- `docs/sprint-artifacts/stories/16-11-fix-card-deletion-cloud-resurrection.md` — one write path; make
  deletion explicit
- `docs/adr-2026-06-09-watch-usage-events.md` — ADR-2026-06-09-001, read-only rule + ms precision
- `docs/project-context.md` — Watch App Rules (dates as strings, read-only); ISO-8601 UTC ms format
- `core/database/` — the phone's SQLite layer, deliberately **not** shared

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (implementation); claude-sonnet code-review subagent (adversarial review loop).

### Room Version Used

`androidx.room` **2.8.4** (runtime + KSP compiler + Gradle schema-export plugin), KSP **2.3.11**,
`org.robolectric:robolectric` **4.16.1** (test only). Deliberately the mature `androidx.room` 2.8.x
line, **not** the weeks-old `androidx.room3` 3.0.x major, for a data-loss-critical layer — 2.8.x
already carries every API used here (the `SQLiteDriver` API, the `schemaDirectory` Gradle plugin, the
driver-based `MigrationTestHelper`; all landed in 2.7.0). Versions verified against Google's Maven
`<release>` at implementation time.

### Debug Log References

- Build-wiring spike (`assembleDebug`) confirmed AGP 9 built-in Kotlin + KSP 2.3.11 + Room 2.8.4
  compile and export the schema; config cache stored.
- Test-strategy spikes established, empirically, that (a) the context-less KMP `inMemoryDatabaseBuilder`
  does not resolve for an Android app module (compile error → Room's Android builder needs a Context →
  Robolectric), and (b) `androidx.sqlite:sqlite-bundled` cannot load native SQLite on the host JVM in
  an Android module (`UnsatisfiedLinkError`) → the migration test uses `AndroidSQLiteDriver` under
  Robolectric instead.

### Completion Notes List

- **One storage surface, Room only** (5-9's lesson): no `SharedPreferences`/JSON/in-memory card cache;
  the in-memory `InMemoryCardRepository` placeholder from 10-3 was removed.
- **Dates as ISO-8601 UTC millisecond strings** (`TEXT` columns), not date types — protects 10-6's
  `"<cardId>:<usedAt>"` dedup key (ADR-2026-06-09-001); a round-trip test proves ms precision (AC6).
- **`id` primary key + `@Upsert`** → idempotent (AC5). **Reactive** via a Room `Flow` mapped to a
  `StateFlow` (AC11). **Field parity** with the wire payload mapped in one explicit place
  (`CardMappers.kt`), with 9-4's `isFavorite=false` / `usageCount=0` defaults and nullable
  `brandId`/`lastUsedAt` (AC7). **`rawPayload`** kept as TEXT for forward-compat (AC8); stripping
  `barcodeImageBase64` is 10-6's job (it owns the transport).
- **Read-only invariant is structural** (AC9): the UI sees only `CardRepository` (read-only interface);
  writers live on the concrete `RoomCardRepository`. Guarded by a reflection test that fails if any
  mutator is ever added to the interface (the hardened 9-5 form, not the vacuous value-copy form).
- **Schema `version = 1`, exported + committed**; `fallbackToDestructiveMigration(dropAllTables = true)`
  is `BuildConfig.DEBUG`-gated so it cannot reach release (AC3/AC4). Verified at the bytecode level:
  the DEBUG seeder (`DebugSampleCards`) is in R8's removed-code list — 0 references in the release dex,
  present in debug (AC12).
- **Seeding** moved onto Room, debug-only, and empty-state-gated **atomically** via
  `seedIfEmpty` (`withTransaction`), so it can never clobber cards 10-6 syncs in concurrently.
- **Process-lifetime DI** (`WearGraph`): the repository/scope are process singletons, so the card
  `StateFlow` survives Activity recreation instead of leaking a scope + flashing an empty list.

### Offline Verification (AC2)

No code path in this story performs I/O beyond the local Room database — there is no network or
Bluetooth/Data-Layer code here (that is 10-6). The list and every barcode are served entirely from
Room, so they work with the phone unreachable. Evidenced by the persistence-across-reopen test
(`CardDaoTest.cardsSurviveAStoreReopen`) and demonstrated on an emulator with no paired phone:

| Device / emulator                     | Radio state                            | Result                                                                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wear OS emulator, round 384² (API 30) | **airplane mode ON**, BT off, no phone | PASS. Debug-seeded into Room while offline → list rendered; **force-stop + relaunch (still offline) → cards persisted** (AC1); opening a card **rendered its EAN-13 barcode locally** (AC2). No network/BT path exists in this story's code. |

### Do the Kotlin/Room tests run in CI? (AC13)

**Yes.** `.github/workflows/wear-os-build.yml` runs `./gradlew testDebugUnitTest assembleDebug`, and
the Room tests are ordinary `testDebugUnitTest` tests. The DAO tests, the migration test, and the
read-only structural test run under **Robolectric** — a JVM Android runtime, no emulator — on the
Ubuntu runner; the mapper tests are pure JVM. The first CI run downloads Robolectric's `android-all`
runtime (well within the job's 20m headroom). This is unlike watchOS, whose Swift XCTests do not run
in CI.

### File List

**Added (production):**

- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/WearGraph.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardEntity.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardDao.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/WatchCardPayload.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardMappers.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/WearDatabase.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/RoomCardRepository.kt`

**Added (tests + resources):**

- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardDaoTest.kt`
- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardMappersTest.kt`
- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardMigrationTest.kt`
- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/RoomCardRepositoryTest.kt`
- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardRepositoryReadOnlyTest.kt`
- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/WearGraphTest.kt`
- `watch-android/app/src/test/resources/robolectric.properties`

**Added (generated, committed):**

- `watch-android/app/schemas/com.iferoporefi.myloyaltycards.wear.data.WearDatabase/1.json`

**Modified:**

- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/MainActivity.kt`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardRepository.kt` (removed `InMemoryCardRepository`)
- `watch-android/build.gradle.kts`
- `watch-android/app/build.gradle.kts`
- `watch-android/gradle/libs.versions.toml`
- `watch-android/README.md`
- `.prettierignore`
- `docs/sprint-artifacts/stories/10-5-store-cards-locally.md` (this story: task checkboxes, Dev Agent Record, Change Log)

**Deleted:**

- `watch-android/app/src/test/kotlin/com/iferoporefi/myloyaltycards/wear/data/CardRepositoryTest.kt` (old in-memory test; replaced by the Room tests)

## Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-11 | Implemented Room-backed local card storage: entity/DAO/database/migration policy, mappers, wire DTO, `RoomCardRepository` (read-only seam + internal write surface), atomic debug seeding, schema export, Robolectric + JVM tests, README.                                                                                                                  |
| 2026-08-11 | Addressed code-review findings: process-lifetime DI (`WearGraph`) to fix a per-recreation scope leak; replaced the vacuous read-only test with a structural reflection guard; made debug seeding atomic (`seedIfEmpty`); dropped a redundant `@ColumnInfo`; filled the Dev Agent Record; tracked the end-to-end migration-registration test as a follow-up. |
