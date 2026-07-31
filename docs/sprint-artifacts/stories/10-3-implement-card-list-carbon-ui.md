---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 10.3: Implement the Wear OS card list (Carbon UI)

Status: ready-for-dev

Epic: 10 — Wear OS App

> **Gates run inside a `.claude` worktree too, once you `yarn install` there.** `jest.config.js`
> anchors its `.claude` ignore patterns to `<rootDir>`, so a worktree runs its own suite instead of
> finding zero tests. A worktree with no `node_modules` fails on missing dependencies instead — a
> different problem. Native builds (`yarn watch:build`, `./gradlew`) still need the **main checkout**:
> `ios/`, `android/` and `.expo/` are gitignored and absent in a fresh worktree. `--no-verify` stays
> forbidden either way.
>
> **Depends on 10-1** (module) and **10-2** (`Brands.kt`). Pairs with **10-5** (Room) and **10-6**
> (sync) — this story renders a list; it must work against a local store it does not itself populate.
> See [Working before 10-5/10-6 land](#working-before-10-5106-land).
>
> **This story carries Epic 9 parity, added to Epic 10 by correct-course on 2026-06-09.** Favourite
> indicator (mirror 9-4) and selectable persisted sort (mirror 9-5) are **in scope**, not follow-ups.
>
> **Wear OS screens are frequently ROUND.** watchOS never is. This is the largest single asymmetry in
> Epic 10 and it is a layout problem, not a styling one. See [Round screens](#round-screens-the-real-work).

## Story

As a user with an Android smartwatch,
I want to see my loyalty cards on my wrist, ordered the way I choose,
so that I can find the right card at a checkout counter without taking my phone out.

## Context

### What the watchOS list actually is

`targets/watch/CardListView.swift` (699 lines) is the reference. A row is **three elements**, and
notably **no brand artwork**:

1. A **colour accent bar** — `accentWidth 5 × accentHeight 28`, filled with the brand/card colour.
2. An **initials avatar** — `avatarSize 30`, a circle in the brand colour with 1–2 initials:
   `initials(from: brand.name ?? brand.id)` for catalogue cards (`:372-380`),
   `initials(from: card.name)` for custom cards (`:382-389`). Text colour flips via
   `shouldUseWhiteText(onBackgroundHex:)`.
3. The **card name**, plus an `star.fill` **favourite badge** when `isFavorite` (`:348`).

So the list needs only `name` + `color` from `Brands.kt` — **no drawable pipeline, no logo assets.**
That is a deliberate design, not an omission; do not "improve" it by adding artwork.

### The layout metrics are already specified — reuse them

`targets/watch/WatchPresentationLayout.swift:25-34` holds the tuned `compact` metrics, the output of
Story 5-10's density work:

```
rowSpacing 10 · horizontalPadding 10 · verticalPadding 9
accentWidth 5 · accentHeight 28 · avatarSize 30 · cornerRadius 14
minimumTapHeight 44
estimatedHeight = max(max(accentHeight, avatarSize) + verticalPadding*2, minimumTapHeight)
```

Story 5-10 reduced padding specifically to fit **one more visible row on a 41 mm screen** without
truncation, while keeping tap targets watch-usable. Treat these as the design intent to port, with two
mandatory adjustments below.

### Two mandatory adjustments to the ported metrics

1. **Tap target 48 dp, not 44.** `minimumTapHeight: 44` is Apple's guidance. Android's Material
   guidance — and `docs/project-context.md`'s own `TOUCH_TARGET.min = 44` for the _phone_ — do not
   govern Wear OS, where **48 dp** is the Material/Wear minimum. Use 48 dp and record the deviation.
2. **Round-screen insets** — see below.

### Round screens: the real work

Wear OS ships round, square and (historically) chin-cropped displays. watchOS is always rectangular, so
`CardListView.swift` has no concept of screen shape, and a naive port of `horizontalPadding: 10` will
clip row content at the top and bottom of a round display where the usable width narrows.

Compose for Wear OS solves this idiomatically and **must be used rather than re-derived**:

- A **`ScalingLazyColumn`**-family list (Wear Compose's scroll container), which scales and fades items
  toward the screen edges — the native Wear OS list idiom, and what makes a long list legible on a round
  display. Do **not** use a plain `LazyColumn`.
- **Shape-aware padding** so the first and last rows are not clipped on a round device.
- Rotary input (bezel / crown) scrolling, which Wear users expect and which comes for free from the Wear
  scroll container when wired correctly.

Verify the exact current API names against the installed Compose-for-Wear-OS BOM at implementation time
rather than trusting this prose — the Wear Compose list container has been renamed across versions, and
this story deliberately does not pin a class name it cannot verify.

### Sort — mirror Story 9-5 exactly, including the surprising default

Three modes, and the ordering rules are already settled. **Favourites pin first in every mode:**

| Mode                | Ordering after favourites-first                           |
| ------------------- | --------------------------------------------------------- |
| **Frequently used** | `usageCount` desc → `lastUsedAt` desc → `createdAt` desc  |
| **Recently added**  | `createdAt` desc                                          |
| **A-Z**             | `name`, locale-aware, **case- AND diacritic-insensitive** |

Three details that Story 9-5 got wrong first and then fixed — inherit the fixes, not the bugs:

- **The watch default is A-Z, not the phone's `frequent`.** Deliberate decision of 2026-06-09.
- **Diacritic-insensitivity is required**, not optional: 9-5's code review found case-insensitive-only
  ordering wrong for the Italian-first audience. The phone uses
  `localeCompare(…, { sensitivity: 'base' })`; watchOS matched it with
  `compare(options: [.caseInsensitive, .diacriticInsensitive], locale: .current)`. Use the Kotlin
  equivalent (a locale-aware `Collator` at secondary/primary strength — verify which strength actually
  ignores accents for `it`), **not** `lowercase()` comparison.
- **The "frequent" mode has a mixed-`nil` tier problem.** Cards with `lastUsedAt == null` must tier
  consistently with the phone; 9-5 shipped a parity fix for this after review finding #1. Mirror
  `features/cards/hooks/useCardSort.ts` semantics, and read 9-5's note before writing the comparator.

**The sort preference is watch-local and persisted independently of the phone.** watchOS uses
`@AppStorage("watch.sortMode")`; Wear OS uses its own preference store (Open Decision 3). Crucially,
9-5 records _why_ this is allowed: the sort mode is **UI state, not card data**, so persisting it on the
watch does not violate the read-only rule from ADR-2026-06-09-001. Do not send it to the phone.

### Working before 10-5/10-6 land

10-3 can be built and reviewed before storage and sync exist, and should be: it is the only story in the
chain with meaningful visual output. Read cards through a **small interface** that 10-5 later implements
against Room, seeded in development from `Brands.kt` plus fixtures. Two rules:

- The seeding path must be **debug-only**. watchOS shipped a DEBUG sample-card seeder and Story 9-5 had
  to go back and gate it to the empty state because it crowded the real UI in dev builds. Gate it from
  the start.
- Do **not** invent a persistence layer here. 10-5 owns the schema; a second storage path is exactly the
  debt Story 5-9 (`remove UserDefaults fallback`) existed to remove.

## Acceptance Criteria

**AC1 — Card list renders.**
A Wear OS list shows every locally-stored card as a row: colour accent bar, initials avatar in the
brand/card colour with contrast-correct text, and the card name. Long names truncate rather than wrap or
overflow.

**AC2 — Initials and colour match the watchOS rules.**
Catalogue cards derive initials from the **brand name** (falling back to brand id), custom cards from
the **card name**. Avatar text flips between light and dark by background luminance, mirroring
`shouldUseWhiteText(onBackgroundHex:)`. An unparseable or missing colour falls back safely instead of
crashing.

**AC3 — Favourite indicator (mirror 9-4).**
Cards with `isFavorite == true` show a star/pin badge, visually consistent with the phone's star. A card
whose payload omits `isFavorite` renders as **not** favourite — no crash, no data loss (9-4 AC4).

**AC4 — Favourites pin to the top in every sort mode.**

**AC5 — Three selectable sort modes (mirror 9-5)** with the orderings tabulated above, reachable from
the list via a picker affordance, and applied immediately.

**AC6 — Sort default is A-Z and the choice persists watch-locally.**
First launch sorts A-Z. The selection survives app restart, is stored under the watch's own key, and is
**never** transmitted to the phone.

**AC7 — A-Z is case- and diacritic-insensitive.**
`Èsselunga`, `esselunga` and `Esselunga` order together. Covered by a test with accented input, not by
inspection.

**AC8 — Round-screen safe.**
Verified on a **round** Wear OS emulator and a **square/rectangular** one: no row content clipped at top
or bottom, the picker is fully reachable, and the list scrolls via rotary input. Record both device
profiles in the Dev Agent Record.

**AC9 — Density and tap targets.**
Row metrics ported from `WatchCardRowLayoutMetrics.compact` with tap targets at **≥ 48 dp** (the Android
minimum, deviating from watchOS's 44 — documented inline). Row content must not truncate at the density
chosen.

**AC10 — Empty state.**
With no cards, a clear empty state explains that cards come from the phone — mirroring
`CardListView.swift:568-580`. This is the state a user sees before first sync, so it must not read as an
error.

**AC11 — Row tap is wired but inert.**
Tapping a row invokes a single navigation seam that 10-4 fills with the barcode screen. It must not
half-implement barcode display.

**AC12 — Localisation is not hardcoded English.**
All user-facing strings go through Android string resources with `en` and `it` values, mirroring
`targets/watch/{en,it}.lproj` and `WatchLocalization.swift`. The app is `en` + `it`; Italian is the
primary audience. Note the phone has **no** locale-parity test, so a missing `it` string fails silently
— add both at the same time.

**AC13 — Read-only invariant holds.**
Nothing in this story writes card data anywhere. Story 9-5 hardened a watchOS test into
`test_readOnly_localCardEdits_doNotPersistAcrossReload` — proving a local edit never persists across a
store reload. Add the equivalent guard here rather than a vacuous assertion.

**AC14 — Tests.**
Kotlin unit tests for the three orderings, favourites-first in each, the A-Z diacritic case, the
`frequent` mixed-`null` tier, the A-Z default, and preference round-trip — mirroring the eight XCTests
Story 9-5 added to `watch-ios/Tests/CardStoreTests.swift`. **Plus** be explicit in the Dev Agent Record
about whether these actually run in CI (see [Testing](#testing-requirements)).

**AC15 — No regression.**
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn tokens:check`, `yarn splash:check`,
`yarn check:catalogue-generated`, `yarn watch:build` pass from the main checkout; `./gradlew assembleDebug`
and the Kotlin unit tests pass in `watch-android/`.

## Tasks / Subtasks

- [ ] **Task 1 — Card model + read seam (AC: 1, 13)**
  - [ ] A Kotlin model mirroring `WatchCard`'s decoded shape: `id`, `name`, `brandId`, `colorHex`,
        `barcodeValue`, `barcodeFormat`, `usageCount`, `lastUsedAt`, `createdAt`, `isFavorite`.
        `isFavorite` **defaults to false**; `lastUsedAt` and `brandId` are nullable.
  - [ ] **Dates as strings**, per `docs/project-context.md`'s watch rule — parse only for display or
        comparison. Do not introduce `Instant`-typed fields that 10-5/10-6 must undo.
  - [ ] Define the read-only repository interface 10-5 will implement. Debug-only seeding, gated to the
        empty state.

- [ ] **Task 2 — Row and list UI (AC: 1, 2, 3, 9, 10)**
  - [ ] Port `WatchCardRowLayoutMetrics.compact` into a single Kotlin metrics holder — one source of
        truth, as on watchOS, so the numbers are testable and not scattered through composables.
  - [ ] Row: accent bar, initials avatar with luminance-driven text colour, name, favourite badge.
  - [ ] Port the initials and contrast helpers from `ColorHelpers.swift` / `CardListView.swift:277`.
        Mirror the phone's `shared/theme/luminance.ts` thresholds; do not invent a new cutoff.
  - [ ] Empty state per AC10.

- [ ] **Task 3 — Round-screen correctness (AC: 8)**
  - [ ] Use the Wear Compose scaling list container, **not** `LazyColumn`. Confirm the current class name
        against the installed BOM.
  - [ ] Shape-aware padding so first/last rows are never clipped on a round device.
  - [ ] Rotary/bezel scrolling wired and verified.

- [ ] **Task 4 — Sort (AC: 4, 5, 6, 7)**
  - [ ] A sort-mode enum with a stable persisted raw value and a deterministic display order.
  - [ ] Comparators per the table. **Read Story 9-5's notes on the `frequent` mixed-`null` tier and the
        diacritic fix before writing them** — both were review findings, not first drafts.
  - [ ] Locale-aware `Collator` for A-Z; verify empirically that the chosen strength ignores accents for
        `it`, with an accented fixture.
  - [ ] Persist watch-locally, default A-Z. Never transmit.
  - [ ] Picker affordance. Story 9-5 left the exact affordance to UX ("sheet vs inline list vs Digital
        Crown"); watchOS shipped a toolbar button plus a `.sheet`. Open Decision 4.

- [ ] **Task 5 — Localisation (AC: 12)**
  - [ ] `en` + `it` string resources for every user-facing string, added together.

- [ ] **Task 6 — Tests, verification, docs (AC: 13, 14, 15)**
  - [ ] The AC14 unit tests plus the AC13 read-only guard.
  - [ ] Run on a round and a square emulator; record both.
  - [ ] Update `watch-android/README.md`: sort semantics, the A-Z default and why it differs from the
        phone, and the 48 dp deviation.

## Dev Notes

### Anti-patterns — do NOT do these

| ❌ Don't                                          | ✅ Do instead                                                                             |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Use a plain `LazyColumn`                          | The Wear Compose scaling list container — the round-screen idiom                          |
| Copy `minimumTapHeight: 44` verbatim              | 48 dp on Android, documented inline                                                       |
| Add brand logo artwork to rows                    | Initials on a coloured circle — that is the shipped design (`CardListView.swift:372-389`) |
| Default the sort to `frequent` "for phone parity" | **A-Z** — the deliberate 2026-06-09 watch decision                                        |
| Sync the sort preference to the phone             | Watch-local. It is UI state, which is why it is allowed at all                            |
| Compare names with `lowercase()`                  | Locale-aware `Collator`, accent-insensitive (9-5 review finding #5)                       |
| Build a persistence layer here                    | Read seam only; 10-5 owns Room (Story 5-9's lesson)                                       |
| Ship an ungated debug seeder                      | Debug-only **and** empty-state-gated, as 9-5 had to retrofit                              |
| Implement the barcode screen                      | 10-4 owns it. Wire an inert navigation seam                                               |
| Write card data anywhere                          | Read-only; ADR-2026-06-09-001 permits only `CARD_USED`, which is 10-6's                   |
| Hardcode English strings                          | `en` + `it` resources together — nothing catches a missing `it`                           |
| Invent new luminance thresholds                   | Mirror `shared/theme/luminance.ts` / `ColorHelpers.swift`                                 |

### Testing requirements

- Phone-app gates from any installed checkout (worktree included); Kotlin tests via Gradle in
  `watch-android/`.
- **Be honest about what CI runs.** The watchOS precedent is a trap worth naming: Swift XCTests in
  `watch-ios/Tests/` **do not run in CI** — the watch scheme has no `xcodebuild test` step, so
  `yarn watch:build` only proves it _compiles_. The project compensated with
  `targets/watch/__tests__/watch-layout-contract.test.ts`, a **TypeScript** test that reads Swift source
  as text and asserts on it, which _is_ CI-enforced. For Wear OS, Gradle unit tests **can** genuinely run
  in CI — so either wire them into the Open-Decision-5 job from 10-1, or state plainly in the Dev Agent
  Record that they run locally only. Do not leave the reader to infer coverage that does not exist.
- A TS layout-contract test asserting on `Brands.kt`/Kotlin source is available as a cheap CI-enforced
  guard if Gradle tests stay local-only.

### Previous story intelligence

**Story 5-3** built the watchOS list; **5-10** tuned its density (the `compact` metrics); **9-4** added
the favourite badge and the `isFavorite` payload field with a backward-compatible default; **9-5** added
selectable sort and went through **three review rounds**. 9-5 is the most valuable read: findings #1
(frequent mixed-`nil` parity) and #5 (A-Z diacritics) are both bugs a fresh implementation will
reproduce unless it starts from the fix. It also verified every API against official docs before coding
(its AC6) — worth repeating for Wear Compose, whose list API has been renamed across versions.

**Story 5-9** removed a `UserDefaults` fallback storage path — the reason this story defines a read seam
instead of a store.

**Sentry has effectively no Android telemetry** (~10 events / 90 days, 100 % iOS). A layout defect here
will be invisible in production; AC8's two-shape verification is the only real gate. This sprint's
`wave_0b` story 16-22 exists because exactly that blind spot let a phone card-grid overlap ship.

### Design language

`docs/ux-design-specification.md:216` — "**Carbon Utility:** Minimalist, OLED-black focused,
high-density" — the watch design language, shared with watchOS. `:202` notes the vertical list on watch
vs the phone's grid. Wear OS's own guidance also favours a dark, high-contrast surface, so the two
align; no new palette is required. Card colours come from the catalogue, not the theme.

## Out of scope — flagged, not fixed

1. **Barcode display** → 10-4.
2. **Room storage** → 10-5. This story defines the read interface only.
3. **Sync / `CARD_USED` emission** → 10-6. Tapping a row must not emit a usage event yet — that is
   10-6's, and it is the one write the watch is permitted.
4. **A Wear OS complication** — parked Epic 5 follow-up, still with **no story number** in Epic 10.
5. **Search.** The phone has a search bar above the grid; watchOS has none. Not adding one.
6. **Card detail / edit / delete.** The watch is read-only by design.

## Open Decisions — binding defaults, implement as written

1. **Port the `compact` metrics rather than redesigning**, with the 48 dp tap-target change. Story 5-10
   already paid for this tuning on a small screen.
2. **Wear Compose scaling list container, not `LazyColumn`.** Confirm the class name against the
   installed BOM at implementation time; this story pins the requirement, not the symbol.
3. **Persist the sort mode with Jetpack DataStore (Preferences), not `SharedPreferences`.** DataStore is
   the current recommendation and is async-safe. Key it under a watch-local namespace mirroring
   `watch.sortMode`. If 10-1's scaffold already pulled in DataStore, use it; if adding it is
   disproportionate for one enum, `SharedPreferences` is acceptable — record which you chose and why.
4. **Picker affordance: a full-screen selection list reached from a list-header or toolbar control**,
   mirroring watchOS's toolbar-button-plus-sheet. Rationale: 9-5 left this to UX and no Wear OS design
   exists; a full-screen list is the safest round-screen affordance and needs no new design input. If
   @ifero wants something else, it is a small change.
5. **Initials: 1–2 characters**, mirroring `initials(from:)`. Port the helper's behaviour rather than
   re-deriving it, including whatever it does with single-word and empty names.
6. **Fall back to a neutral grey for an unparseable colour**, never crash and never render an invisible
   avatar.

## References

- `targets/watch/CardListView.swift` — the mirror; `:277` helper index, `:323-350` row composition,
  `:372-389` initials/colour, `:348` favourite badge, `:493-520` toolbar + sort entry, `:568-580` empty
  state, `:636-645` sort picker rows
- `targets/watch/WatchPresentationLayout.swift:11-35` — `WatchCardRowLayoutMetrics.compact`
- `targets/watch/ColorHelpers.swift` — hex parsing + contrast helpers
- `targets/watch/WatchLocalization.swift`, `targets/watch/{en,it}.lproj` — localisation pattern
- `features/cards/hooks/useCardSort.ts` — the phone's canonical sort semantics (9-5: "do not re-invent")
- `shared/theme/luminance.ts` — the phone's luminance thresholds
- `docs/sprint-artifacts/stories/5-3-implement-card-list-carbon-ui.md` — mirror story
- `docs/sprint-artifacts/stories/5-10-watch-barcode-legibility-list-density.md` — density ACs
- `docs/sprint-artifacts/stories/9-4-sync-sorting-to-watch.md` — favourite badge, `isFavorite` default
- `docs/sprint-artifacts/stories/9-5-selectable-watch-sort.md` — sort modes, A-Z default, diacritics,
  mixed-`nil` tier, UI-state-not-card-data rationale, DEBUG-seeder gating
- `docs/sprint-artifacts/stories/5-9-remove-userdefaults-fallback.md` — why not to add a second store
- `docs/adr-2026-06-09-watch-usage-events.md` — read-only rule + the `CARD_USED` exception
- `docs/ux-design-specification.md:202`, `:216` — Carbon Utility, watch list vs phone grid
- `docs/project-context.md` — Watch App Rules; dates as strings
- `targets/watch/__tests__/watch-layout-contract.test.ts` — CI-enforced native-source contract test

## Dev Agent Record

### Agent Model Used

_To be filled by the dev agent._

### Debug Log References

### Completion Notes List

### Device / Emulator Verification (AC8)

| Shape       | Device / emulator | API | Theme | Result |
| ----------- | ----------------- | --- | ----- | ------ |
| Round       |                   |     |       |        |
| Square/rect |                   |     |       |        |

### Do the Kotlin tests run in CI? (AC14)

_State yes/no explicitly and how._

### File List
