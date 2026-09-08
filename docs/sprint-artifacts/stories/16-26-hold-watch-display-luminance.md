---
baseline_commit: 115709db1516be13e449145bcc6ac9ac139e5c97
---

# Story 16.26: Hold the Apple Watch display at full luminance while a barcode is shown

Status: review

Epic: 16 — Platform & Tech Debt

> **🔴 THE STORY TITLE IS NOT LITERALLY IMPLEMENTABLE. READ THIS BEFORE WRITING CODE.**
> ifero asked for "increase luminosity to 100% when showing barcode". **watchOS exposes no public
> brightness API.** The phone's equivalent — `useBrightness` (`features/cards/hooks/useBrightness.ts`,
> Story 2.5) — calls `Brightness.setBrightnessAsync(1.0)` from `expo-brightness`, which wraps
> `UIScreen.brightness`. **`UIScreen` does not exist on watchOS**, and `WKInterfaceDevice` has no
> brightness property. Verified: a grep across `targets/` returns **zero** hits for `brightness`,
> `ExtendedRuntime` or `isLuminanceReduced`. There is nothing to call.
>
> **So this story delivers the closest achievable behaviour: stop the display dimming mid-scan.**
> Scope decided by ifero 2026-08-02 — keep-awake + anti-dim, **no user-facing hint copy** (the
> "point the user at Settings" variant was explicitly rejected, so **no new keys** in `en.lproj` /
> `it.lproj`).
>
> ⚠️ **AC1 IS A REAL FORK, NOT A FORMALITY — DO NOT SHIP AN ENTITLEMENT ON A GUESS.**
> `WKExtendedRuntimeSession` requires a `WKBackgroundModes` entry in `targets/watch/Info.plist`, and
> the permitted values (`self-care`, `mindfulness`, `physical-therapy`, `alarm`, `workout-processing`,
> `location`) **do not describe a loyalty barcode**. Claiming one is App Review risk. If AC1 rules it
> out, **the story still closes on AC3** — that is a legitimate completion, not a failure.
>
> **Native change → NOT OTA-eligible.** Needs a new binary. `runtimeVersion.policy` is `appVersion`.
>
> **Verify on a real Apple Watch.** The simulator models neither Always-On dimming nor wake duration.
> A green build proves nothing here — that is the Story 16.15 lesson applied to a display behaviour.

## Story

As a user paying at a checkout with my Apple Watch,
I want the barcode to stay at full screen luminance for as long as the scanner needs it,
so that the cashier's scanner reads it on the first pass instead of me raising my wrist repeatedly while the display dims.

## Context

### The report

ifero, 2026-08-02: _"most of the checkout scanner doesn't recognise the barcodes from the apple watch"_,
with two requested fixes — increase luminosity, and reduce the margins. This story is the first;
Story 16.27 is the second. Stories 16.28 (real symbologies) and 16.29 (brand logos) came out of the
same investigation.

### Why dimming is the plausible mechanism

watchOS drops the display to a **dimmed Always-On state** when the wrist lowers or the wake duration
expires (default **15 seconds**, user-settable to 70). At a checkout the user raises the watch, the
cashier positions the scanner, and the display can dim in exactly that window. A dimmed emissive
display collapses the contrast ratio the scanner depends on — and unlike the geometry problems in
16.27, this one is invisible in any screenshot.

### What already exists on this screen

`BarcodeFlashView` (`targets/watch/BarcodeFlashView.swift`) already has the lifecycle hooks this
story needs — it does **not** need new plumbing:

| Line      | What it does today                                                                                |
| --------- | ------------------------------------------------------------------------------------------------- |
| `:104`    | `.task(id: card.id)` — sets focus, plays `.success` haptic, emits the Story 9.6 `CARD_USED` event |
| `:139`    | `.onDisappear` — resets `isFocused` so crown events don't leak                                    |
| `:43`     | `.onTapGesture { dismiss() }` on the barcode image                                                |
| `:93-100` | Digital Crown single-shot dismissal, latched by `crownTriggered`                                  |
| `:22`     | `Color.black.ignoresSafeArea()` behind everything                                                 |
| `:69-72`  | The barcode sits on a **white** `RoundedRectangle` — contrast is already maximal                  |

## Acceptance Criteria

- **AC1 — Determine which mechanism is legitimately available, and record the finding, before writing UI code.**
  Establish whether `WKExtendedRuntimeSession` can be used: which `WKBackgroundModes` value would be
  claimed, and whether that claim is defensible for a barcode screen at App Review. **Timebox it** —
  this is a determination, not a spike. Write the answer into the Dev Agent Record; the branch taken
  (AC2 or AC3) must be traceable to it.
- **AC2 — _If AC1 clears it:_ the display does not drop to the dimmed Always-On state while the barcode is on screen**, for
  the duration the session allows. Start the session in the existing `.task(id: card.id)` at `:104`;
  invalidate it in `.onDisappear` at `:139`. **The session must never outlive the view** — no leak on
  dismiss, on navigating back, or on the app being backgrounded.
- **AC3 — _If AC1 rules it out:_ the fallback ships instead and the story still closes.**
  Observe `@Environment(\.isLuminanceReduced)`; while luminance is reduced, hold the barcode at
  maximum contrast and suppress anything that competes with it. **No new locale keys** — the barcode is
  already pure black on pure white, so this is a rendering-state change, not a messaging one.
- **AC4 — No regression to dismissal.** Tap-to-dismiss (`:43`) and the single-shot crown dismissal
  (`:93-100`) keep working, and `crownTriggered` still latches so one crown movement dismisses once.
- **AC5 — Verified on a real Apple Watch, never the simulator.** Record the observed before/after when
  the wrist lowers mid-scan. If AC3 shipped, record what the dimmed state now looks like.
- **AC6 — The system Wake Duration setting is documented in the findings, not implemented.** watchOS
  defaults to a 15-second wake, user-raisable to 70; the app cannot change it. Whether to surface that
  to users is **out of scope** — it is app-wide guidance, not a barcode-screen behaviour.

## Tasks / Subtasks

- [x] **Task 1 — AC1 determination** (AC: 1)
  - [x] Check `targets/watch/Info.plist` for any existing `WKBackgroundModes` key (expected: absent) — confirmed absent
  - [x] Decide defensibility of each permitted value for a barcode screen; write the conclusion into the Dev Agent Record
  - [x] Choose the branch: **AC3** (luminance-reduced fallback) — AC2 ruled out on three independent grounds
- [x] **Task 2 — implement the chosen branch** (AC: 3)
  - [x] ~~AC2 path~~ — **not taken.** Ruled out by AC1; see the determination above
  - [x] AC3 path: read `@Environment(\.isLuminanceReduced)`, branch the barcode presentation on it via the pure `WatchBarcodeLuminancePresentation`
- [x] **Task 3 — protect the existing interactions** (AC: 4)
  - [x] Confirm tap-dismiss and crown-dismiss still fire exactly once — pinned by the AC4 test (3 tap sites, the `crownTriggered` latch)
  - [x] Confirm no session/observer outlives `onDisappear` — **nothing to outlive it.** No session was started and `\.isLuminanceReduced` is a SwiftUI environment read, so it has no subscription, timer or delegate of its own; it dies with the view. This is a property of the branch AC1 chose, not something the code had to arrange
- [ ] **Task 4 — device verification** (AC: 5, 6) — ⚠️ **AC5 IS OPEN. See "Open device gate" below.**
  - [ ] Real watch, wrist-lower mid-display, before/after recorded — **cannot be done from this environment; no physical Apple Watch**
  - [x] Wake Duration behaviour noted in findings (AC6, in the AC1 determination above)

## Dev Notes

### Files to touch — current state and what must survive

**`targets/watch/BarcodeFlashView.swift`** — the only source file this story needs to change.

- Current state: a `ZStack` with a black background, a `GeometryReader` laying out the barcode on a
  white rounded rect, crown + tap dismissal, and two `.task` blocks (one keyed on `card.id` for
  focus/haptic/usage-event, one keyed on card+size for image generation at `:113`).
- What this story changes: adds a display-luminance lifecycle to the **existing** `.task`/`.onDisappear`
  pair. It does **not** touch layout, image generation, or the `barcodeTargetSize` state machine.
- What must be preserved: the Story 9.6 `recordCardUsed` call at `:110` (a displayed barcode is a card
  "open" and the phone counts it — ADR-2026-06-09-001), the `.success` haptic, focus management, and
  both dismissal gestures.

**`targets/watch/Info.plist`** — only if AC1 clears an extended runtime session.

### Guardrails

- **Watch is read-only for card _data_** (ADR-2026-06-09-001). Usage events are the one permitted
  write and already exist. This story adds no new phone↔watch messages.
- **No new locale keys.** Scope decision, 2026-08-02. If you find yourself adding to `en.lproj` /
  `it.lproj`, you have left scope.
- **Do not attempt a private API** to set brightness. Explicitly out of scope, at any effort level.
- Native change → **not OTA-eligible**; needs a new binary.

### Testing

⚠️ **Read `docs/sprint-artifacts/README.md` and the watch testing reality before planning tests.**
The Swift XCTests under `watch-ios/Tests/` **do not auto-run in CI**. The CI-enforced watch tests are
the **TypeScript contract tests** in `targets/watch/__tests__/`, which **regex-parse the Swift source**
rather than executing it (see `watch-layout-contract.test.ts`).

- This story's behaviour is a **runtime display state** and is therefore **not meaningfully unit-testable**
  by either mechanism. Do not manufacture a contract test that merely asserts a string exists in the
  source — that is a false gate.
- The real gate is **AC5, on a physical watch**.
- Compile verification: `yarn watch:build` (needs the **main checkout** — `ios/` is gitignored and
  absent in a fresh worktree).

### Previous story intelligence

- **16.23** (**done** — shipped 2026-08-02, PR #187): established the house rule that **decoder/display behaviour
  must be proven on real hardware** — a green Jest suite proved nothing there because both decoders are
  mocked. Same principle applies here for a display state the simulator does not model.
- **16.15**: shipped a **fatal production crash** behind a green CI run (`Intl.RelativeTimeFormat`
  missing on Hermes). The generalised lesson — _the test environment is not the runtime_ — is why AC5
  is non-negotiable.
- **9.6** (`targets/watch/BarcodeFlashView.swift:104-111`): the `.task(id: card.id)` block this story
  extends was introduced by the usage-event work. Read `9-6-count-watch-card-opens.md` before editing it.

### Git intelligence

Recent watch-target commits are all **feature work on the card list and sync** (`af0b25a` Story 9.6
usage counting, `6297f9f` Story 9.5 sort, `da08cca` Story 9.4 favourites). **No commit has ever touched
display luminance, extended runtime sessions, or Always-On behaviour** — this is greenfield for the
target, which is why AC1's determination comes first.

### Library versions

No new dependency. `WKExtendedRuntimeSession` (if used) is WatchKit, already linked —
`targets/watch/expo-target.config.js` declares `frameworks: ['SwiftUI', 'SwiftData', 'WatchConnectivity', 'WidgetKit']`
and `deploymentTarget: '10.0'`.

### Project structure notes

- `targets/watch/` is a `@bacons/apple-targets` target generated into the **gitignored `ios/`** at
  prebuild. Never edit `ios/` directly.
- ⚠️ `expo prebuild` **rewrites tracked files** in this target (the watch `AppIcon` `Contents.json` is a
  known case, `.prettierignore`d for exactly that reason). If you touch `Info.plist`, verify it survives
  a prebuild.

### Out of scope — flag, don't fix

- Surfacing the system **Wake Duration** setting to users (AC6 — app-wide guidance, needs its own decision).
- Any brightness control on the **phone** — `useBrightness` already works there.
- Wear OS parity: Story 10.4 plans brightness maximisation + keep-awake on Wear OS, where the platform
  **does** expose the API. Different platform, different story.

### Open questions for ifero

None blocking. AC1's outcome is a **developer determination**, not an ifero decision — escalate only if
AC1 concludes that a `WKBackgroundModes` claim is defensible **and** you want sign-off on the App Review
risk before shipping it.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`)

### AC1 determination — `WKExtendedRuntimeSession` is ruled out; the story ships AC3

**Method: compiled and queried, not inferred.** Every claim below was checked against the
installed watchOS SDK (`WatchOS26.5.sdk`) or Apple's own documentation API, applying the
Story 16.37 standard of _executing_ rather than reading. Probes were type-checked at the
target's real deployment floor, `-target arm64_32-apple-watchos10.0`.

**1. There is no brightness API to call — confirmed, not assumed.**

| Probe                                    | Result                                                                |
| ---------------------------------------- | --------------------------------------------------------------------- |
| `UIScreen.main.brightness = 1.0`         | `error: 'UIScreen' is unavailable in watchOS`                         |
| `WKInterfaceDevice.current().brightness` | `error: value of type 'WKInterfaceDevice' has no member 'brightness'` |
| `@Environment(\.isLuminanceReduced)`     | compiles clean at watchOS 10.0                                        |
| `WKExtendedRuntimeSession().start()`     | compiles clean                                                        |

⚠️ **A correction to the story's premise, which does not change its conclusion.**
`UIScreen.h` **does ship** in the watchOS SDK, so "UIScreen does not exist on watchOS" is
loose as written — the _header_ exists. The _class_ is annotated
`API_UNAVAILABLE(visionos, watchos)` (`UIScreen.h:53`), which is why the compile probe
fails. The story's conclusion stands; only the reasoning needed correcting. Anyone
re-checking this by `ls`-ing the SDK would otherwise conclude the story was wrong.

**2. There is no keep-awake API either.** An exhaustive grep of the whole WatchKit header
set for `idleTimer` / `wakeDuration` / `alwaysOn` / `keepAwake` / `frontmost` returns one
candidate, and it is dead: `WKExtension.frontmostTimeoutExtended`
(`WKExtension.h:55-56`) is `WK_DEPRECATED_WATCHOS(4.0, 7.0, "No longer supported")` — and
it governed the "on screen wake show last app" timeout, never display luminance. There is
no successor.

**3. `WKExtendedRuntimeSession` fails on three independent grounds — any one is sufficient.**

- **It would not work.** This is the decisive one, and it is _not_ the objection the story
  anticipated. Apple: extended runtime sessions let an app "continue to communicate with a
  Bluetooth device, process data, or play sounds or haptics, **even after the watch's screen
  turns off**." They keep the _process_ alive; they never hold the _display_. Frontmost
  session types are described as "The watch screen doesn't need to remain on to keep your
  app alive" — the screen turning off is the premise, not the thing prevented. So the
  entitlement would buy App Review risk for **zero** display benefit. AC2's own wording
  ("the display does not drop to the dimmed Always-On state") is unachievable by this API.
- **The claim is not defensible, and Apple says so directly.** Only four types exist —
  self care, mindfulness, physical therapy, smart alarm — each selected by a
  `WKBackgroundModes` entry. Apple's instruction is explicit: "**Select a session type
  based on the app's intended use—not based on the features that the session provides.**"
  Picking one for its side-effects is precisely the move that sentence forbids. A loyalty
  barcode is none of the four. Without the plist key the call fails anyway
  (`WKExtendedRuntimeSessionErrorNotApprovedToStartSession = 7`).
- **It would die on our own gesture.** A frontmost session is invalidated with
  `ResignedFrontmost` when "the user press[es] digital crown" — which is this screen's
  dismissal gesture (`BarcodeFlashView.swift:194-201`). The session would end at the same
  instant the view does.

**Also considered and rejected:** `HKWorkoutSession` (keeps the screen in an always-on
state, but writes to the user's Move/Exercise rings — misrepresenting a checkout as
exercise is worse than the plist claim, not better) and the silent-audio background-mode
keep-alive hack (App Review fraud, and no display effect either). No private API was
attempted — explicitly out of scope at any effort level.

**4. What the platform _does_ offer — and it is enough for AC3.** `WKSupportsAlwaysOnDisplay`
defaults to `true` for apps built against watchOS 8+, and this target does not set it (grep:
zero hits repo-wide). So on wrist-down watchOS **keeps this view on screen** rather than
blurring it, and sets `\.isLuminanceReduced`. The barcode is therefore still being presented
to the scanner while dimmed — the symbol has not gone anywhere, so what the app draws in that
state is a real lever. That is the AC3 branch, and it is a legitimate close, per the story banner.

⚠️ **The obvious AC3 implementation is a trap, and Apple's own example is the trap.** The
`isLuminanceReduced` documentation says to "lower the overall brightness of your view … change
large, filled shapes to be stroked, and choose less bright colors." Applied to a barcode that is
**destructive**: the pure-black/pure-white pair is the signal every 1D decoder normalises its
narrow element against (the mechanism Story 16.23 measured). A stroked or greyed symbol is an
unreadable one. AC3's "hold maximum contrast" is therefore a deliberate _refusal_ of the
platform's default guidance, and the refusal is now written into the code so a later edit has to
argue with it rather than reach for the example.

**5. AC6 — the system Wake Duration setting, documented and not implemented.** watchOS wakes the
display for **15 s** by default, user-raisable to **70 s** in Settings › Display & Brightness ›
Wake Duration. No API reads or writes it. Users can also disable Always On per-app or device-wide
in that same pane — in which case wrist-down _blurs_ this view and no app-side change can help.
Both are app-wide guidance, deliberately out of scope (AC6), and surfacing them to users remains
its own decision.

### Debug Log References

`BarcodeGeometry` (DEBUG, unchanged by this story) remains the instrument for re-measuring
on hardware:

```
xcrun simctl spawn booted log stream --predicate 'category == "BarcodeGeometry"'
```

Its `container=` / `drawn=` pair is what AC5 should be read against: **exactly one `drawn=`
line per presentation, and no second one when the wrist drops.** A second `drawn=` line on
wrist-down means luminance has reached the geometry after all, which is precisely what this
story's invariance test exists to prevent.

### Completion Notes List

**Branch taken: AC3.** AC2 was ruled out three times over — see the AC1 determination above.
The story banner anticipated an App Review objection; the decisive finding is different and
stronger: `WKExtendedRuntimeSession` keeps the _app_ alive after the screen turns off and
never holds the display, so it could not have delivered AC2 at all.

**What shipped.** One pure type and roughly ten lines of view wiring:

- `WatchBarcodeLuminancePresentation` (`WatchPresentationLayout.swift`) — the policy, with
  two fields whose _independence_ is the entire point: `drawsValueGlyphs` follows luminance,
  `reservesValueStrip` deliberately does not.
- `BarcodeFlashView` reads `@Environment(\.isLuminanceReduced)` once, funnels it through the
  policy, and applies the result as `.opacity(...)` on the digits row only.

**The symbol is held invariant, and that is the load-bearing part.** No geometry, no bitmap,
no orientation and no ink changes when the wrist drops. Only the human-readable digits stop
being drawn, and their strip keeps both its reserved height and its white fill.

⚠️ **The obvious implementation is a real defect, and it was measured rather than argued.**
Feeding the layout `showsValueLabel: !isLuminanceReduced` — the shape any reviewer would
reach for first — was run through the shipped solver over all seven watches × four
symbologies. **21 of the 28 combinations change the bitmap** (a 32 px height step, so a
full re-render mid-scan) and **three of those re-resolve the symbol outright**:

| Watch | Symbol  | Awake                | Dimmed                |
| ----- | ------- | -------------------- | --------------------- |
| 40 mm | Code128 | horizontal, module 2 | **rotated, module 3** |
| 40 mm | EAN-8   | horizontal, module 4 | **rotated, module 5** |
| 41 mm | EAN-13  | horizontal, module 3 | **rotated, module 4** |

The last row is the common format on a common watch: the barcode would turn 90° and
re-quantise while the cashier was mid-scan — a _worse_ failure than the dimming the story set
out to address. This is why the policy is a type with a test rather than an inline ternary.

**Why the digits, and only the digits, and only when rotated.** They are the one thing on
screen that is neither the symbol nor its quiet zone. For a **rotated** symbol their strip lies
along the reading axis immediately past the trailing quiet zone, where black glyph strokes are
marks a decoder can take for bars; suppressing them leaves clean white there instead.

**A horizontal symbol keeps its digits** — the condition is `dimmed AND rotated`, not luminance
alone. Horizontally the strip sits on the axis _across_ the bars, so a scan line that reads the
symbol never crosses it: there is nothing competing to suppress, and AC3 asks for suppression of
what _competes_. Hiding them anyway would cost the user the number they can key in by hand (a
wrist resting flat on a counter reads as "luminance reduced" just as a lowered one does) and
would buy nothing even photometrically — black glyphs on white _emit less_ than the blank white
that replaces them, so Apple's "lower the overall brightness" ask does not argue for it either.
The accepted cost is that two cards on the same watch can now behave differently; orientation is
already per-card and per-watch (Story 16.27), and the alternative is taking the number away from
everyone to protect the minority of layouts that need it.

`.opacity(0)` rather than `if` or `.hidden()`, for **three** reasons. The strip keeps its height
(so the geometry cannot move) **and** its white fill, since removing it would expose black and
_cut_ the effective quiet zone on the rotated axis rather than extend it. And it stays in the
**accessibility tree**, which is a decision rather than an accident: this is a change to what a
_scanner_ sees, and a VoiceOver user — who cannot perceive the digits going and still needs it to
key in — must not lose it because the wrist went down. `.accessibilityHidden(true)` here would be
a real regression for them in exchange for nothing.

**The change is an instant cut, never an animation.** No `.animation` modifier reaches this
screen, so SwiftUI does not interpolate the opacity — which is the behaviour to want here twice
over. A barcode mid-read is the last place for an interpolated frame, and an animation would put
the digits at _partial_ alpha on the way out: grey strokes sitting in the quiet zone, which is a
worse state than either endpoint. AC5's checklist says "disappear", not "fade", for that reason.

The value-text **placeholder** path is deliberately untouched: that is the manual-keying fallback
for a payload no encoder accepts, so hiding it while dimmed would remove the only thing left to
read.

**Apple's own guidance is declined, on purpose.** The `isLuminanceReduced` documentation says
to "lower the overall brightness of your view … change large, filled shapes to be stroked, and
choose less bright colors." On a barcode that is destructive — the pure-black/pure-white pair
is the signal a 1D decoder normalises its narrow element against (Story 16.23's mechanism). The
refusal is written into the type's doc comment and pinned by a test, so following the platform
example now reddens CI.

**Tests are gates, not decoration — mutation-verified seven ways** (the Story 16.37 standard):

| Mutation                                               | Result                                                   |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `reservesValueStrip: hasValue && !isLuminanceReduced`  | **3 tests red**, including the 28-combination invariance |
| view feeds `showsValueLabel: !isLuminanceReduced`      | **2 tests red** (routing + contrast)                     |
| `.opacity(isLuminanceReduced ? 0.6 : 1)` on the symbol | **2 tests red** (contrast + node anchoring)              |
| opacity **moved** from the digits onto the symbol      | **1 test red** (node anchoring)                          |
| opacity **duplicated** onto the symbol as well         | **1 test red** (node anchoring)                          |
| suppression made orientation-**blind** again           | **1 test red** (the truth table — added in QA)           |
| suppression **inverted** to fire on horizontal         | **2 tests red** (the truth table — added in QA)          |

Restored: 11/11 green. Every row was re-measured against the **final shipped suite** after the
QA round below, so none of these counts describes a mid-flight version of the file.

**Review round 1 (Sonnet, read-only) — one Medium finding, fixed.** The reviewer independently
re-ran the AC1 compile probes (errors matched verbatim), re-traced the geometry invariant, and
re-derived the first three mutations — then found a genuine gap the other assertions could not
see: **nothing pinned _where_ `.opacity(...)` was applied.** Because that modifier references
`presentation.drawsValueGlyphs` rather than `isLuminanceReduced`, moving it onto `barcodeImage`
would have dimmed the _symbol_ while luminance is reduced — the exact inverse of AC3 — with every
existing check still green. Closed by an 11th test that anchors the modifier to the digits node
(view-level `.opacity(` told apart from the placeholder's `.stroke(Color.black.opacity(0.3), …)`
colour alpha by chain position), asserts its absence from the symbol block and the placeholder,
and is itself mutation-verified both ways (rows 4-5 above). The shipped code was correct
throughout; the gate protecting it was not.

**Verification run.** All 134 watch contract tests pass (7 suites — no regression to Story
16.27's layout contract, which shares this file). All 2236 main-suite tests pass across 179
suites. `yarn typecheck`, `yarn lint` (0 errors; the 3 warnings are pre-existing and untouched by this
diff — `app/_layout.tsx:510`, `features/auth/CreateAccountScreen.tsx:124`,
`features/cards/components/BarcodeScanner.tsx:84` — and are Story 16.24's scope), `yarn format:check` and all **six** of
`.husky/pre-push`'s drift checks pass (`tokens:check`, `splash:check`,
`wear:catalogue:check`, `check:build-path-filters`, `check:native-patches`,
`check:native-strings`). The **whole watch target** type-checks clean for
`arm64_32-apple-watchos10.0` against `WatchOS26.5.sdk` — 14 files, zero errors, zero warnings.

**No `cacheVersion` bump, deliberately.** Stories 16.27 and 16.37 both bumped it because they
changed what the renderer _produces_. This story does not touch `BarcodeGenerator` at all, so a
cached bitmap is still correct — bumping would needlessly re-render every card on every device.

**No new locale keys** (the 2026-08-02 scope decision), **no `Info.plist` change** and no
native-config change of any kind. `WKSupportsAlwaysOnDisplay` is intentionally left absent so
it keeps its watchOS 8+ default of `true`: setting it `false` would make the system _blur_ this
view on wrist-down instead of dimming it, which would defeat the story outright. A test guards
that absence rather than pinning the key, which also keeps `expo prebuild` out of the picture.

### ⚠️ Open device gate — AC5 is NOT satisfied

**AC5 cannot be closed from this environment: it requires a physical Apple Watch, and there is
none available here.** The simulator models neither Always-On dimming nor wake duration, so
running it there would produce a green result that means nothing — exactly the Story 16.15
failure mode AC5 exists to prevent. Recording it as open follows the precedent Story 16.29 set
with its own AC9 gate; it is stated rather than quietly assumed.

What the code _does_ have behind it: the platform facts are compile-verified against the real
SDK, the geometry invariance is proven by executing the shipped solver over the full device
matrix, and the tests are mutation-verified. What that cannot tell you is the **magnitude** of
the benefit on real hardware.

**To close AC5**, on a real watch with a real POS scanner:

1. **Use a card and watch that exercise the risky path, not an easy one.** The combinations that
   re-resolve under the rejected naive implementation are the ones worth watching: a **41 mm with
   an EAN-13**, or a **40 mm with a Code128 or EAN-8**. On any of those, let the wrist drop (or
   wait out the 15 s wake) and confirm the symbol stays put — same size, same orientation, no
   flicker, no re-draw.
2. **Check both orientations,** because the digits now behave differently. On a card whose symbol
   draws **rotated** the digits should disappear while dimmed — an instant cut, not an animated
   fade, which is deliberate; on a **horizontal** one they should stay. The DEBUG `BarcodeGeometry` log's `orientation=` field says which you have.
3. Present the dimmed barcode to a checkout scanner. Record whether it reads, and on which pass.
   **That is the number the story is actually about** — everything above is a precondition for
   it, not a substitute.
4. **Spot-check VoiceOver while dimmed.** The digits are deliberately left in the accessibility
   tree, so the number should still be announced with the wrist down. Confirm hiding it visually
   did not take it away.
5. Note the difference at Wake Duration 15 s vs 70 s (Settings › Display & Brightness), and with
   Always On switched off entirely for the app — the last case blurs the view and no app-side
   change can help.

**One question is deliberately left to that pass rather than guessed at.** Apple writes that
"the system _could also_ dim the display to achieve a suitable brightness", which hints that
Always-On dimming is content-dependent — on OLED, black pixels are off, so a screen that emits
less might be dimmed less. If that is true, blacking out the non-symbol area while dimmed would
raise the symbol's _absolute_ luminance, which is the one thing this story cannot otherwise
improve. It was **not implemented**, because it is unverified and the naive version of it is
harmful: for a rotated symbol that area is functionally quiet zone, so blacking it out would cut
the margin the decoder needs. Measure first; it is a follow-up, not a guess.

**QA round (Sonnet, read-only) — gate CONCERNS, all four findings addressed.** The QA pass
confirmed the CI wiring end to end, which is worth recording because a test that never runs is
worse than none: `.github/workflows/watchos-tests.yml` filters on `targets/watch/**` (so this diff
triggers it), its jest invocation's `--testPathIgnorePatterns` **replaces** rather than merges with
`jest.config.js`'s exclusion of `targets/watch/`, and the job runs on `macos-latest` — so
`describeOnMac` does **not** skip and the three executed-Swift tests really do run in CI. It also
re-verified the AC1 probes and the OTA characterisation independently (`app.json`'s
`runtimeVersion.policy: "appVersion"`, plus the fact that the watch target ships no JS runtime at
all, so `expo-updates` structurally cannot reach it — "not OTA-eligible" holds on two grounds).
The four findings:

1. **(Medium) The accessibility behaviour was never decided in writing.** `.opacity(0)` keeps the
   digits in the accessibility tree; nobody had said whether that was intended. It is — see the
   three-reasons paragraph above — and it is now stated in the code and given a step in the AC5
   checklist.
2. **(Low-Medium) The suppression was orientation-blind while its rationale was
   orientation-specific.** The sharpest finding of the review, and the only one that changed
   shipped behaviour: the justification holds only for a rotated symbol, so a horizontal one was
   losing its manually-keyable number for no scanner benefit. `drawsValueGlyphs` now takes the
   **drawn** orientation and suppresses only on `dimmed AND rotated`; two new mutations
   (orientation-blind, and inverted to horizontal) pin it.
3. **(Low) The AC5 checklist did not name the risky device/symbology combinations,** so a verifier
   could have tested an easy case and believed the gate closed. It now names 41 mm EAN-13 and
   40 mm Code128/EAN-8 from this story's own table, and adds the orientation and VoiceOver checks.
4. **(Nit) `sprint-status.yaml`'s `last_updated` lagged the story's own change log.** Bumped.

### Out of scope — flagged, not fixed

1. **The rotated-axis digits hazard also exists at full luminance.** This story only suppresses
   the glyphs while dimmed, because that is what AC3 scopes. For a rotated symbol the same
   strokes sit in the same place with the wrist up. Whether the digits should move (or the
   trailing quiet zone grow) is Story 16.27's geometry domain and wants its own story.
2. **Story 9.6's usage-event test has a stale slice anchor.**
   `targets/watch/__tests__/watch-usage-event-contract.test.ts:90-93` slices between
   `.task(id: card.id)` and `.task(id: "\(card.id)`. Story 16.27 renamed the second task's id to
   `renderTaskID`, so that end-anchor now matches nothing: `indexOf` returns `-1` and
   `slice(start, -1)` silently becomes "to the end of the file". The assertion still passes, but
   it no longer scopes to the appearance task and would pass with `recordCardUsed` anywhere
   below it. Verified (0 occurrences of the anchor). A weakened gate, not a failure — another
   story's test, so left alone.
3. **`BarcodeGenerator.swift:136`'s doc comment is stale.** It still says "a 13-digit Code128 is
   ≈121 modules"; 121 was the count the _broken_ encoder produced, and Story 16.37's stop-pattern
   fix took it to 123 (BWIPP-verified by that story's own reference vector for `5901234123457`).
   The comment explains the rotation threshold, so the wrong figure understates how much wider
   Code128 is than EAN-13. Untouched file, another story's fix — flagged only.
4. **Wear OS parity** is Story 10.4's, on a platform that does expose the API.

### File List

- `targets/watch/WatchPresentationLayout.swift` — added `WatchBarcodeLuminancePresentation` (orientation-aware)
- `targets/watch/BarcodeFlashView.swift` — reads `\.isLuminanceReduced`, routes it through the policy, applies it to the digits row only
- `targets/watch/__tests__/watch-display-luminance-contract.test.ts` — **new**, 11 tests
- `docs/sprint-artifacts/stories/16-26-hold-watch-display-luminance.md` — this record
- `docs/sprint-artifacts/sprint-status.yaml` — status tracking

### Change Log

| Date       | Change                                                                                                                                         |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-04 | AC1 determined against the watchOS SDK and Apple's documentation; `WKExtendedRuntimeSession` ruled out three ways; AC3 branch taken            |
| 2026-09-04 | Added the pure `WatchBarcodeLuminancePresentation` policy and wired `BarcodeFlashView` to it; digits suppressed while dimmed                   |
| 2026-09-04 | Added `watch-display-luminance-contract.test.ts` (10 tests), mutation-verified three ways                                                      |
| 2026-09-04 | Status → review. **AC5 (physical-watch verification) recorded as an open gate.**                                                               |
| 2026-09-05 | Code review round 1: pinned the opacity modifier to the digits node (11th test), closing a gap that let the symbol itself be dimmed undetected |
| 2026-09-05 | Code review round 2: zero code findings; corrected three overstated figures in this record (mutation row 3, lint locations, check count)       |
| 2026-09-05 | Code review round 3: zero code findings; corrected 28→21 bitmap-change count (QR's square fit is width-bound, so it is unaffected)             |
| 2026-09-05 | Code review round 4: APPROVED, zero comments                                                                                                   |
| 2026-09-05 | QA round: scoped digit suppression to `dimmed AND rotated` (a behaviour change), recorded the a11y decision, sharpened the AC5 checklist       |
| 2026-09-05 | QA round 2: PASS; truth table made exhaustive (12 rows) and the transitional mount-while-dimmed case stated instead of glossed                 |
| 2026-09-05 | QA round 3: PASS; corrected "fade" to an instant cut throughout — no `.animation` reaches the digits, and that is deliberate                   |
