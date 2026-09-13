---
baseline_commit: 4de43079a64a6a73514d187d285a637614467946
---

# Story 16.39: Full brightness on the card detail screen — by setting or by button

Status: done

Epic: 16 — Platform & Tech Debt

> **⚠️ Renumbered 16.30 → 16.39 before merge.** The first draft took 16-30 after scanning the
> tracker and every git _branch name_ — but 16-30…16-33 are claimed by story **files** on the
> unmerged `docs/cardi-redesign-carry-over` branch, which no branch-name scan can see
> (`16-30-fix-scan-banner-occluded-by-bottom-actions.md` and three siblings). Two different
> "Story 16.30" files briefly existed on two branches. Allocate an Epic 16 number by scanning
> story files across **all refs**, not the tracker and not branch names.
>
> **⚠️ THIS STORY WAS REDESIGNED MID-FLIGHT, ON 2026-09-07, BEFORE IT SHIPPED.** The first
> implementation held the detail screen at full brightness **unconditionally**. ifero replaced that
> with **user control**: a button on the card, and a Settings toggle that is **off by default**. Read
> the "What changed, and why the first version was wrong to ship" section before assuming the
> unconditional behaviour is still the goal — it is not, and no released build ever had it.
>
> **JS only → OTA-eligible.** Unlike Story 16.26 (the watchOS sibling, which needed a new binary),
> nothing here is native. `runtimeVersion.policy` is `appVersion`, so this ships in the next OTA.
>
> **No new Android permission.** `useBrightness` calls `Brightness.setBrightnessAsync`, which is
> **activity-scoped**. `setSystemBrightnessAsync` — the one needing `WRITE_SETTINGS` — is not used
> and must not be introduced.

## Story

As a user holding my phone up to a checkout scanner,
I want to put the card detail screen at full brightness — with one tap, or automatically if I have
asked for that —
so that the scanner reads the barcode without me reaching into Control Centre, and without the app
changing my screen brightness when I never asked it to.

## Context

### The report, and the correction to it

ifero, 2026-09-05: _"the phone card details screen needs to be fully bright, not only the full
screen one."_ Raised while reviewing Story 16.26, which fixed the equivalent problem on Apple Watch
and explicitly scoped the phone **out** ("`useBrightness` already works there") — true of the hook,
false of the screen.

ifero, 2026-09-07, after seeing the first implementation: _"what if we add a button to increase the
brightness? like 'on and off' so that customers can do it themself if they need/want to and add a
setting toggle to automatically set brightness to 100% in card details (default is off)."_

### What each phone surface does today

| Surface                                          | Maximises brightness | Shows "Increase brightness for scanning" |
| ------------------------------------------------ | -------------------- | ---------------------------------------- |
| `CardDetails.tsx` — the card detail screen       | **No**               | Yes (`:241-246`)                         |
| `FullscreenBarcode.tsx` — tap-to-enlarge overlay | Yes (`:52-64`)       | Yes (`:134-137`)                         |
| `BarcodeFlash.tsx` — the `/barcode/[id]` route   | Yes (`:58,66-73`)    | No                                       |

Two things fall out of that table:

1. **The detail screen is the only barcode surface that does not maximise.** That is the defect.
2. **The fullscreen overlay already contradicts itself** — it sets brightness to 1.0 _and_ tells the
   user to raise their brightness. So the hint is stale in both places it appears, not just the one
   ifero reported. Both usages share a single key, `cards.details.brightnessHint`.

### What changed, and why the first version was wrong to ship

The first implementation maximised brightness on every visit to a card, for everyone. It passed two
code reviews and three QA rounds — and it was still the wrong product, for a reason no review round
raises because none of them is a product question: **it changed a device-level setting for every
user without being asked.** The Settings toggle now defaults to off, so a fresh install behaves
exactly as it did before this story existed, and the button is what a user reaches for at a
checkout.

Two consequences worth naming:

- **The hint is now REPLACED, not merely removed.** Story 13.3 put "Increase brightness for
  scanning" on the detail screen. Deleting it while shipping unconditional brightness was defensible
  (the app did the thing the hint asked for). Deleting it while shipping a default-OFF setting would
  have left the screen with neither the advice nor a control. The button occupies exactly the
  position the hint did.
- **QA's earlier finding about the AC6 failure path is now moot.** It flagged that removing the hint
  removed the only affordance a user had if `setBrightnessAsync` fails. There is now a real control
  there instead.

## Acceptance Criteria

- **AC1 — A Settings toggle governs the automatic behaviour, and it is OFF by default.** Persisted
  through `core/settings/settings-repository.ts` alongside the theme and language preferences. ⚠️ The
  default is load-bearing: only an explicit stored `'true'` enables it, so a never-set, cleared or
  corrupted value reads as off. **Note this inverts `isFirstLaunch`'s convention**, where an unset
  value means "yes" — being treated as a first launch is harmless; silently changing someone's
  screen brightness is not.
- **AC2 — A button on the card detail screen turns the boost on and off**, showing its current
  state, and it works whichever way the setting is set — including turning the boost **off** on a
  card when the setting has it on.
- **AC3 — The button's effect lasts for that visit only** (ifero, 2026-09-07). It is not persisted:
  the standing choice is the setting's job, and two sources of truth for one preference is how they
  drift. Returning to a card starts from the setting again, in both directions.
- **AC4 — The lifecycle is FOCUS-scoped, not mount-scoped, and survives backgrounding.** ⚠️ Expo
  Router keeps a pushed-under screen **mounted**, so a `useEffect` cleanup would never run when the
  user opens `/card/[id]/edit` — the phone would sit at full brightness on the edit form and
  everywhere reachable from it. ⚠️ And navigation focus is not the only way to leave: `expo-brightness`
  documents that on iOS the level "will persist until the device is locked", so backgrounding must
  restore and returning must re-apply. `AppState` **`background` only** — never `inactive`, which iOS
  fires transiently while the app is still frontmost (a Control Centre pull), where restoring would
  drop the brightness mid-scan.
- **AC5 — The fullscreen overlay is left exactly as it is** (ifero, 2026-09-07). It has maximised on
  its own since Story 2.5, and enlarging a barcode is an explicit "I am about to scan this" gesture
  that carries its own consent. The new setting governs the passive detail screen only.
- **AC6 — The stale hint is replaced on the detail screen and removed from the overlay**, and
  `cards.details.brightnessHint` deleted from `en.ts` and `it.ts`. New keys are added for the button
  and the setting — **this reverses the original story's "no new locale keys" constraint**, which was
  written when the change was a pure rendering-state change and no longer applies to a story whose
  whole point is two new controls.
- **AC7 — No regression** to tap-to-enlarge, copy-to-clipboard, favourite, delete, the
  scroll-condensing header, or Story 9.1 usage tracking.
- **AC8 — Brightness failure stays non-fatal.** Simulators and some devices reject the call outright;
  a rejection must never surface to the user or break the screen.
- **AC9 — No new permission and no native change.** Activity-scoped `setBrightnessAsync` only. If you
  find yourself editing `app.json`, a manifest, or reaching for `setSystemBrightnessAsync`, stop.

## Tasks / Subtasks

- [x] **Task 1 — persistence** (AC: 1, 9)
  - [x] `getAutoBrightnessEnabled` / `setAutoBrightnessEnabled` in `core/settings/settings-repository.ts`, re-exported through the settings feature
  - [x] Tests for the fail-safe default, including `'TRUE'`, `'1'` and `'yes'` reading as off
- [x] **Task 2 — the Settings toggle** (AC: 1, 6)
  - [x] `useAutoBrightnessPreference` hook, mirroring the other preference hooks
  - [x] A `ToggleSwitch` row in `PreferencesSection` — the component's first consumer in the app
- [x] **Task 3 — the card button and the boost lifecycle** (AC: 2, 3, 4, 8)
  - [x] `useCardBrightnessBoost` resolves setting + per-visit override, owns focus and `AppState`
  - [x] A pressable `accessibilityRole="switch"` control in `CardDetails`, where the hint used to be
  - [x] `CardDetailScreen` owns the hook and passes state down
- [x] **Task 4 — the hint** (AC: 6)
  - [x] Replaced on the detail screen, removed from the overlay, locale key deleted, new keys added in `en` and `it`
- [x] **Task 5 — regression pass** (AC: 5, 7, 9)
  - [x] Overlay untouched apart from the hint row; 2282 tests / 183 suites green; no `app.json`, manifest or native diff

## Dev Notes

### Files to touch

| File                                                     | Change                                                      |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `core/settings/settings-repository.ts`                   | The persisted preference, defaulting to off                 |
| `features/settings/hooks/useAutoBrightnessPreference.ts` | **New.** Reads and writes it                                |
| `features/settings/components/PreferencesSection.tsx`    | A `ToggleSwitch` row                                        |
| `features/cards/hooks/useCardBrightnessBoost.ts`         | **New.** Setting + per-visit override, focus and `AppState` |
| `features/cards/components/CardDetails.tsx`              | The button, where the hint was                              |
| `features/cards/screens/CardDetailScreen.tsx`            | Owns the hook, passes state down                            |
| `features/cards/components/FullscreenBarcode.tsx`        | Hint row removed; its `useBrightness` untouched             |
| `shared/i18n/locales/en.ts`, `it.ts`                     | One key deleted, three added                                |

**Do NOT modify `useBrightness.ts`.** It is correct, tested, and shared with two other surfaces.
This story composes it; it does not change it.

### The two effects, and why they are two

⚠️ **This is the part that was implemented wrong first and is worth reading before touching it.**
`useFocusEffect` runs its cleanup on blur **and** whenever its callback identity changes. The first
version depended on the resolved boost and cleared the per-visit override in that cleanup — so a tap
on the button changed the identity, fired the cleanup, and wiped the override before it could be
applied. **The button silently did nothing.** The hook now splits the two:

- the **focus effect** owns the setting-driven path and the `AppState` subscription, and its deps
  deliberately exclude the resolved boost, so it re-runs only on real focus changes;
- a **separate effect** owns the button-driven override, guarded on `null` so it does nothing until
  the user actually taps.

The per-visit reset lands on the way **in**, not the way out, and the focus effect reads the setting
directly rather than the resolved value — so there is no window in which a stale override from the
last visit could be applied before the reset lands.

### Guardrails

- **Never `setSystemBrightnessAsync`.** Activity-scoped only.
- Watch and Wear OS are untouched. The watchOS side is Story 16.26 (shipped, and note it could _not_
  use this approach — watchOS has no brightness API at all). Wear OS is Story 10.4.

### Testing

- `useCardBrightnessBoost.test.ts` — the real gate. Its `useFocusEffect` mock is **identity-compared**
  on purpose: a mock that re-runs the callback every render both misrepresents an effect and would
  spin now that the callback resets state.
- `CardDetails.brightness.test.tsx` — the only suite that runs the real component tree, the real
  `useBrightness` and the real hook against one mocked `expo-brightness`. Every other suite mocks one
  of the brightness consumers away.
- ⚠️ **Verify a mutation actually applied before believing it passed.** Two mutations in this story
  "passed" only because the edit had silently missed (one hit a comment containing the string, one
  hit an earlier `=== 'true'` in the same file), and two more "passed" because the tests they were
  meant to exercise had never been written — an earlier script aborted before writing them.

### Previous story intelligence

- **13.3** (`13-3-restyle-card-detail.md:85,91,93`) — wrote the hint this story replaces.
- **2.5** — introduced `useBrightness` and the overlay's auto-maximise, which AC5 preserves.
- **16.26** — the watchOS sibling. Worth reading for the contrast: watchOS exposes no brightness API
  whatsoever, which is why the phone gets a control and the watch needed a presentation policy.
- **9.1** (`useTrackCardUsage`) — the focus-effect pattern.

## Dev Agent Record

### Agent Model Used

Claude Opus 5 (`claude-opus-5`)

### Debug Log References

None. Brightness is a device-level side effect with no in-app log surface; the tests drive the real
`useBrightness` against a mocked `expo-brightness` instead.

### Completion Notes List

**What shipped.** Two controls and the state that resolves them.

- `getAutoBrightnessEnabled` / `setAutoBrightnessEnabled` — persisted, **off unless explicitly
  `'true'`**.
- `useAutoBrightnessPreference` + a `ToggleSwitch` row in `PreferencesSection`. That component has
  been exported from the shared UI kit with a `label` prop and no consumer in the app; this is its
  first one, so its `accessibilityRole="switch"` semantics are now exercised by a real screen. Its
  test deliberately renders the **real** switch rather than a stub, because a stub would let the
  accessibility assertions pass while the shipped control announced nothing.
- `useCardBrightnessBoost` — resolves `override ?? setting`, owns the focus and `AppState`
  lifecycle, and returns `{ isBoosted, toggle }`.
- A pressable `accessibilityRole="switch"` control in `CardDetails`, in the position Story 13.3 gave
  the hint. Rendered only when the screen supplies a handler, so `CardDetails` stays usable on its
  own.
- `useBrightness.ts` is **byte-for-byte unmodified**, as the ACs require.

**The redesign found a bug the previous eight review rounds could not.** Reviews ask whether the code
does what the story says; they do not ask whether the story is right. The unconditional version was
correct, tested, mutation-verified and approved — and it changed every user's screen brightness
without being asked. The default-off setting is the fix, and it means a released build never carried
the unconditional behaviour.

⚠️ **And the redesign's own first attempt was broken in a way only a test caught.** Clearing the
per-visit override in the focus cleanup meant a tap on the button undid itself: `useFocusEffect` runs
its cleanup whenever the callback identity changes, not only on blur. Three tests went red
immediately. Split into two effects; the mutation that restores the old shape reddens five.

**Two sources, one truth.** The setting persists; the button does not. Returning to a card starts
from the setting again — asserted in **both** directions, because a tap-off with the setting on is
just as much an override as a tap-on with it off.

**AC5 leaves the overlay alone, deliberately.** It has maximised since Story 2.5, and enlarging a
barcode is an explicit gesture. One consequence is worth knowing: because the detail screen no longer
holds brightness unconditionally, the overlay's own `useBrightness` is **live again** — under the
previous design it had become redundant, and mutations to it reddened nothing. It is now the only
thing brightening an enlarged barcode for a user who has not opted in.

**Tests are gates, not decoration — mutation-verified fourteen ways:**

| Mutation                                                       | Result                                       |
| -------------------------------------------------------------- | -------------------------------------------- |
| the setting defaults **on** instead of off                     | **6 tests red**                              |
| the override effect removed (button inert)                     | **3 tests red**                              |
| the original bug: boost in the focus deps + reset in cleanup   | **5 tests red**                              |
| the button rendered without its handler guard                  | **1 test red**                               |
| `accessibilityRole` `switch` → `button`                        | **2 tests red**                              |
| foreground re-maximises without checking whether it is boosted | **1 test red**                               |
| the settings hook stops persisting                             | **2 tests red**                              |
| the button's `onPress` wired to a no-op                        | **1 test red**                               |
| the bulb inverted, so filled means off                         | **1 test red**                               |
| the same bulb drawn in both states (no visual state at all)    | **1 test red**                               |
| `accessibilityLabel` dropped, leaving an unnamed switch        | **1 test red**                               |
| the tap target shrunk to the glyph's own 24 pt                 | **1 test red** (added after it first passed) |
| the Settings row reverted to a sun, disagreeing with the card  | **1 test red**                               |
| the icon left exposed to the accessibility tree                | **1 test red**                               |

Restored: green. ⚠️ **Five of these initially reported a false pass** and are recorded because the
lesson is reusable. Two edits silently missed their target — one landed on a doc comment that quoted
the string, one on an earlier `=== 'true'` in the same file. Two more had no test to fail, because
the script meant to add those tests had aborted before writing. And the tap-target row passed
because nothing was asserting the tap target at all until the icon-only redesign made it worth
asserting. **Verify the edit applied, and that a test exists to fail — not just that the suite ran.**

**Verification.** 2290 tests across 183 suites (was 2236/179 on `main`: **+54 tests, +4 suites**).
The four new suites declare 29 tests (15 + 3 + 6 + 5) and the five modified suites add 14 more
declarations; the executed total is higher than 43 because the repository suite's `it.each`
expands one declaration into six cases.
`yarn typecheck`, `yarn lint` (0 errors — the 3 warnings are pre-existing in `app/_layout.tsx:510`,
`features/auth/CreateAccountScreen.tsx:124` and `features/cards/components/BarcodeScanner.tsx:84`,
and are Story 16.24's scope), `yarn format:check`, and all eight `check:*` / `*:check` gates pass,
including `check:story-catalogue-sync`.

**Deployment: JS only → OTA-eligible.** No native file, no `app.json` change, no new permission.
`setBrightnessAsync` is activity-scoped; the Expo docs' permission API applies only to
`setSystemBrightnessAsync`, which is not used.

**Review rounds.** Three code-review rounds (final: approved, zero comments) and a QA round.
Between them they found five documentation/label defects created by the mid-flight redesign and the
earlier renumber — a comment still naming the deleted `useMaximizeBrightnessOnFocus` and claiming the
app brightens by itself (contradicting AC1), a duplicated comment block, a missing settings-barrel
export, a `useFocusEffect` mock that had drifted from its sibling, and four AC labels left at the
pre-redesign numbering. All fixed. QA then raised five more, four of which are actioned here:

1. **(Medium, accessibility) The Settings row exposed its icon as its own screen-reader stop.**
   `ActionRow` gets one-stop-per-row for free by wrapping its icon inside the Pressable that carries
   the label; this row's icon is a **sibling** of the switch, and `MaterialIcons` renders a Text node
   with real glyph content — so VoiceOver would have read an extra, unlabelled stop before
   "Full brightness, switch", making the row behave unlike its two neighbours. Hidden with
   `accessibilityElementsHidden` **and** `importantForAccessibility="no-hide-descendants"` (one is
   iOS, one Android; either alone leaves the other platform broken), and pinned by a test that
   reddens when the fix is reverted.
2. **(Low, test design) The integration suite claimed more than it did.** Its header said it ran the
   real component and the real hook together, but it called `renderHook` separately and rendered
   `CardDetails` **without** the brightness props — so the switch never rendered and the two real
   pieces only met through the mocked `expo-brightness` module. A `Harness` component now wires the
   real hook into the real component, and one new test goes **press → hook → `useBrightness` →
   device** with nothing stubbed. That chain had been covered piecewise across three files and
   nowhere end to end.
3. **(Low) The every-render setting read is not house style**, and a copy-paste of this hook would
   inherit it wrongly. Now explicitly documented as deliberate, with the reason: every sibling
   preference hook OWNS its value and can read once; this one has to OBSERVE a value another
   component writes, and the codebase has no shared store or event bus for that.
4. **(Low) Android's need for the `AppState` handling is unexamined.** Added to the device checklist
   below rather than assumed — the leak `expo-brightness` documents is an iOS behaviour, and on
   Android the handling may simply be redundant (harmless either way, since the extra calls are
   no-ops).

⚠️ **QA's fifth finding — discoverability — was answered by ifero on 2026-09-08 rather than
actioned as written.** See "The discoverability question, asked and answered" below.

QA also verified the coverage gate is not at risk: global 93.9 / 86.9 / 89.5 / 94.5 against an 80 %
threshold, with every new production file at **100 %** on all four metrics, and confirmed the
per-file gaps on touched files are pre-existing (untouched press-state handlers and `Platform.OS`
ternaries). It further established, by reading `app/_layout.tsx`'s route config, that two scenarios
worth worrying about are **not currently reachable**: Settings is only linkable from Home, so a card
screen cannot sit pushed-under it, and nothing links one card's detail screen to another's.

### The discoverability question, asked and answered

QA raised (Medium) that the control explained itself less than the hint it replaced: Story 13.3's row
was instructional text, while the first button's visible copy was just its label, "Full brightness" —
a statement of what it is, not of what it does. The explanation existed only as an
`accessibilityHint`, which sighted users never hear.

**ifero answered it on 2026-09-08 by removing the words rather than adding more:** _"can't it just be
a button with a light bulb? isn't it faster to understand?"_ It is the better answer. A bulb reads as
light pre-verbally, where "Full brightness" has to be read and then interpreted; and a caption under
a barcode competes with the one thing that screen exists to do. The filled/outline pair
(`lightbulb` / `lightbulb-outline`) then carries the on/off state that the text was never carrying
anyway.

⚠️ **The metaphor question was then answered properly, because QA found it was not hypothetical.**
The first pass recorded a caveat — in Material's vocabulary the bulb is more often the _tip/idea_
glyph, while the sun (`light-mode`) is the brightness metaphor, as iOS Control Centre uses — and
declined to act on it. QA pointed out what that caveat had missed: **the app was using both answers
at once, one screen apart.** The Settings row carried a sun for the standing preference while the
card carried a bulb for its per-visit override — the same feature, no shared visual language between
where you configure it and where you use it. Worse, the Theme row immediately above the Settings
toggle already uses `brightness-6`, so a sun there collided with that too.

Both surfaces are now the bulb. The card button is where the meaning is actually learned, so the
Settings row follows it rather than the reverse; it uses the filled `lightbulb` as a category glyph,
since the switch beside it is what carries state. A test pins the shared glyph so the two cannot
drift apart again.

### ⚠️ The control is optimistic, deliberately

`isBoosted` is application state — `override ?? setting` — and is **never reconciled against whether
`setBrightnessAsync` actually succeeded.** On a device that rejects the call (AC8 names this as
expected on "some devices"), the bulb shows filled and a screen reader announces "on" while the
screen never brightened.

This is a consequence of AC8, not a defect against it: `useBrightness` swallows its own failures by
design so a rejection never reaches the user, and this story may not modify that file — it is shared
with the fullscreen overlay and the barcode-flash route. Closing the gap would mean making
`useBrightness` report success, which changes a hook three surfaces depend on and belongs to its own
story.

Raised by QA, and now **pinned by a test** so the optimism is visible in the suite as a decision
rather than an assumption, plus an item on the device checklist below. Flagged rather than fixed.

### ⚠️ Not verified on a physical device

The behaviour is a device side effect, so every assertion here runs against a **mocked**
`expo-brightness`, which is also known to reject on simulators (why AC8 exists). What a real device
pass should confirm:

1. With the setting **off** (the default), opening a card changes nothing. Pressing the button
   brightens it; pressing again returns the user's level.
2. With the setting **on**, opening a card brightens it, and the button turns it off for that visit
   only — leaving and returning is bright again.
3. Navigating to Edit and back **lowers then raises** it — the AC4 behaviour a mount-scoped
   implementation would get wrong while looking fine.
4. **On iOS specifically:** open a card with the boost on, press Home **without locking**, and
   confirm the device returns to the user's brightness rather than staying bright; return and confirm
   it brightens again. Then pull down Control Centre while on the card and confirm the barcode does
   **not** dim — the `inactive`-vs-`background` distinction, judgeable only on hardware.
5. Leaving the screen returns the user's own level, including after opening and closing the
   fullscreen overlay (which still brightens on its own, per AC5).
6. Android needs no permission prompt, `setBrightnessAsync` being activity-scoped.
7. **Whether the bulb ever lies.** On a device or simulator that rejects `setBrightnessAsync`,
   confirm what the control shows. It is expected to read "on" while nothing changed — see "The
   control is optimistic" above. Worth knowing how visible that is in practice before deciding
   whether it needs its own story.
8. **On Android, whether the `AppState` handling does anything observable at all.** The leak it
   exists for is an iOS behaviour; Android's `setBrightnessAsync` is window-scoped and the platform
   is not expected to let one activity's brightness follow the user into another app. If it is
   redundant there, that is fine — the calls are no-ops — but nobody has checked, so do not assume
   the iOS result transfers.

### Out of scope — flagged, not fixed

- **A latent race inside `useBrightness`**, pre-existing and spotted while tracing the nesting: a
  `getBrightnessAsync()` still in flight when `restore()` fires can leave `originalBrightnessRef`
  holding a value that is never restored. Reachable only by open→close→open faster than the promise
  resolves. That file is out of scope here, so it is recorded, not fixed.
- **A pre-existing vestigial mock:** `CardDetails.test.tsx` mocks `../hooks/useBrightness`, which
  `CardDetails.tsx` has never imported directly.
- **`BarcodeFlash.tsx` (`/barcode/[id]`) still maximises unconditionally.** Same argument as AC5 — it
  is an explicit "show me the barcode" route — but nobody has asked the question for it, so it is
  named here rather than quietly changed.
- Making the boost configurable per card, and the 56 Dependabot advisories on `main`.

### File List

- `core/settings/settings-repository.ts` — the persisted preference (+ 4 test declarations, one an `it.each` over six fail-safe values)
- `features/settings/hooks/useAutoBrightnessPreference.ts` — **new**, 5 tests
- `features/settings/components/PreferencesSection.tsx` — the `ToggleSwitch` row and the shared bulb glyph (+ 4 tests, pinning the single screen-reader stop and the glyph)
- `features/settings/screens/SettingsScreen.tsx` — owns the preference hook
- `features/settings/settings-repository.ts` — re-exports
- `features/settings/index.ts` — exports the hook and the two repository functions, for parity with the theme and language preferences
- `features/cards/hooks/useCardBrightnessBoost.ts` — **new**, 15 tests
- `features/cards/hooks/useBrightness.nesting.test.ts` — **new**, 3 tests (ref isolation)
- `features/cards/components/CardDetails.brightness.test.tsx` — **new**, 6 tests (real wiring, incl. one true end-to-end press)
- `features/cards/components/CardDetails.tsx` — the icon-only bulb button (+ 8 new tests)
- `features/cards/screens/CardDetailScreen.tsx` — owns the boost hook (+ 3 wiring tests)
- `features/cards/components/FullscreenBarcode.tsx` — hint row removed (+ its tests)
- `features/cards/index.ts` — exports the new hook
- `shared/i18n/locales/en.ts`, `shared/i18n/locales/it.ts` — `brightnessHint` deleted; `brightnessToggleLabel`, `brightnessToggleHint` and `autoBrightnessLabel` added
- `docs/epics.md` — the `### Story 16.39` section and `totalStories`
- `docs/sprint-artifacts/stories/16-39-maximise-brightness-on-card-detail.md` — this record
- `docs/sprint-artifacts/sprint-status.yaml` — status tracking

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-05 | Story drafted from ifero's report; registered in `development_status` and as `wave_5`                                                                                                                                                                                                           |
| 2026-09-05 | First implementation: unconditional focus-scoped brightness; hint removed from both surfaces                                                                                                                                                                                                    |
| 2026-09-05 | Code review rounds 1-2 (zero code findings) and QA rounds 1-3: renumbered 16.30 → 16.39, added the `epics.md` section, closed an iOS backgrounding leak                                                                                                                                         |
| 2026-09-07 | **REDESIGNED at ifero's request:** the automatic behaviour becomes a Settings toggle defaulting to OFF, plus a per-visit button on the card                                                                                                                                                     |
| 2026-09-07 | Fixed a bug in the redesign's own first attempt — clearing the override in the focus cleanup made the button undo itself                                                                                                                                                                        |
| 2026-09-07 | Mutation-verified eight ways; status → review                                                                                                                                                                                                                                                   |
| 2026-09-07 | Code review rounds 1-3 (final: approved, zero comments): cleared stale comments from the redesign and the renumber, a missing barrel export, a drifted focus mock, and four mis-numbered AC labels                                                                                              |
| 2026-09-07 | QA round: fixed a screen-reader stop on the Settings row, made the integration suite genuinely end-to-end, and documented the non-house-style setting read; one product question left open for ifero                                                                                            |
| 2026-09-08 | Button became an icon-only light bulb at ifero's request, answering QA's discoverability finding by removing words rather than adding them; filled/outline now carries the state, with the spoken label and the tap target pinned because the caption no longer holds either up                 |
| 2026-09-08 | QA round 3: aligned the Settings row onto the same bulb after QA found the app using a sun and a bulb for one feature a screen apart (and colliding with the Theme row's `brightness-6`); pinned the shared glyph, and pinned the control's deliberate optimism about a refused brightness call |
