---
name: Cardì
colors:
  background: '#F0F0E8'
  surface: '#FFFFFF'
  surface-container-lowest: '#FFFFFF'
  surface-container-low: '#F7F7F1'
  surface-container: '#F0F0E8'
  surface-container-high: '#E8E8DE'
  surface-container-highest: '#E0E0D5'
  surface-dim: '#E0E0D5'
  surface-bright: '#FFFFFF'
  surface-variant: '#E8E8DE'
  on-surface: '#181824'
  on-surface-variant: '#55555F'
  on-background: '#181824'
  outline: '#9A9A93'
  outline-variant: '#D6D6CB'
  inverse-surface: '#181824'
  inverse-on-surface: '#F0F0E8'
  primary: '#181824'
  on-primary: '#FFFFFF'
  primary-container: '#2A2A3A'
  on-primary-container: '#FFFFFF'
  inverse-primary: '#FCCC0C'
  tertiary: '#FCCC0C'
  on-tertiary: '#181824'
  tertiary-container: '#FCCC0C'
  on-tertiary-container: '#181824'
  error: '#C41E1E'
  on-error: '#FFFFFF'
  error-container: '#FBDDDD'
  on-error-container: '#7A0E0E'
  ink: '#181824'
  beam: '#FCCC0C'
  cream: '#F0F0E8'
  card-red: '#E42424'
  card-blue: '#0C3C84'
  card-azure: '#0C84CC'
  card-green: '#0C843C'
  card-yellow: '#FCCC0C'
  dark-background: '#000000'
  dark-surface: '#181824'
  dark-surface-container: '#20202E'
  dark-on-surface: '#F0F0E8'
  dark-outline: '#3A3A48'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 34px
    fontWeight: '800'
    lineHeight: 40px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  label-bold:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.5rem
  DEFAULT: 0.75rem
  md: 0.75rem
  lg: 1rem
  xl: 1.25rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  touch-target: 48px
  screen-margin: 24px
---

## Brand & Style

**Cardì** is a loyalty-card wallet. Its entire job is one moment: a person is at a
checkout, someone is waiting behind them, and the right barcode must be on screen and
scannable in under three seconds. Everything in this system serves that moment or gets cut.

The name is _card_ + the Italian **ì**. The grave accent on that ì is the brand's only
ornament: at rest it is a dot, in motion it is a **scan beam** passing over a barcode.
That single idea — _you hold it up, and it is seen_ — is the whole identity.

**The accent descends.** A grave falls left to right: its high end is on the **left**, like
a backslash. An acute rises, and `Cardí` is a different word — so this is spelling, not
styling, and there is no variant where it leans the other way. The mechanical form of the
rule matters more than the typographic one, because the trap is a sign convention: in both
SVG and CSS the y-axis points **down**, so a _positive_ rotation is the correct one.

    rotate(35)     ✓  grave — descends to the right.  Cardì
    rotate(-35)    ✗  acute — rises to the right.     Cardí

Every exploration sheet in `frames/` was drawn with the negative angle until 2026-08-25,
while this document said "grave" throughout. Prose naming the accent did not prevent it;
only the sign does. If the shape is sheared rather than round-capped, flipping the sign is
also not sufficient on its own — mirror the outline, or the beam silently changes length
(at 24 × 9 units and 35°, a naive negation grows it to 30.3 and breaks containment).

**The ì sits on the baseline, and the anchoring ships with the glyph.** When the mark
replaces the letter inside live type, it is an inline SVG in a box exactly `1em` tall whose
own baseline is drawn at `y = 70` of a 100-unit viewBox. Left alone, an inline SVG aligns
its **box bottom** to the text baseline, which floats the glyph by the remaining
`(100 − 70) / 100 = 0.30em` — 15.6px at 52px, and unmistakable. The correction is therefore
not a tuned nudge but a derived one:

    vertical-align: -0.30em      /* = (100 − BASELINE) / 100 */

Carry it as an **inline `style` on the `<svg>`**, never as a stylesheet rule. This has been
wrong twice: first as a guessed `translateY(size * 0.28)`, then because a new sheet reused
the glyph markup without copying the `.wglyph` CSS. An `<svg>` missing its `vertical-align`
does not look broken in review — it looks like an `<svg>` — so the only reliable fix is to
make the anchoring inseparable from the markup it corrects.

The visual language is **warm, flat and structural**. Paper, not glass. No gradients, no
drop shadows, no glassmorphism, no neon. Depth comes from tonal layers and hairline
outlines. The app should feel like good stationery: calm, tactile, obviously useful.

## Navigation — HARD RULES, NEVER VIOLATE

These are product constraints, not preferences. A design that breaks them is wrong even
if it is beautiful.

- **There is NO bottom tab bar.** Never draw one. Not "Cards / Search / Settings", not
  any variant, not even a subtle one.
- **There is NO floating action button (FAB).** Never draw one.
- The real navigation is: **one Home screen** with a header carrying `+` on the **left**
  and a **gear** on the **right**. Everything else is a **stack push** from Home, or a
  **full-screen modal** for the barcode.
- Never invent global navigation chrome. If a screen seems to need a new nav pattern, the
  screen is wrong — simplify the screen instead.

## Colors

### The content is the colour — read this before anything else

This app's home screen already carries **45 distinct brand colours**: Esselunga yellow,
Coop red, IKEA blue, Lidl blue, Decathlon cyan, and fifty more. They arrive with the data.
The wallet is _already_ vivid, and it is vivid in a way we do not control.

So the palette below is **not there to make the app colourful — it is there to stay out of
the way of colour that already exists.** Chrome is quiet so the brands can be loud. Any
proposal that tints, washes, overlays or recolours a card surface is overpainting somebody
else's identity and making the screen harder to scan, not more playful. Playfulness in
Cardì comes from **big, uncropped, correctly-coloured brand marks** — a layout decision,
never a palette one.

One concrete collision to respect: **Esselunga is `#FFCC00` and the beam is `#FCCC0C`** —
effectively the same yellow, and Esselunga is likely the most-used card in the app. Never
put a large yellow chrome surface adjacent to the grid, or that tile disappears into the
furniture. Beam stays small, and stays away from the tiles.

### Three roles, and they never trade jobs

- **Ink `#181824`** — structure, body text, borders, and **all primary actions in light
  mode**. Buttons are ink with white text. This is the brand's dark, not a neutral grey.
- **Beam `#FCCC0C`** — the signature. The ì accent, the scan-beam motif, focus rings,
  active/selected states, and **all primary actions in dark mode**. Always pair with ink
  text (`#181824`), never white.
- **Cream `#F0F0E8`** — the light-mode ground. Cards sit on cream as pure white
  `#FFFFFF`. Cream is where the warmth comes from; do not replace it with grey or white.

**There is no fourth chrome colour, and `#0C3C84` is not one — RETIRED 2026-09-16 (Story 21.2).**
Deep blue was listed here as _"secondary structure only (barcode-modal chrome, informational
emphasis)"_, and the frontmatter carried it as `secondary` / `secondary-container` /
`on-secondary-container`. That role contradicted this document twice over, so the contradiction is
resolved by removing the role rather than by softening either rule:

- `#0C3C84` **is one of the five card accents** (see below), and Forbidden carries _"card accent
  colours used as chrome"_. A colour cannot be both the fallback fill of a user's card and the
  app's secondary structure — on a card-detail screen for a deep-blue custom card, the chrome and
  the content would be the same value, which is the one thing the accents exist not to do.
- The role's only named use — **barcode-modal chrome** — is independently forbidden by
  _Barcode view_: _"The surround must be neutral — black, ink, cream or white only. Never a
  saturated field around the scan target."_ `#0C3C84` is saturated.

The two prompts that reason from the retired role (`stitch-prompts-auth.txt:96`,
`stitch-prompts-onboarding.txt:87-89`) cite it **only to rule it out** before settling on ink, so
their conclusions stand unchanged and are in fact strengthened: deep blue was the one alternative
they had to argue against, and it is now simply not available. `theme.link` and `theme.info` take
**ink** in light and, since a link is an action, **beam** in dark — the same pair as `primary`.

**A card accent is legal as the card's OWN full-bleed detail field, and illegal everywhere else.**
This is the one exemption to _"card accent colours used as chrome"_, and it is narrow on purpose.
The card-detail screen's inset, header and hero are a single unbroken region filled with **that
card's** accent — the spec's _"three separately filled boxes leave visible hairlines where they
meet"_ — and the 56px header with its back chevron and favourite star is part of that region, not
chrome laid over it. The test is ownership, not geometry: the field belongs to the card being
looked at. An accent tinting a button, a link, an icon, a nav bar, a badge, or any surface that
outlives the card on screen is still forbidden, and a card accent is never the value of a theme
token. `#0C843C` is bound by exactly the same logic, which is why `theme.success` does not take it.

**Never darken, desaturate or tint the beam.** Olive, mustard, gold, amber and brown are
forbidden — they are the failure mode of tonal colour generation, not design choices. If a
darker yellow seems needed, use **ink** instead. `#FCCC0C` appears at exactly that value or
not at all.

**Beam under alpha is the rule's blind spot, and it has a threshold — ADDED 2026-09-16 (Story
21.2).** "Never darken the beam" is easy to keep when you are choosing a hex and easy to break when
you are writing `theme.primary + '33'`, because the token still says `#FCCC0C` and only the
_rendered_ pixels are a darker yellow. The composite is measurable, and what decides it is how
light it gets — not how saturated, which over a black ground stays high at every alpha and tells
you nothing:

| alpha | over black | over ink  | reads as          |
| ----- | ---------- | --------- | ----------------- |
| 8 %   | `#141001`  | `#2A2622` | warm near-black ✓ |
| 10 %  | `#1A1501`  | `#2F2A22` | warm near-black ✓ |
| 20 %  | `#322902`  | `#463C1F` | **olive** ✗       |
| 45 %  | `#725C05`  | `#7F6919` | **olive** ✗       |
| 75 %  | `#BD9909`  | `#C39F12` | **mustard** ✗     |

So: **beam may be washed at 10 % or less**, where it is a tonal layer and reads as warmth rather
than as a colour, and **not above it**, where it becomes exactly the olive-to-mustard ramp the
Forbidden list names. A shape that must read _as_ beam is drawn at full `#FCCC0C`; a shape that
must be a quiet layer takes ink, cream or `surface-container`. This only bites in dark mode,
because in light `primary` is ink and an ink wash is a grey.

**Coral, salmon, terracotta and orange are banned from this system entirely.**

### Card accents — CUSTOM CARDS ONLY

Five colours, taken directly from the logo's five bars:
`#E42424` red · `#0C3C84` deep blue · `#0C84CC` azure · `#0C843C` green · `#FCCC0C` yellow.

These are the **fallback fill for a card with no catalogue brand**, chosen by the user from
a 5-colour picker. A card that _has_ a brand uses the brand's hex instead — the five
accents never override it.

They are **never** used for buttons, links, chrome, headers, icons or any interactive
element, and never as a tint or wash over a branded tile — with the single exemption named
under _Three roles_: an accent may fill **its own card's** full-bleed detail field, header
included, because there it is the content rather than the chrome.

> ## ⛔ OPEN — RAISED 2026-09-17 (Story 21.2a). AZURE CANNOT CARRY AA TEXT.
>
> **This document owes an answer before the rebrand release ships.** It is not an
> implementation question; the code is complete and gated either way.
>
> `#0C84CC` sits in the contrast dead zone: **no** foreground reaches WCAG AA 4.5:1 on it.
> White is 4.05:1 and ink — the better of the two — is 4.34:1. Choosing differently cannot
> fix it.
>
> | accent              | foreground the app picks | contrast   | AA 4.5:1  |
> | ------------------- | ------------------------ | ---------- | --------- |
> | `#0C3C84` deep blue | white                    | 10.53:1    | ✅        |
> | `#E42424` red       | white                    | 4.59:1     | ✅ (thin) |
> | `#0C843C` green     | white                    | 4.79:1     | ✅        |
> | `#FCCC0C` yellow    | ink                      | 11.53:1    | ✅        |
> | **`#0C84CC` azure** | white (best: ink 4.34)   | **4.05:1** | ❌        |
>
> Why it matters rather than being academic:
>
> - It is **reachable in ordinary use**. The card-detail header draws the card's name at 17px
>   weight 600 — under both WCAG large-text thresholds (24px regular, 18.66px bold) — directly
>   on the accent, under the _Three roles_ exemption above.
> - It is the **default**. Azure is the accent an unresolvable card colour falls back to, so it
>   is not only what a user picks, it is what they get when nothing was picked.
> - It is a **regression**. The colour it replaced was `#64748B`, which passed at 4.76:1.
> - There is **no OTA remedy**. `runtimeVersion.policy` is `appVersion`, so this ships in a
>   store release that cannot be corrected without another one.
> - The same colour puts the favourite star at 2.66:1 against a 3:1 non-text floor. In
>   aggregate the star still improves — the retired palette failed on two accents and this one
>   fails on one — but azure specifically regressed.
>
> Three ways out, all measured:
>
> 1. **Accept the exception**, on the grounds that a card's own field is content rather than
>    chrome. Costs nothing and changes no colour; ships a real AA failure on a default.
> 2. **Darken the azure to `#0B7CC0`** — about 6% down its own hue, where white clears at
>    4.51:1 (`#0C7FC4` is still short at 4.33:1). Fixes every surface at once — phone, both
>    watches, the picker — but amends this palette, so the frames and generators under
>    `docs/design/cardi/` that cite `#0C84CC` drift until regenerated.
> 3. **Give the card-detail header large text** (≥18.66px bold), moving that surface's floor to
>    3:1 so 4.05:1 passes legitimately. Narrowest change, touches no token — but it fixes one
>    screen and leaves the tile and both watch avatars where they are, and the type scale
>    belongs to Story 21.6.
>
> The numbers are pinned in `shared/theme/colors.contrast.test.ts` (`Card accent contrast`), so
> they cannot drift while this stays open. ⚠️ **That test PASSES** — it records the measurement
> rather than failing on it, so nothing mechanical blocks a merge. The only thing holding this
> open is this note.

## Typography

**Space Grotesk** for display and large headlines — it carries the personality; its slightly technical, quirky letterforms echo the barcode.
**Inter** for everything else — it carries the legibility. **JetBrains Mono** for card
numbers, so digits align and don't jitter while someone reads them aloud.

Thin weights are prohibited. Minimum body size is 15px. Headlines use tight tracking;
small labels use slightly open tracking.

**Form field labels are UPPERCASE** — `label-bold` (Inter 13px, weight 600, +0.02em
tracking), ink, sitting above the field. This ratifies deliberately what the generator
originally chose by accident, on two grounds: that positive tracking already in the token is
an uppercase idiom, and casing the label differently from its value is what lets someone
parse a form's structure at a glance — which is exactly how a read-only row is kept from
reading as a control. Both locales' labels are short enough that the extra width costs
nothing (`Store name` / `Nome negozio`, `Card number` / `Numero carta`), so this is a voice
decision, not a constraint. Placeholders, values and error messages stay sentence case.

## Layout & Spacing

- **Frames — and this rule governs SCREEN designs only.** A screen design is a drawing of a
  surface the app renders. **Artwork canvases are not screens** and this rule has never been
  aimed at them; they are listed at the end of this section so that no reading of it can
  forbid the icons and banners the app has to ship. Three screen classes exist, and only
  three:

  | class       | frame                                             | unit    |
  | ----------- | ------------------------------------------------- | ------- |
  | **Phone**   | **393 × 852** — iPhone-class portrait             | pt / dp |
  | **Wear OS** | **192 × 192**, drawn **round _and_ square**       | dp      |
  | **watchOS** | seven size classes, **162 × 197** → **205 × 251** | pt      |

  No desktop, no tablet, no arbitrary heights. The two watch classes are not licence to
  invent a third layout language: what may be drawn inside them is
  [`cardi-watch-grammar.md`](cardi-watch-grammar.md), which is **part of this system**, not
  an appendix to it.

  **The Wear frame is stated in dp deliberately.** `384 × 384` is the same screen counted in
  **pixels**, at the ×2 density every current Wear device uses; it circulates because Play's
  store-screenshot floor happens to be 384 px. Setting that number beside `393 × 852` — which
  is points — makes a watch look as wide as a phone. It is **less than half**. Google's own
  guidance is dp and round-first: draw at **192 dp**, the smallest supported round screen,
  and let 225 dp and above grow into the space.

  **The watchOS classes, measured** — from Xcode's own simulator device profiles. The table
  lives in `targets/watch/__tests__/watch-layout-contract.test.ts` and in no source file.
  40 mm is the floor because the watch target deploys to watchOS 10:

  | 40 mm     | 41 mm     | 42 mm     | 44 mm     | 45 mm     | 46 mm     | 49 mm     |
  | --------- | --------- | --------- | --------- | --------- | --------- | --------- |
  | 162 × 197 | 176 × 215 | 187 × 223 | 184 × 224 | 198 × 242 | 208 × 248 | 205 × 251 |

  Two traps in that table. The **widest** watch is the **46 mm at 208 pt**, not the 49 mm
  Ultra — "design for the biggest" picks the wrong device. And the 44 mm is **narrower** than
  the 42 mm (184 against 187) while being taller, so the classes do not order by one
  dimension. Draw against **40 mm**, then check the **46 mm** and the **49 mm**.

  **Artwork canvases, which this rule does not govern:** the 1024² app-icon masters — watchOS
  has its own, while Wear's densities are downscaled from the phone's shared 1024² source, and
  **both mask to a circle**, not the phone's squircle — the four Android launcher
  mipmaps at 162² / 216² / 324² / 432², the 512² Play icon and its alpha variant, the
  1024 × 500 Play banner and the 4096 × 2304 developer banner. Square or landscape by
  requirement, every one of them.

- Strict **8px grid**; 4px only for micro-adjustment.
- Screen margin **24px**. Vertical gap between list rows **8px**.
- Every interactive element is at least **48 × 48pt**.

> **Both of those numbers were settled by the grid above, on 2026-08-21, and each artefact
> lost one.** This document said margin 20 / target 48; the generated tokens said margin 24 /
> target 44. Neither "the code is the truth" nor "the design system is the truth" gets both
> right — each frame scores exactly half. The grid does better, and the grid is stated here, so
> this document adjudicated against itself:
>
> | value                                | ×8   | verdict      |
> | ------------------------------------ | ---- | ------------ |
> | `TOUCH_TARGET.min` = 44              | 5.50 | **off grid** |
> | touch target 48                      | 6.00 | on grid      |
> | screen margin 20                     | 2.50 | **off grid** |
> | `LAYOUT.screenHorizontalMargin` = 24 | 3.00 | on grid      |
> | grid margin 16 (derived, tested)     | 2.00 | on grid      |
>
> **Margin is 24, not 20.** 20 is 2.5 × 8. The "4px for micro-adjustment" clause does not
> rescue it: a screen margin is the most structural measurement on a page, and if _that_ is a
> micro-adjustment the grid means nothing. This also retires the "margin drift" note kept
> against settings and the scanner — both sit at 24 because they follow the token, and the token
> was right. `CardForm` at 32 and the old document 48 were the only genuine one-offs.
>
> **Touch target is 48, not 44** — and here the token is the one that moves. Two independent
> grounds. `app.json` declares **both** platforms, and a minimum binding on two platforms is the
> **max** of their minimums: Apple HIG 44pt, Material 48dp, so 48. And 44 is off the grid, by
> the same test and with the same non-defence available to it.
>
> **The two margins that remain are 24 and 16**, and 16 is not a style choice: `TILE_WIDTH` 171
> in `features/cards/utils/gridLayout.ts` is `(390 − 2×16 − 16) / 2`, frozen with tests. Both
> are on the grid.
>
> **⚠️ APPLIED 2026-09-24 (Story 21.5) — the ruling above had never been applied to the block it
> ruled on.** This document's own frontmatter still said `screen-margin: 20px` a month after
> adjudicating that margin is 24, so the file contradicted itself on the one value the
> adjudication was written to settle. It now reads 24, matching both the prose here and
> `LAYOUT.screenHorizontalMargin` in `tokens/spacing.json`. Nothing parses this frontmatter — the
> generators and frame tools cite this file in comments only — so the correction changes no
> generated output; it removes a contradiction a reader would otherwise have to adjudicate again.
>
> **⛔ The touch-target half is still OPEN, and deliberately not fixed here.** This document and
> its frontmatter both say 48; `TOUCH_TARGET.min` in `tokens/spacing.json` is still **44**, and
> `TOUCH_TARGET.watch` is **32** against the same adjudicated 48. Moving them is a behavioural
> change across every touch target in three apps, and the token is owned by **Story 22.1** — see
> the tracker. A store-artwork story is the wrong place for it.

- The **phone** home screen is a **2-column grid of brand tiles** (see Card tile). This is the
  shipped layout and it is correct — do not replace it with a single-column list of rows. **The
  watch list is single-column rows and is correct too**, for the opposite reason: a 192 dp screen
  fits one tile, so there is nothing for a grid to be a grid of. See
  [`cardi-watch-grammar.md`](cardi-watch-grammar.md) §7.1.
- Stack-pushed screens (detail, add, edit, settings) are single-column, content-first.

## Shape

- Cards and sheets: **16px** radius.
- Buttons and inputs: **12px** radius.
- Virtual-logo tiles and chips: **fully round**.
- Consistent everywhere; no mixed radii within one screen.
- **On the watch the card row is 14, not 16** — a radius is a proportion of what it rounds, and 16
  on a 48 pt row reads as a pill. Excepted, with the reason, in
  [`cardi-watch-grammar.md`](cardi-watch-grammar.md) §5.5.

## Elevation

Flat. **No drop shadows anywhere.** Hierarchy is colour blocking plus a **1px** hairline
outline (`#D6D6CB` in light, `#3A3A48` in dark). Tap feedback is a **0.98× scale**, never a
shadow bloom.

## Components

### Card tile (the core component)

A **2-column grid** of tiles at a **171 : 140** ratio, 16px radius, width derived from the
viewport. The card name sits in `label-bold` **below** the tile, never inside it.

**The tile is filled with the brand's own colour and carries the brand's own logo**, sized
generously — roughly 85% of the tile. A card belonging to a catalogue brand shows that
brand's hex and mark, not ours. Only a **custom** card (no brand) falls back to one of the
five card accents with a first-letter avatar.

Legibility rules that follow from filling with 45 different brand colours: a very light
brand takes a 1px hairline outline so it doesn't dissolve into cream; a near-black brand
takes a `#3A3A48` outline in dark mode. Foreground glyphs flip to white or ink by the
tile's luminance. A favourite shows as a **beam `#FCCC0C` star on an opaque ink `#181824`
plate**, 24px, pinned top-right, so it stays legible on any brand colour including yellow.

**The plate is opaque and it is ink — AMENDED 2026-09-16 (Story 21.2, AC9), replacing "an opaque
white plate".** White was invisible on a light brand, which is the case the plate exists for, and
the star it carried was an amber outside this palette. Opacity is load-bearing rather than
stylistic: Esselunga is `#FFCC00`, three points from beam, so the plate is the only thing between
the star and the tile people open most. On the **card-detail header** there is no plate and none is
added — a plate there would break the single filled region above — so the star is drawn straight on
the brand's colour and falls back from beam to ink on a light field.

### Buttons

- **Primary:** ink fill, white text, 12px radius, 52px tall, full width, anchored in the
  footer (see below).
- **Secondary:** transparent with a 1px ink outline.
- **Destructive:** borderless, `#C41E1E` text, trailing icon.
- **No FAB. Ever.**

### The primary-action footer

Every screen with a primary action **anchors it to the bottom of the frame**, separated from
the content above by a **1px hairline rule** (`#D6D6CB` light, `#3A3A48` dark) spanning the
full frame width. This is not a floating button and not a FAB — it is the last _region_ of
the page, in flow. The bottom is where the thumb already is, and holding one position across
all eight form-pattern screens is worth more than any single screen's composition.

The space this leaves above the rule on a short form is **composition, not absence.** The
hairline is what makes it read that way. Do not close the gap by letting the button rise to
meet the last field — that trades a predictable commit position for a per-screen one.

**Never `position: absolute`.** Either make the footer a **flex sibling below the scroll
area** inside the `KeyboardAvoidingView` (the reference implementation — see
`CardSetupScreen`, where the footer sits outside the `ScrollView` and therefore never
scrolls away), or, when the button must live inside scrollable content, anchor it with
`marginTop: 'auto'` in a `flexGrow: 1` container. An absolutely-positioned footer instead
either hides beneath the keyboard or rides above it, stealing height from the field being
typed into.

**The primary action is always enabled.** Pressing it on an incomplete form reveals the
field errors; it never sits inert. A permanently visible disabled button is a permanent
refusal that never says which field is wrong — and once the action is anchored, that refusal
is in the eye line for the whole session. `CardSetupScreen` already works this way
(`disabled={isLoading}` only, with validation raised on press); `CardForm` is the outlier
and gates on `!isValid`.

**Busy is not disabled.** While a submit is in flight the button is non-interactive to
prevent a double submit, but it keeps its **ink fill** and swaps its label for a spinner.
Greying it out re-introduces the refusal read this rule exists to remove — a busy control
says "working", a grey one says "no".

### Barcode view (the hero moment)

A full-screen modal that **always renders light regardless of theme**: pure white
container, true-black bars, maximum screen brightness. The store name sits above, the card
number below in `mono-code`. Nothing else on this screen — no nav, no chrome, no ads.

**Nothing may overlay the bars. Ever.** No beam, no scan-line, no shimmer, no watermark, no
logo, no gradient, no rounded mask cropping the code. Every pixel drawn on a barcode costs
contrast on the one screen that cannot afford any, and a first-try scan is the whole product.

**The surround must be neutral** — black, ink, cream or white only. Never a saturated field
around the scan target: at maximum brightness that is glare next to the thing a cashier is
trying to read.

**The beam is not ours to draw here.** The ì carries the beam as the brand's promise; the
real beam comes from the scanner at the till. On this screen the app's job is to hold up a
perfect white field and get out of the way. The beam motif belongs to the logo, the splash,
focus rings and loading states — never to the barcode.

### The beam rule, both halves

The prohibition above is only half a rule, and half a rule invites the wrong reading — that
because the brand's ornament _is_ a scan beam, a beam at the till would be on-brand. It would
not. The rule turns on **which way the light is travelling**:

| the barcode is…                                    | the beam                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------- |
| **displayed** — your card held up at the checkout  | **NEVER.** Nothing overlays the code, and the real beam comes from their scanner |
| **read** — someone else's code, through our camera | **REQUIRED.** We are the scanner, so the beam is ours to draw                    |

So the same 2px `#FCCC0C` line is forbidden on `barcode/[id]` and mandatory on
`add-card/scan`. Same mark, opposite verdict, and the deciding question is never "is this
on-brand?" but "who is doing the scanning?"

**On the two barcode surfaces** beam is drawn in exactly three places, and a fourth is a
bug: the scan line and the banner links on our own viewfinder, and a filled favourite star
where a card row shows one. It appears nowhere on the flash-at-checkout screen — not as a
line, not as a tint, not on the insets, not on the dismiss hint.

**That count is local to this section, and it is not a whole-system inventory.** It has
been read as one, which is why it needs saying. There is no fixed number of beam sites,
because beam is a **role** — named under _Three roles_ above — and it is drawn wherever the
role appears: the ì accent, the logo, the splash and loading states, focus rings, active and
selected states, the filled favourite star, and **every primary action in dark mode**. That
last entry alone exceeds three. So the rule to carry away is the role and its two
constraints — beam is always paired with ink text, never darkened or tinted, and never on a
barcode — not an arithmetic that was only ever true of the viewfinder.

### Input fields

1px outline, 12px radius, label **always visible above** the field (never floating), 48px
minimum height.

### Icons

One family, **outline style, 1.5px stroke, 24px** on a 48px target, ink-coloured, square
corners softened. Icons are chrome — they take ink or beam, never a card accent. No filled
icons, no duotone, no emoji as iconography.

**On the watch, 14–18 rather than 24** — 24-on-48 is a 50 % fill, which works only when the target
is otherwise empty, and a watch row is not. The part that carries unchanged is the sentence above
it: an icon is chrome and never takes a card accent. See
[`cardi-watch-grammar.md`](cardi-watch-grammar.md) §5.5.

### Illustrations

Illustrations are a **commissioned set**, not per-screen decoration. They appear **only**
in onboarding and true empty states — never on the wallet, barcode, settings or forms.
The set is flat, two-tone (ink line-work on cream) with **beam yellow as the single
accent**, no gradients and no third colour. Do not invent a new illustration style per
screen; if no illustration from the set fits, use none.

## Dark mode

Dark is not an inversion, it is the app's night face and it must be specified whenever a
dark screen is produced.

- Ground: **true black `#000000`** (OLED, zero power draw).
- Cards and sheets: **ink `#181824`**.
- Raised containers: `#20202E`. Outlines: `#3A3A48`.
- Body text: **cream `#F0F0E8`**, never pure white — it keeps the warmth.
- **Primary actions become beam `#FCCC0C` with ink text.** This inversion is deliberate:
  when the lights go out, the beam is the only thing left.
- The barcode modal ignores dark mode entirely and stays white.

## Forbidden

**An accent that rises to the right (`Cardí`)** · Bottom tab bars · floating action buttons · coral, salmon, terracotta or orange · drop
shadows · gradients · glassmorphism · darkened or muddied yellow · card accent colours used
as chrome (except a card's own detail field — see _Three roles_) · **a card accent as the value
of a theme token** · **anything overlaying a barcode, especially a drawn beam or scan-line** ·
**a saturated surround on the barcode screen** · **tinting, washing or recolouring a
branded card tile** · **replacing the PHONE home grid with a single-column list of rows** (the watch list is
single-column rows and is correct — see the watch grammar) ·
**a large yellow chrome surface next to the card grid** · **beam washed above 10 % alpha over a
dark ground** · thin font weights · desktop or
tablet frames · **a phone screen at any frame other than 393 × 852** · **a watch screen at
any frame not in the Frames table** · per-screen invented illustration styles ·
**a primary action that floats over content or is positioned absolutely** · **a disabled
button as a form's resting state**.
