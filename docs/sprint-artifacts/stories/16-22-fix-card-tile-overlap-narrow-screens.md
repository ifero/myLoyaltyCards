---
baseline_commit: 7837f359540c72c30edcf392e1a897fa99ab9752
---

# Story 16.22: Fix card-grid tile overlap on narrow screens — derive tile width from the grid cell

Status: ready-for-dev

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

- [ ] **Task 1 — Pure layout helper (AC: 1, 2, 4, 5, 10)**
  - [ ] Create `features/cards/utils/gridLayout.ts`. No React imports; pure functions only.
  - [ ] Export the grid geometry constants, moved out of `CardList.tsx`: `NUM_COLUMNS = 2`,
        `SCREEN_MARGIN = 16`, `GUTTER = 16`. Also export `LIST_CONTENT_PADDING = SCREEN_MARGIN - GUTTER / 2`
        (= 8) so the style and the maths cannot drift apart.
  - [ ] `getGridTileWidth(windowWidth: number): number` →
        `Math.floor((windowWidth - 2 * LIST_CONTENT_PADDING - NUM_COLUMNS * GUTTER) / NUM_COLUMNS)`,
        i.e. `floor((W - 48) / 2)`. Clamp the result to a floor of `1` so a degenerate/zero measured
        width can never produce a negative width.
  - [ ] `getGridTileHeight(tileWidth: number): number` →
        `Math.round(tileWidth * TILE_HEIGHT / TILE_WIDTH)`.
  - [ ] `getSingleTileWidth(windowWidth: number): number` →
        `Math.min(SINGLE_TILE_WIDTH, windowWidth - 2 * SCREEN_MARGIN)` (AC10), and
        `getSingleTileHeight(width) = Math.round(width * SINGLE_TILE_HEIGHT / SINGLE_TILE_WIDTH)` so the
        enlarged tile keeps its own 220 : 180 ratio if it ever clamps. At every real device width this
        returns exactly 220 × 180 — the clamp is dormant by design.
  - [ ] **Reuse precedent for the hook:** `CatalogueGrid.tsx:99-102` already drives a FlashList grid
        from `useWindowDimensions()` in this same folder. Follow that shape; do not invent a new one.
  - [ ] Import the four reference constants from `./CardTile`'s module — or, to avoid a
        `utils/ → components/` import direction, re-declare the design reference dimensions in
        `gridLayout.ts` and have `CardTile.tsx` re-export them so the public export surface is
        unchanged. **Prefer the second**: geometry belongs in `utils/`, and `CardTile.tsx` keeps
        exporting `TILE_WIDTH`/`TILE_HEIGHT`/`TILE_RADIUS`/`SINGLE_TILE_*` so AC9 holds and no
        existing import breaks.
  - [ ] Add `gridLayout` to `features/cards/utils/index.ts` only if that barrel is the established
        consumption path — check it first; do not add an unused export.

- [ ] **Task 2 — `CardTile` accepts its width (AC: 1, 5, 9)**
  - [ ] Add optional props `tileWidth?: number` and `tileHeight?: number`.
  - [ ] Replace `CardTile.tsx:93-94` so the applied values are
        `tileWidth ?? (enlarged ? SINGLE_TILE_WIDTH : TILE_WIDTH)` and the same shape for height.
        The default MUST remain the current constant so the 15 existing `CardTile.test.tsx` renders
        (which pass no width prop) stay green.
  - [ ] Leave `tileRadius` selection (`:95`) untouched — radius does not scale (AC5).
  - [ ] Leave `logoWidth`/`logoHeight` (`:109-110`) untouched — they already derive from `tileWidth`.
  - [ ] Do not change the `Animated.View` style array structure (`:123-143`); only the width/height
        values feeding it.

- [ ] **Task 3 — `CardList` computes once and passes down (AC: 1, 2, 3, 10)**
  - [ ] Add a single `useWindowDimensions()` call in `CardList`. **One subscription for the whole
        list** — do not call it inside `CardTile` (that would create one subscription per rendered
        tile).
  - [ ] Derive `tileWidth` / `tileHeight` via the Task-1 helpers, memoised on `width`, and pass both
        to `CardTile` in `renderItem` (`:101-108`) and in the single-card branch (`:142`, using
        `getSingleTileWidth`).
  - [ ] `listContent.paddingHorizontal` (`:198`): `SCREEN_MARGIN` → `LIST_CONTENT_PADDING` (16 → 8).
  - [ ] `tileWrapper.paddingHorizontal` (`:207`) stays `GUTTER / 2` (8). Combined with the above this
        yields 16 pt outer margins and a 16 pt gutter at every width.
  - [ ] **Required companion to the padding change:** add `paddingHorizontal: GUTTER / 2` to
        `headerContainer` (`:201-203`) so SearchBar + SortFilterRow stay at a 16 pt visual margin
        instead of widening to 8 pt (AC3). Verify the same for the `noResults` block (`:221-226`) and
        `EmptyState` — both are centre-aligned, so an 8 pt shift is expected to be invisible;
        confirm rather than assume.
  - [ ] Update the file-header comment (`:37-42`, `:50-51`): the grid values now live in
        `utils/gridLayout.ts`, and "Fixed 2-column FlashList grid" is still accurate for the **column
        count** but the tile width is now viewport-derived. Keep the existing note that these values
        are intentionally local and differ from the `LAYOUT` tokens (see Anti-patterns).

- [ ] **Task 4 — Tests (AC: 2, 4, 6, 8)**
  - [ ] `features/cards/utils/gridLayout.test.ts` — the AC6 contract test: the device-width table,
        the AC2 invariant swept across 280–1024 dp, the AC4 exact `171 × 140` at 390 dp, and the
        degenerate-input floor.
  - [ ] `CardList.test.tsx` — assert `CardTile` receives a `tileWidth` that fits its cell. The
        existing `mockCardTileProps` spy already captures props, so extend the captured shape rather
        than adding a new mechanism. Mock `useWindowDimensions` to drive at least a narrow (360) and
        the reference (390) width.
  - [ ] `CardTile.test.tsx` — add a case asserting an explicit `tileWidth`/`tileHeight` prop is
        applied to the tile view, and that omitting them falls back to the constants. Do **not**
        delete the `:140-152` dimension assertions.
  - [ ] Confirm the `CardList.test.tsx:279-283` `numColumns === 2` test still passes — column count
        is deliberately unchanged (see Out of scope).

- [ ] **Task 5 — Gates and device verification (AC: 7, 8)**
  - [ ] From the **main checkout**: `yarn lint`, `yarn typecheck`, `yarn test`, and `yarn test:coverage`.
  - [ ] Android dev build at 360 dp and 320 dp, light + dark. Capture screenshots; record the exact
        widths in the Dev Agent Record.
  - [ ] Spot-check iOS at 390 dp to confirm AC4's "no visible change" claim holds in the running app,
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

_To be filled by the dev agent._

### Debug Log References

### Completion Notes List

### Device Verification Record (AC7)

| Platform | Device / emulator | Width (dp) | Theme | Result |
| -------- | ----------------- | ---------- | ----- | ------ |
|          |                   |            |       |        |

### File List
