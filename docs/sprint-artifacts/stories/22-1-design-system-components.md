---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 22.1: Design-system components [Enabling] — six primitives, four absorbed defects, and a test that fails the moment you add the eighth

Status: done

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

- [x] **Task 1 — Read the four defect stories (AC5).** They are the brief for half this work.
- [x] **Task 2 — Footer primitive (AC2).** `CardSetupScreen` is the reference implementation.
- [x] **Task 3 — Tile, section header, hairline surface (AC1, AC3, AC11, AC12).**
- [x] **Task 4 — Form field + error idiom (AC1, AC6, AC7).**
- [x] **Task 5 — Sheet (AC1, AC8, AC11).**
- [x] **Task 6 — Button (AC5/16-32, AC2's busy rule, AC10).**
- [x] **Task 7 — Touch target (AC5/16-33).** `tokens/spacing.json` + `yarn tokens:build`, then
      `tokens.generated.test.ts:122`, then the literal-44 sweep.
- [x] **Task 8 — Scanner fixes (AC5/16-30, 16-31, AC9).**
- [x] **Task 9 — Stories + the count (AC4).**

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

Claude Opus 5.5 (`claude-opus-5-5`), Claude Code, `bmad-dev-story`; code and QA reviews by fresh Sonnet
subagents.

### Decisions taken by ifero before implementation (2026-09-27)

Four places where the story and a later canonical document disagreed, or where the story left a
genuine choice open, were put to ifero before any code was written:

1. **`TOUCH_TARGET.watch` is RETIRED, not kept at 32.** `cardi-watch-grammar.md` §5.4 (Story 23.1)
   decided retirement and assigned it to this commit; this story's AC5 still said "stays 32" because
   it was written before the grammar existed. The grammar wins: the key had zero readers and neither
   watch app (Swift, Kotlin) can read a TypeScript token.
2. **Sheet motion (AC8's "genuine difference to settle"):** the scrim fades and only the sheet slides
   (220 ms, Reanimated), for all nine sheets. The shared sheet used the native `slide` Modal, which
   carried the dark scrim up with it. The picker's motion, which the question offered as the model,
   turned out not to deliver the decision either; see AC8.
3. **The footer is a primitive only.** Story 22.6's ACs own adopting it in `add-card/setup` and
   `card/[id]/edit`. `CardForm`'s save still becomes the shared always-enabled Button (AC2/AC6).
4. **`TextField` gains a `mono` option**, and both card-number inputs use it. This takes Story 21.6's
   hand-off, and add and edit now agree.

### Debug Log References

- Baseline before the first edit: **197 suites / 2636 tests green, 0 snapshots**. After: **202 / 2788**,
  coverage 94.15 % statements · 87.94 % branches · 89.24 % functions · 94.76 % lines (gate 80 %).
- `yarn lint`, `typecheck`, `format:check`, `tokens:check`, `icons:check`, `frames:check`,
  `wear:catalogue:check`, `check:no-tests-folders`, `check:build-path-filters`,
  `check:story-catalogue-sync`, `check:native-patches`, `check:native-strings`: all green.
- **RNTL's `fireEvent.press` walks UP the element tree looking for `onPress`.** When the Button withheld
  its `Pressable` handler while busy, the test found and called the `Button`'s own `onPress` _prop_.
  That was a test artefact, not app behaviour. The fix guards inside real handlers, which is robust in
  both.
- **RN 0.83 `Pressable` (`Pressable.js:235-236`) overwrites `accessibilityState.disabled` whenever
  `disabled` is non-null.** A busy button therefore cannot use `disabled` to refuse presses, or it is
  announced as "dimmed". It guards its handlers instead.
- **`yarn storybook` (dev mode) cannot load any story, on untouched `origin/main` too** (verified in a
  throwaway worktree). `expo-modules-core/src/LegacyEventEmitter.ts` does `import invariant from
'invariant'`, and `.storybook/main.ts` excludes `expo-modules-core` from pre-bundling. The production
  `build-storybook`, which is the path Chromatic uses, builds and renders every story.
- **Storybook never animated the sheet.** Its Babel config reproduced the app's Unistyles plugin but
  not its Reanimated one. Without that plugin, `useAnimatedStyle` cannot see the shared values its
  updater reads, so on web a style is computed once and never moves. Measured on cold loads in
  headless Chromium, the sheet stories showed no sheet on 6 of 6: 5 never moved, and 1 froze at 7.75 %.
  A build of the pre-fix sheet failed the same way, 5 of 5, so the earlier Storybook check had been a
  lucky warm load. With the plugin added, 12 of 12 cold loads across the three sheet stories settle.
- **Chromatic cannot pause a JavaScript animation**, so the sheet stories set
  `chromatic.prefersReducedMotion: 'reduce'`. With reduced motion emulated, the sheet appears
  settled on the first frame (3 of 3). That also verifies the Reduce Motion rule on web.
- **`CI=1 npx expo start` (the local `metro` config) does not watch files.** It serves them as they
  were at startup, so every in-app check after an edit needs a Metro restart. A "fixed" recording of
  stale code once looked identical to the defect.
- **In-app motion was checked frame by frame**: `simctl io recordVideo`, then ffmpeg at 60 fps and a
  per-frame diff. Only the frames showed that both native Modal animations move the whole modal.
- **`react-native-worklets` 0.7.4 deprecates `runOnJS` for `scheduleOnRN`**, which the sheet uses. Jest
  stubs `scheduleOnRN` by hand in `jest.setup.js`. The package's own `src/mock` is TypeScript under a
  path `transformIgnorePatterns` leaves untransformed, and it replaces `globalThis.requestAnimationFrame`
  in every suite that loads it.

### Completion Notes List

- **AC1 — the six primitives, in `shared/components/ui/`.**
  - New:
    - `PrimaryActionFooter`: a 1pt full-width hairline rule, 24pt padding (or 16 on the grid), and the
      bottom inset unless the screen already pads it.
    - `Tile`, plus `FavouriteBadge`, `getTileAppearance` and `getHighlightBorder`.
    - `SectionHeader`.
    - `Surface`: tonal fill, 1pt hairline, 16 radius, with optional full-width row rules.
  - Extended `TextField`:
    - New `FieldLabel` and `FieldError` exports.
    - `ref` as a React 19 prop.
    - `maxLength` and `showCharacterCount`.
    - `mono`.
  - Corrected `BottomSheet`:
    - The grabber is 36 × 4, fully rounded, solid `theme.border`, 8 from the top.
    - Radius 16 on the top corners only.
    - Ink scrim at 40 %; the description sits 8 below the title.
    - Height capped at 80 %, so a long list scrolls inside the sheet.
  - `CardShell` stays the separate hero surface it is.
- **AC2 — the footer and the busy rule.**
  - The footer is in flow, `flexShrink: 0`, never absolute.
  - `CardForm`'s save is always enabled. Pressing it on an incomplete form shows both field errors,
    and React Hook Form focuses the first invalid field through `field.ref` (`shouldFocusError`). A
    test pins the focus; it was mutation-checked, going red with `shouldFocusError: false`.
  - A busy `Button` keeps its fill, shows a spinner, ignores presses and is announced
    `{ busy: true, disabled: false }`.
  - **Busy wins over disabled**, because `CardSetupScreen` passes both.
  - The one sanctioned disabled control, the destructive gate, is its label at 40 %.
- **AC3 — flat depth.**
  - `CardTile` loses its iOS shadow and Android `elevation: 3`.
  - Press feedback is a 0.98× scale, not a 70 % dim.
  - A light brand's hairline is now `theme.border` instead of an 8 % black wash, because the hairline
    took over the shadow's job. Measured in the same binary, a white brand (CRAI) held its edge on cream
    only with the new hairline.
  - A latent defect fixed on the way: `highlightCardId` is never cleared, so a just-added tile stays
    `highlighted` all session. After the ring faded, the old worklet set `borderWidth` to 0, erasing a
    light brand's outline. `getHighlightBorder` now hands back the resting outline; it is a worklet
    unit-tested on its own, because the Reanimated mock returns `{}` for animated styles.
  - The tile's column is now bound to the tile width, so the name truncates at the tile. Before, a
    centring parent (the single-card state) let a long name run wider than its tile.
- **AC4 — stories and the count.**
  - Four new story modules, plus new stories:
    - `Button`: `DestructiveGated`, `DestructiveBusy`.
    - `TextField`: `CardNumber`, `WithCharacterCount`.
    - `BottomSheet`: `ConfirmDestructive`.
  - `stories.test.tsx` goes from 7 to **11** modules, and every story renders in light and dark (76
    tests).
  - `build-storybook` succeeds.
- **AC4b — the height follows the token.**
  - `Button` and `TextField` read the token.
  - `Button.test` and `TextField.test` both feed a deliberately odd token (47), so a hardcoded 48
    fails either. `TextField` now reads `TOUCH_TARGET.min` directly, as `Button` does, rather than
    through the theme, which the Unistyles jest mock fixes when the tests set up.
  - Default buttons grow from 44 to 48 everywhere; `large` stays 52. Measured on the wallet, the grid
    starts about 8pt lower: 4 from the guest banner's buttons, 4 from the sort row.
- **AC5 / 16-30 — the scan banner clears the actions.**
  - The action stack is the overlay's one in-flow child (`justifyContent: 'flex-end'`).
  - The banner's `bottom` is the stack's **measured** height (`onLayout`) plus the frame's 16pt gap. It
    stays hidden until the stack has laid out.
  - Rejected: anchoring the banner at `bottom: '100%'` inside the stack. Its links would then sit outside
    their parent's bounds, where hit-testing is not guaranteed on every platform — the exact defect this
    fixes.
- **AC5 / 16-31 — the viewfinder follows the format.**
  - `getViewfinderSize` gives the wide frame, 300 × 120 at 393pt, derived from the width.
  - QR gets the square (70 % of the width). An undefined format gets the wide frame.
  - The format-to-shape table is an exhaustive `Record` over `BarcodeFormat`, so a new format fails to
    compile until someone picks its shape.
  - `ScanLine` sweeps `height − 4`, and the brackets stay 32 / 4 / 12.
  - The viewfinder layer stays centred on the whole screen, as frame B draws it.
- **AC5 / 16-32 — `destructive`.**
  - An exhaustive `switch` with a `never` default, plus a `@ts-expect-error` fixture that fails
    `typecheck` if it ever stops being needed.
  - Borderless `theme.error` text, and a pressed wash of 8 % of its own label colour.
  - `grep variant="destructive"` finds `SignOutSheet.tsx:52` and `DeleteAccountSheet.tsx:64` and `:104`.
    **All three change visibly** from red slabs to red text; see the verification table.
- **AC5 / 16-33 — the touch target.**
  - `TOUCH_TARGET` is `{ min: 48 }` in `tokens/spacing.json`, regenerated, and
    `tokens.generated.test.ts` asserts that shape.
  - Sweep: `grep -rnw 44 features shared app`.
    - **Converted:**
      - `GuestModeBanner` `?? 44` fallback.
      - The feature `ColorPicker` swatches.
      - `ModeSelectionScreen`: back button, the title's balancing margin, and "What's the difference?".
      - `InfoTooltipModal` close.
      - `FeatureHighlightsScreen` Skip.
      - `WelcomeScreen` sign-in link.
      - `app/_layout.tsx` header buttons (+, gear, back).
    - **Not touch targets, left alone:**
      - `ModeOptionCard`'s icon plate (the card is the target).
      - `WelcomeScreen` `marginTop: 44` (spacing).
      - `EmptyState` SVG `cy={44}`.
      - `luminance.ts` prose.
      - 11 test fixtures that mock the theme with 44 (mocks, not layouts; follow-up 9).
  - **Two layouts changed shape.** Five 48pt swatches overflow a fixed gap on a 375pt iPhone (the shared
    picker needs 336 of 327) or a 360dp Android (the edit form's picker needs 304 of 296), so both
    pickers now use `space-between`, as the form frame draws them.
  - `gridLayout.ts` is untouched.
- **AC6 — `CardForm` on the shared field.**
  - It uses `TextField`, `FieldLabel` and the shared `Button`.
  - The hardcoded `#6B7280`, `#EF4444` and `#9CA3AF` are gone, and so is radius 8.
  - Error testIDs follow the `TextField` convention: `card-name-input-error` and `barcode-input-error`.
    The only consumer, `CardForm.test`, is updated.
  - The format row is an uppercase label over a plain value, with no box.
  - The "Saving..." string is now the busy button's accessible name.
- **AC7 — uppercase labels.**
  - Labels are uppercased by `textTransform`, so the string stays sentence case for screen readers.
  - Tracking comes from the `labelBold` token: 0.26pt, verified.
  - The colour pickers' labels, in the feature picker and `CardSetupScreen`, use the same
    `FieldLabel`, so neither form mixes two casings.
- **AC8 — the picker adopts the shared sheet.**
  - `MultiCodePickerSheet` now renders through `BottomSheet`.
  - Its rows run edge to edge, aligned with the title on the 24pt margin.
  - Removed:
    - Its "adjustable" drag handle, which announced a gesture that did not exist.
    - An unreachable scrim label.
    - Their three locale keys, from both locales.
  - Found while adopting: the shared sheet's content was a `Pressable`, which is accessible by default,
    so **on iOS VoiceOver saw every sheet as ONE element** and could not reach its buttons. The failing
    test proved it (`accessible === true` on the old code). Now the scrim and sheet are siblings: the
    scrim is hidden from assistive tech, the sheet is a modal container, and the VoiceOver escape gesture
    dismisses it.
  - **The motion, as delivered and checked frame by frame in the app.** A native Modal animation moves
    the WHOLE modal: `slide` carried the scrim up like a curtain, and the picker's `fade` made the
    sheet see-through while it rose. So the Modal presents with no animation of its own. Reanimated
    fades the scrim and slides the sheet together over 220 ms, and the sheet travels `100%` of its own
    height (a React Native 0.75+ percentage translate) rather than a window height. With the window
    height, a short sheet was off the screen for most of the slide and vanished in about 40 ms on
    close. Measured after: about 217 ms in and out, with the sheet opaque throughout.
  - **The Modal outlives `visible` by the slide-out**, so a closing sheet leaves on screen:
    - It opens in the same render as `visible` (a guarded state update during render).
    - It takes no touches while it leaves.
    - Only a FINISHED slide-out takes it down, through `scheduleOnRN`. A cut-short one can report in
      after a re-open and a second close.
    - On Android, React Native's Modal unmounted its children the moment `visible` went false, so no
      slide-out ever played there. Now one does, though that is unverified on a device (this host has
      no Android AVD).
  - **The picker used to return `null` in the render that closed it.** `BrandScannerScreen` derives
    both of its props from one list, and every way out empties that list, so the guard unmounted the
    sheet before its slide-out could start. The picker now always renders its sheet and keeps the
    last list it showed, so it slides out with its rows.
- **AC9 — the two absolute footers are converted.**
  - `ScannerOverlay`, as above.
  - `BarcodeScanner` gets the same treatment. It has no production consumer; see follow-up 6.
- **AC10 — radius and heights.** `Button` radius goes from 14 to **12**; default height is the touch
  target, `large` is 52, inputs 48.
- **AC11 — `cardi-design-system.md` and its sources.**
  - Added:
    - A primitives table.
    - The **section-header** transcription, with the tier table (`overline` for a group, `labelBold` for
      one field), the colour ruling, and "capitals are a style".
    - The **sheet** transcription, citing 21.6 AC5b's `sheetTitle`, with the 16/24 content spacing, the
      motion and the a11y rules.
    - The hairline surface.
    - Input fields: mono, the error idiom, the height from the token.
  - Rulings and amendments:
    - The tile mark is **85 %**, not 60 %, and both wallet-prompt sites are corrected.
    - The light-brand hairline.
    - Destructive has **no icon**.
    - The 12px button radius.
    - The type-to-confirm **disabled carve-out**, cross-referenced from Forbidden.
    - `display-lg` weight is **700**, not 800 (21.6's hand-off).
    - The touch-target note is marked applied.
  - Already done by 21.2, verified and not re-applied: the favourite plate (AC9) and the card-accent
    detail-field exemption (AC7). Already done by 21.5: the frontmatter `screen-margin: 24px`.
  - Margins:
    - The three live prompts are corrected from 20 to 24.
    - The README's cited items (the "three answers" finding, open items 3 and 7) and three more
      same-class claims (`:34`, the grid-margin note, the document table) are corrected.
    - `stitch-prompt-01-form-pattern.txt` is **left alone**: it is marked SUPERSEDED, a record of what
      was sent.
  - The capture prompt's banner is restated as sitting above the stack, not "96px".
  - The settings frame F `.field-label` and its prompt now use `label-bold`.
  - The watch grammar §5.4 is marked applied.
- **AC12.** Tile geometry is unchanged, and the three frozen copies are untouched and green.

#### Verification

| check                                                           | result                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Storybook, production build, light and dark                     | **Performed.** Tile (favourite, light brand, near-black), surface (divided), mono field and busy footer render to spec. The sheet stories did **not**, until `.storybook/main.ts` gained the Reanimated plugin (see Debug Log). Since then 12 of 12 cold loads settle, light and dark.                                                                         |
| iOS 26.5 simulator, fresh Debug build, wallet light and dark    | **Performed.** Branch and `main` JS were served into the same binary. The header buttons are 48pt in the native bar, their glass capsules ~4pt wider, the bar height unchanged, nothing clipped. Tiles are flat, and CRAI's hairline holds on cream.                                                                                                           |
| 16-33 AC6, dense-list before/after (settings or the brand list) | **Performed on iOS.** Settings, branch against `main` in the same binary, light and dark: the `ActionRow`s, whose `minHeight` is the token, grow from 44 to 48, a list shifting about 4pt per row. Reached through the JS debugger (`router.push`), because the simulator panel's taps were unavailable. Not performed on Android: this host has no phone AVD. |
| 16-32 AC6, sign-out and delete-account sheets in-app            | **Not performed in-app.** Both need a signed-in session, and this build has no Supabase configuration. The same shape is shown in Storybook (`ConfirmDestructive`, `DestructiveGated`).                                                                                                                                                                        |
| The nine sheets on the reworked `BottomSheet`                   | **Performed for 2 of the 8 settings sheets** (theme picker, export confirmation), branch against `main`, light and dark: grabber, radius, ink scrim. The motion was checked frame by frame on the theme sheet, in and out (AC8). The other six settings sheets and the picker share the primitive but were not opened.                                         |
| Cascades to screens outside the File List                       | **Performed.** `TextField`'s uppercase label reaches the four auth screens that render it, through `TextField` and `PasswordInput`. Sign In was checked, branch against `main`, light and dark. Settings' section headers move from `textTertiary` to `textSecondary` with `SectionHeader`, checked the same way.                                              |
| 16-30 AC5, a real image-scan failure                            | **Not performed.** The simulator has no camera. Covered by a measured-layout test; needs ifero's device.                                                                                                                                                                                                                                                       |
| 16-31 AC6, EAN-13 and QR framing, time-to-first-scan            | **Not performed.** Needs a camera. Geometry is unit-tested; the UX claim stays unmeasured, as 16-31 itself allows.                                                                                                                                                                                                                                             |
| Chromatic                                                       | Runs on the PR (path-filtered to `shared/components/ui/**`). Not run locally.                                                                                                                                                                                                                                                                                  |

#### Found, not fixed

Filed for triage as #251 with the device checks still owed, numbered as below.

1. **TextField versus the form frames** — the label gap is 6 (frames 8), the input's horizontal padding
   12 (16), and the fill `surfaceElevated` (frames white). This is Story 22.6's, which implements the
   form states.
2. **Sheet bodies.** Six of the eight settings sheets (all but the two pickers) still draw a 40pt icon
   above the title. The sheets use 10 / 12 / 14pt gaps, and their action stacks sit 14 to 18 below the
   body rather than 24. The two confirm sheets also stack Cancel **above** the destructive action, at
   the default 48pt: Story 13.6's deliberate "inverted CTA order", which the Cardì frames reverse.
   `cardi-design-system.md` _Sheets_ flags them so they are not read as the reference. This is Story
   22.7's.
3. **`NoCodeFoundBanner`** keeps a `warning-amber` icon (capture prompt E says no icon) and 16pt margins
   (the prompt says 24). This is Story 22.5's.
4. **`MultiCodePickerSheet`** has 56pt rows (prompt D says 64), a Cancel drawn in error red, and
   hardcoded English in each row's accessibility label (`'Barcode'`, `code`). This is Story 22.5's.
5. **`ActionRow`'s outlined variant is radius 14**, which is neither 12 nor 16.
6. **`BarcodeScanner` has no production consumer.** It is only re-exported from
   `features/cards/index.ts`, and is a deletion candidate.
7. **A favourite is not announced to screen readers.** The tile's label is the card name alone.
8. **`Button` no longer reads `theme.onError`**, now that the destructive button has no fill. The
   token itself is still live: `SyncErrorBanner.tsx:75` and `MigrationBanner.tsx:90` colour their
   Retry labels with it. Recorded so nobody mistakes it for an orphan.
9. **Stale test fixtures** mock the theme with `touchTarget: { min: 44 }`: 6 auth screens, `PasswordInput`
   and `GuestModeBanner`. Three shared tests mock `TOUCH_TARGET: { min: 44, recommended: 48 }`, a key
   that does not exist.
10. **`yarn storybook` dev mode is broken on `main`** (see Debug Log).
11. **`CardSetupScreen` passes `disabled={isLoading}` alongside `loading`.** It is harmless now that busy
    wins, and is Story 22.6's to drop.
12. **On a 667pt-tall screen the scan banner covers the viewfinder's instruction line** for its five
    seconds. It is an overlay on the feed, as designed, and never overlaps the actions.
13. **`BarcodeFlash.tsx` still calls `runOnJS`** (`:81`, `:88`, `:113`), which `react-native-worklets`
    0.7.4 deprecates in favour of the `scheduleOnRN` the sheet now uses.
14. **Storybook's story canvas is only as tall as its content**: 32pt in the sheet stories. A sheet's
    scrim therefore lies over the bare iframe page, so a dark snapshot shows a light scrim.
    `.storybook/StoryDecorator.tsx` is unchanged from `main`.
15. **`highlightCardId` is never cleared.** It is set at `features/cards/screens/HomeScreen.tsx:85`
    and never reset, so a just-added card stays `highlighted` all session. Any tile that mounts with
    it still set replays the beam ring. This predates the story (`main`'s tile has the same effect),
    and the wallet is Story 22.2's.

### File List

New:

- `shared/components/ui/PrimaryActionFooter.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/SectionHeader.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/Surface.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/Tile.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/theme/colors.test.ts`

Modified — primitives and theme:

- `shared/components/ui/BottomSheet.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/Button.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/ColorPicker.tsx`, `.test.tsx`
- `shared/components/ui/TextField.tsx`, `.test.tsx`, `.stories.tsx`
- `shared/components/ui/index.ts`, `shared/components/ui/stories.test.tsx`
- `shared/components/ConflictComparisonCard.tsx`
- `shared/theme/tokens.generated.ts` (regenerated), `shared/theme/tokens.generated.test.ts`,
  `shared/theme/typography.ts`, `shared/theme/colors.ts`, `tokens/spacing.json`
- `shared/i18n/locales/en.ts`, `shared/i18n/locales/it.ts`
- `jest.setup.js`, `.storybook/main.ts`

Modified — consumers:

- `app/_layout.tsx`
- `features/add-card/components/BrandList.tsx`
- `features/add-card/components/MultiCodePickerSheet.tsx`, `.test.tsx`
- `features/add-card/components/ScannerOverlay.tsx`, `.test.tsx`
- `features/add-card/screens/BrandScannerScreen.test.tsx`
- `features/add-card/screens/CardSetupScreen.tsx`, `.test.tsx`
- `features/add-card/screens/CardTypeSelectionScreen.test.tsx`
- `features/auth/components/GuestModeBanner.tsx`
- `features/cards/components/BarcodeScanner.tsx`, `.test.tsx`
- `features/cards/components/CardDetails.tsx`
- `features/cards/components/CardForm.tsx`, `.test.tsx`
- `features/cards/components/CardTile.tsx`, `.test.tsx`
- `features/cards/components/ColorPicker.tsx`, `.test.tsx`
- `features/onboarding/components/InfoTooltipModal.tsx`
- `features/onboarding/screens/FeatureHighlightsScreen.tsx`, `ModeSelectionScreen.tsx`, `WelcomeScreen.tsx`
- `features/settings/components/SettingsSection.tsx`

Modified — design docs and tracking:

- `docs/design/cardi/cardi-design-system.md`, `cardi-watch-grammar.md`, `README.md`
- `docs/design/cardi/stitch-prompts-capture.txt`, `-document.txt`, `-settings.txt`, `-wallet.txt`
- `docs/design/cardi/frames/cardi-settings-frames.html`
- `docs/ux-designs/2-9-scan-from-image.md` (the picker's accessibility contract and the touch-target figures)
- `docs/sprint-artifacts/sprint-status.yaml`, `docs/sprint-artifacts/stories/22-1-design-system-components.md`
- `docs/sprint-artifacts/stories/16-30-…`, `16-31-…`, `16-32-…`, `16-33-…` (`Status: absorbed`, pointing here)

### Change Log

- 2026-09-27 — Implemented Story 22.1:
  - Six primitives.
  - The four absorbed defects (16-30 to 16-33).
  - `TOUCH_TARGET` becomes `{ min: 48 }`, with the watch key retired.
  - The AC11 design-system transcription and authority sweep.
  - After code review and in-app verification: the sheet motion reworked (an opaque sheet that slides
    its own height, in a Modal that outlives the slide-out), and Storybook given the app's Reanimated
    transform.
  - Status set to `review`.
- 2026-09-28 — The four absorbed defect stories set to `absorbed`, and the follow-ups filed as #251.
