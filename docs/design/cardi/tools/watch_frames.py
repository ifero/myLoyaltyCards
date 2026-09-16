"""Build cardi-watch-frames.html -- the six watch screens, both Wear shapes and
the watchOS size classes.

Story 23.1. The six screens are not six designs: they are THREE SURFACES BUILT
TWICE -- card list, barcode flash, sort picker -- and drawing them as pairs is
what keeps the two apps from drifting into separate design languages again.
(`ContentView.swift` is not a screen. It is twelve lines mounting CardListView.)

Every frame is drawn 1:1 in its own unit -- dp for Wear, pt for watchOS -- so a
measurement taken off this sheet is the real one. Nothing is scaled.

Spec: ../cardi-watch-grammar.md. Sizes: ../cardi-design-system.md, Layout & Spacing.
"""
# Lives in docs/design/cardi/tools/ and writes into ../frames/.
# The output is COMMITTED and this script is its generator of record, so
# frames/ is .prettierignore'd. Run tools/verify.py (yarn frames:check) to
# confirm it still reproduces the frame byte for byte.
import pathlib

import _watch_shared as S

OUT = pathlib.Path(__file__).resolve().parent.parent / "frames" / "cardi-watch-frames.html"

EXTRA_CSS = """
      /* Wear's TransformingLazyColumn morphs items toward the edges rather than
         letting the round crop guillotine them. Drawn here, because a frame that
         shows rows sliced by the bezel teaches the wrong layout. */
      .morph-1 {
        transform: scale(0.88);
        opacity: 0.66;
      }

      .morph-2 {
        transform: scale(0.78);
        opacity: 0.4;
      }
"""


def head_padding(h, shape):
    """Top padding above a ListHeader.

    On a round screen it is a PERCENTAGE of the height, per Google's round-screen
    guidance: a fixed inset meets the curve at a different place on every device.
    On a square or watchOS frame there is no curve, so it is a flat 8 -- the same
    value for the card list and the sort picker, which are the same element.
    """
    return round(h * 0.13) if shape == "round" else 8


def row(name, hex_color, initials, favourite=False, morph=""):
    """One card row. Ink fill, cream name, beam star, no plate behind the star."""
    star = ""
    if favourite:
        # Beam, 14, no plate. On an ink row the plate the phone needs has nothing
        # to defeat -- beam on ink is 11.5:1.
        star = ('<span class="star"><svg width="14" height="14" viewBox="0 0 24 24" '
                'aria-hidden="true"><path fill="var(--beam)" d="M12 2.6l2.9 5.9 6.5.95'
                '-4.7 4.6 1.1 6.45L12 17.45 6.2 20.5l1.1-6.45-4.7-4.6 6.5-.95z"/></svg></span>')
    cls = f"row {morph}".strip()
    return (f'<div class="{cls}">'
            f'<span class="accent" style="background:{hex_color}"></span>'
            f'<span class="avatar" style="background:{hex_color};color:{S.on_color(hex_color)}">'
            f'{initials}</span>'
            f'<span class="name">{name}</span>{star}</div>')


def card_list(w, h, shape, morph_edges):
    """The card list. Single column, and blessed as such -- a 192 dp screen fits
    one tile, so the phone's two-column grid has nothing to be a grid of."""
    head_pad = head_padding(h, shape)
    # Which rows sit near the curve, and therefore morph. Index into S.BRANDS so
    # the brand table has exactly one definition -- re-typing it here was the
    # source duplication _watch_shared.py exists to remove.
    morphs = {0: "morph-1", 3: "morph-1", 4: "morph-2"} if morph_edges else {}
    rows = [
        row(name, hexv, initials, favourite=(i == 0), morph=morphs.get(i, ""))
        for i, (name, hexv, initials) in enumerate(S.BRANDS[:5])
    ]
    side = round(w * 0.052) if shape == "round" else 6
    return (f'<div class="rows" style="padding:0 {side}px;margin-top:6px">'
            f'{"".join(rows)}</div>'), head_pad, side


def screen_list(w, h, shape, label, sub):
    body, head_pad, side = card_list(w, h, shape, shape == "round")
    env = " envelope" if shape == "square" else ""
    return plate(
        f'<div class="screen {shape}{env}" style="width:{w}px;height:{h}px">'
        f'<div class="listhead" style="padding-top:{head_pad}px">Cards</div>'
        f'{body}</div>', label, sub)


def screen_list_watchos(w, h, label, sub):
    """watchOS keeps its own navigation strip on the list too -- the clock lives
    there and cannot be moved. Drawn, not omitted: an empty strip reads as slack
    padding and invites the wrong fix."""
    body, _, _ = card_list(w, h, "square", False)
    return plate(
        f'<div class="screen square" style="width:{w}px;height:{h}px">'
        f'<div class="strip" style="height:26px"><span class="cardname">Cards</span>'
        f'<span class="clock">10:09</span></div>'
        f'{body}</div>', label, sub)


def screen_flash_wear(w, h, shape):
    """Wear blanks the clock outright -- ScreenScaffold(timeText = {}) -- so there
    is no strip to reserve and the white field goes edge to edge.

    NOTE the missing `envelope` class on the square variant, which every other
    square frame here carries. The envelope is a dashed guide showing the round
    layout's footprint -- and on this screen it would be a line drawn ACROSS THE
    BARS. "Nothing may overlay the bars, ever" is a rule about the product, but a
    reference frame that breaks it teaches the break. It also happens to be wrong
    on its own terms: this screen goes white edge to edge, so a circle is not its
    footprint.
    """
    bar_w = round(w * 0.72)
    return plate(
        f'<div class="screen flash {shape}" style="width:{w}px;height:{h}px">'
        f'<div class="title" style="margin-bottom:6px">Esselunga</div>'
        f'<div class="bars" style="width:{bar_w}px;height:{round(h * 0.34)}px"></div>'
        f'<div class="digits" style="margin-top:6px">2095110257978</div>'
        f'</div>',
        f"Wear {shape} &mdash; barcode flash",
        "White edge to edge. Clock blanked, nothing overlaid, surround neutral.")


def screen_flash_watchos(w, h, label):
    """watchOS keeps the top strip: the system clock is drawn there with no API to
    suppress it, and reclaiming the inset lets white glyphs fall straight THROUGH
    the black bars (measured, 46 mm). The strip is part of the BLACK surround --
    which is why the card name is cream and not ink, and why the accent, which
    would otherwise tint it BEAM, is overridden here."""
    strip_h = 26
    bar_w = round(w * 0.84)
    return plate(
        f'<div class="screen square" style="width:{w}px;height:{h}px">'
        f'<div class="strip" style="height:{strip_h}px">'
        f'<span class="chev">&lsaquo;</span>'
        f'<span class="cardname">Esselunga</span>'
        f'<span class="clock">10:09</span></div>'
        f'<div class="flash" style="flex:1 1 auto;border-radius:8px;margin:0 4px 4px">'
        f'<div class="bars" style="width:{bar_w - 8}px;height:{round((h - strip_h) * 0.46)}px">'
        f'</div>'
        f'<div class="digits" style="margin-top:6px">2095110257978</div>'
        f'</div></div>',
        label,
        "Strip reserved for the unsuppressable clock. Title cream, never beam.")


def screen_sort(w, h, shape, label, sub, morph_edges):
    head_pad = head_padding(h, shape)
    side = round(w * 0.052) if shape == "round" else 6
    opts = [
        ("Frequently used", False, "morph-1" if morph_edges else ""),
        ("Recently added", False, ""),
        ("A&ndash;Z", True, ""),
    ]
    body = "".join(
        f'<div class="opt {"sel" if sel else ""} {m}"><span class="dot"></span>'
        f'<span>{text}</span></div>'
        for text, sel, m in opts)
    env = " envelope" if shape == "square" else ""
    return plate(
        f'<div class="screen {shape}{env}" style="width:{w}px;height:{h}px">'
        f'<div class="listhead" style="padding-top:{head_pad}px">Sort</div>'
        f'<div class="rows" style="padding:0 {side}px;margin-top:6px">{body}</div>'
        f'</div>', label, sub)


def plate(inner, caption, sub=""):
    em = f"<em>{sub}</em>" if sub else ""
    return (f'    <figure class="plate">{inner}'
            f'<figcaption>{caption}{em}</figcaption></figure>')


# ---- the sheet -------------------------------------------------------------
W = S.WEAR
wear_round = [
    screen_list(W, W, "round", "Wear round &mdash; card list",
                "192 dp. Edge rows morph; they are never sliced by the bezel."),
    screen_flash_wear(W, W, "round"),
    screen_sort(W, W, "round", "Wear round &mdash; sort picker",
                "Selected = beam, and the control moves too. Never colour alone.", True),
]
wear_square = [
    screen_list(W, W, "square", "Wear square &mdash; card list",
                "Same layout. The corners are usable and stay EMPTY."),
    screen_flash_wear(W, W, "square"),
    screen_sort(W, W, "square", "Wear square &mdash; sort picker",
                "Identical to round. Two designs is what this document prevents.", False),
]

CLASSES = ["40 mm", "46 mm", "49 mm"]
watchos_list = [
    screen_list_watchos(*S.WATCHOS[c], f"watchOS {c} &mdash; card list",
                        f"{S.WATCHOS[c][0]} &times; {S.WATCHOS[c][1]} pt")
    for c in CLASSES
]
watchos_flash = [
    screen_flash_watchos(*S.WATCHOS[c], f"watchOS {c} &mdash; barcode flash")
    for c in CLASSES
]
watchos_sort = [
    screen_sort(*S.WATCHOS[c], "square", f"watchOS {c} &mdash; sort picker",
                "A sheet, pushed from the list's toolbar.", False)
    for c in CLASSES
]

HTML = f"""{S.head('Cardì on the watch — the six screens', EXTRA_CSS)}  <body>
    <h1>{S.wordmark(26)} on the watch &mdash; the six screens</h1>
    <p class="note">
      Reference frames for Story 23.1. <b>Three surfaces, built twice</b> &mdash; card list,
      barcode flash, sort picker &mdash; not six unrelated screens. Every frame is drawn
      <b>1:1 in its own unit</b>: dp for Wear, pt for watchOS. Nothing is scaled, so a
      measurement taken off this sheet is the real one. The rules are in
      <b>cardi-watch-grammar.md</b>; this sheet is a copy of them, never the source.
    </p>

    <h2>Wear OS &mdash; round, 192 &times; 192 dp</h2>
    <p class="note">
      <b>192 dp, not 384.</b> 384 is the same screen counted in pixels at the &times;2 density
      every current Wear device uses. Google's guidance is dp and round-first: design at the
      smallest supported round screen, then let 225 dp and larger grow into the space. Outer
      margins are a <b>percentage</b> of the screen, because a fixed margin meets the curve at a
      different place on every device.
    </p>
    <div class="row-of-plates">
{chr(10).join(wear_round)}
    </div>

    <h2>Wear OS &mdash; square, 192 &times; 192 dp</h2>
    <p class="note">
      <b>The same layout, not a second one.</b> The round design already lives inside the
      inscribed square of its own circle, so it fits a square screen with room to spare &mdash;
      drawing both is how that gets checked. The dashed circle is the round envelope. The corners
      become usable and the rule is to <b>leave them empty</b>: content in the corners cannot be
      the same design as the round one, and two designs is the outcome this document exists to
      prevent.
    </p>
    <p class="note">
      <b>The barcode frame carries no envelope, and that is the rule applied to this sheet.</b>
      The dashed circle would be a line drawn <b>across the bars</b> &mdash; and
      <em>nothing may overlay a barcode, ever</em> holds for a reference frame as much as for the
      product, because a frame that breaks a rule teaches the break. It would also be wrong on its
      own terms: that screen goes white edge to edge, so a circle is not its footprint.
    </p>
    <div class="row-of-plates">
{chr(10).join(wear_square)}
    </div>

    <h2>watchOS &mdash; card list, by size class</h2>
    <p class="note">
      Drawn at the <b>40 mm floor</b> (the watch target deploys to watchOS 10, whose oldest
      hardware is the 40 mm), then checked at the <b>46 mm &mdash; which is the WIDEST watch at
      208 pt, not the 49 mm Ultra</b> &mdash; and the 49 mm, which is the tallest. The row is
      <b>48 pt</b> on both platforms, derived rather than gridded:
      <code>max(max(28, 30) + 2&times;9, tap) = 48</code>. watchOS declares a 44 pt minimum that
      <b>never binds</b>, because the content is already 48.
    </p>
    <div class="row-of-plates">
{chr(10).join(watchos_list)}
    </div>

    <h2>Barcode flash &mdash; the hero screen, both platforms</h2>
    <p class="note">
      White field, true-black bars, hard module edges, <b>nothing overlaid &mdash; ever</b>. On a
      watch the constraint is <b>stronger</b> than on the phone, not weaker: modules are 2&ndash;3
      device pixels wide, and every 1D decoder normalises its digit classification against the
      narrowest element, so a one-pixel error here is a 30&ndash;50&nbsp;% error.
    </p>
    <div class="callout ban">
      <b>The two platforms differ, and it is one rule meeting two operating systems.</b> Wear
      blanks the clock outright (<code>ScreenScaffold(timeText = {{}})</code>) and goes white edge
      to edge. watchOS <b>cannot</b> suppress its clock &mdash; measured at 46 mm, reclaiming the
      inset draws white glyphs straight <b>through</b> the black bars &mdash; so it keeps a
      reserved strip. That strip is part of the <b>black surround</b>, which is why the card name
      in it is <b>cream</b>: the accent colour, which Apple applies to the app's title string in
      the status bar, would otherwise paint it <b>beam &mdash; on the barcode screen</b>, and no
      beam is ever drawn on either.
    </div>
    <div class="row-of-plates">
{chr(10).join(watchos_flash)}
    </div>

    <h2>Sort picker &mdash; watchOS, by size class</h2>
    <p class="note">
      The third surface, and the one most easily forgotten: on watchOS it is a <b>sheet</b> inside
      <code>CardListView.swift</code> rather than a file of its own, which is why the story's
      screen count read as three-versus-three when it is really three-and-three.
    </p>
    <div class="callout">
      <b>The dot is schematic &mdash; it is the one thing on this sheet that is NOT 1:1.</b> Every
      other frame here is drawn at true size and a measurement taken off it is real, so this
      exception has to be said out loud. <b>Each platform keeps its own native selected control</b>:
      watchOS a semibold label plus a trailing <code>checkmark</code>, Wear a Material&nbsp;3
      <code>RadioButton</code>. <b>What changes is the tint &mdash; to beam</b> &mdash; and what must
      survive is the <b>double encoding</b>: the control's state <em>and</em> the label's weight both
      move, so selection is never carried by colour alone. Swapping either control for a drawn dot
      would cost the platform's own accessibility semantics for no gain.
    </div>
    <div class="row-of-plates">
{chr(10).join(watchos_sort)}
    </div>

    <h2>The one collision this sheet exists to show</h2>
    <div class="callout">
      The top row is <b>Esselunga</b>, whose brand colour is <b>#FFCC00</b> &mdash; and the
      favourite star beside it is beam <b>#FCCC0C</b>. They are effectively the same yellow, which
      is exactly why the star is drawn on the <b>ink row</b> and never on the brand fill: beam on
      ink is <b>11.5:1</b>, and the brand colour is confined to a 5 pt accent bar and a 30 pt
      avatar. This is also why the phone's <b>ink plate</b> behind the star does not carry over
      &mdash; on the phone the star sits on a brand-filled tile and needs the plate; here it has
      nothing to defeat. What the shipped code does instead is worse in both apps: watchOS paints
      the star <b>#FFCC00</b>, which is Esselunga's own colour, and Wear paints it
      <b>#F59E0B</b>, which is an amber this system bans outright &mdash; and which is
      bit-identical to its own <code>orange</code> card key.
    </div>
  </body>
</html>
"""

OUT.write_text(HTML, encoding="utf-8")
print(f"wrote {OUT.name} — {len(HTML.splitlines())} lines, "
      f"{len(wear_round) + len(wear_square) + len(watchos_list) + len(watchos_flash) + len(watchos_sort)} frames")
