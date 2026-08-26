"""Build cardi-icon-decision.html — the two icon variants, ready to choose between.

# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for it, so
# frames/ is .prettierignore'd — Prettier would reformat the HTML and the two
# could never agree again. Run tools/verify.py to confirm every generator still
# reproduces its frame byte-for-byte.

The wordmark is settled: 35°, grave, contained. The icon is not, because the
square has no neighbouring letter to spatially anchor the accent and no text
around it to lend context — so the two forms can legitimately differ.

    A  ACCENT   the contained tick, used unchanged in both places
    B  BEAM     contained in the word; in the icon the beam runs THROUGH the bars

cardi-mark-locked.html already draws both, but only as bare tiles, which is not
enough to decide on. An icon in isolation always looks fine. What actually
decides it is:

  · the PLATFORM MASKS. iOS squircle-crops, Android crops to whatever shape the
    launcher picks — circle, squircle, rounded square — and the Android
    FOREGROUND additionally must fit the centre 66%, which is a scale factor,
    not a pass/fail, since iOS has no equivalent.
  · the THEMED LAYER. Android 13+ redraws the icon in one colour taken from the
    wallpaper. Everything distinguished only by being yellow disappears, so an
    accent has to survive as a separable SHAPE.
  · CONTEXT. A mark holds up or vanishes next to other icons at 60px, and
    nothing else in this document tests that.

Geometry, computed rather than eyeballed (em space, 100 units to the em):

    variant A  content x 2.59..27.41, y -0.07..70.0   bounding radius 37.18
    variant B  content x -8.88..38.88, y 20.4..70.0   bounding radius 34.43

Both are drawn on a 100-unit canvas centred on their OWN content, so the stems
come out the same weight and the two are genuinely comparable. The Android
foreground scale is then `33 / bounding radius` — 0.887 for A, 0.958 for B.
"""
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-icon-decision.html"

INK, BEAM, CREAM, WHITE, MUTED = "#181824", "#FCCC0C", "#F0F0E8", "#FFFFFF", "#55555F"
RED, RULE = "#C41E1E", "#D6D6CB"

BASELINE, XHEIGHT = 70.0, 49.6
STEM_TOP = BASELINE - XHEIGHT
ADV = 30
CX = ADV / 2

ANGLE = 35          # POSITIVE descends to the right — a grave. Never negative.
WEIGHT = 9
LEN_WORD = 24       # contained: stays inside the letter's own advance
LEN_MARK = 52       # the crossing beam, icon only

SIDE = 100.0        # icon canvas, both variants
SAFE_FRAC = 0.66    # Android adaptive-icon safe zone


def _beam_extent(length, weight, angle):
    """Half-width and half-height of a round-capped bar after rotation."""
    a = math.radians(angle)
    hw = (length / 2) * math.cos(a) + (weight / 2) * math.sin(a)
    hh = (length / 2) * math.sin(a) + (weight / 2) * math.cos(a)
    return hw, hh


def geometry(crossing):
    """Content bounds and the circle that encloses them, in em units."""
    length = LEN_MARK if crossing else LEN_WORD
    cy = 44.0 if crossing else 10.5
    hw, hh = _beam_extent(length, WEIGHT, ANGLE)
    x0, x1 = min(CX - hw, CX - 11), max(CX + hw, CX + 11)
    y0, y1 = min(cy - hh, STEM_TOP), max(cy + hh, BASELINE)
    ccx, ccy = (x0 + x1) / 2, (y0 + y1) / 2
    radius = max(math.hypot(px - ccx, py - ccy)
                 for px in (x0, x1) for py in (y0, y1))
    return dict(x0=x0, x1=x1, y0=y0, y1=y1, cx=ccx, cy=ccy, r=radius,
                length=length, beam_cy=cy)


GEO = {False: geometry(False), True: geometry(True)}
# Android foreground scale: the content must fit the centre 66% of the canvas.
ASCALE = {k: (SAFE_FRAC * SIDE / 2) / g["r"] for k, g in GEO.items()}


def beam(length, cy):
    x, y = CX - length / 2, cy - WEIGHT / 2
    return (f'<rect x="{x:.2f}" y="{y:.2f}" width="{length}" height="{WEIGHT}" '
            f'rx="{WEIGHT / 2:.2f}" fill="var(--ac)" '
            f'transform="rotate({ANGLE} {CX} {cy})" />')


def stem_bars():
    h = BASELINE - STEM_TOP
    return (f'<rect x="{CX - 11:.1f}" y="{STEM_TOP:.1f}" width="4.5" height="{h:.1f}" '
            f'rx="2.2" fill="var(--fg)" />'
            f'<rect x="{CX - 4.5:.1f}" y="{STEM_TOP:.1f}" width="9" height="{h:.1f}" '
            f'rx="4.5" fill="var(--fg)" />'
            f'<rect x="{CX + 7:.1f}" y="{STEM_TOP:.1f}" width="4" height="{h:.1f}" '
            f'rx="2" fill="var(--fg)" />')


def stem_single(w=12):
    return (f'<rect x="{CX - w / 2:.1f}" y="{STEM_TOP:.1f}" width="{w}" '
            f'height="{BASELINE - STEM_TOP:.1f}" rx="{w / 2:.1f}" fill="var(--fg)" />')


def artwork(crossing):
    g = GEO[crossing]
    return stem_bars() + beam(g["length"], g["beam_cy"])


def viewbox(crossing):
    g = GEO[crossing]
    return f'{g["cx"] - SIDE / 2:.2f} {g["cy"] - SIDE / 2:.2f} {SIDE:.0f} {SIDE:.0f}'


def icon(crossing, size, shape="squircle", mono=None, android=False, safe=False):
    """One rendered icon.

    `shape` picks the mask the platform applies; `mono` renders the Android
    themed layer in a single colour; `android` applies the adaptive-icon
    foreground scale so the artwork fits the safe circle.
    """
    g = GEO[crossing]
    body = artwork(crossing)
    if android:
        s = ASCALE[crossing]
        body = (f'<g transform="translate({g["cx"] * (1 - s):.3f} '
                f'{g["cy"] * (1 - s):.3f}) scale({s:.4f})">{body}</g>')
    ring = (f'<circle cx="{g["cx"]:.2f}" cy="{g["cy"]:.2f}" r="{SAFE_FRAC * SIDE / 2:.1f}" '
            f'fill="none" stroke="{RED}" stroke-width="1.1" stroke-dasharray="4 3" '
            f'opacity="0.85" />') if safe else ""
    cls = f"ico ico-{shape}" + (" ico-mono" if mono else "")
    style = f"width:{size}px;height:{size}px"
    if mono:
        style += f";background:{mono[0]};--fg:{mono[1]};--ac:{mono[1]}"
    return (f'<span class="{cls}" style="{style}">'
            f'<svg viewBox="{viewbox(crossing)}" width="{size}" height="{size}">'
            f'{body}{ring}</svg></span>')


def wordglyph():
    return (f'<svg class="wglyph" viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" '
            f'height="1em" '
            f'style="display:inline;vertical-align:-{(100 - BASELINE) / 100:.2f}em;'
            f'overflow:visible" aria-hidden="true">{stem_single()}'
            f'{beam(LEN_WORD, 10.5)}</svg>')


# --- the home-screen context strip ----------------------------------------
# Neutral stand-ins, deliberately generic: the question is whether OUR mark
# holds its own in a row of icons, not whether these look like real apps.
NEIGHBOURS = [
    ("#3A6FF0", '<circle cx="50" cy="50" r="22" fill="#fff" opacity=".9"/>'),
    ("#2FA84F", '<rect x="30" y="30" width="40" height="40" rx="9" fill="#fff" opacity=".9"/>'),
    ("#E1523D", '<path d="M50 28 L68 68 H32 Z" fill="#fff" opacity=".9"/>'),
    ("#8B5CF6", '<rect x="28" y="44" width="44" height="12" rx="6" fill="#fff" opacity=".9"/>'
                '<rect x="44" y="28" width="12" height="44" rx="6" fill="#fff" opacity=".9"/>'),
]


def dock(crossing):
    cells = []
    for i, (bg, glyph) in enumerate(NEIGHBOURS):
        if i == 2:
            cells.append(f'<span class="dock-cell is-ours">{icon(crossing, 60)}'
                         f'<em>Cardì</em></span>')
        cells.append(f'<span class="dock-cell"><span class="ico ico-squircle" '
                     f'style="width:60px;height:60px;background:{bg}">'
                     f'<svg viewBox="0 0 100 100" width="60" height="60">{glyph}</svg>'
                     f'</span><em>&nbsp;</em></span>')
    return f'<div class="dock">{"".join(cells)}</div>'


VARIANTS = [
    (False, "A", "Accent",
     "The contained tick, used unchanged in the word and in the icon.",
     ["One drawing serves both places — word and icon are literally the same "
      "artwork, so the family resemblance is total rather than argued.",
      "It is a real grave accent, which is the whole premise of the name.",
      "The most restrained option, and restraint is what the system asks for "
      "everywhere else."],
     ["A 24-unit tick is very small at 30px, and in the themed layer it has "
      "no hue left to carry it — it reads as a speck rather than a mark.",
      f"Tall and narrow (24.8 × 70 units), so it needs the largest Android "
      f"reduction of the two: ×{ASCALE[False]:.3f}.",
      "Most of the icon is empty ground."]),
    (True, "B", "Beam",
     "Contained in the word; in the icon the beam runs THROUGH the bars.",
     ["The design system's own sentence, drawn literally: a beam passing over "
      "a barcode.",
      "Survives 30px, 16px and the one-colour themed layer, because the accent "
      "is a separable shape rather than a colour.",
      f"Squarer (47.8 × 49.6 units), so it loses least to the Android mask: "
      f"×{ASCALE[True]:.3f}.",
      "Fills the square, which is what a square icon wants."],
     ["The two forms then share angle, colour, weight and cap — but not length "
      "or position. Thinner connective tissue than A.",
      "An accent that crosses its own letter is not, strictly, an accent any "
      "more. In the icon it is a beam; only in the word is it a grave."]),
]

rows = []
for crossing, letter, name, sub, pros, cons in VARIANTS:
    g = GEO[crossing]
    rows.append(f'''    <section class="variant">
      <div class="vhead">
        <span class="badge">{letter}</span>
        <div>
          <h2>{name}</h2>
          <p class="sub">{sub}</p>
        </div>
        {icon(crossing, 96)}
      </div>

      <div class="grid">
        <div class="cell">
          <em>iOS · 180</em>
          {icon(crossing, 90)}
        </div>
        <div class="cell">
          <em>iOS · 60</em>
          {icon(crossing, 60)}
        </div>
        <div class="cell">
          <em>Android · circle</em>
          {icon(crossing, 90, shape="circle", android=True)}
        </div>
        <div class="cell">
          <em>Android · squircle</em>
          {icon(crossing, 90, android=True)}
        </div>
        <div class="cell">
          <em>themed · light</em>
          {icon(crossing, 90, shape="circle", mono=("#DDE3EA", "#2A3138"), android=True)}
        </div>
        <div class="cell">
          <em>themed · dark</em>
          {icon(crossing, 90, shape="circle", mono=("#2A3138", "#DDE3EA"), android=True)}
        </div>
        <div class="cell">
          <em>favicon 32</em>
          {icon(crossing, 32)}
        </div>
        <div class="cell">
          <em>16</em>
          {icon(crossing, 16)}
        </div>
        <div class="cell">
          <em>safe zone</em>
          {icon(crossing, 90, safe=True)}
        </div>
      </div>

      <p class="cap">On a home screen, 60px, between other icons — the only test
        that asks whether the mark holds its own rather than whether it is pretty.</p>
      {dock(crossing)}

      <div class="args">
        <div class="arg arg-for">
          <h3>For</h3>
          <ul>{"".join(f"<li>{p}</li>" for p in pros)}</ul>
        </div>
        <div class="arg arg-against">
          <h3>Against</h3>
          <ul>{"".join(f"<li>{c}</li>" for c in cons)}</ul>
        </div>
      </div>

      <p class="metrics">
        content <code>{g["x1"] - g["x0"]:.1f} × {g["y1"] - g["y0"]:.1f}</code> units ·
        bounding radius <code>{g["r"]:.2f}</code> ·
        Android foreground scale <code>×{ASCALE[crossing]:.3f}</code>
      </p>
    </section>''')

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — the icon, two variants</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — THE ICON. Two variants, and the one open decision.

         The WORDMARK is settled: 35 degrees, grave, contained. The icon is
         not, because a square has no neighbouring letter to anchor the
         accent against and no text around it to lend context — so the two
         forms can legitimately differ.

         Everything here is drawn at the sizes and under the masks the asset
         actually ships with. The themed-layer cells matter most: Android
         13+ redraws the icon in ONE colour taken from the wallpaper, so an
         accent distinguished only by being yellow ceases to exist.
         ================================================================== */
      :root {{
        --ink: {INK};
        --beam: {BEAM};
        --cream: {CREAM};
        --white: {WHITE};
        --muted: {MUTED};
        --rule: {RULE};
        /* Ink by default, because the DEFAULT context on this page is the
           wordmark sitting in live type on a light card. The icons override it
           to white below. Setting white here instead cost a bug: the wordmark's
           stem is an <svg> filled with var(--fg), so it rendered white on the
           white lockup and the ì lost its stem entirely — the same two-channel
           trap as the reversed lockup, where flipping `color` moves the live
           type but not the SVG. */
        --fg: var(--ink);
        --ac: var(--beam);
      }}
      * {{ box-sizing: border-box; margin: 0; padding: 0; }}
      body {{
        background: var(--cream);
        font-family: Inter, system-ui, sans-serif;
        color: var(--ink);
        padding: 40px 32px 64px;
        line-height: 1.5;
      }}
      h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 27px; letter-spacing: -0.02em;
      }}
      h2 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 21px; letter-spacing: -0.01em;
      }}
      h3 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700; font-size: 13px; letter-spacing: 0.04em;
        text-transform: uppercase;
      }}
      header p {{ font-size: 15px; color: var(--muted); max-width: 76ch; margin-top: 8px; }}
      code {{
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 12.5px; background: var(--white);
        border: 1px solid var(--rule); border-radius: 4px; padding: 1px 5px;
      }}

      .lockup {{
        margin-top: 22px; padding: 16px 20px; background: var(--white);
        border: 1px solid var(--rule); border-radius: 10px;
        display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
      }}
      .word {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        letter-spacing: -0.02em; color: var(--ink); white-space: nowrap;
        font-size: 40px;
      }}
      .lockup span.note {{ font-size: 14px; color: var(--muted); }}

      .variant {{ padding: 34px 0; border-bottom: 1px solid var(--rule); }}
      .vhead {{ display: flex; align-items: center; gap: 18px; }}
      .vhead > div {{ flex: 1; }}
      .badge {{
        width: 34px; height: 34px; flex: 0 0 34px; border-radius: 50%;
        background: var(--ink); color: var(--white);
        font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 17px;
        display: inline-flex; align-items: center; justify-content: center;
      }}
      .sub {{ font-size: 14.5px; color: var(--muted); }}

      .grid {{
        display: flex; flex-wrap: wrap; gap: 26px 30px;
        margin-top: 24px; align-items: flex-end;
      }}
      .cell {{ display: flex; flex-direction: column; align-items: center; gap: 9px; }}
      .cell em, .dock-cell em {{
        font-style: normal; font-size: 10.5px; font-weight: 600;
        letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted);
      }}

      /* The masks. iOS squircle-crops; Android's launcher picks the shape, so
         both a circle and a squircle are shown. `overflow: hidden` is what
         makes these real crops rather than decorations. */
      .ico {{
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--ink); overflow: hidden; flex: 0 0 auto;
        --fg: var(--white);
      }}
      .ico-squircle {{ border-radius: 22.5%; }}
      .ico-circle {{ border-radius: 50%; }}

      .cap {{ font-size: 14px; color: var(--muted); margin-top: 30px; max-width: 76ch; }}

      /* A plausible home screen: a muted wallpaper, icons at 60px on the pitch
         Android and iOS actually use. */
      .dock {{
        margin-top: 12px; padding: 20px 24px; border-radius: 14px;
        background: linear-gradient(135deg, #6B7A8F 0%, #4A5568 55%, #3C4655 100%);
        display: flex; gap: 22px; align-items: flex-start; flex-wrap: wrap;
      }}
      .dock-cell {{ display: flex; flex-direction: column; align-items: center; gap: 7px; }}
      .dock-cell em {{ color: rgba(255, 255, 255, 0.86); letter-spacing: 0.02em; }}

      .args {{ display: flex; gap: 30px; margin-top: 28px; flex-wrap: wrap; }}
      .arg {{
        flex: 1 1 300px; background: var(--white); border: 1px solid var(--rule);
        border-radius: 10px; padding: 16px 18px;
      }}
      .arg-for h3 {{ color: #1F7A3D; }}
      .arg-against h3 {{ color: {RED}; }}
      .arg ul {{ margin: 10px 0 0 18px; }}
      .arg li {{ font-size: 14px; color: var(--muted); margin-bottom: 7px; }}

      .metrics {{ margin-top: 18px; font-size: 13px; color: var(--muted); }}

      .verdict {{
        margin-top: 34px; padding: 20px 24px; border-radius: 10px;
        background: var(--ink); color: var(--white); max-width: 84ch;
      }}
      .verdict h2 {{ color: var(--beam); font-size: 18px; }}
      .verdict p {{ font-size: 14.5px; margin-top: 8px; color: #DCDCE4; }}
      .verdict strong {{ color: var(--white); }}
    </style>
  </head>
  <body>
    <header>
      <h1>The icon — two variants</h1>
      <p>
        The wordmark is settled: 35°, grave, contained. The icon is the open question, because a
        square has no neighbouring letter to anchor the accent against and no text around it to
        lend context — so the two forms are allowed to differ.
      </p>
      <div class="lockup">
        <span class="word">Card{wordglyph()}</span>
        <span class="note">The wordmark, unchanged in both proposals. Only the square changes.</span>
      </div>
    </header>

{chr(10).join(rows)}

    <div class="verdict">
      <h2>The recommendation: B</h2>
      <p>
        A is the more principled drawing and B is the one that survives. The deciding cell is
        <strong>themed · light/dark</strong> — Android 13+ redraws the icon in a single colour
        pulled from the wallpaper, and A's accent exists only as a yellow tick. Strip the hue and
        it is a speck floating above three bars; strip it from B and the beam is still a beam,
        because it was a <strong>shape</strong> rather than a colour.
      </p>
      <p>
        The cost of B is real and worth stating: the icon and the word then share angle, colour,
        weight and cap, but not length or position. That is a family, not a clone — which the two
        forms already were, since the stem is a single bar in the word and three in the square.
        The wordmark keeps the true grave either way.
      </p>
    </div>
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines")
print(f"  A bounding radius {GEO[False]['r']:.2f}, android scale ×{ASCALE[False]:.3f}")
print(f"  B bounding radius {GEO[True]['r']:.2f}, android scale ×{ASCALE[True]:.3f}")
