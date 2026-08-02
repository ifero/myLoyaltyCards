---
baseline_commit: 115709db1516be13e449145bcc6ac9ac139e5c97
---

# Story 16.26: Hold the Apple Watch display at full luminance while a barcode is shown

Status: ready-for-dev

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

- [ ] **Task 1 — AC1 determination** (AC: 1)
  - [ ] Check `targets/watch/Info.plist` for any existing `WKBackgroundModes` key (expected: absent)
  - [ ] Decide defensibility of each permitted value for a barcode screen; write the conclusion into the Dev Agent Record
  - [ ] Choose the branch: AC2 (session) or AC3 (luminance-reduced fallback)
- [ ] **Task 2 — implement the chosen branch** (AC: 2 or 3)
  - [ ] AC2 path: start session in `.task(id: card.id)` (`:104`), invalidate in `.onDisappear` (`:139`), handle the delegate's expiry/invalidation callbacks
  - [ ] AC3 path: read `@Environment(\.isLuminanceReduced)`, branch the barcode presentation on it
- [ ] **Task 3 — protect the existing interactions** (AC: 4)
  - [ ] Confirm tap-dismiss and crown-dismiss still fire exactly once
  - [ ] Confirm no session/observer outlives `onDisappear`
- [ ] **Task 4 — device verification** (AC: 5, 6)
  - [ ] Real watch, wrist-lower mid-display, before/after recorded
  - [ ] Wake Duration behaviour noted in findings

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

### Debug Log References

### Completion Notes List

### File List

### Change Log
