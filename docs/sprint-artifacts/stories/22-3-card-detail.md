---
title: 'Story 22.3: Card Detail — the four Cardì card-detail frames'
type: 'feature'
created: '2026-10-07'
status: 'in-review'
route: 'dispatch'
review_loop_iteration: 2
baseline_commit: '438816cb5a5ab75da0eee08ddf29cc41efd94c1c'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Card detail still draws its pre-Cardì layout: the header stays the brand colour when it
condenses and only gains a title and a shadow, the card name sits inside the hero, the barcode card
casts a shadow with the number repeated under it, and the rows carry MaterialIcons, a copy icon and a
swatch dot.

**Approach:** Implement the four card-detail frames — at rest, blending, condensed, custom dark accent
— from `docs/design/cardi/frames/cardi-card-detail-frames.html` and `stitch-prompts-card-detail.txt`,
light and dark, with `cardi-design-system.md` winning any conflict: one brand field at rest that blends
to the ground colour with a hairline as the content scrolls, driven on the UI thread.

## Boundaries & Constraints

**Always:**

- The status-bar inset, header and hero read as ONE field at rest: while any of the hero is under
  the header the header shows exactly the hero's colour, and the blend starts only once the hero is
  gone. No seam, no shadow, ever.
- A branded card's field is the catalogue hex with its logo, never tinted, washed or overlaid; only a
  card with no catalogue brand takes an accent (`CARD_COLORS[card.color] ?? DEFAULT_CARD_COLOR_HEX`).
- Nothing is drawn over the bars: no header layer, title, control, hint, toggle or iOS scroll-edge
  effect. The barcode card is the first item below the name, on screen at rest.
- Keep what other stories rely on: refetch on focus and usage tracking (9.1), the optimistic favourite
  toggle with its pending guard (9.2), the brightness boost and its invariants (16.39 —
  `CardDetails.brightness.test.tsx` passes unchanged), the delete flow (2.8), the loading and error
  states, and the testIDs of elements that survive.
- Header components import nothing from `react-native-unistyles` and live outside `app/` (the nav-bar
  flicker); the platform's own header-button treatment, including iOS 26 glass, is left as the OS
  draws it.
- Theme roles only (fixed-scheme roles such as `BARCODE_FLASH` and `LIGHT_THEME_COLORS` where a
  surface ignores the scheme); type from `TYPOGRAPHY`; every tappable at least `TOUCH_TARGET.min`;
  edge controls respect safe-area insets; Lucide icons imported per icon; strings in `en.ts` and
  `it.ts`; pressed visuals via `onPressIn`/`onPressOut`, never `style={({ pressed }) => …}`.
- Every library API is checked against current documentation (Context7, pinned to this repo's
  versions — Expo SDK 55, React Navigation native stack 7.14, react-native-screens 4.23, Reanimated
  4.2.1, react-native-worklets 0.7, expo-status-bar 55, lucide-react-native 1.52) or the installed
  source in `node_modules/` before it is used. Nothing is implemented from memory or by assumption.

**Decided (ifero, 2026-10-08):**

- **Full-screen barcode:** the whole white barcode card opens the existing `FullscreenBarcode`, which
  stays untouched; 22.4 converges it with the `barcode/[id]` route when it restyles the barcode
  screen, so the 16.39 brightness behaviour does not move here.
- **Delete confirmation:** the platform alert stays as it is; 22.7 settles confirm sheets app-wide.
- **Azure `#0C84CC`:** the design system's question stays open and this story changes nothing about
  azure; the spec records that the new layout narrows the exposure on this screen to the filled
  star and the title mid-blend.
- **Spec size:** kept whole (about 4,000 tokens against the 1,600 target), as one screen and one
  user goal.
- **Loading and error headers (renegotiated at implementation):** both sit below a bar that is
  transparent from the first frame, over the ground. Pushed with the shared opaque bar, the screen
  turned transparent only as the push ended, and the loaded card jumped up under it about 450ms
  into every open (measured on the simulator). The loading state has no title, so nothing lingers
  over the field during the push; the error state keeps "Card Details". Both carry the same back
  chevron as the loaded card, in the theme's text colour (wording amended with ifero, 2026-10-08:
  it said "the shared back button").

**Never:**

- Commit, push, or change `docs/sprint-artifacts/sprint-status.yaml` or any other tracker file —
  the orchestrator owns all three.
- Change the shared `screenOptions` in `app/_layout.tsx`, any other route's header, the
  `barcode/[id]` route (`BarcodeScreen`, `BarcodeFlash` — 22.4's), `FullscreenBarcode`, the delete
  `Alert`, or the shared primitives (`ActionRow`, `Surface`, `SectionHeader`, `Button`,
  `BottomSheet`).
- Change the card colour keys or anything on the watch wire contract.
- Add rows or chrome the prompts ban: notes, a format row, a "Card Details" heading, a Show Barcode
  button, an Edit/Share pair, pencil or copy icons, a swatch dot.

## I/O & Edge-Case Matrix

| Scenario       | Input / State                     | Expected Output / Behavior                                                                                                                                      | Error Handling                     |
| -------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| At rest        | branded card, offset 0            | Frame A: one brand field (inset, header, 200pt hero with logo); no title; back and outline star in the field's contrast foreground; name, then the barcode card | logo missing → existing fallback   |
| Hero scrolling | offset inside the hero            | the hero's logo or avatar fades out; the header still shows the hero's colour exactly                                                                           | N/A                                |
| Blending       | hero gone, first 48pt after it    | Frame B: the header blends brand → ground as the title fades in, in step; foreground and status bar flip at the midpoint                                        | N/A                                |
| Condensed      | beyond the blend                  | Frame C: ground colour, 1px `border` hairline, title at full opacity, controls in `textPrimary`                                                                 | N/A                                |
| Reverse        | scrolling back up                 | every step reverses with the scroll; nothing is timed                                                                                                           | N/A                                |
| Overscroll     | pull down at the top (iOS bounce) | the brand colour shows above the hero, never the ground                                                                                                         | N/A                                |
| Custom card    | no catalogue brand                | Frame D: the accent fills the field, letter avatar in the hero; a Color row shows the accent's name                                                             | unknown key → default accent       |
| Branded colour | catalogue brand + a stored key    | brand hex only; no Color row; the stored key is never used                                                                                                      | brand id not in catalogue → custom |
| Copy           | Number row pressed                | the number is copied and the toast shows                                                                                                                        | failure → existing alert           |
| Dark           | dark scheme                       | the field stays the brand; condensed header black with the dark `border` hairline; the barcode card stays white                                                 | N/A                                |
| Load / missing | loading, invalid or missing id    | the spinner, or the error copy, below a bar transparent from the first frame over the ground; no title while loading, "Card Details" on an error                | unchanged                          |

</frozen-after-approval>

## Code Map

- `features/cards/screens/CardDetailScreen.tsx` -- hooks before the early returns (`:47-77`, keep the
  order); loading and error states `:126-187` (unchanged); `headerBg` derivation `:204` (keep);
  inline `Stack.Screen` options `:210-259` (replace); copy toast `:116-123`.
- `features/cards/components/CardDetails.tsx` -- JS `onScroll` threshold `:77-79,115-125` and the
  `minHeight` scroll allowance `:201` (replace with a Reanimated offset); `BrandHero` `:209-211`;
  barcode card `:214-231` with shadow `:404-416`; number under the bars `:233-239` (remove); hint
  `:242-244`; bulb toggle `:264-286` (keep, ifero's 2026-09-08 icon-only decision); info rows
  `:290-328` (copy handler `:141-150`, colour row `:305-319`); manage block `:331-376`; delete
  `Alert` `:176-192`; `FullscreenBarcode` `:380-385`.
- `features/cards/components/BrandHero.tsx` -- 200pt band `:31,111`; colour `:47-61`; logo slot
  `:75-87`; avatar `:89-94`; name `:98-104` (moves to the stack). Only `CardDetails` renders it.
- `features/cards/components/DetailRow.tsx:42-88` -- the info row; only card detail uses it.
- `features/cards/components/HomeHeaderButtons.tsx:41-63` -- private raw-RN `HeaderIconButton` (Lucide
  24/1.5, 48×48, 0.98 press) to extract; `HomeHeaderButtons.test.tsx` pins Home's use.
- `shared/components/ui/Surface.tsx` (`divided`), `SectionHeader.tsx`, `ActionRow.tsx` (`variant`
  `plain`, `destructive`, `showChevron`) -- the manage block composes these unchanged.
- `shared/theme/luminance.ts:48,72` -- `getContrastForeground`, `getFavouriteStarColor`.
- `shared/theme/colors.ts:67-69,113-116` -- `DEFAULT_CARD_COLOR_HEX`, `BARCODE_FLASH`;
  `shared/theme/tokens.generated.ts:30` -- `LIGHT_THEME_COLORS`.
- `node_modules/@react-navigation/native-stack/src/types.tsx:298,319,362,812` -- `headerTransparent`,
  `headerBackground` (a React element pinned behind the bar; forces a transparent native bar with no
  shadow), `headerTitle`, `scrollEdgeEffects`. Tint and title colour are plain strings: they cannot
  animate, so the title is a custom element.
- `node_modules/@react-navigation/elements` 2.9.15 -- `useHeaderHeight`; installed only
  transitively today. Its contexts live in a global map (`src/getNamedContext.tsx`), shared by every
  copy.
- `node_modules/@react-navigation/core/src/useNavigationCache.tsx:213-217` -- `setOptions` spreads
  each call into the route's options, so a key set once persists until it is set again.
- `features/cards/components/BarcodeRenderer.tsx:25,95,173` -- `MIN_QR_SIZE` (220) floors every QR
  code, and the renderer adds 16pt of white padding each side of the bars.
- `features/cards/utils/formatBarcode.ts` -- `formatBarcodeNumber` groups every four characters of
  any string.
- `node_modules/react-native/React/Fabric/Mounting/ComponentViews/ScrollView/RCTEnhancedScrollView.mm:209-222`
  (and `ReactAndroid/.../ReactScrollView.java:1153-1166`) -- with `snapToStart`/`snapToEnd` off, a
  release whose target lies past a snap point is pulled back to that point unless the scroll is
  already past it: snap points cannot leave flings free.
- Reanimated 4.2.1 -- `useAnimatedScrollHandler` (`onEndDrag`, `onMomentumBegin`, `onMomentumEnd`)
  and `scrollTo` (`src/index.ts:281`) settle a scroll on the UI thread.
- Reanimated 4.2.1 -- `useScrollOffset` (current; `useScrollViewOffset` is the deprecated alias),
  `useAnimatedRef`, `useAnimatedStyle`, `useAnimatedReaction`, `interpolate`, `Extrapolation`;
  `scheduleOnRN` from react-native-worklets replaces the deprecated `runOnJS`.
- `jest.setup.js:301-355` -- the hand-written Reanimated mock lacks every scroll API above;
  `:145-162` the global expo-router mock lacks `useIsFocused`; `CardDetailScreen.test.tsx:55-70`
  mocks expo-router itself.
- `app/_layout.tsx:271` -- the root `StatusBar`; RN's status bar is a stack where the last mounted
  instance wins, and this screen stays mounted under Edit.
- Tests: `CardDetailScreen.test.tsx` (header fill `:296-329`, star `:331-367` read the old option
  structure), `CardDetails.test.tsx` (testIDs and English literals), `BrandHero.test.tsx`,
  `DetailRow.test.tsx`, `CardDetails.brightness.test.tsx` (must pass unchanged).
- `shared/i18n/locales/en.ts:630-663`, `it.ts:625-659` -- `cards.details`; parity is gated by
  `shared/i18n/locales/card-colors.test.ts:31-58`.

## Tasks & Acceptance

**Execution:**

- [x] `package.json`, `yarn.lock` -- `npx expo install @react-navigation/elements` at native-stack's
      own range, `^2.9.15`, so `yarn.lock` stays byte-identical (one key, one copy) --
      `useHeaderHeight` must not come from an undeclared transitive dependency.
- [x] `features/cards/components/HeaderIconButton.tsx` (+ test) -- extract the raw-RN button from
      `HomeHeaderButtons.tsx`, adding colour, fill, disabled and accessibility-state props; Home
      imports it with no visible change -- one header button for both screens.
- [x] `jest.setup.js` -- extend the Reanimated mock with the scroll APIs the screen uses.
- [x] `features/cards/components/BrandHero.tsx` (+ test) -- logo or avatar only; avatar per Design
      Notes; its content fades with the hero's scroll.
- [x] `features/cards/components/CardDetailHeader.tsx` (+ test) -- the header background (ground layer,
      brand layer, 1px `border` hairline) and title (`bodyLgStrong`, `textPrimary`, one line, header
      role), each driven by the scroll offset; no Unistyles import.
- [x] `features/cards/components/DetailRow.tsx` (+ test) -- the frame row per Design Notes.
- [x] `features/cards/components/CardDetails.tsx` (+ test) -- the frames' stack per Design Notes on an
      offset-tracked scroll view whose hero runs under the transparent header; the name below the
      hero; barcode card; bulb; details `Surface divided`; `SectionHeader` and a manage
      `Surface divided` of two plain `ActionRow`s.
- [x] `features/cards/screens/CardDetailScreen.tsx` (+ test) -- success-state options:
      `headerTransparent`, `headerBackground`, `headerTitle`, `headerShadowVisible: false`,
      `scrollEdgeEffects: { top: 'hidden' }`, back (`chevron-left`) and star (`star`) as
      `HeaderIconButton`s whose colours flip at the blend midpoint; an expo-status-bar `StatusBar`
      rendered only while focused.
- [x] `CardDetails.test.tsx`, `CardDetailScreen.test.tsx`, `CardDetailHeader.test.tsx` -- one test per
      matrix row, the scroll phases asserted through the offset logic; the 16.39 invariants unchanged.
- [x] `shared/i18n/locales/en.ts`, `it.ts` -- drop keys this leaves unused, in both locales.
- [x] `docs/design/cardi/cardi-design-system.md` -- record the card-detail rulings the design system
      lacks (Design Notes, "Record"), so nothing diverges silently.

**Acceptance Criteria:**

- Given a branded card at rest, in light and dark, when card detail opens, then the status-bar inset,
  header and hero read as one field in the catalogue hex with its logo and no title (frame A).
- Given the screen scrolls, when the hero passes under the header, then the hero fades while the
  header keeps its colour; once the hero is gone the header blends to the ground colour as the title
  fades in (frame B) and settles on the ground colour — cream in light — with a 1px hairline and the
  full title (frame C); scrolling back reverses it.
- Given the wallet, when a card is tapped, then its barcode is on screen without scrolling, one tap
  on the barcode card opens the full-screen barcode, and at no scroll position is anything drawn over
  the bars.
- Given a card with no catalogue brand, when card detail renders, then its accent fills the field with
  a letter avatar (frame D); given a branded card, then no accent appears anywhere on the screen.

## Implementation Notes

**Step 3 (2026-10-08).** Built by a context-free subagent from this spec, then checked against the
diff rather than its report. Beyond the task list, each found and measured on the iOS 26.5
simulator:

1. **Loading and error headers.** Pushed with the shared opaque bar, the screen turned transparent
   only as the push ended, and the loaded card jumped up under the bar about 450ms into every open
   (a 60 fps recording). Both states now sit below a bar transparent from the first frame, their
   content padded by the header height. That broke the frozen "Load / missing" row, so it went to
   ifero, who chose it with no title while loading (now under _Decided_): a loading title lingered
   over the field until the push ended. The orchestrator made that last change.
2. **`scrollEdgeEffects`** is `{ top: 'automatic' }` until the scroll view first lays out, then
   `hidden`, and resets on each refocus reload (`CardDetails` gains `onScrollViewLayout`).
   react-native-screens applies the option only when it changes, which can come before the scroll
   view exists; the iOS 26 edge effect then stayed on, a dark gradient over the field in dark mode
   on a cold launch. Residual: a two-frame trace on a cold open in the debug build.
3. **Scroll allowance kept:** the content is at least the window height + 248, without which a
   typical card scrolls about 111pt and never reaches frames B or C.
4. **Condensed title** capped at the window width − 2 × (48 + 24 + 8): a long name ran under both
   glass buttons.
5. **`@react-navigation/elements`** is pinned at exactly 2.9.15 (the registry's latest, 2.9.44, would
   add a second copy): one lockfile key, one copy on disk, a frozen install passes. Yarn now warns
   of an unmet peer, `@react-navigation/native`, which resolves through hoisting.
6. **The Reanimated mock** returns a stable `useSharedValue`, as the real hook does, and gains a port
   of `interpolate`/`Extrapolation`, `useScrollOffset`, `useAnimatedRef`, `useAnimatedReaction` and an
   `Animated.ScrollView` that writes each scroll into the offset. That made `Tile.test.tsx`'s local
   stand-in (22.2's Found, not fixed 9) redundant and its comment false, so both went.

Choices where the spec was silent: the name below the hero is `card.name`, matching the condensed
title and telling two cards of one brand apart, while the logo slot is an image labelled with the
brand and the avatar letter is hidden from screen readers; the logo or avatar fades over the first
100pt; the Color row shows for any card without a catalogue brand, an unknown key named as the
default accent; a pressed `DetailRow` takes `surfaceElevated`, as `ActionRow` does; the hero's
light-field hairline is kept, in `border`. QR codes request 180×180, but `BarcodeRenderer`'s
`MIN_QR_SIZE` floors them at 220.

Verification by the implementer: `typecheck`, `lint` (0 warnings) and `format:check` pass, 207
suites and 2,988 tests pass, and `CardDetails.brightness.test.tsx` is byte-identical. On the
simulator, 393pt, light and dark: frame A as one field; frame B mid-blend at `#F7DD74` against the
frame's `#F8DE74`; frame C's hairline; frame D; the controls flipping between 223 and 224pt; the
reverse; a real drag for the bounce; the full-screen barcode; a favourite; the return from Edit; a
long name; a white brand; a black brand with a QR code; the error state; cross-checked on iOS 18.6
at 402pt. Android is unverified: no emulator on this host. The orchestrator's pixel check on frame C
found the iOS 26 glass buttons' own shadow spilling a few points below the bar, faint and only under
the buttons — the platform's, not this screen's.

### Found, not fixed

1. The screen swaps to a spinner on every refocus (`CardDetailScreen.tsx`, the `useFocusEffect`
   fetch), resetting the scroll.
2. Copying fires two success haptics (`CardDetails.tsx`'s `Haptics` call and the toast's `haptic`).
3. `ActionRow` keeps a MaterialIcons chevron and a non-design-system destructive pressed state; it
   is shared with settings and add-card.
4. No React Navigation theme is passed, so the native header's interface style is always light
   (`useHeaderConfigProps.tsx:222,530`); iOS 26 glass in dark mode may read light.
5. `FullscreenBarcode` places its close button at hard-coded top offsets with literal colours
   (`FullscreenBarcode.tsx:146`), outside the safe-area rule; 22.4 converges it with `BarcodeFlash`.
6. `/barcode/[id]` has no caller in the app; only the `cardi://barcode/<id>` deep link reaches it.
7. Azure stays open: on an azure field the favourited beam star measures 2.66:1 against the 3:1
   floor, and the title crosses azure mid-blend; no small text sits on it at rest any more.
8. In dark mode a yellow field passes through olive (about `#7F6600`) mid-blend over the black
   ground, a colour the design system calls a failure mode; it lasts the 48pt of the blend.
9. ~~`shared/theme/colors.contrast.test.ts` says azure reaches users through the condensed header;
   since this story that is true only mid-blend.~~ Fixed in review pass 3 (row 95): the comment now
   says azure meets the title on card detail only mid-blend.
10. A near-black brand still blends into the black ground in dark mode, as before.
11. The hero's logo slot stays the shipped 80 × 80 (the spec names no size), so a wide wordmark such
    as Decathlon's or IKEA's reads small beside frame A's stand-in, a wordmark about 170pt wide.
12. Same-feature imports in `features/cards/screens/` are absolute, against
    `docs/project-context.md`'s relative rule. All 16 in the folder already were (rows 1, 42, 43, 74).
13. A custom card whose name starts with an emoji draws a lone surrogate in the avatar
    (`charAt(0)`, as before this story; rows 37, 69, 99).
14. The full-screen barcode still groups every payload in fours (`FullscreenBarcode.tsx:131`). It
    splits a QR URL the Number row shows whole; 22.4's (rows 48, 51).
15. The card-detail Stitch prompts and frames still prescribe what § _Card detail_ overrides: 20px
    padding, Esselunga's Color row, Inter for the number (row 54).
16. The mark's foreground rule differs between the wallet tile (`Tile.tsx:26`) and the hero
    (`getContrastForeground`, since 13.3; row 55).
17. A static `DetailRow` (Color, Added) is not read as one label-and-value unit, as before this
    story (row 56).

**Step 3, re-derivation (2026-10-08).** After Spec Change Log entry 1, the implementation files were
reverted path by path (the first derivation's diff kept outside the repository) and re-derived from
the amended spec by a fresh subagent, then checked against the new diff. Every KEEP item came back,
and every amendment landed: the snap zone, the light-field avatar ring, the unscaled title hidden
from screen readers until the midpoint, the reload that clears the card's header keys and resets the
offset and the midpoint, digits-only grouping, narrowed bars on a slim phone, QR at 220, the bulb's
press scale, the star's `selected` state, `^2.9.15` with `yarn.lock` byte-identical, and the longer
record in the design system (now § _Card detail_ under _Card tile_). The implementer also set
`headerStyle: { backgroundColor: 'transparent' }` (without it the shared `screenOptions` surface fill
paints the bar opaque), `headerTitleAlign: 'center'` and the native `title`. Its loading and error
back chevron follows _Reload_, and the frozen _Decided_ wording was amended with ifero to match.

Verification by the implementer: `typecheck`, `lint` (0 warnings), `format:check`, `tokens:check`,
`icons:check`, `frames:check`, `wear:catalogue:check`, the `check:*` scripts and
`check:story-catalogue-sync` pass; 207 suites and 2,993 tests pass, the coverage threshold holds and
`CardDetails.brightness.test.tsx` is byte-identical. On the iOS 26.5 simulator at 393pt, light and
dark: frame A one pure `#FFCC00` field; frame B measured at exactly `#F8DE74` at 224pt; frame C's
`#D6D6CB` and `#3A3A48` hairlines; frame D; slow drags coming to rest at exactly 200 and 248; the
reverse and the bounce; the full-screen barcode; a favourite; the status bar on Edit and the reload
at rest; the error state; a long name truncating clear of both buttons; a QR code shown ungrouped.
Android is unverified. For the device check: on iOS 26 the header's height starts at React
Navigation's estimate (97.7) before the measured 113, so in the first two frames of every push the
hero and everything below it sit 15pt high, then drop.

**Step 3, third derivation (2026-10-09).** After Spec Change Log entry 2 the implementation files
were reverted again (the second derivation's diff kept outside the repository) and re-derived by a
fresh subagent, then checked against the new diff. Both entry-2 amendments landed: a scroll that
comes to rest inside the band settles to its nearer end (`getBlendSettleOffset`; a drag released
with no velocity settles on the next frame, because iOS reports the release from inside UIKit's
own end-of-drag callback, and any other drag when its momentum ends), the minimum content height
comes from the scroll view's measured height, the condensed state counts from one physical pixel
short of 248, and past the midpoint the favourited star is `getFavouriteStarColor(theme.background)`.
Every KEEP item from both entries came back. The implementer also applied the pass-1 and pass-2
`patch` rows from the Review Triage Log on its own reading of the spec: the brand-lookup, bulb and
header-glyph pins, `barcodeGeometry.ts` exporting `MIN_QR_SIZE` and `RENDERER_SIDE_PADDING` for
`BarcodeRenderer` and the card alike, the azure OPEN note and § _Icons_ ruling, the details card in
the outlined-surface list, and the light-field rule that holds from the blend's start (row 63,
reusing `getTileAppearance(field).isLight`). Choices worth a review: the barcode card's side padding
is the renderer's own 16pt white (the card pads 16 top and bottom only), and the screen test's
theme mock is built from the generated tokens.

Verification by the implementer: `typecheck`, `lint` (0 warnings), `format:check`, `tokens:check`,
`icons:check`, `frames:check`, `wear:catalogue:check`, the five `check:*` scripts and
`check:story-catalogue-sync` pass; 207 suites and 2,988 tests pass under eight random seeds for the
touched suites, coverage 94.59 % statements; `CardDetails.brightness.test.tsx` byte-identical;
`yarn.lock` byte-identical. On the iOS 26.5 simulator at 393pt, light and dark: frame A one
`#FFCC00` field to the hero's edge at 313pt; frame B blending `#FFCC00` → `#F8DE74` (exactly, at 224) → `#F0EFE3`, controls, title accessibility and status bar flipping at 224; frame C's hairlines;
frame D; the dark condensed bar with a beam star; a white brand keeping its rule at 200; settles
from programmatic scrolls (201–223 to 200, 224–247 to 248) and real slow drags (210 to 200, 236 to
248); a flick from 248 running straight to 0 with a −31pt bounce, no longer stopping at 200; the
reload at rest; iOS 18.6 at 402pt. Untested: a fling whose momentum ends inside the band on a real
drag (the settle path was exercised by programmatic scrolls, which fire the same event), a fling
stopped by a tap inside the band, Android.

**Step 4, review pass 3 (2026-10-09).** No loopback: the sixteen `patch` rows went back to the
third derivation's implementer as fourteen fixes, and the result was checked against the tree, not
its report.

- **Code.** A momentum end that arrives while a finger is down no longer settles. On Android, a
  touch that stops the settle cancels its animator, and that reports a momentum end mid-band; the
  scroll handler now records the drag in its context. "Tap to enlarge" is padded and centred. The
  star keeps one name, "Favorite" / "Preferito", and `selected` alone carries its state.
  `@react-navigation/native` is declared at expo-router's `^7.1.33`, which ends the unmet-peer
  warning (item 5 above) while `yarn.lock` stays byte-identical.
- **Tests.** The bar's three layers, its title and the hero's mark are now rendered with
  `useAnimatedStyle` running its updater, so each opacity is seen at its offset. A fling released
  inside the band and a momentum end during a drag are covered, and the renderer is pinned at a 278pt
  linear width. The implementer broke the code each new test guards and saw it fail.
- **Docs and comments.** The QR floor, the bulb's off colour, the loading and error headers, the
  logo slot (OPEN), the full-screen barcode's MaterialIcons close, the `fieldTakesHairline` comment,
  and the azure comment in `colors.contrast.test.ts` (Found, not fixed 9).
- **Verification on the patched tree:** `typecheck`, `lint` and `format:check` are clean; 207 suites
  and 2,998 tests pass; `yarn.lock` and `CardDetails.brightness.test.tsx` are byte-identical to the
  baseline.

**Device check (2026-10-09)**, on the patched tree. Setup: the DS22-1 iPhone 16 simulator (iOS
26.5, 393pt), light and dark, with Metro serving this worktree. The bundle was confirmed current by
the star's new label. The app was driven over Metro's debugger and by real touches, and every colour
below is measured from the screenshots. These sit outside the repository, in the session
scratchpad's `dc3/`.

- **Esselunga:**
  - **Frame A:** one `#FFCC00` field from the top to the hero's edge at 313pt, with no title.
  - **Scrolling:** the logo has faded out by 100, and at 200 the bar is still exactly the field.
  - **Frame B:** held on a real drag at 222pt, the bar measures `#F8DC6A`, the composite of the field
    over cream at that offset. In dark at 224 it is `#806600`, the olive of Found, not fixed 8.
  - **Frame C:** cream, the `#D6D6CB` hairline, the title and ink controls. In dark: black, the
    `#3A3A48` hairline, a beam favourite star and a cream chevron.
- **Frame D:** Farmacia Centrale's custom green with the washed avatar, and "Green" in the Color row.
- **Other cards:**
  - CRAI, a white brand, keeps its rule at rest and at 200.
  - Zara is black and its QR number is shown ungrouped.
  - Biblioteca's long name takes two lines, and its condensed title truncates clear of both buttons.
  - Palestra takes the default azure.
- **The barcode at rest (AC3):** the whole barcode card, bars and hint, lies above the fold of the
  852pt screen. Measured from its hairline: 380.7–537.3pt for a linear code (Esselunga, light and
  dark; Farmacia), 380.7–657.3pt for a QR code (Zara), and 412.7–569.3pt under Biblioteca's
  two-line name.
- **Bounce:** held on a real pull to −101.7pt, the field runs unbroken to 414.7pt.
- **Fling:** a real fling from 248 runs to a −39.7pt bounce and rests at 0, not at 200.
- **Settle:** a programmatic jump to 224 settles at 248.
- **Controls:** the full-screen barcode opens. The favourite toggles under the one label "Favorite",
  `selected` flipping.
- **Error and reload:**
  - The error state, light and dark: a transparent bar, "Card Details" and the chevron in the text
    colour.
  - The return from Edit reloads the card at rest.
- **Largest accessibility size:** at font scale 3.57, "Tap to enlarge" wraps in two centred lines
  clear of the hairline, light and dark.
- **Not this story's:**
  - CRAI's seeded EAN-13 fails its checksum, so the renderer shows its unchanged error box.
  - At the largest sizes the name breaks mid-word, as the hero's did.
- **Unchecked:**
  - Android, which has no emulator here, including the Android-only momentum-end-during-a-drag guard.
  - A real release with exactly no velocity: the simulator's injected lift carries some. The third
    derivation's slow drags and the tests cover that path.
  - The loading state, too brief to capture.
- **To ifero — a 15pt drop at the start of every push on iOS 26:**
  - **What:** in a 60 fps recording, frames 81–83 show the hero's edge at 297.9pt; from frame 84 it
    sits at 313.3. The incoming screen is already 259–289pt in at that point.
  - **Cause:** native-stack starts `useHeaderHeight` at React Navigation 7's estimate, which assumes
    a 44pt bar (97.67), and only reports the measured 113 a few frames later.
  - **Upstream:**
    - No released `@react-navigation/elements` 2.x models iOS 26's taller bar.
    - Its `main` branch, React Navigation 8, estimates 60 + 53.67 = 113.67.
  - **Why it is not fixed here:** a local override would need to know Liquid Glass is on. An app
    built against an older SDK keeps 44pt bars on iOS 26, where the override would leave the hero
    16pt off for good. iPad (supported), iPhones without a Dynamic Island and Android cannot be
    exercised here, so no fix can be settled in this session.
  - **In the same frames:** iOS 26's top scroll-edge effect washes the field's top 110pt.
    - It measures `#EDE6C1` at the top, grading to `#F4D13A` at 105pt, and is gone from frame 84.
    - This is the residual item 2 of the first derivation's notes recorded for a cold open. It shows
      on every push: the option is `automatic` until the scroll view first lays out (Spec Change
      Log entry 1, KEEP 4).
    - It goes to ifero with the drop: both live in the push's first frames, before layout reports
      back.

**Review loops (2026-10-09).** Each round is a fresh Sonnet reviewer reading a freshly written diff.

- **Code review, round 1 — CHANGES_REQUESTED, 3 findings, all verified and fixed by the
  orchestrator:**
  1. The release decided "will decelerate" from a nonzero velocity. iOS decides deceleration
     separately and reports no momentum when there is none (`RCTScrollViewComponentView.mm:781-797`),
     so a slow release with a little velocity could rest mid-band. A release now settles on the next
     frame unless a momentum begin arrived first. Both platforms report one straight after the
     release: Android from `handlePostTouchScrolling`. Two tests cover it.
  2. The bulb's off colour now names both schemes (`#55555F` / `#B5B5AB`).
  3. The worklets mock's comment now names this story's `useAnimatedReaction` caller.
- **Code review, round 2 — CHANGES_REQUESTED, 1 finding, verified and fixed:** no test released
  twice in one mount, so deleting the end-drag reset of the deceleration flag left every suite green.
  A new test flings to rest, then releases with no momentum, and expects a second settle. With the
  reset removed it was seen to fail.
- **Code review, round 3 — CHANGES_REQUESTED, 4 findings, all verified and fixed:**
  1. Nothing pinned that the bar's ground and field each fill the bar, with the field drawn over
     the ground. The test now asserts both.
  2. Nothing pinned that the reaction reaches the JS thread only when the scroll crosses the
     midpoint. A spy on `scheduleOnRN` now does.
  3. The reload test could not see the screen's own midpoint reset, because the mock's reaction
     reset it at once. The test now silences that hop over the reload. Both spies go in before
     the render: the worklets plugin captures `scheduleOnRN` in the reaction's closure.
  4. The design system's azure note now says no **small** text sits on the accent at rest: a
     custom card's 28px bold initial is large text.

  Each new test was seen to fail under its mutation: layers swapped, fill dropped, guard dropped,
  reset dropped.

- **Code review, round 4 — APPROVED, no comments.** The code loop ended there: 3, 1, 4, 0 findings.
- **Device re-check on the final code**, since round 1's fix reaches the app. The bundle was
  confirmed by the scroll handler's new `onMomentumScrollBegin` event. On the same simulator:
  - programmatic jumps settle: 210 and 223 to 200, 224 and 240 to 248;
  - a real drag held at 240 and released comes to rest at 248;
  - a real fling from 248 runs to a −46pt bounce and rests at 0;
  - frames A and C, light and dark, measure as above. Their screenshots are `dc3/final-*`.
- **QA review, round 1 — CHANGES_REQUESTED, 2 findings, verified and fixed:**
  1. **AC3:** "on screen without scrolling" had no recorded evidence. The device check now records
     the barcode card's measured bounds at rest.
  2. **"Nothing is timed" (matrix row 5):** no test could fail. The pure-worklet test's timing
     spies could never be reached (row 84), and the evaluated-style tests installed none, so a
     `withTiming` around an opacity passed every suite. Now the bar's layers and title, and the
     hero's fade, are rendered with `withTiming`, `withSpring`, `withDelay` and `withRepeat` spied
     before the render, and each must stay uncalled. Each check was seen to fail under that
     mutation. The pure test keeps only its reverse check.
- **Code review, round 5** — both loops go round again, because QA's fixes changed the reviewed
  diff. CHANGES_REQUESTED, 1 finding, verified and fixed: the bar was rendered only in light, so
  hard-coding `fieldTakesHairline(fieldColor, false)` passed. A dark render of a white field at 200
  now expects no hairline, and it was seen to fail under that mutation.
- **Code review, round 6 — APPROVED, no comments.**
- **QA review, round 2 — APPROVED, no comments.** Both loops end approved, and no nit-only round
  occurred.
  - Code review ran six rounds, with 3, 1, 4, 0, 1 and 0 findings; QA's fixes sent it round again
    after round 4.
  - QA ran two rounds, with 2 and 0 findings.

## Spec Change Log

**1. Review pass 1, 2026-10-08 — `bad_spec`, code reverted and re-derived.**

- **Triggered by** Review Triage Log rows 9 (with 5, 12, 30), 10, 11, 13, 14, 18 (with 34, 41), 19,
  24, 27 (with 36), 31 and 33.
- **Amended:** Design Notes — new _No resting mid-blend_, _Title_ and _Reload_ bullets; the star's
  `selected` state; the hero's name capped at two lines and the avatar's light-field ring; the
  barcode card's narrow-phone width and QR floor; digits-only grouping; the bulb's pressed scale; a
  longer _Record_ list. Tasks — `@react-navigation/elements` at `^2.9.15`. Code Map — the
  `setOptions` merge, the renderer's floor and padding, `formatBarcodeNumber`.
- **Known-bad states avoided:** a mustard avatar on the yellow accent; a header at rest on salmon or
  olive; a stale title, star and chevron after a failed reload, and scheme-coloured controls on the
  first frames after any reload; a title that outgrows the bar, a hidden title a screen reader still
  reaches, and an uncapped name pushing the barcode down; a QR size the screen never draws; a QR URL
  shown and spoken in fragments; the renderer's white padding covering the card's border at 360dp;
  a new lockfile key; an accessibility-state prop nobody passes; rulings that diverge unrecorded.
- **KEEP** — the first derivation built these and the simulator proved them; re-derive them as they
  were:
  1. The scroll choreography as pure worklets in `features/cards/components/CardDetailHeader.tsx`
     (`getHeaderLayers`, `getHeaderTitleOpacity`, `getHeroContentOpacity`, `isPastBlendMidpoint`, the
     `HEADER_BLEND_*` constants): the blend starts at the hero's 200pt and runs 48pt; the ground and
     field layers appear together at its start and the hairline at its end; the logo or avatar fades
     over the first 100pt; the controls flip at the midpoint through `useAnimatedReaction` and
     `scheduleOnRN`. On the device frame B measured `#F7DD74` against the frame's `#F8DE74`.
  2. `BrandHero` as one view, `HERO_HEIGHT + headerHeight` tall with `paddingTop: headerHeight`, a
     window-tall field-coloured extension above it overlapping the band by 1pt, the logo slot an
     accessible image labelled with the brand, the avatar hidden from screen readers.
  3. Loading and error below a bar transparent from the first frame, their content padded by the
     header height: an opaque bar turned transparent only as the push ended, and the card jumped up
     under it about 450ms into every open.
  4. `scrollEdgeEffects: { top: 'automatic' }` until the scroll view's first `onLayout`, then
     `hidden`, reset on every reload: react-native-screens applies the option only when it changes,
     and a scroll view mounted after the change kept iOS 26's edge effect.
  5. `contentInsetAdjustmentBehavior="never"`, the offset reset to 0 when the scroll view mounts, and
     a minimum content height so a short card can still scroll past the blend (without it a typical
     card scrolls about 111pt); the title's width capped at the window − 2 × (48 + 24 + 8), clear of
     both glass buttons.
  6. `HeaderIconButton` extracted to `features/cards/components/`, raw RN, no Unistyles import, with
     `color`, `fill`, `disabled` and `accessibilityState`; `fill` always passed (`'none'` when
     omitted), because Lucide spreads an explicit `undefined` over its own `none` and the glyph fills
     black.
  7. The expo-status-bar `StatusBar` mounted only while the screen is focused: the field's foreground
     decides it at rest and the scheme past the midpoint.
  8. The Reanimated mock in `jest.setup.js`: a stable `useSharedValue`, a port of `interpolate` and
     `Extrapolation`, `useScrollOffset`, `useAnimatedRef`, `useAnimatedReaction`, and an
     `Animated.ScrollView` that writes each scroll into the offset; with it, `Tile.test.tsx`'s local
     stand-in is removed.
  9. `DetailRow` as the frame row (48pt minimum, padded 12 / 16, gap 12, the value right-aligned on
     one line with a middle ellipsis, a `mono` option, the pressed `surfaceElevated` fill) inside a
     `Surface divided`; the stack's name is `card.name` with the header role; an unknown colour key is
     named as the default accent; `colorAccessibilityLabel` leaves both locales.
  10. The tests: the matrix asserted through the worklets and the real `StoryDecorator`, a guard
      that header components stay outside the Unistyles plugin's reach, and
      `CardDetails.brightness.test.tsx` byte-identical.

**2. Review pass 2, 2026-10-09 — `bad_spec`, code reverted and re-derived again.**

- **Triggered by** Review Triage Log rows 49 (with 50 and 60) and 52.
- **Amended:** Design Notes — _No resting mid-blend_ rewritten (a scroll that comes to rest inside the
  band settles to its nearer end; no `snapToOffsets`; the minimum content height from the scroll
  view's measured height; the condensed state one physical pixel short of 248; non-drag scrolls
  recorded as the exception); the favourited star past the midpoint is
  `getFavouriteStarColor(theme.background)`; the _Record_ list follows both. Code Map — React
  Native's snap clamp, Reanimated's scroll-end events and `scrollTo`.
- **Known-bad states avoided:** a flick to the top from the condensed bar stopping at 200 with the
  hero hidden; a fling down a tall card stopping at 248; a cream favourite star on the black bar,
  where the design system wants beam; a short range resting mid-blend under a clamp.
- **KEEP** — entry 1's list still holds. The second derivation also built these, and the review and
  the simulator passed them; re-derive them as they were:
  1. Every state sets the same header keys: loading and error spread the success state's options
     (`headerTransparent`, `headerStyle: { backgroundColor: 'transparent' }` — without it the shared
     surface fill paints the bar opaque — `headerShadowVisible: false`, `headerTitleAlign: 'center'`,
     `scrollEdgeEffects`) with `headerTitle`, `headerBackground` and `headerRight` set to `undefined`
     and `headerLeft` the `HeaderIconButton` chevron in `textPrimary`; the success state sets
     `title: card.name`.
  2. A reload sets the midpoint state, the scroll-view-laid-out flag and the offset back before it
     fetches; the reaction lists `scrollOffset` as its dependency.
  3. The title: `allowFontScaling={false}`, hidden from screen readers by
     `accessibilityElementsHidden`/`importantForAccessibility` until the midpoint (an
     `isPastMidpoint` prop), centred, `maxWidth` the window − 2 × (48 + 24 + 8).
  4. `BrandHero`: the logo straight on the field with no plate, an accessible image labelled with
     the brand; the avatar washed 16 % white on a dark field, ringed 1pt in the foreground on a light
     one (`foreground === NEUTRAL_COLORS.white` decides); the extension at `top: 1 - windowHeight`;
     child testIDs only when a testID is given.
  5. `CardDetails`: digits-only grouping (`/^\d+$/`); linear width
     `min(280, window − 2 × (24 + 1 + 16))`; QR at 220; the bulb's pressed scale; the name in two
     lines at most, testID `card-details-name`; the details and Manage `Surface divided`s (Manage's
     testID `card-details-manage-rows`).
  6. The tests: the `Stack.Screen` mock merging options as `setOptions` does, the `renderCard` and
     `refocus` helpers, the no-timing spies on the reverse, the `#F8DE74` composite check, the direct
     accessibility-prop assertions, and one Unistyles guard in `HeaderIconButton.test.tsx` covering
     `HeaderIconButton`, `HomeHeaderButtons` and `CardDetailHeader`.
  7. The Reanimated mock's shared values with `get`/`set`, its `WeakMap` of scroll offsets per ref,
     and `useAnimatedReaction` reading its latest callbacks from a ref.
  8. `@react-navigation/elements` at `^2.9.15`, `yarn.lock` byte-identical.

## Review Triage Log

**Pass 1 (2026-10-08)** — layers: BH blind-hunter, ECH edge-case-hunter, VG verification-gap, PC
project-conventions. Ten `bad_spec` entries, so the code loops back (Spec Change Log, entry 1); the
`patch` rows are moot until it is re-derived, and are carried if they recur.

| #   | Layer | Location                                                   | Finding                                                                                | Verdict     | Evidence                                                                                                                                                                        | Route             |
| --- | ----- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | PC    | `CardDetailScreen.tsx:34-40`                               | Same-feature imports are absolute, against project-context's relative rule             | low         | All 16 same-feature imports in `features/cards/screens/` are already absolute; the new lines follow the folder, and changing two would mix styles                               | defer             |
| 2   | PC    | `BrandHero.tsx:45`                                         | `LIGHT_FIELD_THRESHOLD = 0.85` reuses the name of `luminance.ts`'s 0.5 cut-off         | low         | `luminance.ts:19` is 0.5 and drives `getContrastForeground`; `Tile.tsx:19` calls the same 0.85 `LIGHT_FILL_THRESHOLD`                                                           | patch             |
| 3   | PC    | `CardDetails.tsx:230-232`                                  | The name's testID still says "hero"                                                    | low         | The name left the hero; only this diff's tests use `card-details-hero-name`                                                                                                     | patch             |
| 4   | PC    | `BrandHero.test.tsx:97`                                    | The `CONAD` fixture carries Coop's hex, and the comment flagging it was deleted        | low         | `catalogue/italy.json`: conad `#DA291C`, coop `#E2231A`                                                                                                                         | patch             |
| 5   | VG    | `CardDetailScreen.test.tsx:88-91`                          | The `Stack.Screen` mock records each call, not the merged route options                | medium      | Pre-verified gap: `setOptions` merges per route, so no test can see options carried across states                                                                               | bad_spec, with 9  |
| 6   | VG    | `package.json:67`                                          | Nothing checks for a single copy of `@react-navigation/elements`                       | false       | `HeaderHeightContext` comes from `getNamedContext`'s global map (`elements/src/getNamedContext.tsx`), so two copies share it and `useHeaderHeight` cannot throw for that reason | reject            |
| 7   | VG    | `CardDetailHeader.test.tsx:155-160`                        | The reverse test is a tautology; nothing asserts that nothing is timed                 | low         | Pre-verified: `up` is `down` reversed and `phaseAt` is pure; the timing mocks complete at once                                                                                  | patch             |
| 8   | VG    | `BrandHero.test.tsx:201-205,253-259`                       | The logo's `accessible` and the avatar's two hide props are unasserted                 | low         | Pre-verified: RNTL hides on either prop alone, and `getByLabelText` ignores `accessible`                                                                                        | patch             |
| 9   | VG    | `CardDetailScreen.tsx:162-193`                             | A refocus reload keeps the success state's header keys                                 | medium      | `useNavigationCache.tsx:213-217` spreads each `setOptions` into the last; after a failed reload the bar shows the old name, a live star and a stale-coloured chevron            | bad_spec          |
| 10  | BH    | `BrandHero.tsx:39,132`                                     | An ink wash over the yellow accent paints a mustard disc                               | medium      | 16 % ink over `#FCCC0C` composites to `#D8AF10`; the design system: beam "at exactly that value or not at all", mustard forbidden; the spec's Design Notes prescribed it        | bad_spec          |
| 11  | BH    | `CardDetailHeader.tsx`                                     | The blend can come to rest mid-band                                                    | medium      | Nothing snaps between 200 and 248: red over cream rests on salmon (banned), yellow over black on olive; the frames call the mid-state a transition, not a resting style         | bad_spec          |
| 12  | BH    | `CardDetailScreen.tsx:162-193`                             | Loading and error keep the shared Unistyles back button, swapped at push end           | low         | The shared `headerLeft` is a MaterialIcons `Pressable` in Unistyles-processed `app/_layout.tsx`; same root as 9                                                                 | bad_spec, with 9  |
| 13  | BH    | `cardi-design-system.md` § _Card detail_                   | Rulings the screen ships are unrecorded                                                | low         | Color row custom-only (the frames draw it for Esselunga), the avatar, the QR floor, the 100pt fade, the overscroll, the light-field hairline, the bulb's fill and dark beam     | bad_spec          |
| 14  | BH    | `CardDetails.tsx:67,259`                                   | The QR request of 180 never takes effect                                               | low         | `BarcodeRenderer.tsx:25,95` floors it at 220; the spec said 180, and the test asserts the ignored request                                                                       | bad_spec          |
| 15  | BH    | `BrandHero.tsx`, `CardDetailScreen.tsx`, `CardDetails.tsx` | The field is derived three times                                                       | low         | They agree on every reachable input; the brand-without-colour throw is unreachable (the descriptor's colour is non-optional); a shared helper is more than a direct correction  | reject            |
| 16  | BH    | `BrandHero.tsx:45`, `CardDetailScreen.tsx:250`             | A second 0.85 threshold; the status bar compares the foreground string                 | low         | The naming is 2; the comparison is correct, `getContrastForeground` returns exactly white or `IDENTITY_COLORS.ink` (`luminance.ts:48-49`)                                       | patch, with 2     |
| 17  | BH    | `CardDetailHeader.tsx:76`, `CardDetails.tsx:213`           | The end state has zero tolerance, sized from the window                                | maybe-false | iOS reaches 248 exactly (frame C on device); whether an Android scroll view outgrows the window needs an emulator; medium if so                                                 | defer             |
| 18  | BH    | `CardDetailHeader.tsx:169`, `CardDetails.tsx:233`          | The title scales in a fixed bar and stays focusable at opacity 0; the name is uncapped | medium      | RN `Text` scales by default where the native title it replaces does not; TalkBack focuses opacity-0 views; the hero had capped the name at two lines                            | bad_spec          |
| 19  | BH    | `HeaderIconButton.tsx`                                     | `accessibilityState` is unused and the star exposes no state                           | low         | No caller passes it; the spec added the prop without saying the star uses it                                                                                                    | bad_spec          |
| 20  | BH    | `CardDetails.tsx:56-63`, `HeaderIconButton.tsx`            | Design constants are redeclared; the button sits outside `shared/components/ui/`       | low         | Hoisting tokens and moving the button are more than a direct correction; the move is 22.2's follow-up 11 (#258)                                                                 | reject            |
| 21  | BH    | `CardDetailScreen.tsx:84-95`                               | Each midpoint crossing re-renders the whole screen                                     | low         | One extra render of static content per crossing, no frame drop measured; memoising is more than a direct correction                                                             | reject            |
| 22  | BH    | `jest.setup.js`                                            | The Reanimated mock mixes a faithful port with hand-written logic                      | low         | Developer-only; evaluating styles in the shared mock and scoping reactions is more than a direct correction                                                                     | reject            |
| 23  | BH    | `HomeHeaderButtons.test.tsx:106`                           | Test infrastructure is copied; Home's Unistyles guard now guards no `Pressable`        | low         | The `Pressable` moved to `HeaderIconButton.tsx`, which has its own guard; deleting Home's copy is a direct correction, the rest is not                                          | patch             |
| 24  | BH    | `package.json:67`                                          | `@react-navigation/elements` is pinned exactly, not at native-stack's `^2.9.15`        | low         | The caret matches the existing lock key and keeps `yarn.lock` unchanged; the exact pin added a key and freezes the app's copy; the spec said "pinned to the installed 2.9.x"    | bad_spec          |
| 25  | BH    | `CardDetails.test.tsx:264`                                 | The banned-icons test sees only the MaterialIcons mock's testIDs                       | low         | A Lucide `Pencil` or `Copy` would pass it                                                                                                                                       | patch             |
| 26  | BH    | `cardi-design-system.md:768-769`                           | "Off the 8px grid" sits beside a 12px gap                                              | low         | 12 is off the 8 grid too; the reason is that 16 is a spacing token                                                                                                              | patch             |
| 27  | BH    | `CardDetails.tsx:314`                                      | The Number row groups any payload in fours, and speaks the fragments                   | medium      | `formatBarcode.ts` groups every four characters of any string; `DetailRow` builds its label from the shown value; the spec prescribed the grouping                              | bad_spec          |
| 28  | BH    | `CardDetails.tsx:284`                                      | The bulb has no press feedback                                                         | low         | The only restyled tappable without the 0.98× scale                                                                                                                              | patch             |
| 29  | BH    | `BrandHero.tsx:107,127`                                    | Child testIDs are guarded unevenly                                                     | low         | `${testID}-logo-slot` becomes "undefined-logo-slot" without a testID; a guard is a direct correction                                                                            | patch             |
| 30  | ECH   | `CardDetailScreen.tsx:162-193`                             | Loading or error after a success keeps the success keys                                | medium      | Same as 9                                                                                                                                                                       | bad_spec, with 9  |
| 31  | ECH   | `CardDetailScreen.tsx:88-96,124`                           | The midpoint state survives a reload                                                   | low         | The reload remounts the content at rest, but `isPastMidpoint` stays true until the reaction fires, so the first frames draw scheme colours over the field                       | bad_spec          |
| 32  | ECH   | `CardDetails.tsx:213`                                      | A scroll view taller than the window cannot reach frame C                              | maybe-false | As 17                                                                                                                                                                           | defer, with 17    |
| 33  | ECH   | `CardDetails.tsx:259-260`                                  | The renderer's 312pt white view overruns a narrow card                                 | low         | The card's content is the window − 82 (278 at 360dp); the renderer's 16pt white padding then covers the card's 1px border; the spec set the geometry                            | bad_spec          |
| 34  | ECH   | `CardDetailHeader.tsx:167-178`                             | The title scales with Dynamic Type                                                     | medium      | Same as 18                                                                                                                                                                      | bad_spec, with 18 |
| 35  | ECH   | `jest.setup.js:311-320,456-470`                            | A reaction that writes a shared value would recurse                                    | low         | Latent: no reaction writes one today, and an equality guard changes the mock's notification semantics for every suite                                                           | reject            |
| 36  | ECH   | `CardDetails.tsx:314`                                      | Non-numeric payloads are grouped                                                       | medium      | Same as 27                                                                                                                                                                      | bad_spec, with 27 |
| 37  | ECH   | `BrandHero.tsx:79`                                         | An emoji first letter yields a lone surrogate                                          | low         | Pre-existing: the hero used the same `charAt(0)` before this change                                                                                                             | defer             |
| 38  | ECH   | `package.json:67`                                          | Two copies would make `useHeaderHeight` throw                                          | false       | Refuted as 6; the pin itself is 24                                                                                                                                              | reject            |
| 39  | ECH   | `CardDetailScreen.tsx:266`                                 | `scrollEdgeEffects` is `automatic` until layout, not `hidden` as the task says         | low         | Recorded in Implementation Notes (item 2) with its device evidence; the fix is to edit the spec                                                                                 | reject            |
| 40  | ECH   | `CardDetails.tsx:213`                                      | Frame C's reachability rests on the window height                                      | maybe-false | As 17                                                                                                                                                                           | defer, with 17    |
| 41  | ECH   | `CardDetails.tsx:231-237`                                  | An uncapped name pushes the barcode below the fold at accessibility sizes              | low         | Same root as 18's name                                                                                                                                                          | bad_spec, with 18 |

**Pass 2 (2026-10-08)**, on the re-derived code — same layers. Two `bad_spec` entries (49 and 52),
both rules the spec's Design Notes prescribed.

| #   | Layer | Location                                            | Finding                                                                       | Verdict     | Evidence                                                                                                                                                                                             | Route             |
| --- | ----- | --------------------------------------------------- | ----------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 42  | PC    | `CardDetailScreen.tsx:35-41`                        | Same-feature imports are absolute                                             | low         | carried: as 1                                                                                                                                                                                        | defer             |
| 43  | PC    | `CardDetailScreen.test.tsx:23-27`                   | Same-feature imports are absolute                                             | low         | carried: as 1                                                                                                                                                                                        | defer, with 42    |
| 44  | VG    | `CardDetailScreen.test.tsx:207-212`                 | Nothing pins the brand lookup to the card's own `brandId`                     | low         | Pre-verified: the mock returns the brand for any id, and the baseline's `toHaveBeenCalledWith('brand-1')` was dropped                                                                                | patch             |
| 45  | VG    | `CardDetails.test.tsx:440-467`                      | Nothing pins the bulb's glyph                                                 | low         | Pre-verified: the tests read only the props of whatever carries the icon's testID, so a `Sun` would pass                                                                                             | patch             |
| 46  | VG    | `CardDetailScreen.test.tsx:365-380`                 | Nothing pins the back and star glyphs                                         | low         | Pre-verified: the tests check the button type, colour and fill but never `props.icon`; the baseline pinned the star by name                                                                          | patch             |
| 47  | VG    | `CardDetails.tsx:95-96,164-167`                     | The slim-phone fit rests on the renderer's unexported 16pt padding            | low         | Pre-verified: `BarcodeRenderer.tsx:173` is a literal no test reads, and the card-detail suite mocks the renderer                                                                                     | patch             |
| 48  | VG    | `FullscreenBarcode.tsx:131`                         | The full-screen view still groups every payload in fours                      | low         | The Number row now shows a QR URL whole and the full-screen view splits it; `FullscreenBarcode` is 22.4's and on the Never list                                                                      | defer             |
| 49  | BH    | `CardDetails.tsx:244-246`                           | The snap band catches flings at its edges                                     | medium      | `RCTEnhancedScrollView.mm:209-222` (and `ReactScrollView.java:1153-1166`): a release before 248 is pulled to 248 and a flick up released past 200 stops at 200, hero hidden; the spec prescribed it  | bad_spec          |
| 50  | BH    | `CardDetails.tsx:244-246`                           | Scrolls that are not drags can rest inside the band                           | low         | Snapping runs only when a drag ends, so a VoiceOver or keyboard scroll can stop mid-band; same root as 49                                                                                            | bad_spec, with 49 |
| 51  | BH    | `FullscreenBarcode.tsx:131`                         | The full-screen view splits what the row shows whole                          | low         | As 48                                                                                                                                                                                                | defer, with 48    |
| 52  | BH    | `CardDetailScreen.tsx:261`                          | In dark the favourited star turns cream on the condensed bar                  | low         | The design system lists the filled favourite star as a beam site (§ _The beam rule_); `getFavouriteStarColor(theme.background)` is beam on black and ink on cream; the spec prescribed `textPrimary` | bad_spec          |
| 53  | BH    | `cardi-design-system.md:283-285`                    | The azure OPEN note still says the header sets the name on the accent at rest | low         | The new § _Card detail_ says the opposite; the note is in a file this diff edits                                                                                                                     | patch             |
| 54  | BH    | `stitch-prompts-card-detail.txt`, `frames/`         | The prompts and frames still prescribe what the design system now overrides   | low         | 20px padding, Esselunga's Color row, Inter values; the frames are generated, and correcting them is beyond this story's files                                                                        | defer             |
| 55  | BH    | `Tile.tsx:26`, `BrandHero.tsx`                      | The mark's colour rule differs between the tile and the hero                  | low         | Pre-existing: the hero has used `getContrastForeground` since 13.3                                                                                                                                   | defer             |
| 56  | BH    | `DetailRow.tsx:79`                                  | A static row is not read as one unit                                          | low         | Pre-existing: the static row was a plain `View` before this change                                                                                                                                   | defer             |
| 57  | BH    | `CardDetails.tsx:237`                               | A range short of 248 would rest mid-band under the snap clamp                 | maybe-false | carried: as 17                                                                                                                                                                                       | defer, with 17    |
| 58  | BH    | `cardi-design-system.md:724,767`                    | § _Icons_ and the outlined-surface list miss the new rulings                  | low         | "No filled icons" against the bulb; the surface list omits the details card                                                                                                                          | patch             |
| 59  | BH    | `CardDetails.test.tsx`, `CardDetailScreen.test.tsx` | The theme mocks copy the tokens by hand                                       | low         | carried: as 23's remainder, more than a direct correction                                                                                                                                            | reject            |
| 60  | ECH   | `CardDetails.tsx:244-246`                           | A fling crossing the band halts at its edge                                   | medium      | Same as 49                                                                                                                                                                                           | bad_spec, with 49 |
| 61  | ECH   | `CardDetails.tsx:237`                               | A viewport taller than the window shortens the range                          | maybe-false | carried: as 17                                                                                                                                                                                       | defer, with 17    |
| 62  | ECH   | `CardDetailHeader.tsx:73`                           | Android may round the end offset below 248 and lose the hairline              | maybe-false | Needs a device whose density makes 248dp fractional; medium if so                                                                                                                                    | defer             |
| 63  | ECH   | `CardDetailHeader.tsx:67-74`, `BrandHero.tsx:105`   | A light field resting at 200 loses its hairline                               | low         | The opaque field layer covers the hero's bottom rule exactly at the bar's edge, and 200 is a resting point                                                                                           | patch             |
| 64  | ECH   | `BrandHero.tsx:105`                                 | A near-black brand merges with the black ground in dark                       | low         | carried: Found, not fixed 10                                                                                                                                                                         | defer             |
| 65  | ECH   | `BrandHero.tsx:120-127`                             | The faded logo is still an accessible image                                   | low         | It announces the brand, which is harmless; hiding it needs a reaction and state, more than a direct correction                                                                                       | reject            |
| 66  | ECH   | `CardDetailScreen.tsx:254-255`                      | A brand without a colour throws                                               | low         | carried: as 15                                                                                                                                                                                       | reject            |
| 67  | ECH   | `CardDetails.tsx:89,286`                            | A QR card in a window under about 302pt overruns the hairline                 | low         | Only free-form windows that narrow; per-format padding arithmetic is more than a direct correction                                                                                                   | reject            |
| 68  | ECH   | `jest.setup.js:477-480`                             | A reaction that writes a shared value would recurse                           | low         | carried: as 35                                                                                                                                                                                       | reject            |
| 69  | ECH   | `BrandHero.tsx:85`                                  | An emoji first letter yields a lone surrogate                                 | low         | carried: as 37                                                                                                                                                                                       | defer             |
| 70  | ECH   | `CardDetails.tsx:237`, `CardDetailHeader.tsx:73`    | Android can rest mid-blend, or condensed without the hairline                 | maybe-false | As 61 and 62                                                                                                                                                                                         | defer, with 17    |
| 71  | ECH   | `CardDetails.tsx:259-290`                           | A QR with a two-line name at AX3+ on a 667pt phone sits partly below the fold | low         | At the largest accessibility sizes everything grows; the criterion reads at default sizes                                                                                                            | reject            |
| 72  | ECH   | `CardDetails.tsx:368-375`                           | The Edit row keeps a MaterialIcons chevron                                    | low         | carried: Found, not fixed 3 (the shared `ActionRow`)                                                                                                                                                 | defer             |

**Pass 3 (2026-10-09)**, on the third derivation — same layers. No `bad_spec` or `intent_gap` entry, so
no loopback: the sixteen `patch` rows went back to the third derivation's implementer as fourteen
fixes, and every `defer` was carried. Passes 1 and 2 looped back, which left their `defer` rows moot, so none was
ever written. At the end of the run the ones that still hold were recorded as Found, not fixed
12–17.

| #   | Layer | Location                                                                              | Finding                                                                | Verdict | Evidence                                                                                                                                                                                                                                                                                                                                                                        | Route          |
| --- | ----- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 73  | PC    | `cardi-design-system.md:563-564`                                                      | The bulb's ruling reads as `primary` in both states                    | low     | Off, it is a `textSecondary` outline in a `border` ring (`CardDetails.tsx:343,354`), Story 16.39's colours                                                                                                                                                                                                                                                                      | patch          |
| 74  | PC    | `CardDetailScreen.tsx:36,42`, `CardDetailScreen.test.tsx:27,31`                       | Same-feature imports are absolute                                      | low     | carried: as 42 and 43                                                                                                                                                                                                                                                                                                                                                           | defer          |
| 75  | VG    | `CardDetailHeader.tsx:160-185,216-231`                                                | The bar's layers and the title are never rendered with their opacities | medium  | Pre-verified: the global `useAnimatedStyle` mock returns `{}`, so swapping `.ground` and `.field`, or dropping the title's style, passes every suite                                                                                                                                                                                                                            | patch          |
| 76  | VG    | `BrandHero.tsx:67-68,83-85,113`                                                       | The hero's fade is never applied in a test                             | low     | Pre-verified: no test passes `scrollOffset` to `BrandHero` or reads its content view's opacity                                                                                                                                                                                                                                                                                  | patch, with 75 |
| 77  | VG    | `CardDetails.tsx:162-165`                                                             | A fling released inside the band is not verified to keep its momentum  | medium  | Pre-verified: the only fling test releases at 150, outside the band, so deleting the guard brings back row 49's clamp with every test green                                                                                                                                                                                                                                     | patch          |
| 78  | VG    | `BarcodeRenderer.tsx:95-97,178-185`                                                   | Nothing checks a linear code narrower than 280                         | low     | Pre-verified: card detail's suite mocks the renderer, and the renderer's own tests pin only its padding and the QR floor                                                                                                                                                                                                                                                        | patch          |
| 79  | VG    | `cardi-design-system.md:561-562`                                                      | The QR sentence says 220 is drawn whatever is asked for                | low     | The renderer draws the larger of the request and 220 (`BarcodeRenderer.tsx:95-96`); `barcodeGeometry.ts` states the floor correctly                                                                                                                                                                                                                                             | patch          |
| 80  | BH    | `cardi-design-system.md:561-562`                                                      | The QR rule is misstated                                               | low     | Same as 79                                                                                                                                                                                                                                                                                                                                                                      | patch, with 79 |
| 81  | BH    | `CardDetailHeader.tsx:135-141`                                                        | `fieldTakesHairline` says the hero and the tile cannot disagree        | low     | In dark the tile also outlines light and near-black fills (`Tile.tsx:149`); the hero takes its rule in light only. The dark near-black gap itself is Found, not fixed 10 (row 64)                                                                                                                                                                                               | patch          |
| 82  | BH    | `cardi-design-system.md:529`, `CardDetailHeader.tsx:10-11`, `CardDetails.tsx:172,179` | The settle animates, so "Reduce Motion needs nothing" is false         | false   | Both sentences describe the blend, which follows the offset untimed. The settle is a native animated scroll of at most 24pt, the kind UIKit runs under Reduce Motion when it snaps a half-collapsed large title; the app's other animated scroll (`FeatureHighlightsScreen.tsx:86`) does not check it either, and its Reduce Motion handling covers timed Reanimated animations | reject         |
| 83  | BH    | `CardDetailHeader.tsx:162-184,216-231`, `BrandHero.tsx`                               | No test checks which worklet drives which animated style               | medium  | Same as 75 and 76                                                                                                                                                                                                                                                                                                                                                               | patch, with 75 |
| 84  | BH    | `CardDetailHeader.test.tsx:152`                                                       | The "times nothing" test can never fail                                | low     | carried: as 7; row 75's patch evaluates the styles themselves                                                                                                                                                                                                                                                                                                                   | patch          |
| 85  | BH    | `CardDetails.tsx:315,452-456`                                                         | "Tap to enlarge" has no side padding and is not centred                | low     | The card pads only top and bottom (`:444-450`), so at accessibility sizes the wrapped hint runs to the hairline in left-aligned lines                                                                                                                                                                                                                                           | patch          |
| 86  | BH    | `CardDetailHeader.tsx:224`                                                            | The title stops scaling with font size on Android                      | false   | `NAVIGATION_TITLE_FONT` sets no size, so `ScreenStackHeaderConfig.kt:281-282` never runs, and the AppCompat toolbar title of the app's `Theme.AppCompat.DayNight.NoActionBar` is 20dp (`abc_text_size_title_material_toolbar`), which does not scale either                                                                                                                     | reject         |
| 87  | BH    | `cardi-design-system.md` § _Card detail_                                              | The loading and error headers and the logo slot are unrecorded         | low     | The section says it records the rulings where the frames are silent; they show no loading or error state, and frame A's wide wordmark is drawn in an 80pt slot (Found, not fixed 11)                                                                                                                                                                                            | patch          |
| 88  | BH    | `CardDetails.tsx:107,200-202`                                                         | Digits-only grouping is a private regex, not the shared formatter      | low     | Developer-only: the one other caller, `FullscreenBarcode`, is 22.4's and deferred as 48; a new tested export is more than a direct correction                                                                                                                                                                                                                                   | reject         |
| 89  | BH    | `CardDetailHeader.tsx:31-133`                                                         | The scroll maths lives in a component file                             | low     | No caller diverges; moving the constants and worklets to `utils/` is more than a direct correction                                                                                                                                                                                                                                                                              | reject         |
| 90  | BH    | `jest.setup.js:145-161`                                                               | The global mocks lack `useIsFocused` and `useHeaderHeight`             | false   | Only `CardDetailScreen.test.tsx` renders the screen, and it mocks both; a new suite would fail on its first run                                                                                                                                                                                                                                                                 | reject         |
| 91  | BH    | `CardDetailScreen.tsx:296-306`                                                        | The star announces its state twice                                     | low     | The label flips between "Add to favorites" and "Remove from favorites" while `selected` carries the same state                                                                                                                                                                                                                                                                  | patch          |
| 92  | BH    | `CardDetailHeader.tsx:225-227`, `CardDetails.tsx:284-291`                             | Past the midpoint there are two identical headings                     | low     | The bar title repeats the content heading, as a collapsing title does, and is heard twice only by heading navigation past 224; hiding the name means threading the midpoint into the content                                                                                                                                                                                    | reject         |
| 93  | BH    | `cardi-design-system.md:563-564,785-786`                                              | The MaterialIcons claim, and the bulb's colour                         | low     | The full-screen barcode card detail opens still draws a MaterialIcons close (`FullscreenBarcode.tsx:100`); the bulb half is 73                                                                                                                                                                                                                                                  | patch          |
| 94  | BH    | `package.json:67`                                                                     | The new dependency's peer is undeclared                                | low     | `@react-navigation/elements` 2.9.15 peers on `@react-navigation/native` `^7.2.2`, which the root does not declare, so Yarn warns on every install (Implementation Notes, item 5); the `^7.1.33` lock key resolves to 7.2.2                                                                                                                                                      | patch          |
| 95  | BH    | `colors.contrast.test.ts:165`, `typography.ts:132-137`, `luminance.ts:7`              | Comments outside the diff describe the old header                      | low     | The contrast test's is false now (Found, not fixed 9: azure meets the title only mid-blend); the other two still read true — `luminance` still colours the header's controls, and the typography note defers to each screen's story                                                                                                                                             | patch          |
| 96  | ECH   | `CardDetails.tsx:176-181`                                                             | On Android a touch during the settle fires a mid-band momentum end     | medium  | `ReactScrollView.java:618-626` begins the drag and cancels the fling animator, whose listener emits a momentum end (`ReactScrollViewHelper.kt:475-493`); `onMomentumEnd` then starts a second animated scroll under the finger. Read from source; Android is untested                                                                                                           | patch          |
| 97  | ECH   | `CardDetails.tsx:171-180`                                                             | The settle animates under Reduce Motion                                | false   | Same as 82                                                                                                                                                                                                                                                                                                                                                                      | reject         |
| 98  | ECH   | `CardDetailHeader.tsx:140-141`                                                        | A near-black field in dark dissolves into the ground                   | low     | carried: as 64 (Found, not fixed 10)                                                                                                                                                                                                                                                                                                                                            | defer          |
| 99  | ECH   | `BrandHero.tsx:79`                                                                    | An emoji first letter yields a lone surrogate                          | low     | carried: as 69                                                                                                                                                                                                                                                                                                                                                                  | defer          |
| 100 | ECH   | `CardDetails.tsx:282-291`                                                             | On a 667pt phone at accessibility sizes the QR starts below the fold   | low     | carried: as 71                                                                                                                                                                                                                                                                                                                                                                  | reject         |
| 101 | ECH   | `CardDetailScreen.tsx:184`                                                            | `scrollEdgeEffects` is `automatic` until layout                        | low     | carried: as 39                                                                                                                                                                                                                                                                                                                                                                  | reject         |

## Design Notes

Decided here (the sources are silent or conflict):

- **Header mechanics.** The native header stays, transparent; `headerBackground` holds a ground layer
  and a brand layer (both hidden until the hero has passed under the header) and the hairline. Past
  that point the brand layer fades out over 48pt of scroll while the title fades in, then the
  hairline shows. Scroll-linked, never timed, so Reduce Motion needs nothing. The back, star and
  status bar take the field's contrast foreground at rest and the scheme's when past the blend
  midpoint (`useAnimatedReaction` → `scheduleOnRN`); the star when favourited is
  `getFavouriteStarColor(field)` at rest and `getFavouriteStarColor(theme.background)` past the
  midpoint — beam on black, ink on cream, because the design system's beam rule lists the filled
  favourite star — with no plate (design system § _Card tile_). The star reports `selected` when
  favourited.
- **No resting mid-blend.** A scroll that comes to rest inside the band — at the end of a drag that
  leaves no momentum, or when momentum ends — settles to the band's nearer end with an animated
  scroll; a drag or fling that comes to rest outside the band is left exactly where it stops. No
  `snapToOffsets`: React Native pulls any release whose target lies past a snap point back to the
  band's edge (`RCTEnhancedScrollView.mm:209-222`), so a flick to the top from the condensed bar
  stopped at 200 with the hero still hidden. The scroll view can always reach 248: its minimum
  content height comes from its own measured height (`onLayout`), not the window's, and the
  condensed state counts from one physical pixel short of 248, because Android scrolls in whole
  pixels. The header still follows the offset, but a drag never leaves the field half-faded — red
  over cream would rest on salmon, yellow over black on olive, both banned. Scrolls that are not
  drags (a screen reader bringing a row into view, a hardware keyboard) can still stop inside the
  band; that is recorded, not engineered around.
- **Title.** The card's name in `bodyLgStrong`, one line, capped to clear both controls; it does not
  scale with Dynamic Type, as the native title it replaces does not, and it is hidden from screen
  readers until the blend midpoint, while the stack's name is the screen's heading.
- **Reload.** Every focus refetches the card behind the loading state, and `Stack.Screen` options merge
  per route (`setOptions` spreads each call into the last), so the loading and error states set every
  key the success state sets: `headerTitle`, `headerBackground` and `headerRight` cleared, and
  `headerLeft` the same `HeaderIconButton` back control in `textPrimary` rather than the shared
  Unistyles one. A reload also resets the scroll offset and the midpoint state, so the loaded card
  starts at rest. The screen's tests merge options the way `setOptions` does.
- **Hero.** 200pt plus the header's height, running under the bar; a brand-coloured extension above
  it covers the iOS bounce. The name moves out to the stack: `headlineMd`, `textPrimary`, at most two
  lines as the hero had them, 16 above and below. Avatar: an 80pt circle with the letter in the
  field's contrast foreground — on a dark field a 16 % white wash (frame D), on a light field no wash
  and a 1pt ring in the foreground instead, because an ink wash over the beam-yellow accent paints
  mustard (the design system: beam at exactly `#FCCC0C` or not at all).
- **Barcode card.** `BARCODE_FLASH.background` in both schemes, 1px `border`, radius 16, padding 16
  (16 is a spacing token; the frame's 20 is not); linear codes 280×100, narrowed on a phone too
  narrow for the renderer's own 16pt padding each side to fit inside the card; QR codes requested at
  the renderer's 220 floor (`MIN_QR_SIZE`), which is what they render at; "Tap to enlarge" in
  `captionMd` inside it, 12 below the bars, in `LIGHT_THEME_COLORS.textSecondary` because the card
  stays white; pressed is the 0.98× scale. The bulb toggle stays below the card, outside it, in Lucide
  (`lightbulb`, filled when on), pressed at the 0.98× scale.
- **Rows.** Labels `bodyMd` `textSecondary`; values `bodyMd` `textPrimary`, the number in `monoCode`
  (the design system's card-number face wins over the frame's Inter), grouped in fours only when it
  is all digits — any other payload (a QR URL, an alphanumeric Code 128) shows as it is, so neither
  the row nor its spoken label splits it; the whole Number row copies, its hint kept; Color for custom
  cards only, name only; Added keeps its formatter. Manage: `ActionRow variant="plain"` rows — Edit
  with its chevron, Delete `destructive` with no chevron and "Deleting…" while busy — keeping the
  shared row's chevron and pressed fill.
- **Dark.** The field stays the brand; the condensed header is `background` (black) with the dark
  `border` hairline; surfaces are `surface`.
- **Record** in the design system: the 48pt blend, its settle-to-an-end rule and the exception for
  non-drag scrolls, the midpoint flip, the favourited star past it, the dark condensed header, the barcode card's fixed hint colour and padding, `monoCode` for the number on
  this screen and its digits-only grouping, the avatar on light fields, the Color row for custom cards
  only (the frames draw one for Esselunga), QR codes at the renderer's floor, the hero content's fade,
  the bounce extension, the light-field hairline, and the bulb's filled-when-on state and its beam in
  dark mode (Story 16.39's, kept).

Flagged, out of scope (to Found, not fixed):

1. The screen swaps to a spinner on every refocus (`CardDetailScreen.tsx:93`), resetting the scroll.
2. Copying fires two success haptics (`CardDetails.tsx:144` and the toast's `haptic`).
3. `ActionRow` keeps a MaterialIcons chevron and a non-design-system destructive pressed state; it is
   shared with settings and add-card.
4. No React Navigation theme is passed, so the native header's interface style is always light
   (`useHeaderConfigProps.tsx:222,530`); iOS 26 glass in dark mode may read light.
5. `FullscreenBarcode` places its close button at hard-coded top offsets with literal colours
   (`FullscreenBarcode.tsx:146`), outside the safe-area rule; 22.4 converges it with `BarcodeFlash`.
6. `/barcode/[id]` has no caller in the app; only the `cardi://barcode/<id>` deep link reaches it.
7. Azure stays open: on an azure field the favourited beam star measures 2.66:1 against the 3:1
   floor, and the title crosses azure mid-blend; no small text sits on it at rest any more.

## Verification

**Commands:**

- `yarn typecheck` -- expected: no errors.
- `yarn lint` -- expected: no errors, no warnings.
- `yarn format:check` -- expected: clean, untracked docs included.
- `yarn test` -- expected: all suites green, `CardDetails.brightness.test.tsx` unchanged.

**Manual checks:**

- iOS simulator at 393pt, light and dark: frames A, B, C and D for a branded and a custom card,
  including mid-blend, the reverse scroll, the bounce, the full-screen barcode and a favourite
  toggle; compare against the frames. Android has no emulator on this host, so it is unverified.
