"""Build cardi-brand-lockup.html — round two: the glyph sits on the BASELINE,
and the accent is explored properly.

ifero: "the i should be using the same baseline otherwise it looks completely odd
and disjointed." Correct, and it was a real bug rather than a preference. Round
one positioned the glyph with a GUESSED translateY(size * 0.28) plus negative
margins — no relationship to the text baseline at all, so the stem floated
independently of the word it belongs to.

MEASURED Space Grotesk Bold, via canvas TextMetrics:

    x-height          0.496 em
    ascender (d)      0.700 em
    lowercase i       0.266 em advance, 0.714 em tall including the tittle

So the glyph is now built in em space and anchored to the baseline:

    the SVG box is 1em tall, viewBox 100 units = 1em
    the BASELINE sits at y = 70   (ascender is 0.70em above it)
    the stem runs y = 20.4  ->  y = 70      (x-height to baseline)
    the accent lives above y = 20.4, topping out near y = 0
    vertical-align: -0.30em drops the box bottom 0.30em below the text
    baseline, which lands the baseline exactly on y = 70

The advance width is 0.30em rather than a square box, so letter-spacing does
not lie; the accent overhangs via overflow: visible rather than by widening the
letter.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for
# it, so frames/ is .prettierignore'd — Prettier would reformat the HTML
# and the two could never agree again. Run tools/verify.py to confirm every
# generator still reproduces its frame byte-for-byte.
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-brand-lockup.html"

# ---- em-space geometry, from the measured font -----------------------------
BASELINE = 70.0          # y of the baseline in the 100-unit em box
XHEIGHT = 49.6           # above the baseline
STEM_TOP = BASELINE - XHEIGHT      # 20.4
ADV = 30                 # advance width in the same units (0.30em)
CX = ADV / 2             # stem centre

# Each accent is (label, note, svg). They all sit above STEM_TOP and all share
# the same stem, because the stem is settled and the accent is what is being
# explored.
def stem(w=12):
    return (f'<rect x="{CX - w / 2:.1f}" y="{STEM_TOP:.1f}" width="{w}" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="{w / 2:.1f}" fill="var(--fg)" />')


ACCENTS = {
    "sweep20": ("Sweep · 20°",
                "The current one. Overhangs the stem on both sides.",
                f'<rect x="{CX - 17:.1f}" y="6" width="34" height="9" rx="4.5" '
                f'fill="var(--ac)" transform="rotate(20 {CX} 10.5)" />'),
    "sweep35": ("Sweep · 35°",
                "Steeper. Reads faster, more like a stroke in motion.",
                f'<rect x="{CX - 17:.1f}" y="6" width="34" height="9" rx="4.5" '
                f'fill="var(--ac)" transform="rotate(35 {CX} 10.5)" />'),
    "flat": ("Flat bar · 0°",
             "No rotation at all. Calm, and closest to a macron than a grave.",
             f'<rect x="{CX - 15:.1f}" y="6" width="30" height="9" rx="4.5" '
             f'fill="var(--ac)" />'),
    "tight": ("Contained · 20°",
              "Same angle, but never wider than the stem's own column.",
              f'<rect x="{CX - 8:.1f}" y="7" width="16" height="8" rx="4" '
              f'fill="var(--ac)" transform="rotate(20 {CX} 11)" />'),
    "taperbeam": ("Tapered beam · 20°",
                  "Wider at the leading end, so the sweep has a direction.",
                  f'<path d="M{CX - 17:.1f} 7 L{CX + 17:.1f} 11 L{CX + 17:.1f} 17 '
                  f'L{CX - 17:.1f} 15 Z" fill="var(--ac)" '
                  f'transform="rotate(20 {CX} 11)" />'),
    "dot": ("Dot · at rest",
            "The other half of the idea: at rest it is a dot. The still frame.",
            f'<circle cx="{CX}" cy="11" r="5.5" fill="var(--ac)" />'),
}


def glyph_svg(key, barcode=False):
    body = ACCENTS[key][2]
    if barcode:
        s = (f'<rect x="{CX - 11:.1f}" y="{STEM_TOP:.1f}" width="4.5" '
             f'height="{BASELINE - STEM_TOP:.1f}" rx="2.2" fill="var(--fg)" />'
             f'<rect x="{CX - 4:.1f}" y="{STEM_TOP:.1f}" width="8" '
             f'height="{BASELINE - STEM_TOP:.1f}" rx="4" fill="var(--fg)" />'
             f'<rect x="{CX + 7:.1f}" y="{STEM_TOP:.1f}" width="3.5" '
             f'height="{BASELINE - STEM_TOP:.1f}" rx="1.7" fill="var(--fg)" />')
    else:
        s = stem()
    return s + body


def sym_defs():
    out = []
    for key in ACCENTS:
        out.append(f'<symbol id="g-{key}" viewBox="0 0 {ADV} 100" overflow="visible">'
                   f'{glyph_svg(key)}</symbol>')
        out.append(f'<symbol id="b-{key}" viewBox="0 0 {ADV} 100" overflow="visible">'
                   f'{glyph_svg(key, barcode=True)}</symbol>')
    return ('  <svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + "".join(out) + '</svg>')


def word(key, size, barcode=False, cls=""):
    """Card + the letter, anchored to the text baseline in em units."""
    pre = "b-" if barcode else "g-"
    return (f'<span class="word {cls}" style="font-size:{size}px">Card'
            f'<svg class="wglyph" viewBox="0 0 {ADV} 100" '
            f'width="{ADV / 100:.2f}em" height="1em"><use href="#{pre}{key}" />'
            f'</svg></span>')


def tile(key, size):
    """The standalone mark: the SAME glyph, but composed for a square rather than
    for a line of type.

    In the word the glyph is baseline-anchored, so its box carries the font's
    descender space below the baseline. Reusing that box inside a square leaves a
    band of dead air under the mark and the whole thing sits low. So the tile
    crops to the INK — from just above the accent to just below the baseline —
    and lets the square centre that. One glyph, two compositions."""
    # The ink spans y = 2..72 and x = about -2..32, so its centre is (15, 37).
    # Frame it with a SQUARE viewBox rather than shrinking the render: a 105-unit
    # side puts the 70-unit-tall mark at ~67% of the tile, which is where Apple
    # and Google both want an icon's glyph to sit.
    side = 105.0
    cx, cy = CX, 37.0
    return (f'<span class="tile" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="{cx - side / 2:.1f} {cy - side / 2:.1f} {side} {side}" '
            f'width="{size}" height="{size}" overflow="visible">'
            f'<use href="#b-{key}" /></svg></span>')


rows = []
for key, (label, note, _) in ACCENTS.items():
    rows.append(f'''      <div class="row">
        <div class="meta">
          <h2>{label}</h2>
          <p>{note}</p>
        </div>
        <div class="specimens">
          <div class="stack">{word(key, 56)}<span class="cap">wordmark · 56</span></div>
          <div class="stack">{word(key, 28)}<span class="cap">28</span></div>
          <div class="stack">{tile(key, 88)}<span class="cap">mark</span></div>
          <div class="stack">{tile(key, 32)}<span class="cap">32</span></div>
        </div>
      </div>''')

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — the accent, six explorations</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — THE ACCENT, explored. Round two.

         ROUND ONE HAD A REAL BUG, not a preference: the glyph was positioned
         with a GUESSED translateY(size * 0.28) and negative margins, with no
         relationship to the text baseline. The stem floated independently of
         the word it belongs to, which is why it read as disjointed.

         MEASURED Space Grotesk Bold, via canvas TextMetrics:

             x-height        0.496 em
             ascender (d)    0.700 em
             lowercase i     0.266 em advance, 0.714 em tall with its tittle

         So the glyph is now built in em space and anchored to the baseline:

             the SVG box is 1em tall and 100 viewBox units = 1em
             the BASELINE sits at y = 70, since the ascender is 0.70em above it
             the stem runs y = 20.4 -> y = 70, x-height down to baseline
             the accent lives above y = 20.4
             the box is 0.30em WIDE, near the real i advance of 0.266em, so
             letter-spacing does not lie — the accent overhangs by
             overflow: visible rather than by widening the letter

         WHAT IS BEING EXPLORED, now the rest is settled: only the accent. The
         stem is fixed, because the previous round established that the stem
         varies with available space (single in the word, barcode in the mark)
         while THE BEAM IS THE CONSTANT that joins them. So the accent is the
         one shape that has to work everywhere, and it is the only variable
         here.

         Every row shows the same accent in all four places it must live: the
         wordmark large, the wordmark small, the mark, and the mark small.
         ================================================================== */

      :root {{
        --ink: #181824;
        --beam: #fccc0c;
        --cream: #f0f0e8;
        --white: #ffffff;
        --hairline: #d6d6cb;
        --muted: #55555f;
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
        padding: 48px 32px 80px;
      }}

      h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 28px;
        letter-spacing: -0.02em;
      }}

      header p {{
        font-size: 15px;
        line-height: 22px;
        color: var(--muted);
        max-width: 66ch;
        margin-top: 8px;
      }}

      .row {{
        display: flex;
        gap: 40px;
        align-items: center;
        padding: 28px 0;
        border-bottom: 1px solid var(--hairline);
      }}

      .meta {{
        flex: 0 0 240px;
      }}

      .meta h2 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 20px;
      }}

      .meta p {{
        font-size: 15px;
        line-height: 22px;
        color: var(--muted);
        margin-top: 4px;
      }}

      .specimens {{
        display: flex;
        gap: 36px;
        align-items: flex-end;
        flex-wrap: wrap;
      }}

      .stack {{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }}

      .cap {{
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }}

      .word {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: var(--ink);
        line-height: 1;
        white-space: nowrap;
      }}

      /* THE FIX. The box is 1em tall with the baseline at y=70 of its viewBox,
         so dropping the box 0.30em below the text baseline lands the glyph's
         baseline exactly on the text's. No magic numbers, no negative margins:
         the two now share one baseline because the geometry says so. */
      .wglyph {{
        display: inline;
        vertical-align: -0.30em;
        overflow: visible;
      }}

      .tile {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--ink);
        border-radius: 22%;
        --fg: var(--white);
        --ac: var(--beam);
      }}

      .rule {{
        position: relative;
      }}

      /* A hairline drawn ON the baseline, so "does it sit on the baseline?" is
         answered by looking rather than by trusting. */
      .rule::after {{
        content: '';
        position: absolute;
        left: -8px;
        right: -8px;
        bottom: 0;
        border-bottom: 1px dashed #c41e1e;
      }}
    </style>
  </head>
  <body>
    <header>
      <h1>The accent — six explorations</h1>
      <p>
        The stem is settled: it varies with the space available, single inside the word and a
        barcode inside the mark, because the beam is what joins them. So the accent is the one
        shape that has to work everywhere, and it is the only variable on this sheet. Each row
        shows the same accent in all four places it lives. The glyph is now built in em units
        from the measured font and anchored to the text baseline, which round one did not do.
      </p>
      <p style="margin-top: 12px">
        <span class="rule" style="display: inline-block; padding-bottom: 2px">
          <span class="word" style="font-size: 44px">Card<svg class="wglyph"
            viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" height="1em"><use
            href="#g-sweep20" /></svg></span></span>
        <span class="cap" style="margin-left: 12px">the dashed rule is the text baseline</span>
      </p>
    </header>
{sym_defs()}
{chr(10).join(rows)}
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines, {len(ACCENTS)} accents")
