---
title: 'Story 22.4: Barcode Flash — the three Cardì barcode frames'
type: 'feature'
created: '2026-10-09'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '35997eae09bc3f52b6ba5104e1b69141f2b49012'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/docs/project-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The full-screen barcode is built twice and neither copy matches the Cardì frames. The
`barcode/[id]` route (`BarcodeFlash`) and card detail's own modal (`FullscreenBarcode`) have drifted
apart: shadowed plates, Tailwind greys, a MaterialIcons close button, a number grouped in fours, two
copy gestures, and bars 120–140pt tall. The route's card-not-found state is off-palette too.

**Approach:** Implement frames A (EAN-13), B (QR) and C (card not found) from
`docs/design/cardi/frames/cardi-barcode-frames.html` and `stitch-prompts-barcode.txt`, light and
dark, with `cardi-design-system.md` winning any conflict. Build them as one barcode screen that both
card detail's barcode card and the `cardi://barcode/<id>` link open: a white field at full brightness
holding the store name, the bare code, its number and the hint, closed by a tap anywhere.

## Boundaries & Constraints

**Always:**

- The screen is white edge to edge in both schemes and from both entry points:
  - `BARCODE_FLASH.background` across the whole screen and both insets;
  - nothing else ever shows behind the content, whether loading, fading in or sliding away;
  - true-black bars;
  - text in the light scheme's fixed roles (`LIGHT_THEME_COLORS`: `textPrimary`, `textSecondary`,
    `error`), never the active scheme's.
- Nothing is drawn over or around the code: no plate, border, radius, shadow, logo, beam, scan line,
  watermark or tint. Beam `#FCCC0C` appears nowhere on the screen.
- Keep what other stories rely on:
  - **brightness:** Story 2.5's maximise while the screen shows and restore afterwards, and Story
    16.39's composition under card detail's boost. `useBrightness.nesting.test.ts` and every assertion
    of `CardDetails.brightness.test.tsx` hold; only that suite's selectors may change.
  - **formats:** all six still draw through `BarcodeRenderer`, with its format map, its placeholders
    and its 220pt QR floor.
  - **Story 2.5:** offline display; closing by a tap, a swipe down or Android back; long-press copy
    with a success haptic.
  - **usage:** the barcode screen records none (Story 9.1).
  - **logging:** the barcode value is never logged (Story 16.23).
- House rules:
  - fixed or theme roles only, and type from `TYPOGRAPHY`;
  - every tappable at least `TOUCH_TARGET.min`;
  - content kept clear of the status bar and home indicator by the safe-area insets;
  - window size from `useWindowDimensions`, never captured at module scope;
  - strings in `en.ts` and `it.ts`;
  - pressed visuals via `onPressIn`/`onPressOut`, never `style={({ pressed }) => …}`;
  - `scheduleOnRN` from react-native-worklets rather than the deprecated `runOnJS`.
- Check every library API against current documentation or the installed source in
  `node_modules/` before using it. Use Context7 pinned to this repo's versions:
  - Expo SDK 55, expo-router 55.0.13, React Native 0.83.6;
  - Reanimated 4.2.1, react-native-worklets 0.7.4, react-native-gesture-handler 2.30.1;
  - expo-status-bar 55.0.5, expo-brightness 55.0.13, @bwip-js/react-native 4.10.1.

  Nothing is implemented from memory or by assumption.

**Decided (ifero, 2026-10-09):**

- **QR size:** the QR code is as wide as the linear code. Its box is a
  `min(0.8 × window width, 320)` square, 314pt on a 393pt phone.
- **Convergence:** one barcode component with two hosts.
  - Card detail presents it in place, in a React Native `Modal`.
  - The `barcode/[id]` route renders the same component for `cardi://barcode/<id>`.
- **Spec size:** kept whole, well over the 1,600-token target.

**Never:**

- Commit, push, or change `docs/sprint-artifacts/sprint-status.yaml` or any other tracker file —
  the orchestrator owns all three.
- Change any of these:
  - `useBrightness.ts` or `useCardBrightnessBoost.ts`;
  - `BarcodeRenderer`'s format map or QR floor;
  - what card detail's own barcode card draws: its box, its hint, and the Story 22.3 tests that pin
    them.
- Put anything on the screen beyond the store name, code, number and hint, or frame C's message and
  "Go back". That rules out a header, close button, icon, logo, brightness hint or toast.
- Navigate card detail to the `barcode/[id]` route.
- Touch the watch apps (Epic 23), the scanner (22.5), card detail's layout (22.3), or the shared
  `screenOptions` in `app/_layout.tsx`.

## I/O & Edge-Case Matrix

| Scenario         | Input / State                                                                        | Expected Output / Behavior                                                                                                                                                                                             | Error Handling                              |
| ---------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| EAN-13 (frame A) | a linear code: EAN13, EAN8, UPCA, CODE128, CODE39                                    | Frame A: white field; store name; the bare code `min(0.8 × window width, 320)` wide with its bars filling a 200pt-tall box; the number; "Tap anywhere to close"; the group centred between the insets; dark status bar | renderer failure → its existing placeholder |
| QR (frame B)     | a QR card                                                                            | Frame B: the same stack with the square code in place of the bars, in a `min(0.8 × window width, 320)` square box                                                                                                      | as frame A                                  |
| Number           | any payload                                                                          | shown exactly as stored, never grouped, in `monoCode`; a long one wraps to three lines at most                                                                                                                         | N/A                                         |
| From card detail | the barcode card pressed                                                             | the barcode screen opens in place over card detail; closing it returns to card detail where it was, with no reload, no second usage count and no brightness dip                                                        | N/A                                         |
| By link          | `cardi://barcode/<id>`                                                               | a white loading state with an ink spinner, then frame A or B                                                                                                                                                           | as below                                    |
| Not found        | an unknown, missing or unloadable id                                                 | Frame C on white: the not-found, invalid-id or load-failed message in `error`, with "Go back" 32pt below                                                                                                               | "Go back" and Android back leave the screen |
| Close            | a tap anywhere (the number included), a swipe down past 100pt or flung, Android back | the content fades out over 150ms or slides away over 200ms, then the screen closes; brightness goes back as Stories 2.5 and 16.39 have it                                                                              | N/A                                         |
| Copy             | a long press on the number                                                           | copied, with a success haptic and no toast; the screen stays                                                                                                                                                           | failure → a logged warning, never the value |
| Dark             | dark scheme                                                                          | identical to light                                                                                                                                                                                                     | N/A                                         |
| Large text       | the largest accessibility size                                                       | the whole code stays on screen, unshrunk, with nothing over it                                                                                                                                                         | N/A                                         |
| Screen reader    | VoiceOver or TalkBack                                                                | the store name as a heading, the code's label, the number with its copy hint, and the close target as a button                                                                                                         | N/A                                         |

</frozen-after-approval>

## Code Map

- `features/cards/components/BarcodeFlash.tsx` -- the route's view, to become the one barcode view:
  - module-scope `Dimensions.get` at `:46` (Story 16.22 flagged it);
  - brightness on mount and unmount at `:67-76`;
  - the fades and `runOnJS` at `:79-90`, the copy at `:93-100`, and the pan at `:103-118`;
  - sizes at `:127-129`, and React Native's `StatusBar` at `:133`;
  - the outer dismiss `Pressable` at `:136-142` (accessible, so on iOS it hides every child from
    VoiceOver);
  - the long-press-only number at `:162-174`, which swallows a tap;
  - shadow, radius and Tailwind greys at `:186-239`.
- `features/cards/screens/BarcodeScreen.tsx` -- loads the card with `getCardById` (`:44-68`).
  - The loading state is at `:76-82`, with a `#000000` spinner.
  - The error state is at `:85-95`: the `invalidId`/`notFound`/`loadFailed` copy and "Go back"
    (`auth.verifyEmail.goBack`).
  - Literal hexes at `:100-124`. `router.back()` at `:71-73` also works on a cold link: expo-router
    puts `index` beneath the route (`unstable_settings` at `app/_layout.tsx:39-41`), so `canGoBack()`
    is true.
- `app/barcode/[id].tsx` -- the route file is a re-export only.
  - Its options, at `app/_layout.tsx:207-215`, are `fullScreenModal`, `headerShown: false` and
    `animation: 'fade'`.
  - It inherits `contentStyle: theme.background` from `:142-143`, so in dark mode it is black behind
    a fading view.
  - No in-app caller exists.
- `features/cards/components/FullscreenBarcode.tsx` (+ 20-test suite) -- card detail's modal.
  - `Modal` at `:82-88` sets fade, `fullScreen` and `statusBarTranslucent`, with no `onRequestClose`,
    so Android back does nothing.
  - MaterialIcons close at `:92-101`.
  - Tap-to-copy plus an `onCopy` toast at `:67-75` and `:122-132`; fours grouping at `:131`.
- `features/cards/components/CardDetails.tsx` -- where card detail wires in the full screen:
  - the `FullscreenBarcode` import at `:60`, `fullscreenVisible` at `:147`, and open/close at
    `:242-251`;
  - the barcode card's press at `:317` and its labels at `:326-327`;
  - the overlay at `:439-445`.
  - Its `onCopy` prop also drives its own Number row's toast, and keeps doing so.
- `features/cards/components/BarcodeRenderer.tsx` -- draws the code. Keep its format map (`:54-61`),
  QR floor (`:95-97`) and placeholders (`:154-170`).
  - It passes bwip-js millimetres: `height / 10` is 20mm for a 200pt box. The comment at `:23-24`
    calling this a pixel ratio is wrong.
  - It draws `resizeMode="contain"` (`:178-185`) inside a 16pt white padding (`:172-177`). A linear
    code is therefore letterboxed in its box. Measured from bwip-js 4.10.1's output: a 314 × 200 box
    draws EAN-13 bars at about 278 × 167, and a 134-module Code 128 at only 288 × 123.
  - `stretch` maps to `ScaleToFill`/`FIT_XY`, which scales each axis to the box, so a 1-D code fills
    its box's height.
    - Where the box's width already limits the default draw (EAN-13, a long Code 128), the bars keep
      their width.
    - A short code (EAN-8) widens to the box too. It does so uniformly, as frame A draws its code.
    - bwip's `paddingheight` (2pt today) is the only vertical white.
- `features/cards/utils/barcodeGeometry.ts` -- `MIN_QR_SIZE` 220 and `RENDERER_SIDE_PADDING` 16.
  `formatBarcode.ts` stays, because card detail still uses it.
- `features/cards/hooks/useBrightness.ts`, `useCardBrightnessBoost.ts` -- do not change.
  - The nesting is proven by `useBrightness.nesting.test.ts` and by
    `CardDetails.brightness.test.tsx`, which wires the real hook, `CardDetails` and the full-screen
    view.
  - That suite opens the view with `card-details-barcode-preview` and closes it with
    `fullscreen-barcode-close`.
- `node_modules/react-native/Libraries/Modal/Modal.js:278-289` -- on iOS a closing `Modal` keeps its
  children mounted until the native dismissal ends; on Android, and in Jest
  (`jest/mocks/Modal.js`), they unmount at once.
  - A React Native `Modal` does not change navigation focus.
  - A pushed route blurs card detail under every presentation.
  - On iOS, how the `Modal` closes matters. Toggling `visible`, with the `Modal` staying mounted,
    closes with the native fade from white. Unmounting it cuts straight to a dimmed card detail, as
    the step-3 device run recorded.
- `node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/views/modal/ReactModalHostView.kt`
  -- Android's `Modal` differs from iOS in three ways:
  - **`onShow` fires early.** It is the dialog's `OnShowListener` (`:284`), which `Dialog.show()`
    fires as the window is added. That is at the START of `animationType="fade"`'s `catalyst_fade_in`
    (`config_shortAnimTime`), not at its end as on iOS.
  - **Back never reaches JS.** The hardware back key never reaches a JS `BackHandler` while the
    dialog is up; it calls the `Modal`'s `onRequestClose` (`:286-312`).
  - **Unmounting fades the dialog out.** It dismisses the dialog (`:192-203`) through
    `catalyst_fade_out`, with whatever the dialog shows at that moment.
- **Back on the route** -- Android back first reaches JS `BackHandler` listeners, the last registered
  running first, before expo-router pops the screen.
- Status bar:
  - `UIViewControllerBasedStatusBarAppearance` is NO, so expo-status-bar's `StatusBar` sets the
    app-wide style, inside an iOS modal too. The last one mounted wins.
  - The root bar (`app/_layout.tsx:271`) mounts after the stack on a cold start, so a bar rendered in
    the first commit loses to it.
  - On Android a `StatusBar` inside a `Modal` may not restyle the dialog, which copies the window's
    style once, as it opens.
- `shared/theme/colors.ts:113-116` -- `BARCODE_FLASH` is `#FFFFFF` / `#000000`.
- `shared/theme/tokens.generated.ts:30-49` -- `LIGHT_THEME_COLORS`: `textPrimary` `#181824`,
  `textSecondary` `#55555F`, `error` `#C41E1E`.
- `shared/theme/typography.ts` -- the tokens the stack uses:

  | Token          | Line   | Spec                                  | Use       |
  | -------------- | ------ | ------------------------------------- | --------- |
  | `headlineSm`   | `:97`  | Inter 20/28 700                       | name      |
  | `monoCode`     | `:125` | JetBrains Mono 16/24 500, no tracking | number    |
  | `captionLg`    | `:110` | Inter 14/20                           | hint      |
  | `bodyLgStrong` | `:101` | Inter 17/24 600                       | error     |
  | `bodyLg`       | `:99`  | Inter 17/24                           | "Go back" |

  No token is Inter 16.

- `shared/i18n/locales/en.ts:658-667`, `it.ts:654-664`:
  - `cards.flash.*` is used only by `BarcodeFlash`;
  - `cards.details.fullscreen{Close,Number}AccessibilityLabel` and `fullscreenNumberHint` are used
    only by `FullscreenBarcode`;
  - parity is gated by `card-colors.test.ts:31-58`.
- `features/cards/index.ts:37-42` -- the barrel exports `BarcodeFlash` and `FullscreenBarcode`.
  Nothing imports either through it.
- `jest.setup.js`:
  - `:548-569` gesture-handler: `Pan` handlers never fire;
  - `:300-533` Reanimated: `withTiming` runs its callback synchronously and `useAnimatedStyle`
    returns `{}`;
  - `:535-546` worklets: `scheduleOnRN` runs synchronously;
  - `:144-162` expo-router: `back`, but no `canGoBack`.
  - `node_modules` here lacks `lucide-react-native`; the orchestrator runs `yarn install` first.
- Tests:
  - `BarcodeFlash.test.tsx` (15) and `BarcodeScreen.test.tsx` (6);
  - `FullscreenBarcode.test.tsx` (20), deleted with its subject;
  - `CardDetails.test.tsx`: its `FullscreenBarcode` stub at `:66-81`, and the `expanded` state at
    `:337-359`.

## Tasks & Acceptance

**Execution:**

- [x] `features/cards/components/BarcodeRenderer.tsx` (+ test) -- add an opt-in mode that fills the box
      for linear codes: the bitmap stretched to the box, with no vertical padding. QR codes and the
      default draw stay unchanged, so card detail is untouched. Correct the millimetre comment. -- the
      frames' bars run the box's full height.
- [x] `features/cards/components/BarcodeFlash.tsx` (+ test) -- the one barcode view, frames A and B,
      per Design Notes. It is host-agnostic through `onDismiss`.
  - It owns the static white ground, the animated content, the gestures, every close path's exit, the
    brightness on mount and unmount, and the status bar.
  - It takes a ref handle whose `close()` runs the same exit as a tap.
  - It listens for Android's hardware back itself.
  - The swipe decision is a pure, tested function, because the gesture mock never fires.
  - Its tests read the content's opacity from the evaluated animated style: 0 until the host has
    presented the view, then 1. Across that flip, neither `maximize` nor `restore` runs again.
  - Its tests pin:
    - the close target ordered behind the content;
    - every close path, Android back and `close()` included, running the content's exit before
      `onDismiss`;
    - a swipe marking the view closing;
    - the box following a window change while the view is mounted.

    Each new check is seen to fail under its mutation.

- [x] `features/cards/components/CardDetails.tsx` (+ `CardDetails.test.tsx`) -- present `BarcodeFlash`
      in place of `FullscreenBarcode`, in a React Native `Modal` that stays mounted and toggles
      `visible`. The barcode card itself does not change.
  - The `Modal` covers the full screen and stays white.
  - It fades on iOS and has no animation on Android (Design Notes, _Opening_).
  - Its `onRequestClose` asks the view to close through its handle, rather than closing the `Modal`
    itself.
- [x] `features/cards/components/FullscreenBarcode.tsx`, `FullscreenBarcode.test.tsx`,
      `features/cards/index.ts` -- delete the component and its export. Carry its still-true
      assertions into `BarcodeFlash.test.tsx`.
- [x] `features/cards/screens/BarcodeScreen.tsx` (+ test) -- the loading state and frame C, per Design
      Notes.
  - It stays styled through `react-native-unistyles`' `StyleSheet`, as it is today.
  - Every state is white from its first frame, in both schemes.
  - A test pins that the route renders the view ungated: `isPresented` is never `false`.
- [x] `features/cards/components/CardDetails.brightness.test.tsx` -- change the selectors only; keep
      every assertion and the real wiring.
- [x] `shared/i18n/locales/en.ts`, `it.ts` -- in both locales, drop:
  - the three `cards.details.fullscreen*` keys this leaves unused;
  - the closing "Long press to copy." from `cards.flash.barcodeValueA11yLabel`, which its hint already
    says.
- [x] `docs/design/cardi/cardi-design-system.md` -- record the rulings listed under "Record" in the
      Design Notes.
- [x] `docs/design/cardi/README.md:884-889`, `docs/design/cardi/stitch-prompts-card-detail.txt:86-91`
      -- mark each "two implementations" note resolved by Story 22.4: one `BarcodeFlash`, two hosts.

**Acceptance Criteria:**

- **Frames A and B:**
  - Given an EAN-13 card and a QR card, in light and dark,
  - when the barcode opens from card detail or from `cardi://barcode/<id>`,
  - then frame A or B shows on a white field edge to edge: the store name, the bare code, its number
    and the hint, and nothing else.
- **Nothing on the code:**
  - Given the barcode screen at any moment of opening, showing or closing,
  - then nothing is drawn over or around the code, and nothing but white shows behind it.
- **Frame C:**
  - Given a card that cannot be loaded,
  - when the link opens,
  - then frame C shows on white, and "Go back" leaves the screen.
- **Brightness and formats:**
  - Given card detail with the brightness setting off or on,
  - when the barcode opens and closes,
  - then the screen is at full brightness while it shows, and returns to card detail's level
    afterwards;
  - and every format the renderer supports still draws.

## Implementation Notes

**Step 3 (2026-10-09/10).** A context-free subagent built this from the spec. Its work was then
checked against the diff, not against its report.

**Beyond the task list**, each found on the iOS simulator:

1. **Content drawn over card detail while opening.** During the `Modal`'s native cross-dissolve, the
   content was composited over a still-visible card detail. That broke "nothing but white shows
   behind it … fading in".
   - `BarcodeFlash` gained an optional `isPresented` prop, `true` by default. Card detail sets it from
     the `Modal`'s `onShow`, so the fade brings in the white alone and the content fades in after it.
   - The route is not gated. On Android a cold link's first screen reports no transition end, so a
     reveal waiting for one would never come. On the route, the content may show in the last frames
     of the route's own fade.
2. **At AX5, frame B put the store name under the clock**, because the centred group overflowed both
   insets. The stack is now centred by `marginVertical: 'auto'`. Those margins collapse when the group
   cannot fit, so it starts at the top inset; only the touch hint can run off the bottom. At default
   sizes, frames A and B are pixel-identical to before the change.

**Outside the Code Map:**

- `jest.config.js` adds `expo-status-bar` to `transformIgnorePatterns`, because the brightness suite
  renders the real `BarcodeFlash` and may change only its selectors.
- `formatBarcode.ts`'s header comment named the deleted component.
- `BarcodeScreen` is now a `const` arrow, per AGENTS.md.
- A `metro` entry was added to the git-ignored `.claude/launch.json`.

**Choices where the spec was silent:**

- The close target is a full-screen `Pressable` behind the content. A tap on the content reaches a
  touch-only stack `Pressable` (`accessible={false}`, `importantForAccessibility="no"`), so screen
  readers read the name, the code and the number on their own.
- The code's box is an accessible image with no label of its own, so it is read by the renderer's.
- The hint is hidden from screen readers; the close button carries its words.
- The number's 48pt target is padding taken back out of the gaps either side.
- A once-only dismiss guard means a tap plus a swipe, or Android back during a fade, still calls the
  host's `onDismiss` once.
- The spinner is `LIGHT_THEME_COLORS.primary`, which is ink.
- The barcode card on card detail never had an `expanded` state; the stub in its test did. Nothing
  needed keeping there.

**Verification by the implementer**, read from exit codes, unpiped:

- `typecheck`, `lint` (0 warnings) and `format:check` pass.
- 206 suites and 3,027 tests pass, with coverage about 95 % of statements.
- The touched suites pass under five `--randomize` seeds.

**The orchestrator's check of the diff:**

- All eight tasks are done and all four acceptance criteria hold.
- The six touched suites pass on the final tree (151 tests, exit 0).
- **Matrix audit:** every row is covered by a test that ran.
- Two clauses only a device or the framework can show:
  - **Android back on the route:** native-stack pops it, and no app code intercepts it. No Android
    emulator is available.
  - **"No reload, no second usage count" from card detail:** this follows from the `Modal`, which
    leaves navigation focus alone. The in-place test pins the `Modal`, and fails on a pushed route.

**Implementer's device run, iOS only.** A dedicated "DS22-4 iPhone 16" simulator (393 × 852, iOS 26)
ran the existing Debug build against this worktree's Metro. It was driven over Metro's debugger, and
the screenshots were measured with Pillow. The screenshots are in the session scratchpad's
`device-check/`, outside the repository.

- **Frame A** through the `Modal`: bars 278.0 × 200.0pt, centred within 0.5pt, with gaps of 24, 16
  and 40. No yellow anywhere.
- **Frame B:** the QR symbol is 288.3pt inside its 314pt box.
- **Frame C:** light and dark are pixel-identical.
- **Dark:** frame A is pixel-identical to light, and the route never shows black.
- **Copy:** the clipboard holds the raw value.
- **A long Code 128:** its number wraps to three lines.
- **AX5:** the code stays whole and unshrunk.
- **Unchecked:**
  - real touches (taps, the swipe, long-press timing), whose JS paths were exercised over the
    debugger and in Jest;
  - VoiceOver and TalkBack;
  - Android;
  - a cold link via `simctl openurl`, including the loading state's status bar;
  - haptics and hardware brightness.

**For the human,** raised by the implementer and to be measured by the device check:

- **The iOS close cuts to a slightly dimmed card detail**, which then brightens over about 300ms.
  - That comes from unmounting the `Modal`, which this spec's task prescribes ("mounted only while
    open").
  - Toggling `visible` instead crossfades from white, but still dips.
- **On a warm link,** the route's content can show in about the last five frames of its fade.
- **On Android,** `onShow` may fire as the dialog's window animation starts.
- **At AX5,** long store names break mid-word, as Dynamic Type wraps them.

**Review pass 1 (2026-10-10).** Two `bad_spec` entries, rows 7 and 22, sent the code back:

- the implementation files were reverted path by path;
- derivation 1's diff and files were kept in the scratchpad's `derivation-1/`;
- the spec was amended as Spec Change Log entry 1.

**Step 3, re-derivation (2026-10-10).** A fresh context-free subagent built derivation 2. It started
from derivation 1's diff, to which the KEEP list points and which applied cleanly to the baseline,
then made Spec Change Log entry 1's amendments. The result was checked against the diff, file by file
against derivation 1.

Every amendment landed:

- **Card detail's `Modal`** stays mounted and toggles `visible`. Its `animationType` is `fade` on iOS
  and `none` on Android, and its `onRequestClose` calls the view's `close()`.
- **`BarcodeFlash`:**
  - It takes a React 19 `ref` prop, whose `close()` runs the same fade as a tap.
  - It registers its own `BackHandler` listener, which takes every press until the view unmounts, so
    the route pops once.
  - A swipe marks the view closing through a JS-thread `handleSwipeClose`.
- **`BarcodeScreen`** is back on Unistyles' `StyleSheet`. "Go back" takes an 8 % ink wash on a 12pt
  radius, with 16pt side padding.
- **The number's label** drops its closing sentence, and its period, matching `imageA11yLabel`.
- **The README and card-detail prompt notes** are marked resolved.
- **The design system's ruling** records opening and closing per platform.

**Beyond the task list,** found on the simulator: re-opening the barcode during iOS's fade-out
handed back the closing view. Its content was gone and its one close spent, which left a white
screen at full brightness that nothing could close.

- **How it was reached:** by calling the handlers over Metro's debugger. Whether UIKit lets a real tap
  through during its dismissal is unverified.
- **The fix:** `CardDetails` keys the view by a count it increments on each open, so every showing
  mounts a new one. A test pins it with a `Modal` mock that keeps its view while hidden, as iOS does.
- **A side effect:** a re-open inside that fade restores and then maximises back to back. That is
  the `useBrightness` race already flagged (flag 6).

**The implementer's test fixes:**

- The barcode-card tests now clear their stubs; derivation 1's `not.toHaveBeenCalled()` depended on
  test order.
- `BarcodeScreen.test.tsx`'s `t` mock is now stable; a new `t` on every render re-ran the load effect.

**Verification by the implementer**, read from exit codes:

- `typecheck`, `lint` and `format:check` exit 0.
- `test:coverage` exits 0: 206 suites and 3,044 tests, 94.93 % of statements, with `BarcodeFlash.tsx`
  at 100 %.
- The touched suites pass under eight `--randomize` seeds.
- 17 mutations were each caught by the intended test.

**The orchestrator's check:**

- All nine tasks are done, and the acceptance criteria hold: on iOS from the device run, on Android
  from the source facts in the Code Map.
- The six touched suites pass (168 tests, exit 0).
- The brightness suite differs from the baseline only in its close selector and comments.
- **Matrix audit:** every row is covered by a test that ran, and Android back is now pinned from both
  hosts. The only exception is Android back on frame C and on loading, where expo-router pops the
  screen with no app code involved.

**Device run, iOS only.** It used the same "DS22-4 iPhone 16" simulator, driven over Metro's
debugger, with recordings measured frame by frame. The screenshots are in the scratchpad's `d2/dev/`.

- **Frames A, B and C**, from card detail and from the route, measure as in derivation 1.
- **Dark** is pixel-identical to light below the status bar, and the status bar is dark.
- **Opening:** the white fades in alone, and the bars appear only on pure white.
- **Closing:** the bars fade out over white, the white holds about 180ms, and card detail then
  cross-dissolves in. That holds for a tap, for `onRequestClose` → `close()`, for the route (which
  pops once), and in dark. UIKit greys card detail during the cross-dissolve, both ways; that is the
  native dip derivation 1 recorded.
- **At AX5,** frame B's QR stays whole and the name clears the clock.
- **"Go back"'s wash** measures (237, 237, 238), which is ink at 8 % over white.
- **Unchecked:**
  - Android: `animationType="none"`, the route's `BackHandler`, and the dialog's back → `close()`;
  - real touches, and VoiceOver and TalkBack;
  - haptics and hardware brightness;
  - a cold `simctl openurl` link; the route was opened warm, through the router.

**Step 4, review pass 2 (2026-10-10).** There was no loopback.

- **The patches:** the `patch` rows (27–30, 33, 37–43) went back to derivation 2's implementer as
  seven fixes, and the result was checked against the tree.
  - **Code:** the view takes Android back only while its screen is focused (`useIsFocused`, from
    expo-router). A covered barcode route therefore leaves the press to expo-router.
  - **Tests:**
    - the number's own tap goes through `userEvent.press`;
    - the pan is pinned to a `GestureDetector` wrapping the whole content layer;
    - "draws only the name, the code, the number and the hint" also pins the element types and the
      one accessible button;
    - a payload past three lines keeps `numberOfLines={3}`, with the whole value in its label and its
      copy.

    Each new check was seen to fail under its mutation.

  - **Docs:** the design system's opening, gestures, EAN-8, status-bar and truncation statements, and
    an "overruled in part" note in `stitch-prompts-barcode.txt`.

- **Verification on the patched tree,** each command unpiped, read from exit codes: `typecheck`,
  `lint` and `format:check` exit 0, and `test` exits 0 with 206 suites and 3,047 tests.
- **The `defer` rows,** pass 1's moot ones included, are in Found, not fixed below and in
  `deferred-work.md`.

**Device check (2026-10-10), iOS only, on the final tree.**

- **Setup:**
  - the "DS22-4 iPhone 16" simulator (iOS 26.5, 393 × 852), running the installed Debug build;
  - Metro started from this worktree. The served bundle was grepped for the patched focus gate
    before any screenshot.
  - The app was driven over Metro's debugger, because the live simulator panel's access was not
    granted.
  - The screenshots are in the session scratchpad's `dc/shots/`, outside the repository.
- **The states, measured in light and dark:**
  - frame A and frame B from card detail's `Modal`;
  - frames A and B from the `barcode/[id]` route;
  - a 46-character Code 128 from the route;
  - frame C, with "Go back" at rest and pressed;
  - card detail after closing.
- **Results:**
  - **White everywhere:** every barcode state is white at its corners, its side strips and the home
    indicator's inset, with no beam-coloured pixel.
  - **Dark:** pixel-identical to light below the status bar, in all six barcode states. The status bar
    is dark over the white in both schemes.
  - **Bars:** EAN-13's bars run the 200pt box, and the QR fills its 314pt square.
  - **The Code 128's number** wraps to three lines.
  - **"Go back" pressed** shows (237, 237, 238), which is ink at 8 % over white.
  - **Closing from card detail** returns it at rest with no reload. The card's `usage_count` read the
    same before opening and after closing (13 and 13; 15 and 15 in dark), so no second usage was
    recorded.
- **Read against the design references:** frames A and B match `cardi-barcode-frames.html`'s stack,
  with the QR wider, as decided. Frame C matches its message and "Go back".
- **Unchecked:**
  - Android, entirely: the `Modal`'s `animationType="none"`, the dialog's back → `close()`, the
    route's focus-gated back listener, and the navigation bar;
  - real touches — taps, the swipe and the long-press timing — whose JS paths were driven over the
    debugger and in Jest;
  - VoiceOver and TalkBack;
  - haptics and hardware brightness;
  - a cold `cardi://` launch, including the loading state's status bar, because `simctl openurl`
    raises a system alert that needs a tap.

**Review loops (2026-10-10).** Each round was a fresh Sonnet reviewer, reading a freshly written diff
with the spec, its context files and the design references.

- **Code review, round 1:** APPROVED, no comments. The code loop ended there.
- **QA review, round 1:** APPROVED, no comments. It mapped every matrix row and acceptance criterion
  to a test, to the device check, or to the Verification inspection.
- Neither loop needed a fix, and no nit-only round occurred.

**Final verification on the final tree,** each command unpiped, read from exit codes:

- `yarn typecheck` exits 0.
- `yarn lint` exits 0, with no warnings.
- `yarn format:check` exits 0, the untracked spec included.
- `yarn test` exits 0: 206 suites and 3,047 tests.

**To the human:**

1. **The brightness suite gained one mock line.** `CardDetails.brightness.test.tsx`'s own expo-router
   mock now has `useIsFocused: () => true`, because the view reads focus.
   - No selector, assertion or wiring changed.
   - The frozen block says only that suite's selectors may change, so this needs ifero's OK, or
     another way to read focus.
2. **The route's warm-link exception** (row 24, rejected): on a warm `cardi://barcode/<id>` link the
   code can show in the last frames of the route's own fade. That misses the frozen "at any moment of
   opening" for the route only, which has no in-app caller. The design system records it.
3. **iOS's own cross-dissolve** greys card detail slightly while the modal fades in and out. This is
   the native dip derivations 1 and 2 recorded. The code never shows over it.

### Found, not fixed

1. **Every code is resampled.** The renderer's bitmap is scaled by a non-integer factor (about 2.9
   for EAN-13 at 314pt, about 3.3 for a QR code), which softens bar edges. Pixel-exact bars need an
   integer `scaleX` and an image drawn at its natural size, which would move card detail too.
2. **A deep-linked barcode records no usage,** against FR76. That is Story 9.1's mechanism.
3. **Epics 18.6 and 18.7.** Story 18.6 (`docs/epics.md:3486`) puts a virtual logo "on the barcode
   screen", against the design system. Story 18.7's unknown-format placeholder is a state no frame
   draws.
4. **The frames' sample codes would not scan.** The EAN-13's left half breaks its check digit, and
   the QR's alignment pattern is wrong. README `:147-148` says the frames compute a real code.
5. **"Go back" borrows `auth.verifyEmail.goBack`** from another feature's namespace.
6. **The `useBrightness` race Story 16.39 flagged** (its `:408`) is still open. The per-showing key
   adds a path to it: re-opening the barcode while a view is still mounted restores, then
   maximises, back to back (row 45).
7. **Android's status bar inside card detail's `Modal`** may keep card detail's style. The dialog
   copies it once, as it opens; this predates the story (row 20).
8. **Brightness leaks when the app is backgrounded** while the barcode shows (rows 8 and 47).
   There is no `AppState` handling, and iOS keeps an app-set level until the device locks.
9. **A pan the system cancels still closes,** because `onEnd` ignores `success`, as the shipped pan
   did (row 18).
10. **A double "Go back"** on frame C, or a repeated escape gesture, can pop twice (row 21).
11. **Brightness stays at full under a screen pushed over the route,** whose brightness is
    mount-scoped, as before (row 31).
12. **Android's navigation bar in dark mode** can show white buttons on a dark contrast scrim over
    the white (row 32). This is from source; it is unverified.
13. **Screen readers speak the number as one large number** (row 35). Card detail groups an
    all-digit number for speech.
14. **The screen-reader strings** name touch gestures and an "overlay", and the Italian keeps the
    English word (row 36).
15. **UIKit may refuse a present while the last dismissal runs** (row 46). If so, the barcode card
    is dead and brightness stays up until card detail is left. It is unverified, and a real touch may
    never reach the card in that window.

## Spec Change Log

**1. Review pass 1, 2026-10-10: `bad_spec`, code reverted and re-derived.**

- **Triggered by:**
  - Review Triage Log rows 7 (with 23) and 22 (with 9);
  - the step-3 device run's iOS close (Implementation Notes, "For the human", first item).
- **Amended:**
  - **Tasks:**
    - card detail's `Modal` stays mounted and toggles `visible`, has no animation on Android, and
      forwards `onRequestClose` to the view's `close()`;
    - `BarcodeFlash` takes a ref handle and listens for Android's back itself;
    - the test pins;
    - `BarcodeScreen` stays on Unistyles;
    - the i18n label, and the README and card-detail prompt notes.
  - **Design Notes:**
    - a new _Opening_ ruling, and _Close and copy_ rewritten;
    - frame C's pressed wash;
    - large text;
    - the stretch's effect on short codes;
    - the Record list.
  - **Code Map:**
    - Android's `Modal`: `onShow`, back and dismissal;
    - the route's `BackHandler` order;
    - closing by `visible` against unmounting;
    - the stretch, whose earlier "without changing a bar's width" was wrong for short codes.
- **Carried into the amended spec** from pass 1's `patch` rows:
  - 1, Unistyles;
  - 2, brightness across the flip;
  - 3 with 10, the ungated route;
  - 4, opacity read from the style;
  - 5, the close target's order;
  - 6, a swipe marking the view closing;
  - 12, the label;
  - 14, large text;
  - 15, "Go back"'s press;
  - 16 with 26, the stale notes;
  - 17, the window test.
- **Known-bad states avoided:**
  - on Android, the code fading in over card detail as the dialog fades in;
  - on Android, the code fading out over card detail, or over the screen beneath, on back;
  - on iOS, a close that cuts from white straight to a dimmed card detail;
  - a suite that cannot see the content's opacity, the close target's order or the route's reveal.
- **KEEP:** derivation 1 built these, and the simulator or the tests proved them. Re-derive them as
  they were. Derivation 1's diff and files are in the session scratchpad's `derivation-1/`.
  1. **`BarcodeFlash`'s structure:**
     - The ground is a `GestureHandlerRootView`, `flex: 1`, in `BARCODE_FLASH.background`, never
       animated.
     - One `Animated.View` content layer carries the opacity and `translateY`, and
       `onAccessibilityEscape`.
     - Inside it comes, first, a full-screen `Pressable`: `StyleSheet.absoluteFill`, role button,
       `cards.flash.dismissOverlayA11yLabel` and its hint, testID `barcode-flash-close`.
     - Then comes a `box-none` body, padded by the safe-area insets and the 24pt margin. It holds a
       touch-only stack `Pressable` (`accessible={false}`, `importantForAccessibility="no"`,
       `marginVertical: 'auto'`), which contains:
       - the name: `headlineSm` ink, a header, two lines;
       - the code's box: `accessible`, role image, no label of its own, sized `getBarcodeBoxWidth` ×
         200, or square for a QR;
       - the number `Pressable`: `onPress` closes and `onLongPress` copies, role text, its 48pt
         target made of padding taken out of the 16 and 40 gaps, `monoCode` ink, three lines;
       - the hint: `captionLg` `textSecondary`, hidden from screen readers.
  2. **`BarcodeFlash`'s logic:**
     - `FADE_IN_MS` 200, `FADE_OUT_MS` 150, `SLIDE_OUT_MS` 200, and a settle back of 150;
     - the `shouldSwipeClose` worklet (over 100pt, or over 500pt/s);
     - `scheduleOnRN`;
     - a once-only `finishDismiss`, guarded by a mount ref, with `isClosingRef` blocking a late
       reveal;
     - brightness maximised on mount and restored on unmount;
     - expo-status-bar's `style="dark"`;
     - `useWindowDimensions`;
     - a failed copy that logs only the error.
  3. **`BarcodeRenderer`'s `fillBox`:**
     - linear codes only, with `paddingheight: 0` and `resizeMode="stretch"`;
     - the constant renamed `POINTS_PER_REQUESTED_MM`, with the millimetre comment;
     - tests for the fill, for QR unchanged, and for the default letterboxed.
  4. **`BarcodeScreen`:**
     - a `const` arrow;
     - the white loading state, with a `LIGHT_THEME_COLORS.primary` spinner and a dark status bar
       (testID `barcode-screen-loading`);
     - frame C (testID `barcode-screen-not-found`): the message in `bodyLgStrong` `error`, and "Go
       back" (testID `barcode-screen-go-back`) 32pt below through padding, on a 48pt target;
     - `onAccessibilityEscape` going back, through `router.back()`;
     - the route left ungated, with its comment.
  5. **`CardDetails`:**
     - `isFullscreenPresented` reset on open and set by `onShow`;
     - the `Modal`'s `presentationStyle="fullScreen"`, white `backdropColor`, `statusBarTranslucent`
       and `navigationBarTranslucent`;
     - testID `card-details-barcode-modal`.
  6. **Housekeeping:**
     - `jest.config.js`'s `expo-status-bar` transform entry, and the `formatBarcode.ts` header;
     - the barrel export and the three i18n keys removed;
     - the brightness suite's close selector, `barcode-flash-close`, and its renamed comments.
  7. **The design system:** § _Barcode view_'s ruling and § _Icons_' sentence, amended to the Design
     Notes above.
  8. **Tests:**
     - the 46-test `BarcodeFlash` suite: the frames, the field in both schemes through
       `StoryDecorator`, the closes, the swipe, the copy, and the screen-reader structure;
     - the 12 `BarcodeScreen` tests;
     - the renderer's fill tests.

## Review Triage Log

**Pass 1 (2026-10-10).** Four layers reviewed derivation 1: BH (blind hunter), ECH (edge-case
hunter), VG (verification gap) and PC (project conventions).

- Two `bad_spec` entries, both Android behaviour the spec's own wording produced: 7 (with 23) and 22
  (with 9). So the code loops back, as Spec Change Log entry 1.
- The `patch` rows are moot until the code is re-derived. Their fixes are written into the amended
  spec, and they are carried if they recur.
- The `defer` rows are moot too. They go to Found, not fixed at the end of the run.

| #   | Layer | Location                                                                      | Finding                                                              | Verdict | Evidence                                                                                                                                                                                                                                                                                                                                                 | Route             |
| --- | ----- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | PC    | `BarcodeScreen.tsx:19,125`                                                    | The screen moved from Unistyles' `StyleSheet` to React Native's      | low     | At the baseline it imported `StyleSheet` from `react-native-unistyles`. project-context's styling rule names Unistyles. The static styles work unchanged with it.                                                                                                                                                                                        | patch             |
| 2   | VG    | `BarcodeFlash.tsx:118-133`                                                    | No test checks brightness across the `isPresented` flip              | medium  | Pre-verified by mutation. Merging the fade-in back into the brightness effect passes all 112 tests, yet with the setting off it writes the user's level and then 1.0 again, leaving the phone at full brightness.                                                                                                                                        | patch             |
| 3   | VG    | `BarcodeScreen.tsx:116-120`                                                   | No test pins the route's ungated reveal                              | low     | Pre-verified. Adding `isPresented={false}` to the route passes all 12 of its tests, and the barcode would never show.                                                                                                                                                                                                                                    | patch             |
| 4   | VG    | `BarcodeFlash.tsx:113,129-133,186-189`                                        | Tests read `withTiming`'s arguments, never the content's opacity     | medium  | Pre-verified. Starting the opacity at 1, or dropping it from the animated style, passes every suite, because the global mock's `useAnimatedStyle` returns an empty object. That would bring back the ghosting the device run found.                                                                                                                      | patch             |
| 5   | VG    | `BarcodeFlash.tsx:216-223`                                                    | Nothing pins the close target behind the content                     | medium  | Pre-verified. Moving it after the body passes every test. On a device it would then cover the number: a long press would close the screen instead of copying.                                                                                                                                                                                            | patch             |
| 6   | VG    | `BarcodeFlash.tsx:157,172-179`                                                | A swipe close never marks the view closing                           | low     | Only a tap and the escape gesture set `isClosingRef`. A swipe started before the modal reports `onShow` fades the content back in during its slide-out.                                                                                                                                                                                                  | patch             |
| 7   | BH    | `CardDetails.tsx:464`, the route's back                                       | Android back closes with no content exit                             | low     | `onRequestClose` unmounts the `Modal`, which runs `ReactModalHostView.kt:192-203` `dismiss()` through `catalyst_fade_out` with the content at full opacity. The route's back pops with the stack's fade. The frozen Close row lists Android back with "the content fades out … then the screen closes". The spec's task said `onRequestClose` closes it. | bad_spec          |
| 8   | BH    | `BarcodeFlash.tsx:118-123`                                                    | Full brightness leaks device-wide when the app is backgrounded       | medium  | There is no `AppState` handling, and iOS keeps an app-set level until the device locks. Both shipped copies had the same gap; only Story 16.39's boost on card detail handles it.                                                                                                                                                                        | defer             |
| 9   | BH    | `cardi-design-system.md:693-697`                                              | The ruling promises no code over card detail, with no Android caveat | low     | The same defect as 22: Android's `onShow` arrives as the dialog's fade starts.                                                                                                                                                                                                                                                                           | bad_spec, with 22 |
| 10  | BH    | `BarcodeScreen.test.tsx`                                                      | The route's ungated reveal has no test                               | low     | Same as 3                                                                                                                                                                                                                                                                                                                                                | patch, with 3     |
| 11  | BH    | `BarcodeFlash.tsx:269-279`                                                    | A screen reader's activation of the number closes the view           | low     | Closing on it is the frozen Close row's "a tap anywhere (the number included)". Copy stays reachable by double-tap-and-hold, as its hint says. An accessibility action adds a branch for a rare path.                                                                                                                                                    | reject            |
| 12  | BH    | `en.ts:662-663`, `it.ts:658-660`                                              | The number's label repeats its hint                                  | low     | The label ends "Long press to copy." and the hint is "Long press to copy barcode to clipboard". The number is now reachable, so VoiceOver reads both.                                                                                                                                                                                                    | patch             |
| 13  | BH    | `BarcodeFlash.tsx:191-199`                                                    | A copy gives screen-reader users no spoken confirmation              | low     | The haptic is the confirmation; the toast was dropped by decision. An announcement adds behaviour for a rare path.                                                                                                                                                                                                                                       | reject            |
| 14  | BH    | `cardi-design-system.md:673-675`                                              | The large-text ruling overstates what stays on screen                | low     | At AX5 a three-line number on a QR card ends at about 870pt on an 852pt screen. The ruling says only the hint can run off.                                                                                                                                                                                                                               | patch             |
| 15  | BH    | `BarcodeScreen.tsx:104-111,143-150`                                           | "Go back" gives no press feedback                                    | low     | Design system § _Buttons_: every transparent button acknowledges a press with an 8 % wash of its label colour.                                                                                                                                                                                                                                           | patch             |
| 16  | BH    | `docs/design/cardi/README.md:884-889`, `stitch-prompts-card-detail.txt:86-91` | Both still describe two live implementations                         | low     | Both name `FullscreenBarcode`, which this story deletes, and ask for the one component it builds.                                                                                                                                                                                                                                                        | patch             |
| 17  | BH    | `BarcodeFlash.test.tsx:228`                                                   | The window test claims more than it proves                           | low     | It remounts between widths, so a once-per-mount read would pass it.                                                                                                                                                                                                                                                                                      | patch             |
| 18  | ECH   | `BarcodeFlash.tsx:172-182`                                                    | A pan the system cancels still closes                                | low     | `onEnd` ignores its `success` argument. The shipped pan did the same.                                                                                                                                                                                                                                                                                    | defer             |
| 19  | ECH   | `BarcodeFlash.tsx:201-202`                                                    | A short window with a QR code overruns the bottom inset              | low     | Only an Android split-screen window is that short, which is rare at a till. Capping the side by the height adds a branch.                                                                                                                                                                                                                                | reject            |
| 20  | ECH   | `CardDetails.tsx:456-473`                                                     | Android's status bar inside the `Modal` keeps card detail's style    | low     | The dialog copies the window's light-status-bar flag once, at creation. The shipped `FullscreenBarcode` had the same; this is Found, not fixed 7 in the spec.                                                                                                                                                                                            | defer             |
| 21  | ECH   | `BarcodeScreen.tsx:76-78,99,104-111`                                          | A double "Go back" pops twice                                        | low     | The shipped error state did the same.                                                                                                                                                                                                                                                                                                                    | defer             |
| 22  | ECH   | `CardDetails.tsx:465`                                                         | Android's `onShow` fires as the dialog's fade starts                 | low     | `ReactModalHostView.kt:284` sets the dialog's `OnShowListener`, which Android fires from `Dialog.show()` as the window is added, at the start of `catalyst_fade_in` (`config_shortAnimTime`). The iOS fix holds the content back only until then. Android users meet it on every open.                                                                   | bad_spec          |
| 23  | ECH   | `CardDetails.tsx:464`, the route's back                                       | Android back fades the code itself over what is beneath              | low     | Same as 7                                                                                                                                                                                                                                                                                                                                                | bad_spec, with 7  |
| 24  | ECH   | `BarcodeScreen.tsx:116-120`                                                   | On a warm link, the code shows in the route's fade's last frames     | low     | The implementer measured it in about the last five frames. The route has no in-app caller, only `cardi://barcode/<id>`, so it is not met in everyday use. Gating needs a transition listener plus an Android cold-link fallback.                                                                                                                         | reject            |
| 25  | ECH   | `BarcodeRenderer.tsx:112,200`                                                 | Stretching widens short codes too                                    | false   | `stretch` scales each axis uniformly, so the module ratios hold. Frame A draws the code to its 314 × 200 box (`preserveAspectRatio="none"`). EAN-8 at 314pt is about 195 % magnification, inside EAN's 80–200 %.                                                                                                                                         | reject            |
| 26  | ECH   | `docs/design/cardi/README.md:884-889`                                         | Still states two implementations                                     | low     | Same as 16                                                                                                                                                                                                                                                                                                                                               | patch, with 16    |

**Pass 2 (2026-10-10).** The same layers reviewed derivation 2; PC found no violations.

- There is no `bad_spec` or `intent_gap` entry, so no loopback: the `patch` rows go back to
  derivation 2's implementer.
- The `defer` rows are written to `deferred-work.md` and to Found, not fixed, together with pass 1's
  moot ones (8, 18, 20, 21).

| #   | Layer | Location                                                 | Finding                                                                    | Verdict     | Evidence                                                                                                                                                                                                                                                                                                                                                             | Route          |
| --- | ----- | -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 27  | VG    | `BarcodeFlash.test.tsx:271-275,711-717`                  | The number's own tap-to-close is untested                                  | medium      | Pre-verified by mutation. `fireEvent.press` climbs to the stack's `onPress`, so deleting the number's `onPress` passes all 57 tests. On a device the number claims the touch, so a tap there would do nothing.                                                                                                                                                       | patch          |
| 28  | VG    | `BarcodeFlash.test.tsx:162-180`                          | Nothing pins the pan to a detector around the content layer                | medium      | Pre-verified. Moving the `GestureDetector` to wrap only the stack passes all 57 tests. A swipe started on the white around the stack would then not close.                                                                                                                                                                                                           | patch          |
| 29  | VG    | `BarcodeFlash.tsx:198-206`                               | On the route, a hidden view takes Android back                             | medium      | Same as 30                                                                                                                                                                                                                                                                                                                                                           | patch, with 30 |
| 30  | BH    | `BarcodeFlash.tsx:198-206`                               | A barcode route covered by another screen takes that screen's Android back | medium      | The listener lives for the view's whole mount and returns `true`, and the native stack keeps the route mounted under a screen pushed over it (a second `cardi://` link). Registered after expo-router's, it runs first: it spends the view's one close and pops the top screen, leaving a blank route that swallows every press.                                     | patch          |
| 31  | BH    | `BarcodeFlash.tsx:133-138`                               | Brightness stays up under a screen pushed over the route                   | low         | The route's brightness was mount-scoped before this change too.                                                                                                                                                                                                                                                                                                      | defer          |
| 32  | BH    | `BarcodeFlash.tsx:245`, `CardDetails.tsx:480-490`        | In dark mode Android's navigation bar shows white buttons on a dark scrim  | low         | Neither shipped copy set the navigation bar, and the app uses no navigation-bar API. Read from source (`react-native-edge-to-edge`, `WindowUtil.kt`); there is no Android device here.                                                                                                                                                                               | defer          |
| 33  | BH    | `cardi-design-system.md:695`                             | The ruling promises a dark status bar that Android's `Modal` may not get   | low         | The dialog copies the window's flag once, as it opens (row 20, deferred). The ruling records the loading-state exception but not this one.                                                                                                                                                                                                                           | patch          |
| 34  | BH    | `BarcodeFlash.tsx:145-149,255-262`                       | A reveal that never comes leaves an untouchable white modal                | false       | iOS emits `onShow` in the present's completion (`RCTModalHostViewComponentView.mm:160-165`), so a modal that is presented always reports it. A present UIKit refuses never shows the modal at all (row 46). The content being untappable during the fade-in is the design.                                                                                           | reject         |
| 35  | BH    | `BarcodeFlash.tsx:312-316`                               | The number is spoken as one large number                                   | low         | Both shipped labels interpolated the raw value (`fullscreenNumberAccessibilityLabel`, `barcodeValueA11yLabel`).                                                                                                                                                                                                                                                      | defer          |
| 36  | BH    | `en.ts`, `it.ts` `cards.flash.*`                         | Screen-reader text names touch gestures and an "overlay"                   | low         | The strings predate this story. It changed only the label that row 12 shortened.                                                                                                                                                                                                                                                                                     | defer          |
| 37  | BH    | `cardi-design-system.md:697-712`                         | The opening ruling contradicts itself                                      | low         | "Nothing but white shows behind the code while the link loads …" and "the code is never drawn over the screen beneath" stand beside the route's accepted warm-link exception.                                                                                                                                                                                        | patch          |
| 38  | BH    | `cardi-design-system.md:728-737`                         | "The gestures, kept from Story 2.5" lists behaviour this story adds        | low         | A tap on the number closing, VoiceOver's escape, and Android back from card detail are all new in this story.                                                                                                                                                                                                                                                        | patch          |
| 39  | BH    | `cardi-design-system.md:684-687`                         | The EAN-8 magnification figure is wrong                                    | low         | Stretched, an EAN-8 module is 314.4 / 79 ≈ 3.98pt. That is about 0.66mm on a 460ppi phone, about 200 % of nominal, and about 203 % at the 320pt cap. The ruling says about 195 %, and rests the stretch on 80–200 %.                                                                                                                                                 | patch          |
| 40  | BH    | `BarcodeFlash.test.tsx:462`                              | The "draws nothing else" test cannot catch what its title names            | low         | It lists only `Text` nodes and one testID, so an added image, icon or button passes it. Its title says "no close button", yet the view has one.                                                                                                                                                                                                                      | patch          |
| 41  | BH    | `stitch-prompts-barcode.txt`                             | The barcode prompt disagrees with the shipped screen, with no note         | low         | It still asks for prompt B's 200pt QR, 1px tracking on the number, and "Go back" in Inter 16 with no fill. The README and the card-detail prompt got resolved notes; this file got none.                                                                                                                                                                             | patch          |
| 42  | BH    | `BarcodeFlash.tsx:320`, `cardi-design-system.md:692-693` | Truncation past three lines is unrecorded and untested                     | low         | `numberOfLines={3}` ends a longer payload with an ellipsis. The ruling says only "wraps to three lines at most", and no test renders a longer value.                                                                                                                                                                                                                 | patch          |
| 43  | ECH   | `BarcodeFlash.tsx:198-206`                               | A covered barcode route takes Android back                                 | medium      | Same as 30                                                                                                                                                                                                                                                                                                                                                           | patch, with 30 |
| 44  | ECH   | `BarcodeFlash.tsx:208-222`                               | A second drag during the slide-out undoes the swipe close                  | low         | A new pan's `onUpdate` cancels the slide (`finished: false`), and its short `onEnd` settles back. It needs a second drag within 200ms. A closing guard adds a shared value and two branches.                                                                                                                                                                         | reject         |
| 45  | ECH   | `CardDetails.tsx:251-255`                                | A re-open while a view is still mounted restores, then maximises           | medium      | The key's remount reaches the `useBrightness` race (flag 6). A real touch can reach the barcode card mid-fade only once the fading modal is below 0.01 alpha. The race's fix belongs in `useBrightness`, which the Never list protects.                                                                                                                              | defer          |
| 46  | ECH   | `CardDetails.tsx:480-498`                                | UIKit may refuse a present while the last dismissal runs                   | maybe-false | `ensurePresentedOnlyIfNeeded` presents again as soon as `visible` returns. Whether UIKit refuses a controller still being dismissed, and whether a real touch can reach the card then, needs a device. Derivation 2's debugger-driven re-open presented normally. If true it is medium: the barcode card is dead, and brightness stays up until leaving card detail. | defer          |
| 47  | ECH   | `BarcodeFlash.tsx:133-138`                               | Brightness on background                                                   | medium      | Carried: as 8                                                                                                                                                                                                                                                                                                                                                        | defer          |
| 48  | ECH   | `BarcodeScreen.tsx:130-134`                              | On a warm link, the code shows in the route's fade                         | low         | Carried: as 24                                                                                                                                                                                                                                                                                                                                                       | reject         |

## Design Notes

These rulings are decided here because the sources are silent or conflict.

- **Geometry.**
  - Linear codes sit in a box `min(0.8 × window width, 320)` wide and 200 tall, with the bars filling
    its height. The width is the shipped rule, which the frames ratify: the white either side is the
    quiet zone (the prompts' finding 6).
  - The bitmap is stretched to the box on each axis, so a short code such as EAN-8 widens to the box
    too. It widens uniformly, as frame A draws its code. EAN-8 at 314pt is about 200 % of nominal,
    the top of EAN's 80–200 %, and about 203 % at the 320pt cap (corrected in pass 2, row 39).
  - The renderer's 16pt padding is white on white, so it does not show.
  - QR codes take a square box of the same width. The renderer draws the symbol inside it at about
    288pt on a 393pt phone, so it grows from card detail's 220. The stack ends up about 114pt taller
    than frame B.
- **Two hosts, one component.** A React Native `Modal` leaves navigation focus alone, so card detail
  never blurs while the barcode shows. A pushed route would blur it: a second usage count on return
  (`useTrackCardUsage`), a reload behind a spinner, and a brightness handover between two
  `useBrightness` instances. The design README asks for one component (`README.md:884-889`).
- **The stack.** Top to bottom:
  - the name, `headlineSm` ink, two lines at most;
  - 24pt;
  - the code;
  - 16pt;
  - the number, `monoCode` ink. This is the design system's token, so it drops the frame's extra 1px
    tracking;
  - 40pt;
  - the hint, `captionLg` `textSecondary`.

  The group sits centred between the insets with 24pt side margins, as the frame's body places it.

- **Large text.** At the largest text sizes the group no longer fits, so its auto margins collapse
  and it starts at the top inset. The name then stays clear of the status bar, and the code stays
  whole and unshrunk on screen. Below the code, the number and the hint can run off the bottom of a
  small phone; the record says so rather than promising otherwise.
- **Frame C and loading.**
  - Frame C: the message in `bodyLgStrong` `error`, centred, with 24pt margins. "Go back" sits 32pt
    below it in `bodyLg` ink, as plain text with a 48pt target. The frame says Inter 16, which no
    token is, and the shipped screen uses 17.
  - A press on "Go back" shows an 8 % ink wash behind it, the design system's feedback for a
    transparent button (§ _Buttons_).
  - Loading: an ink spinner on white.
- **Ground and motion.**
  - The white ground never fades or moves. Every state of the route fills the screen with white from
    its first frame, because the route's inherited `contentStyle` is black in dark mode. The route's
    options stay as they are.
  - The content fades in over 200ms. On a tap it fades out over 150ms, and on a swipe it slides down
    over 200ms. Then the host closes. These are Story 2.5's timings.
  - Timed animations follow the system's Reduce Motion: `withTiming` reads it unless told otherwise
    (Reanimated `animation/util.ts:148-167`).
- **Opening.** The content is never drawn over the screen beneath.
  - **iOS:** card detail's `Modal` fades. Its `onShow` fires once that fade has ended, and only then
    does the content fade in, so the fade brings in white alone.
  - **Android:** the `Modal` has no animation (`animationType="none"`). Android's `onShow` fires as
    the dialog's fade starts, so content waiting for it would still fade in over card detail. With
    no window animation the white appears at once, and only the content fades.
  - **The route:** it reveals at once, ungated, because on Android a cold link's first screen
    reports no transition end. On a warm link the content can show in the last frames of the
    route's own fade. Pass 1 rejected that (row 24): the route has no in-app caller.
- **Close and copy.**
  - **The order of a close.** Every close first runs the content's exit over white: a fade on a tap,
    on the escape gesture or on Android back, and a slide on a swipe. Only then does it call
    `onDismiss`, and the host removes the screen:
    - card detail's `Modal` by `visible`, which fades from white on iOS and goes at once on Android;
    - the route by `router.back()`.
  - **Android back:**
    - On the route, the view's own `BackHandler` listener takes it, running before expo-router's.
    - In card detail's `Modal`, the dialog takes it, and the host's `onRequestClose` calls the view's
      `close()`.
  - **A late reveal.** Every close marks the view as closing, the swipe included, so a reveal that
    arrives later does not bring the content back.
  - **Taps.** A tap anywhere closes, including on the number.
  - **Copy.** A long press on the number copies, with a success haptic and no toast: the screen draws
    nothing but the code, its labels and the hint. Card detail's own Number row keeps its toast.
- **Status bar.** Each state mounts expo-status-bar's `style="dark"`, so the content is dark over the
  white. There is one exception, which is accepted and recorded: on a cold launch by link, the root
  bar mounts after the stack in the same first commit and wins, so the loading state alone may show
  the scheme's style (Code Map). Frames A, B and C mount later, and their bars win.
- **Screen readers.**
  - The name is a heading, the code keeps the renderer's label, and the number reads with its copy
    hint.
  - The full-screen close target is a button that does not hide the content from a screen reader.
  - VoiceOver's escape gesture also closes the screen.
- **Record** in the design system, § _Barcode view_:
  - one view for both entry points;
  - the box geometry and the bars filling its height;
  - the QR size;
  - the number as stored, in mono-code without extra tracking;
  - "Go back" in body-lg, and its pressed wash;
  - the loading state, and the ground that never moves;
  - opening and closing on each platform, with the route's warm-link exception;
  - the gestures, Android back through the view's own exit;
  - what large text can push off a small phone.

  In § _Icons_, drop the full-screen close × from the MaterialIcons holdouts.

Flagged, out of scope (to Found, not fixed):

1. **Every code is resampled.** The renderer's bitmap is scaled by a non-integer factor (about 2.9 for
   EAN-13 at 314pt, 3.33 for a 220 QR), which softens bar edges. Pixel-exact bars need an integer
   `scaleX` and an image drawn at its natural size, which would move card detail too.
2. **A deep-linked barcode records no usage,** against FR76. That is Story 9.1's mechanism.
3. **Epics 18.6 and 18.7.** Story 18.6 (`docs/epics.md:3486`) puts a virtual logo "on the barcode
   screen", against the design system's no-logo rule. Story 18.7's unknown-format placeholder is a
   state no frame draws.
4. **The frames' sample codes would not scan.** The EAN-13's left half breaks its check digit, and the
   QR's alignment pattern is wrong. README `:147-148` says the frames compute a real code.
5. **"Go back" borrows `auth.verifyEmail.goBack`** from another feature's namespace.
6. **The `useBrightness` race Story 16.39 flagged** (its `:408`) is still open.
7. **Android's status bar inside a `Modal`** may keep card detail's style. This predates the story
   with `FullscreenBarcode`, and is unverifiable here.

## Verification

**Commands:**

- `yarn typecheck` -- expected: no errors.
- `yarn lint` -- expected: no errors, no warnings.
- `yarn format:check` -- expected: clean, untracked docs included.
- `yarn test` -- expected: all suites green, every assertion of `CardDetails.brightness.test.tsx`
  kept.

**Manual checks:**

- iOS simulator at 393pt, light and dark:
  - frames A and B from card detail, and from `xcrun simctl openurl booted cardi://barcode/<id>`;
  - frame C from an unknown id;
  - closing by a tap and by a swipe, and copying;
  - the largest accessibility text size.
- Android has no emulator on this host, so it is unverified.
