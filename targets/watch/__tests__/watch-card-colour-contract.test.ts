import fs from 'node:fs';
import path from 'node:path';

import { CARD_COLORS } from '@/shared/theme/tokens.generated';

import { describeOnMac, runSwiftProgram, swiftDeclaration } from './swift-source-helpers';

/**
 * Story 16.41 — one card is one colour, on every surface, and the hairline means what it says.
 *
 * The phone sends the palette KEY, not a hex: `core/watch-connectivity.ts` sets
 * `colorHex: card.color`, and `card.color` is a required `cardColorSchema` enum
 * (`core/schemas/card.ts:54`), so the field is a key for catalogue and custom cards alike. The
 * canonical wire fixture says so out loud — `test-fixtures/sync-message-v1.json:31` carries
 * `"colorHex": "green"` on a `conad` card.
 *
 * ⚠️ That makes `relativeLuminance`'s invalid-input default load-bearing, and it is the worst
 * possible one. It guards `h.count == 6` and returns `0.0` — which reads as BLACK. So the shipped
 * row asked `isNearBlack(hex: "blue")`, got `0.0 < 0.05`, and drew the near-black hairline on
 * EVERY row on the watch; and it asked `shouldUseWhiteText(onBackgroundHex: "orange")`, got
 * `0.0 < 0.4`, and painted white initials on the amber accent — 2.15:1, where black is 9.78:1.
 * Both defects are invisible to a compiler and to a green test suite, which is why this file runs
 * the shipped Swift rather than describing it.
 *
 * Swift XCTests do not auto-run in this repo (there is no test action for `watch-ios/Tests/`), so
 * the enforceable technique is the one Stories 16.26/16.27/16.37 established: lift the shipped
 * declarations and execute them under `xcrun swift`.
 *
 * ⚠️ Story 16.42 extended this to the UNRESOLVABLE case, which 16.41 left answering `nil` in three
 * separately chosen ways — `.gray`, `false`, `true`. The first of those painted a SwiftUI SYSTEM
 * colour, which the Cardì palette does not contain, while the phone (`DEFAULT_CARD_COLOR`) and
 * Wear OS (`DEFAULT_CARD_ACCENT`) both painted the azure. The row now resolves ONE non-optional
 * painted hex and derives all three decisions from it, so the harness below reproduces that shape
 * rather than the optional one.
 */

const repoRoot = path.resolve(__dirname, '../../..');
const colorHelpersPath = path.join(repoRoot, 'targets', 'watch', 'ColorHelpers.swift');
const cardListViewPath = path.join(repoRoot, 'targets', 'watch', 'CardListView.swift');
const HELPERS = 'ColorHelpers.swift';

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf8');

/**
 * The declaration `ColorHelpers.swift` names the fallback accent in.
 *
 * `swiftDeclaration` walks braces or brackets and a one-line `let` has neither, so this is a line
 * match. It is anchored to column 0 under the `m` flag, which is what stops a doc comment from
 * shadowing the real declaration the way Story 16.41's QA review demonstrated: every comment in
 * that file is `///`-prefixed, so no commented line can begin with `let`.
 *
 * ⚠️ **Deliberately duplicated in `core/wear-sync-contract.test.ts`, byte for byte.** That file
 * pins the same declaration in the always-on quality-gates job and the two cannot share code —
 * `core/` must not import from `targets/watch/__tests__/`, and this suite is path-filtered while
 * that one is not. Keep the two patterns identical: a change here is a change there.
 *
 * It tolerates the edits an ordinary Swift author makes — a `: String` annotation, different
 * spacing, a trailing `//` comment, CRLF — because reporting those as COLOUR DRIFT would be a
 * false alarm in the one gate that is supposed to mean the watch and the phone disagree. What it
 * still requires is the part the gate is about: a plain, file-scope, six-digit hex literal, so a
 * computed or `private` constant fails here rather than drifting quietly.
 */
const DEFAULT_ACCENT_DECLARATION =
  /^let[ \t]+defaultCardAccentHex[ \t]*(?::[ \t]*String[ \t]*)?=[ \t]*"(#[0-9A-Fa-f]{6})"[ \t]*(?:\/\/.*)?\r?$/m;

/**
 * The fallback accent, lifted from that declaration and NORMALISED to upper case.
 *
 * ⚠️ The case normalisation is the point, not a convenience. `resolvedCardHex` upper-cases the
 * hexes it parses, but the fallback reaches the row through `?? defaultCardAccentHex` untouched —
 * so a lower-case literal would make the harness below print `hex=#0c84cc` while
 * `core/wear-sync-contract.test.ts`, which upper-cases both sides, stayed green. Two gates
 * disagreeing about the same literal is worse than either failing, so the declaration handed to
 * the harness is REBUILT from the captured hex rather than echoed verbatim.
 *
 * ⚠️ The VALUE is deliberately not asserted here. `core/wear-sync-contract.test.ts` pins it to
 * `CARD_COLORS[DEFAULT_CARD_COLOR]` in the always-on quality-gates job, which is the drift gate
 * this file cannot be — `watchos-tests.yml` is path-filtered, so a PR that moved only the token
 * would never run it.
 */
const fallbackAccent = (source: string) => {
  const hex = DEFAULT_ACCENT_DECLARATION.exec(source)?.[1]?.toUpperCase();

  if (!hex) {
    throw new Error(
      `Unable to find \`let defaultCardAccentHex = "#RRGGBB"\` at file scope in ${HELPERS}`
    );
  }

  return { line: `let defaultCardAccentHex = "${hex}"`, hex };
};

/** A `CardListView` computed property or view function, sliced whole and whitespace-normalised. */
const rowProperty = (source: string, signature: string) =>
  swiftDeclaration(source, signature, 'CardListView.swift')
    .replace(/\/\/.*$/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Lift the framework-free half of `ColorHelpers.swift` and drive it from stdin.
 *
 * Only the declarations that need no SwiftUI are taken, so the harness runs under the macOS SDK
 * without dragging `Color` in. `namedCardHex` is `private` at file scope, which is exactly the
 * scope the harness gives it.
 */
const buildHarness = () => {
  const source = readSource(colorHelpersPath);

  return [
    'import Foundation',
    swiftDeclaration(source, 'private let namedCardHex: [String: String] = [', HELPERS),
    fallbackAccent(source).line,
    swiftDeclaration(source, 'func resolvedCardHex(_ raw: String?) -> String? {', HELPERS),
    swiftDeclaration(source, 'func relativeLuminance(hex: String) -> Double {', HELPERS),
    swiftDeclaration(
      source,
      'func shouldUseWhiteText(onBackgroundHex hex: String) -> Bool {',
      HELPERS
    ),
    swiftDeclaration(source, 'func isNearBlack(hex: String) -> Bool {', HELPERS),
    // The row's three decisions, reproduced from `CardListView`'s `paintedAccentHex`,
    // `needsNearBlackHairline` and `prefersWhiteInitials`. They cannot be lifted — they are
    // properties of a view that owns a `card` — so the SHAPE is pinned separately, in the static
    // test below, and a divergence there fails that test rather than silently passing this
    // harness. There is now one default rather than three: everything downstream reads `painted`.
    'func painted(_ raw: String?) -> String { resolvedCardHex(raw) ?? defaultCardAccentHex }',
    'func hairline(_ raw: String?) -> Bool { isNearBlack(hex: painted(raw)) }',
    'func whiteInitials(_ raw: String?) -> Bool {',
    '    shouldUseWhiteText(onBackgroundHex: painted(raw))',
    '}',
    [
      'while let line = readLine() {',
      '    let raw = line == "<empty>" ? "" : (line == "<blank>" ? "   " : line)',
      '    print("\\(line)~hex=\\(painted(raw))~hairline=\\(hairline(raw))~white=\\(whiteInitials(raw))")',
      '}'
    ].join('\n')
  ].join('\n\n');
};

/** Run every raw colour value through the shipped resolver in one `xcrun swift` process. */
const runHarness = (values: readonly string[]) => {
  const stdout = runSwiftProgram({
    program: buildHarness(),
    input: values.join('\n'),
    label: HELPERS,
    hint:
      'These helpers decide what colour every card row paints, whether it takes the near-black ' +
      'hairline, and whether its initials are legible. A failure here means the watch is drawing ' +
      'a different colour from the one the user picked on the phone.'
  });

  const rows = new Map<string, string[]>();

  for (const line of stdout.split('\n').filter(Boolean)) {
    const [key, ...fields] = line.split('~');

    if (key) {
      rows.set(key, fields);
    }
  }

  return (key: string) => {
    const row = rows.get(key);

    if (!row) {
      throw new Error(`The harness returned no row for "${key}"`);
    }

    return row;
  };
};

describe('watch card colour contract (Stories 16.41, 16.42)', () => {
  it('never hands a raw wire value to a luminance helper', () => {
    // Comments stripped FIRST, and the same way `rowProperty` strips them. This file asks what the
    // view COMPILES, and a `///` line that quotes `isNearBlack(hex:)` — which the prose around
    // these properties does — would otherwise be counted as a call site and redden a correct file.
    // That is not hypothetical here: Story 16.29 already ships a `not.toContain` against
    // `relativeLuminance(` in this same view that a doc comment trips, and it bit during 16.42.
    const cardListView = readSource(cardListViewPath).replace(/\/\/.*$/gm, '');

    // The defect in one line: `isNearBlack(hex: resolvedColorHex)` scored a palette key. Both
    // helpers take a hex and BOTH have a silent wrong answer for anything else, so every luminance
    // call in the view must be handed `paintedAccentHex` — the one resolved, always-valid hex the
    // row fills with — and there must be exactly two of them.
    //
    // ⚠️ Story 16.42 INVERTED this guard rather than loosening it. While the resolution was an
    // optional, the correct shape was `.map(isNearBlack(hex:))` and ANY call passing an argument
    // was a violation, so the assertion was "no such calls exist". Now the correct shape IS a call
    // passing an argument, so the assertion is on the arguments themselves. Same question, and
    // still exact: `rawColorValue` here fails, and so does a third call site.
    //
    // Both sides are SORTED, because the ORDER of two independent property declarations is a
    // stylistic choice and not a contract — swapping `needsNearBlackHairline` and
    // `prefersWhiteInitials` must not redden a colour gate. Sorting weakens nothing this guard
    // claims: it is still an exact multiset, so a changed argument, a third call and a deleted
    // call each still fail.
    const luminanceCalls = [
      ...cardListView.matchAll(/(?:isNearBlack|shouldUseWhiteText)\([^)]*\)/g)
    ]
      .map(([call]) => call.replace(/\s+/g, ' '))
      .sort();

    expect(luminanceCalls).toEqual(
      [
        'isNearBlack(hex: paintedAccentHex)',
        'shouldUseWhiteText(onBackgroundHex: paintedAccentHex)'
      ].sort()
    );

    // `?? ""` is the trap dressed as a fix: an empty string is not six characters, so it scores
    // 0.0 and lands back on "black". The fallback is a VALID hex or it is not a fallback.
    expect(cardListView).not.toMatch(/resolvedCardHex\([^)]*\)\s*\?\?\s*""/);

    // And no colour decision in this view may fall back to a SwiftUI system colour. `.gray` is not
    // in the Cardì palette at all, so painting it made the watch the one surface that could put a
    // colour the design system does not contain on screen (Story 16.42). `parseHexColor`'s own
    // `.gray` guard is deliberately untouched — it lives in `ColorHelpers.swift`, is the generic
    // hex parser, and is reachable outside the card path.
    expect(cardListView).not.toMatch(/\?\?\s*(?:Color)?\.gray/);
  });

  it('leaves no SwiftUI system colour in ColorHelpers outside the generic hex parser', () => {
    // ⚠️ `mapColor`'s fallback has NO executed coverage, and that is not an oversight this test
    // repairs — it is the reason this test exists. `mapColor` returns a SwiftUI `Color`, so it
    // cannot join the harness above (which runs under the macOS SDK without SwiftUI), and the only
    // other thing that touches it is `watch-ios/Tests/CardRowHelpersTests.swift`, which has no test
    // action and never auto-runs. Reverting `return parseHexColor(defaultCardAccentHex)` to
    // `return .gray` would therefore typecheck, pass every suite in this repo, and quietly put a
    // colour the Cardì palette does not contain back on screen (Story 16.42). A source pin is a
    // weaker instrument than an executed one, and it is the only one available here.
    //
    // `parseHexColor`'s OWN `.gray` is the one deliberate exception: it is the generic hex parser,
    // reachable outside the card path, and Story 16.42 left it alone on purpose. So it is sliced
    // out — brace-matched, not pattern-matched — rather than carved out of the regex, which keeps
    // the assertion honest about everything else in the file, including anything added later.
    const helpers = readSource(colorHelpersPath);
    const parser = swiftDeclaration(
      helpers,
      'func parseHexColor(_ hex: String) -> Color {',
      HELPERS
    );
    const outsideParser = helpers.replace(parser, '').replace(/\/\/.*$/gm, '');

    expect(outsideParser).not.toMatch(/\.gray\b/);
  });

  it('pins the whole derivation chain, not just the two calls at the end of it', () => {
    // ⚠️ THIS TEST EXISTS BECAUSE THE GUARD ABOVE IS NOT ENOUGH, and that was proven rather than
    // guessed. Changing `resolvedAccentHex` to return `rawColorValue` — dropping the resolution
    // entirely — reintroduces the exact reported defect (hairline on every row, white initials on
    // amber) while the Swift typecheck AND all four assertions above stay green: they pin the
    // shape of the two call sites that READ `resolvedAccentHex`, and say nothing about what it
    // computes. Pinning the leaves of a chain does not pin the chain.
    //
    // So the five properties are pinned whole. They are deliberately exact rather than
    // `toContain`: this region resolves a value the type system cannot distinguish from a hex
    // (both are `String`), so a compiler can never object to getting it wrong, and every defect in
    // this story lived here. A failure prints the property that moved.
    const cardListView = readSource(cardListViewPath);

    expect({
      rawColorValue: rowProperty(cardListView, 'private var rawColorValue: String {'),
      paintedAccentHex: rowProperty(cardListView, 'private var paintedAccentHex: String {'),
      accentColor: rowProperty(cardListView, 'private var accentColor: Color {'),
      needsNearBlackHairline: rowProperty(
        cardListView,
        'private var needsNearBlackHairline: Bool {'
      ),
      prefersWhiteInitials: rowProperty(cardListView, 'private var prefersWhiteInitials: Bool {')
    }).toEqual({
      // The raw wire value, and the ONLY property allowed to hold one.
      rawColorValue:
        'private var rawColorValue: String { if let brand = resolvedBrand { return card.colorHex ?? "#\\(String(format: "%06X", abs(brand.id.hashValue) % 0xFFFFFF))" } return card.colorHex ?? "" }',
      // The single resolution, and the single default. Everything below reads THIS, never
      // `rawColorValue` — and the fallback is NAMED, so `core/wear-sync-contract.test.ts` can bind
      // to one declaration rather than chasing a literal copied into the view.
      paintedAccentHex:
        'private var paintedAccentHex: String { resolvedCardHex(rawColorValue) ?? defaultCardAccentHex }',
      accentColor: 'private var accentColor: Color { parseHexColor(paintedAccentHex) }',
      needsNearBlackHairline:
        'private var needsNearBlackHairline: Bool { isNearBlack(hex: paintedAccentHex) }',
      prefersWhiteInitials:
        'private var prefersWhiteInitials: Bool { shouldUseWhiteText(onBackgroundHex: paintedAccentHex) }'
    });
  });

  it('pins the four places the view actually READS those properties', () => {
    // ⚠️ AGAIN PROVEN, NOT GUESSED, AND BY THE SAME METHOD AS THE TEST ABOVE. Pinning the five
    // property definitions still leaves them ignorable: changing only `.fill(accentColor)` to
    // `.fill(Color.gray)` and the stroke to `.stroke(Color.clear, …)` — touching no property body —
    // renders EVERY card flat grey and removes the hairline permanently, including for a genuinely
    // black accent, and the Swift typecheck plus every other assertion here stays green. That is a
    // worse regression than the one this story fixed.
    //
    // So the chain is pinned at both ends: what the properties compute (above) and where the view
    // consumes them (here). ⚠️ Honest limit: these are still TEXT pins. They catch a property that
    // stops being read, which is the realistic regression; they cannot catch a colour masked by
    // some later modifier. Only a rendered-view assertion would, and watchOS has no snapshot
    // harness in this repo.
    //
    // ⚠️ What covers that today is a ONE-OFF MANUAL RENDER, not a gate, and not an acceptance
    // criterion — Story 16.42 has six ACs and none of them is visual. The shipped
    // `struct CardRowView: View` was lifted whole and rendered on macOS through SwiftUI's
    // `ImageRenderer`, stubbing only `WatchBrands` and `BrandLogoCatalog`, and the before/after
    // images were compared for a card whose colour will not resolve (system grey → the azure)
    // beside an unchanged `orange` card. It is recorded in the story's Completion Notes. Nothing
    // re-runs it, so a regression in a later modifier would reach a device before it reached a
    // test.
    const cardListView = readSource(cardListViewPath);

    // The accent bar and the hairline, in `body`. Counted, not merely present, so a second
    // conflicting `fill`/`stroke` cannot be introduced alongside the pinned one.
    expect({
      accentBar: cardListView.split('.fill(accentColor)').length - 1,
      hairline:
        cardListView.split(
          '.stroke(needsNearBlackHairline ? Color.white.opacity(0.15) : Color.clear, lineWidth: 1)'
        ).length - 1
    }).toEqual({ accentBar: 1, hairline: 1 });

    // The avatar fill and its initials colour, pinned whole — both live in this one small function.
    expect(
      rowProperty(cardListView, 'private func initialsAvatar(text: String) -> some View {')
    ).toBe(
      'private func initialsAvatar(text: String) -> some View { ZStack { accentColor Text(text) ' +
        '.font(.system(size: 12, weight: .bold)) .foregroundColor(prefersWhiteInitials ? .white : .black) } }'
    );
  });

  it('documents the field as a key rather than the hex its name promises', () => {
    // `colorHex` is named for a hex and carries a key. The comment is the only thing standing
    // between the next reader and the same mistake.
    expect(readSource(cardListViewPath)).toMatch(/let colorHex: String\?\s+\/\/ palette KEY/);
  });

  describeOnMac('executed against the real Swift resolver', () => {
    it('scores each key on its RESOLVED hex rather than on the key text', () => {
      // The regression, stated as data: before the fix every one of these returned
      // hairline=true AND white=true, because no key is six characters long so all six
      // scored luminance 0 — black. These are the adjudicated per-accent outcomes under the
      // Cardì palette (Story 21.2a), written out rather than recomputed from the thresholds,
      // because recomputing them here would just re-implement the code under test.
      const expected = {
        // ⚠️ Deep blue is GENUINELY near-black — L=0.049758, `0.00024` under the 0.05 threshold —
        // so it keeps the hairline, and that is correct: at that luminance the avatar really does
        // recede into the near-black row. It is the only accent that does.
        blue: { hairline: true, white: true },
        red: { hairline: false, white: true },
        green: { hairline: false, white: true },
        // ⚠️ `orange` is the beam YELLOW (the key is deliberately misnamed — see `namedCardHex`).
        // White on it is 1.52:1; black is 13.78:1. This is the single most legible-or-not decision
        // in the row, and the pre-fix code got it wrong in the unreadable direction.
        orange: { hairline: false, white: false },
        grey: { hairline: false, white: true },
        gray: { hairline: false, white: true }
      } as const;

      const keys = Object.keys(expected) as (keyof typeof expected)[];
      const row = runHarness(keys);

      for (const key of keys) {
        const hex =
          key === 'gray' ? CARD_COLORS.grey : CARD_COLORS[key as keyof typeof CARD_COLORS];

        expect({ key, fields: row(key) }).toEqual({
          key,
          fields: [
            `hex=${hex.toUpperCase()}`,
            `hairline=${expected[key].hairline}`,
            `white=${expected[key].white}`
          ]
        });
      }
    });

    it('still draws the hairline for a genuinely near-black accent', () => {
      // The feature itself, which the fix must not remove: a brand that really is black still
      // needs the border to separate it from the near-black row. `#111111` is the last step
      // inside the 0.05 threshold; `#808080` is comfortably outside it.
      const values = ['#000000', '#0A0A0A', '#111111', '#808080'] as const;
      const row = runHarness(values);

      expect(values.map((value) => `${value} ${row(value)[1]}`)).toEqual([
        '#000000 hairline=true',
        '#0A0A0A hairline=true',
        '#111111 hairline=true',
        '#808080 hairline=false'
      ]);
    });

    it('paints the named fallback accent for an unusable colour, not SwiftUI grey', () => {
      // ⚠️ THE STORY 16.42 DEFECT, stated as data. This row used to paint SwiftUI's system `.gray`
      // — a colour the Cardì palette does not contain — while the phone (`DEFAULT_CARD_COLOR`) and
      // Wear OS (`DEFAULT_CARD_ACCENT`) both painted the azure. `<blank>` and `<empty>` are the
      // absent-colour row of the matrix; `purple` and `#badhex` are the unresolvable one.
      //
      // The other two fields are UNCHANGED, and that is what keeps this a bug fix rather than a
      // refactor: `relativeLuminance("#0C84CC")` is 0.20940, which is above the 0.05 hairline
      // threshold and below the 0.4 white-text one — exactly the two values 16.41 hand-picked. So
      // `hairline=false` here is also the proof that the fallback is a hex the helpers can READ:
      // the `?? ""` trap would score 0.0 and report `hairline=true`.
      const { hex } = fallbackAccent(readSource(colorHelpersPath));
      const values = ['<empty>', '<blank>', 'not-a-colour', 'purple', '#badhex', '#FFF'] as const;
      const row = runHarness(values);

      for (const value of values) {
        expect({ value, fields: row(value) }).toEqual({
          value,
          fields: [`hex=${hex}`, 'hairline=false', 'white=true']
        });
      }
    });

    it('normalises a named key the way it normalises a hex', () => {
      // Defensive rather than reachable: `CARD_COLOR_KEYS` on the wire is always lower-case
      // (`core/schemas/card.ts:23`). Covered anyway because the hex branch IS covered, and a
      // resolver that normalises one input shape but not the other is a trap for the next reader.
      const values = ['BLUE', ' green ', 'Grey', 'GRAY'] as const;
      const row = runHarness(values);

      expect(values.map((value) => `${value.trim()} ${row(value)[0]}`)).toEqual([
        `BLUE hex=${CARD_COLORS.blue.toUpperCase()}`,
        `green hex=${CARD_COLORS.green.toUpperCase()}`,
        `Grey hex=${CARD_COLORS.grey.toUpperCase()}`,
        `GRAY hex=${CARD_COLORS.grey.toUpperCase()}`
      ]);
    });

    it('reads an arbitrary brand hex through the same door as a key', () => {
      // Catalogue artwork and user colours share one resolver, so a `#RRGGBB` still works and
      // normalises — case and a missing `#` included.
      const values = ['#1a73e8', '1A73E8', '#F59E0B'] as const;
      const row = runHarness(values);

      expect(values.map((value) => row(value).join(' '))).toEqual([
        'hex=#1A73E8 hairline=false white=true',
        'hex=#1A73E8 hairline=false white=true',
        'hex=#F59E0B hairline=false white=false'
      ]);
    });
  });
});
