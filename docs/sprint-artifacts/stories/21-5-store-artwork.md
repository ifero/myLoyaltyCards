---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.5: Store artwork — four unguarded images, and listing text that lives nowhere in this repo

Status: ready-for-dev

Epic: 21 — Cardì Rebrand — Native Identity

> **⛔ THE EPIC'S LAST AC CANNOT BE SATISFIED BY A FILE CHANGE. Verified, not assumed.**
> It says _"Listing text is updated with the name change from 21.1 — title, subtitle, description
> and keywords."_ **There is no `fastlane/metadata/` directory anywhere in this repository, and no
> `eas.json`.** No `title.txt`, `description.txt` or `keywords.txt` exists for any locale. Every
> metadata and image upload path is explicitly **disabled** in the Fastfile:
> `upload_to_app_store(skip_metadata: true, skip_screenshots: true)` and, on both Android lanes,
> `skip_upload_metadata / _changelogs / _images / _screenshots: true`.
>
> Store listing text is maintained **by hand in App Store Connect and Play Console**. That half of
> this story is a console task that CI can never verify and a diff can never show. AC7 handles it
> honestly rather than pretending a file exists.
>
> **⚠️ The Wear OS store screenshots are PLACEHOLDERS FROM A DEBUG BUILD.** Their own README says
> so: captured 2026-08-26 on a round emulator, and `01-card-list.png` shows **debug-seeder
> fixtures** named `Aztec (unsupported)` and `Bad Checksum (invalid)`. They must be regenerated
> regardless of the rebrand — shipping them is shipping test data to a store listing.
>
> **⚠️ Nothing generates or checks `assets/store/`.** Unlike every phone icon, these four files are
> hand-made, referenced by no script, no config and no workflow, and gated by nothing. That is why
> they are three and a half months stale.

## Story

As a prospective user browsing the store,
I want the listing to show Cardì,
so that what I install matches what I was shown.

## Story context

Four artefacts, all committed in one 2026-05-31 commit and untouched since — three and a half
months before the rebrand landed:

| file                                                 | bytes   |
| ---------------------------------------------------- | ------- |
| `assets/store/android-app-icon-512x512.png`          | 82,686  |
| `assets/store/android-app-icon-512x512-alpha.png`    | 41,449  |
| `assets/store/android-store-banner-1024x500.png`     | 167,747 |
| `assets/store/google-developer-banner-4096x2304.jpg` | 365,076 |

Plus the banner's vector source, `assets/images/android-store-banner.svg`, which renders the
**`myLoyaltyCards` wordmark** at line 20 and an `aria-label` at line 1 — so it carries the old name
as _artwork_, which is why it belongs here and not in Story 21.1.

**Not verified:** nobody has visually opened the four rasters. They predate the rebrand and no
commit has touched them, which is strong circumstantial evidence they show the old mark — but
Task 1 looks before it redraws.

## Acceptance Criteria

- **AC1 — `android-app-icon-512x512.png` and its `-alpha` variant carry the Cardì mark.** Prefer
  generating them from `scripts/build-brand-icons.mjs` over redrawing by hand — the `-alpha`
  variant is exactly the RGB/RGBA split the generator already implements (opaque = PNG colour type
  2, transparent = type 6). If they are generated, AC6 follows for free.
- **AC2 — `assets/images/android-store-banner.svg` is updated** with the Cardì mark and the new
  wordmark, including its `aria-label`, and **`android-store-banner-1024x500.png` is redrawn from
  it** so the raster and its source agree.
- **AC3 — `google-developer-banner-4096x2304.jpg` is redrawn.**
- **AC4 — iOS App Store artwork and any screenshots showing the old identity are refreshed.**
- **AC5 — The Wear OS store screenshots under `docs/design/wear-store-screenshots/` are
  regenerated from a RELEASE build with real card data.** The current pair are debug-build
  placeholders showing seeder fixtures; the rebrand is the occasion, not the reason. Keep the
  384 × 384 1:1 ratio (Play's floor for Wear; range 384–3840) and update their README.
- **AC6 — Decide whether `assets/store/` joins `yarn icons:check`, and record the decision.** These
  four files drifted for three and a half months precisely because nothing watches them. If they
  are generated (AC1), gating them is nearly free; if the banners stay hand-drawn, say so and say
  why, so the next person knows it is a choice.
- **AC7 — The listing TEXT is handled as a console task, explicitly.** The PR body carries the
  exact new title, subtitle, description and keywords for both stores, in both locales, ready to
  paste — and states plainly that this repository has no `fastlane/metadata/`, that every
  `skip_upload_*` flag is set in the Fastfile, and therefore that no file change and no CI check
  can prove this was done. **Do not invent a `fastlane/metadata/` tree to satisfy an AC** — that
  would add an unused, unuploaded shadow copy of the real listing.
- **AC8 — Sequenced after Story 21.1** (whose rename supplies the name this artwork and copy must
  carry) **and after Story 21.4** — refinement put AC1 on `scripts/build-brand-icons.mjs`, the same
  file 21.3 and 21.4 extend, so this joins that additive collision and lands last of the three.
- ⚠️ **AC9 — The mark is EMBEDDED, not redrawn.** This is the only story that puts the wordmark
  into an asset by hand, and hand-drawing the glyph is precisely how the accent went wrong fifty
  times before: **`rotate(35)` ✓ (grave) / `rotate(-35)` ✗ (acute)** — a negative rotation lifts
  the right end because SVG's y-axis points down, and merely negating a sheared stroke grows a
  24×9 beam to 30.3, breaking containment. ⚠️ **The mark and the wordmark are different
  artefacts.** For the icon-only mark, embed the **generated**
  `assets/images/cardi-mark.svg` rather than redrawing it. The **wordmark's letter-substituting
  glyph has no generated asset** — it is built by `docs/design/cardi/tools/brand_lockup.py` as a
  `viewBox="0 0 30 100"` fragment carrying `style="vertical-align:-0.30em"`. ⛔ **That anchoring
  has been wrong twice, and `vertical-align` is a CSS property with NO effect inside a standalone
  `.svg`**: copy the lockup markup into `android-store-banner.svg` and the glyph floats 0.30em with
  nothing to catch it. Place it so its `y=70` baseline lands on the text baseline instead.
  ⚠️ Also note `android-store-banner.svg:20` sets `font-family="Avenir Next, SF Pro Display,
Arial"` — the redrawn wordmark needs **Space Grotesk converted to outlines**, or AC3's raster
  render silently falls back to a different typeface. The banner also obeys the system's flat visual
  language: no gradients, no drop shadows, and nothing from the Forbidden list.

## Tasks / Subtasks

- [ ] **Task 1 — Look at the four rasters (AC1–AC3).** Confirm what they actually show before
      redrawing. Record it.
- [ ] **Task 2 — Icons (AC1).** Prefer the generator.
- [ ] **Task 3 — Banners (AC2, AC3).** SVG source first, then its raster.
- [ ] **Task 4 — iOS artwork and screenshots (AC4).**
- [ ] **Task 5 — Wear screenshots (AC5).** Release build, real cards, 384², README updated.
- [ ] **Task 6 — Gating decision (AC6).**
- [ ] **Task 7 — Listing copy (AC7).** Write it out in the PR; do not fabricate files.

## Dev Notes

### Guardrails

- **Do not create `fastlane/metadata/`.** See AC7. An unuploaded shadow copy of the store listing
  is worse than no copy: it looks authoritative and is never read.
- **Do not change the store listing's bundle identifier or package name** — Story 21.1 keeps those
  fixed so the listing keeps its reviews, ratings and install base.
- The four `assets/store/` files are referenced by **no** script, config or workflow — only by
  `docs/epics.md` and the tracker. Changing them breaks nothing and is verified by nothing.
- Ships in the single rebrand release (Story 21.7).

### Testing

There is no automated test for any of this. `yarn format:check` for the SVG. AC1's generator route
would bring `yarn icons:check` with it — that is the argument for taking it.

### References

- [Source: docs/epics.md#Story 21.5: Store Artwork]
- [Source: fastlane/Fastfile] — the `skip_upload_*` flags that make AC7 necessary
- [Source: docs/design/wear-store-screenshots/README.md] — the placeholder provenance

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
