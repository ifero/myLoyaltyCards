---
title: 'Story 22.2: Wallet — the four Cardì wallet frames'
type: 'feature'
created: '2026-10-05'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '05d95b91259e7d0633baea447f78f1c897c9d9bf'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The wallet (home) still draws its pre-Cardì layout: a 40pt grey search bar, a beam
sort control opening a shadowed dropdown, an empty state with an invented illustration and a
glowing 240×50 button, and filled icons in a white header bar. Story 22.1 shipped the primitives;
the wallet does not use the frames yet.

**Approach:** Implement the four wallet frames — populated, empty, single card, no-results — from
`docs/design/cardi/frames/cardi-wallet-frames.html` and `stitch-prompts-wallet.txt` on 22.1's
primitives, light and dark, with `cardi-design-system.md` winning any conflict.

## Boundaries & Constraints

**Always:**

- The phone grid stays two columns. `features/cards/utils/gridLayout.ts` and its tests are not
  changed (tile 171:140 r16, single 220×180 r20, badge 24 inset 6, 16pt margins and gutter).
- No bottom tab bar, no FAB. Home keeps `+` on the left (→ `/add-card`) and the gear on the right
  (→ `/settings`) in its header.
- Branded tiles render the catalogue hex and mark exactly: no tint, wash, overlay, opacity or
  recolour. Pressed feedback is the 0.98× scale only.
- No large yellow (beam) chrome surface sits next to the grid, in either scheme.
- Search and sort exist only at two or more cards, and stay visible when a search matches nothing.
- Theme roles only, never hex literals; type from `TYPOGRAPHY`; every tappable at least
  `TOUCH_TARGET.min`; edge-anchored controls include safe-area insets; strings in `en.ts` and
  `it.ts`; pressed visuals via `onPressIn`/`onPressOut`, never a `style={({ pressed }) => …}`.
- Every library API is checked against current documentation (Context7, pinned to this repo's
  versions — Expo SDK 55, React Navigation 7, FlashList 2, Reanimated 4, lucide-react-native) or the
  installed source in `node_modules/` before it is used. Nothing is implemented from memory or by
  assumption.

**Decided (ifero, 2026-10-05):**

- **Header:** the native header stays, restyled on Home only to frame A — ground colour, no divider,
  the title centred in `headlineMd`, outline icons in `textPrimary` (cream in dark, beam today). Its
  button treatment stays the platform's own: on iOS 26 the system's Liquid Glass bubbles show where
  the OS draws them, and nothing removes or adds them (no `unstable_header*Items`, no
  `hidesSharedBackground`).
- **Icons:** `lucide-react-native` becomes the system's one outline icon family, starting on the
  wallet.
- **Copy:** the frames' copy in both locales — the count "{{count}} card" / "{{count}} cards"
  ("{{count}} carta" / "{{count}} carte"), the CTA "Add your first card" ("Aggiungi la tua prima
  carta"), curly quotes around the query.
- **Sort:** the sort button opens the shared `BottomSheet` as an option list of the three shipped
  sorts; the row shows the current sort's label; no new sort.
- **Banners:** the guest banner's two actions are both outlined (`secondary`) in both schemes, and
  the guest, migration and sync banners sit on the 16pt grid margin; their washes and icons stay.
- **Highlight (#251 item 15):** a just-added card's ring plays once; `highlightCardId` clears when
  the ring finishes.

**Never:**

- Commit, push, or change `docs/sprint-artifacts/sprint-status.yaml` or any other tracker file —
  the orchestrator owns all three.
- Change the shared `screenOptions` header of other routes, or any screen other than Home: 22.3–22.9
  own theirs.
- Add an illustration, an add-card tile, category headers or new navigation chrome.
- Position the empty state's footer absolutely.

## I/O & Edge-Case Matrix

| Scenario   | Input / State                   | Expected Output / Behavior                                                                                                                  | Error Handling                |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Empty      | 0 cards                         | Frame B: no search or sort; title and subtitle centred between header and footer; footer = full-width hairline + 52pt CTA → `/add-card`     | pull-to-refresh still syncs   |
| Single     | 1 card                          | Frame C: 220×180 r20 tile centred 32pt below the header, name 8pt below, tip 16pt below in `textSecondary`; no search, sort or footer       | badge shown only if favourite |
| Populated  | ≥2 cards, empty query           | Frame A: search field, sort row (count of all cards; current sort label + chevron), grid                                                    | N/A                           |
| Filtered   | ≥2 cards, query matches k ≥ 1   | a grid of k tiles — k = 1 stays a grid cell, not frame C; the count reads k                                                                 | N/A                           |
| No results | ≥2 cards, query matches nothing | Frame D: field keeps its value and clear ×; sort row reads 0; one centred `cards.home.noResults` line 80pt below the controls; nothing else | whitespace-only query = none  |
| Clear      | × pressed                       | query emptied, focus stays in the field, the grid returns                                                                                   | N/A                           |
| Sort       | sort button pressed             | sheet lists the three sorts, current one marked; choosing re-sorts, closes the sheet, updates the row label, persists as today              | dismiss keeps the sort        |
| Just added | `newCardId` param               | that tile plays the beam ring once, when it first renders; remounting, scrolling back or cell recycling does not replay it                  | N/A                           |
| Favourite  | `isFavorite`                    | ink plate with beam star; a screen reader hears the name and "favourite"                                                                    | N/A                           |
| Dark       | dark scheme                     | same layouts on black: ink surfaces, `#3A3A48` hairlines, cream text; no beam-filled surface above the grid, banners included               | N/A                           |
| Load       | first load / load failure       | spinner / error line, unchanged                                                                                                             | unchanged                     |

</frozen-after-approval>

## Code Map

- `app/_layout.tsx:76-116,180-187` -- `HeaderLeft`/`HeaderRight` (MaterialIcons 28/26 in
  `theme.primary`, in a Unistyles-processed file) and the `index` options; shared `screenOptions`
  at `:153-178` stay as they are.
- `features/cards/screens/HomeScreen.tsx:83-104` -- banners above `CardList`; highlight set at `:85`.
- `features/cards/components/CardList.tsx` -- loading `:140`, error `:149`, single `:158-183` (tip in
  `textTertiary` at `:178`), FlashList `:186-218` (header `:240-245`, no-results `:262-271`).
- `features/cards/components/SearchBar.tsx` -- 40pt, `#EFEFF1`/`#2C2C2E`, 2pt `primary` border when
  filled, MaterialIcons 16/18; keep its testIDs and a11y labels.
- `features/cards/components/SortFilterRow.tsx` -- label and caret in `primary`; RN `Modal` menu with
  shadow and literals (`:78-125`); keep `-count`, `-sort-button`, `-option-<key>` testIDs.
- `features/cards/components/EmptyState.tsx` -- illustration with `#FFCC00`/`#E2231A`, glow, 240×50.
- `features/cards/components/CardTile.tsx:141-158` -- composes `Tile`; a11y label is the name only.
- `shared/components/ui/Tile.tsx` -- label `marginTop: 6` (`:245`); ring `:145-155`. Only `CardTile`
  renders it, so its changes reach Home alone.
- `shared/components/ui/PrimaryActionFooter.tsx` -- `margin="grid"` exists for this empty state.
- `shared/components/ui/Button.tsx` -- `variant`, `size="large"` (52pt).
- `shared/components/ui/BottomSheet.tsx` -- `visible`, `onClose`, `title`, `testID`; uses
  `scheduleOnRN`. Option-list precedents: `features/settings/components/LanguagePickerSheet.tsx`
  (48pt rows, hairline rules, check on the selected row) and
  `features/add-card/components/MultiCodePickerSheet.tsx:171-179` (rules edge to edge).
- `features/auth/components/GuestModeBanner.tsx:139` and `:164`, `features/auth/MigrationBanner.tsx:114`,
  `shared/components/SyncErrorBanner.tsx:99`, `shared/components/SyncIndicator.tsx:126` -- the
  primary button and the 32pt margins; all four render on Home only.
- `shared/i18n/locales/en.ts:560-580`, `it.ts:560-581` -- wallet copy.
- `jest.setup.js:250-254` -- the FlashList mock drops the header when data is empty; FlashList 2.0.2
  renders both (`node_modules/@shopify/flash-list/src/recyclerview/hooks/useSecondaryProps.tsx:61-96`).
- `jest.config.js:9-11` -- `transformIgnorePatterns`, in case lucide's modules need transforming.
- Copy-pinning tests: `CardList.test.tsx`, `SearchBar.test.tsx`, `SortFilterRow.test.tsx`,
  `EmptyState.test.tsx`, `shared/i18n/italian-rendering.test.tsx`.

## Tasks & Acceptance

**Execution:**

- [x] `package.json`, `yarn.lock` -- `npx expo install lucide-react-native`; confirm the lockfile adds
      only it; import each icon from `lucide-react-native/icons/<name>` (lucide's own advice under
      Metro), and make Jest load it -- the one outline family.
- [x] `shared/i18n/locales/en.ts`, `it.ts` -- the decided copy; add `cards.sort.sheetTitle` ("Sort by"
      / "Ordina per") and `cards.home.cardTileFavouriteAccessibilityLabel` ("{{name}}, favourite" /
      "{{name}}, preferita"); remove `emptyStateIllustrationAccessibilityLabel` -- strings first.
- [x] `jest.setup.js` -- the FlashList mock renders the header together with the empty component, as
      FlashList 2.0.2 does -- makes the no-results contract testable.
- [x] `shared/components/ui/Tile.tsx` (+ test) -- label `marginTop: 8`; optional `onHighlightEnd`,
      called once when the fade finishes (`withTiming` callback → `scheduleOnRN`).
- [x] `features/cards/components/CardTile.tsx` (+ test) -- the favourite label; forward
      `onHighlightEnd`.
- [x] `features/cards/components/HomeHeaderButtons.tsx` (+ test) -- `HomeAddButton` (`plus`) and
      `HomeSettingsButton` (`settings`): 24px, stroke 1.5, `textPrimary`, a 48×48 raw-RN `Pressable`
      outside `app/`, 0.98 press, labels `navigation.addCard`/`navigation.settings` -- the frame
      header, and the first tests these buttons have.
- [x] `app/_layout.tsx` -- `index` options only: `headerStyle` `theme.background`,
      `headerShadowVisible: false`, `headerTitleAlign: 'center'`, `headerTitleStyle` from
      `TYPOGRAPHY.headlineMd`'s family, size and weight; `headerLeft`/`headerRight` render the new
      buttons; delete the old pair.
- [x] `features/cards/components/SearchBar.tsx` (+ test) -- the frame field per Design Notes (`search`,
      `x`).
- [x] `features/cards/components/SortFilterRow.tsx` (+ test) -- the row per Design Notes
      (`chevron-down` 14); the `BottomSheet` option list titled `cards.sort.sheetTitle`: three rows
      ≥48pt with rules edge to edge, label `bodyLg` `textPrimary`, `check` 24 in `primary` plus
      `accessibilityState.selected` on the current sort; choosing calls `onSortChange` and closes.
- [x] `features/cards/components/EmptyState.tsx` (+ test) -- the whole of frame B, taking a
      `refreshControl` element from `CardList`: a `flex: 1` column whose `ScrollView` (`flexGrow: 1`,
      the text centred, no illustration) sits above `PrimaryActionFooter margin="grid"` as its flex
      sibling, holding `Button variant="primary" size="large"` `empty-state-cta` → `/add-card`.
- [x] `features/cards/components/CardList.tsx` (+ test) -- at zero cards render `EmptyState` (with
      the refresh control) instead of the FlashList, whose empty slot is then only no-results; header
      and no-results spacing per Design Notes; tip `textSecondary`; scroll content pads
      `insets.bottom`; every `RefreshControl` tinted `theme.primary`; wire `onHighlightEnd`.
- [x] `features/cards/screens/HomeScreen.tsx` (+ test) -- clear `highlightCardId` on `onHighlightEnd`.
- [x] `GuestModeBanner.tsx`, `MigrationBanner.tsx`, `SyncErrorBanner.tsx`, `SyncIndicator.tsx`
      (+ tests) -- `marginHorizontal` → `SPACING.md`; the guest "Create account" → `secondary`.
- [x] `docs/design/cardi/cardi-design-system.md` -- one sentence under _Card tile_: the single-card
      tile is 220×180 at radius 20, the same proportion as 16 on 171.
- [x] `docs/design/cardi/cardi-design-system.md` -- name Lucide under _Icons_, with the per-icon
      import rule, so 22.3–22.9 inherit the decided family.

**Acceptance Criteria:**

- Given each of the four states in light and dark, when Home renders, then it matches its frame per
  the matrix and the Design Notes.
- Given two or more cards at any window width, when the grid renders, then it has two columns and
  `gridLayout.test.ts` passes unchanged.
- Given any state, when the header renders, then it shows only `+` (left, → `/add-card`) and the gear
  (right, → `/settings`) as 48pt outline icons with the platform's own button treatment, and the
  title "Cardì" centred in `headlineMd` on the ground colour with no divider; there is no tab bar and
  no FAB.
- Given a catalogue card, when its tile renders or is pressed, then its fill is the catalogue hex
  exactly, with no opacity, tint or overlay.
- Given dark mode and a guest with five cards, when Home renders, then no beam-filled surface sits
  above or beside the grid.

## Implementation Notes

**Step 3 (2026-10-05).** Built by a context-free subagent from this spec, then checked against the
diff rather than its report.

Beyond the task list:

1. `HomeScreen` consumes `newCardId` with `router.setParams`, clearing both params, instead of
   `router.replace('/')`. On device, `replace('/')` swapped in a new Home route, which remounted the
   screen and dropped the highlight before any tile drew it, so the just-added ring never played —
   on `main` too. The "Just added" row needs it.
2. Every `RefreshControl` also sets `colors` and `progressBackgroundColor={theme.surface}`: Android
   ignores `tintColor`, and the surface disc keeps dark mode's beam spinner off white.
3. `jest.config.js` maps `lucide-react-native/icons/*` to the package's CommonJS build, because
   Jest's `browser` condition resolves an ESM file it cannot parse; the router mock gains
   `setParams`; the FlashList mock captures `refreshControl`; two spacing mocks spread
   `requireActual`.
4. The matrix audit found no test of the badge on the enlarged tile; one was added to
   `CardTile.test.tsx`. `cardi-design-system.md` § _Icons_ names Lucide, following the decision.

Choices where the spec was silent: the chevron keeps the frame's stroke 2; each sheet row carries a
rule above it, as the settings frames draw them; the search field keeps a fixed 48pt height, since a
minimum would let the 48pt × target grow it.

Verification, rerun by the orchestrator without pipes: `typecheck`, `lint` (0 warnings),
`format:check`, `tokens:check` and the five `check:*` scripts all exit 0; `test:coverage` passes 204
suites and 2,892 tests at 94.34 % statements and 88.14 % branches. On an iOS 26.5 simulator at 393pt,
light and dark: empty, single, populated, no-results, a guest with five cards and the sort sheet, each
checked against its frame; the ring was captured on screen, clearing at about 2.2 s. Android is
unverified: this host has no emulator.

**Step 4, pass 1 (2026-10-05).** 34 findings: 26 patched by the implementer, 6 deferred, 2 rejected
(the Review Triage Log). The ring now reports its end however it ends, and the tile cancels it on an
unmount or when `highlighted` turns false, so an interrupted ring cannot replay; a root-layout test
pins the Home header options; the grid sets `keyboardShouldPersistTaps="handled"`; the no-results
line quotes the trimmed query; the offline strip joins the 16pt margin; the sort button is at least
48pt wide; the Unistyles guard checks the subject's own path and every import form; ESLint refuses a
Lucide root import; the English label reads "favorite"; and the design system records the single
tile's 20, the in-field glyph ruling and the MaterialIcons holdouts.

**ifero's review loops (2026-10-06), fresh read-only Sonnet reviewers.** Code review: round 1 found
three misleading comments (the tile test's "rest of the session", the frame D comment above the wrong
test, `CardList`'s header), fixed; round 2 approved with zero comments. QA: round 1 found the search
input only as tall as its line, so taps above or below the text missed it — it now fills the field
(`height: '100%'`, as `BrandSearchBar` does) — and a contrast-test comment still listing the wallet's
moved `textTertiary` consumers, both fixed; round 2 approved with zero comments.

**Device verification (2026-10-06, at ifero's request).** On the iOS 26.5 simulator, served from this
branch, every state was captured in light and dark — empty, single, populated, no-results, the sort
sheet and a five-card guest wallet — and the ring before, during and after its hold, with
`highlightCardId` cleared afterwards. Real taps showed the search field focusing from 4pt below its
top edge, and one tap on × clearing the query with focus kept. The check found one defect that no test
or reviewer had: clearing a search that had narrowed the grid scrolled the search field off the
screen. FlashList 2 anchors the first visible item across data changes by default
(`maintainVisibleContentPosition`; its own known issue, "data re-ordering can cause items to move"),
so the first match stayed put while the grid refilled above it. The wallet's FlashList now disables
it (`KEEP_SCROLL_OFFSET`, with a test), and the same sequence stays at the top. Also seen, and
recorded rather than fixed: four keystrokes injected within milliseconds lost all but the first
while the list re-filtered; keystrokes at a human pace all registered, and the field is controlled
exactly as on `main`.

The fix came after both loops had approved, so both ran again on the final code: code review round 3
and QA round 3, fresh Sonnet reviewers, each approved with zero comments. Final verification, without
pipes: every gate exits 0 (`lint` with 0 warnings), and `test:coverage` passes 205 suites and 2,904
tests at 94.35 % statements and 88.13 % branches. One earlier run lost
`CardDetails.brightness.test.tsx`, a file this story does not touch, to the known jest-worker SIGSEGV;
it passed on its own and in the full re-run.

### Found, not fixed

Filed for triage as #258, numbered as below.

1. Home and `CardList` each call `useCards()`; Home's copy loads once, so the guest threshold lags.
2. `pendingChangeCount={0}` (`HomeScreen.tsx:107`): the offline strip can never show.
3. Hardcoded English reaches the banners (`useGuestMigration.ts:105,112,123`, `useCloudSync.ts:29`,
   `useAutoSync.ts:17,76`, `useCards.ts:55`).
4. `MigrationBanner`'s Retry and dismiss have no 48pt target (`MigrationBanner.tsx:127-141`).
5. The load-error state prints the raw error string and offers no pull-to-refresh (`CardList.tsx`,
   the `error` branch).
6. Sort and guest-dismissal state live in AsyncStorage, not `expo-sqlite/kv-store`.
7. `it.ts:301` "verra" lacks its accent; `useCards` is a `function` declaration.
8. `useAddCard.ts:93` reaches Home with `router.replace`, leaving a second Home route underneath:
   swiping back on Home reveals a stale one.
9. The shared Reanimated mock's `useSharedValue` returns a new object on every render, unlike the
   real hook, so an effect listing a shared value re-runs on each render in tests. `Tile.test.tsx`
   uses a faithful local stand-in; the shared mock is unchanged.
10. The just-added ring can play unseen. Under the default "frequent" sort a new card sorts after
    every used card (`useCardSort.ts:39-51`), FlashList renders ahead of the viewport and nothing
    scrolls the card into view, so its one ring — played when the tile first renders — can run off
    screen. A follow-up could scroll to the new card, or start the ring when the tile becomes visible.
11. The shared back button in the root `screenOptions` is a Unistyles-processed `Pressable` in
    `app/_layout.tsx`, the header flicker the house rules warn about. `HeaderIconButton` could move to
    `shared/components/ui/` and serve it when 22.3–22.9 restyle their headers.
12. `SyncErrorBanner.test.tsx` and `SyncStatusContainer.test.tsx` still mock `TOUCH_TARGET` as the
    retired `{ min: 44, recommended: 48 }` (#251 item 9).
13. `CardList.test.tsx` and `GuestModeBanner.test.tsx` mock a pre-rebrand, light-only palette, so
    their dark-mode reasons are asserted only by role.

## Spec Change Log

## Review Triage Log

**Pass 1 (2026-10-05)** — layers: BH blind-hunter, ECH edge-case-hunter, VG verification-gap, PC
project-conventions. No `intent_gap` or `bad_spec`; the patches went back to the implementer.

| #   | Layer | Location                                                               | Finding                                                                  | Verdict | Evidence                                                                                                                                                                                     | Route         |
| --- | ----- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | PC    | `italian-rendering.test.tsx:74`                                        | The new block sits between the 21.2a JSDoc and the test it documents     | low     | Lines 64-73 now describe the wallet test; the colour-picker test lost its comment                                                                                                            | patch         |
| 2   | PC    | `HomeHeaderButtons.test.tsx:106-107`                                   | The Unistyles guard cannot catch a move into `app/` or a bare import     | low     | The plugin processes any path containing `<root>/app` (`index.js:784`) and any `react-native-unistyles` import (`:867`); the test checks its own `__dirname` against `/app$/`                | patch         |
| 3   | PC    | `app/_layout.tsx:81,156-159`                                           | The Home header options are untested                                     | medium  | Same root as 6                                                                                                                                                                               | patch, with 6 |
| 4   | PC    | `jest.setup.js:233-234,271`                                            | The FlashList mock still forwards `onRefresh` and `refreshing`           | low     | No FlashList passes them now: `CardList` moved to `refreshControl` and `CatalogueGrid` never did                                                                                             | patch         |
| 5   | PC    | `EmptyState.test.tsx:15` and two more                                  | A three-level relative import of `.storybook/StoryDecorator`             | low     | project-context: relative only within a feature, at most 2 levels; `@/*` resolves in tsconfig and Jest                                                                                       | patch         |
| 6   | VG    | `app/_layout.tsx:150-161`                                              | The `index` header options are never read by a test                      | medium  | Pre-verified gap: swapped buttons, a dropped `headerTitleAlign` or a reverted `surface` all keep CI green                                                                                    | patch         |
| 7   | VG    | `italian-rendering.test.tsx:64-78`                                     | The orphaned 21.2a comment                                               | low     | Same root as 1                                                                                                                                                                               | patch, with 1 |
| 8   | ECH   | `Tile.tsx:162-178`                                                     | A recycled cell's running ring clears the highlight a re-drawn ring uses | medium  | Nothing cancels the ring when `highlighted` turns false; its end clears the id and cuts the second ring short, and that second ring is itself a replay the matrix forbids                    | patch         |
| 9   | ECH   | `Tile.tsx:170-175`                                                     | A ring cut short by an unmount never reports, so it replays              | medium  | `useSharedValue` cancels on unmount (`useSharedValue.ts:21-23`), the callback gets `finished: false`, and the id stays set — a search hiding the tile, or a sync turning frame C into a grid | patch, with 8 |
| 10  | ECH   | `CardList.tsx:173-180`                                                 | The error state has no pull-to-refresh                                   | low     | Pre-existing: the error branch never had one                                                                                                                                                 | defer         |
| 11  | ECH   | `cardi-design-system.md:477-478`                                       | "the same proportion as 16 on 171" is not exact                          | low     | 20/220 is 0.091 and 16/171 is 0.094                                                                                                                                                          | patch         |
| 12  | ECH   | `GuestModeBanner.tsx:76-86`                                            | A beam-tinted panel still sits above the grid                            | false   | The wash is 10 % (`1A`), which the design system allows and the decision kept; no surface is beam-filled                                                                                     | reject        |
| 13  | BH    | `CardList.tsx:228-240`                                                 | The clear × needs two taps while the keyboard is up                      | medium  | FlashList forwards `...rest` to its scroll view (`RecyclerView.tsx:511`) and none sets `keyboardShouldPersistTaps`, so the first tap only dismisses the keyboard; fails the Clear row        | patch         |
| 14  | BH    | `OfflineIndicator.tsx:60`                                              | The offline strip keeps the 32pt margin                                  | low     | A sync banner, rendered only by `SyncStatusContainer` on Home; unreachable today (`pendingChangeCount={0}`)                                                                                  | patch         |
| 15  | BH    | `SortFilterRow.tsx:148`                                                | The sort button is under 48pt wide with "A-Z"                            | low     | `minHeight` only: "A-Z" + 4 + 14 is about 43pt                                                                                                                                               | patch         |
| 16  | BH    | `Tile.tsx`, `CardTile.tsx:74`                                          | "Plays exactly once" has gaps                                            | medium  | Same roots as 8 and 9                                                                                                                                                                        | patch, with 8 |
| 17  | BH    | `useCardSort.ts:67`, `CardList.tsx`                                    | The one ring can play below the fold, unseen                             | medium  | Under "frequent" a new card sorts after every used card and FlashList renders ahead of the viewport. The frozen row says "when it first renders", and on `main` the ring never played        | defer         |
| 18  | BH    | `cardi-design-system.md:713`                                           | The wallet's 20 / 18 / 14 glyphs contradict the 24px rule, unrecorded    | low     | The approved Design Notes took the frame's sizes; the design system does not record the ruling                                                                                               | patch         |
| 19  | BH    | `cardi-design-system.md:717-720`                                       | The Lucide note reads as if the wallet were done                         | low     | The favourite badge's filled star (`Tile.tsx:252`) and the banners' icons stay MaterialIcons                                                                                                 | patch         |
| 20  | BH    | `cardi-design-system.md:441-444`                                       | _Shape_ still gives every card 16                                        | low     | _Card tile_ now records the single tile at 20                                                                                                                                                | patch         |
| 21  | BH    | `eslint.config.mjs`                                                    | Nothing enforces per-icon Lucide imports                                 | low     | A root import pulls in every icon, which Metro does not tree-shake; one declarative rule enforces what this diff wrote into the design system                                                | patch         |
| 22  | BH    | `HomeHeaderButtons.test.tsx:107`                                       | The Unistyles guard                                                      | low     | Same root as 2                                                                                                                                                                               | patch, with 2 |
| 23  | BH    | `app/_layout.tsx:124-134`                                              | The shared back button is a Unistyles-processed `Pressable`              | low     | Pre-existing, and the spec forbids touching shared `screenOptions`; `HeaderIconButton` can move to `shared/` when the back button is restyled                                                | defer         |
| 24  | BH    | `SyncErrorBanner.test.tsx:17-20`, `SyncStatusContainer.test.tsx:32-35` | Mocks still override `TOUCH_TARGET` with the retired shape               | low     | Pre-existing: #251 item 9                                                                                                                                                                    | defer         |
| 25  | BH    | `italian-rendering.test.tsx:64-78`                                     | Placement, and a comment saying nothing checks the locales agree         | low     | `card-colors.test.ts:31` checks key parity; what is unpinned is the Italian values                                                                                                           | patch, with 1 |
| 26  | BH    | `jest.setup.js:350-358`                                                | The worklets mock's comment names only the sheet                         | low     | The tile's end-of-ring report now runs through it                                                                                                                                            | patch         |
| 27  | BH    | `CardList.test.tsx:112-124`, `GuestModeBanner.test.tsx:8-28`           | Pre-rebrand, light-only mock palettes                                    | low     | Pre-existing; the new assertions still tell the roles apart                                                                                                                                  | defer         |
| 28  | BH    | `CardList.test.tsx:352`                                                | The tip test's comment names `#55555F`; it asserts the mock's `#6B7280`  | low     | The assertion checks the role; the comment cites the frame's hex                                                                                                                             | patch         |
| 29  | BH    | `app/_layout.tsx:77-85`                                                | The header has no test                                                   | medium  | Same root as 6                                                                                                                                                                               | patch, with 6 |
| 30  | BH    | `app/_layout.tsx:77-85`                                                | `HOME_TITLE_FONT` would sit better in `typography.ts`                    | low     | No named harm once 6's test pins its values, and moving it adds an export                                                                                                                    | reject        |
| 31  | BH    | `typography.ts:133-135`                                                | `NAVIGATION_TITLE_FONT`'s JSDoc says Epic 22 has yet to resize the title | low     | Home's title now takes `headline-md`                                                                                                                                                         | patch         |
| 32  | BH    | `en.ts:570`                                                            | "favourite" against the locale's "favorites"                             | low     | `en.ts:637-638`; a Braille display shows both spellings                                                                                                                                      | patch         |
| 33  | BH    | `useAddCard.ts:93-96`                                                  | Adding a card stacks a duplicate Home                                    | low     | Pre-existing: Found, not fixed 8                                                                                                                                                             | defer         |
| 34  | BH    | `CardList.tsx:129`                                                     | The no-results line shows the query untrimmed                            | low     | `filterCards` trims and the line does not, so "ikea " renders inside the quotes                                                                                                              | patch         |

## Design Notes

Decided here (not user-visible beyond the frames):

- **Grid geometry is 22.1's.** The frame's badge inset 8 and 14pt star are not adopted: the shipped 6
  and 16 feed `gridLayout`'s keep-out arithmetic and frozen tests, and the design system is silent.
- **Tile name 8pt below the tile** (frame `.card` gap; 6 is off the 8-grid): each grid row moves 2pt.
- **Search field:** `TOUCH_TARGET.min` tall, `surface` fill, 1px `border`, radius 12, padding 16 and
  gap 8 (the frame's 14/10 is off-grid; 16 + 20 + 8 keeps the text at the frame's 44pt). Magnifier 20
  and clear × 18 at stroke 1.8 (1.5px rendered on a 24 grid), `textSecondary`; × on a 48×48 target
  flush right. Placeholder `textSecondary`, value `textPrimary`, `inputFont(bodyLg)`. Border turns
  `primary` while focused, as `TextField` does — not when filled. No visible label: it is not a form
  field; its accessibility label stays.
- **Sort row:** count left, button right, both `labelBold` in `textPrimary`; the row is the touch
  target tall with no extra padding, so its text sits about 16pt from the field and from the grid.
- **Header:** the native title takes no letter spacing, so `headlineMd`'s −0.01em is dropped; bar
  height and icon inset are the platform's, not the frame's exact 56/16.
- **No-results line:** top-aligned 80pt below the controls, `bodyMd` `textSecondary`, not centred.
- **Design reference:** the frames are 393×852 light only; dark comes from the system's dark rules.

Flagged, out of scope (to Found, not fixed):

1. Home and `CardList` each call `useCards()`; Home's copy loads once, so the guest threshold lags.
2. `pendingChangeCount={0}` (`HomeScreen.tsx:98`): the offline strip can never show.
3. Hardcoded English reaches the banners (`useGuestMigration.ts:105,112,123`, `useCloudSync.ts:29`,
   `useAutoSync.ts:17,76`, `useCards.ts:55`).
4. `MigrationBanner`'s Retry and dismiss have no 48pt target (`MigrationBanner.tsx:127-141`).
5. The load-error state prints the raw error string (`CardList.tsx:149-155`).
6. Sort and guest-dismissal state live in AsyncStorage, not `expo-sqlite/kv-store`.
7. `it.ts:301` "verra" lacks its accent; `useCards` is a `function` declaration.

## Verification

**Commands:**

- `yarn typecheck` -- expected: no errors.
- `yarn lint` -- expected: no errors.
- `yarn format:check` -- expected: clean, untracked docs included.
- `yarn test` -- expected: all suites green, `gridLayout.test.ts` untouched.

**Manual checks:**

- iOS simulator at 393pt, light and dark: empty, single, populated, no-results, and a guest with five
  cards; compare against the frames and measure margins, gutters and the header from screenshots.
  Android has no emulator on this host, so its header centring is unverified unless checked on a
  device.
