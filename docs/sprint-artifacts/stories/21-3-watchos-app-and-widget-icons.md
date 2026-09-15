---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.3: watchOS app and widget icons — three stale surfaces, one of them bright green

Status: ready-for-dev

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

- [ ] **Task 1 — Extend the generator (AC1, AC3, AC5).** Add the watch artefacts to `PNGS`. The
      renderer knows two primitives only (rounded rect, rotated rounded rect) and will not silently
      approximate — if the mark needs anything else, the script must learn it.
- [ ] **Task 2 — Prebuild the watch appiconset (AC2).** `yarn watch:prebuild`; confirm the bytes.
- [ ] **Task 3 — Widget idioms spike (AC4, AC7).**
- [ ] **Task 4 — Accent colours (AC6).** Two `Contents.json` files gain a real colour.
- [ ] **Task 5 — Extend `icons:check` (AC9).**
- [ ] **Task 6 — Circular-crop verification (AC8).**
- [ ] **Task 7 — Device pass (AC10).** Four complication families.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log
