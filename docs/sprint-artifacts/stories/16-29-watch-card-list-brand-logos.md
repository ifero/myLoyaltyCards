---
baseline_commit: 115709db1516be13e449145bcc6ac9ac139e5c97
---

# Story 16.29: Show brand logos instead of initials in the Apple Watch card list

Status: ready-for-dev

Epic: 16 — Platform & Tech Debt

> **✅ MOST OF THIS ALREADY EXISTS — IN THE WRONG TARGET. DO NOT BUILD IT FROM SCRATCH.**
> The watch **complication** already renders real brand logos. `targets/watch-widget/Assets.xcassets`
> ships **57 `BrandLogo-*.imageset` assets covering all 57 catalogue brands** (verified 2026-08-02
> against `origin/main` after Upim landed: 57 imagesets, `catalogue/italy.json` has 57 brands —
> **full coverage today, and the generator is what keeps it that way**), resolved through
> `BrandLogoCatalog` (`targets/watch-widget/BrandLogoCatalog.swift`) with `assetName(for:)` and
> `prefersDarkBacking(for:)`, backed by `knownBrandIds` / `lightLogoBrandIds` in
> `Generated/BrandLogoCatalog.generated.swift`. Both generated files come from
> `watch-ios/Scripts/generate-catalogue.swift`, which reads the catalogue **and** the imageset folder so
> they cannot drift.
>
> The watch **app** has none of it: `targets/watch/Assets.xcassets` contains only `AccentColor.colorset`
> and `AppIcon.appiconset`, and `CardRowView.logoView` (`targets/watch/CardListView.swift:369-393`) draws
> `initials(from:)` on a brand-coloured circle.
>
> **So this is an asset- and target-membership problem, not a design problem.** Reuse
> `BrandLogoCatalog`; do not re-derive light/dark logic, and do not hand-copy the imagesets.
>
> **Native change → NOT OTA-eligible.**
> **✅ INDEPENDENT of Stories 16.26 / 16.27 / 16.28** — it touches `CardListView.swift`, the asset
> catalogues and the generator script; none of those three edit any of them. **Can ship first.**

## Story

As a user scrolling my cards on the watch at a checkout,
I want to see each retailer's logo rather than two letters,
so that I can pick the right card at a glance instead of reading text on a 40 mm screen.

## Context

### The report

ifero, 2026-08-02: _"we should be showing the brands on the watch instead of the initials while showing
the list of cards (when the brand exists)"_. The parenthetical is load-bearing — see AC2.

### What the row renders today

`CardRowView` (`targets/watch/CardListView.swift:289-394`):

| Element        | Source                                    | Change?           |
| -------------- | ----------------------------------------- | ----------------- |
| Accent bar     | `:329-331`, 5 × 28 pt, `accentColor`      | ❌ unchanged      |
| **Avatar**     | `:333-335`, 30 pt, `.clipShape(Circle())` | ✅ **this story** |
| Card name      | `:337-343`                                | ❌ unchanged      |
| Favourite star | `:347-352`                                | ❌ unchanged      |
| Row background | `:359`, `#1C1C1F`                         | ❌ unchanged      |
| A11y label     | `:366` via `cardRowAccessibilityKey`      | ❌ unchanged      |

`logoView` (`:369-393`) has two branches today — a catalogue brand (initials on brand colour) and a
custom card (initials on user colour). **Both currently render initials**; only the first changes.

### The target-membership problem

The watch app and the widget are **separate targets with separate asset catalogues**, and
`@bacons/apple-targets` generates the Xcode project from the folder layout — so asset membership follows
the files on disk. `BrandLogoCatalog.swift` currently lives under `targets/watch-widget/` and is compiled
into the widget only.

## Acceptance Criteria

- **AC1 — A card whose `brandId` resolves to a known brand shows that brand's logo** in the 30 pt row
  avatar (`WatchCardRowLayoutMetrics.compact.avatarSize`, `WatchPresentationLayout.swift:31`), clipped to
  the existing `Circle()` (`CardListView.swift:334-335`).
- **AC2 — Initials remain the fallback, on two distinct paths.** (a) A **custom card** (`brandId` nil —
  the `else` branch at `:381-392`). (b) A **catalogue brand with no bundled imageset**:
  `BrandLogoCatalog.normalized(_:)` gates on `knownBrandIds` and returns `nil` for unknown brands, so this
  is a **real branch even at today's 57-of-57 coverage** — a brand added to `catalogue/italy.json` without
  a PNG must degrade to initials, **not to an empty circle**.
- **AC3 — Light and white logos stay legible** via the existing `prefersDarkBacking(for:)` dark chip. The
  row background is `#1C1C1F` (`:359`), so white-on-transparent artwork would otherwise vanish.
  **Reuse the widget's decision — do not re-derive it.**
- **AC4 — The accent bar and favourite star are unchanged.** The 5 × 28 pt accent rectangle (`:329-331`)
  and trailing star (`:347-352`) keep their current behaviour and colours. Only the avatar's content changes.
- **AC5 — Accessibility is unchanged.** The row stays a **single combined element** labelled by
  `cardRowAccessibilityKey(isFavorite:)` (`:283-287`, `:366`). The logo is **decorative** — it must not add
  a second VoiceOver element and must not replace the card name in the label.
- **AC6 — The assets reach the watch app target without a second source of truth.** Extend
  `watch-ios/Scripts/generate-catalogue.swift` to emit for **both** targets rather than hand-copying the
  imagesets, and make `BrandLogoCatalog` reachable from both **without duplicating its logic**.
  `yarn watch:catalogue:generate` must remain the single command that regenerates everything.
- **AC7 — The watch app's binary size increase is measured and recorded** in the story's completion notes.
  57 imagesets are being added to a target that has none, and the watch app is size-sensitive.
- **AC8 — The add-a-brand checklist is updated** to name the new asset location, so a future brand cannot
  ship with a complication logo and an initials-only list row.
- **AC9 — Verified on device** in both a light and a dark watch face context, with at least one
  dark-backing brand, one normal-logo brand, and one custom card visible in the same list.

## Tasks / Subtasks

- [ ] **Task 1 — Decide the sharing mechanism** (AC: 6)
  - [ ] Choose between a shared source location compiled into both targets vs. generator-emitted copies
  - [ ] Confirm `@bacons/apple-targets` picks it up for the watch app target
- [ ] **Task 2 — Extend the generator** (AC: 6)
  - [ ] `watch-ios/Scripts/generate-catalogue.swift` emits imagesets + catalogue data for both targets
  - [ ] `yarn watch:catalogue:generate` still regenerates everything in one command
- [ ] **Task 3 — Swap the avatar** (AC: 1, 2, 3, 4)
  - [ ] `logoView` (`:369-393`) renders the logo when `BrandLogoCatalog.assetName(for:)` resolves
  - [ ] Both initials fallbacks preserved; dark chip applied via `prefersDarkBacking(for:)`
- [ ] **Task 4 — Accessibility check** (AC: 5)
  - [ ] Combined element preserved; logo decorative; VoiceOver announces name + favourite state only
- [ ] **Task 5 — Measure and document** (AC: 7, 8)
  - [ ] Record binary-size delta; update the add-a-brand checklist
- [ ] **Task 6 — Device verification** (AC: 9)

## Dev Notes

### Files to touch — current state and what must survive

**`targets/watch/CardListView.swift`**

- Current: `CardRowView` (`:289-394`) resolves the brand via `WatchBrands.all.first(where:)` (`:305-311`)
  from `targets/watch/Generated/Brands.swift`, derives an accent colour (`:314-325`), and draws initials
  in `logoView` (`:369-393`).
- Changes: `logoView` only.
- **Must survive:** `normalizedBrandId` trimming/lowercasing (`:294-303`), the accent-colour derivation and
  its `isNearBlack` border (`:361-364`), the combined a11y element (`:365-366`), and `CardListView`'s sort /
  deep-link / SwiftData behaviour (`:421-563`) — none of which this story touches.

**`watch-ios/Scripts/generate-catalogue.swift`** — currently emits `targets/watch/Generated/Brands.swift`
**and** `targets/watch-widget/Generated/BrandLogoCatalog.generated.swift`. It already reads both the
catalogue JSON and the imageset folder, so it is the right place for AC6.

**`targets/watch/Assets.xcassets`** — gains the brand imagesets.

**`targets/watch-widget/BrandLogoCatalog.swift`** — becomes shared. **Do not fork it.**

### Guardrails

- ⚠️ **`expo prebuild` rewrites tracked files inside the watch target's asset catalogue.** The watch
  `AppIcon` `Contents.json` is a known case — it is rewritten with **no trailing newline** and is
  `.prettierignore`d for exactly that reason. **Before putting generated content next to it, confirm which
  files under `targets/watch/Assets.xcassets` are prebuild-owned**, and never "fix" that missing newline.
- **`Brands.swift` and `BrandLogoCatalog.generated.swift` are generated — never hand-edit.** Both carry a
  `DO NOT EDIT` banner. Change the generator.
- **Generated content is committed and `.prettierignore`d.** Keep it that way; a CI `prettier --check`
  gate exists (`0d79e28`).
- Watch is read-only for card data (ADR-2026-06-09-001). This story reads brand metadata only.
- Native → **not OTA-eligible**.

### Testing

- **CI-enforced:** the TS contract tests in `targets/watch/__tests__/`. Two are directly relevant:
  - `generate-catalogue.test.ts` — guards the generator's output; **it will need extending for AC6**.
  - `watch-complication-contract.test.ts` — guards the widget's logo wiring; the pattern to copy for the app.
- ⚠️ These tests **regex-parse Swift source**; they do not run it. A refactor that changes a declaration's
  shape can break them even when behaviour is correct.
- Swift XCTests (`watch-ios/Tests/CardRowHelpersTests.swift`) cover `initials(from:)` and colour helpers —
  **AC2's fallback logic belongs there**, but note these **do not auto-run in CI**.
- Compile: `yarn watch:build` (**main checkout** — `ios/` is gitignored).

### Previous story intelligence

- **The complication logo work is the direct template.** Read how `BrandLogoCatalog` +
  `BrandLogoCatalogData` + the generator fit together before writing anything — the hard decisions
  (normalisation, unknown-brand fallback, light-logo dark chip) are already made and tested.
- **The add-a-brand checklist** already spans catalogue JSON + app SVG + `brandLogos.ts` + watch imageset
  PNGs (rasterised from SVG via AppKit) + regenerating `Brands.swift`. AC8 extends it; read it first so the
  new step lands in the right place.
- **16.22** — established the house pattern of extracting layout maths into a pure, testable helper rather
  than inlining it in the view. Relevant if AC3's chip logic needs a decision function.

### Git intelligence

Recent catalogue commits (`7837f35` Paghi Poco / il Centesimo / Codice Fiscale, `d6c3676` Leroy Merlin,
`1ce5928` Super Conveniente) are the **worked examples of adding a brand end-to-end** — read one to see
exactly which files a brand touches today, since AC8 changes that list.

### Library versions

No new dependency. SwiftUI + asset catalogues only.

### Project structure notes

- `targets/watch/` and `targets/watch-widget/` are separate `@bacons/apple-targets` targets, generated into
  the **gitignored `ios/`** at prebuild — never edit `ios/`.
- They already share an app group: `group.com.iferoporefi.myloyaltycards.watch-complication` (both
  `expo-target.config.js` files). That is for **runtime shared state**, not for compile-time asset sharing —
  do not conflate them.

### Out of scope — flag, don't fix

- **Changing the logo artwork itself.**
- **Brand logos on the barcode flash screen** (`BarcodeFlashView`) — different surface, different story.
- **Wear OS parity** — Story 10.4 territory.
- The 30 pt avatar size and the circle clip — AC4 keeps the row geometry as-is.

### Open questions for ifero

None blocking. If AC7's binary-size delta turns out to be large enough to matter, bring the number back
before deciding between duplicating the imagesets and a shared/downsampled asset set — that is a product
trade-off, not a dev one.

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
