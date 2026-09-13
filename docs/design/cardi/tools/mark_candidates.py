"""Build cardi-mark-candidates.html — six candidate marks, tested at every size
they must survive.

A specimen sheet showing six marks at ONE size does not answer the question. The
mark has four jobs and two of them constrain the drawing hard:

  icon.png 1024      iOS, masked to a squircle
  adaptive-icon.png  Android foreground — the outer third is MASKED AWAY, so the
                     mark must live inside the centre 66%
  monochromeImage    Android 13+ themed icon: ONE colour, a pure silhouette. A
                     beam distinguished only by being yellow DISAPPEARS here, so
                     the accent has to be a separable SHAPE, not a hue.
  favicon 48 / 16    where fine detail dies

So every candidate is rendered large, at 48, at 16, and as a flat silhouette,
with the Android safe circle drawn over one of them. Each mark is a <symbol>
instanced by <use>, so whichever wins can be lifted straight out as the asset.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is the generator of record for
# it, so frames/ is .prettierignore'd — Prettier would reformat the HTML
# and the two could never agree again. Run tools/verify.py to confirm every
# generator still reproduces its frame byte-for-byte.
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-mark-candidates.html"

INK, BEAM, CREAM, WHITE, MUTED = "#181824", "#FCCC0C", "#F0F0E8", "#FFFFFF", "#55555F"

# Every mark lives in a 100 x 100 box. The Android safe zone is the centre 66%,
# i.e. a circle of radius 33 about (50,50) — so nothing may stray outside r=33.
MARKS = {
    "solid": (
        "Solid stem, slanted accent",
        "The simplest possible reading. One bar, one accent.",
        '<rect x="44" y="44" width="12" height="40" rx="6" fill="var(--fg)" />'
        '<rect x="40" y="24" width="20" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 28.5)" />'),
    "barcode": (
        "Barcode stem",
        "The stem IS a barcode: three bars of different widths.",
        '<rect x="38" y="44" width="5" height="40" rx="2.5" fill="var(--fg)" />'
        '<rect x="46" y="44" width="9" height="40" rx="4.5" fill="var(--fg)" />'
        '<rect x="58" y="44" width="4" height="40" rx="2" fill="var(--fg)" />'
        '<rect x="40" y="24" width="20" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 28.5)" />'),
    "sweep": (
        "Sweeping accent",
        "The accent overshoots the stem: a beam crossing, not a dot above.",
        '<rect x="44" y="44" width="12" height="40" rx="6" fill="var(--fg)" />'
        '<rect x="32" y="26" width="36" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 30.5)" />'),
    "square": (
        "Square accent",
        "A tittle, not a grave. The most restrained option.",
        '<rect x="44" y="44" width="12" height="40" rx="6" fill="var(--fg)" />'
        '<rect x="43" y="22" width="14" height="14" rx="3" fill="var(--ac)" />'),
    "double": (
        "Split accent",
        "Two short strokes stacked: the beam, mid-sweep.",
        '<rect x="44" y="44" width="12" height="40" rx="6" fill="var(--fg)" />'
        '<rect x="38" y="19" width="24" height="6" rx="3" fill="var(--ac)"'
        ' transform="rotate(20 50 22)" />'
        '<rect x="38" y="29" width="24" height="6" rx="3" fill="var(--ac)"'
        ' transform="rotate(20 50 32)" />'),
    "full": (
        "THE FULL MARK — barcode stem, sweeping beam",
        "Candidates 2 and 3 combined: the design system's sentence, drawn. "
        "A beam passing over a barcode that is also a letter.",
        '<rect x="38" y="46" width="5" height="38" rx="2.5" fill="var(--fg)" />'
        '<rect x="46" y="46" width="9" height="38" rx="4.5" fill="var(--fg)" />'
        '<rect x="58" y="46" width="4" height="38" rx="2" fill="var(--fg)" />'
        '<rect x="32" y="26" width="36" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 30.5)" />'),
    "reduced": (
        "THE REDUCTION — the same letter, simplified",
        "What the full mark becomes at 48px and below, and for the Android "
        "themed layer. One stem, one accent, same proportions.",
        '<rect x="44" y="46" width="12" height="38" rx="6" fill="var(--fg)" />'
        '<rect x="34" y="26" width="32" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 30.5)" />'),
    "taper": (
        "Tapered stem",
        "The only candidate whose stroke is not uniform.",
        '<path d="M45.5 44 h9 l2.5 40 h-14 z" fill="var(--fg)" />'
        '<rect x="40" y="24" width="20" height="9" rx="4.5" fill="var(--ac)"'
        ' transform="rotate(20 50 28.5)" />'),
}


def symbols():
    out = ['  <svg width="0" height="0" style="position:absolute" aria-hidden="true">']
    for key, (_, _, body) in MARKS.items():
        out.append(f'    <symbol id="m-{key}" viewBox="0 0 100 100">{body}</symbol>')
    out.append("  </svg>")
    return "\n".join(out)


def tile(key, size, cls="", safe=False):
    ring = ('<circle cx="50" cy="50" r="33" fill="none" stroke="#C41E1E"'
            ' stroke-width="1" stroke-dasharray="4 3" />') if safe else ""
    return (f'<span class="tile {cls}" style="width:{size}px;height:{size}px">'
            f'<svg viewBox="0 0 100 100" width="{size}" height="{size}">'
            f'<use href="#m-{key}" />{ring}</svg></span>')


rows = []
for key, (name, note, _) in MARKS.items():
    rows.append(f'''      <div class="row">
        <div class="big">
          {tile(key, 200)}
        </div>
        <div class="meta">
          <h2>{name}</h2>
          <p>{note}</p>
          <div class="sizes">
            <span class="s"><em>180</em>{tile(key, 90)}</span>
            <span class="s"><em>48</em>{tile(key, 48)}</span>
            <span class="s"><em>16</em>{tile(key, 16)}</span>
            <span class="s"><em>mono</em>{tile(key, 48, cls="is-mono")}</span>
            <span class="s"><em>on cream</em>{tile(key, 48, cls="is-light")}</span>
            <span class="s"><em>safe zone</em>{tile(key, 90, safe=True)}</span>
          </div>
        </div>
      </div>''')

HTML = f'''<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Cardì — the mark, eight candidates</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@700&display=swap"
      rel="stylesheet"
    />
    <style>
      /* ==================================================================
         Cardì — THE MARK. Six candidates, each tested at every size it has to
         survive.

         The mark has FOUR jobs, and two of them constrain the drawing hard:

           icon.png 1024      iOS, masked to a squircle.
           adaptive-icon.png  Android foreground — the OUTER THIRD IS MASKED
                              AWAY, so the mark must sit inside the centre 66%.
                              The dashed red circle on each row is that boundary.
           monochromeImage    Android 13+ themed icon: ONE colour, a pure
                              silhouette. An accent distinguished ONLY by being
                              yellow disappears completely here — which is why
                              every candidate keeps the accent physically
                              SEPARATE from the stem rather than relying on hue.
                              That constraint is currently unmet: app.json has
                              monochromeImage: null, so Material You falls back.
           favicon 48 / 16    where fine detail dies.

         The brief, from cardi-design-system.md: the name is card + the Italian
         ì, and "the grave accent on that ì is the brand's only ornament: at rest
         it is a dot, in motion it is a scan beam passing over a barcode." So
         every candidate is exactly TWO elements — a stem and an accent — and
         nothing else. No card, no wallet, no shield, no swoosh.

         Each mark is a <symbol> instanced by <use>, so whichever wins lifts
         straight out as the asset with no redrawing.
         ================================================================== */

      :root {{
        --ink: {INK};
        --beam: {BEAM};
        --cream: {CREAM};
        --white: {WHITE};
        --muted: {MUTED};
        --fg: var(--white);
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
        padding: 48px 32px 64px;
      }}

      header h1 {{
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 28px;
        letter-spacing: -0.02em;
      }}

      header p {{
        font-size: 15px;
        line-height: 22px;
        color: var(--muted);
        max-width: 62ch;
        margin-top: 8px;
      }}

      .row {{
        display: flex;
        gap: 32px;
        align-items: center;
        padding: 32px 0;
        border-bottom: 1px solid #d6d6cb;
      }}

      .big {{
        flex: 0 0 auto;
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

      .sizes {{
        display: flex;
        gap: 24px;
        align-items: flex-end;
        margin-top: 20px;
        flex-wrap: wrap;
      }}

      .s {{
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }}

      .s em {{
        font-style: normal;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--muted);
      }}

      /* The tile is the icon: an ink squircle, because that is how it ships. */
      .tile {{
        display: inline-flex;
        background: var(--ink);
        border-radius: 22%;
        overflow: hidden;
      }}

      /* The Android 13 themed layer. One colour, no hue to lean on. */
      .tile.is-mono {{
        --fg: var(--white);
        --ac: var(--white);
      }}

      /* And the inverse, for the in-app mark on a cream page. */
      .tile.is-light {{
        background: var(--cream);
        border: 1px solid #d6d6cb;
        --fg: var(--ink);
        --ac: var(--beam);
      }}
    </style>
  </head>
  <body>
    <header>
      <h1>The mark — eight candidates</h1>
      <p>
        The brand's only ornament is the grave accent on the ì: at rest a dot, in motion a scan
        beam passing over a barcode. Every candidate is exactly two elements, a stem and an
        accent, and nothing else. Each is shown at the sizes it has to survive, as a flat
        silhouette for the Android themed layer, and against the dashed circle that marks
        Android's 66% safe zone — which is a SCALE FACTOR for the Android foreground, not a pass
        or fail, since iOS has no equivalent mask. Measured: 0.915 for the full mark, 0.956 for
        the reduction.
      </p>
      <p>
        <strong>The last two are the recommendation.</strong> Distinctiveness and robustness pull
        opposite ways here — the barcode stem and the sweeping beam are the only candidates that
        say what the product actually is, and they are also the two that suffer most at 16px. So
        the answer is not one mark but a PAIR SHARING ONE BEAM: the full mark at 48px and above,
        the reduction below it and for the Android themed layer.
      </p>
    </header>
{symbols()}
{chr(10).join(rows)}
  </body>
</html>
'''

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines, {len(MARKS)} candidates")
