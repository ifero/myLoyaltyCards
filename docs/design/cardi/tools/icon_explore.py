"""Build cardi-icon-explore.html — six squares, A and B kept, four more to argue with.

# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for it, so
# frames/ is .prettierignore'd — Prettier would reformat the HTML and the two
# could never agree again. Run tools/verify.py to confirm every generator still
# reproduces its frame byte-for-byte.

ifero kept A and B and asked for more. The two were the ends of one axis — a
tick that floats, or a beam that crosses — so the useful additions are the
points BETWEEN them and the ideas that leave the axis entirely.

    A  accent      the contained tick, unchanged from the word          (kept)
    B  beam        a 52-unit beam through the middle of the bars        (kept)
    C  beam high   crosses, but up where an accent belongs
    D  bleed       runs off both edges of the icon
    E  negative    the beam is a GAP cut through the bars, not a bar on top
    F  bold accent A's idea, sized for a square instead of for a word

The two that leave the axis are the ones worth having drawn:

  E is mono-proof by construction. Every other variant relies on the beam being
    a separate SHAPE so it survives the Android themed layer; E's beam is not a
    shape at all, it is the absence of one, so it cannot fail that test — you
    cannot lose a gap by removing colour. It is implemented as a bar filled with
    the icon's own background rather than an SVG mask: identical result on an
    opaque field, one element instead of three, and no per-instance mask ids to
    keep unique across the ~90 copies on this page.

  F asks whether A's weakness is actually fixable. A is weak because the accent
    is sized for the WORD, where it must stay inside the ì's own advance so it
    does not collide with the d. A square has no d. Freed of containment the
    same idea can be 34 x 11 instead of 24 x 9 — still floating, still a grave,
    just not apologising for it.

Geometry is computed per variant, never hardcoded: each one's bounding radius
falls out of its own drawing and the Android foreground scale is derived from it
as 33/radius. Change the artwork and the export scale follows.
"""
import math
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-icon-explore.html"

INK, BEAM, CREAM, WHITE, MUTED = "#181824", "#FCCC0C", "#F0F0E8", "#FFFFFF", "#55555F"
RED, RULE = "#C41E1E", "#D6D6CB"

BASELINE, XHEIGHT = 70.0, 49.6
STEM_TOP = BASELINE - XHEIGHT
ADV = 30
CX = ADV / 2

ANGLE = 35
SIDE = 100.0
SAFE_FRAC = 0.66

# key, letter, name, one-line thesis, beam params, how to centre the canvas
# beam params: (length, weight, cy, fill)  fill: "beam" | "bg"
VARIANTS = [
    ("accent", "A", "Accent",
     "The contained tick, unchanged from the word. One drawing serves both places.",
     (24, 9, 10.5, "beam"), "content"),
    ("beam", "B", "Beam",
     "A 52-unit beam through the middle of the bars — the system's sentence, drawn.",
     (52, 9, 44.0, "beam"), "content"),
    ("high", "C", "Beam, high",
     "Crosses the bars, but up where an accent belongs. The compromise between A and B.",
     (52, 9, 30.0, "beam"), "content"),
    ("bleed", "D", "Bleed",
     "Runs off both edges. The beam is passing THROUGH, not sitting inside.",
     (128, 10, 44.0, "beam"), "bars"),
    ("negative", "E", "Negative",
     "The beam is a gap cut through the bars. Cannot lose its colour, because it has none.",
     (60, 10, 44.0, "bg"), "bars"),
    ("bold", "F", "Bold accent",
     "A's idea sized for a square instead of a word — nothing here to collide with.",
     (34, 11, 8.0, "beam"), "content"),
]


def beam_extent(length, weight, angle=ANGLE):
    """Half-width and half-height of a round-capped bar after rotation."""
    a = math.radians(angle)
    return ((length / 2) * math.cos(a) + (weight / 2) * math.sin(a),
            (length / 2) * math.sin(a) + (weight / 2) * math.cos(a))


def geometry(params, centre_on):
    length, weight, cy, _fill = params
    hw, hh = beam_extent(length, weight)
    bars = (CX - 11, CX + 11, STEM_TOP, BASELINE)
    if centre_on == "bars":
        # D and E deliberately overflow the canvas, so the BARS decide the
        # centre — otherwise a longer beam would shrink the letter.
        x0, x1, y0, y1 = bars
    else:
        x0, x1 = min(CX - hw, bars[0]), max(CX + hw, bars[1])
        y0, y1 = min(cy - hh, bars[2]), max(cy + hh, bars[3])
    ccx, ccy = (x0 + x1) / 2, (y0 + y1) / 2
    r = max(math.hypot(px - ccx, py - ccy) for px in (x0, x1) for py in (y0, y1))
    return dict(x0=x0, x1=x1, y0=y0, y1=y1, cx=ccx, cy=ccy, r=r)


GEO = {k: geometry(p, c) for k, _l, _n, _t, p, c in VARIANTS}
PARAMS = {k: p for k, _l, _n, _t, p, _c in VARIANTS}

# The Android foreground scale only ever SHRINKS. Clamping at 1.0 matters for D
# and E, whose radius is measured on the bars alone because their beam is meant
# to leave the canvas: unclamped they came out at x1.216, and "scale up to fill
# the safe circle" is a different instruction from "fit inside it". It would
# also have made those two render visibly larger than the rest and quietly
# ruined the comparison.
#
# The safe-zone promise is therefore narrower for D and E: the LETTER survives
# any launcher crop, the beam may be cut. For D that is the whole idea; for E
# the gap stays inside the bars it cuts, so nothing is lost either way.
ASCALE = {k: min(1.0, (SAFE_FRAC * SIDE / 2) / g["r"]) for k, g in GEO.items()}


def bar(length, weight, cy, fill):
    x, y = CX - length / 2, cy - weight / 2
    colour = "var(--ac)" if fill == "beam" else "var(--bgfill)"
    return (f'<rect x="{x:.2f}" y="{y:.2f}" width="{length}" height="{weight}" '
            f'rx="{weight / 2:.2f}" fill="{colour}" '
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


def artwork(key):
    return stem_bars() + bar(*PARAMS[key])


def viewbox(key):
    g = GEO[key]
    return (f'{g["cx"] - SIDE / 2:.2f} {g["cy"] - SIDE / 2:.2f} '
            f'{SIDE:.0f} {SIDE:.0f}')


def icon(key, size, shape="squircle", mono=None, android=False, safe=False):
    g = GEO[key]
    body = artwork(key)
    if android:
        s = ASCALE[key]
        body = (f'<g transform="translate({g["cx"] * (1 - s):.3f} '
                f'{g["cy"] * (1 - s):.3f}) scale({s:.4f})">{body}</g>')
    ring = (f'<circle cx="{g["cx"]:.2f}" cy="{g["cy"]:.2f}" '
            f'r="{SAFE_FRAC * SIDE / 2:.1f}" fill="none" stroke="{RED}" '
            f'stroke-width="1.1" stroke-dasharray="4 3" opacity="0.85" />') if safe else ""
    style = f"width:{size}px;height:{size}px"
    if mono:
        # The themed layer: one colour on a wallpaper-derived field. `--bgfill`
        # has to follow the field, or E's gap stops being a gap.
        style += f";background:{mono[0]};--fg:{mono[1]};--ac:{mono[1]};--bgfill:{mono[0]}"
    return (f'<span class="ico ico-{shape}" style="{style}">'
            f'<svg viewBox="{viewbox(key)}" width="{size}" height="{size}">'
            f'{body}{ring}</svg></span>')


def wordglyph():
    return (f'<svg class="wglyph" viewBox="0 0 {ADV} 100" width="{ADV / 100:.2f}em" '
            f'height="1em" '
            f'style="display:inline;vertical-align:-{(100 - BASELINE) / 100:.2f}em;'
            f'overflow:visible" aria-hidden="true">{stem_single()}'
            f'{bar(24, 9, 10.5, "beam")}</svg>')


NEIGHBOURS = [
    ("#3A6FF0", '<circle cx="50" cy="50" r="22" fill="#fff" opacity=".9"/>'),
    ("#2FA84F", '<rect x="30" y="30" width="40" height="40" rx="9" fill="#fff" opacity=".9"/>'),
    ("#E1523D", '<path d="M50 28 L68 68 H32 Z" fill="#fff" opacity=".9"/>'),
]

rows = []
for key, letter, name, thesis, params, _centre in VARIANTS:
    g = GEO[key]
    length, weight, cy, fill = params
    rows.append(f'''    <section class="v">
      <div class="vhead">
        <span class="badge">{letter}</span>
        <div class="vtext">
          <h2>{name}</h2>
          <p class="sub">{thesis}</p>
        </div>
        {icon(key, 88)}
      </div>
      <div class="grid">
        <div class="c"><em>60</em>{icon(key, 60)}</div>
        <div class="c"><em>30</em>{icon(key, 30)}</div>
        <div class="c"><em>16</em>{icon(key, 16)}</div>
        <div class="c"><em>android</em>{icon(key, 72, shape="circle", android=True)}</div>
        <div class="c"><em>themed light</em>
          {icon(key, 72, shape="circle", mono=("#DDE3EA", "#2A3138"), android=True)}</div>
        <div class="c"><em>themed dark</em>
          {icon(key, 72, shape="circle", mono=("#2A3138", "#DDE3EA"), android=True)}</div>
        <div class="c"><em>safe zone</em>{icon(key, 72, safe=True)}</div>
      </div>
      <p class="m">beam <code>{length} × {weight}</code> at <code>cy {cy:g}</code>
        {'· fill = icon background' if fill == 'bg' else ''} ·
        bounding radius <code>{g["r"]:.2f}</code> ·
        android scale <code>×{ASCALE[key]:.3f}</code></p>
    </section>''')

dock_cells = []
for i, (bg, glyph) in enumerate(NEIGHBOURS):
    dock_cells.append(f'<span class="dc"><span class="ico ico-squircle" '
                      f'style="width:56px;height:56px;background:{bg}">'
                      f'<svg viewBox="0 0 100 100" width="56" height="56">{glyph}</svg>'
                      f'</span><em>&nbsp;</em></span>')
for key, letter, *_ in VARIANTS:
    dock_cells.append(f'<span class="dc">{icon(key, 56)}<em>{letter}</em></span>')

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — the icon, six explorations</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — THE ICON, six explorations. A and B kept, four added.

         A and B were the two ends of one axis — a tick that floats, or a
         beam that crosses — so the additions are the points between them
         (C, F) and the two ideas that leave the axis (D, E).

         The THEMED cells decide this. Android 13+ redraws the icon in a
         single wallpaper-derived colour, so anything distinguished only by
         being yellow ceases to exist. E cannot fail that test by
         construction: its beam is a GAP, and you cannot lose a gap by
         removing colour.
         ================================================================== */
      :root {{
        --ink: {INK};
        --beam: {BEAM};
        --cream: {CREAM};
        --white: {WHITE};
        --muted: {MUTED};
        --rule: {RULE};
        /* Ink by default: the default context on this page is the wordmark in
           live type on a light card. Icons override it. Setting white here
           instead cost a bug once — the wordmark's stem is an <svg> filled
           with var(--fg), so it rendered white on white and the ì lost its
           stem. Same two-channel trap as a reversed lockup. */
        --fg: var(--ink);
        --ac: var(--beam);
        --bgfill: var(--cream);
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
      h2 {{ font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 20px; }}
      h3 {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        font-size: 13px; letter-spacing: 0.04em; text-transform: uppercase;
      }}
      header p {{ font-size: 15px; color: var(--muted); max-width: 78ch; margin-top: 8px; }}
      code {{
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px;
        background: var(--white); border: 1px solid var(--rule);
        border-radius: 4px; padding: 1px 5px;
      }}

      .lockup {{
        margin-top: 20px; padding: 14px 20px; background: var(--white);
        border: 1px solid var(--rule); border-radius: 10px;
        display: flex; align-items: center; gap: 18px; flex-wrap: wrap;
      }}
      .word {{
        font-family: 'Space Grotesk', sans-serif; font-weight: 700;
        letter-spacing: -0.02em; color: var(--ink); font-size: 38px; white-space: nowrap;
      }}
      .lockup .note {{ font-size: 14px; color: var(--muted); }}

      .v {{ padding: 28px 0; border-bottom: 1px solid var(--rule); }}
      .vhead {{ display: flex; align-items: center; gap: 16px; }}
      .vtext {{ flex: 1; }}
      .badge {{
        width: 32px; height: 32px; flex: 0 0 32px; border-radius: 50%;
        background: var(--ink); color: var(--white);
        font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px;
        display: inline-flex; align-items: center; justify-content: center;
      }}
      .sub {{ font-size: 14.5px; color: var(--muted); }}

      .grid {{ display: flex; flex-wrap: wrap; gap: 22px 26px; margin-top: 20px; align-items: flex-end; }}
      .c {{ display: flex; flex-direction: column; align-items: center; gap: 8px; }}
      .c em, .dc em {{
        font-style: normal; font-size: 10px; font-weight: 600;
        letter-spacing: 0.05em; text-transform: uppercase; color: var(--muted);
      }}

      /* Real crops: `overflow: hidden` is what makes D actually bleed. */
      .ico {{
        display: inline-flex; align-items: center; justify-content: center;
        background: var(--ink); overflow: hidden; flex: 0 0 auto;
        --fg: var(--white);
        --bgfill: var(--ink);
      }}
      .ico-squircle {{ border-radius: 22.5%; }}
      .ico-circle {{ border-radius: 50%; }}

      .m {{ margin-top: 16px; font-size: 12.5px; color: var(--muted); }}

      .dock {{
        margin-top: 14px; padding: 20px 24px; border-radius: 14px;
        background: linear-gradient(135deg, #6B7A8F 0%, #4A5568 55%, #3C4655 100%);
        display: flex; gap: 18px; align-items: flex-start; flex-wrap: wrap;
      }}
      .dc {{ display: flex; flex-direction: column; align-items: center; gap: 6px; }}
      .dc em {{ color: rgba(255, 255, 255, 0.88); }}

      .note-box {{
        margin-top: 32px; padding: 20px 24px; border-radius: 10px;
        background: var(--ink); color: #DCDCE4; max-width: 86ch;
      }}
      .note-box h3 {{ color: var(--beam); }}
      .note-box p {{ font-size: 14.5px; margin-top: 8px; }}
      .note-box strong {{ color: var(--white); }}
      .note-box p + p {{ margin-top: 12px; }}
    </style>
  </head>
  <body>
    <header>
      <h1>The icon — six explorations</h1>
      <p>
        A and B kept, four added. The two were the ends of one axis — a tick that floats, or a beam
        that crosses — so these fill in between them (C, F) and step off it entirely (D, E). The
        wordmark is unchanged in every case; only the square moves.
      </p>
      <div class="lockup">
        <span class="word">Card{wordglyph()}</span>
        <span class="note">Settled: 35°, grave, contained. Not up for discussion here.</span>
      </div>
    </header>

{chr(10).join(rows)}

    <section class="v" style="border: 0">
      <h2>All six, 56px, on a home screen</h2>
      <p class="sub">The only view that asks whether a mark holds its own rather than whether it is pretty.</p>
      <div class="dock">{"".join(dock_cells)}</div>
    </section>

    <div class="note-box">
      <h3>What to look at</h3>
      <p>
        <strong>The themed cells, first.</strong> Android 13+ redraws the icon in one colour taken
        from the wallpaper. A and F lose their accent to it — with no hue left, a floating tick is
        just a speck above three bars. B, C and D survive because the beam is a separable shape.
        <strong>E cannot fail</strong>: its beam is a gap, and removing colour cannot remove a gap.
      </p>
      <p>
        <strong>Then 16px.</strong> That is where the three-bar stem is the risk, not the accent —
        watch whether the bars merge into a single block. If they do, the stem is the thing to
        simplify, not the beam.
      </p>
      <p>
        <strong>D is the one to be suspicious of.</strong> Bleeding off the edge reads powerfully at
        88px and is the most distinctive square here, but it stops being a letter — there is no ì
        left, just bars and a stripe. It also behaves differently under every launcher mask, which
        is a support cost forever.
      </p>
    </div>
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines, {len(VARIANTS)} variants")
for key, letter, name, *_ in VARIANTS:
    print(f"  {letter}  {name:12} r={GEO[key]['r']:6.2f}  android ×{ASCALE[key]:.3f}")
