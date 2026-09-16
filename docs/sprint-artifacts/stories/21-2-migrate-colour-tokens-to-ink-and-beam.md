---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.2: Migrate the colour tokens to Ink & Beam — the big bang, and the four literals that will not come with it

Status: done

Epic: 21 — Cardì Rebrand — Native Identity

> **⭐ THIS IS THE KEYSTONE OF THE WHOLE REDESIGN, not just of this sprint.** Epic 22 depends on
> it: Story 22.8's ACs defer to "the size policy decided in 21.2", and 22.1's primitives are
> specified as _tonal layers and hairline outlines_, which are palette-derived. Nothing in Epic 22
> can start until this lands.
>
> **⚠️ THE EPIC'S SCOPE NUMBERS ARE WRONG IN THREE PLACES — corrected here, measured at the
> baseline.** (1) The catalogue holds **57 brands with 44 distinct colours** — 45 distinct literal
> strings, because the file carries a case-inconsistent duplicate (`#ffffff` ×5 vs `#FFFFFF` ×4) — not
> "~45 brands".
> (2) Sub-15px font sizes are **80 literal instances across 40 files**, not 70 — the file count is
> right, the instance count is not; and there are **25 further indirect usages** through
> `TYPOGRAPHY.footnote/caption1/caption2` that a literal sweep does not find. (3) The "nine known
> styling items" are **not enumerated anywhere in the repository** — see "The nine items problem".
>
> **⚠️ `shared/theme/sync-tokens.ts` IS A BLIND SPOT THE EPIC DOES NOT MENTION.** It is a third,
> hand-authored token family (13 `{light, dark}` hex pairs from Figma, not in `tokens/`) carrying
> `errorAccent #FF5B30`, `offlineText #EF9500`, `keepBothTint #34C759`. The design system bans
> orange outright. Decide its fate in this story or it silently survives the migration.
>
> **⚠️ CHANGING `theme.warning` REPAINTS EVERY FAVOURITED CARD TILE.** `theme.warning` is the
> **favourite star** (`CardTile.tsx:226`, `CardDetailScreen.tsx:232`) as well as a warning colour.
> That is a semantic mismatch the design system has already ruled on — read "The favourite star".

## Story

As a user,
I want the app I open to look like the icon I tapped,
so that the identity is not a promise the first screen breaks.

## Context

Story 20.4 added `IDENTITY_COLORS` — ink `#181824`, beam `#FCCC0C`, cream `#F0F0E8` — to
`tokens/color.json` **additively**, so the icon work could land without recolouring the app. The
token file says so itself at `tokens/color.json:18`: _"NOT the app's UI palette yet — the colour
migration is a separate big-bang change."_

So today the app has **two parallel truths**: a Cardì icon and launch field driven by
`IDENTITY_COLORS`, and a Google-Blue UI driven by `PRIMARY_COLORS` (`#1A73E8` ramp). This story
collapses them into one. That `$description` is part of the deliverable — it must be rewritten,
not left describing a migration that has happened.

### The pipeline (verified)

`tokens/color.json` → `style-dictionary.config.mjs` → `scripts/token-format.mjs` →
`shared/theme/tokens.generated.ts`. Run with `yarn tokens:build`; `yarn tokens:check` diffs.

`SOURCE_FILES` at `style-dictionary.config.mjs:21` is an **explicit two-element array**, not a
glob, deliberately, so generated ordering is deterministic. There is **no `transformGroup`** —
values pass through verbatim and are byte-stable.

**Three drift gates will fire on this change, all of them correctly:**

1. `yarn tokens:check` — `ci-quality-gates.yml:89-90` and `.husky/pre-push`.
2. `shared/theme/tokens.generated.test.ts` — hard-codes **every** primitive value and `toEqual`s
   it (the blue ramp at lines 23-36, both theme groups at 63-103). **It must be updated in this
   same change.** Note it does _not_ currently assert `IDENTITY_COLORS`; it should after this.
3. `shared/theme/colors.contrast.test.ts` — the WCAG gate. Six assertions, listed below.

`tokens/**` is in `.github/build-path-filters.json`, so this triggers both native release builds.

### What `colors.contrast.test.ts` actually asserts

Six assertions, all of which the target palette satisfies by arithmetic:

| #   | pair                                            | threshold |
| --- | ----------------------------------------------- | --------- |
| 1-2 | `textPrimary` on `background`, light and dark   | ≥ 4.5     |
| 3-4 | `textSecondary` on `background`, light and dark | ≥ 4.5     |
| 5-6 | `primary` on `background`, light and dark       | ≥ 3       |

Target light `primary` is ink on cream and target dark `primary` is beam on black — both very high
contrast, so 5 and 6 are safe. **The genuine risk is not covered by any existing assertion:** beam
`#FCCC0C` used as a _background_. `cardi-design-system.md:190-192` requires _"Always pair with ink
text (`#181824`), never white"_, and no test enforces it. AC6 adds one.

### The four literals that will not come with the migration

These are hardcoded hexes outside the token system. The migration will not touch them, and they
will drift from the new palette unless this story handles them:

- **`shared/theme/luminance.ts:31`** — `getLuminance(bg) < 0.5 ? '#FFFFFF' : '#1F1F24'`. `#1F1F24`
  is the _old_ `textPrimary`; under Ink & Beam it should be ink `#181824`. It has **four** consumers:
  `CardDetailScreen.tsx:189`, `CardSetupScreen.tsx:60` and `BrandPill.tsx:28` apply it to **brand**
  colours, and `BrandHero.tsx:56` applies it to the **card palette** for custom cards — the very
  values Story 21.2a remaps, one of which is beam. So it is the text colour on brand _and_ card-accent
  surfaces. `luminance.test.ts:49-51,61`
  hardcodes `'#1F1F24'` in four assertions and will fail.
- **`CardTile.tsx:145` and `CardShell.tsx:33`** — `isBlackBrand ? '#FFFFFF' : '#1F1F24'`, the same
  stale value, duplicated.
- **`CardTile.tsx:124`** — `rgba(76, 175, 80, …)`, Material Green 500, in no palette at all.
- **`colors.ts:83-86`** — `BARCODE_FLASH` is hardcoded `#FFFFFF` / `#000000`. This one is
  **correct and must stay**: the barcode screen ignores dark mode by design.

### The favourite star

`theme.warning` has two unrelated jobs. As a warning it is used in `ImportErrorSheet` (×4),
`NoCodeFoundBanner:91` and `PasswordStrengthIndicator:55` (the "fair" tier). As a **favourite
star** it is used in `CardTile.tsx:226` and `CardDetailScreen.tsx:232`.

`docs/design/cardi/README.md:549-552` has already ruled: the shipped amber star on a 95%-white
plate _"is illegal in this system (amber is not in it) and invisible on light brands"_, and the
decision is **an ink `#181824` plate carrying a beam `#FCCC0C` star**. The plate is
`CardTile.tsx:247-260` (`rgba(255,255,255,0.95)` at line 257).

### Alpha by string concatenation — a trap

Sites that build a colour by appending hex alpha to a token — **verified by grep, and wider than
it looks**:

- `ImportErrorSheet.tsx:53` — `theme.warning + '1A'` and `theme.primary + '14'`
- `SortFilterRow.tsx:107` — `theme.primary + '14'`
- **`shared/components/ui/Button.tsx:35` and `:44`** — `theme.primary + '14'`, the pressed colour of
  a **shared primitive** Story 22.1 also rewrites
- `CatalogueGrid.tsx:53,64` — `brand.color + '15'` / `+ '30'`
- Three more hide behind a local `withAlpha(hex, alpha)` helper that no `+ '1A'` grep finds:
  `ModeOptionCard.tsx`, `FannedCardIllustration.tsx`, `BrandedIcon.tsx`
- ⚠️ And a fourth hiding style at `features/auth/MigrationBanner.tsx:21,47-49`: a named constant
  (`THEME_OPACITY_SUFFIX = '1A'`) applied to `theme.error` and `theme.primary` through a template
  literal — invisible to **both** a `+ '1A'` grep and a `withAlpha` grep

**If the new palette introduces any 8-digit hex or an `rgba()` string, every one of these silently
produces an invalid colour.** Keep all token values as 6-digit hex, or convert these sites.

### The nine items problem

The epic says _"The nine known styling items are folded in here"_. They are **not enumerated
anywhere** — the phrase appears only in `epics.md`, the tracker, and story 16-33. Six are
identifiable: `theme.warning` (5 files), `theme.success` (a green not in the palette), the sub-15px
body text, `CardForm`'s literal 32, literal 24s written as numbers, and `#1F1F24` in
`luminance.ts`. **AC10 requires the list be written down or the count dropped** — do not carry a
number nobody can check.

## Acceptance Criteria

- **AC1 — `PRIMARY_COLORS` stops being the Google Blue ramp.** The Cardì palette flows
  `tokens/color.json` → Style Dictionary → `tokens.generated.ts` → Unistyles. `tokens.generated.ts`
  is regenerated with `yarn tokens:build` and committed; it is **never hand-edited**.
- **AC2 — `IDENTITY_COLORS` is reconciled, not left as a parallel truth.** Either it merges into
  the migrated palette or it remains as the canonical brand triple with every theme colour derived
  from it — decided explicitly, with the `$description` at `tokens/color.json:18` rewritten so it
  no longer says the migration is pending. Its three consumers
  (`AppIconHeader.tsx`, `BrandedIcon.tsx`, `launch/constants.ts`) still resolve; note the first two
  import from `tokens.generated` **directly**, bypassing `colors.ts`.
- **AC3 — This lands in ONE change.** Tokens funnel into all three apps; there is no supported
  half-migrated state. No screen-by-screen rollout.
- **AC4 — Light and dark are both verified on device**: ink structure on cream in light, beam
  actions on true black in dark.
- **AC5 — All six existing assertions in `colors.contrast.test.ts` still pass**, unchanged. If any
  needs its threshold moved, that is a palette bug, not a test bug.
- **AC6 — A new assertion enforces the beam rule**: any text placed on beam `#FCCC0C` meets AA
  against ink, and white-on-beam is proven failing so the test has teeth.
- **AC7 — No branded tile is tinted, washed or recoloured.** The 44 distinct brand colours across
  57 catalogue brands are **content**. Verified by reading the paths, not assumed: `CardTile.tsx:139`,
  `BrandHero.tsx:51-52`, `BrandPill.tsx:32`, `BrandRow.tsx:35`, `CardSetupScreen.tsx:63`,
  `CatalogueGrid.tsx:53,64,71` all apply `brand.color` verbatim with no token interposed. The one
  one change at `CardDetailScreen.tsx:188` — the fallback to `theme.primary` for cards with **no**
  brand — is ⚠️ **a DEFECT to fix here, not a pass-through to bless.** That line paints the header
  `theme.primary` while `BrandHero.tsx:50-52` paints the band directly beneath it
  `CARD_COLORS[card.color]`. The card-detail spec (`stitch-prompts-card-detail.txt`, prompt D)
  requires the inset, header and hero to be **one filled region** in the card's own accent —
  "three separately filled boxes leave visible hairlines where they meet". After this migration
  `theme.primary` is **ink**, so a custom card gets a near-black header above a coloured hero.
  ⛔ **This requires an explicit design-system amendment, because the Forbidden list prohibits it
  as written.** `cardi-design-system.md:214` says card accents are "never used for buttons, links,
  chrome, headers, icons or any interactive element", and Forbidden carries "card accent colours
  used as chrome" — while the card-detail header IS chrome (56px, back chevron, favourite star).
  This story already cites that rule in AC9 to block `theme.success` from `#0C843C`, so AC7 and AC9
  contradict each other unless the text is amended: **a card accent is legal as the card's own
  full-bleed detail field, and illegal everywhere else.** ⚠️ **That amendment must RULE ON a
  conflict, not pick a side.** The same document assigns one accent to chrome by name — "**Deep blue
  `#0C3C84`** — secondary structure only (barcode-modal chrome, informational emphasis)" — and the
  frontmatter carries it as `secondary` / `secondary-container` / `on-secondary-container`, while two
  prompts reason from that role as live. Either exempt deep blue's named secondary role (and say
  `#0C843C` is bound by the same logic, which AC9 relies on) or retire the role explicitly and strike
  it from the prose **and** the frontmatter in one edit. The barcode section independently forbids
  saturated barcode-modal chrome, so the deep-blue role is contradicted twice over.
  Amend it here alongside the favourite-plate line, and add it to Story 22.1's AC11 contradiction sweep.
  `headerBg` for a brandless card becomes `CARD_COLORS[card.color] ?? CARD_COLORS.grey` — the value shipping at 21.2, matching
  `BrandHero.tsx:52`; **Story 21.2a's AC4 re-points all five sites** to its named default one wave
  later —
  **keep the `??` guard**, or it does not in fact match `BrandHero` (which has one) and a card with
  an unmapped colour renders **transparent** rather than recoloured.
- **AC8 — The four drifting literals are resolved**: `luminance.ts:31` and its four test
  assertions, the duplicated `#1F1F24` in `CardTile.tsx:145` / `CardShell.tsx:33`, and the Material
  green at `CardTile.tsx:124`. `BARCODE_FLASH` is **deliberately left hardcoded** and the PR says so.
- **AC9 — The favourite star stops borrowing `theme.warning`, and the two surfaces get DIFFERENT
  treatments.** On the **tile**: an ink `#181824` plate carrying a beam `#FCCC0C` star, per the
  recorded decision. ⚠️ **Only the COLOURS change — the geometry is already correct and frozen.**
  `gridLayout.ts` ships `BADGE_SIZE = 24` and `BADGE_INSET = 6`, and the star is already `size={16}`
  (`CardTile.tsx:226`), so the only gap against the wallet prompt's "24px circle, 16px star, inset
  8px" is the inset. **Do not move it**: `BADGE_INSET` lives in `gridLayout.ts`, which Story 16.33's
  AC4 and Story 22.1 both declare untouched **for badge and tile GEOMETRY** (that file also holds
  one font size, which 21.6 AC8b owns), and 6→8 recomputes `BADGE_KEEP_OUT` from 68 to 72 and
  turns `gridLayout.test.ts:343` and `:348` red. The edit is two colours:
  `CardTile.tsx:257` `rgba(255,255,255,0.95)` → ink `#181824`, and `:226` `theme.warning` → beam.
  Correct the now-false rationale comment at `gridLayout.ts:180-185` ("near-opaque white plate",
  "amber glyph") in the same commit. The plate exists because the
  tile sits on 44 brand colours. ⚠️ On the **card
  detail header**: there is no plate today and none is added. The spec wants a bare filled beam
  star ("that star is the only yellow on the screen") inside the single unbroken accent field AC7
  restores, with an outline star in the header's text colour when not favourited. A plate there
  breaks the one-filled-region rule AC7 exists to fix. ⚠️ Decide the unresolved case: a favourited
  card whose brand is Esselunga `#FFCC00`, three points from beam — and ⚠️ **A collision Story 21.2a creates, one wave later**: its AC2 makes beam `#FCCC0C` a user-pickable card accent, so a favourited custom card set to yellow would render a beam star on a beam field, invisible. It cannot be exercised in this story's release (beam is not an accent yet); **21.2a's AC9 device pass verifies it**. ⚠️ **Two design documents disagree, and one must
  be amended in this story:** `docs/design/cardi/README.md` records the ink+beam decision, but the
  canonical `cardi-design-system.md` still specifies "a small star on an **opaque white plate**".
  Story 22.1 rewrites `CardTile.tsx` citing `cardi-design-system.md` as its authority, so leaving
  the canonical text unamended brings the white plate straight back. ⚠️ **`link` and `info` also survive AC1 with no decision, and must not.** Both are the retired
  Google-Blue ramp (`#1A73E8` light / `#4DA3FF` dark) and render today in `AuthLink.tsx:42`,
  `SignInScreen.tsx:168`, `VerifyEmailScreen.tsx:506`, `WelcomeScreen.tsx:98`,
  `ModeSelectionScreen.tsx:140`, `FeatureHighlightsScreen.tsx:197` and
  `ImportErrorSheet.tsx:34,63,69`. The frames already ruled on `link`: "`theme.link` IS NOT IN THE
  DESIGN SYSTEM … these frames use **ink `#181824`**, underlined only where the link sits inside
  prose" (`stitch-prompts-auth.txt:97`, `stitch-prompts-onboarding.txt:88-89`). Take that ruling,
  decide `info`, and add `link` to Story 22.1's AC11 transcription list — the design system has no
  link colour today. `theme.success` gets a real palette colour or a
  recorded decision — the current `#16A34A`/`#22C55E` greens are in no palette, and the system's
  only green (`#0C843C`) is a **card accent** explicitly forbidden for chrome.
- 📌 **AC9b — MOVED to Story 21.2a on 2026-09-15.** `CARD_COLORS`, the `CardColor` union, the
  `mapHexToCardColor` re-derivation, the four `?? grey` fallbacks, the two pickers, the colour
  labels and the phone→watch wire contract are now that story's scope. It is `wave_1b`, immediately
  after this one, and shares `tokens/color.json` — so **this story's edit lands first and 21.2a
  builds on it**. ⚠️ This story still consumes `CARD_COLORS` in AC7 (the brandless detail header)
  and AC9 (the tile badge), but changes none of its values.

- **AC10 — The styling items are enumerated in the PR body, or the count is dropped.** A number
  nobody can check is worse than a list.
- **AC11 — `sync-tokens.ts` gets a decision, recorded.** ⛔ **"Keep it" is NOT available for the
  banned hues.** `errorAccent`/`conflictAccent` `#FF5B30` (coral) and `offlineText` `#EF9500`
  (orange) are shipping, user-visible values — rendered by `SyncErrorBanner.tsx:34`,
  `ConflictComparisonCard.tsx:36` and `OfflineIndicator.tsx:36` — and the system bans coral and
  orange **entirely**, so no justification exists to write. Migrate them or move them into the
  pipeline. The recorded-decision latitude applies only to the **non-banned** pairs (e.g.
  `keepBothTint #34C759`). Story 23.1 AC7 applies the identical rule on the watch. Not silence.
- **AC12 — All token values stay 6-digit hex**, or every alpha-concatenation site listed above is
  converted to a real alpha API.
- **AC13 — `tokens.generated.test.ts` is updated** to the new values and gains `IDENTITY_COLORS`
  coverage. `yarn tokens:check` is green.
- **AC14 — The sub-15px body-text policy is DECIDED, not swept.** The design system mandates a
  15px minimum body size. There are 80 literal instances across 40 files plus 25 indirect.
  ⚠️ **The deliverable is a floor PLUS a named sub-floor tier, not a blanket raise** — and the
  evidence lives in Story 21.6's AC5, three waves later, so read it before deciding. The 15px floor
  bounds **body copy**; six of the nine prompt patterns deliberately ship a sentence-case chrome
  tier below it (field errors Inter 13, document meta Inter 12, tile card names Inter 13, "Tap
  anywhere to close" Inter 14). A decision raising all 80 contradicts the drawn frames. **The
  decision is this story's deliverable; the EDIT belongs to Story 21.6**, which re-derives the
  scale and is the only story touching the 25 indirect token reads. That ownership is settled here
  rather than deferred to refinement — 21.6 carries the matching AC, and Sprint 21's Story 22.8
  depends on the answer existing.

## Tasks / Subtasks

- [x] **Task 1 — Decide the palette mapping (AC1, AC2).** Every key in `LIGHT_THEME_COLORS` and
      `DARK_THEME_COLORS` gets a target value; `success`/`warning` get real decisions (AC9).
- [x] **Task 2 — Edit `tokens/color.json`, run `yarn tokens:build`, commit the generated file.**
- [x] **Task 3 — Update `tokens.generated.test.ts` (AC13).**
- [x] **Task 4 — Contrast (AC5, AC6).** Re-run the gate; add the beam assertion.
- [x] **Task 5 — The literals (AC8).** `luminance.ts` + 4 test assertions, two `#1F1F24`
      duplicates, the Material green.
- [x] **Task 6 — The favourite star (AC9).** Ink plate + beam star on the tile
      (`CardTile.tsx:226,247-260`); bare beam/outline star and NO plate in the header
      (`CardDetailScreen.tsx:232`).
- [x] **Task 7 — `sync-tokens.ts` decision (AC11).**
- [x] **Task 8 — Brand-tile audit (AC7).** Walk all eight call sites; screenshot the grid before
      and after and show the brand colours are identical.
- [x] **Task 9 — Sub-15px policy (AC14, AC10).** Decide; enumerate the styling items.
- [x] **Task 10 — Device verification (AC4).** Light and dark, both platforms.

## Dev Notes

### Guardrails

- **Never hand-edit `shared/theme/tokens.generated.ts`.** Three gates will catch you.
- ⛔ **`cardi-design-system.md` has THREE writers this sprint** — Story 23.1 (the frame rule and
  the Forbidden list), this story (the favourite-badge plate, AC9) and Story 22.1 (the component
  specs, AC11). **23.1 lands FIRST** (it is `wave_0`): it rewrites the document's top-level rules,
  and inserting content into a document whose structure is being rewritten is the expensive order.
  Take AC9's amendment onto 23.1's output, not onto the version on `main` today.
- **Two theme shapes exist, deliberately** (`ThemeProvider.tsx:99-108`): the React-context shape is
  flat (`theme.warning`), the Unistyles shape is nested (`theme.colors.warning`). Only three
  production sites use the Unistyles path — ⚠️ it is **13 reads across 2 files**
  (`TextField.tsx` ×9, `app/_layout.tsx` ×4) spanning `error`, `primary`, `border`, `textTertiary`,
  `backgroundSubtle`, `surfaceElevated`, `textPrimary`, `background` and `textSecondary`. Note
  `app/_layout.tsx:582,590` is the **root background**, the surface AC4 verifies in both schemes.
  Do not "unify" the two shapes here.
- **`SEMANTIC_COLORS` (`colors.ts:73-78`) is derived from `LIGHT_THEME` only** and comments that
  the values are "same in both themes" — which is **false** today. It has zero production
  consumers. Delete it or fix it; do not migrate a lie.
- ⚠️ **This story turns two `CarbonTheme.kt` comments into false assurances, and no other story
  owns them.** `:18` calls the favourite tint "the phone's `theme.warning` on dark (`#F59E0B`)" and
  `:22` calls `BrandPrimaryDark #4DA3FF` "phone dark-theme `primary`" — AC1 repaints both referents.
  21-3 touches only the two watchOS colorsets and 23-1 writes no Kotlin, so either correct them here
  (the in-commit correction AC9 already demands for `gridLayout.ts:180-185`, and 21-4's AC2 for
  `colors.xml`) or state that they are knowingly left stale until 23.3.
- **Watch accent colours are NOT wired to this pipeline.** Neither watch generator consumes
  `tokens/color.json`. Story 21.3 owns them.
- Ships in the single rebrand release (Story 21.7). Do not release alone.

### Testing

`yarn tokens:check`, `yarn test`, `yarn format:check`. Expect churn in `tokens.generated.test.ts`
and `luminance.test.ts` — plus `shared/components/ui/stories.test.tsx:105` and `:124`, which assert
the Storybook canvas background is literally `'#FFFFFF'`. `.storybook/StoryDecorator.tsx` paints
that canvas `theme.background`, and AC4 moves the light ground to cream `#F0F0E8` (white is reserved
for cards), so **both fail on the base migration with no key rename involved**. (`:106` and `:131`
stay green: dark `background` is already `#000000`.) Everything else that touches real tokens
compares token-to-token and survives. The seven-file key-rename churn list moved to Story 21.2a with the rest of `CARD_COLORS`.

### Previous story intelligence

- **20.1** fixed the thesis: **the content is the colour**. Chrome stays quiet so ~45 brand colours
  can be loud. Playfulness is a _layout_ decision, never a palette one. It also records two traps
  worth re-reading: Material's tonal engine turns beam into **brown** unless forbidden, and
  **Esselunga is `#FFCC00`**, three points from beam — so no large yellow chrome surface may sit
  near the grid.
- **20.4** wired `IDENTITY_COLORS` additively and pinned `app.json`'s splash `backgroundColor` to
  `LAUNCH_FIELD_COLOR` (`#181824`). Those must stay identical — when they disagreed, device
  testing measured ~1.75 s of white before black content on every cold start.
- **16.33** already settled two grid questions: screen margin stays 24, touch target goes to 48.
  Do not reopen either here.

### References

- [Source: docs/epics.md#Story 21.2: Migrate the Colour Tokens to Ink & Beam]
- [Source: docs/design/cardi/cardi-design-system.md] — palette, the beam rule, the Forbidden list
- [Source: docs/design/cardi/README.md#549-552] — the favourite-badge colour decision
- [Source: docs/design/cardi/stitch-prompts-wallet.txt#116-118] — the favourite-badge geometry
- [Source: docs/design/cardi/stitch-prompts-card-detail.txt#435-439] — the one-filled-region rule
- [Source: docs/sprint-artifacts/stories/20-1-cardi-design-system.md] — the thesis and the traps

## Dev Agent Record

### Agent Model Used

claude-opus-5 (Amelia, `bmad-dev-story`)

### Debug Log References

- `yarn tokens:build` / `yarn tokens:check` — generated file regenerated and in sync.
- `yarn jest` — 183 suites, **2329 tests**, all passing (baseline was 2271; this change adds 58).
- `yarn lint`, `yarn typecheck`, `yarn format:check` — clean.
- `yarn icons:check`, `yarn frames:check`, `yarn wear:catalogue:check`,
  `yarn check:no-tests-folders`, `yarn check:build-path-filters`,
  `yarn check:story-catalogue-sync`, `yarn check:native-patches` — all green.
- iOS Debug build + simulator pass on iPhone 17 Pro (`expo prebuild` → `pod install` →
  `xcodebuild`). ⚠️ `pod install` needs `LANG=en_US.UTF-8`; without it CocoaPods 1.16.2 on
  Ruby 4.0.5 dies in `unicode_normalize` before it reads the Podfile.

### Completion Notes List

#### The palette (AC1, AC2)

`PRIMARY_COLORS` — the Google-Blue ramp — is **deleted**, not recoloured. It had **zero**
production consumers (only re-exports through `colors.ts` and `theme/index.ts`), and Cardì has no
ramp for it to become; renaming it to an ink ramp nobody reads would have been inventing tokens.
`SEMANTIC_COLORS` is deleted for the same reason, plus the one the story names: its comment claimed
the values were "same in both themes", which was false, and it too had no consumers.

`IDENTITY_COLORS` is **reconciled as the canonical triple** rather than merged away. Every theme
role is now ink, beam, cream, or a tone derived from them, and `tokens.generated.test.ts` asserts
that binding directly (`LIGHT_THEME_COLORS.primary === IDENTITY_COLORS.ink`, and six more) so a
future edit cannot quietly reintroduce a second palette. Its `$description` is rewritten; it no
longer says the migration is pending. All three consumers (`AppIconHeader`, `BrandedIcon`,
`launch/constants.ts`) are unchanged and still resolve.

Two keys are **added**: `onPrimary` (white in light, ink in dark) and `onError` (the same pair).
Neither is decoration — see "The beam rule has teeth" and "The same trap, one token along".

#### `success`, `warning`, `info`, `link` (AC9)

Cardì defines **no** success, warning, info or link colour, and its only green (`#0C843C`) is a
card accent forbidden as chrome. The decision is therefore to map them onto the roles the system
_does_ define rather than invent a sixth hue, which would break the thesis the whole palette exists
to serve. In light they all resolve to **ink**; in dark they split — beam for the roles that ask
for action (`primary`, `link`, `warning`), cream for the ones that only inform (`success`, `info`).
`link` follows the frames' explicit ruling (`stitch-prompts-auth.txt:97`,
`stitch-prompts-onboarding.txt:88-89`): links are ink.

⚠️ **Beam is not available as a light-mode foreground, and that is arithmetic, not taste.** It is
1.33:1 on cream and 1.52:1 on white. A first pass made light `warning` beam and it would have been
invisible on three of its four consumers. Beam is a **field** that carries ink, never a mark drawn
on a light ground.

⚠️ **Behaviour change worth stating:** `PasswordStrengthIndicator`'s "fair" and "strong" tiers now
render the same ink in **light** mode (they stay distinct in dark: beam vs cream). The bar's width
and its label still separate them. Story 22.9 restyles that component.

#### The beam rule has teeth (AC6) — and it caught a real defect

`colors.contrast.test.ts` gains five assertions, including `white-on-beam < 4.5` asserted as
**failing on purpose**: if a future palette edit ever makes it pass, beam has been lightened or
muddied and that test _should_ go red.

Writing it surfaced the defect it was written for. Dark `primary` is beam, and **six production
sites paint a hardcoded white label on `theme.primary`** — `Button.tsx` (the shared primitive),
`AccountSection`, `CardForm`, `ModeOptionCard`, `HelpScreen`, and `BarcodeScanner` ×2. Every one of
them would have shipped white-on-beam at 1.52:1. All now read `theme.onPrimary`. This is the one
place the change deliberately reaches past the token layer, because the alternative was shipping
six WCAG failures that this story's own new test exists to forbid.

#### The same trap, one token along — `onError`

`error` has the identical shape to `primary`: it carries text in a dozen places **and** fills a
handful of buttons, and dark mode wants opposite labels for the two. Lifting the dark red far
enough to clear AA against black (`#F87171` → `#FF453A`, 2.77 → 6.16 on black) is exactly what
stops **white** clearing AA against the red itself — 3.41:1. Three production sites pair a
hardcoded white with an `error` fill: `Button`'s destructive variant, `SyncErrorBanner`'s retry and
`MigrationBanner`'s retry. All three now read `theme.onError`, and the contrast test asserts both
pairings plus the white one failing, exactly as it does for beam.

This one was NOT created by this story — it ships today at a worse 2.77:1 — but the migration moved
the very token responsible, so leaving it would have meant leaving a known sub-AA label behind a
change whose own new test exists to forbid exactly that.

While in `SyncErrorBanner`, its message colour stopped being `NEUTRAL_COLORS.white` in dark: the
design system's dark rule is body text in cream, **"never pure white"**, and `theme.textPrimary`
already is cream, so the ternary went too.

#### Two fixed dark surfaces that must not read the theme

`NoCodeFoundBanner` and `ScannerOverlay`'s scan line float on `rgba(0,0,0,0.80)` and `#000000` —
surfaces no theme touches — yet read `theme.primary` / `theme.warning`. That worked only while
those tokens were a blue and an amber; light-mode ink makes both **invisible**. Both now take beam
directly, which is what the design system already specifies for that surface: _"the scan line and
the banner links on our own viewfinder"_, the half of the beam rule that says **yes** because there
we are the one scanning. `NoCodeFoundBanner` no longer calls `useTheme()` at all.

#### The literals (AC8) — four named, a fifth found

| literal                             | where              | resolution                      |
| ----------------------------------- | ------------------ | ------------------------------- |
| `'#1F1F24'`                         | `luminance.ts:31`  | → `IDENTITY_COLORS.ink`         |
| `'#1F1F24'`                         | `CardTile.tsx:145` | → `IDENTITY_COLORS.ink`         |
| `'#1F1F24'`                         | `CardShell.tsx:33` | → `IDENTITY_COLORS.ink`         |
| `rgba(76, 175, 80, …)`              | `CardTile.tsx:124` | → beam, split from the token    |
| **`'#40404A'`** (not in the AC)     | `CardTile.tsx:190` | → `theme.border` (`#3A3A48`)    |
| `BARCODE_FLASH` `#FFFFFF`/`#000000` | `colors.ts`        | **kept**, and the reason is now |
|                                     |                    | in the file, not just the PR    |

The fifth was in the same `borderColor` expression as one of the four, and the design system names
`#3A3A48` for exactly that case ("a near-black brand takes a `#3A3A48` outline in dark mode").
Leaving a known-wrong literal in a statement being edited would have been the drift this story
exists to end.

`BARCODE_FLASH` stays hardcoded **on purpose** and now carries the rationale in a comment, so the
next person to "consistency-fix" it has to argue with the barcode section first.

The ~35 remaining `#1F1F24` hits are **test mocks** — arbitrary stand-in theme objects that assert
nothing about the palette. Rewriting them would be churn with no meaning.

#### The favourite star (AC9)

**Tile:** opaque ink plate, beam star. Only the two colours moved — `BADGE_SIZE`/`BADGE_INSET` are
untouched, so `BADGE_KEEP_OUT` and `gridLayout.test.ts` are undisturbed. The now-false rationale
comment in `gridLayout.ts` ("near-opaque white plate", "amber glyph") is corrected in the same
commit, as is `CardTile`'s own.

**Card-detail header:** no plate, and none added — a plate would break the single filled region
AC7 restores. The star is drawn straight on the brand's colour, so it **cannot** assume beam reads.
`getFavouriteStarColor(field)` returns beam on a dark field and **ink on a light one**, which:

- answers the Esselunga case the story left open (`#FFCC00`, three points from beam — a beam star
  on it is invisible, not subtle), and
- **pre-answers the collision Story 21.2a creates**: beam becomes a pickable card accent, and a
  beam field resolves to an ink star by the same rule, with no further change. 21.2a's AC9 device
  pass now has something to confirm rather than something to fix.

Filled-vs-outline still carries the favourite state, so the colour fallback costs no meaning.

#### The brandless card-detail header (AC7)

`headerBg` was `theme.primary` for a card with no brand, sitting directly above a hero that
`BrandHero` paints `CARD_COLORS[card.color]`. Ink would have made that a near-black band above a
coloured hero. It is now the same expression `BrandHero` uses, `?? CARD_COLORS.grey` included —
without the guard an unmapped colour renders **transparent** rather than recoloured, which the new
test pins (`mockCard.color` is a raw hex, so the guard is the only thing filling that header).

**No branded tile is tinted, washed or recoloured by this change.** All eight call sites re-read:
`CardTile.tsx:139`, `BrandHero.tsx:51-52`, `BrandPill.tsx:32`, `BrandRow.tsx:35`,
`CardSetupScreen.tsx:63` and `CatalogueGrid.tsx:71` pass `brand.color` through verbatim with no
token interposed. ⚠️ **`CatalogueGrid.tsx:53` and `:64` are the exception and the earlier wording
here was wrong to call all eight verbatim** — they are `brand.color + '15'` and `+ '30'`, i.e.
alpha washes of the brand's own colour. Pre-existing, untouched by this change, and not a tint by
a _token_ — but it is a wash, and the claim is corrected rather than left overstated. No automated
test guards the general "no branded tile is tinted" invariant; only the specific brandless-header
fix is tested. `CARD_COLORS` values are byte-identical (21.2a owns them) and
`tokens.generated.test.ts` asserts it.

#### `sync-tokens.ts` (AC11)

It **stops being a palette and becomes a mapping.** Every pair now resolves to a generated theme
token, so the banned hues are gone by construction rather than by edit: coral `#FF5B30`
(`errorAccent`/`conflictAccent`, rendered on every sync failure) and orange `#EF9500`
(`offlineText`) are both replaced by theme roles. The `{ light, dark }` shape stays because
`unistyles.ts` flattens it per scheme. Two values are deliberately not tokens and both are recorded
in the file: `errorBg.light` (the design system's `error-container` `#FBDDDD`) and `modalOverlay`
(a scrim, which must stay black at 50% whatever the ground is). `keepBothTint`'s green is gone too,
though AC11 only required a recorded decision for it.

#### Design-system amendments

Two, both onto 23.1's output (which landed first, as the guardrail requires):

1. **The deep-blue `secondary` role is RETIRED** (prose + the four `secondary*` frontmatter keys).
   AC7 required this conflict to be _ruled on_, not sided with. It was contradicted twice: `#0C3C84`
   is one of the five card accents and Forbidden bans "card accent colours used as chrome"; and the
   role's only named use — barcode-modal chrome — is independently forbidden by the barcode
   section's "the surround must be neutral… never a saturated field". The two prompts that "reason
   from that role as live" cite it **only to rule it out** before settling on ink, so retiring it
   leaves their conclusions intact and in fact removes the only alternative they argued against.
   `#0C843C` is bound by the same logic, which is what AC9 relies on to keep it out of
   `theme.success`.
2. **The one narrow exemption is written down**: a card accent is legal as _its own card's_
   full-bleed detail field — header included, because there it is content, not chrome — and illegal
   everywhere else. Forbidden gains "**a card accent as the value of a theme token**", and the
   accents section cross-links the exemption so neither statement contradicts the other when read
   alone.
3. The **favourite-badge plate** line is amended from "an opaque white plate" to the ink+beam
   decision, with opacity called out as load-bearing. Story 22.1 rewrites `CardTile` citing this
   document as its authority, so leaving it would have brought the white plate straight back.

#### `CarbonTheme.kt` (Dev Notes)

The two comments this story falsifies are **corrected in place**; the two `Color(…)` values are
**knowingly left stale and now say so**, pointing at Story 23.3 and at `cardi-watch-grammar.md`
§4.3/§4.4, which already ruled that no orange ships on any watch surface. 21.2 writes no Kotlin
behaviour, and moving those values needs 23.3's emulator pass.

⚠️ **A scheduling consequence for ifero, not a code one.** `FavoriteStarTint` is `#F59E0B` —
bit-identical to the `orange` card key, and orange is banned outright — so **the watches ship a
banned favourite-star colour in the same release that fixes the phone's**. 23.2 and 23.3 own the
fix, but 23.3 is `backlog`, unrefined, and outside the 21.7 release gate. Before this release
everything was uniformly pre-rebrand; after it, the phone's star is beam-on-ink and both watches
visibly are not, for an unscheduled duration. Worth deciding deliberately rather than discovering.

#### AC10 — the styling items, enumerated (and the count dropped)

The epic's phrase "the nine known styling items" is **unsupported**: it appears only in
`epics.md`, the tracker and story 16-33, and nowhere is a list. Rather than carry a number nobody
can check, here is what this story actually touched, and the count is whatever this list is:

1. `theme.warning` — decoupled from the favourite star, moved off banned amber (5 consumer files).
2. `theme.success` — moved off `#16A34A`/`#22C55E`, greens in no palette.
3. `theme.info` and `theme.link` — moved off the retired Google-Blue ramp.
4. `#1F1F24` in `luminance.ts`, `CardTile.tsx`, `CardShell.tsx`.
5. Material Green 500 in `CardTile.tsx`'s just-added highlight.
6. `#40404A` in `CardTile.tsx`'s dark black-brand outline.
7. `rgba(255,255,255,0.95)` — the favourite plate.
8. Six hardcoded white labels on `theme.primary`.
9. Two fixed dark surfaces reading theme tokens (`NoCodeFoundBanner`, the scan line).
10. `sync-tokens.ts`'s coral and orange.
11. `SEMANTIC_COLORS` and `PRIMARY_COLORS` — deleted.

**Not** folded in, and deliberately: `CardForm`'s literal `32` margin and the literal `24`s. Those
are **spacing**, not colour; `CardForm`'s 32 is named in the design system's own margin
adjudication as one of the two genuine one-offs, and it belongs with the layout pass, not with a
palette migration. The sub-15px item is AC14, below.

#### AC14 — the sub-15px body-text policy: DECIDED here, EDITED in 21.6

Measured at this commit, and both of the story's figures confirmed: **80 literal instances across
40 files** (40 × `14`, 22 × `12`, 13 × `13`, 4 × `11`, 1 × `10`) plus **25 indirect reads across 12
files** through `TYPOGRAPHY`/`typography` `.footnote` (13) / `.caption1` (12) / `.caption2` (11).

**The decision is a floor PLUS a named sub-floor tier, not a blanket raise.**

- **Body copy has a 15px floor.** `body-md` (Inter 15/22) is the smallest size any sentence a user
  is expected to _read_ may take. Everything currently below 15 that is body copy moves up.
- **A named `chrome` tier exists below it, sentence case, Inter 12–14**, for text that labels
  rather than reads: field errors (13), document metadata (12), tile card names (13), dismiss hints
  (14), badges and counts. Six of the nine drawn prompt patterns ship this tier deliberately, so a
  blanket raise would contradict the frames rather than implement them.
- **The distinction is function, not size**: if it is a sentence the user reads, it is body and
  bound by 15; if it labels, counts or annotates something already on screen, it is chrome.

**The edit is Story 21.6's**, which re-derives the scale and is the only story touching the 25
indirect reads; 21.6 carries the matching AC, and 22.8 depends on this answer existing, which it
now does. No font size is changed in this commit.

#### AC4 — device verification, MEASURED rather than eyeballed

iPhone 17 Pro simulator, Debug build off this branch, both schemes. Values read by decoding the
raw `simctl io … screenshot` PNG (`zlib` + `struct` unfilter) and sampling exact pixels, because
"looks right" is how `#1F1F24` survived a rebrand:

| surface                        | light                                              | dark                                |
| ------------------------------ | -------------------------------------------------- | ----------------------------------- |
| Ground                         | **`#F0F0E8`** cream                                | **`#000000`** true black            |
| Header / nav bar               | `#FFFFFF` (surface)                                | **`#181824`** ink                   |
| Cards and sheets               | `#FFFFFF`                                          | `#181824`, raised `#20202E`         |
| Primary button fill / label    | ink fill, white label                              | **`#FCCC0C` fill, `#181824` label** |
| Secondary button               | 1px ink outline, ink label                         | beam outline, beam label            |
| Icons                          | ink                                                | beam                                |
| Conad tile (a catalogue brand) | **`#DA291C`** — its own hex, both schemes, no tint |                                     |

The dark primary-button sample is the one that matters most: **56 196 beam pixels and 3 345 ink
pixels, and no white at all.** That is the `onPrimary` fix, and without it every one of those ink
pixels would have been white at 1.52:1.

**Card detail (AC7).** The status-bar inset, the 56px header and the hero band all sample exactly
`#DA291C`, including the rows where they meet — one unbroken region, no seam. Previously the header
would have been `theme.primary`.

**Favourite star (AC9).** On the **tile**, the badge region contains `#181824` (the plate) and
`#FCCC0C` (the star) over an unchanged `#DA291C` tile — no `rgba(255,255,255,0.95)` anywhere. On
the **card-detail header**, the filled star samples exactly `#FCCC0C` with no plate behind it, and
the unfavourited state is an outline star in the header's own foreground.

⚠️ **What was NOT device-verified, stated rather than implied.**

- **Android**: no AVD and no system image on this host (`emulator -list-avds` is empty), so it
  needs ifero's device or a CI run. What is verified above is platform-independent — the tokens
  funnel into one generated file both platforms read — but that is an argument, not a screenshot.
- **watchOS and Wear OS**: not run. Neither watch consumes `tokens/color.json`; Stories 23.2/23.3
  own them.
- **Screens not opened**: onboarding, authentication, the add-card/scanner flow, and the
  sync/status surfaces. The wallet, card detail, settings and the theme picker were.
- The device pass was **re-run in dark after the QA fixes**, which is where the `ToggleSwitch`
  composite was measured on-screen at `#1A1501` — a warm near-black, confirming the 10 % wash reads
  as a tonal layer rather than an olive. `FannedCardIllustration` sits behind onboarding, so its
  fix is proven by computation rather than by a screenshot.

#### What the QA pass found, and what it changed

Two genuine defects, both outside anything the code review's lens would have caught, and both
**verified by recomputing the arithmetic** rather than accepted on report:

**`textTertiary` was a WCAG regression this story introduced, and nothing asserted it.** The first
pass derived it from the warm ramp like the rest of the text colours, which put dark
`#7E7E74` at **3.92:1** on `surfaceElevated` — down from the 6.00:1 the old `#99999E`/`#1C1C1E`
pair gave. That token is not decoration: it is the `placeholderTextColor` of **every** text input
in the app (`TextField`, `SearchBar`, `BrandSearchBar`, the OTP field) plus empty-state subtitles,
the barcode hint and the single-card tip, none of which qualifies for the "large text" 3:1
exemption. It is now `#8F8F85` (4.92 / 5.39 / 6.44) in dark and `#6B6B63` (5.00 / 4.69 / 5.37) in
light — the light side was **already failing at 3.22:1 before this story** and is fixed in the same
edit, because half a compliant token is not a compliant token. `colors.contrast.test.ts` gains the
assertion that was missing, over every ACTIVE ground (`backgroundSubtle` is deliberately excluded:
it is the disabled field fill, which 1.4.3 exempts) plus a guard that the primary → secondary →
tertiary ramp stays ordered.

**Alpha washes of `theme.primary` become a forbidden hue in dark mode.** This is the trap the
story's own Dev Notes named — "if the new palette introduces any 8-digit hex… every one of these
silently produces an invalid colour" — landing one level deeper than AC12 caught it. Keeping every
token a 6-digit hex stops the _string_ being invalid; it does nothing about what the composite
_renders_. Beam under alpha over a dark ground:

| alpha | over black | reads as        |
| ----- | ---------- | --------------- |
| 8 %   | `#141001`  | warm near-black |
| 10 %  | `#1A1501`  | warm near-black |
| 20 %  | `#322902`  | **olive**       |
| 75 %  | `#BD9909`  | **mustard**     |

Two sites exceeded it. `FannedCardIllustration` — the fanned-cards mark on the **Welcome screen**,
the first thing a new user sees — washed `primary` at 15/45/75 %, so in dark mode its three cards
rendered olive through mustard. It now washes `textPrimary`, which is the same ink in light (a
no-op there) and cream in dark, giving the same ascending depth read out of colours the system
contains. `ToggleSwitch`'s ON track dropped from 20 % to 10 %; the knob and border already carry
the state in beam at its true value.

⚠️ **A second QA round proved that sweep incomplete, and the miss is instructive.** Four more sites
were above the line, and all four escaped the grep because the alpha is a **separately interpolated
expression** rather than a literal suffix — `` `${theme.primary}${cond ? '80' : 'A6'}` `` matches no
search for `${theme.primary}NN`. Three are in `FeatureHighlightsScreen`, the onboarding carousel
every new user sees, at **50 %, 65 % and 70 %** — composites `#7E6606`, `#A48508`, `#B18F08`, i.e.
_worse_ than the illustration that was fixed first. The story's own Dev Notes had already named this
family of hiding place ("a fourth hiding style… invisible to **both** a `+ '1A'` grep and a
`withAlpha` grep"); it simply had one more member than the list.

The fix follows the design system's own illustration rule — _"flat, two-tone (ink line-work on
cream) with beam yellow as the single accent"_ — which maps onto exactly two tokens: **shapes and
tonal discs take `textPrimary`** (ink in light, cream in dark), **accents keep `primary` at its true
value** (the barcode bars, the shield icon). `GuestModeBanner`'s 20 % border and 12.2 % overlay drop
to 10 %.

**The remaining sites were then re-swept exhaustively** — including the `withAlpha` helper and every
`+ 'NN'` form — and all sit at 5–10 %: `Button`, `SortFilterRow`, `CardDetails`, `ErrorBanner`,
`VerifyEmailScreen`, `InfoTooltipModal`, `ModeOptionCard`, `BrandedIcon`, `ImportErrorSheet`,
`MigrationBanner`. **The threshold is now written into the design system** with the composite table,
and added to Forbidden, so the next person does not have to re-derive it — which matters because
Stories 22.1, 22.9 and 22.10 rewrite most of these components.

⚠️ **Note what made this invisible:** in light mode `primary` and `textPrimary` are both ink, so
every one of these sites renders identically and a light-mode screenshot shows nothing wrong. The
defect exists only in dark, only in the composite, and only for a token that changed meaning.

Two further gates came out of the pass: `sync-tokens.test.ts` now proves AC11 rather than asserting
it (no coral/salmon/terracotta/orange by **hue band**, not by a denylist of the two hexes that used
to be there; every pair resolving to a generated token; and the one deliberate hand-authored value
read back out of `cardi-design-system.md`'s own frontmatter, so the two cannot drift). And
`docs/design/cardi/README.md:44` still listed deep blue as a fourth role — the top-line palette
summary a reader skims first, contradicting the retirement this story had just made one file over.

#### Where roles now coincide — disclosed, not hidden

Collapsing four uncoloured roles onto ink and cream has visible second-order effects. All of them
follow from the system having two hues, not from a shortcut, and each is listed so a later reader
does not meet it as a surprise:

- **`PasswordStrengthIndicator`** — "fair" and "strong" share ink in **light** (they stay distinct
  in dark: beam vs cream). Bar width and the label carry the distinction. Story 22.9 restyles it.
- **`SyncIndicator`** — "syncing" (`theme.primary`) and "success" (`theme.success`) share ink in
  **light**. Separated by a different glyph (`sync` vs `check-circle`), the rotation animation and
  different copy.
- **`ImportErrorSheet`** — `isInvalid ? theme.warning : theme.info` yields the same value in
  **light**. Left as a live branch on purpose: the two are independent roles that merely coincide
  today, and collapsing it would erase a distinction 22.1 may want back. (Its background wash was a
  genuine bug and IS fixed — see the change log.)
- **The sync/status containers** — `syncingBg`, `successBg` and `offlineBg` now all resolve to one
  neutral container, and in **dark** `errorBg` joins them. Five hand-tuned per-state tints become
  one or two. That is a real loss of an existing affordance and it is **accepted**: every tint it
  replaced was a hue Cardì does not contain, and giving each state its own would mean inventing
  four. State is carried by the icon, the border (error only) and the copy. Every resulting
  text-on-container pair was re-checked and still clears AA.
- **`ThemePickerSheet`** — the light swatch's lower band moved from `surfaceElevated` to
  `background`. Not named by any AC, and included deliberately: that chip is where someone goes to
  _see_ the scheme, and it was previewing a near-white sliver against a white band while the actual
  change is white-on-cream.

#### Follow-ups flagged, not fixed

- `NEUTRAL_COLORS`' **slate ramp** (10 values) has zero consumers and is a grey family in a system
  whose warmth is the point. `white`/`black` are live. Worth deleting; no AC covers it.
- The **destructive Button** is a filled red button at all; the system specifies destructive as
  _borderless `#C41E1E` text with a trailing icon_. `onError` makes the current form legible, but
  the shape is Story 22.1's to fix.
- `ToggleSwitch`'s "on" state is `${theme.primary}33`, a 20% ink wash in light. Legible (ink border
  vs grey border) but the system says active states are beam. Story 22.1 owns the component.
- ⚠️ **For Story 21.2a's sweep:** `CardDetails.tsx:311` reads `CARD_COLORS[card.color]` with **no**
  `?? grey` guard, unlike the four sites 21.2a's AC4 names. A custom card whose `color` is a raw hex
  rather than a named key renders that swatch transparent. Pre-existing, out of this story's scope
  (AC9b), and flagged here because it is a **fifth** site nothing else points at.

### File List

**Tokens and theme**

- `tokens/color.json`
- `shared/theme/tokens.generated.ts` _(generated — `yarn tokens:build`)_
- `shared/theme/tokens.generated.test.ts`
- `shared/theme/colors.ts`
- `shared/theme/colors.contrast.test.ts`
- `shared/theme/index.ts`
- `shared/theme/luminance.ts`
- `shared/theme/luminance.test.ts`
- `shared/theme/sync-tokens.ts`
- `shared/theme/sync-tokens.test.ts`

**Components and screens**

- `features/add-card/components/NoCodeFoundBanner.tsx`
- `features/add-card/components/ScannerOverlay.tsx`
- `features/cards/components/BarcodeScanner.tsx`
- `features/cards/components/CardForm.tsx`
- `features/cards/components/CardTile.tsx`
- `features/cards/components/CardTile.test.tsx`
- `features/cards/components/CatalogueGrid.test.tsx`
- `features/cards/screens/CardDetailScreen.tsx`
- `features/cards/screens/CardDetailScreen.test.tsx`
- `features/cards/utils/gridLayout.ts`
- `features/help/HelpScreen.tsx`
- `features/auth/components/GuestModeBanner.tsx`
- `features/onboarding/components/FannedCardIllustration.tsx`
- `features/onboarding/components/ModeOptionCard.tsx`
- `features/onboarding/screens/FeatureHighlightsScreen.tsx`
- `features/auth/MigrationBanner.tsx`
- `features/auth/MigrationBanner.test.tsx`
- `features/settings/components/AccountSection.tsx`
- `features/settings/components/ImportErrorSheet.tsx`
- `features/settings/components/ThemePickerSheet.tsx`
- `shared/components/SyncErrorBanner.tsx`
- `shared/components/SyncErrorBanner.test.tsx`
- `shared/components/launch/constants.ts`
- `shared/components/ui/Button.tsx`
- `shared/components/ui/Button.test.tsx`
- `shared/components/ui/CardShell.tsx`
- `shared/components/ui/ToggleSwitch.tsx`
- `shared/components/ui/ToggleSwitch.test.tsx`
- `shared/components/ui/stories.test.tsx`

**Docs and watch**

- `docs/design/cardi/cardi-design-system.md`
- `docs/sprint-artifacts/stories/21-2-migrate-colour-tokens-to-ink-and-beam.md`
- `docs/sprint-artifacts/sprint-status.yaml`
- `watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/presentation/theme/CarbonTheme.kt`
  _(comments only — values knowingly stale, owned by 23.3)_

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-16 | Migrated `LIGHT_THEME_COLORS` / `DARK_THEME_COLORS` to Cardì Ink & Beam; deleted `PRIMARY_COLORS` and `SEMANTIC_COLORS`; added `onPrimary`. Regenerated `tokens.generated.ts`.                                                                                                                                                                                                                                                                     |
| 2026-09-16 | Added the beam rule to `colors.contrast.test.ts` with the white-on-beam case asserted as failing; repointed six white-on-primary labels at `onPrimary`.                                                                                                                                                                                                                                                                                            |
| 2026-09-16 | Resolved the four drifting literals plus a fifth (`#40404A`); documented why `BARCODE_FLASH` stays.                                                                                                                                                                                                                                                                                                                                                |
| 2026-09-16 | Favourite star: ink plate + beam star on the tile; contrast-aware beam/ink star and no plate on the card-detail header. Corrected the `gridLayout.ts` and `CardTile.tsx` rationale comments.                                                                                                                                                                                                                                                       |
| 2026-09-16 | Card-detail header fills with the card's own accent (`?? grey`) instead of `theme.primary`, restoring the one-filled-region rule.                                                                                                                                                                                                                                                                                                                  |
| 2026-09-16 | `sync-tokens.ts` remapped onto generated theme tokens; coral `#FF5B30` and orange `#EF9500` removed.                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-16 | Design system: retired the deep-blue `secondary` role (prose + frontmatter), wrote down the card-accent detail-field exemption, amended the favourite-plate line to ink + beam.                                                                                                                                                                                                                                                                    |
| 2026-09-16 | Recorded the sub-15px policy (15px body floor + a named chrome tier); the edit stays with Story 21.6.                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-16 | `NoCodeFoundBanner` and the scan line take beam directly instead of theme tokens, because both sit on fixed dark surfaces.                                                                                                                                                                                                                                                                                                                         |
| 2026-09-16 | `ThemePickerSheet`'s light swatch previews the cream ground instead of `surfaceElevated`.                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-16 | **Code review round 1** (9 findings, 0 High): added `onError` and repointed the three white-on-error labels; fixed `ImportErrorSheet`'s info wash reading `theme.primary`; `SyncErrorBanner`'s message is cream, not white; tightened two comments; disclosed four role-collision consequences.                                                                                                                                                    |
| 2026-09-16 | **Code review round 2** (2 findings): added component-level regression tests proving all three `onError` consumers read the token (each verified to FAIL on a revert to hardcoded white), plus a guard that the sync banner's message is never pure white; corrected the test count.                                                                                                                                                               |
| 2026-09-16 | **Code review round 3** (2 nits): `Button.test.tsx`'s fixtures now give `onPrimary` and `onError` divergent values — they coincide in the real palette, so the test could not tell the two tokens apart — and `SyncErrorBanner.test.tsx`'s scheme reset moved from inline to `afterEach`.                                                                                                                                                          |
| 2026-09-16 | **QA review** (10 findings, 2 High): fixed the `textTertiary` AA regression in dark AND the pre-existing light failure, with the contrast assertion that was missing; fixed two dark-mode alpha washes that composited to forbidden olive/mustard and wrote the 10% threshold into the design system; added `sync-tokens.test.ts` as a real AC11 gate; corrected `README.md`'s stale deep-blue role and this record's overstated "verbatim" claim. |
| 2026-09-16 | **QA review round 2** (4 findings): four more beam washes above the threshold — three on the onboarding carousel at 50–70 % — all hidden behind a separately-interpolated alpha that no `${token}NN` grep matches; re-swept exhaustively and fixed. Added a `ToggleSwitch` track guard and narrowed the `backgroundSubtle` exemption note, which had over-generalised from two field consumers to a third that is not disabled.                    |
