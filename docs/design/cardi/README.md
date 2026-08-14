# Cardì redesign — session carry-over

Rescued from a Claude Desktop session (`809c5078-1eaf-43bf-8079-d4734cbd5808`, party-mode
run started 2026-08-11) whose scratchpad lived in `/tmp` and whose API connection died on
2026-08-12. Everything here was produced in that session; this README is the handover.

## Files

| File                                | What it is                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `cardi-design-system.md`            | **The canonical Cardì design system.** Stitch gets a disposable render of this — this repo copy is the source of truth.           |
| `palette-bench.html`                | Five-direction palette comparison board (01 Ink & Beam … 05 Night Market). Superseded as a _layout_ study, still valid on chrome. |
| `stitch-prompts-form-states.txt`    | **The four state frames** — default / error / filled / saving. Frame 1 is the exemplar the other seven screens derive from.       |
| `stitch-prompt-01-form-pattern.txt` | Superseded. The prompt actually sent on 2026-08-11, kept as a record — it describes a screen that does not exist.                 |

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

### Resolved 2026-08-14 — the primary-action footer

> _"Why shouldn't we stick the add button to the bottom? It's the most intuitive thing."_
> — asked 2026-08-13, answered after the carry-over.

**Yes, anchor it.** The objection it was pushing back on ("a swimming pool of nothing… a
button glued to the floor") made a real observation with the wrong cause attached: the gap
and the anchoring are the _same thing_, and what made the gap read as unfinished was a lone
button floating in cream with nothing marking it as a footer. Decided:

- Anchored bottom footer, separated by a **1px hairline rule** — the gap above is
  composition, not absence.
- **Never `position: absolute`** — a flex sibling below the scroll area, or an
  auto-top-margin anchor inside it when the button must live in scrollable content, so it
  never fights the keyboard. See below: `CardSetupScreen` already does exactly this.
- **Always enabled**; pressing an incomplete form reveals the field errors.

Both are now in `cardi-design-system.md` (§ _The primary-action footer_, plus two new
Forbidden entries) and in the prompt template's FOOTER block.

Two code findings that fed the decision, neither fixed here:

- The app has **two form treatments, not one**. `AuthScreenLayout` — the shared layout for
  6 of the 8 pattern screens — centres its content vertically (`centerContent` defaults to
  `true`), while `CardForm` is top-aligned with the button trailing the last field and
  `paddingBottom: 100` after it. Neither is bottom-anchored, so the anchored footer isn't
  fighting a shipped convention; it's filling a vacuum and unifying a fork. That unification
  is the actual implementation story.
- **Three answers to the screen margin:** `CardForm` hardcodes `paddingHorizontal: 32`,
  `AuthScreenLayout` uses the `layout.screenHorizontalMargin` token, and the DS specifies
  20px. Worth a separate pass.

### Resolved 2026-08-14 — the four state frames, and the label case

`stitch-prompts-form-states.txt` holds four self-contained prompts (default / error /
filled / saving), ready to generate in sequence. States are separate frames because baking
an error into the canonical screen would make all seven derived screens inherit a permanent
red field. Each prompt repeats the full chrome deliberately — Stitch has no memory between
generations, so "same as before" gets a different screen.

**Form field labels are UPPERCASE** (`label-bold`, Inter 13/600/+0.02em). Ratifying what the
generator chose by accident: the tracking already in the token is an uppercase idiom, and
casing the label differently from its value is what lets someone parse the form's structure
at a glance. Checked first that it wasn't a constraint problem — labels are short in both
locales (`Store name` / `Nome negozio`), so it cost nothing either way and came down to
voice.

Writing the prompts meant reading the real screen, which turned up three things:

- **`CardSetupScreen` already implements both footer rules.** Its Done button sits outside
  the `ScrollView` as a flex sibling — a genuinely pinned footer — and it is
  `disabled={isLoading}` only, with validation raised on press (`setStoreNameError` inside
  `handleDone`). So yesterday's decision ratifies shipped behaviour rather than inventing
  it, and `CardForm` is the outlier that gates on `!isValid`. The design system now cites
  it as the reference implementation.
- **The superseded prompt described a screen that does not exist.** It blended fields from
  `CardForm` and `CardSetupScreen`, invented an "Add to favourites" toggle that exists in
  neither, got the labels wrong, and called the button "Save card" when it reads "Done".
  The one generated screen was judged good against that prompt — worth knowing before
  trusting it.
- **The shipped card colours are not the Cardì five.** `CARD_COLORS` in
  `shared/theme/tokens.generated.ts` is `blue #1A73E8`, `red #E2231A`, `green #16A34A`,
  `orange #F59E0B`, `grey #64748B` — against the DS's `#E42424 / #0C3C84 / #0C84CC /
#0C843C / #FCCC0C`. **One of the shipped five is orange, which this system bans
  outright.** This is not a repaint: the `CardColor` union has members (`orange`, `grey`)
  that Cardì has no equivalent for, and existing users have cards persisted against them.
  The tokens PR (step 5) needs a data migration decision, not just new hexes.

### Stitch state, verified 2026-08-14 — the frames are BLOCKED until this is fixed

Read back over MCP. The asset and the project theme have diverged, which is the documented
trap: activating a design system snapshots its designMd into `project.designTheme`, and
later asset edits do not propagate.

- **Asset `484682383639656270` (now version 7) — designMd is CORRECT.** It carries "The
  content is the colour", Card **tile**, `CUSTOM CARDS ONLY`, the Esselunga collision and
  the full Forbidden list. The 2026-08-12 corrections survived.
- **`project.designTheme.designMd` is STALE — it is the pre-correction text.** It still
  says _"The beam motif may animate once across the barcode on open"_ and _"Never a
  two-column grid of cards on mobile"_, still calls the component a Card **row**, still
  marks the accents `DATA ONLY`, and has no content-is-the-colour section at all. Its
  Forbidden list bans two-column card grids. **This is what the generator reads.**
- **The tonal palette is mangled in both**, unchanged since 2026-08-12: `primary #000000`,
  `secondary #375ca6`, `tertiary #735c00` (brown) with `#cfa700` mustard, `surface #fafaf2`
  instead of cream, `error #ba1a1a` instead of `#C41E1E`, `ROUND_EIGHT` instead of 12px.
  The overrides are all set correctly and all ignored. This is why every prompt spells
  literal hexes.
- The asset also carries the competing **`styleGuidelines`** field. It currently paraphrases
  the corrected designMd rather than contradicting it, but it drops the content-is-the-colour
  thesis and the Esselunga collision.
- The canvas holds a **780×1768** frame and a **390×852** one — neither is the mandated
  393×852.

Before generating, in order:

1. Push the current repo designMd to the asset (`update_design_system`, **full payload** —
   it replaces the whole object). It needs the two new sections that exist only in the repo:
   the primary-action footer and the uppercase label rule.
2. **Re-apply the design system in the Stitch UI** so `project.designTheme` picks up the
   asset. This step is UI-only and cannot be done over MCP — and it is the step that has
   been missed.
3. Re-read `get_project` and confirm `designTheme.designMd` no longer contains "may animate
   once across the barcode".

The asset went from version 5 on 2026-08-12 to version 7, and the project's `updateTime` is
today — so something is still editing it. The original desktop session was still running as
PID 24364; quitting it removes one candidate.

### Still open

1. Generate the four state frames and judge them — blocked on the re-apply above.
2. Design the **wallet empty state** (zero cards, first launch). Distinct from the form's
   default state; repeatedly raised, never designed.
3. Re-verify the Stitch design system hasn't been clobbered again since 2026-08-12.
4. Decide the `orange` / `grey` → Cardì card-colour migration before the tokens PR.
5. Three answers to the screen margin (`CardForm` 32px hardcoded, `AuthScreenLayout` token,
   DS 20px) and the busy-button divergence — the shared `Button` greys its fill when
   `loading`, where the DS now says busy keeps the ink.
