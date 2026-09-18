---
baseline_commit: 7e9c2e24663a4f9cb9335ff50af62af3d0b6731f
---

# Story 16.41: watchOS scores the raw palette key, so every card row draws the near-black hairline and the amber accent gets unreadable initials

Status: review

Epic: 16 — Platform & Tech Debt

> **✅ CONFIRMED BY RUNNING THE SHIPPED SWIFT, NOT BY READING IT.** Found 2026-09-17 while scoping
> Story 21.2a (card accents), and deliberately left out of that story: it is a different mechanism
> and it changes visible watch behaviour.
>
> ⚠️ **TWO CLAIMS IN THE ORIGINAL REPORT WERE WRONG, AND BOTH MADE IT LOOK SMALLER.** The report
> said catalogue cards were unaffected, and it described the fix against Story 21.2a's Cardì
> palette as if that had landed. Neither holds — see _What the report got wrong_ below.
>
> ✅ **REBASED ONTO STORY 21.2a**, which merged as `f4782ee` (#240) on 2026-09-17. The sequencing
> ifero chose is executed, not pending — see _Sequencing_ below for what the merge changed.

## Story

As someone with loyalty cards on an Apple Watch,
I want each row to show the colour I actually picked and to draw the near-black hairline only when
the accent really is near-black,
so that the list is not a wall of identically-bordered rows and my amber card's initials are
legible.

## Context

### The defect is one bad default, reached by a mislabelled field

`relativeLuminance(hex:)` (`targets/watch/ColorHelpers.swift`) guards `h.count == 6` and returns
**`0.0`** for anything it cannot parse. `0.0` is the luminance of **black**. So its invalid-input
default is not neutral — it is the strongest possible claim about the colour.

`WatchCard.colorHex` is named for a hex and carries a palette **KEY**. `core/watch-connectivity.ts:252`
sets `colorHex: card.color`, and `card.color` is a required `cardColorSchema` enum
(`core/schemas/card.ts:54`) — so the field is **always** a key, never a hex. The canonical wire
fixture says so directly: `test-fixtures/sync-message-v1.json:31` carries `"colorHex": "green"` on
a `conad` card. `core/wear-connectivity.ts` reuses the same producer, so Wear OS receives a key too.

Two call sites in `CardListView.swift` fed that raw value straight to a hex-only helper:

| Call site                                       | Given      | Scored | Result                                    |
| ----------------------------------------------- | ---------- | ------ | ----------------------------------------- |
| `isNearBlack(hex: resolvedColorHex)` (`:363`)   | `"blue"`   | `0.0`  | `0.0 < 0.05` → **hairline on every row**  |
| `shouldUseWhiteText(onBackgroundHex:)` (`:420`) | `"orange"` | `0.0`  | `0.0 < 0.4` → **white initials on amber** |

Measured by executing the shipped functions, all five keys returned `hairline=true` and
`whiteInitials=true`.

### The second one is a legibility defect, not a cosmetic one

White on `#F59E0B` is **2.15:1**. Black on the same amber is **9.78:1**. The complication already
knew: `WidgetCardPalette.prefersWhiteForeground`'s own doc comment claims the threshold is shared
"so e.g. orange picks black text on both surfaces" — an invariant the app violated.

### The root cause: watchOS resolved the key differently from every other surface

Three native surfaces resolve the same wire key, and one of them disagreed:

| Surface                                        | Resolved `blue` to                 |
| ---------------------------------------------- | ---------------------------------- |
| `targets/watch-widget/WidgetCardPalette.swift` | `#1A73E8` — the palette hex        |
| `watch-android/…/CardVisuals.kt`               | `#1A73E8` — the palette hex        |
| `targets/watch/ColorHelpers.swift`             | **`Color.blue`** — a SYSTEM colour |

So the same card rendered one colour in the watch app and another in its own complication on the
same wrist. `CardVisuals.kt` had already recorded this in its own comment — resolving keys to the
exact hex is "more faithful than watchOS, which approximated with system colours."

Because the key had no fixed hex on watchOS, "decide the hairline from the resolved colour" had no
single answer there. **ifero chose the wider fix on 2026-09-17**: make the key→hex resolution the
one source of truth and let `mapColor` use it too, rather than adding a second table that only the
hairline reads.

### What the report got wrong

1. **"Catalogue cards are unaffected — they resolve to a real `#RRGGBB` from the brand."** They are
   affected. `resolvedColorHex` only fell back to the brand-id hash when `card.colorHex` was
   **nil**, and the phone never sends nil. Every row on the list took the hairline, catalogue and
   custom alike — and the brand-hash fallback is effectively dead code.
2. **"As of Story 21.2a `mapColor` resolves the five keys to the Cardì accent hexes."** Story 21.2a
   is `ready-for-dev` and has not landed. The palette is still the shipped one, so **none** of the
   five keys is near-black (the lowest, `grey`, is `L=0.171`). The visible change here is that the
   hairline disappears from **every** row, not from four of five. It becomes the report's picture
   only once 21.2a lands and `blue` moves to `#0C3C84` (`L=0.049758`, `0.00024` under the
   threshold — that figure is correct and was re-derived).
3. The report cites an Android test named `deepBlueAccent_sitsJustInsideTheNearBlackThreshold`. It
   does not exist on any git ref. The real assertions are inside `CardVisualsTest.luminanceAndContrastExtremes`,
   which pins `isNearBlack(#1A73E8)` **false**.

## Acceptance Criteria

- **AC1 — One resolver per surface.** `ColorHelpers.swift` gains `resolvedCardHex(_:)`, which turns
  a palette key **or** a hex into a normalized `"#RRGGBB"`, or `nil`. It mirrors
  `WidgetCardPalette.hex(for:)` and Wear's `resolveCardColor`.
- **AC2 — `mapColor` resolves through it**, so a named key renders the palette hex the user picked
  on the phone rather than a SwiftUI system colour. ⚠️ This is a visible colour change on all five
  accents and is the wider scope ifero chose; it also gives Story 21.2a ONE table per surface to
  repoint instead of a switch of system colours.
- **AC3 — No call site scores a raw wire value.** The row derives `resolvedAccentHex` once and
  feeds every colour decision from it — fill, hairline and initials — mirroring Wear's
  `CardPresentation`.
- **AC4 — Unresolvable input defaults the DECISION, never the string.** `resolvedCardHex(raw) ?? ""`
  is the same trap: `""` is not six characters, so it scores `0.0` and lands back on "black". No
  hairline and white initials are the defaults, the latter matching
  `WidgetCardPalette.prefersWhiteForeground`.
- **AC5 — The near-black hairline still works** for an accent that genuinely is near-black
  (`#000000`, `#0A0A0A`, `#111111`), which is the feature the fix must not remove.
- **AC6 — The three native palette tables are pinned to the generated tokens**, in a test that is
  **not** path-filtered. ⚠️ `watchos-tests.yml` filters to `targets/watch/**`,
  `targets/watch-widget/**`, `catalogue/**`, `watch-ios/**` and `ios/**` — two of the gate's three
  inputs (`tokens/color.json` and `CardVisuals.kt`) are outside every one of them, so the gate
  lives in `shared/theme/` and runs under `yarn test`, the reasoning `core/wear-sync-contract.test.ts`
  already records for the Wear wire constants.
- **AC7 — The behaviour is executed, not described.** Swift XCTests do not auto-run in this repo,
  so the shipped declarations are lifted and run under `xcrun swift`, the technique Stories
  16.26/16.27/16.37 established. Each new test is shown failing against the unfixed code.
- **AC8 — Verified on a watch simulator**, because ALL FIVE accents change colour — `grey` included,
  from the hand-written `#9CA3AF` literal to the palette's `#64748B` — and every row loses its
  border.

## Tasks / Subtasks

- [x] **Task 1 — `resolvedCardHex` + the named table in `ColorHelpers.swift` (AC1, AC2).**
- [x] **Task 2 — Derive the row's three decisions from one resolution (AC3, AC4).**
- [x] **Task 3 — The executed watch contract suite (AC5, AC7).**
- [x] **Task 4 — The always-on native parity gate (AC6).**
- [x] **Task 5 — Simulator verification (AC8).**

## Dev Notes

### Guardrails

- **`initialsAvatar` lost its `backgroundHex` parameter.** Both call sites passed a raw value, and
  for a brandless card the two branches passed the _same_ value despite a comment claiming they
  differed. The fill was always `accentColor`, so the text colour now flips on the hex that fill
  resolves from — one value, not two.
- **Do NOT change the palette VALUES here.** Story 21.2a owns moving them to the Cardì accents.
  This story only changes how a key is resolved, not what it resolves to.
- **`WidgetCardPalette.swift` and `CardVisuals.kt` are untouched.** They were already correct; the
  new gate simply pins them.

### Testing

`yarn test`, `yarn format:check`, and the watch suite as CI runs it:

```
npx jest --testPathPattern='targets/watch/__tests__' --testPathIgnorePatterns='/node_modules/' --no-coverage
```

Swift typecheck (a full `yarn watch:build` needs `expo prebuild` first):

```
xcrun swiftc -typecheck -sdk "$(xcrun --sdk watchsimulator --show-sdk-path)" \
  -target arm64-apple-watchos26.0-simulator targets/watch/*.swift targets/watch/Generated/*.swift
```

### References

- [Source: docs/epics.md#Story 16.41]
- [Source: docs/sprint-artifacts/stories/21-2a-migrate-card-accents-and-colour-keys.md] — owns the
  palette VALUES, and repoints the tables this story pinned
- [Source: watch-android/…/presentation/CardVisuals.kt] — the correct port, and the comment naming
  watchOS's approximation

## Sequencing

**This was sequenced after Story 21.2a** (ifero, 2026-09-17), which merged as `f4782ee` (#240) and
took the **freeze** branch: the five keys stay, their hexes become the Cardì accents. The rebase is
done. What the merge actually changed:

| Area                                 | Outcome                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ColorHelpers.swift`                 | ONE conflict, resolved as planned: this story's `namedCardHex` + `resolvedCardHex(_:)` structure carrying **21.2a's Cardì hexes**, with 21.2a's frozen-contract prose kept                                                                                                                                       |
| the parity gate                      | `shared/theme/colors.native-parity.test.ts` **deleted** — 21.2a's gate in `core/wear-sync-contract.test.ts` asserts the same invariant, in the location its own AC7 named                                                                                                                                        |
| that gate's watchOS extractor        | repointed from `swiftColorSwitch(…, 'mapColor')` to `swiftHexMap(…, 'namedCardHex')` — the literal moved, so its reader had to. It reuses 21.2a's OWN existing helper, already used for the widget's identically-shaped table, so the change is one line. `swiftColorSwitch` had no other caller and was removed |
| `watch-card-colour-contract.test.ts` | expectations flipped, as predicted                                                                                                                                                                                                                                                                               |
| the five pinned property bodies      | unchanged — 21.2a never touched `CardListView.swift`                                                                                                                                                                                                                                                             |

### ⚠️ The merge made one half of this defect materially worse

21.2a left `CardListView.swift` untouched, so **the bug is live on `main` right now** — and with the
new palette the initials half is far worse than it was:

|                      | shipped palette (pre-21.2a) | Cardì palette (on `main` now) |
| -------------------- | --------------------------- | ----------------------------- |
| `orange` accent      | `#F59E0B` amber             | `#FCCC0C` **beam yellow**     |
| what the code paints | white initials              | white initials                |
| that contrast        | 2.15:1                      | **1.52:1**                    |
| what it should paint | black — 9.78:1              | black — **13.78:1**           |

White-on-beam at 1.52:1 is effectively illegible, against WCAG AA's 4.5:1.

The hairline half changed shape rather than severity: `blue` is now `#0C3C84`, whose luminance is
`0.049758` — genuinely near-black, `0.00024` inside the threshold. So after this fix **blue keeps
its hairline and the other four lose theirs**, which is exactly the table the original bug report
predicted. On `main` today all five still draw it, for the original wrong reason — and that is now
_harder_ to notice, because one of the five looks correct.

⛔ **Release timing still matters.** This must merge before the Story 21.7 gate cuts the rebrand
release; `runtimeVersion.policy` is `appVersion`, so a release carrying it cannot be repaired by an
OTA update.

## Dev Agent Record

### Agent Model Used

claude-opus-5

### Completion Notes List

- Measured before/after by executing the shipped Swift, not by reasoning about it. Before: all five
  keys `hairline=true`, `whiteInitials=true`. After: all five `hairline=false`; `whiteInitials=true`
  except `orange`, which is now black.
- Both new suites were run against the unfixed code and fail there (AC7).
- The parity gate was proven by drifting `WidgetCardPalette`'s `blue` to `#0C3C84` and confirming it
  fails and names that file.
- **AC8 verified on the booted 46 mm watchOS 26.4 simulator**, before and after, by compiling the
  real `targets/watch/*.swift` (minus the `@main`) against a harness that renders the real
  `CardRowView`. No `expo prebuild`, no pods and no WatchConnectivity pairing needed. BEFORE: every
  one of the seven rows carried the hairline — including the unparseable one — and `orange` drew
  WHITE initials. AFTER: `#000000` is the only bordered row, the five accents render their palette
  hexes, and `orange` draws BLACK initials.
- ⚠️ **Found while writing the parity gate:** the first Swift table parser sliced to the first `]`
  from the declaration, which is the `]` of the `[String: String]` TYPE ANNOTATION, so both Swift
  tables parsed as `{}`. It failed loudly only because the assertion compares whole tables; a
  per-entry assertion would have passed vacuously. The parser now slices from after the
  declaration and throws on an empty parse.
- ⚠️ **QA review found a MUST-FIX the code review missed, and proved it with a mutation:** changing
  `resolvedAccentHex` to return `rawColorValue` — dropping the resolution — reintroduces the exact
  defect while the Swift typecheck and every assertion passed. The guards pinned the two call sites
  that READ the resolution and said nothing about what it computes. Reproduced independently, then
  closed by pinning all five row properties whole; the new test fails on that mutation and names the
  property that moved.
- ⚠️ **QA round 2 found a SECOND bypass of the same class, one hop further out:** the five property
  definitions were pinned, but nothing checked the view still READ them. Changing only
  `.fill(accentColor)` and the `.stroke(...)` line — touching no property body — rendered every card
  flat grey and removed the hairline permanently, with the typecheck and all 8 tests green. Closed by
  counting the two modifier usages and pinning `initialsAvatar` whole.
- ⚠️ **QA round 3 found a THIRD, in the pinning mechanism itself**, and rated it non-blocking
  (adversarial, not accidental). Fixed anyway because the bar is zero comments and the fix is small:
  see the `swift-source-helpers.ts` entry above. Verified by planting a decoy comment carrying the
  correct hexes above a `namedCardHex` whose real `blue` was corrupted to `#000000` — before the
  hardening the suite read the decoy and passed; after it, it reads the real table and fails.
- ⚠️ **QA round 4 found two holes in that hardening itself**, both proven by execution: block
  comments are NESTABLE in Swift, so an `indexOf('*/')` scan treated the span after the first
  terminator as live code and a decoy planted there still won; and the one-character escaped-quote
  lookback cannot tell `\\"` (escaped backslash, real close) from `\"` (escaped quote). Closed with
  a depth counter and a backslash-parity check. Verified by lifting the shipped `codeIndexOf` and
  running it over nine crafted sources — nested decoy, line decoy, escaped-backslash-then-comment,
  `//` inside a live string, unterminated nested comment, a signature landing right after `*/`, and
  a control — all resolving to the REAL declaration, the unterminated one failing loudly.
- **Scope line held at the walker.** `swiftDeclaration`'s brace-walker keeps its pre-existing
  one-character escape check: it is shared with Stories 16.26/16.27/16.37, it throws loudly rather
  than answering wrongly, and nothing in any current source triggers it. The resulting asymmetry —
  parity-correct search, naive extraction, one file — is commented at the walker so it reads as a
  decision.
- **Round 5 found nothing**, with nine adversarial attempts aimed at the hardened mechanism. Rounds
  1–2 found defects in this story's own logic (both closed); rounds 3–5 only attacked the test
  tooling's text search, each attempt more contrived than the last. `ColorHelpers.swift` and
  `CardListView.swift` have been unchanged since round 1.
- **The pins have a known ceiling, written into the test rather than implied away.** They are text
  assertions: they catch a property that stops being computed or stops being read, which is the
  realistic regression, but they cannot catch a colour masked by a later view modifier. Only a
  rendered assertion could, and `runSwiftProgram` can lift only framework-free declarations —
  `CardRowView` needs SwiftUI plus the target's WatchConnectivity/SwiftData neighbours, so it cannot
  be compiled for macOS. The AC8 simulator pass is what covers that today.
- **Re-verified on the simulator after the review changes**, because `accentColor` was rewired to
  `parseHexColor` since the first capture. Rendering is unchanged: palette hexes, hairline on
  `#000000` only, black initials on amber.

### File List

- `targets/watch/ColorHelpers.swift` — `namedCardHex`, `resolvedCardHex(_:)`; `mapColor` resolves through them
- `targets/watch/CardListView.swift` — `rawColorValue` / `resolvedAccentHex` / `needsNearBlackHairline` / `prefersWhiteInitials`; `initialsAvatar` loses `backgroundHex`
- `targets/watch/__tests__/watch-card-colour-contract.test.ts` — new, executed against the real Swift
- `core/wear-sync-contract.test.ts` — Story 21.2a's parity gate, repointed at `namedCardHex` (one line, reusing its own `swiftHexMap`) plus removal of the now-callerless `swiftColorSwitch`. Editing a just-merged file from another story is not optional here: this story moves the literal that gate reads, so leaving it alone would break it
- `targets/watch/__tests__/swift-source-helpers.ts` — ⚠️ **a deliberate widening beyond this story's
  files.** `swiftDeclaration`/`switchBody` located declarations with a plain `indexOf`, so a doc
  comment quoting a signature shadowed the real declaration and every suite built on this helper
  could validate the QUOTE while the shipped code went untested. Four suites share it, so the fix
  was verified against all of them (8 suites / 143 tests green). Left alone, this story's own new
  pins would have inherited the hole they exist to close.
- `docs/epics.md`, `docs/sprint-artifacts/sprint-status.yaml` — catalogue section, tracker key,
  `current_sprint.stories`, `epics: [16, …]` and a new `wave_1c` sequenced AFTER 21-2a (`wave_1b`)

### Change Log

- 2026-09-17 — Story created and implemented. AC2's wider scope (unifying `mapColor`) chosen by
  ifero over a hairline-only fix.
- 2026-09-17 — Code review (independent Sonnet subagent) found one MUST-FIX and it was real:
  `accentColor` computed the fill from its OWN `mapColor(hex: rawColorValue)` call rather than from
  `resolvedAccentHex`, so the doc comment and AC3 both overclaimed. Two independent call sites of
  one resolver is the exact shape that produced this defect, and Wear's `presentationFor` resolves
  once for that reason. Now `resolvedAccentHex.map(parseHexColor) ?? .gray`, proven equivalent
  across 22 input classes (case, whitespace, 3-digit, malformed, double-`#`) with zero mismatches.
  Also widened the call-site guard regex to survive a wrapped call, and corrected 21.2a.
