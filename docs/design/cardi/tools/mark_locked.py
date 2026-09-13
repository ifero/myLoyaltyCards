"""Build cardi-mark-locked.html — the chosen mark, with the accent the right way round.

ifero's choice, carried over exactly: 35°, contained (length 24, weight 9,
round caps). The only thing that changes here is the DIRECTION — the accent now
descends left to right, because the name is Cardì and every earlier sheet drew
Cardí.

One decision is still open, so this sheet frames it rather than settling it:
the word wants a contained accent (it is a real grave, and it clears the d),
but the square icon has no neighbouring letter and a 24-unit tick is very small
at 30px and in the Android themed layer. So both options are drawn at every
size the asset has to survive:

  A  floating   the contained accent used unchanged in both places
  B  crossing   contained in the word, a 52-unit beam through the bars in the icon

Sizes are the real ones: 84 (in-app header), 48 (favicon), 30 (list row / small
favicon), 16 (where detail dies), plus the one-colour silhouette for Android 13
themed icons and the dashed circle marking Android's 66% adaptive-icon safe zone.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for
# it, so frames/ is .prettierignore'd — Prettier would reformat the HTML
# and the two could never agree again. Run tools/verify.py to confirm every
# generator still reproduces its frame byte-for-byte.
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-mark-locked.html"

INK, BEAM, CREAM, WHITE, MUTED = "#181824", "#FCCC0C", "#F0F0E8", "#FFFFFF", "#55555F"
RED = "#C41E1E"

BASELINE, XHEIGHT = 70.0, 49.6
STEM_TOP = BASELINE - XHEIGHT
ADV = 30
CX = ADV / 2

ANGLE = 35          # POSITIVE = descends to the right = grave. Never negative.
LEN_WORD = 24       # "contained": stays inside the letter's own advance
LEN_MARK = 52       # the crossing beam, for the icon only
WEIGHT = 9

# Both options use the SAME canvas side, so the stems are genuinely comparable,
# but each is centred on its OWN content — which is how each would be exported.
# Floating content spans y 0..70 (accent top to baseline), centre (15, 35);
# crossing content spans y 20.4..70 with the beam reaching x -8.9..38.9,
# centre (15, 45.2). 70 units of glyph in a 92-unit canvas is ~76% fill, the
# normal range for an iOS icon.
MARK_SIDE = 92.0
MARK_CENTRES = {False: (CX, 35.0), True: (CX, 45.2)}
SAFE_R = 0.66 * MARK_SIDE / 2   # Android's adaptive-icon safe circle


def mark_viewbox(crossing):
    cx, cy = MARK_CENTRES[crossing]
    return (f"{cx - MARK_SIDE / 2:.1f} {cy - MARK_SIDE / 2:.1f} "
            f"{MARK_SIDE:.0f} {MARK_SIDE:.0f}")


def beam(angle=ANGLE, length=LEN_WORD, weight=WEIGHT, cy=10.5):
    """Round-capped accent bar, rotated about its own centre.

    A round-capped rect is symmetric about that centre, so for THIS cap style
    negating the angle is already a true mirror and no shear correction is
    needed. (The sheared cap is the one where a naive sign flip silently
    changes the beam's length — see cardi-design-system.md.)
    """
    x, y = CX - length / 2, cy - weight / 2
    return (f'<rect x="{x:.2f}" y="{y:.2f}" width="{length}" height="{weight}" '
            f'rx="{weight / 2:.2f}" fill="var(--ac)" '
            f'transform="rotate({angle} {CX} {cy})" />')


def stem_single(w=12):
    return (f'<rect x="{CX - w / 2:.1f}" y="{STEM_TOP:.1f}" width="{w}" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="{w / 2:.1f}" fill="var(--fg)" />')


def stem_bars():
    h = BASELINE - STEM_TOP
    return (f'<rect x="{CX - 11:.1f}" y="{STEM_TOP:.1f}" width="4.5" height="{h:.1f}" '
            f'rx="2.2" fill="var(--fg)" />'
            f'<rect x="{CX - 4.5:.1f}" y="{STEM_TOP:.1f}" width="9" height="{h:.1f}" '
            f'rx="4.5" fill="var(--fg)" />'
            f'<rect x="{CX + 7:.1f}" y="{STEM_TOP:.1f}" width="4" height="{h:.1f}" '
            f'rx="2" fill="var(--fg)" />')


# --- the word -------------------------------------------------------------
# 1em-tall box, baseline at y=70, dropped 0.30em so the drawn stem and the real
# letters share a baseline by construction rather than by a tuned nudge.
def wordglyph():
    return (f'<svg class="wglyph" viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" height="1em" '
            f'style="display:inline;vertical-align:-{(100 - BASELINE) / 100:.2f}em;overflow:visible" '
            f'aria-hidden="true">{stem_single()}{beam()}</svg>')


def word(size, cls=""):
    return (f'<span class="word {cls}" style="font-size:{size}px">Card{wordglyph()}</span>')


# --- the icon -------------------------------------------------------------
def mark(crossing, size, mono=False, safe=False):
    body = stem_bars() + (beam(length=LEN_MARK, cy=44) if crossing else beam())
    cx, cy = MARK_CENTRES[crossing]
    ring = (f'<circle cx="{cx}" cy="{cy}" r="{SAFE_R:.1f}" fill="none" stroke="{RED}" '
            f'stroke-width="1.1" stroke-dasharray="4 3" opacity="0.9" />') if safe else ""
    cls = "tile is-mono" if mono else "tile"
    return (f'<span class="{cls}" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="{mark_viewbox(crossing)}" width="{size}" height="{size}">'
            f'{body}{ring}</svg></span>')


def sizes_row(crossing):
    cells = [("84", mark(crossing, 84)), ("48", mark(crossing, 48)),
             ("30", mark(crossing, 30)), ("16", mark(crossing, 16)),
             ("mono", mark(crossing, 84, mono=True)),
             ("safe zone", mark(crossing, 84, safe=True))]
    return "".join(f'<span class="s"><em>{lab}</em>{svg}</span>' for lab, svg in cells)


HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — the locked mark</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — THE LOCKED MARK.

         35°, contained, round caps — ifero's choice, unchanged. The accent
         now DESCENDS left to right, which is what a grave does and what the
         name requires. Every earlier sheet used a negative SVG rotation and,
         because SVG's y-axis points down, drew an acute: Cardí.

         One question is left open on purpose. The word wants the contained
         accent; the icon may not survive it at 30px. Both are drawn below at
         every size the asset actually ships at.
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
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      body {{
        background: var(--cream);
        font-family: Inter, system-ui, sans-serif;
        color: var(--ink);
        padding: 36px 32px 56px;
      }}
      h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 26px; letter-spacing: -0.02em;
      }}
      h2 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 18px; margin-bottom: 2px;
      }}
      p {{ font-size: 14.5px; line-height: 21px; color: var(--muted); max-width: 76ch; }}
      header p {{ margin-top: 8px; }}
      .rule {{
        margin: 18px 0 4px; padding: 12px 16px;
        background: var(--white); border: 1px solid #d6d6cb; border-radius: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px; line-height: 20px; max-width: 76ch;
      }}
      .rule b {{ color: {RED}; font-weight: 600; }}
      .rule i {{ color: #1f7a3d; font-style: normal; font-weight: 600; }}
      section {{ padding: 26px 0; border-bottom: 1px solid #d6d6cb; }}
      .strip {{ display: flex; gap: 34px; align-items: flex-end; margin-top: 18px; flex-wrap: wrap; }}
      .s {{ display: flex; flex-direction: column; align-items: center; gap: 8px; }}
      .s em, .strip > em {{
        font-style: normal; font-size: 10.5px; font-weight: 600;
        letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted);
      }}
      .word {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        letter-spacing: -0.02em; color: var(--ink); white-space: nowrap;
      }}
      /* Reversed: the live type and the SVG are two different colour channels,
         so BOTH have to flip or the stem stays dark on a dark field. */
      .on-ink {{ color: var(--white); --fg: var(--white); }}
      .inkfield {{
        background: var(--ink); border-radius: 10px;
        padding: 18px 26px; display: inline-flex; align-items: center;
      }}
      .tile {{
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--ink); border-radius: 22%; --fg: var(--white);
      }}
      .tile.is-mono {{ --fg: var(--white); --ac: var(--white); }}
    </style>
  </head>
  <body>
    <header>
      <h1>The locked mark — 35°, contained, grave</h1>
      <p>
        Your choice, unchanged in every respect but one: the accent now descends. A grave falls
        left to right, high end on the left. An acute rises, and <em>Cardí</em> is a different
        word — so this is spelling, not styling.
      </p>
      <div class="rule">
        <i>rotate(35)</i>&nbsp;&nbsp;✓ grave — descends to the right.&nbsp; Cardì<br />
        <b>rotate(-35)</b>&nbsp; ✗ acute — rises to the right.&nbsp;&nbsp;&nbsp; Cardí
      </div>
      <p style="margin-top:10px">
        SVG and CSS both put the y-axis pointing <strong>down</strong>, so the correct rotation is
        the positive one. That sign convention is the whole trap: this document said “grave”
        throughout while all 50 drawn accents in <code>frames/</code> said otherwise.
      </p>
    </header>

    <section>
      <h2>The wordmark</h2>
      <p>Contained accent — it stays inside the letter’s own advance, so it never collides with
         the <strong>d</strong> and it reads as a true grave rather than a slash through the word.</p>
      <div class="strip">
        <span class="s"><em>52</em>{word(52)}</span>
        <span class="s"><em>34</em>{word(34)}</span>
        <span class="s"><em>26</em>{word(26)}</span>
        <span class="s"><em>17</em>{word(17)}</span>
        <span class="s"><em>reversed</em><span class="inkfield">{word(34, "on-ink")}</span></span>
      </div>
    </section>

    <section>
      <h2>Icon A — floating: the contained accent, used unchanged</h2>
      <p>One drawing in both places. The honest question is the 30px and mono cells: a 24-unit
         tick has very little to hold on to once the hue is gone.</p>
      <div class="strip">{sizes_row(False)}</div>
    </section>

    <section>
      <h2>Icon B — crossing: contained in the word, a beam through the bars in the icon</h2>
      <p>The design system’s sentence drawn literally — a beam passing over a barcode. Survives
         30px and the themed layer. The cost is that the two forms then share angle, colour,
         weight and cap, but not length or position.</p>
      <div class="strip">{sizes_row(True)}</div>
    </section>

    <section style="border:0">
      <h2>Reading the safe-zone circle</h2>
      <p>
        The dashed circle is Android’s adaptive-icon mask: everything outside it can be cropped.
        iOS has no equivalent, so this is a <strong>scale factor for the Android foreground</strong>,
        not a pass or fail. Whichever icon wins, the Android foreground is exported at that scale
        and the same artwork ships at full size for iOS.
      </p>
    </section>
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines")
