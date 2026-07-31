---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 16.22: Fix card-grid tile overlap on narrow screens — derive tile width from the grid cell

Status: done

Epic: 16 — Platform & Tech Debt

> **Run all gates from the main checkout, never a `.claude` worktree.** `jest.config.js` sets
> `modulePathIgnorePatterns: ['/.claude/']` and `testPathIgnorePatterns: [… '/.claude/' …]`, so
> `yarn test` inside a worktree finds **zero tests** and passes vacuously.
>
> **This CAN ship as an OTA update.** JS/TS only — no native module, no `app.json` change, no
> config plugin. Unlike Story 16.17, `runtimeVersion: { policy: 'appVersion' }` is not a blocker.
>
> **The Open Decisions at the end are binding defaults, not questions.** Implement them as written;
> do not pause to ask.
>
> **Do NOT "fix" this with `overflow: 'hidden'`.** That clips the symptom, keeps the broken width
> math, and destroys the Android `elevation: 3` shadow and the 3 pt highlight border. See
> [Anti-patterns](#anti-patterns--do-not-do-these).

## Story

As a user opening my card list on a standard Android phone,
I want the card tiles to stay inside their own columns instead of colliding in the middle of the
screen,
so that I can read and tap the right card at a checkout counter without squinting at overlapping
artwork.

## Context

### The defect

`CardTile` renders at a **hardcoded** `TILE_WIDTH = 171` pt (`features/cards/components/CardTile.tsx:35`).
`CardList` renders a fixed 2-column `FlashList` whose cells are sized by the list, not by the tile.
On any viewport narrower than **374 dp** the tile is wider than its cell, so the two tiles in a row
paint over each other.

FlashList v2 assigns each grid cell an **exact** width — it does not negotiate with the child:

```ts
// node_modules/@shopify/flash-list/src/recyclerview/layout-managers/GridLayoutManager.ts:139-141
private getWidth(index: number): number {
  return (this.boundedSize / this.maxColumns) * this.getSpan(index);
}
```

`boundedSize` is `params.windowSize.width` (`:22`, `:36`), measured by a zero-height full-width probe
view rendered **inside** the scroll view's content container
(`RecyclerView.tsx:452-462`, mounted at `:525` inside `CompatScrollView`, which receives
`contentContainerStyle`). So `boundedSize = windowWidth − 2 × 16 = windowWidth − 32`, after
`listContent.paddingHorizontal` (`CardList.tsx:198`).

Because `tileWrapper` sets no `overflow` (RN default `visible`), an oversized tile paints outside its
assigned cell rather than being clipped or reflowed. Android's `elevation: 3`
(`CardTile.tsx:209-211`) draws its shadow outside the tile bounds too, so the collision reads as a
dirty smear rather than a clean overlap.

### Verified arithmetic — where the cliff is

Current model: `cell = (W − 32) / 2`, tile fixed at 171, wrapper adds `GUTTER / 2 = 8` pt each side.

| W (dp) | cell  | tile | tiles total vs content width | Result                  | Representative devices                        |
| ------ | ----- | ---- | ---------------------------- | ----------------------- | --------------------------------------------- |
| 320    | 144.0 | 171  | 342 vs 288                   | **overlap 54 dp**       | small/older Android; large Display-size steps |
| 340    | 154.0 | 171  | 342 vs 308                   | **overlap 34 dp**       | 360 dp device at increased Display size       |
| 360    | 164.0 | 171  | 342 vs 328                   | **overlap 14 dp**       | **most common Android portrait width**        |
| 375    | 171.5 | 171  | 342 vs 343                   | ok — **1 dp** clearance | iPhone SE 2/3, 8, 12/13 mini                  |
| 390    | 179.0 | 171  | 342 vs 358                   | ok                      | iPhone 12–16                                  |
| 393    | 180.5 | 171  | 342 vs 361                   | ok                      | Pixel 6–9                                     |
| 412    | 190.0 | 171  | 342 vs 380                   | ok                      | larger Android flagships                      |

- **Tiles overlap when `W < 374 dp`.** iOS has never shown the bug because the narrowest shipped
  iPhone is 375 dp — one dp above the cliff.
- 360 dp is the most widespread Android portrait width (mid-range Galaxy/Pixel-class), which is
  exactly why the report is "**some** Android devices".
- Android's **Display size** accessibility setting raises density and therefore _lowers_ the dp
  width, so a device that is fine at default settings can cross below 374 dp. Treat the mechanism as
  established but the exact per-step numbers as **unverified** — AC7 covers it on device.

### Why 171 is the wrong kind of number

`171` is not an arbitrary design value — it is a **derived** one that was frozen as a constant:

```
(390 − 2×16 screen margin − 16 gutter) / 2 columns = 171
```

390 dp is Figma's default iPhone frame. Story 13.2 measured the tile on that frame and wrote the
result down as a fixed pt value, so it stopped being a function of the viewport.

Story 13.2's own AC1 is therefore **self-contradictory below 374 dp**:

- `13-2-restyle-home-screen.md:24` — "Each tile is 171x140pt (~1.2:1 ratio) with 16pt gutters between tiles"
- `13-2-restyle-home-screen.md:31` — "16pt horizontal screen margins on both sides"

Those two lines can only both hold at `W = 390`. This story supersedes the fixed-pt half of AC1 and
keeps the 16/16 rhythm as the real contract.

### Bonus: the current gutter and margins are already wrong everywhere

Today, on a 390 dp iPhone the tile is centred in a 179 pt cell that also carries 8 pt wrapper
padding, which yields **20 dp outer margins and an 8 dp gutter** — not the documented 16/16. The
oversized tile has been silently eating the gutter on every device. The fix below restores 16/16 on
**all** widths.

## Acceptance Criteria

**AC1 — Tile width is derived, never hardcoded.**
A new pure helper returns the grid tile width from the window width. Grid tiles render at that width.
`CardTile` no longer applies `TILE_WIDTH` as its own layout width for the grid case.

**AC2 — Overlap is arithmetically impossible.**
For every window width in the range 280–1024 dp, `2 × tileWidth + 2 × outerMargin + gutter ≤ W`, and
`tileWidth ≤ cellContentWidth`. Enforced by the contract test in AC6, not by inspection.

**AC3 — 16 pt margins and 16 pt gutters hold at every width.**
Outer screen margin is exactly 16 pt and the inter-column gutter is exactly 16 pt on all widths —
finally satisfying Story 13.2 AC1 `:24` and `:31` simultaneously. The `ListHeaderComponent`
(SearchBar + SortFilterRow) stays flush with the grid's 16 pt visual edge.

**AC4 — Zero visual change at the design reference width.**
At `W = 390` the grid tile is **exactly 171 × 140** pt, identical to today. Verified numerically in
the contract test.

**AC5 — Aspect ratio and radius preserved.**
Tile height tracks width at the design ratio `140 / 171`. `TILE_RADIUS = 16` is unchanged (a fixed
radius on a slightly narrower tile is intended — do not scale it). The brand logo continues to derive
from tile size via the existing `tileWidth * 0.85` maths (`CardTile.tsx:109-110`) — no new logo code.

**AC6 — Layout contract test.**
A co-located test asserts the helper's output across a device-width table covering at minimum
320 / 340 / 360 / 375 / 384 / 390 / 393 / 402 / 412 / 430 dp, plus the AC2 invariant and the AC4
exact-171 case. Model it on the existing pure-arithmetic layout contract test at
`targets/watch/__tests__/watch-layout-contract.test.ts` (that file lives under `targets/`, which is
allowlisted for `__tests__/`; **this** test is co-located beside its subject — see
[Testing](#testing-requirements)).

**AC7 — Device verification on a narrow Android device.**
Confirmed on an Android device or emulator at **360 dp** and at **320 dp** (or a 360 dp device with
Display size raised): tiles are separated by a visible gutter, no overlap, favourite badge and
highlight border intact, in both light and dark themes. Record the widths actually exercised in the
Dev Agent Record. A dev build is sufficient — this is not a native-layer change, so the Story 16.17
release-build constraint does not apply.

**AC8 — No regression on the existing suite.**
`yarn lint`, `yarn typecheck`, `yarn test` green from the main checkout, coverage gate (80 % global)
held. The existing constant assertions (`CardTile.test.tsx:142-144`, `:148-150`) and the CardList
module mock (`CardList.test.tsx:92-97`) **must keep passing unchanged** — see AC9.

**AC9 — Exported constants keep their values and gain a documented meaning.**
`TILE_WIDTH = 171`, `TILE_HEIGHT = 140`, `TILE_RADIUS = 16`, `SINGLE_TILE_*` keep their current
numeric values. `TILE_WIDTH`/`TILE_HEIGHT` are re-documented as the **design reference dimensions at
390 dp** and the source of the aspect ratio — not as applied layout widths. This is what keeps the
existing tests and mocks valid.

**AC10 — Single-card tile is clamped defensively.**
The enlarged single-card tile (`SINGLE_TILE_WIDTH = 220`) is clamped to the available width. No
shipped phone is narrow enough to trigger this (220 fits at 320 dp), so expect no visual change;
this exists so the same class of bug cannot reappear via the second code path.

## Tasks / Subtasks

- [x] **Task 1 — Pure layout helper (AC: 1, 2, 4, 5, 10)**
  - [x] Create `features/cards/utils/gridLayout.ts`. No React imports; pure functions only.
  - [x] Export the grid geometry constants, moved out of `CardList.tsx`: `NUM_COLUMNS = 2`,
        `SCREEN_MARGIN = 16`, `GUTTER = 16`. Also export `LIST_CONTENT_PADDING = SCREEN_MARGIN - GUTTER / 2`
        (= 8) so the style and the maths cannot drift apart.
  - [x] `getGridTileWidth(windowWidth: number): number` →
        `Math.floor((windowWidth - 2 * LIST_CONTENT_PADDING - NUM_COLUMNS * GUTTER) / NUM_COLUMNS)`,
        i.e. `floor((W - 48) / 2)`. Clamp the result to a floor of `1` so a degenerate/zero measured
        width can never produce a negative width.
  - [x] `getGridTileHeight(tileWidth: number): number` →
        `Math.round(tileWidth * TILE_HEIGHT / TILE_WIDTH)`.
  - [x] `getSingleTileWidth(windowWidth: number): number` →
        `Math.min(SINGLE_TILE_WIDTH, windowWidth - 2 * SCREEN_MARGIN)` (AC10), and
        `getSingleTileHeight(width) = Math.round(width * SINGLE_TILE_HEIGHT / SINGLE_TILE_WIDTH)` so the
        enlarged tile keeps its own 220 : 180 ratio if it ever clamps. At every real device width this
        returns exactly 220 × 180 — the clamp is dormant by design.
  - [x] **Reuse precedent for the hook:** `CatalogueGrid.tsx:99-102` already drives a FlashList grid
        from `useWindowDimensions()` in this same folder. Follow that shape; do not invent a new one.
  - [x] Import the four reference constants from `./CardTile`'s module — or, to avoid a
        `utils/ → components/` import direction, re-declare the design reference dimensions in
        `gridLayout.ts` and have `CardTile.tsx` re-export them so the public export surface is
        unchanged. **Prefer the second**: geometry belongs in `utils/`, and `CardTile.tsx` keeps
        exporting `TILE_WIDTH`/`TILE_HEIGHT`/`TILE_RADIUS`/`SINGLE_TILE_*` so AC9 holds and no
        existing import breaks.
  - [x] Add `gridLayout` to `features/cards/utils/index.ts` only if that barrel is the established
        consumption path — check it first; do not add an unused export.

- [x] **Task 2 — `CardTile` accepts its width (AC: 1, 5, 9)**
  - [x] Add optional props `tileWidth?: number` and `tileHeight?: number`.
  - [x] Replace `CardTile.tsx:93-94` so the applied values are
        `tileWidth ?? (enlarged ? SINGLE_TILE_WIDTH : TILE_WIDTH)` and the same shape for height.
        The default MUST remain the current constant so the 15 existing `CardTile.test.tsx` renders
        (which pass no width prop) stay green.
  - [x] Leave `tileRadius` selection (`:95`) untouched — radius does not scale (AC5).
  - [x] Leave `logoWidth`/`logoHeight` (`:109-110`) untouched — they already derive from `tileWidth`.
  - [x] Do not change the `Animated.View` style array structure (`:123-143`); only the width/height
        values feeding it.

- [x] **Task 3 — `CardList` computes once and passes down (AC: 1, 2, 3, 10)**
  - [x] Add a single `useWindowDimensions()` call in `CardList`. **One subscription for the whole
        list** — do not call it inside `CardTile` (that would create one subscription per rendered
        tile).
  - [x] Derive `tileWidth` / `tileHeight` via the Task-1 helpers, memoised on `width`, and pass both
        to `CardTile` in `renderItem` (`:101-108`) and in the single-card branch (`:142`, using
        `getSingleTileWidth`).
  - [x] `listContent.paddingHorizontal` (`:198`): `SCREEN_MARGIN` → `LIST_CONTENT_PADDING` (16 → 8).
  - [x] `tileWrapper.paddingHorizontal` (`:207`) stays `GUTTER / 2` (8). Combined with the above this
        yields 16 pt outer margins and a 16 pt gutter at every width.
  - [x] **Required companion to the padding change:** add `paddingHorizontal: GUTTER / 2` to
        `headerContainer` (`:201-203`) so SearchBar + SortFilterRow stay at a 16 pt visual margin
        instead of widening to 8 pt (AC3). Verify the same for the `noResults` block (`:221-226`) and
        `EmptyState` — both are centre-aligned, so an 8 pt shift is expected to be invisible;
        confirm rather than assume.
  - [x] Update the file-header comment (`:37-42`, `:50-51`): the grid values now live in
        `utils/gridLayout.ts`, and "Fixed 2-column FlashList grid" is still accurate for the **column
        count** but the tile width is now viewport-derived. Keep the existing note that these values
        are intentionally local and differ from the `LAYOUT` tokens (see Anti-patterns).

- [x] **Task 4 — Tests (AC: 2, 4, 6, 8)**
  - [x] `features/cards/utils/gridLayout.test.ts` — the AC6 contract test: the device-width table,
        the AC2 invariant swept across 280–1024 dp, the AC4 exact `171 × 140` at 390 dp, and the
        degenerate-input floor.
  - [x] `CardList.test.tsx` — assert `CardTile` receives a `tileWidth` that fits its cell. The
        existing `mockCardTileProps` spy already captures props, so extend the captured shape rather
        than adding a new mechanism. Mock `useWindowDimensions` to drive at least a narrow (360) and
        the reference (390) width.
  - [x] `CardTile.test.tsx` — add a case asserting an explicit `tileWidth`/`tileHeight` prop is
        applied to the tile view, and that omitting them falls back to the constants. Do **not**
        delete the `:140-152` dimension assertions.
  - [x] Confirm the `CardList.test.tsx:279-283` `numColumns === 2` test still passes — column count
        is deliberately unchanged (see Out of scope).

- [x] **Task 5 — Gates and device verification (AC: 7, 8)**
  - [x] From the **main checkout**: `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn test:coverage`.
  - [x] Android dev build at 360 dp and 320 dp, light + dark. Capture screenshots; record the exact
        widths in the Dev Agent Record.
  - [x] Spot-check iOS at 390 dp to confirm AC4's "no visible change" claim holds in the running app,
        not only in the arithmetic.

## Dev Notes

### The fix in one table

`listContent.paddingHorizontal = 8`, `tileWrapper.paddingHorizontal = 8`,
`tileWidth = floor((W − 48) / 2)`, `tileHeight = round(tileWidth × 140 / 171)`:

| W (dp)  | tileWidth | tileHeight | outer margin | gutter | fits cell |
| ------- | --------- | ---------- | ------------ | ------ | --------- |
| 320     | 136       | 111        | 16           | 16     | yes       |
| 340     | 146       | 120        | 16           | 16     | yes       |
| 360     | 156       | 128        | 16           | 16     | yes       |
| 375     | 163       | 133        | 16           | 16     | yes       |
| 384     | 168       | 138        | 16           | 16     | yes       |
| **390** | **171**   | **140**    | 16           | 16     | yes       |
| 393     | 172       | 141        | 16           | 16     | yes       |
| 402     | 177       | 145        | 16           | 16     | yes       |
| 412     | 182       | 149        | 16           | 16     | yes       |
| 430     | 191       | 156        | 16           | 16     | yes       |

Row 390 is the regression anchor: byte-for-byte the current design. Rows below 374 are the bug being
fixed. Rows above 390 grow the tile, which is both correct and closer to the UX spec's responsive
intent than a frozen 171.

### Files to touch

| File                                          | Change                                                             |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `features/cards/utils/gridLayout.ts`          | **NEW** — pure geometry helpers + grid constants                   |
| `features/cards/utils/gridLayout.test.ts`     | **NEW** — layout contract test (AC6)                               |
| `features/cards/components/CardTile.tsx`      | UPDATE — optional `tileWidth`/`tileHeight` props; re-export consts |
| `features/cards/components/CardList.tsx`      | UPDATE — `useWindowDimensions`, derived sizes, padding split       |
| `features/cards/components/CardTile.test.tsx` | UPDATE — add prop-application cases; keep `:140-152` intact        |
| `features/cards/components/CardList.test.tsx` | UPDATE — assert passed width; drive two window widths              |
| `features/cards/utils/index.ts`               | UPDATE **only if** that barrel is the established consumption path |

Nothing else consumes `CardTile` — verified: the only references are `CardList.tsx`, the two test
files, and `CardTile.tsx` itself. There is no `CardTile` Storybook story (Storybook covers
`shared/components/ui/` only), so no gallery update is needed.

### Current state of the code being modified

- **`CardTile.tsx`** — presentational, no data fetching. `:93-95` picks width/height/radius from the
  `enlarged` flag; `:98-101` resolves background colour and luminance; `:109-110` derives logo size
  from tile size; `:123-167` renders the tile shell (dynamic border for light/black brands, shadow on
  light theme only, absolutely-positioned favourite badge at `:162-166`); `:170-176` renders the name
  **below** the shell. **Preserve all of it.** The only behaviour this story changes is where the
  width/height numbers come from.
- **`CardList.tsx`** — orchestrates four render paths: loading (`:111-117`), error (`:120-126`),
  single-card `ScrollView` (`:129-148`), and the multi-card/empty `FlashList` (`:169-185`). Search and
  sort controls appear only at `totalCount >= 2` (`:88`). Pull-to-refresh calls `forceSync()` then
  `refetch()` (`:67-75`); `useFocusEffect` refetches on focus (`:78-82`). **All of this must keep
  working** — the story touches only geometry, but the padding change passes through the shared
  content container that the header, empty state and no-results block also live in.
- **`testID="card-list-flashlist"`** (`:172`) and **`testID="favourite-badge"`**
  (`CardTile.tsx:163`) are asserted by existing tests — do not rename.

### Anti-patterns — do NOT do these

| ❌ Don't                                                                  | ✅ Do instead                                                                                                                                       |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Add `overflow: 'hidden'` to `tileWrapper` to stop the overlap             | Fix the width. Clipping keeps the wrong maths and kills the Android `elevation` shadow and the 3 pt highlight border                                |
| Switch to `LAYOUT.screenHorizontalMargin` (24) / `LAYOUT.gridGutter` (12) | Keep the local 16/16. `CardList.tsx:37-42` documents these as deliberately local and different from the tokens; changing them is a redesign         |
| Make the grid responsive (2 → 3 columns) "while we're here"               | Out of scope — see below. Keep `numColumns = 2`                                                                                                     |
| Call `useWindowDimensions()` inside `CardTile`                            | One call in `CardList`, passed down. Per-tile subscriptions scale with list length                                                                  |
| Delete the `TILE_WIDTH === 171` assertions to make tests pass             | Keep them. The constant intentionally stays 171 as the design reference (AC9)                                                                       |
| Use `Dimensions.get('window')` at module scope                            | `useWindowDimensions()` — module-scope capture doesn't update on rotation or Display-size change. (`BarcodeFlash.tsx:44` does this; do not copy it) |
| Convert these components to Unistyles `StyleSheet.create((theme) => …)`   | Out of scope. Both files use RN `StyleSheet` + `useTheme()` today; a styling-engine change is Epic 16 tech-debt of its own                          |
| Scale `TILE_RADIUS` with the tile                                         | Fixed 16 pt radius (AC5)                                                                                                                            |
| Reach for `aspectRatio` instead of a computed height                      | Computed numeric height. FlashList measures items; a deterministic number is easier to unit-test and keeps AC4 exactly verifiable                   |

### Project conventions that apply

- **Layer boundaries (ESLint-enforced):** `features/cards/utils/` may import from `core/`,
  `catalogue/`, `shared/` and within its own feature. A pure geometry module has no cross-feature
  imports, so it is clean by construction. Do not import from another feature.
- **Naming:** utility file `camelCase.ts` → `gridLayout.ts`. Constants `SCREAMING_SNAKE_CASE`.
- **Tests co-located; `__tests__/` folders are banned and CI-enforced** (`yarn check:no-tests-folders`).
  `features/**` is coverage-measured at the 80 % global threshold, so both new files count toward the
  gate — a pure arithmetic module is trivially 100 %.
- **No hardcoded hex, no `console.*`** — neither applies to this change, but the pre-push hooks check.
- **Branch:** `feature/16-22-fix-card-tile-overlap-narrow-screens` (CONTRIBUTING requires the
  `feature/` prefix, not `feat/`).
- **Commit/PR:** Conventional Commit title referencing the story; the PR-conventions workflow fails a
  code-change PR that references no story. `--no-verify` is **strictly forbidden** for both commit and
  push. If the pre-push Jest run SIGSEGVs a worker, that is a known intermittent flake — retry the
  push, never bypass.
- **Status:** set the story's Status to `review` when implementation is complete; the merge workflow
  flips it to `done`.

### Testing requirements

- `yarn test` from the **main checkout** (`/Users/ifero/Developer/myLoyaltyCards`), never this
  worktree.
- The AC6 contract test is a pure-function test — no `@testing-library/react-native` render needed.
  This is the cheapest possible regression guard for a geometry invariant, and it is the reason AC2 is
  stated as an invariant sweep rather than a handful of examples.
- When mocking `useWindowDimensions` in `CardList.test.tsx`, note the file already mocks
  `@/shared/theme`, `expo-router`, `@/shared/hooks/useCloudSync` and the three feature hooks
  (`:27-67`), and replaces `./CardTile`, `./EmptyState`, `./SearchBar`, `./SortFilterRow` with
  lightweight stand-ins (`:69-153`). Extend that existing mock surface; do not restructure it.
- `global.mockFlashListState` (`:24`, `:211`) is the existing mechanism for asserting props passed to
  FlashList. Reuse it if you need to assert list-level props.

### Previous story intelligence

**Story 16.17 (launch experience, done 2026-07-28)** — the most recent Epic 16 story, and the closest
methodological precedent. Two lessons transfer directly:

1. **A design value that was measured once, on one device, will be wrong on another.** 16.17's mark
   was first specified as byte-identical to `assets/icon.png`; on device it shipped a hard-edged
   square because the OS masks app icons itself. The invariant was wrong, not the implementation.
   Here, the invariant "tile is 171 pt" is likewise wrong — the real invariant is "tile fits its
   cell". Encode the invariant in a test (AC2/AC6), not the measurement.
2. **It failed twice on device before it was right.** Both failures were invisible to CI. AC7 exists
   for the same reason: the arithmetic can be perfect and the result still wrong on a real screen.

**Story 16.15 (Hermes `Intl` crash, done 2026-07-16)** — green tests on Node did not prove a Hermes
build worked. Less directly applicable (this story adds no runtime API dependency), but the shape is
identical: **the platform this project has no telemetry for is the platform that breaks.**

**Sentry has effectively no Android telemetry** — roughly 10 events / 90 days, 100 % iOS. "It's not in
Sentry" is not evidence about Android, and a layout defect would not produce a Sentry event at all.
This bug reached us by a human noticing it, which is the only channel currently available for Android
visual defects.

**Story 13.2 (restyle home screen, done)** — created both files and the 171 × 140 constant. Its Dev
Notes record that `CardTile` deliberately does **not** use `CardShell`, because "CardShell's
aspectRatio API doesn't fit fixed-pixel tile specs" (`13-2-restyle-home-screen.md:123`, `:326`). That
rationale weakens once the tile is no longer fixed-pixel — but migrating to `CardShell` is **out of
scope** here; flagged below.

**Story 16.18 (SDK 57 JS deps, backlog)** carries a `react-native-screens` bump that fixes a latent
**fatal Android crash** absent from Sentry only because there is no Android telemetry. Same blind
spot, same epic — worth knowing that Android-only defects are an active theme.

### Git intelligence

Recent commits show the established shape for this kind of work: `fix(<scope>): <what> (Story N.M)` on
a `feature/<story-key>` branch, one PR, status auto-flipped on merge — e.g. `2192832`
"fix: guard formatRelativeTime against Hermes missing Intl.RelativeTimeFormat (16-15)", `e7bd1e6`
"fix(app): prevent offline cold-start hang (Story 16.10)". Suggested title for this one:

```
fix(cards): derive card-grid tile width from the cell so tiles can't overlap (Story 16.22)
```

`git log` also shows the immediately preceding commit `7837f35` touched only the Italian catalogue —
no interaction with the card grid, so the `baseline_commit` above is clean for this work.

### Latest technical information

- **`@shopify/flash-list` 2.0.2** (installed, pinned exactly by Expo across SDK 54–57 and
  deliberately **not** bumped by Story 16.18 — it is pure JS with no native code). The
  `GridLayoutManager.getWidth()` behaviour quoted above was read from the installed source, not from
  documentation, so it is accurate for this exact version. `numColumns` and `horizontal` are mutually
  exclusive (`ErrorMessages.ts:18-19`) — irrelevant here, but do not add `horizontal`.
- **`react-native` 0.83.6** — `useWindowDimensions()` is the supported reactive API and updates on
  rotation and on font/display-scale changes. `Dimensions.get('window')` captured at module scope does
  not.
- **No new dependency is required or permitted for this story.** The project has no responsive-layout
  library, and `shared/theme/unistyles.ts:78` records the deliberate decision that "Phone-only app —
  no responsive breakpoints are required (AC1)". This fix needs arithmetic, not a library.

### Project context reference

`docs/project-context.md` is the binding rules file — read it before writing code. Note its own
warning that it is verified against `package.json` as of 2026-07-28 and has previously been wrong
about libraries; the stack facts relevant here (RN 0.83.6, FlashList 2.0.2, Unistyles 3) were
re-verified against `package.json` and `node_modules` while writing this story.

`docs/ux-design-specification.md` is **stale on the styling engine** (it still prescribes NativeWind
at `:146`, `:154`, `:237`, which was removed by Story 16.1). Its _layout_ guidance is still the design
intent and is cited below; its _implementation_ guidance is not.

## Out of scope — flagged, not fixed

1. **Responsive column counts.** Note this pattern **already exists in this very folder**:
   `CatalogueGrid.tsx:27-29` declares `COLUMN_BREAKPOINT = 600` / `MIN_COLUMNS = 2` / `MAX_COLUMNS = 3`
   and picks columns from `useWindowDimensions()` at `:102`. So the catalogue grid _is_ responsive while
   the card grid is not — a future story can copy the pattern cheaply. The UX spec asks for it in three
   places —
   `docs/ux-design-specification.md:61` ("Automatic column adjustment based on device width (2 columns
   on smaller phones, 3 on larger Pro/Max models)"), `:407` ("Portrait (Primary): 2-3 column grid"),
   `:414-415` ("Phone (Standard): 2 columns in portrait / Phone (Max/Tablet): 3-5 columns"). Story 13.2
   deliberately shipped a **fixed** 2-column grid instead (`:23`, "no responsive 3-column breakpoint —
   design spec is 2 columns only"), and `shared/theme/unistyles.ts:78` records "no responsive
   breakpoints are required". So there is a **documented, deliberate divergence between the UX spec
   and the implementation** that predates this story. Fixing the overlap does not require resolving
   it, and resolving it is a design decision for ifero. **Recommend a separate story.**
2. **Landscape / rotation — not reachable today.** `app.json:6` sets `"orientation": "portrait"`, so
   the app is orientation-locked and there is **no landscape overlap risk to test**. That makes the UX
   spec's orientation guidance (`docs/ux-design-specification.md:406-408`, 4-5 columns in landscape;
   `:425`, a rotation stress test) currently unreachable — a third spec-vs-implementation divergence,
   filed with (1). Note this also means `useWindowDimensions` will in practice only re-fire for
   font/display-scale changes, not rotation — which is precisely the Android Display-size case this
   story cares about, so it is still the right API.
3. **`CardTile` → `CardShell` migration.** Story 13.2 rejected `CardShell` because its `aspectRatio`
   API didn't suit fixed-pixel tiles; that objection largely dissolves once the tile is ratio-driven.
   Worth revisiting, but it would pull a `shared/components/ui/` component and its Storybook story
   into a bug fix.
4. **`CardList`/`CardTile` are still on RN `StyleSheet` + `useTheme()`**, not Unistyles
   `StyleSheet.create((theme) => …)`. Pre-existing; not this story's business.
5. **`BarcodeFlash.tsx:44`** captures `Dimensions.get('window')` at **module scope**, so it will not
   react to rotation or a Display-size change. Same family of bug as this story (a viewport value
   frozen too early) but a different screen and a different failure mode. Not investigated here.
6. **`docs/ux-design-specification.md` still prescribes NativeWind** (`:146`, `:154`, `:237`), removed
   by Story 16.1. Documentation drift; noted for a docs pass.

## Open Decisions — binding defaults, implement as written

1. **Shrink the tile, don't shrink the margins.** At 360 dp the tiles could be kept at 171 by cutting
   the screen margin to ~9 pt. Rejected: margins and gutters are the design rhythm and are explicitly
   specified; tile size is the fluid quantity in every standard responsive grid. **Tile scales,
   16/16 holds.**
2. **Clamp-to-fit vs. fully fluid — choose fully fluid (`floor((W − 48) / 2)`).** A pure clamp
   (`min(171, cellBox)`) was considered because it looks like a smaller change. It is not: the padded
   cell box is below 171 on _every_ phone narrower than 406 dp, so a clamp against the box changes all
   iPhones too — while a clamp against the bare cell (threshold 374 dp) leaves a **zero-width gutter**
   at 360 dp, i.e. tiles touching. The derived formula is the only option that fixes the overlap,
   preserves the 16 pt gutter everywhere, **and** reproduces 171 × 140 exactly at 390 dp. Verified
   numerically in the table above.
3. **Reduce `listContent.paddingHorizontal` to 8 rather than making the wrapper padding asymmetric.**
   Asymmetric per-column padding (inner edge only) would also give 16/16 but needs the column index in
   `renderItem` and breaks down if `numColumns` ever changes. The 8 + 8 split is symmetric, index-free,
   and survives a future column-count change.
4. **Keep `TILE_WIDTH = 171` exported.** It becomes the design reference and the aspect-ratio
   numerator. This is deliberate: it keeps `CardTile.test.tsx:142-144` and the `CardList.test.tsx:92-97`
   mock valid, so the change carries no test-churn tax.
5. **Round with `Math.floor` for width, `Math.round` for height.** Flooring the width guarantees the
   AC2 invariant can never fail to a sub-pixel; height has no such constraint and rounding keeps the
   ratio closest.
6. **No new dependency, no Unistyles migration, no column-count change.** See Anti-patterns and Out of
   scope.

## References

- `features/cards/components/CardTile.tsx:35-42` — the frozen constants
- `features/cards/components/CardTile.tsx:93-95`, `:109-110`, `:196-213` — applied dimensions, logo derivation, shadow
- `features/cards/components/CardList.tsx:37-45` — grid constants + the "intentionally local" note
- `features/cards/components/CardList.tsx:101-108`, `:142`, `:197-214` — renderItem, single-card tile, styles
- `features/cards/components/CardTile.test.tsx:140-152` — constant assertions that must keep passing
- `features/cards/components/CardList.test.tsx:92-97`, `:279-283` — module mock, `numColumns === 2`
- `node_modules/@shopify/flash-list/src/recyclerview/layout-managers/GridLayoutManager.ts:22`, `:36`, `:139-141` — authoritative cell width
- `node_modules/@shopify/flash-list/src/recyclerview/RecyclerView.tsx:452-462`, `:510-525` — `boundedSize` probe inside the padded content container
- `targets/watch/__tests__/watch-layout-contract.test.ts` — pure-arithmetic layout contract test precedent
- `docs/sprint-artifacts/stories/13-2-restyle-home-screen.md:23-24`, `:31`, `:123`, `:288-293`, `:326` — origin of 171 × 140 and the `CardShell` rejection
- `docs/sprint-artifacts/stories/16-17-redesign-app-launch-experience.md` — device-verification precedent
- `docs/ux-design-specification.md:61`, `:202`, `:402-416`, `:425` — responsive/breakpoint intent (diverges from implementation; see Out of scope)
- `shared/theme/unistyles.ts:78-87` — "no responsive breakpoints are required (AC1)"
- `shared/theme/tokens.generated.ts:81-88` — `LAYOUT` tokens (deliberately **not** used by this grid)
- `jest.config.js:28`, `:31` — `.claude` worktree exclusion; `:32-49` — `features/**` coverage at the 80 % gate
- `features/cards/components/CatalogueGrid.tsx:27-29`, `:99-102` — in-folder `useWindowDimensions` + responsive-columns precedent
- `app.json:6` — `"orientation": "portrait"` (app is orientation-locked; no landscape case to test)
- `docs/project-context.md` — binding implementation rules
- `CONTRIBUTING.md:206-231`, `:260-273` — branch/commit conventions, `--no-verify` prohibition

## Dev Agent Record

### Agent Model Used

claude-opus-5 (implementation), claude-sonnet-5 (code review + QA review subagents)

### Debug Log References

- `yarn typecheck` — clean.
- `yarn lint` — clean. `npx prettier --check` — clean.
- `yarn test` — **170 suites / 1890 tests green** from the main checkout.
- `yarn test:coverage` — **exit 0**, i.e. the 80 % global gate passes. Global statements/branches
  read 93.38–93.43 % / 86.11–86.16 % across repeated runs — that few-hundredths jitter is normal
  with parallel workers, so treat the exit code as the fact and the percentages as approximate.
  `gridLayout.ts` is at **100 %** statements/branches/functions/lines in every run.
- `yarn tokens:check` — in sync. `yarn check:no-tests-folders` — clean.
- **Mutation-checked** the three assertions most at risk of passing vacuously, each by
  breaking the code and confirming the test goes red, then restoring:
  1. Removing `headerContainer.paddingHorizontal` → the AC3 header test fails.
  2. Narrowing `renderItem`'s dep array to `[highlightCardId]` → the mounted-viewport-change
     test fails (it caught the stale-closure regression it exists for).
  3. The AC2 sweep reproduces the shipped 374 dp cliff for the old fixed 171 pt tile, so the
     sweep would have caught the original bug rather than passing trivially.

**Review rounds.** Three adversarial Sonnet code-review rounds; every finding was either fixed
or explicitly triaged. The substantive one was round 3's: nothing guarded `renderItem`'s
dependency array against a **live** viewport change on an already-mounted list — the exact
Android Display-size scenario `useWindowDimensions()` was chosen for. Every other sizing test
set the width _before_ `render()`, so a stale closure would have kept painting overlapping
tiles for the lifetime of the mount with the whole suite still green. Now covered by
`'re-derives the tile size when the viewport changes on an ALREADY-MOUNTED list'`, which spies
on `Dimensions.addEventListener`, captures the change handler and fires it inside `act()`.
Also hardened: `toTileDimension()` guards non-finite input, because `Math.max(1, NaN)` is `NaN`
and would otherwise have put a silent `NaN` into a style width.

⚠️ **Note for review:** during round 2 a foreign, half-applied edit appeared in the working
tree — `CardList.test.tsx`'s `expo-router` mock had been rewritten as groundwork for the
pull-to-refresh follow-up (item 1 below) while the vacuous test itself was left untouched. It
was reverted, and the full source diff was then re-read line by line to confirm it contains
only this story's changes. Later rounds were run read-only to prevent a repeat.

### Completion Notes List

**What was implemented (Tasks 1–4, all ACs except AC7):**

- `features/cards/utils/gridLayout.ts` (NEW) — pure geometry. `getGridTileWidth` =
  `floor((W − 48) / 2)`, `getGridTileHeight` at the 140/171 ratio, plus the defensive
  single-tile clamp. Grid constants moved here from `CardList.tsx`, and
  `LIST_CONTENT_PADDING` is **derived** (`SCREEN_MARGIN − GUTTER / 2`) so the stylesheet
  and the arithmetic cannot drift apart.
- Design reference constants (`TILE_WIDTH`/`TILE_HEIGHT`/`TILE_RADIUS`/`SINGLE_TILE_*`) now
  live in `gridLayout.ts` and are **re-exported** by `CardTile.tsx` — Task 1's preferred
  option, so `utils/` never imports from `components/` and no existing import breaks (AC9).
- `CardTile` gained optional `tileWidth`/`tileHeight`, destructured as `tileWidthProp`/
  `tileHeightProp` so the existing local names — and therefore the `Animated.View` style
  array and the `tileWidth * 0.85` logo derivation — are untouched (AC5).
- `CardList` calls `useWindowDimensions()` **once** and passes sizes down; the two
  `useMemo`s are keyed on `windowWidth` only.
- Padding split: `listContent` 16 → `LIST_CONTENT_PADDING` (8), `tileWrapper` stays at
  `GUTTER / 2` (8), and `headerContainer` gains `GUTTER / 2` — restoring 16 pt outer margins
  and a 16 pt gutter (AC3), which the shipped code never achieved at any width (it rendered
  20/8 on a 390 dp iPhone).

**One precision caveat on AC3, disclosed rather than glossed.** AC3's wording is "**exactly**
16 pt ... on all widths". That holds only where `Math.floor` sheds nothing. Elsewhere the tile
is narrower than its content box and, being centre-aligned, the leftover splits evenly on both
sides — padding the outer margin by one share and the gutter by two:

| Viewport width | Outer margin  | Gutter       | Notes                                |
| -------------- | ------------- | ------------ | ------------------------------------ |
| even integer   | exactly 16    | exactly 16   | includes the 390 dp design reference |
| odd integer    | exactly 16.25 | exactly 16.5 | 2 of AC6's 10 widths (375, 393)      |
| fractional     | < 16.5        | < 17         | 1080 / 2.625 = 411.43 dp → 16.36 pt  |

The fractional row is **not hypothetical** — Android reports `pixels / density`, and density is
a float that need not divide evenly, which is the very Display-size mechanism this story is
about. This is **not fixable within the story's own constraints, and is harmless in the right
direction**: flooring is mandated by Open Decision 5 (it is what makes the AC2 fit
unfalsifiable), and asymmetric per-column padding — the only way to land exact integers — is
explicitly rejected by Open Decision 3. The slack can only ever _add_ clearance, never remove
it, so AC2 is strictly safer than nominal, and the worst case is under one point (≈3 physical
px at 3x). Rather than leave this as prose, **all three rows are asserted** in
`gridLayout.test.ts` across the 280–1024 dp integer sweep plus a fractional sweep, so no bound
can silently grow. Flagged for ifero as a wording correction to AC3, not a code change.

**A factual correction to the story's own Dev Notes** (surfaced by review; Dev Notes is not a
section the dev agent may edit, so it is recorded here): "Files to touch" states "Nothing else
consumes `CardTile` — **verified**: the only references are `CardList.tsx`, the two test files,
and `CardTile.tsx` itself." It misses `features/cards/index.ts:27`, which re-exports `CardTile`
from the feature barrel. Confirmed harmless: a repo-wide grep for `from '@/features/cards'`
returns **nothing**, so there is no consumer today, and AC9's unchanged fallback constants would
protect one anyway. (That barrel export is itself a pre-existing divergence from
`project-context.md`'s "DO NOT export: components" rule — not this story's business.)

**Verified rather than assumed** (Task 3 asked for confirmation, not assumption): the
`noResults` block and `EmptyState` are unaffected by the padding change — both are
centre-aligned, and `EmptyState` carries its own `paddingHorizontal: 32` with fixed-width
children (160/240 pt), so the extra 16 pt of available width only _reduces_ clipping at
narrow widths. `SearchBar` and `SortFilterRow` are full-width rows with no self-margin,
which is precisely why the `headerContainer` companion change was required.

**Not implemented — AC7 device verification (see the table below).** This machine has **no
Android AVD and no Android system image installed**, so the 360 dp / 320 dp Android checks
could not be run here. Two fallbacks were attempted and both are genuinely unavailable, not
skipped: an iPhone SE (1st gen) simulator would give a true 320 pt viewport but the device
type cannot pair with any installed iOS runtime (needs iOS ≤ 15), and the Expo **web**
target — which would have rendered the real component tree at exactly 320/360 CSS px —
**cannot bundle at all**, because `react-native-watch-connectivity` has no web
implementation (`Unable to resolve module ./RNWatch`). That web-build failure is
pre-existing and unrelated to this story; flagged as a follow-up, not fixed.

**QA review findings — what a narrower tile changes beyond the overlap itself.** A dedicated
QA pass (separate from the 7 code-review rounds) looked for consequences the arithmetic can't
show. Two are worth reading before merge:

1. **A second, intra-tile collision class is now reachable — bounded and guarded, not fixed.**
   `CardTile`'s fallback children are **fixed** sizes and centre-aligned (`logoSlot` 64 × 64 for
   a catalogue brand with no SVG asset; `avatarCircle` 48 × 48 for a custom card), while
   `favouriteBadge` is pinned right (`right: 6`, `width: 24`, so its left edge is
   `tileWidth − 30`). Before this story the tile never dropped below 171 pt, so they could never
   meet. Measured thresholds: the abbreviation slot touches the badge at `tileWidth < 124`
   (≈296 dp viewport) and the avatar at `tileWidth < 108` (≈264 dp). **No real device reaches
   either** — at 320 dp the tile is 136 pt and the slot clears the badge by 6 pt. Two tests in
   `CardTile.test.tsx` (`describe('fallback children clear the favourite badge')`) now pin that
   clearance; mutation-checked at 116 pt, where the slot correctly fails and the avatar
   correctly still passes. **Why it matters anyway:** a future 3-column grid — flagged in this
   story's own Out of scope, and already implemented in `CatalogueGrid.tsx` — would give a
   ≈116 pt tile on a 412 dp phone, i.e. **below** the 124 pt threshold. Spun off as its own task;
   scaling those children is a visual design change, not a bug fix.
2. **Card names truncate ~20 % sooner on the narrowest screens.** The name sits below the tile
   with `numberOfLines={1}` and tracks the tile width, so at 320 dp it has 136 pt instead of 171. Android's **font size** setting compounds this on an axis independent of window width.
   Behaviour is documented by a test (truncation is still delegated to the platform via
   `ellipsizeMode="tail"` — not broken), and a font-scale check is included in the AC7 script
   below. Going to two lines or clamping the font scale is a **product decision for ifero**, not
   something this bug fix should decide.

**Release note for the PR — not only narrow screens change.** AC4 promises no visual change _at
390 dp_, and that is exactly what it means: every other width now gets a proportional tile.
375 dp goes 171 → 163 (−4.7 %); 430 dp goes 171 → 191 (+11.7 %). This is correct and intended,
but worth saying out loud so a "my cards look bigger" report from a Pro Max user is not
mistaken for a regression.

**Known dormant trap, accepted:** `CardTile`'s size props fall back to the 171/140 constants, so
a future _grid_ caller that forgot to pass them would silently reintroduce this bug. Unreachable
today (no other consumer exists) and the fallback is required by AC9 to keep the existing tests
and mocks valid, so it stays — the props' JSDoc states the constraint.

**Follow-ups flagged, deliberately not fixed here** (out of scope per the story's own
Out-of-scope list and the repo's surgical-diff convention). Each was spun off as its own task, and
**two of the four already landed on `main` while this story was in review** — they arrived here via
a `git merge origin/main`, and all gates were re-run green on the merged state:

1. ~~`CardList.test.tsx`'s pre-existing `'calls forceSync and refetch on refresh'` test only
   asserted `onRefresh` was defined and never invoked it, so it could not fail if pull-to-refresh
   broke (`CardList.tsx` refresh body was at 0 % coverage).~~ **DONE — `00e2141` (#171).** Note it
   also had to rewrite this file's `expo-router` mock so `useFocusEffect` fires on callback-identity
   change rather than every render; otherwise the two `setIsRefreshing` re-renders bumped `refetch`
   on their own and masked the very thing the test now checks. That mock change is in this branch
   via the merge, and all 101 of this story's own tests still pass under it.
2. ~~`app.json` declared a `web` bundler config but the web target could not bundle
   (`react-native-watch-connectivity` has no web shim).~~ **DONE — `f1d8957` (#170)**, which removed
   `expo.web` and kept `react-native-web`/`react-dom` because Storybook owns them.
3. `CardTile`'s fixed-size fallback children vs the pinned favourite badge (QA finding 1 above) —
   **still open**; blocks a future 3-column grid.
4. The repo has **no `eslint-plugin-react-hooks`** (verified absent from `eslint.config.mjs` and
   `package.json`), so neither `rules-of-hooks` nor `exhaustive-deps` runs. "`yarn lint` is
   clean" therefore says nothing about hook dependency arrays — and this story's central
   regression risk _was_ a dependency array (see the round-3 finding above). Repo-wide
   pre-existing gap; **still open**.

### Device Verification Record (AC7)

✅ **AC7 closed by ifero on 2026-07-30**, who tested the change on their own device and reported
"I've tested it and it works", then approved the PR. Recorded exactly as given: the specific dp
widths and themes ifero exercised were **not** captured, so the rows below say "not stated"
rather than asserting 360/320 dp in both themes. The agent could not run this itself — this host
has no Android AVD and no system image (see the Completion Notes). The script below is kept for
the next person who needs to reproduce the narrow-width check.

| Platform | Device / emulator       | Width (dp) | Theme      | Result                                    |
| -------- | ----------------------- | ---------- | ---------- | ----------------------------------------- |
| Android  | ifero's own device      | not stated | not stated | ✅ **PASS** — "tested it and it works"    |
| iOS      | iPhone 13 sim, iOS 18.6 | 390        | light+dark | ✅ **PASS** — measured exactly, see below |

**✅ iOS 390 dp spot-check DONE (Task 5, third subtask) — AC4 confirmed in the running app, not
just in the arithmetic.** A 390 × 844 pt iPhone 13 simulator was created (no stock simulator is
exactly 390 — iPhone 16 is 393), the app was built Debug and driven to a two-card grid
(Conad + Esselunga). Rather than eyeball it, the screenshot was decoded and the geometry measured
at 3× scale:

| Measured (light theme, 390 dp) | Value                      | Expected |
| ------------------------------ | -------------------------- | -------- |
| Left outer margin              | **16.00 pt**               | 16       |
| Tile width                     | **171.00 pt**              | 171      |
| Gutter (187 → 203 pt)          | **16.00 pt**               | 16       |
| Right outer margin             | **16.00 pt**               | 16       |
| Tile height (207 → 347 pt)     | **140.00 pt**              | 140      |
| Accounting                     | 16+171+16+171+16 = **390** | 390      |

So the design reference width is byte-for-byte the old design **and** finally has the documented
16/16 rhythm. Dark theme re-checked at the same width: identical geometry, true-black background,
tiles cleanly separated. The single-card enlarged state was also observed en route and renders at
its unchanged 220 × 180 (AC10's clamp dormant, as designed).

Two incidental notes from the build, neither caused by this story: passing
`-sdk iphonesimulator` to `xcodebuild` makes the **watch widget** target compile against iOS and
fail (`WatchComplicationWidget.swift` uses iOS 17+ SwiftUI APIs) — omit the flag and the workspace
builds clean; and `yarn test:coverage` returned exit 1 once out of four runs, the known
intermittent Jest worker flake, passing 3/3 on retry.

#### AC7 manual test script (Android, ~10 minutes)

**Prerequisites:** a real Android phone with USB debugging on (`adb devices` lists it); a dev
build installed (release build not required — no native change); **at least 2 cards** in the
wallet so the grid renders, including **one favourited** card, and ideally add a card during the
session to see the green "just added" highlight (it fades after 2 s).

**1 — find the device's physical width**

```bash
adb shell wm size
```

**2 — compute the two target densities.** `density = physical_width_px × 160 / target_dp`

| Physical width | 360 dp | 320 dp |
| -------------- | ------ | ------ |
| 1080 px        | 480    | 540    |
| 1440 px        | 640    | 720    |

**3 — test 360 dp.** With the app **already open on the card list**, set the density without
relaunching — this exercises the live-viewport-change path (the grid should resize in place, no
flash of overlapping tiles):

```bash
adb shell wm density 480
```

Then also force-stop and reopen to cover cold start:

```bash
adb shell am force-stop com.iferoporefi.myloyaltycards
```

Check in **light** theme, then repeat in **dark** (Settings → Display → Dark theme):

- a clear visible gap between the two tiles in every row — no overlapping artwork, no smeared
  shadow between tiles
- the favourite star sits fully inside its own tile, not touching the neighbour or the tile's own
  logo/avatar
- the green highlight border on a just-added card is a clean rounded rectangle inside its tile
- card names are legible — heavier `…` truncation than before is **expected and fine**; garbled
  or overlapping text is not
- the search box and sort row line up with the grid's left/right edge

**4 — test 320 dp:** `adb shell wm density 540`, then repeat every check in both themes.

**5 — restore the device, pass or fail:**

```bash
adb shell wm density reset
```

**Optional (covers the QA truncation finding):** before restoring, set Settings → Display → Font
size to maximum and re-check a long card name at 320 dp — confirm it is still recognisable.

**PASS** = no tile overlap, a visible gutter in every row, badge and highlight border fully
inside their own tile, at both widths in both themes.
**FAIL** = any overlap, anything spilling into a neighbouring tile, or a crash/blank screen.

Record the density values actually used in the table above.

### File List

| File                                          | Change                                                                 |
| --------------------------------------------- | ---------------------------------------------------------------------- |
| `features/cards/utils/gridLayout.ts`          | **NEW** — pure geometry helpers + grid constants                       |
| `features/cards/utils/gridLayout.test.ts`     | **NEW** — layout contract test, 40 cases (AC2, AC4, AC6, AC10)         |
| `features/cards/components/CardTile.tsx`      | UPDATE — optional `tileWidth`/`tileHeight`; re-exports consts          |
| `features/cards/components/CardList.tsx`      | UPDATE — `useWindowDimensions`, derived sizes, padding split           |
| `features/cards/components/CardTile.test.tsx` | UPDATE — 9 new cases (props, badge clearance, name); `:140-152` intact |
| `features/cards/components/CardList.test.tsx` | UPDATE — 15 sizing cases + grid-highlight guard; Dimensions spy        |
| `jest.setup.js`                               | UPDATE — FlashList mock also captures list-level layout props          |
| `docs/sprint-artifacts/sprint-status.yaml`    | UPDATE — story → `in-progress`                                         |
| `docs/sprint-artifacts/stories/16-22-…md`     | UPDATE — checkboxes, Status, Dev Agent Record                          |

`features/cards/utils/index.ts` was deliberately **not** touched: that barrel exports only
`generateInitials` and `formatBarcodeNumber`, while `brandLogos.ts` — the other
component-consumed util in the folder — is imported directly (`../utils/brandLogos`). Direct
import is therefore the established path here, and adding a barrel entry would create an
unused export (Task 1 said to check first and not add one).

### Change Log

| Date       | Change                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------ |
| 2026-07-30 | Tile width derived from the viewport; 16/16 margins+gutters restored at every width (Tasks 1–4). |
| 2026-07-30 | Addressed code review findings — 3 items resolved, 1 triaged as an out-of-scope follow-up.       |
