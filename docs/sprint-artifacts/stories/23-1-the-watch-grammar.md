---
baseline_commit: 2ff3e23016a3ee6130e5e0c2b3651de62fa4ac5f
---

# Story 23.1: The watch grammar [Enabling] — the design system forbids the frames you need, and the watch code implements a different system entirely

Status: done

Epic: 23 — Cardì on the Watch

> **⛔ THIS STORY MUST AMEND THE DESIGN SYSTEM, NOT MERELY EXTEND IT.** `cardi-design-system.md`
> says: _"**Frame: 393 × 852 (iPhone-class portrait). Design nothing else.** No desktop, no tablet,
> no square canvases, no arbitrary heights"_ — and its `## Forbidden` section lists _"any frame that
> is not 393 × 852"_. A 384 × 384 round Wear screen and a 162 × 197 pt watchOS screen are, as the
> document stands, **prohibited**. An additive "watch appendix" that ignores this leaves the system
> self-contradicting.
>
> **⛔ THERE ARE TWO DESIGN SYSTEMS IN THIS REPOSITORY, and the watch code implements the other
> one.** `grep -niE "\b(watch|wear|complication|crown|widget)\b"` over `cardi-design-system.md`
> returns **zero matches** — the words do not appear. (⚠️ Run it **with** the word boundaries: the
> same five terms return 0 with or without word boundaries — but **adding `round` to the term list
> returns 15 substring hits** from `background`, `rounded`, `grounds` and `around`, which reads as
> if it refutes the premise. Search the five terms, not six.) The watch's actual design language is
> **"Carbon Utility"** in `docs/ux-design-specification.md`, cited by name in `CarbonTheme.kt`'s
> KDoc. **Reconciling those two systems is this story's real subject**, not decorating the watch.
>
> **⚠️ watchOS HAS NO THEME LAYER AT ALL.** `AccentColor.colorset` is an **empty stub with no colour
> key**, so `Color.accentColor` resolves to system blue. Every other colour is a literal at the call
> site. Wear has a real but tiny one: `CarbonTheme.kt`, seven roles, 38 lines.
>
> **⚠️ `orange` SHIPS ON ALL THREE WATCH SURFACES AND IS BANNED BY CARDÌ** — _"Coral, salmon,
> terracotta and orange are banned from this system entirely."_ It is a card-palette key in
> `CardVisuals.kt`, `WidgetCardPalette.swift` and the watchOS colour helpers.
>
> **This is a DESIGN story. It produces frames and written rules, and it GATES 23.2–23.4.** It
> touches `docs/design/` only — no code overlap with any story in Sprint 20. ⚠️ **It is not,
> however, parallel with 22.1:** both write `docs/design/cardi/cardi-design-system.md`. This story
> amends the frame rule and the Forbidden list; 22.1 transcribes component specs into the same
> document. **This story's structural amendment lands first** — inserting components into a
> document whose top-level rules are being rewritten is the expensive order.

## Story

As a designer,
I want a written watch extension to the design system,
so that the two watch apps are implemented against a decided thing rather than improvised per screen.

## Story context

**Six screens plus the watch widget — seven surfaces** — have no Cardì design at all: watchOS
`ContentView` / `CardListView` / `BarcodeFlashView`, Wear OS `CardListScreen` / `BarcodeScreen` /
`SortPickerScreen`, and the widget. Every one of the ten screen frames in `docs/design/cardi/frames/` is 393 × 852.

A watch is not the phone system scaled down, and the phone system's central rule behaves
differently there: **the content is the colour** works because 45 brand colours share one grid — but
a watch shows **one card at a time**.

### The divergences, measured

| concern            | watchOS                            | Wear OS                                                 | Cardì                                                         |
| ------------------ | ---------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------- |
| Row / surface fill | `#1C1C1F` literal                  | `CarbonSurface #1C1C1F`                                 | cards & sheets **ink `#181824`**                              |
| Body text          | `Color.white`                      | `Color.White`                                           | **cream `#F0F0E8`**, "never pure white — it keeps the warmth" |
| Grey               | `#9CA3AF`                          | `#64748B`                                               | — (they disagree with each other)                             |
| Primary            | system `Color.accentColor` (blue)  | `#4DA3FF`                                               | ink (light) / beam (dark)                                     |
| Card accents       | system `.blue/.red/.green/.orange` | exact hexes `#1A73E8` etc.                              | `#E42424` `#0C3C84` `#0C84CC` `#0C843C` `#FCCC0C`             |
| Touch target       | 44 pt                              | **48 dp**                                               | **48** — already adjudicated                                  |
| Type               | `.system(...)`, smallest **10 pt** | `MaterialTheme.typography` + raw sp, smallest **10 sp** | 15px minimum body size                                        |

The Wear KDoc is candid that watchOS _"approximated with system colours"_ while Wear uses exact
hexes. **watchOS's 44 pt is already out of compliance** with the shipped system, which adjudicated
48 on the grounds that a minimum binding on two platforms is the max of their minimums.

### What already complies — do not "fix" it

Both barcode screens already obey the hero rules: white container, true-black bars,
`.interpolation(.none)` / `FilterQuality.None`, nothing overlaid. **Two frictions need explicit
watch carve-outs rather than compliance:**

- **watchOS cannot suppress the system clock.** `BarcodeFlashView.swift:125-143` documents that
  reclaiming the top inset lets the clock draw **white glyphs straight through the black bars**, so
  it deliberately keeps that strip. Wear blanks it (`ScreenScaffold(timeText = {})`). The "no
  chrome" rule does not anticipate a surface the OS owns.
- **watchOS has no brightness API.** Wear achieves "maximum screen brightness" via
  `BRIGHTNESS_OVERRIDE_FULL`; watchOS cannot, and Story 16.26 delivered the closest achievable
  behaviour instead.

### Input diverges too

watchOS: the **crown dismisses** the barcode screen — `digitalCrownRotation` with a single-shot
latch (`BarcodeFlashView.swift:232-245`); the card list has no crown handler and relies on the
system's default `ScrollView` behaviour. Wear: rotary on the barcode screen was **explicitly not
shipped** (recorded as Open Decision 3); list rotary works only implicitly via
`ScreenScaffold(scrollState)` with no explicit modifier anywhere in the source.

## Acceptance Criteria

- **AC1 — The frame rule is AMENDED, not contradicted.** `cardi-design-system.md`'s "Design nothing
  else" and its `## Forbidden` entry are rewritten to admit watch frames explicitly, at the real
  sizes: Wear round/square **384 × 384**, and the watchOS size classes (**40 mm 162 × 197** through
  **49 mm 205 × 251** — the table lives in `targets/watch/__tests__/watch-layout-contract.test.ts`,
  not in any source file). 40 mm is the floor because the watch target deploys to watchOS 10.
  ⚠️ **Scope the amended rule to SCREEN designs.** As written, "no square canvases" and "any frame
  that is not 393 × 852" also forbid every artwork canvas this same sprint ships — 21.3's 1024²
  icons, 21.4's four square mipmaps (162²–432²), and 21.5's 1024 × 500 banner and 4096 × 2304 JPG.
  Either say the rule governs screens, or list the artwork canvases in the same amendment. This is
  the only story amending that document's top-level rules, so an omission is permanent.
- **AC2 — The two design systems are reconciled, in writing.** State whether "Carbon Utility"
  (`docs/ux-design-specification.md`) is superseded by the Cardì watch grammar, survives alongside
  it, or is retired. `CarbonTheme.kt`'s KDoc cites it by name; leaving both live guarantees the next
  implementer picks the wrong one.
- **AC3 — It states what carries over and what does not.** Carries: ink and beam, the barcode rules,
  the refusal to overlay a scan target. Does not: the two-column grid, the header, the anchored
  footer. Each with its reason.
- **AC4 — Reference frames are drawn for all six app screens.** The three **Wear** screens are
  drawn on **both round and square**; the three **watchOS** screens are drawn against the size
  classes in AC1 instead, since watchOS has no square variant. The widget is AC12's deliverable
  across its four families — so the epic covers **six screens plus the widget**, seven surfaces.
- **AC5 — Rotary and crown are DESIGNED FOR, not retrofitted**, and the current asymmetry is
  resolved: crown dismisses on watchOS, rotary does nothing on Wear's barcode screen, and Wear's
  list rotary is implicit. Decide what each input should do on each surface.
- **AC6 — The barcode-flash rule is RE-DERIVED, not assumed.** A watch screen is small and dim, so
  the constraint that made the phone's surround neutral is **stronger** here, not weaker. The two
  carve-outs above (the unsuppressable watchOS clock, the absent brightness API) are written into the
  rule rather than left as implementation apologies.
- **AC7 — The colour divergences are resolved to single values.** `#1C1C1F` vs ink `#181824`; white
  vs cream body text; `#9CA3AF` vs `#64748B`; system-approximated vs exact card accents. **`orange`
  must go** — it ships on all three watch surfaces and the system bans orange by name. ⚠️ **Scope
  that to the VALUE, not the key.** The `CardColor` **key set** is Story 21.2a's AC1 to freeze or
  migrate — Story 21.2a owns the mapping, the data migration and the phone→watch wire contract — so
  this story records the palette **by accent hex, not by `CardColor` key** — it runs at `wave_0`,
  before 21.2a's AC1 decides which keys survive, and a key-indexed table here would go stale with
  no owner (21.2a's migrate list names the Swift/Kotlin maps, not this document).
  ⚠️ **The favourite star belongs in this table too**: `CardListView.swift:346-350` renders
  `Image(systemName: "star.fill").foregroundColor(.yellow)` — SwiftUI's system yellow `#FFCC00`,
  not beam `#FCCC0C`. The system says beam "appears at exactly that value or not at all", names a
  filled favourite star as one of only three legal beam locations, and separately flags `#FFCC00`
  as **Esselunga's exact yellow**. Resolve it to one value. ⚠️ **Do NOT "align with
  Story 21.2" — that story is `wave_1` and runs AFTER this one.** Point at the decision that
  already exists: `docs/design/cardi/README.md:549-552` (ink plate, beam star), which 21.2 AC9
  itself cites. Likewise the watch card palette **mirrors whatever key set 21.2 keeps** rather than
  deciding it here — Story 21.2a owns the `CardColor` mapping and its data migration, and those keys
  are a phone→watch wire contract this story cannot unilaterally change. ⚠️ **Wear has a THIRD treatment and it is the banned
  colour**: `CarbonTheme.kt:19` defines `FavoriteStarTint = Color(0xFFF59E0B)`, used at
  `CardRow.kt:129` — the same `#F59E0B` this system bans outright. ⚠️ No other story owns the **value**, so this AC decides
  it — but **23.3 applies it**. This story writes no Kotlin, so the Wear star ships amber through
  the rebrand release either way (Story 21.7's AC2(b) records that as a knowingly-shipped
  mismatch). Do not read this as a mandate to edit `CarbonTheme.kt` here; that would break
  `wave_0`'s zero-code-overlap premise.
- **AC7b — This story DECIDES the watch accent colour; Story 21.3 consumes it.** ⚠️ The handoff
  runs this way because this story is `wave_0` and 21.3 is `wave_2` — there is nothing of 21.3's to
  confirm when this executes. Decide the value here (the design system's dark-ground rule makes
  beam the obvious basis) and 21.3 writes it into both `AccentColor.colorset` files as a settled
  value, not a provisional one. ⚠️ **Restate the beam inventory; do not increment it.** The
  document says "beam is drawn in exactly three places" and then, in two other sections, assigns
  beam to the ì accent, the scan-beam motif, focus rings, active/selected states, **all primary
  actions in dark mode**, the logo, the splash and loading states. Story 21.2's AC4 makes that
  concrete this sprint, so after it lands every dark-mode primary button is beam while the canonical
  text calls a fourth a bug. Incrementing three→four canonises a still-false count for 22.2–22.10;
  rewrite the inventory, or scope that sentence to the drawn scan-line motif its section is about.
- **AC8 — The type floor is decided for the watch.** The system mandates a 15px minimum body size;
  the barcode value is **10** on both platforms and the watchOS initials are 12. Either the floor
  gets a stated watch exception with a reason, or the sizes rise. Note neither watch loads any
  custom font — whether Space Grotesk/Inter/JetBrains Mono reach the watch at all is part of this
  decision (Story 21.6 defers the watch to this epic).
- **AC9 — The 8px grid is applied or excepted, explicitly.** `WatchCardRowLayoutMetrics.compact` is
  `rowSpacing 10`, `padding 10/9`, `accentWidth 5`, `avatarSize 30`, `cornerRadius 14` — almost none
  on the grid. And **watchOS's 44 pt tap target contradicts the system's own 48 adjudication**; fix
  it or except it in writing.
- **AC10 — The single-column watch list is explicitly blessed.** The phone system forbids replacing
  the grid with single-column rows; the watch list _is_ single-column rows and correctly so. Say it,
  or the next reviewer will cite the phone rule against it.
- **AC11 — The brand-mark rule is restated for a circular avatar.** The system wants the brand mark
  at roughly **85% of the tile**; the watch avatar is 30 pt clipped to a **circle** and inset by
  `(30 × (1 − 1/√2)) / 2 ≈ 4.4 pt`, giving nearer 70% of its bounding box under a round mask. The
  phone rule does not survive unchanged.
- **AC12 — The complication is designed across all four families** it supports —
  `accessoryCircular`, `accessoryRectangular`, `accessoryInline`, `accessoryCorner` — and the design
  respects the **76 px** image budget (`ComplicationImage.swift`: `maxPoint 38, scale 2`; exceeding
  `accessoryCorner`'s ≈81.6 px budget renders a **grey placeholder**, and `.frame`/`.scaledToFit` do
  not help).
- **AC13 — New frames either ship a generator or are declared hand-maintained.** `yarn frames:check`
  diffs every generator's output byte-for-byte. Nine of sixteen existing frames already have no
  generator and are declared as such. If a generator is added, shared helpers must be named with a
  **leading underscore** (`_shared.py`) or the checker reports `NO-OUTPUT` and goes red.

## Tasks / Subtasks

- [x] **Task 1 — Reconcile the two systems (AC2).** Read `docs/ux-design-specification.md` §Carbon.
- [x] **Task 2 — Amend the frame rule and `## Forbidden` (AC1).**
- [x] **Task 3 — Write the carry-over/does-not-carry table (AC3, AC10, AC11).**
- [x] **Task 4 — Resolve colour, type and grid (AC7, AC8, AC9).**
- [x] **Task 5 — Re-derive the barcode rule with its two carve-outs (AC6).**
- [x] **Task 6 — Design the input model (AC5).**
- [x] **Task 7 — Draw the six screens (AC4): Wear round + square, watchOS by size class. Then the
      complication across four families (AC12).**
- [x] **Task 8 — Generator or hand-maintained, declared (AC13).**

## Dev Notes

### Guardrails

- **`rotate(35)` ✓ / `rotate(-35)` ✗.** A negative rotation lifts the right end and draws an
  _acute_ — a different word. Fifty drawings got it wrong; prose did not prevent it (Story 20.3).
- **`docs/design/cardi/frames/*.html` is `.prettierignore`d** and must stay so: Prettier's HTML
  printer reflows attributes, so a formatted frame could never match its generator again and
  `frames:check` would fail permanently. Note `docs/design/cardi/*.html` does **not** cover the
  subdirectory — a single `*` does not cross a directory separator.
- **On `STALE` from `frames:check`, do not just regenerate** — that is how hand fixes get lost.
- **Write literal hexes into any generation prompt, never token names.** Material's tonal engine
  turns beam `#FCCC0C` into brown `#735c00` and a generated `primary` resolves to `#000000`.
- **This story writes no Swift and no Kotlin.** `docs/design/` only, and it shares exactly one file
  with the rest of the sprint — `cardi-design-system.md`, which has **THREE** writers this sprint:
  this story (the frame rule and the Forbidden list), **21.2** (the favourite-badge plate, AC9) and
  **22.1** (the component-spec transcription, AC11). **This story is `wave_0` and lands FIRST**,
  then 21.2 and 22.1's content edits — inserting into a document whose top-level rules are being
  rewritten is the expensive direction. It is otherwise
  parallel-safe with every other story in the sprint.

### Testing

`yarn frames:check`, `yarn format:check`. There is nothing else to run; the deliverable is a design.

### Previous story intelligence

- **20.1** fixed the thesis and the Forbidden list this story must amend. It also records the
  failure mode directly: _"A confident, well-written spec that contradicts the product is the
  failure mode this section exists to prevent."_ An additive watch appendix that leaves "no square
  canvases" standing would be exactly that.
- **20.5** records that a stale generator silently rewrote `Cardì` back to `Cardí`, and that the
  first version of `frames:check` **could not fail** — it compared untouched files against
  themselves, and every generator passed including two that cannot start. Unanimous success across a
  heterogeneous set is a reason to distrust the harness.
- **10-3** established the Wear list idiom (`TransformingLazyColumn` + `ScreenScaffold` + the morph
  transformation spec) that 23.3 will implement against.

### References

- [Source: docs/epics.md#Story 23.1: The Watch Grammar]
- [Source: docs/design/cardi/cardi-design-system.md] — the frame rule, Forbidden, the beam rule
- [Source: docs/ux-design-specification.md] — "Carbon Utility", the system the watch code cites
- [Source: targets/watch/__tests__/watch-layout-contract.test.ts] — the only watchOS size table

## Dev Agent Record

### Agent Model Used

`claude-opus-5` (implementation). Two read-only `sonnet` inventory agents for the measured
colour/type/spacing sweeps of `targets/watch/`, `targets/watch-widget/` and `watch-android/`.

### Debug Log References

Three gates, run after implementation and **re-run after each review round**:

- `yarn frames:check` — 9/9 generators reproduce their frames byte-for-byte; `../frames/` proven
  untouched by the digest invariant. `_watch_shared.py` correctly skipped as a helper rather than
  reported `NO-OUTPUT`, which is the behaviour AC13 depends on.
- `yarn format:check` — clean across the repo.
- `yarn check:story-catalogue-sync` — 204 catalogue sections ↔ 204 tracker keys, `totalStories` 204. Run because this story edits `sprint-status.yaml`.

Not gates, but run:

- Both frame sheets rendered and inspected in a browser at 1400 px. **Three rendering defects
  found by looking that no gate would have caught** (see Completion Notes) — the frames are
  byte-stable whether or not they are legible, so `frames:check` passing proves nothing about
  whether a frame is right.
- Every contrast ratio that appears in the prose — **five distinct colour pairs** across six
  mentions, cream-on-ink being stated twice (loosely as `≈15:1`, precisely as `≈15.3:1`) —
  independently recomputed from the WCAG relative-luminance formula rather than cited. Seven
  pairs were computed; the two that did not earn a place in the text (cream-on-black,
  ink-on-beam) are not quoted anywhere and so are not claims this story makes.
- Every relative markdown link in the changed and added documents resolved against the filesystem.

### Completion Notes List

**Verification, not assumption — what measuring changed:**

1. **The `384 × 384` in AC1 and in the epic is PIXELS.** `393 × 852` is points. In the same unit
   the Wear screen is **192 dp** — less than half the phone's width. Google's guidance is dp and
   round-first (192 dp is the smallest supported round screen); 384 circulates because Play's
   store-screenshot floor is 384 px. The amendment states dp and says why.
2. **`orange` is three colours, not one.** `Color.orange` (system) on watchOS,
   `#F59E0B` on Wear, `#F59E0B` in the widget — and `#F59E0B` is **bit-identical** to
   `CarbonTheme.kt`'s `FavoriteStarTint`, so removing orange from the palette does not remove it
   from the star. AC7 covers both sites.
3. **watchOS uses SYSTEM colours for card accents; Wear and the widget use hexes.** The same card
   renders differently in the app and in its own complication. Not in the story's table.
4. **watchOS's 44 pt is a dead constant, not a violation.** `.frame(minHeight: 44)` is applied
   after `.padding(.vertical, 9)` around a 30 pt avatar, so the content is already **48** and the
   44 never binds. Both platforms ship a 48 pt row and already comply. AC9 is resolved by making
   the declaration honest (23.2, one line, no pixel moves) rather than by changing the layout.
5. **The six screens are three surfaces built twice** — list, barcode, sort picker.
   `ContentView.swift` is 12 lines mounting `CardListView`; watchOS's sort picker is a **sheet
   inside `CardListView.swift`**. AC4's frames are organised as pairs, which is what stops the two
   apps drifting again.
6. **AC7b's accent decision collides with AC6.** Apple's documentation states the accent is
   applied to _"the app's title string in the status bar"_ — and the watchOS barcode screen draws
   the **card's name** there. A beam accent puts **beam on the barcode screen**. Resolved with an
   explicit carve-out to **cream** (not ink: that strip is part of the black surround). The first
   draft said ink and was wrong.
7. **The UX spec's watch touch target is 32 pt** — a _third_ value alongside 44 and 48, and
   contradicted by both codebases. Named in the superseded notice.
8. ⚠️ **And 32 is not only prose — there is a FOURTH site, and it is live.**
   `TOUCH_TARGET.watch: 32` is authored in `tokens/spacing.json:27`, generated into
   `shared/theme/tokens.generated.ts:92`, hard-asserted by `tokens.generated.test.ts:122` and
   exported through `useTheme()`. It is the **only semantically-named "watch touch target"
   constant in the repository**. My first draft of the grammar said _"nothing has ever been built
   to 32"_, which was **false**; QA caught it. **Decided: retire the key, do not correct it to
   48** — it has **zero** consumers (`TOUCH_TARGET.min` has 40) and, being TypeScript, could not
   be read by either watch app even in principle. ⛔ **This needs an owner, and the nearest story
   currently decides the opposite**: Story 22.1 edits this exact token group and its notes say
   _"`TOUCH_TARGET.watch` stays 32"_. Grammar §5.4 states the decision and names 22.1; this story
   writes no code and cannot make the change itself.
9. **The `ComplicationImage.swift` comment states the `accessoryCorner` ceiling two ways**
   (`≈ 46 pt` and `≈ 81.6 px`), which do not reconcile at ×2. Recorded; **76 px is the shipped
   working value and the design is under both readings**. Flagged for 23.4, not fixed here.

**Deliberately not done:**

- **No Swift, no Kotlin.** `wave_0`'s zero-code-overlap premise holds. Every consequence is
  written as a decision for 23.2/23.3/23.4 to apply, and each behaviour change says so.
- **watchOS keeps its reserved barcode strip.** Going white edge-to-edge would reclaim ~95 px of
  module axis at 40 mm, but the present arrangement is **measured** and the alternative is not —
  nobody has checked whether the system draws a scrim behind the clock on a white ground. Written
  into §6 as a five-minute device measurement for 23.2 rather than guessed at.
- **AC7's palette is recorded by HEX, never by `CardColor` key**, so it survives either branch of
  Story 21.2a's AC1.

**AC13 — generators, not hand-maintained.** Both sheets are generated, sharing `_watch_shared.py`
(leading underscore, as the checker requires — verified: it is skipped, not reported `NO-OUTPUT`).
The shared module resolves a real tension: the _output_ must inline its tokens (a linked
stylesheet is silently dropped by inlining viewers), but the _source_ never had to duplicate them.

**Rendering defects found by looking, which no gate would have caught:** the `accessoryCorner`
text arc truncated mid-word (arc shorter than its label — now derived from arc length rather than
eyeballed); the in-situ inline complication overlapped the clock; and the square-frame "envelope"
guide was drawing a dashed line **across the barcode**, which is the one thing the system forbids
absolutely. The barcode frame now carries no envelope, and the generator says why.

### File List

**Modified**

- `docs/design/cardi/cardi-design-system.md` — **six separate edits**, one per hunk:
  1. `## Layout & Spacing` — the frame rule amended and scoped to screen designs, with the three
     screen classes and the artwork canvases it does not govern (AC1)
  2. `## Layout & Spacing` — the home-grid bullet qualified to the **phone**, and the watch's
     single column blessed (AC10)
  3. `## Shape` — the 14-not-16 watch carve-out, cross-linked to the grammar's §5.5 (AC9)
  4. `### The beam rule, both halves` — the beam inventory restated as a role, not a count (AC7b)
  5. `### Icons` (nested under `## Components`, not a standalone H2) — the 14–18-not-24 watch
     carve-out, same cross-link (AC9)
  6. `## Forbidden` — two entries rewritten so neither the watch frames nor this sprint's artwork
     canvases are forbidden (AC1, AC10)
- `docs/ux-design-specification.md` — **two** superseded notices (AC2): the whole
  `## Design Direction Decision` section, both halves; and the three **watch** entries under
  `## Component Strategy` (#3 Carbon Watch Card, #5 Watch Sort Control, #6 Watch Favourite Badge),
  which are actively contradicted rather than merely dated — #5 names Carbon by name and #6
  specifies the banned amber star on a plate. Each heading is marked inline, and the
  Implementation Roadmap's Phase 1 entry is struck through. Plus **three residual watch claims**
  elsewhere in the same file, marked in place after QA found them still live: the 5-colour palette
  naming orange and grey, the 32 px watch touch target, and the "filled amber star"
- `docs/design/cardi/README.md` — Files table plus a dated decision entry
- `docs/design/cardi/tools/README.md` — the two new generators, the helper-module rule in
  practice, and the frame count (AC13)
- `docs/sprint-artifacts/sprint-status.yaml` — story `ready-for-dev` → `in-progress` → `review`;
  `current_sprint.status` `planned` → `in-progress`, per that key's own rule (23-1 is wave_0 and
  the sprint's first story picked up)
- `docs/sprint-artifacts/stories/23-1-the-watch-grammar.md` — this record

**Added**

- `docs/design/cardi/cardi-watch-grammar.md` — the watch extension (AC2, AC3, AC5–AC12)
- `docs/design/cardi/frames/cardi-watch-frames.html` — 15 frames, six screens (AC4)
- `docs/design/cardi/frames/cardi-complication-frames.html` — four families (AC12)
- `docs/design/cardi/tools/watch_frames.py` — generator (AC13)
- `docs/design/cardi/tools/watch_complication_frames.py` — generator (AC13)
- `docs/design/cardi/tools/_watch_shared.py` — shared helper (AC13)

### Change Log

| Date       | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-15 | Amended `cardi-design-system.md`: the frame rule is scoped to screen designs and admits the two watch classes; `## Forbidden` no longer forbids the watch frames or the artwork canvases; the beam inventory is restated                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-09-15 | Retired "Carbon Utility" and marked `docs/ux-design-specification.md` § Design Direction Decision superseded, both halves                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-09-15 | Added `cardi-watch-grammar.md` — colour, type, grid, input, barcode, card row and complication, all resolved to single values                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-09-15 | Added two generated frame sheets (15 screen frames + 4 complication families in 5 specimens) and their generators, with a shared `_watch_shared.py` helper                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-09-15 | Code review round 1 — 3 MAJOR, 5 MINOR, 2 NIT all addressed: supersession extended to `## Component Strategy`; §10 flagged as a behaviour change (the shipped widget is open-app-only); `S.BRANDS` actually used by the generator; the arc-truncation path given a specimen that exercises it                                                                                                                                                                                                                                                                                                                          |
| 2026-09-15 | Code review round 2 — 2 NIT addressed: the `cardi-design-system.md` File List entry now enumerates its six edits by section and AC instead of carrying a hand-maintained hunk count, and the Debug Log records all three gates, their re-runs, and the non-gate checks                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-15 | Code review round 3 — 2 NIT + 1 NIT addressed: `### Icons` heading level corrected in the enumeration; the contrast-ratio claim reduced from seven to the five pairs actually quoted; rounds 2 and 3 added to this log                                                                                                                                                                                                                                                                                                                                                                                                 |
| 2026-09-15 | Code review APPROVED, zero comments, after 4 rounds and **15** findings (10 + 2 + 3, per the three rows above). The reviewer's own round-4 summary said 13; that undercount was copied here and corrected in round 5                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-09-15 | QA review — 2 MAJOR + 6 MINOR + 1 NIT addressed. The MAJOR that mattered: `TOUCH_TARGET.watch: 32` is a live, generated, tested token, so the grammar's "nothing has ever been built to 32" was false; decided to retire the dead key and named Story 22.1 as its owner. Also marked three residual watch claims in the UX spec, and added §3.1 tap feedback, §3.2 empty state, §8.1 sort-picker affordance and a compliance-test section                                                                                                                                                                              |
| 2026-09-16 | Code review round 5 — a DELTA review, run because round 4 had approved a tree the QA round then changed. 3 MAJOR + 1 MINOR + 1 NIT: a `§8` cross-reference left stale by re-filing the square-Wear section; §3.1/§3.2 physically preceding `## 3.` and so nesting under `## 2.`; the 13-vs-15 findings count; "Carbon List" surviving in a third unflagged place in the UX spec; and a completion note mis-nested under item 8. Every new citation the QA round introduced — the `TOUCH_TARGET` chain, the opacity ladder, the icon sizes, the sort controls, all ten compliance-table literals — was verified correct |
