"""Build cardi-grave-vs-acute.html — the accent, drawn the right way round.

ifero caught a real bug: every variant on the sweep-35 sheet was drawn with a
NEGATIVE rotation, and in SVG the y-axis points down, so a negative rotation
lifts the right-hand end. That is an ACUTE accent. The whole sweep spells

    Cardí        not      Cardì

which is not the product's name. Italian ì is a GRAVE: it descends left to
right, like a backslash. The brand's entire premise, per
cardi-design-system.md, is "card + the Italian ì" — so drawing an acute does
not merely look different, it deletes the reason the mark exists.

Flipping the sign is one character. The reason this sheet exists is the
SECOND-ORDER consequence, which is not obvious and has to be looked at:

    An acute leans AWAY from the letter before it — its tall end is on the
    right, pointing into empty space past the ì.

    A grave leans TOWARD the letter before it — its tall end is on the LEFT,
    and in "Cardì" the letter to the left is `d`, whose ascender is the
    tallest thing in the word and whose stem sits on its RIGHT side, directly
    against the ì.

So the grave puts the accent's high corner and the d's ascender in the same
corner of the same space. That is a collision risk the acute never had, and it
is exactly what "contained" was already protecting against — which means
ifero's two choices (35° and contained) are not independent. Contained is not
a taste call any more; with a grave it is load-bearing.

This sheet therefore renders, for both accent directions:
  · the wordmark at 52 and 26
  · a zoomed d+ì detail with the ascender line drawn, so the clearance is
    measurable rather than felt
  · the square mark, where there is no neighbouring letter and the only
    question is whether a descending beam still reads as a scan

Geometry is carried over unchanged from the sweep: em space, 100-unit em,
baseline at y=70, x-height 49.6, advance 30.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for
# it, so frames/ is .prettierignore'd — Prettier would reformat the HTML
# and the two could never agree again. Run tools/verify.py to confirm every
# generator still reproduces its frame byte-for-byte.
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-grave-vs-acute.html"

INK, BEAM, CREAM, WHITE, MUTED = "#181824", "#FCCC0C", "#F0F0E8", "#FFFFFF", "#55555F"
RED = "#C41E1E"

BASELINE, XHEIGHT = 70.0, 49.6
STEM_TOP = BASELINE - XHEIGHT      # 20.4
ASCENDER = BASELINE - 70.0         # 0.0 — the top of the `d`
ADV = 30
CX = ADV / 2


def beam(angle, length=24, weight=9, cy=10.5):
    """One accent bar, sheared so its ends stay VERTICAL after rotation.

    `angle` is a plain SVG rotation: POSITIVE is clockwise, so positive
    descends to the right and is the GRAVE. Negative rises to the right and is
    the acute. The shear must follow the sign — the ends lean right for an
    acute and left for a grave — otherwise the cut ends come out oblique
    instead of vertical and the stroke stops looking like a broad nib.

    The grave is the acute MIRRORED about CX, not the acute with a flipped
    shear. Measured the hard way: simply negating `dx` moves the inset from one
    pair of corners to the other, which turns an inset parallelogram into an
    outset one and grows the unrotated width from `length` to `length + dx`.
    At length 24 / weight 9 / 35° that is 24 → 30.3, a 26% longer beam from an
    argument that did not change — and it broke containment, which is the one
    property the word depends on. Mirroring keeps the horizontal extent exactly
    `length` for either sign, so the two directions stay comparable.
    """
    x, y = CX - length / 2, cy - weight / 2
    a = weight * math.tan(math.radians(abs(angle)))
    if angle < 0:  # acute: top edge inset on the left, bottom inset on the right
        pts = [(x, y + weight), (x + a, y), (x + length, y), (x + length - a, y + weight)]
    else:          # grave: the mirror of that about CX
        pts = [(x + a, y + weight), (x, y), (x + length - a, y), (x + length, y + weight)]
    d = " ".join(f"{'M' if i == 0 else 'L'}{px:.2f} {py:.2f}" for i, (px, py) in enumerate(pts))
    shape = f'<path d="{d} Z" fill="var(--ac)" />'
    return f'<g transform="rotate({angle} {CX} {cy})">{shape}</g>'


def stem_single(w=12):
    return (f'<rect x="{CX - w / 2:.1f}" y="{STEM_TOP:.1f}" width="{w}" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="{w / 2:.1f}" fill="var(--fg)" />')


def stem_bars(cx=CX, top=STEM_TOP, bottom=BASELINE):
    h = bottom - top
    return (f'<rect x="{cx - 11:.1f}" y="{top:.1f}" width="4.5" height="{h:.1f}" '
            f'rx="2.2" fill="var(--fg)" />'
            f'<rect x="{cx - 4.5:.1f}" y="{top:.1f}" width="9" height="{h:.1f}" '
            f'rx="4.5" fill="var(--fg)" />'
            f'<rect x="{cx + 7:.1f}" y="{top:.1f}" width="4" height="{h:.1f}" '
            f'rx="2" fill="var(--fg)" />')


# ---------------------------------------------------------------------------
# The glyph as it sits INSIDE live type. The SVG box is exactly 1em tall and
# 0.30em wide, and `vertical-align: -0.30em` drops it so that y=70 in the box
# lands on the text baseline — so the drawn stem and the real letters share a
# baseline by construction rather than by a tuned nudge.
# ---------------------------------------------------------------------------
def wordglyph(angle):
    return (f'<svg class="wglyph" viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" height="1em" '
            f'style="display:inline;vertical-align:-{(100 - BASELINE) / 100:.2f}em;overflow:visible" '
            f'aria-hidden="true">{stem_single()}{beam(angle)}</svg>')


def word(angle, size):
    return (f'<span class="word" style="font-size:{size}px">Card'
            f'{wordglyph(angle)}</span>')


def mark(angle, size, mono=False, long_beam=True):
    """The square icon: barcode stem, beam crossing it."""
    cls = "tile is-mono" if mono else "tile"
    body = stem_bars() + beam(angle, length=52 if long_beam else 24,
                              cy=44 if long_beam else 10.5)
    return (f'<span class="{cls}" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="-6 -6 {ADV + 12} 100" width="{size}" height="{size}">'
            f'{body}</svg></span>')


# ---------------------------------------------------------------------------
# The collision detail. Real type for the `d`, the drawn glyph for the ì, and
# the ascender line ruled across both so the clearance can be SEEN.
# ---------------------------------------------------------------------------
D_ADV = 63.8   # Space Grotesk `d`, measured: 0.638em advance, 0.700em ink ascent


def detail(angle):
    """The d + ì pair with the type rules ruled across it.

    Everything lives in ONE svg in em space — 100 units to the em, baseline at
    y=70 — rather than CSS-positioned rules over live type. The first attempt
    did the latter and the rules were ~19px out, because with `line-height: 1`
    the text baseline is NOT at the padding edge: the line box is 1em tall but
    Space Grotesk's ascent+descent is 1.277em, so the negative half-leading
    lifts the baseline well above the box floor. Drawing the `d` as SVG <text>
    puts its baseline at exactly y=70 by definition, so the rules cannot drift.
    """
    rules = "".join(
        f'<line x1="0" y1="{y}" x2="200" y2="{y}" stroke="{RED}" stroke-width="0.6" '
        f'stroke-dasharray="3 2.4" opacity="{op}" />'
        f'<text x="200" y="{y - 2.4:.1f}" text-anchor="end" class="rlabel">{label}</text>'
        for y, label, op in (
            (0.0, "ascender 0.700em", 0.85),
            (BASELINE - 49.6, "x-height 0.496em", 0.5),
            (BASELINE, "baseline", 0.9),
        )
    )
    ital = (f'<g transform="translate({D_ADV} 0)">'
            f'{stem_single()}{beam(angle)}</g>')
    return (f'<div class="detail">'
            f'<svg viewBox="-6 -20 206 104" width="100%">'
            f'{rules}'
            f'<text x="0" y="{BASELINE}" class="dchar">d</text>'
            f'{ital}'
            f'</svg></div>')


ROWS = [
    ("GRAVE — Cardì", 35, True,
     "The name. The accent DESCENDS left to right. Its tall end is on the "
     "left, so it leans back toward the d — which is why the clearance below "
     "has to be checked rather than assumed."),
    ("acute — Cardí", -35, False,
     "What the whole sweep-35 sheet was actually drawing. A different word. "
     "Kept here only so the difference is visible side by side, and because "
     "it shows how much easier the spacing is when the accent leans away "
     "from its neighbour."),
]

rows = []
for name, angle, chosen, note in ROWS:
    rows.append(f'''      <section class="row {'is-chosen' if chosen else 'is-wrong'}">
        <div class="meta">
          <h2>{name}</h2>
          <p>{note}</p>
        </div>
        <div class="specimens">
          <div class="spec"><em>word 52</em>{word(angle, 52)}</div>
          <div class="spec"><em>word 26</em>{word(angle, 26)}</div>
          <div class="spec"><em>mark 84</em>{mark(angle, 84)}</div>
          <div class="spec"><em>30</em>{mark(angle, 30)}</div>
          <div class="spec"><em>mono</em>{mark(angle, 84, mono=True)}</div>
        </div>
        <div class="zoom">
          <em>d + ì, ruled — does the accent clear the ascender?</em>
          {detail(angle)}
        </div>
      </section>''')

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — grave, not acute</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — the accent, drawn the right way round.

         Every variant on the sweep-35 sheet used a NEGATIVE SVG rotation.
         SVG's y-axis points down, so a negative rotation lifts the right
         end: that is an ACUTE. The sheet spelled Cardí throughout.

         The fix is a sign. The reason this sheet exists is what the sign
         changes downstream: an acute's tall end is on the RIGHT, pointing
         into the empty space after the ì, while a grave's tall end is on
         the LEFT, aimed straight at the d — whose ascender is the tallest
         thing in the word, and whose stem sits on the d's RIGHT side,
         immediately against the ì.

         So the grave puts two tall shapes in the same corner. The ruled
         detail below is there to measure that rather than eyeball it.
         ================================================================== */

      :root {{
        --ink: {INK};
        --beam: {BEAM};
        --cream: {CREAM};
        --white: {WHITE};
        --muted: {MUTED};
        --fg: var(--ink);
        --ac: var(--beam);
      }}

      * {{
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }}

      body {{
        background: var(--cream);
        font-family: Inter, system-ui, sans-serif;
        color: var(--ink);
        padding: 40px 32px 64px;
      }}

      header h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 26px;
        letter-spacing: -0.02em;
      }}

      header p {{
        font-size: 15px;
        line-height: 22px;
        color: var(--muted);
        max-width: 74ch;
        margin-top: 8px;
      }}

      .row {{
        padding: 28px 0 32px;
        border-bottom: 1px solid #d6d6cb;
      }}

      .meta h2 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 19px;
      }}

      .row.is-chosen .meta h2::after {{
        content: ' ✓ correct';
        font-family: Inter, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: #1f7a3d;
      }}

      .row.is-wrong .meta h2::after {{
        content: ' ✕ wrong word';
        font-family: Inter, sans-serif;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        color: {RED};
      }}

      .meta p {{
        font-size: 15px;
        line-height: 22px;
        color: var(--muted);
        margin-top: 4px;
        max-width: 74ch;
      }}

      .specimens {{
        display: flex;
        gap: 40px;
        align-items: flex-end;
        margin-top: 24px;
        flex-wrap: wrap;
      }}

      .spec {{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
      }}

      .spec em,
      .zoom > em {{
        font-style: normal;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }}

      .word {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--ink);
        white-space: nowrap;
      }}

      /* The glyph sits in the text run like a letter: 1em tall, dropped by
         0.30em so its y=70 lands exactly on the baseline. `overflow: visible`
         because the crossing beam in the mark leaves the 0..30 box. */

      .tile {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ink);
        border-radius: 22%;
        --fg: var(--white);
      }}

      .tile.is-mono {{
        --fg: var(--white);
        --ac: var(--white);
      }}

      /* ---- the ruled collision detail ---- */
      .zoom {{
        margin-top: 32px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }}

      .detail {{
        position: relative;
        max-width: 620px;
        background: var(--white);
        border: 1px solid #d6d6cb;
        border-radius: 8px;
        padding: 16px 20px;
        overflow: visible;
      }}

      /* Space Grotesk metrics, in the same em space the glyph is drawn in:
         ascender 0.700em and x-height 0.496em above the baseline. The word
         below sits at font-size 150px with 40px of bottom padding, so the
         baseline is 40px up from the box floor and each rule is a fixed
         multiple of 150px above that. */
      .rule {{
        position: absolute;
        left: 0;
        right: 0;
        border-top: 1px dashed {RED};
        opacity: 0.5;
      }}

      .rule em {{
        position: absolute;
        right: 8px;
        top: 2px;
        font-style: normal;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: {RED};
      }}

      /* Type drawn as SVG, so the rules are in the same space as the glyph. */
      .dchar {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 100px;
        fill: var(--ink);
      }}

      .rlabel {{
        font-family: Inter, sans-serif;
        font-size: 3.2px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        fill: {RED};
      }}
    </style>
  </head>
  <body>
    <header>
      <h1>The accent was drawn backwards</h1>
      <p>
        Every variant on the sweep-35 sheet used a negative SVG rotation. SVG's y-axis points
        down, so a negative rotation lifts the right-hand end — an <strong>acute</strong>. The
        sheet spelled <em>Cardí</em> from end to end. The name is <em>Cardì</em>: Italian grave,
        descending left to right.
      </p>
      <p>
        The fix is one character. This sheet is about the part that isn't automatic: an acute's
        tall end points right, into the empty space after the ì, while a grave's tall end points
        <strong>left, straight at the d</strong> — the tallest letter in the word, whose ascender
        stem sits on its right side, immediately against the ì. The ruled details below put the
        ascender, x-height and baseline across both so the clearance can be measured instead of
        felt.
      </p>
    </header>
{chr(10).join(rows)}
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT} — {len(HTML.splitlines())} lines")
