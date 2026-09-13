"""Build cardi-mark-sweep35.html — round three: refining the chosen accent.

ifero picked Sweep 35 and asked to push it further. So the angle is now roughly
fixed and the variables are the ones that change how it READS at that angle:

  end caps    rounded (soft) vs flat vs sheared-vertical (calligraphic). The
              system calls itself "warm, flat and structural — paper, not
              glass", and a rounded cap is the softest of the three.
  weight      thinner than the stem, or matched to it
  length      how far it overhangs the stem
  angle       30 / 35 / 40, a narrow bracket around the choice
  crossing    THE INTERESTING ONE: in the mark, does the beam pass THROUGH the
              barcode instead of floating above it? "A scan beam passing over a
              barcode" is the design system's own sentence, and floating above is
              a weaker reading of it than crossing. But in the word the accent
              MUST float, because an accent that crosses its own letter is not an
              accent — so crossing would break the constant that joins them.
              Drawn here so that trade can be judged rather than assumed.

Geometry carried over unchanged from round two: em space, baseline at y=70,
stem x-height to baseline, 0.30em advance.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for
# it, so frames/ is .prettierignore'd — Prettier would reformat the HTML
# and the two could never agree again. Run tools/verify.py to confirm every
# generator still reproduces its frame byte-for-byte.
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-mark-sweep35.html"

BASELINE, XHEIGHT = 70.0, 49.6
STEM_TOP = BASELINE - XHEIGHT
ADV = 30
CX = ADV / 2


def beam(angle=35, length=34, weight=9, cap="round", cy=10.5):
    """One accent bar, rotated about its own centre.

    POSITIVE angles descend to the right, which is what a GRAVE accent does and
    therefore what "Cardì" requires. This sheet originally defaulted to -35;
    SVG's y-axis points down, so that lifted the right-hand end and drew an
    ACUTE — every variant here spelled Cardí, a different word. The written spec
    (cardi-design-system.md:114) said "grave" the whole time; only the drawings
    disagreed.

    The sheared cap must MIRROR with the sign rather than simply negate its
    offset. Negating moves the inset from one pair of corners to the other,
    turning an inset parallelogram into an outset one and growing the unrotated
    width from `length` to `length + weight·tan|angle|` — at 24/9/35° that is
    24 → 30.3, a 26% longer beam from an argument that never changed, and it
    breaks the containment the wordmark depends on.
    """
    x, y = CX - length / 2, cy - weight / 2
    if cap == "round":
        shape = (f'<rect x="{x:.1f}" y="{y:.1f}" width="{length}" height="{weight}" '
                 f'rx="{weight / 2:.1f}" fill="var(--ac)" />')
    elif cap == "flat":
        shape = (f'<rect x="{x:.1f}" y="{y:.1f}" width="{length}" height="{weight}" '
                 f'fill="var(--ac)" />')
    else:  # sheared — the ends stay VERTICAL after rotation, like a broad-nib stroke
        a = weight * math.tan(math.radians(abs(angle)))
        if angle < 0:  # acute: top inset on the left, bottom inset on the right
            pts = [(x, y + weight), (x + a, y), (x + length, y), (x + length - a, y + weight)]
        else:          # grave: the mirror of that about CX
            pts = [(x + a, y + weight), (x, y), (x + length - a, y), (x + length, y + weight)]
        d = " ".join(f"{'M' if i == 0 else 'L'}{px:.2f} {py:.2f}"
                     for i, (px, py) in enumerate(pts))
        shape = f'<path d="{d} Z" fill="var(--ac)" />'
    return f'<g transform="rotate({angle} {CX} {cy})">{shape}</g>'


def stem_single(w=12):
    return (f'<rect x="{CX - w / 2:.1f}" y="{STEM_TOP:.1f}" width="{w}" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="{w / 2:.1f}" fill="var(--fg)" />')


def stem_bars():
    return (f'<rect x="{CX - 11:.1f}" y="{STEM_TOP:.1f}" width="4.5" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="2.2" fill="var(--fg)" />'
            f'<rect x="{CX - 4:.1f}" y="{STEM_TOP:.1f}" width="8" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="4" fill="var(--fg)" />'
            f'<rect x="{CX + 7:.1f}" y="{STEM_TOP:.1f}" width="3.5" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="1.7" fill="var(--fg)" />')


# label, note, beam kwargs, and whether the MARK crosses the bars
V = [
    ("base", "35° · round · the choice",
     "Round two's winner, unchanged. The baseline for everything below.",
     dict(), False),
    ("flat", "35° · flat caps",
     "Square ends cut perpendicular to the stroke. Harder, more structural.",
     dict(cap="flat"), False),
    ("shear", "35° · sheared ends",
     "Ends stay vertical after rotation, like a broad-nib stroke. The only "
     "variant with any calligraphic memory in it.",
     dict(cap="shear"), False),
    ("heavy", "35° · matched weight",
     "The accent as thick as the stem, so the two read as one system of strokes.",
     dict(weight=12), False),
    ("short", "35° · contained",
     "Barely overhangs. Closest to a real grave accent.",
     dict(length=24), False),
    ("long", "35° · extended",
     "More overhang, so the sweep travels further past the letter.",
     dict(length=44), False),
    ("a30", "30° · shallower", "One notch back from the choice.", dict(angle=30), False),
    ("a40", "40° · steeper", "One notch on from the choice.", dict(angle=40), False),
    ("xr", "CROSSING · round caps · mid",
     "The crossing beam, refined. Round caps — the softest of the three.",
     dict(length=52), True),
    ("xf", "CROSSING · flat caps · mid",
     "Square ends. The system calls itself flat and structural, and a round cap "
     "is the least structural option available.",
     dict(length=52, cap="flat"), True),
    ("xs", "CROSSING · sheared · mid",
     "Ends vertical after rotation. Reads as one confident stroke of a broad "
     "nib rather than a bar that happens to be tilted.",
     dict(length=52, cap="shear"), True),
    ("xhigh", "CROSSING · high on the bars",
     "The beam near the top of the barcode: caught early in the sweep.",
     dict(length=52, cap="shear"), "high"),
    ("xlow", "CROSSING · low on the bars",
     "Near the foot: caught late. The bars read taller above it.",
     dict(length=52, cap="shear"), "low"),
    ("c_float", "CHOSEN · contained · mark floats",
     "ifero's pick, used in both places unchanged. The word is right. Judge the "
     "mark: is a short tick enough at icon size?",
     dict(length=24, cap="shear"), False),
    ("c_cross", "CHOSEN · contained word · CROSSING mark",
     "The same contained accent in the word, but the mark's beam crosses the "
     "bars — still short, so it does not reach past them.",
     dict(length=24, cap="shear"), True),
    ("c_cross_long", "CHOSEN · contained word · crossing LONG mark",
     "Contained in the word, extended and crossing in the mark. Strongest icon, "
     "but now the two forms share only an angle and a colour, not a stroke.",
     dict(length=24, cap="shear"), "long"),
    ("cross", "35° · CROSSING the barcode",
     "In the mark only, the beam passes THROUGH the bars instead of floating "
     "above them — the design system's sentence read literally. In the word it "
     "still floats, because an accent that crosses its letter is not an accent. "
     "Which is the cost: the beam stops being identical in both places.",
     dict(length=52), True),
]


def sym_defs():
    out = []
    for key, _, _, kw, cross in V:
        out.append(f'<symbol id="w-{key}" viewBox="0 0 {ADV} 100" overflow="visible">'
                   f'{stem_single()}{beam(**kw)}</symbol>')
        if cross == "long":
            mark_beam = beam(**{**kw, "cy": 44, "length": 52})
        elif cross == "high":
            mark_beam = beam(**{**kw, "cy": 32})
        elif cross == "low":
            mark_beam = beam(**{**kw, "cy": 56})
        elif cross:
            mark_beam = beam(**{**kw, "cy": 44})
        else:
            mark_beam = beam(**kw)
        out.append(f'<symbol id="m-{key}" viewBox="0 0 {ADV} 100" overflow="visible">'
                   f'{stem_bars()}{mark_beam}</symbol>')
    return ('  <svg width="0" height="0" style="position:absolute" aria-hidden="true">'
            + "".join(out) + '</svg>')


def word(key, size):
    return (f'<span class="word" style="font-size:{size}px">Card'
            f'<svg class="wglyph" viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" '
            f'style="display:inline;vertical-align:-{(100 - BASELINE) / 100:.2f}em;overflow:visible" '
            f'height="1em"><use href="#w-{key}" /></svg></span>')


def tile(key, size, mono=False):
    side, cy = 105.0, 37.0
    cls = "tile is-mono" if mono else "tile"
    return (f'<span class="{cls}" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="{CX - side / 2:.1f} {cy - side / 2:.1f} {side} {side}" '
            f'width="{size}" height="{size}" overflow="visible">'
            f'<use href="#m-{key}" /></svg></span>')


rows = "\n".join(f'''      <div class="row">
        <div class="meta"><h2>{label}</h2><p>{note}</p></div>
        <div class="specimens">
          <div class="stack">{word(key, 52)}<span class="cap">word 52</span></div>
          <div class="stack">{word(key, 26)}<span class="cap">26</span></div>
          <div class="stack">{tile(key, 84)}<span class="cap">mark</span></div>
          <div class="stack">{tile(key, 30)}<span class="cap">30</span></div>
          <div class="stack">{tile(key, 44, mono=True)}<span class="cap">mono</span></div>
        </div>
      </div>''' for key, label, note, _, _ in V)

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — sweep 35, refined</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — SWEEP 35, REFINED. Round three.

         The angle is chosen, so the variables here are the ones that change how
         it READS at that angle: end caps, weight, length, a narrow bracket of
         angles either side, and one structural question.

         THE STRUCTURAL QUESTION is the last row. "A scan beam passing over a
         barcode" is the design system's own sentence, and an accent FLOATING
         ABOVE the bars is a weaker reading of it than one CROSSING them. But in
         the word the accent must float, because an accent that crosses its own
         letter is not an accent — so crossing buys a stronger mark at the price
         of the beam no longer being identical in both places, which is the
         constant that joins them. Drawn so the trade can be judged.

         Geometry unchanged from round two: em space, baseline y=70, stem from
         x-height to baseline, 0.30em advance, single stem in the word and bars
         in the mark.
         ================================================================== */

      :root {{
        --ink: #181824; --beam: #fccc0c; --cream: #f0f0e8; --white: #ffffff;
        --hairline: #d6d6cb; --muted: #55555f;
        --fg: var(--ink); --ac: var(--beam);
      }}

      * {{ box-sizing: border-box; margin: 0; padding: 0; }}

      body {{
        background: var(--cream);
        font-family: Inter, system-ui, sans-serif;
        color: var(--ink);
        padding: 40px 32px 72px;
      }}

      h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 26px; letter-spacing: -0.02em;
      }}

      header p {{
        font-size: 15px; line-height: 22px; color: var(--muted);
        max-width: 68ch; margin-top: 8px;
      }}

      .row {{
        display: flex; gap: 36px; align-items: center;
        padding: 22px 0; border-bottom: 1px solid var(--hairline);
      }}

      .meta {{ flex: 0 0 230px; }}
      .meta h2 {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 18px;
      }}
      .meta p {{ font-size: 14px; line-height: 20px; color: var(--muted); margin-top: 4px; }}

      .specimens {{ display: flex; gap: 30px; align-items: flex-end; flex-wrap: wrap; }}
      .stack {{ display: flex; flex-direction: column; align-items: center; gap: 6px; }}
      .cap {{
        font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
        text-transform: uppercase; color: var(--muted);
      }}

      .word {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        letter-spacing: -0.03em; color: var(--ink); line-height: 1; white-space: nowrap;
      }}

      /* Baseline anchoring, unchanged: the box is 1em tall with its baseline at
         y=70, so dropping it 0.30em puts the two baselines together. */

      .tile {{
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--ink); border-radius: 22%;
        --fg: var(--white); --ac: var(--beam);
      }}

      /* Android 13 themed layer: one colour, no hue to lean on. */
      .tile.is-mono {{ --fg: var(--white); --ac: var(--white); }}
    </style>
  </head>
  <body>
    <header>
      <h1>Sweep 35 — refined</h1>
      <p>
        The angle is chosen, so these vary what changes how it reads at that angle: the end
        caps, the weight against the stem, the overhang, a narrow bracket of angles either side,
        and one structural question in the last row — whether the beam should cross the barcode
        rather than float above it. Every row shows the word, the word small, the mark, the mark
        small, and the Android themed silhouette.
      </p>
    </header>
{sym_defs()}
{rows}
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(V)} variants")
