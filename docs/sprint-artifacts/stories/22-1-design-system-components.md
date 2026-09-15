---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 22.1: Design-system components [Enabling] — six primitives, four absorbed defects, and a test that fails the moment you add the eighth

Status: ready-for-dev

Epic: 22 — Cardì Redesign — Screen Implementation

> **⛔ BLOCKS 22.2–22.10. Eight screen stories consume these primitives.** Nothing else in Epic 22
> can start until this lands.
>
> **⚠️ `shared/components/ui/stories.test.tsx:76-77` HARD-ASSERTS EXACTLY SEVEN STORY MODULES.**
> `expect(modules).toHaveLength(7)`. **It fails the moment an eighth primitive gains a `.stories`
> file** — which this story guarantees. Update the count deliberately; do not discover it as a
> mystery red build.
>
> **⚠️ THE SHEET AND SECTION HEADER _ARE_ SPECCED — just not in `cardi-design-system.md`.** The
> nine `docs/design/cardi/stitch-prompts-*.txt` files are part of the design system and carry
> per-pattern specs the main document never restates. `stitch-prompts-settings.txt:183` specs the
> sheet — **grabber 36 × 4, fully rounded, `#D6D6CB`, 8px above**, 16px radius on the top two
> corners only, 24px margins, 48px minimum rows — and `:120` specs the section header: **Inter 12px
> semibold, uppercase, `letter-spacing 0.05em`, muted `#55555F`, 8px above its rows**. This story
> **TRANSCRIBES** those into `cardi-design-system.md`; it does not invent them.
>
> **⚠️ THE SHARED `BottomSheet` IS THE OFF-SPEC ONE, not the outlier.** Its handle is 40 × 4,
> `borderRadius: 2`, `opacity: 0.4` (`BottomSheet.tsx:133-137`); the spec is 36 × 4 fully rounded
> in `#D6D6CB` — which is what `MultiCodePickerSheet` already draws. Reconcile toward the **spec**,
> not toward the shared component.
>
> **⚠️ SHARED FILE WITH STORY 23.1.** Both write `docs/design/cardi/cardi-design-system.md` — 23.1
> amends the frame rule and the Forbidden list, this story inserts the component specs. **Let 23.1's
> structural amendment land first**; inserting into a document whose top-level rules are being
> rewritten is the expensive order.
>
> **⚠️ READ THE FOUR ABSORBED DEFECT STORIES FIRST. They have refined story files on `main`, NO
> tracker key and NO catalogue section**, so `check-story-catalogue-sync` cannot see them and
> nothing else in the tracker points at them. They are the detail this story consumes:
> `16-30-fix-scan-banner-occluded-by-bottom-actions.md`, `16-31-shape-viewfinder-to-expected-barcode-format.md`,
> `16-32-fix-button-destructive-variant.md`, `16-33-raise-touch-target-minimum-to-48.md`.
>
> **⛔ SEQUENCED AFTER 21.2 AND 21.6, and the reason is file overlap, not preference.** This story
> **rewrites** the components those two edit — `CardTile.tsx`, the sheets, `NoCodeFoundBanner.tsx`,
> the form fields. Running in parallel puts three stories in the same files.

## Story

As a developer implementing the redesign,
I want the shared primitives to exist first,
so that eight screen stories consume them instead of each inventing its own.

## Story context

Storybook covers **only** `shared/components/ui/` — `.storybook/main.ts:17` globs
`../shared/components/ui/**/*.stories.@(ts|tsx)`, and Chromatic is path-filtered to match. **A
primitive placed anywhere else gets no story and no visual coverage.** Seven primitives exist
today: `Button`, `CardShell`, `TextField`, `ToggleSwitch`, `ColorPicker`, `ActionRow`, `BottomSheet`.

### What exists, and what has to be built

| primitive                          | today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Anchored primary-action footer** | **Does not exist.** Three different patterns: the reference (`CardSetupScreen.tsx:248`, a flex sibling outside the `ScrollView`, inside the `KeyboardAvoidingView`); a button as last scroll child (`CardForm.tsx:264`); and two `position: absolute` bars. **No hairline rule anywhere.**                                                                                                                                                                                                                           |
| **Card tile**                      | `features/cards/components/CardTile.tsx` (309 lines). `shared/components/ui/CardShell.tsx` is a _different_, unrelated surface.                                                                                                                                                                                                                                                                                                                                                                                      |
| **Section header**                 | **No shared component, and the four copies agree on less than they look.** Sizes are 12 / 12 / 13 / 11 (`SettingsSection.tsx:20-23`, `BrandList.tsx:165-168`, `CardDetails.tsx:465-468` via `TYPOGRAPHY.footnote`, `ConflictComparisonCard.tsx:148-151`); colours are a 1-vs-3 split — `textTertiary` in Settings, `textSecondary` in the other three, and in all three injected **inline at the call site** rather than in the style object. The primitive reconciles a three-way size split AND that colour split. |
| **Hairline-outlined surface**      | **Does not exist** as a primitive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| **Form field + error idiom**       | `TextField` exists and is good. **`CardForm` does not use it** — it renders raw `TextInput`s in three `Controller`s with hand-rolled labels and errors in hardcoded hexes (`#6B7280`, `#EF4444`), radius **8** not 12, and no `minHeight`.                                                                                                                                                                                                                                                                           |
| **Sheet**                          | `BottomSheet` exists and **8 settings sheets already consume it**. `MultiCodePickerSheet.tsx` is the one outlier — 279 lines of hand-rolled `Modal`, its own scrim, its own Reanimated slide, its own 36×4 handle vs the shared 40×4.                                                                                                                                                                                                                                                                                |

### The two `position: absolute` footers the system forbids

1. `features/add-card/components/ScannerOverlay.tsx:500-506` — `bottomActions`.
2. `features/cards/components/BarcodeScanner.tsx:342-349` — `bottomBar`.

The design system's reasoning is specific: an absolutely-positioned footer _"either hides beneath
the keyboard or rides above it, stealing height from the field being typed into."_

### The conflicts to reconcile (all verified)

| concern                  | design system                                 | code                                                                                                    |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Button radius / height   | 12px, 52px tall                               | `Button.tsx:128` radius **14**; height is `TOUCH_TARGET.min` (token, not a literal), `large` 52         |
| Input radius / height    | 12px, **48px** min                            | `TextField` radius 12 ✅, `minHeight: theme.touchTarget.min` (token) ✗; `CardForm` radius **8**, none ✗ |
| Field labels             | UPPERCASE, Inter 13/600/+0.02em               | `TextField.tsx:135-140` 13/600, **no `textTransform`, no `letterSpacing`**                              |
| Drop shadows             | **none anywhere**                             | `CardTile.tsx:266-278` iOS shadow + Android `elevation: 3` when `!isDark`                               |
| Destructive button       | borderless, `#C41E1E` text                    | solid `theme.error` fill, white text, 1px border                                                        |
| Primary always enabled   | pressing an incomplete form reveals errors    | `CardForm.tsx:266` `disabled={!isValid \|\| isLoading}` + `opacity 0.5`                                 |
| **Busy is not disabled** | keeps its ink fill, swaps label for a spinner | `Button.tsx:71` `isDisabled = disabled \|\| loading` ⇒ a **loading** button renders `theme.border` grey |
| Touch target             | 48                                            | `TOUCH_TARGET.min` = 44 (Story 16.33)                                                                   |

### The tile geometry is frozen in three places

`TILE_WIDTH` 171 / `TILE_HEIGHT` 140 are asserted in `features/cards/utils/gridLayout.test.ts`
(lines 92-96, 125-128), repeated in `features/cards/components/CardTile.test.tsx:153-160`, and
mocked as literals in `features/cards/components/CardList.test.tsx:137-141`. **Any geometry change
must update all three.** `gridLayout.ts` is pure arithmetic with no React import and a 10-viewport
device table — Story 16.33's AC4 says explicitly not to reach into it.

## Acceptance Criteria

- **AC1 — The six primitives exist in `shared/components/ui/`** (the only directory Storybook and
  Chromatic see): the anchored primary-action footer with its 1px hairline rule, the card tile, the
  section header, the hairline-outlined surface, the form field with its error idiom, and the sheet.
  Existing primitives are **extended, not duplicated** — `TextField` and `BottomSheet` are the
  right _shape_, but ⚠️ **`BottomSheet`'s grabber is off-spec**: it is 40 × 4, `borderRadius: 2`,
  `opacity: 0.4` (`BottomSheet.tsx:133-137`) against a spec of **36 × 4, fully rounded, solid
  `#D6D6CB`, 8px above**. Correct it here.
- **AC2 — The footer is a flex sibling of the scroll area, or an auto-top-margin anchor inside it.
  NEVER `position: absolute`.** The button is **always enabled**; pressing an incomplete form
  reveals the field errors. **Busy is not disabled**: a submitting button keeps its ink fill and
  swaps its label for a spinner — the current `isDisabled = disabled || loading` greying is exactly
  the refusal read the system exists to remove. ⚠️ **One documented exception**: the
  type-to-confirm delete gate, which the prompts sanction as the only control drawn disabled. AC11
  records the carve-out, and AC5/16-32 gives `destructive` an explicit disabled rendering at **40%
  `#C41E1E`** so that screen has a path.
- **AC3 — Depth is tonal layers and hairline outlines only. No shadows, no gradients.**
  `CardTile.tsx:266-278`'s iOS shadow and Android `elevation: 3` are removed. Tap feedback becomes a
  0.98× scale, not a shadow bloom.
- **AC4 — Storybook stories cover each primitive in light and dark**, and
  `stories.test.tsx:76-77`'s `toHaveLength(7)` is updated to the new count in the same commit.
- ⚠️ **AC4b — Note what the token change does on its own.** `Button.tsx:127` and
  `TextField.tsx:146` read `TOUCH_TARGET.min`; **neither hardcodes 44**. So AC5/16-33's move to 48
  already satisfies "inputs 12/48" for `TextField` with no edit — a developer hunting for a literal
  44 **in those two files** will find none and may hardcode 48, reintroducing the drift the token
  prevents. ⚠️ Elsewhere literal 44s DO exist (~12 across 8 files, including
  `GuestModeBanner.tsx:24`'s `touchTarget?.min ?? 44`); those are AC5/16-33's sweep, below. The same
  change silently takes the **default Button** from 44 to 48 (`large` stays 52); that is a visual
  change across every screen and the PR must show it, not discover it.
- **AC5 — The four filed UI defects are resolved here**, not separately:
  - **16-30** — the scan banner's `bottom: 96` is replaced by a **derived** offset (the action stack
    is ≈146 tall), or banner and actions become siblings in one bottom-anchored container. Raising
    the banner is correct; re-ordering so the banner paints over the action rows is **not** — that
    trades one occlusion for another.
  - **16-31** — the viewfinder's width and height become independent, derived from
    `expectedFormat`; wide for linear formats, square for `qr`, **wide when undefined** (the
    custom-card path is a real case). `ScanLine` sweeps the new height.
  - **16-32** — `destructive` gets an explicit branch; the trailing bare `return` is gone (or the
    function is exhaustive with a `never` default); it renders borderless `#C41E1E` text with a
    distinct pressed state. ⚠️ **The design authority contradicts itself on the icon and AC11 must
    settle it:** `cardi-design-system.md` says "borderless, `#C41E1E` text, **trailing icon**",
    while every card-detail and settings prompt says "no red fill, no border, no outline, **no
    trash icon**". The frames are the later and more specific answer; amend the canonical line
    rather than shipping an implementation that quietly contradicts it.
  - **16-33** — `TOUCH_TARGET.min` becomes 48 in `tokens/spacing.json` (regenerated, never
    hand-edited). ⚠️ **`shared/theme/tokens.generated.test.ts:122` hard-asserts
    `toEqual({ min: 44, watch: 32 })` and goes red on contact** — `yarn tokens:check` still passes,
    only `yarn test` fails. Update it in the same commit, as `stories.test.tsx:76-77` is above. `TOUCH_TARGET.watch` stays 32. `gridLayout.ts` is untouched. ⚠️ **Carry 16-33's
    own AC3 too**: `grep -rn '\b44\b' features shared app`, convert every layout that hard-codes 44
    alongside the token (~12 sites across 8 files, `GuestModeBanner.tsx:24`'s `?? 44` fallback
    among them), and report what was and was not a touch target. Without it the token moves to 48
    and a dozen hand-written 44s stay — the exact mixed state AC4b says the token prevents.
- **AC6 — `CardForm` adopts `TextField`**, losing its three hand-rolled label/error treatments and
  its hardcoded `#6B7280` / `#EF4444` / radius-8. Its `testID="name-error"` and
  `testID="barcode-error"` contracts are preserved or their consumers updated.
- **AC7 — Field labels become UPPERCASE** per the system (Inter 13/600/+0.02em). ⚠️ **That tracking
  is in `em`; React Native's `letterSpacing` is in POINTS** — 0.02em at 13px is **0.26pt**, so a
  literal `letterSpacing: 0.02` is ~13× too tight. Consume the `label-bold` token Story 21.6
  derives (its AC6 tests the conversion) rather than transcribing the `em` value. With placeholders,
  values and error messages staying sentence case. `TextField` gains `textTransform` and
  `letterSpacing`.
- **AC8 — `MultiCodePickerSheet` adopts the shared `BottomSheet`**, or the PR records why it cannot
  — it is the only hand-rolled sheet left. ⚠️ **Reconcile toward the SPEC, not toward the shared
  component**: `MultiCodePickerSheet`'s 36 × 4 handle is the _correct_ one and the shared
  `BottomSheet`'s 40 × 4 is the deviation. Its 220 ms slide is a genuine difference to settle.
- **AC9 — The two `position: absolute` footers are converted** (`ScannerOverlay:500-506`,
  `BarcodeScanner:342-349`), or each is recorded as a deliberate exception with a reason. A camera
  overlay may be a genuine exception; say so rather than leaving it ambiguous.
- **AC10 — Radii and heights are reconciled to the system, and the radius is not negotiable.**
  **Radius is 12 for buttons and inputs, unconditionally** — `Button.tsx:128`'s **14** is corrected,
  not justified. The system rules "Buttons and inputs: 12px radius … consistent everywhere", and
  `12px radius` appears **42 times** across the nine prompt files while `14px radius` appears
  **zero** times; there is no branch in which keeping 14 is available. Heights split: the
  footer/primary button is **52** tall, other buttons take `TOUCH_TARGET.min` (48 after AC5/16-33,
  per AC4b), and inputs are 48.
- **AC11 — The section-header and sheet specs are TRANSCRIBED into `cardi-design-system.md`** from
  `stitch-prompts-settings.txt` (`:120` and `:183`), so 22.2–22.10 implement against the canonical
  document rather than hunting through prompt files. The same sweep settles the two places the
  authority contradicts itself: the **destructive button's trailing icon**, and the **favourite
  badge's plate** — `cardi-design-system.md` says white, the design README says ink carrying a beam
  star, and Story 21.2 AC9 implements ink on the tile (and no plate on the detail header). Amend
  the canonical text to match what ships, and **note that 21.2 lands first and may already have
  made that edit** — check before re-applying it. ⚠️ **Two more authority conflicts belong in the
  same sweep.** (a) The **tile brand-mark scale**: `cardi-design-system.md` says "roughly **85%** of
  the tile" and `stitch-prompts-wallet.txt:103,212` says "about **60%** of the tile width". The
  shipped code is `CardTile.tsx:150-151` `tileWidth * 0.85`, matching the system — rule for 85% and
  say so, or implementing against the frame shrinks every brand mark by ~30% on the screen the
  system calls the point of the product. (b) The **card accent as a full-bleed detail field**, which
  Story 21.2 AC7 needs amended against the Forbidden list's "card accent colours used as chrome".
  (c) The design system's **frontmatter still says `screen-margin: 20px`** while its own body
  adjudicates 24 ("20 is 2.5 × 8") — `touch-target` was updated to 48 and this was missed. Every
  **frame** uses 24, but ⚠️ **three prompts still direct 20** — do not assume a count, sweep them.
  `stitch-prompts-settings.txt:45-49` says "These frames use 20, and the code should move 24 → 20"
  (contradicted by its own body at `:83`, `:107` and by its own frame, which says "Settings was
  never drifting"); `stitch-prompts-capture.txt:119-121` says "20 for everything else" (against its
  own `:146` "24px left and right for everything"); and `stitch-prompts-document.txt:47-48` says
  `CardForm`'s 32, `SettingsScreen`'s 24 and the document screens' 48 "should all become **20**" —
  three lines after its own table says 24. That claim is doubly stale: the design system retires the
  settings/scanner "margin drift" note and adjudicates "Margin is 24, not 20". Fix the frontmatter **and all three prompts** — each to 24 (16 only
  for the card grid): `settings.txt:45-49` loses "the code should move 24 → 20",
  `capture.txt:119-121` loses "20 for everything else", and `document.txt:47-48` loses both the 20
  target and `SettingsScreen` from its drift list, **and `README.md:215-217` and `:1250-1251`, whose live open-items list still reads
  "DS 20px"**. The settings and scanner notes are the two the design system retires **by name**
  ("the margin drift note kept against settings and the scanner"), which is this AC's own cited
  reason. 22.2–22.10 build the settings, scanner and document screens from those three files.
  The frontmatter is the machine-readable half a regenerated Stitch system inherits,
  and 22.2–22.10 build the document screens from that prompt.
  (e) **The capture frame still draws the defect this story fixes.**
  `stitch-prompts-capture.txt:451` puts the scan banner "96px above the bottom edge" — the same
  `bottom: 96` that AC5/16-30 replaces with a derived offset. That frame is also internally
  impossible: `:462` places the bottom actions "below the banner" at 34px inset + 48 + 1 + 48 =
  **131px**, so they start 35px _above_ it. Restate the banner as sitting above the action stack,
  derived rather than 96, so the generated frame matches the fix this story ships.
  (d) **One disabled control is sanctioned and the Forbidden list prohibits it.**
  `stitch-prompts-settings.txt:259-262` specs the type-to-confirm delete gate as "the ONE place in
  this system where a control is drawn disabled, because the gate is the whole point", at 40%
  `#C41E1E` — against "the primary action is always enabled" and Forbidden's "a disabled button as
  a form's resting state". Record the carve-out.
  ⚠️ **The section header's 12px needs a ruling before it is canonised.** The spec says Inter 12px,
  but `cardi-design-system.md` sets a 15px minimum body size and Story 21.6 treats 12 as part of
  the below-floor set it is raising. Either record the section header as a named **chrome-label
  exception** to the floor and add it to the scale 21.6 derives, or resolve it to `label-bold`
  13/+0.02em. Cross-reference 21.6 AC8b either way — **21.6 lands first and carves the header out
  explicitly, so take its answer.** ⚠️ **Rule on the TIER, not the component.** The 12/0.05em
  uppercase treatment is not confined to section headers: `stitch-prompts-settings.txt:254` specs a
  real text input's label that way ("TYPE DELETE TO CONFIRM", Inter 12/600/0.05em, above its
  input), and `:112` does the same for the "Signed in" label — while the four `form-states.txt`
  field labels use 13/+0.02em. Decide which uppercase treatment governs a label above an input
  inside a sheet, or the delete-account sheet gets built twice. AC11 also rules on the header's
  **colour**: it is a **1-vs-3 split**, not a four-way one — `SettingsSection.tsx:19` uses
  `theme.textTertiary` while `BrandList.tsx:108`, `CardDetails.tsx:332` and
  `ConflictComparisonCard.tsx:37,61` all use `theme.textSecondary` **injected inline at the call
  site**, not set in the style object. Say whether the primitive owns the colour or keeps accepting
  an override. Finally, cite 21.6 AC5b's eighth-token decision for sheet titles.
- **AC12 — Tile geometry either does not change, or all three frozen copies are updated**
  (`gridLayout.test.ts`, `CardTile.test.tsx`, `CardList.test.tsx`'s mock). This fence covers badge
  and tile **geometry**; `gridLayout.ts` also holds one rendered font size, which 21.6 AC8b owns.

## Tasks / Subtasks

- [ ] **Task 1 — Read the four defect stories (AC5).** They are the brief for half this work.
- [ ] **Task 2 — Footer primitive (AC2).** `CardSetupScreen` is the reference implementation.
- [ ] **Task 3 — Tile, section header, hairline surface (AC1, AC3, AC11, AC12).**
- [ ] **Task 4 — Form field + error idiom (AC1, AC6, AC7).**
- [ ] **Task 5 — Sheet (AC1, AC8, AC11).**
- [ ] **Task 6 — Button (AC5/16-32, AC2's busy rule, AC10).**
- [ ] **Task 7 — Touch target (AC5/16-33).** `tokens/spacing.json` + `yarn tokens:build`, then
      `tokens.generated.test.ts:122`, then the literal-44 sweep.
- [ ] **Task 8 — Scanner fixes (AC5/16-30, 16-31, AC9).**
- [ ] **Task 9 — Stories + the count (AC4).**

## Dev Notes

### Guardrails

- **Storybook sees only `shared/components/ui/`.** A primitive elsewhere is invisible to Chromatic.
- **`shared/components/ui/CardShell.tsx` is NOT the home grid tile** — it is a separate presentational
  surface with a hardcoded `1.86` hero aspect. Do not conflate them.
- **The feature-local `features/cards/components/ColorPicker.tsx` is not the shared one.** `CardForm`
  imports the feature-local copy.
- **Two component-test styles exist**: mocking `useTheme` with a plain object (`Button.test.tsx`) or
  rendering through the real `StoryDecorator` stack (`stories.test.tsx`). Use the second for anything
  that needs real theming.
- Tests are **co-located**, `__tests__/` directories are banned and CI-enforced
  (`yarn check:no-tests-folders`). Coverage gate is 80% global and `shared/**` is measured.
- **`jest.config.js`'s `moduleNameMapper` order is load-bearing**: `\.svg$` must precede `^@/`.

### Testing

`yarn test`, `yarn tokens:check` (AC5/16-33 regenerates), `yarn format:check`, and the Chromatic
run on `shared/components/ui/**`. Expect snapshot churn wherever a row height is asserted — update
snapshots rather than loosening assertions (Story 16.33's AC5).

### References

- [Source: docs/epics.md#Story 22.1: Design-System Components]
- [Source: docs/design/cardi/cardi-design-system.md#Components] — buttons, tile, footer, inputs;
  and `#Elevation` for the no-shadow rule
- [Source: docs/sprint-artifacts/stories/16-30…16-33] — the four absorbed defects

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List

### Change Log
