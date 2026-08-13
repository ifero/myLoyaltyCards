# Cardì redesign — session carry-over

Rescued from a Claude Desktop session (`809c5078-1eaf-43bf-8079-d4734cbd5808`, party-mode
run started 2026-08-11) whose scratchpad lived in `/tmp` and whose API connection died on
2026-08-12. Everything here was produced in that session; this README is the handover.

## Files

| File                                | What it is                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cardi-design-system.md`            | **The canonical Cardì design system.** Stitch gets a disposable render of this — this repo copy is the source of truth.           |
| `palette-bench.html`                | Five-direction palette comparison board (01 Ink & Beam … 05 Night Market). Superseded as a _layout_ study, still valid on chrome. |
| `stitch-prompt-01-form-pattern.txt` | The Stitch prompt that produced the working form-pattern screen. Template for the remaining seven.                                |

## The thesis

> **The content is the colour.** The home screen already carries ~45 third-party brand
> colours that arrive with the data. Our palette exists to stay _out of their way_, not to
> compete. Playfulness comes from big, uncropped, correctly-coloured brand marks — a
> **layout** decision, never a palette one.

Ink `#181824` · Beam `#FCCC0C` · Cream `#F0F0E8` · Deep blue `#0C3C84`.
Coral / salmon / terracotta / orange are **banned** (the "new" coral `#FF6B6B` was the old
terracotta renamed — and it's Monzo's, on a card app).

## Decided order of work

|     |                           |                                                         |
| --- | ------------------------- | ------------------------------------------------------- |
| ✅  | 0. Design system          | done — this folder                                      |
| ✅  | 1. Form pattern exemplar  | generated, refined once                                 |
| →   | 2. Remaining screens      | 17 own-screens reduce to **4 patterns**                 |
|     | 3. Icon set               | inventory falls out of 1–2                              |
|     | 4. Illustrations          | commissioned as a set; onboarding + empty states only   |
|     | 5. Code: tokens PR        | phone + watchOS + Wear OS together, one PR              |
|     | 6. Code: layout           | screen by screen, normal stories, behind the new tokens |
|     | 7. Brand + native release | name, icon, splash — one binary, no OTA                 |

The four patterns: **form** (8 screens) · **settings list** (2) · **document** (2) ·
**pitch** (3 + empty state). Wave A is illustration-free (form, settings, empty state);
Wave B is blocked until the illustration set exists.

## Stitch mechanics learned the hard way

- **Write literal hexes into every prompt; never trust a token name.** Material's tonal
  engine turns beam `#FCCC0C` into brown `#735c00` and ink into pure black, no matter what
  the prose forbids. The one screen that came out right did so because the prompt spelled
  every hex out character by character.
- **Touching the design system in the Stitch UI regenerates it** and silently reverts MCP
  edits (the asset reached v5 and restored two rules we had killed). Paste the system in
  fresh rather than letting the UI panel regenerate it.
- **Activate the design system _before_ generating.** `apply_design_system` afterwards only
  re-skins colour; the load-bearing rules (no tab bar, no FAB, label-above-field, 2-column
  grid) live in the designMd prose and only influence _generation_.
- `update_design_system` replaces the whole object — a partial call wipes the designMd.
- `BRICOLAGE_GROTESQUE` is in the font enum but rejected by the backend. Use
  `SPACE_GROTESK`.
- Theme-level `typography`/`spacing` maps are accepted then not persisted — keep them in
  the designMd frontmatter.
- `generate_screen_from_text` over MCP times out; the web prompt box is the reliable path.

## Where it stopped

Stitch project `7004325876123157178` ("Cardì"), design system asset `484682383639656270`
("Cardì — Ink & Beam").

Open, unanswered when the connection dropped:

1. **"Why shouldn't we stick the add button to the bottom? It's the most intuitive thing."**
   — asked 2026-08-13, never answered.
2. Split the form exemplar into **separate state frames** (default / error / filled /
   saving) rather than baking an error into the canonical screen.
3. Rule deliberately on the **uppercase tracked labels** Stitch chose on its own — it will
   propagate to all eight form screens.
4. Design the **wallet empty state** (zero cards, first launch). Distinct from the form's
   default state; repeatedly raised, never designed.
5. Re-verify the Stitch design system hasn't been clobbered again since 2026-08-12.
