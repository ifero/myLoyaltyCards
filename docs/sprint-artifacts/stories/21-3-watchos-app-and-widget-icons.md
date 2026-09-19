---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.3: watchOS app and widget icons — three stale surfaces, one of them bright green

Status: done

Epic: 21 — Cardì Rebrand — Native Identity

> **⚠️ THE EPIC MISSTATES TWO FACTS. Both were checked at the baseline, by decoding the files.**
>
> 1. **`AccentColor.colorset` is not "still the pre-rebrand colour" — it has NO COLOUR AT ALL.**
>    Both `targets/watch/Assets.xcassets/AccentColor.colorset/Contents.json` and the widget's are
>    byte-identical empty Xcode stubs: `{"colors":[{"idiom":"universal"}],…}` with no `color` key,
>    no components, no colour space. So `Color.accentColor` — used in `WatchSortPickerView` —
>    resolves to **system default blue**. This story must **add** a definition, not change one.
> 2. **The widget's AppIcon is a flat `#80FF80` placeholder**, verified by decoding the IDAT
>    (first pixel `0x80 0xff 0x80`, colour type 2). Its `Contents.json` declares **iPhone, iPad and
>    ios-marketing idioms and NO watchOS idiom**. It is the `@bacons/apple-targets` default,
>    untouched since it was added in `91daafb`.
>
> **⚠️ A THIRD SURFACE THE EPIC DOES NOT LIST, and it is the one users actually see.**
> `targets/watch-widget/Assets.xcassets/OpenAppIcon.imageset` (`@1x/@2x/@3x`, 64/128/192 px) still
> carries the **old blue wallet drawing**, and it is what `WatchComplicationWidget.swift:66` renders
> on the watch face. Miss it and the complication stays pre-rebrand after this story "ships".
>
> **⛔ DO NOT HAND-EDIT `targets/watch/Assets.xcassets/AppIcon.appiconset/Contents.json`.** It is
> tracked, **prebuild-owned** and `.prettierignore`d precisely because `@bacons/apple-targets`
> rewrites it with no trailing newline and Prettier can never agree. Change
> `targets/watch/AppIcon.png` and let `yarn watch:prebuild` regenerate it.
>
> **⚠️ The generator renders from CONSTANTS, not from an SVG.** There is no source file to point at
> — `scripts/build-brand-icons.mjs` draws signed-distance-field primitives from numbers at lines
> 60-90. Adding an output means adding an entry to `PNGS`, not passing a new input path.

## Story

As an Apple Watch user,
I want the watch app and its complication to carry the same mark as the phone,
so that one glance at both devices does not show me two different brands — or, on the complication,
a green square.

## Story context

Story 20.4 pointed one generator at every phone icon. It emits **eight artefacts** and
`yarn icons:check` compares each by SHA-256 against a freshly rendered buffer. None of the eight is
a watch asset, and **no CI job validates any watch icon at all** — `watchos-tests.yml` would fail on
a _missing_ icon but never on a stale or placeholder one.

So three watchOS surfaces are pre-rebrand today:

| surface              | path                                                   | state                                        |
| -------------------- | ------------------------------------------------------ | -------------------------------------------- |
| Watch app icon       | `targets/watch/AppIcon.png` (and its appiconset copy)  | **old blue wallet mark**, 1024², RGB         |
| Widget app icon      | `targets/watch-widget/…/AppIcon.appiconset/` (15 PNGs) | **flat `#80FF80` placeholder**, wrong idioms |
| Complication artwork | `targets/watch-widget/…/OpenAppIcon.imageset/`         | **old blue wallet mark**                     |

The watch AppIcon declares exactly **one** size: 1024×1024 @1x, `platform: watchos`. That is the
modern single-size watchOS appiconset — do not "restore" the fifteen legacy sizes there.

**Why the widget's appiconset has iOS idioms:** `targets/watch-widget/expo-target.config.js` has
**no `icon:` key** (unlike the watch target, which does), so prebuild never wrote it one and the
scaffold default survived. Whether `@bacons/apple-targets` supports `icon:` for a `watch-widget`
target is **not verified** — AC7 makes that a spike, not an assumption.

## Acceptance Criteria

- **AC1 — `targets/watch/AppIcon.png` carries the Cardì mark, rendered by
  `scripts/build-brand-icons.mjs`**, not by hand and not by copying `assets/icon.png`. It is added
  to the generator's output list so it is regenerated and checked like the other artefacts.
- **AC2 — The appiconset copy is produced by `yarn watch:prebuild`**, not edited. Its
  `Contents.json` keeps the single `1024x1024 / universal / watchos` entry and its byte-exact
  no-trailing-newline form. If prettier or a formatter touches it, the change is wrong.
- **AC3 — The widget AppIcon stops being green.** Every PNG in
  `targets/watch-widget/…/AppIcon.appiconset/` carries the Cardì mark at its declared size, and the
  `ItunesArtwork@2x.png` with it.
- **AC4 — The widget appiconset's idioms are corrected or the decision is recorded.** It currently
  declares iPhone/iPad/ios-marketing and no watchOS idiom. Either it gains the watchOS idiom, or
  the PR states — with a source — why an iOS-idiom set is right for a watchOS widget extension.
  Do not leave it unexamined.
- **AC5 — `OpenAppIcon.imageset` carries the Cardì mark** at all three scales. This is the
  complication's visible artwork; AC9 verifies it on a watch face.
- **AC6 — Both `AccentColor.colorset` files GAIN a colour definition.** The colorsets are empty
  stubs today, so this is new content, not an edit. ✅ **The design system already answers the
  value**: on a dark ground, "primary actions become beam `#FCCC0C` with ink text — this inversion
  is deliberate". A watch runs on black, so the accent is **beam**. Cite that rule rather than
  re-deriving it. ⚠️ **Take the value Story 23.1 DECIDED** — it is `wave_0` and has already landed by the time this
  story runs, so the value is settled, not provisional. 23.1 holds design authority for the watch
  and gates 23.2–23.4; this story consumes its decision rather than deriving one. Note that the design system's "beam is drawn in exactly three places"
  inventory is already inconsistent with its own text; **23.1's AC7b restates it** — cite whatever
  23.1 wrote rather than reasoning from the old count.
- **AC7 — The `icon:` key question for the widget target is answered in writing.** If
  `@bacons/apple-targets` supports it, use it and let prebuild own the widget appiconset too. If it
  does not, the PNGs are generated into the asset catalogue directly and the PR says so.
- **AC8 — The mark is verified against a CIRCULAR crop**, not the phone's squircle. watchOS masks
  its icon to a circle. Verify at the smallest size the watch renders, not only at 1024.
- **AC9 — `yarn icons:check` covers the new artefacts**, so the watch icons cannot drift from the
  phone's. The success line's count rises from 8. Both the pre-push hook and
  `ci-quality-gates.yml:102` pick this up with no workflow change.
- **AC10 — Verified on a real Apple Watch or the simulator**: the home-screen icon under its
  circular mask, and the complication in **all four** supported families
  (`accessoryCircular`, `accessoryRectangular`, `accessoryInline`, `accessoryCorner`), with
  screenshots.

## Tasks / Subtasks

- [x] **Task 1 — Extend the generator (AC1, AC3, AC5).** Add the watch artefacts to `PNGS`. The
      renderer knows two primitives only (rounded rect, rotated rounded rect) and will not silently
      approximate — if the mark needs anything else, the script must learn it. - [x] `targets/watch/AppIcon.png` (1024, opaque ink field) - [x] `OpenAppIcon.imageset` @1x/@2x/@3x (64/128/192, opaque) - [x] the widget appiconset, converted to the single 1024 watchOS entry - [x] no new primitive was needed — the two the renderer knows already draw the mark
- [x] **Task 2 — Prebuild the watch appiconset (AC2).** `yarn watch:prebuild`; confirm the bytes.
- [x] **Task 3 — Widget idioms spike (AC4, AC7).** Answered from the installed plugin source AND
      from `actool`'s own output; see Completion Notes.
- [x] **Task 4 — Accent colours (AC6).** Two `Contents.json` files gain a real colour — plus the
      build setting that makes `Color.accentColor` read them, and the barcode carve-out that a
      real accent makes necessary.
- [x] **Task 5 — Extend `icons:check` (AC9).** 9 artefacts -> 14.
- [x] **Task 6 — Circular-crop verification (AC8).** Asserted on the rendered pixels, not argued.
- [ ] **Task 7 — Device pass (AC10).** Three of the four complication families verified on a
      46 mm simulator; `accessoryInline` NOT placed — see Completion Notes for why, and what
      remains for ifero's hardware pass.

## Dev Notes

### The complication image budget — do not exceed it

`ComplicationImage.swift` downsamples at `maxPoint: 38, scale: 2` → **76 px**, and its comment
explains why: `accessoryCorner`'s budget is ≈81.6 px, and a larger image passes `circular` but
fails `corner` with `imageTooLarge`, which renders the slot as a **grey placeholder**. `.frame` and
`.scaledToFit` do not help — the pixels themselves must be small. If `OpenAppIcon` grows, that
budget is what breaks.

### Guardrails

- **`rotate(35)` ✓ / `rotate(-35)` ✗.** A negative rotation lifts the right end and produces an
  _acute_, a different word. Fifty drawings got this wrong before prose stopped it (Story 20.3).
- **iOS rejects an app icon carrying an alpha channel.** Opaque artefacts are written as PNG colour
  type 2 (RGB), transparent ones as type 6. The generator already enforces this; do not bypass it.
- Do not touch `watch-android/` — that is Story 21.4, and both stories extend the same generator
  file. **Land 21.3 first, then 21.4**; the collision is additive and rebases trivially.
- Ships in the single rebrand release (Story 21.7).

### Testing

`yarn icons:check`, `yarn test`, `yarn format:check`. AC8 and AC10 are device work.

### References

- [Source: docs/epics.md#Story 21.3: watchOS App and Widget Icons]
- [Source: docs/sprint-artifacts/stories/20-3-the-mark-35-grave-contained.md] — grave vs acute
- [Source: docs/sprint-artifacts/stories/20-4-one-generator-every-icon.md] — the eight artefacts
- [Source: .prettierignore] — why the watch `Contents.json` is excluded

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Opus 5), via the BMAD `dev-story` workflow.

### Debug Log References

Every finding below was produced by building and running, not by reading. The commands, in the
order they mattered:

- `yarn watch:prebuild` then `yarn watch:build:ci` — the build log is where the `actool`
  invocations differ between the two watch targets (`--app-icon AppIcon` for the app, absent for
  the widget).
- `xcrun --sdk watchos assetutil --info <product>/Assets.car` — what actually ships.
- `plutil -p <product>/Info.plist | grep -i accent` — whether `NSAccentColorName` exists.
- `xcrun simctl install/launch` + `xcrun simctl io <udid> screenshot` on
  `Apple Watch Series 11 (46 mm)`, watchOS 26.4, then decoding the screenshots to read exact
  pixel values rather than eyeballing them.
- `@bacons/apple-targets@4.0.6` `build/icon/with-ios-icon.js` and `build/configuration-list.js` —
  read for AC7.
- The watchOS SDK's own `SwiftUI.swiftinterface` — read for `toolbarForegroundStyle` availability.

### Completion Notes List

#### The refinement's figure for `icons:check` was stale, harmlessly

AC9 says "the success line's count rises from 8". The baseline on `main` is **9**, not 8 —
`docs/assets/cardi-mark-inline.svg` was added after refinement. It is now **14**.

#### AC7 / AC4 — the spike, and the third answer neither option anticipated

**`icon:` IS accepted for a `watch-widget` target, and using it would have been wrong.**
`withIosIcon` branches on `type === "watch"` and nothing else; a `watch-widget` falls to the
`else`, which runs `setIconsAsync` over a hardcoded `ICON_CONTENTS` table of **iphone / ipad /
ios-marketing** sizes. So `icon:` would have regenerated the _same wrong idiom set_, in Cardì
colours instead of green.

**And the set never ships at all.** Measured, not inferred:

| evidence                                        | watch app                 | watch widget             |
| ----------------------------------------------- | ------------------------- | ------------------------ |
| `ASSETCATALOG_COMPILER_APPICON_NAME` in pbxproj | present (Debug + Release) | **absent**               |
| `actool` invocation                             | `--app-icon AppIcon`      | **no `--app-icon` flag** |
| `AppIcon` in the built `Assets.car`             | `Icon Image`, idiom watch | **not present at all**   |
| icon keys in the built `Info.plist`             | `CFBundleIconName` etc.   | **none of any kind**     |

`actool` strips the appiconset entirely. The fifteen `#80FF80` placeholders and
`ItunesArtwork@2x.png` have never reached a device — so the story's "one of them bright green" is
true of the repository but was never true of the product. A watchOS widget extension is
represented by its containing app's icon.

**⚠️ AC3's LITERAL TEXT IS NOT WHAT SHIPPED, and that is the AC4 decision's direct
consequence rather than an oversight.** AC3 asks that every PNG in the widget appiconset carry the
mark "and the `ItunesArtwork@2x.png` with it". Converting the set to the watchOS single-size form
**deletes** `ItunesArtwork@2x.png` instead of recolouring it — `ios-marketing` is an App Store
idiom and has no meaning inside a watchOS extension, which is the same reason the other fourteen
went. AC3's intent — nothing green ships, the widget carries the Cardì mark — is met; its
enumeration is superseded by AC4, which explicitly authorised examining and changing the idioms.
Recorded here so a later audit of ACs-against-shipped does not read AC3 as quietly unmet.

**Decision (ifero, mid-implementation):** convert rather than delete. The appiconset now holds one
generated 1024 carrying the Cardì mark and a `Contents.json` declaring `idiom: universal` /
`platform: watchos` — the same single-size form the watch app's own appiconset uses. That answers
AC4 with the watchOS idiom, drops fifteen wrong-idiom files, and puts what remains under
`icons:check`. It is still unreferenced, and that is recorded rather than hidden.

#### AC6 — the colorset is necessary and was NOT sufficient

Filling both `AccentColor.colorset` files does compile beam into the catalogue —
`assetutil` reports `AccentColor`, `srgb`, `0.988 / 0.800 / 0.047`, which is exactly `#FCCC0C`.
**It changed nothing on screen.** `actool` only writes `NSAccentColorName` when
`ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME` names a colorset, and `expo prebuild` emits that
setting for no target. So `Color.accentColor` kept resolving to the system default.

⚠️ **That default is flat grey `#808080`, not "system default blue".** Both this story's premise
and `cardi-watch-grammar.md` §4.5 say blue; the pixels say `(128, 128, 128)` against `(255, 255,
255)` for the unselected rows beside it. The fix is the same, but the before-state in both
documents is wrong and should not be used to check this.

`plugins/with-watch-accent-color.js` supplies the setting. Two things about it are load-bearing:

1. **It must be listed BEFORE `@bacons/apple-targets` in `app.json`.** Expo's `withMod` wraps the
   previously registered mod and calls it after its own action, so the last-registered plugin runs
   first — and the watch targets do not exist until apple-targets creates them. Listed the
   intuitive way round it matches nothing, prebuild still succeeds, and the accent silently stays
   grey. The plugin therefore throws on an empty match, and `test/watch-accent.test.ts` pins the
   ordering itself.
2. **The colorsets stay hand-authored in sRGB.** `@bacons/apple-targets`' own
   `colors: { $accent }` mechanism works and does land the build setting (verified), but
   `withIosColorset` hardcodes `"color-space": "display-p3"` — and those components in P3 are a
   visibly more saturated yellow on the P3 display every modern Apple Watch has. The design system
   says beam "appears at exactly that value or not at all", so only the _naming_ is automated.

#### The barcode carve-out — 23.1 predicted it, and it is real

With the accent live, watchOS tints the navigation title. On `BarcodeFlashView` that title is the
**card's name**, so the screen the design system protects most got beam painted onto it. Measured
before the fix: `#FCCC0C`. `cardi-watch-grammar.md` §4.5 had already specified the remedy — the
barcode screen overrides its tint to cream `#F0F0E8`, cream and not ink because the reserved strip
is part of the black surround and ink on black is invisible. Measured after: `#F0F0E8`, exact.

⚠️ **`.tint()` does not do this, and it fails silently.** It was the first attempt and changed
nothing: this view is a `navigationDestination` of the card list's `NavigationStack`, so the bar
belongs to the stack and a tint set inside the destination never reaches it. The modifier that
works is `toolbarForegroundStyle(_:for: .navigationBar)` — watchOS 9.0+ and, per the SDK's own
interface, **explicitly unavailable on iOS, macOS and tvOS**, which is the clue that it exists for
this strip. The test pins the absence of the `.tint` form as well as the presence of the right one.

23.1 assigned the on-device confirmation of this carve-out to 23.2; it is done here because a
release with no OTA remedy should not carry the defect in the first place.

#### AC8 — containment, measured rather than argued

The mark clears the circular mask with room: the farthest inked pixel sits at **0.672** of the
inscribed circle's radius. That is below the 0.756 the generator's own bounding-box figure implies
(corner radius 37.798 of 50), and the gap is not an error in either number — the bounding box is a
rectangle whose corners a rotated mark never reaches. Containment is scale-invariant, so the same
measurement covers the 76 px complication and the home-screen thumbnail. `test/watch-icons.test.ts`
decodes the rendered pixels and asserts it, with a second, tighter assertion (`< 0.85`) that fails
while a growing mark is still a discussion rather than a clipped logo.

No watch-specific scale was introduced. The half-extents (23.879 x 29.299) also fit the inscribed
SQUARE's 35.355, which is the containment rule `cardi-watch-grammar.md` §7.2 states for circular
masks — so the phone geometry already satisfied the watch's stricter mask.

#### ⛔ AC10 — THREE of the four complication families verified, not four

Verified on `Apple Watch Series 11 (46 mm)`, watchOS 26.4, with screenshots:

| surface                 | result                                                                      |
| ----------------------- | --------------------------------------------------------------------------- |
| Home-screen app icon    | ✅ Cardì mark under the circular mask, contained with margin                |
| `accessoryCircular`     | ✅ mark fills the slot; no grey `imageTooLarge` placeholder                 |
| `accessoryCorner`       | ✅ mark renders; this is the tightest budget of the four                    |
| `accessoryRectangular`  | ✅ mark + "Open app" label                                                  |
| `accessoryInline`       | ⛔ **NOT PLACED** — and it renders no image, so this story cannot affect it |
| Sort picker accent      | ✅ beam `#FCCC0C`, sampled                                                  |
| Barcode title carve-out | ✅ cream `#F0F0E8`, sampled                                                 |

**Why `accessoryInline` is unplaced:** no watch face I could reach exposes a general inline slot.
Infograph, Modular, Modular Compact and Modular Duo were each added and inspected; all four put a
**fixed date** complication in the position that would host it.

**And it is the one family this story cannot affect, which is a stronger statement than the
risk-is-small one it replaces.** `WatchComplicationWidget.swift:37-38` gives `.accessoryInline` its
OWN case — `Text(WatchWidgetL10n.string("watch.widget.complication.inline.open"))` — so it renders
a localised string and no image at all. Swift does not fall through without an explicit
`fallthrough` and the file contains none, so that case never reaches `iconImage`. This story
changes artwork (`OpenAppIcon`, the two app icons) and the accent; `.accessoryInline` reads none of
them. `targets/watch/__tests__/watch-complication-contract.test.ts:139` already pins the string it
does read.

⚠️ **An earlier draft of this note said the opposite** — that inline "falls through the same
`default:` branch" and therefore shared the 76 px image-budget risk. That was wrong, and wrong in a
way that would have sent the hardware pass looking for a clipped or grey image on a family that
draws no image. What is genuinely unverified there is pre-existing inline TEXT behaviour, unchanged
by this story.

⚠️ One thing worth knowing for that pass: a freshly `simctl install`ed watch app does **not** appear
in the complication picker until the simulator is rebooted. It is not a packaging bug — it cost
one wasted pass here.

#### ⚠️ The Dev Notes quote one side of a contradiction, and it is harmless here

This story's Dev Notes state that "`accessoryCorner`'s budget is ≈81.6 px". `ComplicationImage.swift`
says that two incompatible ways — its type doc comment attributes ≈81.6 pt to `circular` and ≈46 pt
to `corner`, while the comment on `make()` attributes ≈81.6 px to `accessoryCorner` — and the two do
not reconcile at ×2. `cardi-watch-grammar.md` §10 already found this, refused to derive a looser
budget from it, and deferred reconciling the comment to Story 23.4.

Nothing here depends on which reading is right: **76 px is under both**, it is the shipped value,
and every assertion in this change uses 76. Recorded rather than corrected because the Dev Notes are
not this workflow's to edit — it may only touch the frontmatter, the task checkboxes, this record,
the File List, the Change Log and the Status.

#### ⚠️ For whoever edits `BarcodeFlashView.swift` next (Story 23.2)

`test/watch-accent.test.ts` strips `//` comments from that file with a line-based regex before
asserting that beam is ABSENT from it. That is the Swift-side mirror of a hole QA round 2 removed
on the JavaScript side — there, the fix was to stop parsing text and evaluate the module instead,
and no equivalent exists for Swift from a Jest test.

The invariant it depends on is checked and holds today: the file contains no `://`, no block
comments, and no line where `//` follows a quote. **If you introduce any of those, that assertion
can start passing for the wrong reason** — and it is an absence assertion, so it will not tell you.
The test says so at the call site too.

#### Out of scope, noticed in passing

`docs/design/cardi/cardi-watch-grammar.md` §4.5 and this story both describe the un-named accent as
"system default blue" when it is `#808080`. Not corrected here — the grammar is 23.1's artefact and
this story is not its editor — but worth a one-line amendment when 23.2 opens it.

### File List

**Added**

- `plugins/with-watch-accent-color.js`
- `plugins/with-watch-accent-color.test.js`
- `test/watch-icons.test.ts`
- `test/watch-accent.test.ts`
- `targets/watch-widget/Assets.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png`

**Modified**

- `app.json` — registers the accent plugin, before `@bacons/apple-targets`
- `eslint.config.mjs` — a CommonJS block for `plugins/**/*.js`
- `scripts/build-brand-icons.mjs` — five watch artefacts added to `PNGS`
- `targets/watch/AppIcon.png` — regenerated (Cardì mark)
- `targets/watch/Assets.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png` — rewritten by
  `yarn watch:prebuild`, not by hand
- `targets/watch/Assets.xcassets/AccentColor.colorset/Contents.json` — beam, sRGB
- `targets/watch-widget/Assets.xcassets/AccentColor.colorset/Contents.json` — beam, sRGB
- `targets/watch-widget/Assets.xcassets/AppIcon.appiconset/Contents.json` — watchOS single-size
- `targets/watch-widget/Assets.xcassets/OpenAppIcon.imageset/open-app-icon@{1,2,3}x.png` —
  regenerated (Cardì mark)
- `targets/watch/BarcodeFlashView.swift` — the tint carve-out
- `targets/watch-widget/expo-target.config.js` — comment only, no config change: a standing
  warning not to add `icon:`, which is what the AC7 spike was actually about
- `.github/build-path-filters.json` — `plugins/**` joins the iOS set; `!**/*.test.js` joins the
  shared excludes
- `.github/workflows/ios-release.yml` — mirrors the above (the guard enforces the mirror)
- `.github/workflows/android-release.yml` — mirrors the shared exclude only; `plugins/**` is
  deliberately NOT in the Android set, because the mod is registered for iOS alone
- `.github/workflows/watchos-tests.yml` — `plugins/**` on both triggers: it is the only workflow
  that runs an iOS `expo prebuild` on a PULL REQUEST, so it is the only pre-merge gate that
  executes this mod at all
- `docs/cicd.md` and `CONTRIBUTING.md` — both prose-enumerate the path filters this story
  changed, and nothing gates that prose; brought back in step
- `docs/design/cardi/cardi-watch-grammar.md` — line-number citations only. Its two references
  to `BarcodeFlashView.swift:125-143` were re-anchored to `133-151` because THIS change moved
  the block they point at. No prose altered — the "system default blue" mislabel noted above is
  still 23.2's to correct.
- `targets/watch/README.md` — a fourth prose enumeration of the same path filters, found only
  in review round 3
- `docs/sprint-artifacts/stories/21-3-watchos-app-and-widget-icons.md`
- `docs/sprint-artifacts/sprint-status.yaml`

**Deleted**

- The iOS-idiom placeholder set in
  `targets/watch-widget/Assets.xcassets/AppIcon.appiconset/` — **15 files**: fourteen
  `App-Icon-*.png` (20x20, 29x29 and 40x40 at @1x/@2x/@3x; 60x60 at @2x/@3x; 76x76 at
  @1x/@2x; 83.5x83.5 at @2x — the cross product is not filled in, which is why it is
  fourteen rather than eighteen) plus `ItunesArtwork@2x.png`

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-18 | Implemented Story 21.3. Three stale watchOS surfaces now carry the Cardì mark, generated from the one geometry definition and covered by `yarn icons:check` (9 artefacts -> 14).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-18 | AC7 spike answered from the plugin source and from `actool`: `icon:` is supported for a `watch-widget` but emits iOS idioms, and the widget appiconset is stripped from the built `.appex` entirely. Converted to the watchOS single-size form.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-18 | AC6 completed beyond its literal text, at ifero's direction: the colorsets alone are inert, so `plugins/with-watch-accent-color.js` names them as the global accent and `BarcodeFlashView` takes 23.1 §4.5's cream carve-out.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-18 | AC10 partially satisfied: home icon and three of four complication families verified on a 46 mm simulator; `accessoryInline` left for a hardware pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-09-18 | Code review, round 1 — six findings, all fixed. The substantive one: `plugins/` is a new top-level source directory that reaches the iOS binary and was in NO path filter, so a PR touching only the plugin would have triggered neither a release build nor the watchOS workflow. Adding it exposed a second hole the reviewer did not name — `plugins/*.test.js` became the first `.js` test under a watched path, so `!**/*.test.js` joins the shared excludes (which is why `android-release.yml` is touched too; `yarn check:build-path-filters` caught that mirror). Also: the plugin test's mocks are no longer `virtual`, so a dependency bump that moves `@bacons/apple-targets`' internal build file now fails a one-second Node test instead of a native prebuild; `BARCODE_TITLE_TINT` became `private let barcodeTitleTint` (repo convention, and it is file-local); `function watchOSTargets` became a const arrow (AGENTS.md); optional chaining so a malformed target yields the plugin's own actionable error rather than a `TypeError`; and a stale test filename in a Swift doc comment corrected. Carve-out re-verified on device after the rename — still `#F0F0E8` exactly.                                                                                                                           |
| 2026-09-18 | Code review, round 2 — four findings, all fixed. One was a real regression this story introduced: `docs/cicd.md` and `CONTRIBUTING.md` both prose-enumerate the path filters, and no gate covers that prose, so adding `plugins/**` and `!**/*.test.js` silently made five passages wrong. Also re-anchored the watch grammar's two `BarcodeFlashView.swift:125-143` citations to `133-151`, since this change moved the block they cite; corrected the File List's deleted-file arithmetic (the brace pattern is fourteen files, not fifteen — the cross product is not filled in); and made `buildConfigurationsOf` filter on `buildSettings` rather than tolerate its absence, so selection and mutation share ONE definition of "a configuration this plugin can write to" and a hollow target hits the loud error instead of being half-applied. Re-ran `expo prebuild` after that selector change: the build setting still lands on all four watchOS configurations.                                                                                                                                                                                                                                                                                                                                                  |
| 2026-09-18 | Code review, round 3 — four findings, all resolved. Two were more of the drift round 2 started fixing and did not finish: a THIRD `BarcodeFlashView.swift` citation in the watch grammar (`231-245` -> `239-253`, the same +8 shift), and a FOURTH prose enumeration of the watchOS path filters, in `targets/watch/README.md`. The lesson is worth carrying: the machine-checked config has FOUR prose mirrors and `yarn check:build-path-filters` guards none of them. Added the mixed-configuration test that actually drives round 2's `buildConfigurationsOf` filter through the mod action rather than through the selector alone. Also corrected a PRE-EXISTING omission on lines this story was already editing — both `docs/cicd.md` JS-bundle-source enumerations were missing `modules/**`, which `ios-release.yml` and `android-release.yml` have watched since Story 16.36. ⛔ DELIBERATELY NOT FIXED: the same stale citations in `docs/sprint-artifacts/stories/23-1-the-watch-grammar.md`. That story is `done`, and a closed story file is a point-in-time record of what was true when it shipped, not a document kept in sync.                                                                                                                                                                           |
| 2026-09-18 | Code review, round 4 — ONE finding, and it was a factual error in this record rather than in the code. The AC10 note claimed `accessoryInline` "falls through the same `default:` branch" as the two families proven inside the 76 px image budget, and used that to call the residual risk small. It does not: `WatchComplicationWidget.swift:37-38` gives it its own case rendering a localised string and no image, and Swift needs an explicit `fallthrough`, which the file does not contain. The correction makes the gap SMALLER, not larger — inline reads none of what this story changes — but the wrong version would have sent a hardware pass hunting for a clipped or grey image on a family that draws none. Corrected in both the story and the tracker. No code changed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-18 | Code review, round 5 — two findings, both in this record, both addressed. The test citation `watch-complication-contract.test.ts:132` pointed at a blank line; it is `:139`, the line carrying the key. And the Dev Notes quote `accessoryCorner`'s budget as ≈81.6 px, which is one side of a contradiction `ComplicationImage.swift` states two ways and `cardi-watch-grammar.md` §10 already deferred to 23.4 — recorded in the Completion Notes rather than corrected, because this workflow may not edit Dev Notes, and nothing here turns on it (76 px is under both readings). Round 5 also independently re-derived every checkable figure in this record — 0.671886 -> 0.672, the geometry constants, the 9 -> 14 count, the sha256 identity, the mod-order semantics, the SDK availability line — and all reproduced. No code changed in rounds 4 or 5.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-18 | Code review, round 6 — **APPROVED, no comments.** Six rounds, seventeen findings, all resolved bar one declined with reasons. Round 6 verified the story document end to end rather than re-deriving figures: all 41 working-tree entries map one-to-one onto the File List; the Dev Notes span is byte-identical to `HEAD`, so the workflow's edit restriction was actually honoured; and the two near-misses it chased both cleared — `targets/watch/AppIcon.png` and its prebuild copy differ in SHA but are bit-for-bit identical in PIXELS once the scanline filters are reconstructed (prebuild uses adaptive filtering), and the pbxproj evidence table reproduced exactly from an independent parse.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-18 | QA review, round 1 — three findings, all addressed. The good one: the AC7 spike's whole discovery lived in the Completion Notes and in a generator comment, and NOWHERE in `targets/watch-widget/expo-target.config.js` — the one file where the missing `icon:` reads as an oversight, because its sibling watch config has the key. Re-adding it would regenerate the fifteen iOS-idiom PNGs this story deleted, differing only in being Cardì-coloured instead of green, which is HARDER to spot; and nothing would catch it until someone ran prebuild. Now guarded by a comment there and by two assertions in `test/watch-icons.test.ts` — one pinning the widget key's ABSENCE, one pinning that the watch target still points at the file the generator writes, which is the AC1/AC2 seam and was equally unpinned. Also reconciled AC3's literal wording against the AC4 conversion, so a later audit does not read it as quietly unmet.                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-09-18 | QA review, round 2 — four findings, all fixed. The sharpest was that round 1's own remedy had a hole: the widget-config assertion matched SOURCE TEXT with comments regex-stripped, so a `//` inside a string on the same line as a real `icon:` key would have hidden it — the test would have passed at exactly the moment it mattered. It now EVALUATES the config via `jest.requireActual` and asserts `config.icon` is undefined, which removes the class of hole rather than narrowing it and is the truer assertion anyway (`withIosIcon` fires on a truthy `props.icon`, not on those characters). Added the missing header-level assertion for the prebuild-WRITTEN appiconset PNG — the file that actually ships and the one artefact no gate covered, checked via IHDR rather than the pixel path because prebuild uses adaptive scanline filtering and `decode()` throws on anything but filter 0. Corrected an overclaim I had written into three places: `watchos-tests.yml` is not "the only workflow that runs a real `expo prebuild`" — five others do — it is the only one that runs an iOS prebuild ON A PULL REQUEST, and therefore the only pre-merge gate that executes this mod at all. And made the trailing-newline assertion print the offending tail instead of "expected true, received false". |
| 2026-09-18 | QA review, round 3 — **APPROVED, no comments requiring action.** Round 3 re-proved the round-2 remedies by simulation rather than by reading: it rebuilt the exact text-stripping vulnerability in a temp dir and confirmed the old helper hid a real `icon:` key while the new evaluated-config assertion catches it; decoded both appiconset PNGs' scanline filter bytes (generator `0` throughout, prebuild `1,2,4,3` adaptive) confirming the header-only check was the right call; and checked all eight prebuild-running workflows against their triggers, confirming the reworded PR-gating claim is exact. Its one observation is recorded, not fixed: the Swift-side comment stripper has the same structural limit the JS side shed, no Jest-reachable alternative exists, and the invariant it needs provably holds today. Noted above for Story 23.2.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
