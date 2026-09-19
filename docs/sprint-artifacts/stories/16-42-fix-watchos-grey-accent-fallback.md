---
baseline_commit: 1fff29fe4ec252448ca499907098503d79cbc84f
---

# Story 16.42: watchOS falls back to SwiftUI's system grey, the one accent the Cardì palette does not contain

Status: review

Epic: 16 — Platform & Tech Debt

> **FOLLOWS STORY 16.41**, which merged as `20a0818` (PR #241) on 2026-09-18 while this story was
> being implemented. It was drafted as a stacked branch and is now an ordinary one off `main`:
> 16.41 built the single resolver this story reads, and its `watch-card-colour-contract.test.ts` is
> the suite this story extends.
>
> **Found 2026-09-18 while tracing the reachability of 16.41's `nil` branch**, and deliberately not
> folded into it: 16.41 fixed how a palette KEY is scored, and this fixes what is painted when
> nothing can be scored at all. Three further defects surfaced in the same trace and are recorded
> below as out of scope, unfixed.

## Story

As someone with loyalty cards on an Apple Watch,
I want a card whose colour cannot be resolved to fall back to the same accent my phone falls back
to,
so that the watch never paints a colour the app's design system does not contain.

## Context

### One question, three independently chosen answers

Story 16.41 fixed "three decisions read three different values" by routing fill, hairline and
initials through one resolver. What it left behind is the same shape one level down — three
separately chosen defaults for when that resolver returns `nil`:

| Property                 | Default on `nil` | Correct? |
| ------------------------ | ---------------- | -------- |
| `accentColor`            | `.gray`          | **no**   |
| `needsNearBlackHairline` | `false`          | yes      |
| `prefersWhiteInitials`   | `true`           | yes      |

`.gray` is SwiftUI's _system_ grey. The Cardì palette has no neutral at all — `grey` is the key's
name, not its colour; it resolves to the azure `#0C84CC` — so watchOS was the one surface in the
product that could put a colour the design system does not contain on screen. The phone falls back
to `DEFAULT_CARD_COLOR` and Wear OS to `DEFAULT_CARD_ACCENT`, and both are that same azure.

Nothing tested it. `core/wear-sync-contract.test.ts` already pinned Wear's fallback constant to
`CARD_COLORS[DEFAULT_CARD_COLOR]`; watchOS had no constant to pin, because the answer was spelled
`.gray` inline at a call site.

### Reachability: unlikely on the happy path, permanent once it happens

The phone's happy path cannot produce an unresolvable colour — `card.color` is a required
`cardColorSchema` enum, so the wire always carries one of five frozen keys. That is why this is a
correctness fix rather than a live incident. But "unreachable" is not what the code is:

- the watch snapshot is **never runtime-validated before send** (see _Out of scope_ (c));
- a `nil` that lands **once is permanent**. `displayCards` decodes `rawPayload` in preference to the
  normalized `color` column, and `WatchCard.encode` uses `encodeIfPresent` — so an absent colour
  round-trips as absent forever, and no re-sync heals it (see _Out of scope_ (b)).

### Why collapse the optional rather than patch `?? .gray` in place

Because only one of the three defaults is wrong today, and leaving the other two hand-written leaves
the same trap for the next reader. The collapse is provably behaviour-preserving for them, which is
what keeps it inside a bug fix: the azure's relative luminance is **0.20940**, so `isNearBlack`
answers `false` (threshold 0.05) and `shouldUseWhiteText` answers `true` (threshold 0.4) — exactly
the two values 16.41 hand-picked. Deriving them deletes two constants that could drift.

⚠️ This does **not** contradict 16.41's AC4, "default the DECISION, never the string". That warns
against defaulting to a string the helpers cannot read: `?? ""` is not six characters, so
`relativeLuminance` answers `0.0` and the row lands back on "black". A **valid** `#RRGGBB` is the
opposite of that trap, and is what Wear OS already does.

## Acceptance Criteria

1. A card whose colour cannot be resolved — absent, blank, or unparseable — paints `#0C84CC` as the
   row's **accent**: the bar and avatar fill, the near-black hairline decision and the initials'
   contrast decision all derive from that one hex, and none of them falls back to a SwiftUI system
   colour. ⚠️ Scoped to the accent deliberately, because the row legitimately draws other system
   colours and a blanket "no system colour anywhere" would be false on the day it was written: the
   initials are `.white`/`.black` by design (that IS the contrast decision), the row's text is too,
   and `Color.accentColor` is used elsewhere in the file by the sort sheet
   (`CardListView.swift:719,724`), which this story does not touch.
2. The fallback is **named once** in `targets/watch/ColorHelpers.swift` as a file-scope
   `defaultCardAccentHex`, not spelled at a call site, and `mapColor`'s unparseable branch returns it
   instead of `.gray`.
3. `core/wear-sync-contract.test.ts` asserts that constant equals `CARD_COLORS[DEFAULT_CARD_COLOR]`,
   mirroring the Wear assertion beside it. ⚠️ That job is **not** path-filtered, which is the whole
   point: `watchos-tests.yml` filters to `targets/watch/**` and friends, so a PR moving only
   `tokens/color.json` would never run the watch suite. The Swift change without this test just
   relocates an untested literal.
4. The row derives fill, hairline and initials from ONE non-optional painted hex, so `?? .gray`,
   `?? false` and `?? true` — three answers to one question — become one.
5. Behaviour for all five palette keys is byte-identical to Story 16.41's: same painted hex, same
   hairline decision, same initials colour. The five keys stay a frozen wire contract.
6. The fallback is proven by a **mutation**, not by a green run: forcing `resolvedCardHex` to return
   `nil` for every input must make the watch colour suite fail on the painted hex.

## Tasks / Subtasks

- [x] (AC2) `ColorHelpers.swift` — add `let defaultCardAccentHex = "#0C84CC"` beside `namedCardHex`,
      documented as mirroring the phone and Wear OS.
- [x] (AC2) `ColorHelpers.swift` — `mapColor`'s unparseable branch returns that accent, not `.gray`.
- [x] (AC1, AC4, AC5) `CardListView.swift` — collapse `resolvedAccentHex: String?` into
      `paintedAccentHex: String` and derive the three decisions from it.
- [x] (AC3) `core/wear-sync-contract.test.ts` — the watchOS twin of the Wear fallback assertion.
- [x] (AC1, AC5, AC6) `watch-card-colour-contract.test.ts` — harness, static pins and the
      unresolvable-colour expectations updated to the painted hex.
- [x] `stories/16-42-*.md`, `docs/epics.md`, `sprint-status.yaml` — story, catalogue section and
      tracker key, with `totalStories` bumped.

## Dev Notes

### Anti-patterns — do NOT do these

- ❌ **Spell `#0C84CC` at the call site instead of naming it.** A literal in `CardListView.swift` is
  a second copy of the accent that `core/wear-sync-contract.test.ts` cannot bind to, which is the
  exact condition that let this defect exist. The constant is a plain file-scope `let` with a
  six-digit literal for that reason — a computed or `private` one fails the gate rather than
  drifting quietly. (`private` would also be file-private, so the view could not see it.)
- ❌ **Default to `?? ""`.** Story 16.41's AC4 trap: an empty string is not six characters, so
  `relativeLuminance` answers `0.0`, the row reads as black and takes a hairline it should not have.
  The `hairline=false` assertion in the fallback test is what proves the fallback is a hex the
  helpers can actually read.
- ❌ **Touch `parseHexColor`'s own `.gray` guard.** That is the generic hex parser, reachable outside
  the card path; it is not the card fallback and is deliberately left alone.
- ❌ **Add a second Swift-executing suite.** 16.41's `watch-card-colour-contract.test.ts` already
  lifts the real declarations via `swiftDeclaration` and runs them with `runSwiftProgram`; this
  extends it.
- ❌ **Loosen 16.41's static pins into no-ops.** Collapsing the optional invalidates the guard that
  asserted "no luminance call passes an argument" — while the resolution was optional, the correct
  shape was `.map(isNearBlack(hex:))`. That guard is **inverted**, not deleted: it now pins the
  ARGUMENTS of exactly two luminance calls, so `rawColorValue` there still fails and so does a third
  call site.
- ❌ **Write `relativeLuminance(` into `CardListView.swift`, even in a comment.** Story 16.29's
  contract forbids the view re-deriving luminance and enforces it with a plain `not.toContain`, which
  a doc comment trips. The `0.20940` figure is quoted as a number instead. (Caught by that suite
  during implementation.)

### Out of scope — flag, don't fix

Three adjacent defects surfaced while tracing whether the `nil` branch is reachable. All three are
in the watch fallback/transport mechanism rather than in the palette, and none is fixed here.

- **`rawColorValue`'s brand fallback is not deterministic, despite saying it is — and it SHADOWS
  this story's fallback for catalogue cards.**
  `CardListView.swift` builds a colour as `abs(brand.id.hashValue) % 0xFFFFFF` and the comment above
  it calls that "a deterministic hex from its brand id". Swift seeds `String.hashValue` **per
  process**, so that avatar colour changes on every app launch.
  ⚠️ **It is reachable, not dead.** It needs `card.colorHex` to be `nil`, which is exactly the
  condition _Reachability_ above argues for at length — the snapshot is never runtime-validated
  before send, `encode` uses `encodeIfPresent`, and `syncCardToWatch(id, cardData: any)` takes
  arbitrary data. An earlier draft of this section claimed the opposite ("effectively dead — the
  phone never sends `nil`"), which contradicted that section; the two cannot both be true, and this
  one is the true one.
  ⚠️ **And on that path the new fallback never fires.** For a CATALOGUE card (the brand resolves)
  with `colorHex == nil`, `rawColorValue` returns `"#%06X"` of the brand-id hash — six valid hex
  digits — so `resolvedCardHex` SUCCEEDS and `?? defaultCardAccentHex` is never reached. The row
  paints a colour that changes on every app launch instead of the azure. AC1 therefore holds for
  custom cards and for present-but-unparseable values; a catalogue card with no colour at all takes
  this branch first and never reaches the fallback.
  ⚠️ **It is also a latent crash.** `abs(brand.id.hashValue)` traps on `Int.min` — Swift's `abs`
  has no representable result there — so a brand id whose per-process hash lands on that one value
  aborts the row rather than mis-colouring it.
  **Kept out of scope and unfixed on purpose:** deleting the hash branch changes the accent every
  catalogue card without a colour paints, which is a visual decision for the design system and not
  something a fallback fix gets to take. Stabilising it (a seeded hash, `Int.min`-safe magnitude, or
  routing it to `defaultCardAccentHex`) is its own story, and all three findings here —
  nondeterminism, the shadowed fallback, the trap — should be resolved together.
- **The `?? "grey"` normalizations are dead for display, so an unresolvable colour is permanent.**
  `WatchSessionManager.swift:274` (insert path, `?? "grey"`), `WatchSessionManager.swift:260` (update
  path, `?? entity.color`) and `CardListView.swift:253` (`migrateUserDefaults`, `?? "grey"`) all
  normalize the colour into the entity's `color` column — but `displayCards` decodes `rawPayload` in
  preference to that column, and `WatchCard.encode` writes `colorHex` with `encodeIfPresent`. So the
  normalized value is never read while the payload decodes, and a card persisted without a colour
  keeps rendering the fallback forever; no re-sync heals it. ⚠️ This is what turns AC1 from cosmetic
  into load-bearing, and it is why the fallback had to be a real palette colour.
- **The watch snapshot is never runtime-validated before send.**
  `sanitizeWatchTransportObject` (`core/watch-connectivity.ts:401`) silently drops `null`/`undefined`
  keys rather than rejecting them, and the exported `syncCardToWatch(id, cardData: any)` accepts
  arbitrary data — so a phone-shaped `LoyaltyCard`, which has `color` and not `colorHex`, would
  decode on the watch with no colour at all. No production caller does that today; the type is the
  only thing stopping it, and `any` removes the type.

### Testing

The watch suite as CI runs it, plus the always-on parity gate:

```
npx jest --testPathPattern='targets/watch/__tests__' --testPathIgnorePatterns='/node_modules/' --no-coverage
yarn test core/wear-sync-contract.test.ts
```

Swift typecheck (a full `yarn watch:build` needs `expo prebuild` first):

```
xcrun swiftc -typecheck -sdk "$(xcrun --sdk watchsimulator --show-sdk-path)" \
  -target arm64-apple-watchos26.0-simulator $(find targets/watch -name '*.swift')
```

## Dev Agent Record

### Agent Model Used

claude-opus-5

### Completion Notes List

- **AC6 verified by mutation, not by a green run.** `resolvedCardHex` was forced to `return nil`
  unconditionally and the watch colour suite failed on the painted hex — the five palette keys all
  resolved to the fallback azure instead of their own accents, and the genuinely-near-black case lost
  its hairline. Restored and re-verified clean.
- **`watch-ios/Tests/CardRowHelpersTests.swift` needed no change.** Its `mapColor` invalid-input test
  asserts `XCTAssertNotNil` only, so moving the unparseable branch from `.gray` to the named accent
  does not change what it claims. (Those XCTests do not auto-run in this repo in any case.)
- **One file outside the spec's Code Map was edited:** `core/schemas/card.ts`'s `DEFAULT_CARD_COLOR`
  doc comment stated "⚠️ watchOS does NOT yet agree, and this constant does not reach it", naming
  this exact defect. Leaving it would have left the codebase documenting a bug it no longer has. The
  paragraph now records the mirror and points at the gate; no code changed.
- **The one visual check that happened, stated exactly.** There is no snapshot harness for watchOS
  in this repo and no visual AC in this story, so this was a **one-off manual render, not a gate**:
  the shipped `struct CardRowView: View` was lifted whole and rendered on macOS through SwiftUI's
  `ImageRenderer`, stubbing only `WatchBrands` and `BrandLogoCatalog`, and the before/after images
  were compared for a card whose colour will not resolve — system grey became the azure — beside an
  unchanged `orange` card, which confirmed the palette path did not move. ⚠️ Nothing re-runs it.
  `watch-card-colour-contract.test.ts` pins the text of the derivation chain and of the four places
  the view reads it, which catches a property that stops being read but not a colour masked by a
  later modifier.
- **The two derived decisions were checked, not assumed.** All five palette keys, the near-black
  cases and the arbitrary-hex cases produce identical output to Story 16.41 — the only row of the
  matrix that moves is the unresolvable one.

## References

- The approved spec for this story is a local planning artifact and is deliberately **not**
  committed — no `spec-*.md` has ever been tracked in this repo — so it is not linked here. Its
  intent, boundaries and I/O matrix are carried by this story's _Context_, _Acceptance Criteria_ and
  _Dev Notes_.
- `docs/sprint-artifacts/stories/16-41-fix-watchos-palette-key-resolution.md` — the parent story
  (PR #241); it built `resolvedCardHex` and the executed Swift suite this extends.
- [Source: docs/epics.md#Story 16.42]
- `watch-android/…/presentation/CardVisuals.kt` — `DEFAULT_CARD_ACCENT`, the fallback this mirrors.
- `core/schemas/card.ts` — `DEFAULT_CARD_COLOR`, and why azure rather than one of the other four.
