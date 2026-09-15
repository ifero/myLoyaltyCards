---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 21.2a: Migrate the card accents — and decide whether the colour keys are a name or a contract

Status: ready-for-dev

Epic: 21 — Cardì Rebrand — Native Identity

> **📌 SPLIT OUT OF STORY 21.2 ON 2026-09-15, on evidence rather than instinct.** Eight review
> rounds found that roughly half of 21.2's defects lived in this one AC. Its scope had grown from
> "migrate the colour tokens" to: two `CardColor` union definition sites, a function that
> **produces** the keys, four runtime fallbacks, two pickers, two locale files, nine test files,
> three per-platform watch colour maps, and a cross-device wire contract with no test coverage.
> That is not a clause in a token migration; it is a story.
>
> **⛔ THE CENTRAL QUESTION IS A DECISION, AND IT MUST BE TAKEN BEFORE ANY CODE CHANGES.** Are the
> five `CardColor` keys **names** (renameable) or a **wire contract** (frozen)? Everything else in
> this story follows from that answer. AC1 takes it; AC2–AC8 implement whichever branch it chose.
>
> **⛔ THIS SHIPS IN THE ONE RELEASE THAT CANNOT BE CORRECTED BY AN OTA UPDATE.** A wrong answer
> mis-renders synced cards on both watches, and `runtimeVersion.policy` is `appVersion`.
>
> **Sequenced immediately after Story 21.2** (`wave_1b`): both stories edit `tokens/color.json`,
> and 21.2 is the keystone that establishes the palette this story's five accents come from.

## Story

As a user with custom cards,
I want my card colours to be the brand's own five accents,
so that a card I coloured myself looks like it belongs to the same app as the rest of the redesign.

## Story context

`tokens/color.json` holds a `CARD_COLORS` group — the five-colour palette for cards with no
official brand logo:

| key          | shipped       | Cardì accent                                     |
| ------------ | ------------- | ------------------------------------------------ |
| `blue`       | `#1A73E8`     | `#0C3C84` deep blue                              |
| `red`        | `#E2231A`     | `#E42424`                                        |
| `green`      | `#16A34A`     | `#0C843C`                                        |
| **`orange`** | **`#F59E0B`** | — **orange is banned from this system entirely** |
| `grey`       | `#64748B`     | — **there is no neutral among the five**         |

The design system's five accents are `#E42424` · `#0C3C84` · `#0C84CC` · `#0C843C` · `#FCCC0C`.
Two of the shipped keys have no equivalent, and `docs/design/cardi/README.md` already flagged the
consequence: _"This is not a repaint … The tokens PR needs a data migration decision, not just new
hexes."_

### Why this is not a rename

**The keys are persisted.** `core/schemas/card.ts:23` defines `CARD_COLOR_KEYS` and `:28` wraps it
in `cardColorSchema`, a zod enum that validates `card.color` **on every read** — so a dropped key
rejects an existing row. A hand-written duplicate of the union sits at `shared/theme/colors.ts:30`.

**The keys are produced, not just consumed.** `core/utils/mapHexToCardColor.ts` runs on every
catalogue-brand card creation (`CardSetupScreen.tsx:114,130`), returning `'grey'` at `:33,43` and
`'orange'` at `:48` from RGB-dominance buckets tuned to the **current** five hexes. A palette with
**two blues** (`#0C3C84`, `#0C84CC`), **no neutral** and a **yellow** needs re-derived buckets, not
renamed branches.

**`grey` is the runtime fallback**, not only a user choice: `BrandHero.tsx:51-52` (twice),
`CardTile.tsx:139` and `VirtualLogo.tsx:52` all resolve `?? CARD_COLORS.grey`. Remove the key
without naming a replacement and those render **transparent**, not recoloured.

### ⛔ And the keys cross the wire to both watches

`core/watch-connectivity.ts:252` sends `colorHex: card.color` — **the raw key, despite the field's
name** — and `core/wear-connectivity.ts` sends the identical payload by
importing `toBaseWatchCardPayload` from it (`:37`, applied at `:193`) — **one producer, two
transports**; that file contains no colour code of its own. The contract is documented at
`watch-android/…/wear/data/WearCard.kt:24` and `targets/watch/ComplicationProvider.swift:8`, and
resolved on the watch side **three different ways**:

- hard-coded hexes in `targets/watch-widget/WidgetCardPalette.swift:12-19`
- hard-coded hexes in `watch-android/…/presentation/CardVisuals.kt:28-35`
- **SwiftUI system colours** in `targets/watch/ColorHelpers.swift:27-33` (`Color.blue`, `.red`,
  `.green`, `.orange` — only `grey` is an RGB literal)

The canonical fixture is `test-fixtures/sync-message-v1.json` (`:31` `"colorHex": "green"`, `:43`
`"blue"`), named "the canonical v1 wire format" by `WearSyncContract.kt:14` and pinned by
`SyncFixtureContractTest.kt:105`. ⚠️ **That fixture sits at the repository root, while
`wear-os-build.yml` path-filters to the `watch-android` tree** — so a change touching only the
fixture runs no Kotlin test at all.

## Acceptance Criteria

- ⛔ **AC1 — DECIDE FIRST, in writing: are the keys names or a contract?** Record the answer and its
  reasoning in the PR before any code changes.
  - **Freeze** — the five keys keep their identifiers, only their hex values change. No persisted
    row is invalidated and no wire break is possible. Two costs, both real: two keys are
    permanently misnamed (`orange` renders a beam yellow, `grey` renders a colour that is not
    grey), which AC5 mitigates at the label layer; and ⚠️ **freeze does NOT mean the watches are
    untouched.** `WidgetCardPalette.swift:13` and `CardVisuals.kt:29` hold the shipped **hexes**
    (`"blue": "#1A73E8"`), which AC2 replaces on either branch — so leaving them alone makes the
    same custom card render `#0C3C84` on the phone and `#1A73E8` on both watches, permanently.
    Either re-point the two hex maps or defer the divergence explicitly and record it in Story
    21.7's AC2(a).
  - **Migrate** — the keys are renamed to match the accents. Then **every** consumer in AC2–AC7
    moves in this same release, including all three watch maps, and a data migration converts
    persisted rows.
- **AC2 — `CARD_COLORS` in `tokens/color.json` carries the five Cardì accents**, regenerated via
  `yarn tokens:build` and committed. `tokens.generated.ts` is never hand-edited.
  `shared/theme/tokens.generated.test.ts` is updated to the new values in the same commit.
- ⛔ **AC2b — The `CardColor` union's two definition sites move with the values, and persisted rows
  are migrated.** `core/schemas/card.ts:23` (`CARD_COLOR_KEYS`) and `:28` (`cardColorSchema`, a zod
  enum validating `card.color` on **every read**, so a dropped key rejects an existing row), plus
  the hand-written duplicate at `shared/theme/colors.ts:30`. On _migrate_ this AC also specifies the
  data migration across **both** surfaces — the local database and Supabase (see
  `shared/supabase/schemas.test.ts:126`). On _freeze_ neither file changes and the PR says so.
- **AC3 — `mapHexToCardColor.ts`'s buckets are RE-DERIVED, not renamed.** Its RGB-dominance
  branches are tuned to the shipped hexes; the target palette has two blues, no neutral and a
  yellow. ⚠️ **The whole mapping block churns, not one line**:
  `core/utils/mapHexToCardColor.test.ts:11-85` holds seventeen assertions, of which the six
  `.toBe('grey')` (`:63,67,71,75,81,85`) and both `'orange'` (`:53,57`) move on **either** branch,
  because the buckets are re-derived regardless. `core/utils/index.test.ts:11` is a second consumer.
  The PR states which brand hexes now land in which accent.
- **AC4 — All FIVE `?? CARD_COLORS.grey` fallbacks resolve to a NAMED default** —
  `BrandHero.tsx:51-52` (twice), `CardTile.tsx:139`, `VirtualLogo.tsx:52`, and ⚠️
  **`CardDetailScreen.tsx:188`, which does NOT exist at baseline**: Story 21.2's AC7 creates it one
  wave earlier (that line is `theme.primary` today). Miss it and the migrate branch either breaks
  the build or paints the detail header transparent — the failure this AC's guard sentence exists
  to prevent. None of the five accents is
  neutral, so this is a design decision the story records, not a substitution. **Keep the `??`
  guard** at every site; an unguarded lookup renders transparent.
- **AC5 — Both locale files are re-worded, on EITHER branch.**
  `shared/i18n/locales/en.ts:584-589` and `it.ts:585-590` feed
  `t('cards.colors.accessibilityLabel')` in both pickers. On _migrate_, a renamed key leaks the raw
  key into the accessibility label. On _freeze_, `orange: 'Orange'` / `'Arancione'` would announce
  a **beam-yellow swatch as "Orange"**, a hue this system bans. ⚠️ These are the two files Story
  21.1 also edits, which is why this story sequences behind it.
- **AC6 — Both 5-swatch pickers render the new accents**:
  `features/cards/components/ColorPicker.tsx:48` and `shared/components/ui/ColorPicker.tsx:61`.
- **AC7 — The wire contract is honoured and, for the first time, TESTED.**
  - On _freeze_: the **keys** do not move, but the two hex maps
    (`WidgetCardPalette.swift:12-19`, `CardVisuals.kt:28-35`) are either re-pointed to the new
    accents in this release, or the divergence is deferred explicitly and recorded in 21.7 AC2(a).
    The PR states which.
  - On _migrate_: all three watch maps move in this release —
    `WidgetCardPalette.swift:12-19`, `CardVisuals.kt:28-35` and `ColorHelpers.swift:27-33`'s
    named-colour switch — plus `CardVisualsTest.kt:36`, the fixture and
    `SyncFixtureContractTest.kt:105`.
  - **Either way**, pin the whole key set in `core/wear-sync-contract.test.ts` — **not** by growing
    the fixture. That file already reads the fixture (`:43`) and iterates `cardsSnapshot.payload`
    without asserting a count, so the addition is additive and it runs in `ci-quality-gates.yml`,
    which is **not** path-filtered. ⚠️ Growing the fixture instead trips
    `SyncFixtureContractTest.kt:90` and `:98` (both assert `cards.size == 2`) on a PR that runs no
    Kotlin — the exact silent break this AC exists to prevent.
- **AC8 — No BRANDED tile is touched.** The 44 distinct catalogue colours across 57 brands are
  content and flow `brand.color` → `backgroundColor` with no token interposed. This story changes
  only the **custom-card** palette. Screenshot the grid before and after to show the brand colours
  are identical.
- **AC9 — Verified on device in both schemes**, with a custom card in each of the five accents —
  ⚠️ **including a FAVOURITED card in the yellow accent, viewed on the card-detail header**, which
  is the beam-star-on-beam-field collision this story's AC2 creates by making `#FCCC0C` pickable
  (21.2's AC9 deliberately gives that header no plate),
  and — if _migrate_ was chosen — a card created **before** the change still rendering correctly
  after it.

## Tasks / Subtasks

- [ ] **Task 1 — Take and record the AC1 decision.** Everything below branches on it.
- [ ] **Task 2 — `tokens/color.json` + `yarn tokens:build` + `tokens.generated.test.ts` (AC2).**
- [ ] **Task 3 — Re-derive `mapHexToCardColor` and its test (AC3).**
- [ ] **Task 4 — The four fallbacks and their named default (AC4).**
- [ ] **Task 5 — Locale labels, both files, both branches (AC5).**
- [ ] **Task 6 — Both pickers (AC6).**
- [ ] **Task 7 — The wire contract and its new test (AC7).**
- [ ] **Task 8 — Brand-tile audit (AC8) and device pass (AC9).**

## Dev Notes

### Guardrails

- **Never hand-edit `shared/theme/tokens.generated.ts`** — three gates catch it (`yarn tokens:check`
  in CI and pre-push, plus the value-parity test).
- **`tokens/color.json` is shared with Story 21.2**, which lands first (`wave_1`). Take this
  story's edit onto 21.2's output, not onto `main`.
- **`shared/i18n/locales/en.ts` + `it.ts` are shared with Story 21.1**, also `wave_1`. Sequence
  behind it.
- **Ships in the single rebrand release (Story 21.7). Do not release alone** — it is one of the
  seven stories that gate names.
- **Do not reach into `features/cards/utils/gridLayout.ts`.** Story 16.33's AC4 and Story 22.1 both
  fence its badge and tile geometry; its one font size belongs to Story 21.6's AC8b.

### Testing

`yarn tokens:check`, `yarn test`, `yarn format:check`. Expect churn in
`shared/components/ui/ColorPicker.test.tsx:8-13,32-33` (a hardcoded `CARD_COLORS` mock plus
`picker-orange` / `picker-grey` assertions), `features/cards/components/ColorPicker.test.tsx:24-25,67-68`
and its six `value="grey"` renders, `VirtualLogo.test.tsx:41`, `shared/supabase/schemas.test.ts:126`,
`core/settings/importCards.test.ts:164,240`, `core/utils/mapHexToCardColor.test.ts:11-85`,
`core/utils/index.test.ts:11`, `test-fixtures/sync-message-v1.json:31,43` with its Kotlin guard
`SyncFixtureContractTest.kt:105` (migrate branch only), and
`shared/components/ui/ColorPicker.stories.tsx:22,26` (exported `Orange` / `Grey` stories).
⚠️ That stories file is iterated by `shared/components/ui/stories.test.tsx`, which **Story 22.1's
AC4 also edits** — coordinate, or the two changes collide.

### References

- [Source: docs/epics.md#Story 21.2a: Migrate the Card Accents and the Colour Keys]
- [Source: docs/design/cardi/cardi-design-system.md] — the five accents, the orange ban
- [Source: docs/design/cardi/README.md] — "a data migration decision, not just new hexes"
- [Source: docs/sprint-artifacts/stories/21-2-migrate-colour-tokens-to-ink-and-beam.md] — the theme
  palette this story's accents sit beside

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
