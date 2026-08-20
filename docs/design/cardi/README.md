# Cardì redesign — session carry-over

Rescued from a Claude Desktop session (`809c5078-1eaf-43bf-8079-d4734cbd5808`, party-mode
run started 2026-08-11) whose scratchpad lived in `/tmp` and whose API connection died on
2026-08-12. Everything here was produced in that session; this README is the handover.

## Files

| File                                | What it is                                                                                                                                                                             |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cardi-design-system.md`            | **The canonical Cardì design system.** Stitch gets a disposable render of this — this repo copy is the source of truth.                                                                |
| `palette-bench.html`                | Five-direction palette comparison board (01 Ink & Beam … 05 Night Market). Superseded as a _layout_ study, still valid on chrome.                                                      |
| `stitch-prompts-form-states.txt`    | **The four state frames** — default / error / filled / saving. Frame 1 is the exemplar the other seven screens derive from.                                                            |
| `stitch-prompt-01-form-pattern.txt` | Superseded. The prompt actually sent on 2026-08-11, kept as a record — it describes a screen that does not exist.                                                                      |
| `stitch-prompts-wallet.txt`         | **The wallet pattern** — populated / empty / single-card / no-results, specced against the real `CardList`. Carries eight findings from reading the code.                              |
| `stitch-prompts-settings.txt`       | **The settings pattern** — screen (signed-in / guest) plus the four sheet SHAPES the eight sheets reduce to. Specced against the real `SettingsScreen`.                                |
| `frames/cardi-form-frames.html`     | **The reference implementation.** Hand-authored, exactly 393 × 852, all four states. This is what screens derive from — not the PNGs. Open with `?probe` for a measured geometry dump. |
| `frames/cardi-wallet-frames.html`   | **The wallet frames** — populated / empty / single-card / no-results, hand-authored at 393 × 852. Self-contained; shares its token block with the form file by copy, not by link.      |
| `frames/cardi-settings-frames.html` | **The settings frames** — signed-in / guest plus one frame per sheet shape, hand-authored at 393 × 852. Frames C–F share one backdrop string, so it cannot drift.                      |
| `frames/0*.png`                     | Stitch's actual output, kept as evidence. Faithful to what the generator produced, including three defects it cannot avoid — see _The 2026-08-15 audit_.                               |

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
| ✅  | 1. Form pattern exemplar  | all **four state frames** generated + judged 2026-08-14 |
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
- `generate_screen_from_text` over MCP times out **and never lands a screen** — verified
  2026-08-14 with three attempts and 13 minutes of polling. Generation _from zero_ is what
  fails.
- **`generate_variants` is the working MCP route.** Seed it with an existing screen id and it
  returns the finished screen synchronously in the tool result. Use
  `creativeRange: REFINE` + `aspects: ["TEXT_CONTENT"]` + `variantCount: 1`, and describe
  only the delta. See § _UNBLOCKED_ below.
- **Both generate calls take `designSystem: "assets/<id>"` and `modelId: "GEMINI_3_1_PRO"`.**
  Passing the asset id points at the live asset instead of the project's rotting snapshot, so
  the UI "apply" step is not needed to generate correctly.

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

### Stitch state, verified 2026-08-14 — the divergence is real, but it does NOT block generating

> **Superseded in part.** Everything below about the asset/theme divergence is still true and
> re-verified today. The conclusion that it _blocks the frames_ was wrong: pass the asset id
> as `designSystem` on the generate call and the stale project theme is bypassed entirely.
> See "UNBLOCKED" below. The UI re-apply is still worth doing eventually so the Stitch canvas
> and the repo agree, but nothing is waiting on it.

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

### 2026-08-14 — the push was attempted, and the DS compressed it

Pushed the full repo designMd to the asset. Two new mechanics, both worse than the ones
already recorded:

- **`update_design_system` is asynchronous.** It returns
  `projects/{id}/sessions/{session_id}` — a session, not the asset — and the asset is
  unchanged when read back immediately. It settled about a minute later.
- **The write triggers an agent regeneration that SUMMARISES your designMd.** The asset went
  7 → 8 and what landed is a paraphrase, not the text sent. Casualties, in one round trip:
  the entire **primary-action footer** section, the **uppercase label** rule, the thesis
  sentence _"Playfulness in Cardì comes from big, uncropped, correctly-coloured brand
  marks — a layout decision, never a palette one"_, and six Forbidden entries including both
  new ones and _"replacing the home grid with a single-column list of rows"_. `ROUND_TWELVE`
  was reverted to `ROUND_EIGHT` and the tonal palette is untouched.

Net: **v8 holds fewer rules than v7 did.** The push cost more than it bought.

The conclusion is structural rather than procedural: **the Stitch design system cannot hold
this system.** It compresses on every write, and it drops the longest and most recently
added prose first — which is always the rule you just fought for. Treat it as a lossy cache
of the hard constraints, never the contract. Anything that must survive belongs in the
prompt, spelled out, every time. That is now load-bearing rather than belt-and-braces: the
four state prompts are self-sufficient by design and do not depend on the DS being right.

If it is worth another attempt, send a deliberately **short** designMd — prohibitions only,
no rationale — on the theory that compression is length-driven and a flat constraint list is
the highest-signal shape a generator can be given anyway.

~~Before generating, in order:~~ **This three-step ritual turned out to be unnecessary — see
"UNBLOCKED" below. Kept as a record of the assumption.**

1. ~~Push the current repo designMd to the asset~~ — actively harmful; the push compresses.
2. ~~Re-apply the design system in the Stitch UI~~ — not required for generation; pass
   `designSystem: "assets/484682383639656270"` on the call instead.
3. ~~Re-read `get_project` and confirm~~ — `project.designTheme.designMd` is, as of
   2026-08-14, **still stale** (still contains "may animate once across the barcode"). The
   four frames were generated correctly anyway.

The asset went from version 5 on 2026-08-12 to version 7, and the project's `updateTime` is
today — so something is still editing it. The original desktop session was still running as
PID 24364; quitting it removes one candidate.

### 2026-08-14 — UNBLOCKED. All four state frames exist. The route is `generate_variants`.

The re-apply above was never the only door, and the frames were never actually blocked.
Two findings, in order of importance:

**1. `generate_variants` works over MCP where `generate_screen_from_text` does not.**

| tool                        | seed               | result over MCP                                                    |
| --------------------------- | ------------------ | ------------------------------------------------------------------ |
| `generate_screen_from_text` | nothing            | timed out ×3, and **no screen ever appeared** after 13 min polling |
| `generate_variants`         | an existing screen | returned **synchronously and COMPLETE** ×3, under ~2 min each      |

So the old note ("generate over MCP times out; the web prompt box is the reliable path") is
correct but incomplete — it's _generation from zero_ that fails. Generation _from a seed_
returns the finished screen, its id, and its screenshot url in the tool result itself. No
polling, no browser, no login.

`generate_variants` also takes `variantOptions.creativeRange: REFINE` ("subtle refinements,
closely adhering to original") and an `aspects` allow-list — pass `["TEXT_CONTENT"]` and the
tool is _structurally incapable_ of drifting the layout. The set-level bar ("all four frames
identical except where intended") stops being something you inspect for afterwards and
becomes something the call cannot violate. Use `variantCount: 1` — the count produces N
variations of one prompt, not N different states.

**2. Both generation tools take an explicit `designSystem` asset id and a `modelId`.**

`designSystem: "assets/484682383639656270"` points the generator at the _asset_, so the stale
`project.designTheme` snapshot never enters the picture and the UI re-apply is unnecessary
for generation. `modelId: "GEMINI_3_1_PRO"` removes the "check the model selector" step.
This is the snapshot-versus-reference distinction: the UI's _apply_ copies the designMd into
the project and it rots; the API parameter _points_ at the live asset.

(The asset is still v8, still the compressed one, and the tonal palette is still mangled.
It did not matter — every rule that mattered was in the prompt. This is the compression
finding holding up under test.)

#### The four frames, and how they were seeded

Seed chain — each hop asks for the smallest possible delta:
`DEFAULT → ERROR`, and `DEFAULT → FILLED → SAVING`.

| frame     | screen id                          | seeded from | local copy              |
| --------- | ---------------------------------- | ----------- | ----------------------- |
| 1 DEFAULT | `1bed6a8525e44b7fbad9cf85b467c92a` | —           | `frames/01-default.png` |
| 2 ERROR   | `66fd99fdc0784a469a1d198a52339e20` | frame 1     | `frames/02-error.png`   |
| 3 FILLED  | `a541546fbb6348c4aa7d35a46092fe5b` | frame 1     | `frames/03-filled.png`  |
| 4 SAVING  | `cafd14e73078487ba0ef969d79204ec3` | **frame 3** | `frames/04-saving.png`  |

> **Superseded 2026-08-15.** All four of the screens above were deleted, and the set was
> regenerated from the corrected-geometry seed. See _The regenerated set_ at the end of this
> document for the current ids — the PNGs in `frames/` are now the new renders.

The PNGs in `frames/` are 711 × 1600 renders committed to the repo because Stitch's
screenshot URLs are ephemeral `googleusercontent` links that will rot. Fetch a fresh, larger
render by appending `=s1600` (or `=s2048`) to a screenshot `downloadUrl`.

Frame 4 is seeded from frame 3, not from frame 1 — it is "identical to filled except the
button", so it should never see the empty form. That is why 3 and 4 are pixel-siblings.

Frame 1 already existed and was already correct; it was generated in the web UI before the
theme divergence was noticed, which is itself the proof that a self-sufficient prompt beats a
correct design system.

**All four judged and accepted, by eye.** Header, labels, field rhythm and the deliberate
empty gap are identical across the set; the error frame's card number sits one line lower
only because the error message occupies a line. Specifically verified: no summary banner or
toast on the error frame, the `STORE NAME` label stays ink rather than turning red, the Done
button is at full ink and enabled in all four, the saving button is a spinner on full ink
with no "Saving" text and no scrim, and the filled frame carries no success ticks or green
outlines.

> **Corrected 2026-08-15.** This paragraph originally claimed the saving button was "a
> **white** spinner". Measured, it is `#DDDDDF` — the other three frames render white text at
> exactly `#FFFFFF`, so it is the one place white is not white. Every structural claim above
> survived the audit; three colour/geometry claims did not. See below. The lesson is narrow
> and worth keeping: _"judged and accepted" recorded an eyeball pass as though it were a
> measurement._

**The transferable rule:** _generators hallucinate in proportion to how much you leave
undecided._ Seed from a screen, allow-list the aspects, spell out the deltas, and forbid the
specific embellishment you fear by name.

### The 2026-08-15 audit — the frames were measured, and the reference moved to HTML

The four frames had been accepted by eye. Measuring them changed the conclusion. Method:
sample the PNGs with Pillow and take the **modal** colour of a region rather than the most
saturated pixel — antialiasing against cream blends toward the background, so a max-saturation
sample overshoots and invents deviations that aren't there.

| check                         | result                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| cream, ink, all five swatches | **pixel-exact, `dmax=0`**, in all four frames                                                  |
| frame geometry                | `711 × 1600` = **393 × 884** — `+32px` against the mandated 393 × 852, identically in all four |
| error red (frame 2)           | **≈`#BF0000`** (89% of border pixels) against a specified `#C41E1E`                            |
| saving spinner (frame 4)      | brightest pixel **`#DDDDDF`**; frames 1–3 reach `#FFFFFF`                                      |
| footer hairline               | `#D3D3C8` vs `#D6D6CB` — within blend noise, fine                                              |

**Stitch cannot draw this frame.** Not "did not" — cannot. It injects
`body { min-height: max(884px, 100dvh) }` into every screen it generates, which is exactly
the +32px measured above. The design system's own Forbidden list bans _"any frame that is not
393 × 852"_, so the generator is structurally incapable of obeying the first rule in the
document. Two further defects in the same output: a `position: fixed` footer (forbidden by
§ _The primary-action footer_) and a back chevron pulled outside the 20px margin with a
negative margin.

**Which of the three are prompt-fixable — settled by experiment, same day.** A
_"Fix ONLY the geometry"_ run was made against the form screen, producing
`1c57d246642e49d596edfc95c8dbb96f`, titled "New Card Form (Fixed Geometry)". It reports
having aligned the chevron to the 20px margin and converted the footer from `position: fixed`
to a natural flex child — so **two of the three defects are ordinary CSS and do fix on
request.** The result is `786 × 1768`, i.e. **393 × 884, unchanged.** A prompt whose entire
and only instruction was to fix the geometry could not move the height.

That is the cleanest available proof of the distinction, and it is worth more than the
original claim it replaces: the chevron and the footer are _mistakes_, and mistakes can be
corrected. The 884 floor is not a mistake — it is the platform, and no prompt reaches it.
**All ten screens now in the project are `height: 1768`. There is no counter-example.**

**So the reference moved.** `frames/cardi-form-frames.html` is hand-authored, exactly
393 × 852, and is now what the remaining screens derive from. The PNGs stay as evidence of
what Stitch produced. This does not retire Stitch — it stays the right tool for _exploring_ a
screen that doesn't exist yet (the wallet empty state still needs a fresh seed). It is no
longer the tool for _geometry and chrome_.

**The literal-hex rule needs one caveat.** Six literal hexes came through byte-exact; the
seventh did not. The difference is not literalness — it is whether the colour collides with a
**semantic role the theme already owns.** `error` is a Material role (the theme holds
`#ba1a1a`), and it is the one that drifted; the card accents, cream and ink own no role and
passed through untouched. Amended rule: _spell literal hexes — and expect the ones that
shadow a theme token to be overridden anyway._

**The safe-area insets are now drawn.** They were reserved at the correct 59px / 34px but left
blank, which made a correct measurement read as careless padding — and invited the actively
wrong fix of shrinking it, which would push content under the live status bar at build time.
The 59px stays; it now carries a clock and indicators, and the bottom inset carries the home
indicator. Both are ink-only system chrome, never beam, and never controls.

The geometry harness that used to live in a duplicate `_probe.html` is now a `?probe`-guarded
block inside the reference file itself — two near-identical 575-line copies could only drift.
Open `cardi-form-frames.html?probe`; expect `size=393x852`, `chevronL=20.0`, `labelL=20.0`,
`inputL=20.0`, `btnL=20.0`, `btnH=52` on all four.

### The regenerated set — 2026-08-15, from the corrected-geometry seed

The canvas was cleared to a single screen, `1c57d246…` "New Card Form (Fixed Geometry)", and
the three states were regenerated from it with `generate_variants` — `creativeRange: REFINE`,
`aspects: ["TEXT_CONTENT"]`, `variantCount: 1`, `modelId: GEMINI_3_1_PRO`.

| frame     | screen id                          | seeded from      | local copy              |
| --------- | ---------------------------------- | ---------------- | ----------------------- |
| 1 DEFAULT | `1c57d246642e49d596edfc95c8dbb96f` | the geometry fix | `frames/01-default.png` |
| 2 ERROR   | `3805431b57c441e9a133df7572c9e99b` | frame 1          | `frames/02-error.png`   |
| 3 FILLED  | `6d4cfe6e04794bf093c14dee6ed9e265` | frame 1          | `frames/03-filled.png`  |
| 4 SAVING  | `d39488ce83bc40dfab0a2851e940abde` | **frame 3**      | `frames/04-saving.png`  |

**The spinner is fixed. The geometry is not. The error red is not.** Measured on the new
renders:

| check                         | result                                                                  |
| ----------------------------- | ----------------------------------------------------------------------- |
| saving spinner                | **`#FFFFFF`, luma 255** — was `#DDDDDF`. Fixed.                         |
| cream, ink, all five swatches | **pixel-exact in all four frames**                                      |
| footer band                   | `y=1351..1442` **identical in all four** — the set is truly aligned     |
| geometry                      | `711 × 1600` = **393 × 884**, all four. Third independent confirmation. |
| error red                     | **still `#BF0000`** against `#C41E1E`                                   |

The spinner fix is the transferable bit: it came right because the prompt **named the value
it had drifted to and forbade it** ("pure white `#FFFFFF` — not grey, not `#DDDDDF`"). The
error red did not come right, even though `#C41E1E` was spelled three times in the same
prompt. That is the semantic-token caveat holding under a controlled retest: `error` is a
role the theme owns, and owning the role beats spelling the hex.

**Two MCP mechanics worth keeping.**

- **`generate_variants` can time out at the MCP layer and still land the screen.** FILLED
  returned `The operation timed out`, and the screen existed server-side moments later. Poll
  `list_screens` — **do not retry**, or you will mint a duplicate. This is different from
  `generate_screen_from_text`, which times out and lands nothing.
- **`generate_variants` has no `designSystem` parameter**, contrary to the note further up
  this document. The seed screen carries the system; there is nothing to pass.

**One divergence to hold in view.** The Fixed Geometry seed reserves the 59px / 34px insets
but leaves them **blank** — its own prompt says "keeping the canvas blank as requested" —
whereas `frames/cardi-form-frames.html` now draws the status bar and home indicator into
them. Every Stitch render from here will differ from the reference at the top and bottom of
the frame. That is intended, and the reference is the one that is right.

### 2026-08-15 — the wallet pattern, specced from the code

`stitch-prompts-wallet.txt` holds four self-contained prompts: **populated / empty /
single-card / no-results.** Written by reading `CardList.tsx`, `CardTile.tsx`,
`EmptyState.tsx` and `gridLayout.ts` first — the discipline the superseded form prompt
skipped, at the cost of a whole frame. Four things it turned up that change the system, not
just the frames:

- **The wallet has six states, not two.** `CardList` branches on loading, error,
  single-card, grid, empty and no-results. The **single-card** state — an enlarged 220 × 180
  centred tile with the tip _"Tap + to add more cards to your wallet"_ — has never been
  designed by anyone. Search and sort only exist at `totalCount >= 2`, so drawing them on
  the empty or single-card frame is wrong, not merely extra.
- **The grid margin is 16pt and the design system's 20px cannot apply here.**
  `TILE_WIDTH = 171` is `(390 − 2×16 − 16) / 2`, frozen in `gridLayout.ts` with a documented
  derivation and tests; at 20px the tile stops being 171. **The system needs amending:**
  20px is the single-column (form / settings / document) margin, the grid is 16. This is the
  _fourth_ answer to the margin question in this repo.
- **The shipped empty state violates the system four times** — a per-screen invented
  illustration, accent dots in `#FFCC00` (Esselunga's exact yellow) and `#E2231A` (Coop's
  exact red) used as decoration, a coloured **glow shadow** under the CTA, and a 240 × 50
  centred button where the system says full-width 52px. The new frame is **typographic, with
  no illustration at all** — Wave A is illustration-free, and inventing one here is the exact
  failure the system's illustration rule exists to prevent.
- **The card tile carries a drop shadow in light mode** (`shadowColor: '#000'`), against
  _no drop shadows anywhere_. Removed in the spec; on this screen the brand colour is the
  hierarchy.

Two things came out **right** and are ratified rather than changed: the header is already
`+` on the left and gear on the right, and the tile is already 171 × 140 at 16px radius with
the name in `label-bold` below it. The one header change is the title, still
`navigation.home: 'myLoyaltyCards'` — that string belongs to the rename.

One new decision: **the favourite badge becomes an ink `#181824` plate carrying a beam
`#FCCC0C` star.** Shipped is an amber star on a 95%-white plate, which is illegal in this
system (amber is not in it) and invisible on light brands. Ink + beam is legal and survives
all 57 brand colours, Esselunga's yellow included.

### 2026-08-15 — the parallel Stitch run, and the one idea worth stealing

The four wallet prompts were also sent through the Stitch **web prompt box** as an
independent exploration, in parallel with the hand-authored frames: `6a2c2781…` (Populated),
`2b0c1e6f…` (Empty), `a000f361…` (Single Card), `1d84102f…` (No Results). Kept on the canvas
only — the PNGs in `frames/` remain the form set.

**It got every colour right.** All eight catalogue hexes came back **pixel-exact** — Esselunga
`#FFCC00`, Conad `#DA291C`, Coop `#E2231A`, Carrefour `#004E9F`, Lidl `#0050AA`, Eurospin
`#0069B1`, Pam `#165226`, Decathlon `#0082C3` — plus cream exact and no shadow under any
tile. Consistent with the literal-hex rule, and none of these shadow a semantic theme role.

**One idea beat ours and has been adopted.** Stitch typeset each wordmark in its _own_
idiom — lowercase `esselunga`, heavy caps `CONAD`, lowercase `coop`, tight `LIDL`, light and
wide `DECATHLON`. The hand-authored frames had set all eight in one house style, which is
exactly the failure the system names outright: _"do not unify the tiles — their clashing is
the content."_ The HTML now carries per-brand treatments. They are still stand-ins for the
real SVGs in `brandLogos.ts`; the point is that a stand-in must not flatten what production
actually shows.

**Six things it got wrong, every one of them pinned by the code:**

| defect                                                        | why it is wrong                                                       |
| ------------------------------------------------------------- | --------------------------------------------------------------------- |
| No-results header has a **back chevron** and **no gear**      | The wallet is the root screen; `HeaderLeft` is unconditionally `+`    |
| Frames are **711 and 706** wide within one set                | 393 × 884 vs 393 × 890 — the set is not even internally consistent    |
| Empty frame has **dark bars** in the safe areas               | The ground is cream across the whole screen                           |
| Empty subtitle **reflowed**                                   | The real string carries an explicit `\n` after "and"                  |
| **Divider under the header** on two frames, not the other two | The system says no divider — and it contradicts itself across the set |
| **No status bar, no home indicator** anywhere                 | The insets are real and occupied                                      |

**The split this settles.** Stitch is worth running for a screen where its ideas might beat
ours — it found the wordmark point that four reviewers and a written thesis had missed. It is
not worth trusting for anything the code already decides, because it drifts on exactly those
details and it cannot hold the geometry. Explore there, author here.

### 2026-08-15 — bringing the Stitch wallet screens back into compliance

The four exploration screens were then corrected against the HTML so a future illustration
pass starts from a sound screen rather than inheriting the defects. Compliant versions, all
verified by pixel sampling: **empty `7c5de427…`**, **single-card `543cbab4…`**,
**no-results `0dcda2f2…`** — cream `#F0F0E8` edge to edge, status bar and home indicator
present, no header divider. The **populated** screen is the gap: its compliance pass timed
out three times and never returned an id.

Four MCP mechanics came out of it, all new:

- **`list_screens` lags far behind generation, so it CANNOT tell you whether a timed-out call
  landed.** Two screens whose calls returned complete data — ids and working screenshot URLs
  — were still absent from the listing many minutes and several polls later. This corrects
  the earlier note that said to poll it. **Fetch the screenshot URL from the tool result
  instead; it works immediately while the listing is still blind.**
- **Heavy screens time out, light ones don't.** The eight-tile grid failed every attempt;
  the three sparse screens returned in one or two. Budget for the busiest screen needing the
  web UI.
- **`Request contains an invalid argument` is transient** on both `list_screens` and
  `generate_variants`. It is rejected before any work happens, so an immediate identical
  retry is safe and succeeds.
- **A third instance of the theme token beating the literal.** Told _"cream `#F0F0E8` covers
  the ENTIRE frame"_, the generator obeyed for the page and then painted the header
  **`#FAFAF2`** — precisely the theme's mangled `surface`. Same shape as the error red. The
  phrasing that actually fixes it is to **name the component and forbid the token's value by
  hex**: _"the header has NO background of its own; do NOT use `#FAFAF2`."_ That worked in
  one pass — exactly as naming `#DDDDDF` fixed the spinner. **Generalised rule: when a
  literal loses, it is losing to a token with a claim on that component; say the component's
  name and ban the value you keep getting.**

### 2026-08-15 — the settings pattern, and eight sheets reduced to four shapes

`stitch-prompts-settings.txt` holds six prompts: the screen **signed-in** and **guest**, plus
one frame for each sheet **shape**. The plan called this "settings list (2 screens)". The code
holds one screen with two account forks, a separate `LanguageListScreen`, and **eight bottom
sheets**.

**The reduction.** Fingerprinting the sheets by button count and whether they map a list:

| shape                | sheets                                                      |
| -------------------- | ----------------------------------------------------------- |
| Pick one from a list | Theme, Language — no buttons; choosing IS the action        |
| Confirm              | Export confirm, Sign out, Import preview, **Delete step 1** |
| Acknowledge          | Export empty, Import error — one button                     |
| Type-to-confirm      | **Delete step 2** — the only sheet in the app with an input |

`DeleteAccountSheet` is a **two-step** sheet (`useState<1 | 2>`), which is why it showed four
buttons; step 2 gates its destructive button on `confirmationText === 'DELETE'`. Every other
sheet in the app is one of these four with different words.

**Three findings that outlive the frames:**

- **The chrome is already a component.** All eight sheets are built on `BottomSheet` from
  `shared/components/ui`, and rows are `ActionRow` — both with stories and tests. Unlike the
  wallet, this pattern is constrained by an existing API and the design must fit it.
- **A fifth answer to the screen margin.** Settings uses `paddingHorizontal: 24`. The tally is
  now `CardForm` 32 · `AuthScreenLayout` token · system 20 · grid 16 · settings 24. The frames
  use **20** and the code should move 24 → 20 — the opposite call from the grid, because 16 is
  _derived_ (the 171px tile depends on it, with tests) and 24 is not.
- **The destructive button contradicts the system.** The system says borderless, `#C41E1E`
  text. `Button.tsx` renders a **filled** `theme.error` block with white text and a border, so
  sign-out and delete are solid red slabs today. The frames follow the system. Separately: the
  variant is an **unguarded fall-through** — `primary`/`secondary`/`tertiary` each get an `if`
  and everything else returns error-red — so any variant added to that union silently becomes
  destructive.

### 2026-08-15 — the settings frames, and a prompt rule broken by its own author

All six settings frames are hand-authored in `frames/cardi-settings-frames.html`. The Stitch
run happened in parallel: `8d208789…` (Signed In), `4602b9d1…` (Guest), `734465a7…` (Theme),
`7bc1305d…` (Sign Out), `9626cba4…` (Export Acknowledge), `6b336e24…` (Delete Step 2).

**The sheets came out excellent and the backdrops came out fabricated.** All four sheet
_contents_ matched the spec — including the hard one: sign-out drew a borderless `#C41E1E`
"Sign Out" above an outlined "Cancel", and delete-step-2 drew the destructive button at
reduced opacity with an empty field. That validates the four-shape reduction.

But every screen _behind_ a sheet was invented, and each one differently:

| frame       | invented backdrop                                          |
| ----------- | ---------------------------------------------------------- |
| Theme       | ACCOUNT / Profile / Security                               |
| Sign out    | ACCOUNT / Profile Information / **Payment Methods**        |
| Acknowledge | Account Details / Data & Privacy, drawn as a floating card |
| Delete      | ACCOUNT / Profile Details / **DANGER ZONE**                |

The guest frame drifted the same way, inventing Notifications, Clear Cache "12 MB" and a
build number, and dropping the Create Account button entirely. "Payment Methods" in a
loyalty-card app is the tell.

**The cause was the prompt, and the rule it broke was already written down here.**
`stitch-prompts-form-states.txt` says: _"Stitch has no memory between generations — so a
prompt that says 'same as before' gets a different screen."_ The settings prompts then said
_"identical to Frame A except the account block"_ and _"the Settings screen from Frame A
behind a scrim"_, four times over. The generator was not drifting from a spec; it was filling
a vacuum the prompt created by refusing to repeat one.

**Rule, stated so it survives:** a prompt may never refer to another frame. Every frame
repeats its own chrome in full, however tedious — the tedium IS the mechanism. When a frame
is "screen X behind a sheet", the whole of X must be in that prompt.

This failure mode does not exist in HTML, which is the quiet argument for authoring there:
frames C–F share **one backdrop string reused four times**, so it is not merely consistent,
it is incapable of differing.

### Still open

1. ~~Generate the four state frames and judge them~~ — **done 2026-08-14**; measured and
   corrected 2026-08-15, reference moved to HTML. Do **not** regenerate the PNGs to chase the
   32px: Stitch injects the 884 floor, so a regenerated frame would come back with the same
   defect. That door is closed, deliberately.
2. ~~Design the wallet empty state~~ — **specced and drawn 2026-08-15.** All four wallet
   states are hand-authored at 393 × 852 in `frames/cardi-wallet-frames.html`. Stitch was
   not used: it cannot make this geometry, and the wallet needed a new seed it could not be
   given (generation from zero still fails over MCP). A parallel Stitch run was made from
   the web prompt box as an independent exploration — compare, don't merge blindly.

   One authoring decision worth keeping: the frames are **self-contained, with the token
   block duplicated** between the form and wallet files rather than linked from a shared
   `.css`. A linked stylesheet was tried and reverted — any viewer that inlines the HTML
   (preview panes, the Artifact CSP, pasting it anywhere) silently drops it and renders a
   broken frame, which reads as _"the reference is wrong"_. Duplication is the cheaper
   failure, and neither file was ever the source of truth for those values:
   `cardi-design-system.md` is.

3. **Amend the design system on the screen margin.** 20px is the single-column margin; the
   grid is 16pt, and the 171px tile arithmetic depends on it. Right now the system states a
   single figure that the wallet cannot honour.
4. Re-verify the Stitch design system hasn't been clobbered again since 2026-08-12.
5. ~~The Stitch canvas is ten screens and needs a clear-out~~ — **done 2026-08-15.** The
   superseded decoy (`b1a1e6e6…` "Add Card Form" — barcode format row, "Save card", an
   invented favourites toggle, a baked-in red error, and freshly repainted by
   `apply_design_system` so that it _looked_ trustworthy) was deleted along with three
   unlabelled duplicates and the four original frames. Stitch has **no delete-screen over
   MCP**, so this was done in the UI. The canvas is now the geometry seed, the three
   regenerated states, and the DS text render.

   Still true and still worth knowing: `apply_design_system` is **per-screen only** — it does
   not update `project.designTheme`, which remains stale. There is no MCP path to the project
   default; that really is UI-only, and the canvas is inert to synthetic clicks.

6. Decide the `orange` / `grey` → Cardì card-colour migration before the tokens PR.
7. Three answers to the screen margin (`CardForm` 32px hardcoded, `AuthScreenLayout` token,
   DS 20px) and the busy-button divergence — the shared `Button` greys its fill when
   `loading`, where the DS now says busy keeps the ink.
