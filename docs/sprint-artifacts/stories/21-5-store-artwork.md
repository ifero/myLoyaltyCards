---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.5: Store artwork — four unguarded images, and listing text that lives nowhere in this repo

Status: review

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

- [x] **Task 1 — Look at the four rasters (AC1–AC3).** Confirm what they actually show before
      redrawing. Record it. — done, and it found two defects nobody had recorded. See
      _Completion Notes_.
- [x] **Task 2 — Icons (AC1).** Prefer the generator. — two rows in
      `scripts/build-brand-icons.mjs`.
- [x] **Task 3 — Banners (AC2, AC3).** SVG source first, then its raster. — both generated from
      one layout; verified against a browser render of the SVG.
- [x] **Task 4 — iOS artwork and screenshots (AC4).** — the App Store marketing icon was already
      correct (verified, see notes); the landing-page placeholder frames were not.
- [ ] **Task 5 — Wear screenshots (AC5).** Release build, real cards, 384², README updated.
      ⛔ **BLOCKED — three verified blockers, README updated with all of them.** Not done, and
      deliberately not faked. See _Completion Notes_ and
      `docs/design/wear-store-screenshots/README.md`.
- [x] **Task 6 — Gating decision (AC6).** — they join `yarn icons:check`; recorded in
      `assets/store/README.md`.
- [x] **Task 7 — Listing copy (AC7).** Write it out in the PR; do not fabricate files. — in the PR
      body and below, measured against each field's real limit. No `fastlane/metadata/` created.

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

Claude Opus 5 (`claude-opus-5`)

### Debug Log References

- `node scripts/build-brand-icons.mjs` — 27 artefacts, 2.2 s
- `node scripts/build-brand-icons.mjs --check` — in sync
- `yarn test` — 194 suites, 2549 tests, all passing
- `yarn lint`, `yarn typecheck`, `yarn format:check` — clean

### Completion Notes List

#### Task 1 — what the four rasters actually showed

Opened, not inferred. The circumstantial case held, and two of them were also **defective** in
ways no commit message or diff would have shown:

| file                                    | what it showed                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `android-app-icon-512x512.png`          | Pre-rebrand blue-gradient wallet (`#1A73E8` → `#0D47A1`). Stale.                                                                           |
| `android-app-icon-512x512-alpha.png`    | The same art with the field REMOVED — a transparent icon. ⚠️ **Out of spec**, see below.                                                   |
| `android-store-banner-1024x500.png`     | `myLoyaltyCards` wordmark **clipped** by the artwork beside it, the whole composition letterboxed inside transparent bands. ⚠️ **Broken.** |
| `google-developer-banner-4096x2304.jpg` | `myLoyaltyCards` on a cream/sage/**terracotta** ground — a third visual language, and terracotta is on the Forbidden list.                 |

#### AC1 — the two Play icons, and a correction to the AC's parenthetical

Generated, as AC1 preferred. The AC suggested the split should be "opaque = colour type 2,
transparent = type 6". **The first half is right and the second is not**, per Google's published
specification, so both files are now opaque and they differ only in colour type:

- _"Format: 32-bit PNG"_ — so `-alpha.png` is the file to upload, and is RGBA.
- _"pick a background colour for your asset … that doesn't include any transparency. Transparent
  assets will display the background colour of Google Play UI."_ — and the mark's stem is
  **white**, so the transparent file this replaces would have put white bars on Play's white
  surface and shown an empty tile.
- _"Shape: Full square — Google Play dynamically handles masking … Shadow: None"_ — so full-bleed
  ink, no rounding, no shadow.

`keepAlpha` in the generator is the one place "has an alpha channel" and "is transparent" are
separated; everywhere else in that file they still coincide, unchanged.

#### AC3 — the developer header is now a PNG, and the file was renamed

`google-developer-banner-4096x2304.jpg` → `.png`. Play accepts _"JPEG or 24-bit PNG (no alpha)"_
for both banner slots, and on flat colour a PNG is both smaller and better: **87 KB against the
old 365 KB**, with no chroma subsampling to ring the wordmark's edges. It also avoids adding a
baseline JPEG encoder to this repo purely to produce a worse image. Nothing referenced the old
filename. The generator deletes the superseded file on build and fails `--check` if it reappears.

#### AC9 — the wordmark, and the two traps it names

- The **mark** is not redrawn: the icons come from the generator's existing geometry.
- The **wordmark's `ì`** is a different artefact, and the AC's pointer to `brand_lockup.py` leads
  to an exploration sheet of six candidates. The locked one is in
  `docs/design/cardi/tools/mark_locked.py`: single 12-unit stem, `LEN_WORD = 24` **contained**
  accent (not the icon's `LEN_MARK = 52`), weight 9, centre y 10.5, `rotate(35)`.
- `vertical-align: -0.30em` was **not** copied in. The AC is right that it does nothing in a
  standalone `.svg`; the fix taken was the one it suggests — everything in `brand-wordmark.mjs`
  is baseline-relative, so there is no floating box to correct.
- **Space Grotesk Bold v2.000 converted to outlines** for `Card`, with the source URL and SHA-256
  recorded in the module. No font file is committed (that is Story 21.6). As a cross-check, the
  extracted metrics reproduce the design system's own em geometry exactly: the drawn `x` is 49.6
  units, `d` reaches 70.0, and `r`'s x-height shoulder lands on `STEM_TOP`.

#### The composition came from a Stitch pass, and Stitch got the accent wrong

The first draft was ink field + centred wordmark + a row of five accent tiles. ifero's read was
that it looked basic, and it was: it never explored anything and it never showed what the app
DOES — a person scrolling Play saw a wordmark and five colour blocks.

A Stitch pass (project `Cardì`, screen `91c9090e3a99460ca0327ca82f0444b9`) produced a better IDEA:
a wallet of accent cards fanned behind one white card carrying a barcode — the checkout moment the
brand is built around, rather than a logo. That idea is what ships.

⚠️ **Its execution could not.** Stitch's own prose said the accent was "tilted high-left to
descending-right"; it drew the opposite — **an acute, `Cardí`** — which is the exact failure the
design system, `mark_locked.py` and AC9 all exist to prevent, and it asserted the fix confidently
in the same breath. It also floated the accent away from its stem, used a substitute typeface, put
a glow on the card, and returned a 2560 × 2048 DESKTOP canvas with the banner letterboxed inside —
the same defect the file it replaces had. `generate_variants` then timed out and wrote nothing, so
there is exactly one Stitch artefact, not four.

This is why `CONTRIBUTING.md` says the repository is the canonical source of design and these tools
are ideation-only. The composition is Stitch's; every number is the generator's, where
`test/store-artwork.test.ts` proves the accent descends **in the pixels**.

⚠️ **The Stitch design system is also stale** (`assets/484682383639656270`): it still carries deep
blue `#0C3C84` as "secondary structure only", which Story 21.2 RETIRED on 2026-09-16, and its
colour block is a Material-generated palette rather than Ink & Beam. Re-uploading it is not this
story's job, but anything generated from it inherits the retired role.

#### AC4 — iOS artwork: nothing to change, verified rather than assumed

`app.json` sets `"icon": "./assets/icon.png"` with **no `ios.icon` override**, so Expo's prebuild
generates the App Store 1024 marketing icon from that file — which `build-brand-icons.mjs` already
generates and `yarn icons:check` already gates. The iOS App Store artwork was therefore already
Cardì. `ios/` is gitignored, so there is no committed copy to update.

There are no App Store screenshots in the repository (`skip_screenshots: true`). The only other
"screenshots" are the GitHub Pages placeholder device frames, which **did** still carry the
pre-rebrand blue `#1A73E8` — Story 21.1's `docs/` sweep covered `index.html`,
`privacy-policy.html`, `help.json` and `style.css` but not that folder. Repainted to ink on cream
(scope agreed with ifero).

#### ⛔ AC5 — NOT DONE. Three blockers, all verified

Written up in full in `docs/design/wear-store-screenshots/README.md`, with the prerequisites for
whoever picks it up.

1. **No release keystore.** `watch-android/app/build.gradle.kts` has no `signingConfig` for
   `release` and says why: the key is @ifero's and is not committed. `assembleRelease` produces an
   unsigned APK that `adb install` refuses.
2. **A release build has no cards.** R8 strips `DebugSampleCards` and `seedSampleCardsIfEmpty`
   behind `BuildConfig.DEBUG`; cards arrive only over the Data Layer from a same-signed paired
   phone, which needs (1).
3. **⚠️ The Wear palette is knowingly stale and Story 23.3 owns it.** `CarbonTheme.kt` marks
   `BrandPrimaryDark = #4DA3FF` (the phone's pre-rebrand dark primary) and
   `FavoriteStarTint = #F59E0B` (an orange "the Cardì system bans by name") as KNOWINGLY STALE,
   left in place because _"moving it needs the emulator pass 23.3 carries"_.
   `23-3-wear-os-implementation` is still `backlog`.

So a capture made today would bake the blue sort chip and the banned orange star into a store
listing that 23.3 invalidates — and would replace an asset that announces itself as a placeholder
with one that looks finished. **21.5 should not be counted as closing AC5.**

#### Corrections to the story's own notes

- The Testing section says "`yarn format:check` for the SVG". **Prettier has no `.svg` parser** —
  `prettier --check` on one errors with "No parser could be inferred" and `prettier --check .`
  skips it silently. SVG output format is therefore unconstrained, and `test/store-artwork.test.ts`
  is what actually reads the file.
- The story context says the SVG "renders the `myLoyaltyCards` wordmark at line 20". Correct, and
  it also carried a `linearGradient` ×2 and an `feDropShadow` — three Forbidden-list items — which
  is a stronger reason to regenerate it than the name alone.

#### Follow-ups found, not fixed

- **`docs/style.css` is still on the pre-rebrand palette**: `--color-primary: #1a73e8`,
  `--color-accent: #16a34a`, dark `#4da3ff`. Story 21.1 edited the file for the brand mark but did
  not migrate its palette, and no story owns doing so. The public GitHub Pages site therefore still
  renders blue chrome during a rebrand release.
- **Story 23.3 now also owns the Wear store screenshots**, per AC5 above.
- ⛔ **`TOUCH_TARGET` still contradicts the adjudication, and is NOT fixed here.** This document
  and its frontmatter both say **48**; `tokens/spacing.json` still carries `TOUCH_TARGET.min` at
  **44** and `TOUCH_TARGET.watch` at **32**. The design system adjudicated 48 on 2026-08-21 on two
  grounds — `app.json` declares both platforms, so a minimum binding on both is the MAX of their
  minimums (Apple 44, Material 48), and 44 is off the 8px grid. Moving the token is a behavioural
  change to every touch target in three apps and it belongs to **Story 22.1**, which owns that
  file. A store-artwork story is the wrong place for it.
- ⛔ **The app's own "no analytics" claim is not true, and the privacy policy does not disclose
  Sentry.** Found while writing AC7's copy, and it changed that copy.
  `core/observability/sentry.ts:95-101` initialises Sentry with `enabled: !__DEV__` and
  `tracesSampleRate: 0.2`, so every production build sends scrubbed crash reports and samples a
  fifth of sessions for performance traces. `assets/legal/privacy-policy.ts:52-55` says
  _"We do not collect: … Analytics or tracking data"_, and its Data Sharing section (`:75-76`)
  names **only Supabase** as a processor. `docs/index.html` repeats the claim as
  _"No tracking, no analytics."_
  ⚠️ **And the scrubbing is narrower than it looks**, which is why the copy says nothing about it.
  `scrubEvent` deletes `user` and `request` and redacts by KEY inside `extra` and `contexts` — it
  never inspects `event.exception` or `event.breadcrumbs`. `logger.ts:33-41` synthesises
  `new Error(context.map(String).join(' '))` whenever no `Error` is passed, so raw interpolated
  text lands in the message field the scrubber never reads; `cloud-sync.ts:130`, `:585`, `:604`,
  `:629` and `useSyncUpload.ts:41` all interpolate upstream error text or a row id today. No call
  site was found putting a card number or barcode there, and there is **no ad SDK and no
  IDFA/GAID anywhere** in the project — so the listing copy keeps only what is unimpeachable,
  _"No ads, and no advertising identifiers"_, and makes no claim about telemetry at all.

  ⚠️ **The policy itself and the landing page still need correcting**, and so do the App Privacy
  questionnaire and the Play Data safety form, both of which require third-party crash and
  performance data to be declared. A legal document and a console task, so it is @ifero's call
  and not this story's to make.

#### ⛔ THE APP HAS NEVER BEEN PUBLICLY RELEASED, and the first draft of the copy assumed it had

Raised by ifero 2026-09-25, and corroborated before acting: `docs/index.html` renders **"Coming
soon on the App Store"** and **"Coming soon on Google Play"** in both locales. This is a LAUNCH
listing, not an update.

The Promotional Text originally read _"New name, same wallet: myLoyaltyCards is now Cardì"_ in
English and its Italian twin. That announces a rename to users who do not exist, and leads a
first-time browser with a name they have never seen — the one thing a promotional field must not
do. Both now lead with the strongest differentiator instead: the watch app holding cards on its
own. The error was contained to those two fields; nothing else in the copy referenced the old name
or implied an existing install base.

⚠️ **The same premise appears in this story's own Dev Notes**, carried over from Story 21.1: _"the
listing keeps its reviews, ratings and install base"_. With no public release there are none. The
guardrail's CONCLUSION still holds — do not change the bundle identifier or package name, because
it binds an internal-testing listing and the same-signed Data Layer pairing — but its stated reason
is wrong. Left as written here because **Story 21.1 owns that sentence**; correcting it there is the
right place.

#### AC7 — the listing copy (a record of the console task, not a source)

Reproduced in the PR body. ⛔ **This repository has no `fastlane/metadata/` and no `eas.json`**,
and `fastlane/Fastfile` sets `skip_metadata` + `skip_screenshots` on iOS (L221-222) and
`skip_upload_metadata` / `_changelogs` / `_images` / `_screenshots` on both Android lanes
(L573-576, L714-717). **No file change and no CI check can prove the listing text was updated.**
None was invented. Every field was measured against its real limit and every string is NFC, which
matters here: `Cardì` in NFD is a different byte sequence and the consoles will take it silently.

### Post-PR additions (2026-09-24, at ifero's request)

Two contradictions found while shipping this story, fixed in the same PR:

- **`.gitignore` now ignores `.claude/launch.json`.** The Claude Code browser-preview pane writes
  that file, `.gitignore` covered `settings.local.json` and `worktrees/` but not this one, and
  prettier reads `.gitignore` — so `format:check` in `.husky/pre-push` **failed on an untracked
  file nobody had edited**, which is a confusing way to be blocked and invites the forbidden
  `--no-verify`. Observed on this story's own first push attempt.
- **`cardi-design-system.md`'s frontmatter said `screen-margin: 20px`** while its own prose
  adjudicated _"Margin is 24, not 20"_ on 2026-08-21 and `LAYOUT.screenHorizontalMargin` in
  `tokens/spacing.json` has been 24 all along. The ruling had never been applied to the block it
  ruled on, and line 101 was the last place in the repo still saying 20. Nothing parses that
  frontmatter — every reference to this file across `scripts/` and `docs/design/cardi/tools/` is a
  prose citation in a comment, verified — so the correction changes no generated output.

The touch-target half of the same adjudication is deliberately left alone; see _Follow-ups_.

### File List

Generator and its libraries

- `scripts/build-brand-icons.mjs` — MODIFIED: the two Play icons, the banner section, `encodePng`
  generalised to non-square, superseded-file removal
- `scripts/lib/path-raster.mjs` — NEW: dependency-free analytic fill rasteriser
- `scripts/lib/path-raster.test.js` — NEW: 16 cases, asserted on exact area
- `scripts/lib/brand-wordmark.mjs` — NEW: Space Grotesk Bold outlines + the wordmark layout

Artwork

- `assets/images/android-store-banner.svg` — REGENERATED
- `assets/store/android-app-icon-512x512.png` — REGENERATED (24-bit)
- `assets/store/android-app-icon-512x512-alpha.png` — REGENERATED (32-bit, opaque)
- `assets/store/android-store-banner-1024x500.png` — REGENERATED
- `assets/store/google-developer-banner-4096x2304.png` — NEW (replaces the `.jpg`)
- `assets/store/google-developer-banner-4096x2304.jpg` — DELETED
- `docs/assets/screenshots/{home-card-list,barcode-display,watch-card-list}{,-it}.svg` — REPAINTED

Tests

- `test/store-artwork.test.ts` — NEW: 17 cases against Play's published specification and the
  brand's rules
- `test/png-scanlines.ts` — MODIFIED: `size` → `width`/`height`, for non-square images
- `test/png-scanlines.test.ts` — MODIFIED: non-square fixture and case
- `test/watch-icons.test.ts`, `test/wear-icons.test.ts` — MODIFIED: one destructure each

Documentation

- `assets/store/README.md` — NEW: the AC6 decision, the upload guidance, the console-task note
- `docs/design/wear-store-screenshots/README.md` — REWRITTEN: the three AC5 blockers
- `docs/assets/screenshots/README.md` — MODIFIED: the palette note and the `style.css` finding
- `docs/sprint-artifacts/stories/21-5-store-artwork.md` — this file
- `docs/sprint-artifacts/sprint-status.yaml` — status
- `.gitignore` — MODIFIED: ignore `.claude/launch.json` (post-PR)
- `docs/design/cardi/cardi-design-system.md` — MODIFIED: frontmatter `screen-margin` 20px → 24px,
  matching its own adjudication and the live token (post-PR)

### Change Log

| date       | note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-21 | Implemented AC1–AC4 and AC6–AC9. AC5 blocked on three verified prerequisites and documented rather than faked. `assets/store/` now generated, gated by `yarn icons:check`, and tested.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-21 | Code review round 1 (7 findings, none blocking, all fixed): the curve-flattening bound dropped the factor of 2 in the second derivative, so every curve came out √2 too coarse and quietly missed the tolerance the module advertises; the accent's rotated extent used the sharp-rectangle form when `rx` makes the shape a STADIUM, overstating it by 1.8 units and pushing the wordmark slightly off centre; three comments stated things that were not true (the worst-case segment count, the tracking's provenance, the exactness of the extent); one assertion was vacuous (`expect.any(Number)`); a swallowed `readFileSync` stood in for `existsSync`; and the grave test partitioned in O(n²). Round 2: APPROVED, zero findings.                                                                                                                                                               |
| 2026-09-25 | Promotional Text rewritten for both locales after ifero pointed out the app has **never been publicly released** — the draft announced the rename to an install base that does not exist. Corroborated against `docs/index.html` ("Coming soon" in both locales) before changing anything. Contained to those two fields. Also flags that Story 21.1's "keeps its reviews, ratings and install base" premise is false, though its conclusion stands.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-09-24 | Two contradictions found while shipping, fixed in the same PR at ifero's request: `.gitignore` now ignores `.claude/launch.json` (prettier walked it and failed `format:check` in pre-push on an untracked file nobody edited), and `cardi-design-system.md`'s frontmatter `screen-margin` goes 20px → 24px, matching its own 2026-08-21 adjudication and the live token. The touch-target half is left to Story 22.1, which owns that token.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-09-22 | Composition reworked after ifero's review ("this looks pretty basic"). Five flat accent tiles become a fanned WALLET — three accent cards behind one white card carrying a barcode — so the graphic shows the checkout moment rather than a logo. Idea from a Stitch pass; execution rejected (it drew an ACUTE accent). New test: nothing may overlay the barcode, swept over the bars' own region rather than the card's rect, because the card's rounded corners legitimately show the fan through them.                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-21 | QA gate rounds 1-2 (3 findings, 2 of them BLOCKING, all fixed): the listing copy repeated the app's own _"No tracking. No analytics."_ into four store fields, which `sentry.ts:95-101` contradicts — Sentry runs in production at a 0.2 trace sample rate and the privacy policy names only Supabase as a processor; then the replacement claim, _"crash reports are stripped of personal data"_, turned out to overstate `scrubEvent`, which redacts by KEY inside `extra`/`contexts` and never inspects `event.exception` or `event.breadcrumbs` while `logger.ts:33-41` synthesises that very message from raw interpolated args. The copy now makes **no telemetry claim at all** and keeps only what is exhaustively verifiable — no ad SDK and no IDFA/GAID exist anywhere in the project. Third finding: a byte count that went stale mid-review (86 → 87 KB). Round 3: APPROVED, zero findings. |
