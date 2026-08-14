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
  secondary: '#0C3C84'
  on-secondary: '#FFFFFF'
  secondary-container: '#D9E4F7'
  on-secondary-container: '#07275A'
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
  screen-margin: 20px
---

## Brand & Style

**Cardì** is a loyalty-card wallet. Its entire job is one moment: a person is at a
checkout, someone is waiting behind them, and the right barcode must be on screen and
scannable in under three seconds. Everything in this system serves that moment or gets cut.

The name is _card_ + the Italian **ì**. The grave accent on that ì is the brand's only
ornament: at rest it is a dot, in motion it is a **scan beam** passing over a barcode.
That single idea — _you hold it up, and it is seen_ — is the whole identity.

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
- **Deep blue `#0C3C84`** — secondary structure only (barcode-modal chrome, informational
  emphasis). Never the primary action colour.

**Never darken, desaturate or tint the beam.** Olive, mustard, gold, amber and brown are
forbidden — they are the failure mode of tonal colour generation, not design choices. If a
darker yellow seems needed, use **ink** instead. `#FCCC0C` appears at exactly that value or
not at all.

**Coral, salmon, terracotta and orange are banned from this system entirely.**

### Card accents — CUSTOM CARDS ONLY

Five colours, taken directly from the logo's five bars:
`#E42424` red · `#0C3C84` deep blue · `#0C84CC` azure · `#0C843C` green · `#FCCC0C` yellow.

These are the **fallback fill for a card with no catalogue brand**, chosen by the user from
a 5-colour picker. A card that _has_ a brand uses the brand's hex instead — the five
accents never override it.

They are **never** used for buttons, links, chrome, headers, icons or any interactive
element, and never as a tint or wash over a branded tile.

## Typography

**Space Grotesk** for display and large headlines — it carries the personality; its slightly technical, quirky letterforms echo the barcode.
**Inter** for everything else — it carries the legibility. **JetBrains Mono** for card
numbers, so digits align and don't jitter while someone reads them aloud.

Thin weights are prohibited. Minimum body size is 15px. Headlines use tight tracking;
small labels use slightly open tracking.

## Layout & Spacing

- **Frame: 393 × 852 (iPhone-class portrait). Design nothing else.** No desktop, no
  tablet, no square canvases, no arbitrary heights.
- Strict **8px grid**; 4px only for micro-adjustment.
- Screen margin **20px**. Vertical gap between list rows **8px**.
- Every interactive element is at least **48 × 48pt**.
- The home screen is a **2-column grid of brand tiles** (see Card tile). This is the shipped
  layout and it is correct — do not replace it with a single-column list of rows.
- Stack-pushed screens (detail, add, edit, settings) are single-column, content-first.

## Shape

- Cards and sheets: **16px** radius.
- Buttons and inputs: **12px** radius.
- Virtual-logo tiles and chips: **fully round**.
- Consistent everywhere; no mixed radii within one screen.

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
tile's luminance. A favourite shows as a small star on an opaque white plate pinned
top-right, so it stays legible on any brand colour including yellow.

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

Anchor it with `marginTop: 'auto'` inside a `flexGrow: 1` scroll container — **never
`position: absolute`.** The button then owns the bottom edge whenever the form is short
(which is every screen in this pattern) and scrolls naturally the moment content grows or
the keyboard shrinks the viewport. An absolutely-positioned footer instead either hides
beneath the keyboard or rides above it, stealing height from the field being typed into.

**The primary action is always enabled.** Pressing it on an incomplete form reveals the
field errors; it never sits inert. A permanently visible disabled button is a permanent
refusal that never says which field is wrong — and once the action is anchored, that refusal
is in the eye line for the whole session.

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

### Input fields

1px outline, 12px radius, label **always visible above** the field (never floating), 48px
minimum height.

### Icons

One family, **outline style, 1.5px stroke, 24px** on a 48px target, ink-coloured, square
corners softened. Icons are chrome — they take ink or beam, never a card accent. No filled
icons, no duotone, no emoji as iconography.

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

Bottom tab bars · floating action buttons · coral, salmon, terracotta or orange · drop
shadows · gradients · glassmorphism · darkened or muddied yellow · card accent colours used
as chrome · **anything overlaying a barcode, especially a drawn beam or scan-line** ·
**a saturated surround on the barcode screen** · **tinting, washing or recolouring a
branded card tile** · **replacing the home grid with a single-column list of rows** ·
**a large yellow chrome surface next to the card grid** · thin font weights · desktop or
tablet frames · any frame that is not 393 × 852 · per-screen invented illustration styles ·
**a primary action that floats over content or is positioned absolutely** · **a disabled
button as a form's resting state**.
