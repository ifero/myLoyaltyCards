---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.2: Migrate the colour tokens to Ink & Beam — the big bang, and the four literals that will not come with it

Status: ready-for-dev

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

- [ ] **Task 1 — Decide the palette mapping (AC1, AC2).** Every key in `LIGHT_THEME_COLORS` and
      `DARK_THEME_COLORS` gets a target value; `success`/`warning` get real decisions (AC9).
- [ ] **Task 2 — Edit `tokens/color.json`, run `yarn tokens:build`, commit the generated file.**
- [ ] **Task 3 — Update `tokens.generated.test.ts` (AC13).**
- [ ] **Task 4 — Contrast (AC5, AC6).** Re-run the gate; add the beam assertion.
- [ ] **Task 5 — The literals (AC8).** `luminance.ts` + 4 test assertions, two `#1F1F24`
      duplicates, the Material green.
- [ ] **Task 6 — The favourite star (AC9).** Ink plate + beam star on the tile
      (`CardTile.tsx:226,247-260`); bare beam/outline star and NO plate in the header
      (`CardDetailScreen.tsx:232`).
- [ ] **Task 7 — `sync-tokens.ts` decision (AC11).**
- [ ] **Task 8 — Brand-tile audit (AC7).** Walk all eight call sites; screenshot the grid before
      and after and show the brand colours are identical.
- [ ] **Task 9 — Sub-15px policy (AC14, AC10).** Decide; enumerate the styling items.
- [ ] **Task 10 — Device verification (AC4).** Light and dark, both platforms.

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

### Debug Log References

### Completion Notes List

### File List

### Change Log
