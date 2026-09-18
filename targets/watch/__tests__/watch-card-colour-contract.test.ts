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
 */

const repoRoot = path.resolve(__dirname, '../../..');
const colorHelpersPath = path.join(repoRoot, 'targets', 'watch', 'ColorHelpers.swift');
const cardListViewPath = path.join(repoRoot, 'targets', 'watch', 'CardListView.swift');
const HELPERS = 'ColorHelpers.swift';

const readSource = (filePath: string) => fs.readFileSync(filePath, 'utf8');

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
    swiftDeclaration(source, 'func resolvedCardHex(_ raw: String?) -> String? {', HELPERS),
    swiftDeclaration(source, 'func relativeLuminance(hex: String) -> Double {', HELPERS),
    swiftDeclaration(
      source,
      'func shouldUseWhiteText(onBackgroundHex hex: String) -> Bool {',
      HELPERS
    ),
    swiftDeclaration(source, 'func isNearBlack(hex: String) -> Bool {', HELPERS),
    // The row's two decisions, reproduced from `CardListView`'s `needsNearBlackHairline` and
    // `prefersWhiteInitials`. They cannot be lifted — they are properties of a view that owns a
    // `card` — so the `?? false` / `?? true` defaults are pinned separately, in the static test
    // below, and a flip there fails that test rather than silently passing this harness.
    'func hairline(_ raw: String?) -> Bool { resolvedCardHex(raw).map(isNearBlack(hex:)) ?? false }',
    'func whiteInitials(_ raw: String?) -> Bool {',
    '    resolvedCardHex(raw).map(shouldUseWhiteText(onBackgroundHex:)) ?? true',
    '}',
    [
      'while let line = readLine() {',
      '    let raw = line == "<empty>" ? "" : (line == "<blank>" ? "   " : line)',
      '    let hex = resolvedCardHex(raw) ?? "nil"',
      '    print("\\(line)~hex=\\(hex)~hairline=\\(hairline(raw))~white=\\(whiteInitials(raw))")',
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

describe('watch card colour contract (Story 16.41)', () => {
  it('never hands a raw wire value to a luminance helper', () => {
    const cardListView = readSource(cardListViewPath);

    // The defect in one line: `isNearBlack(hex: resolvedColorHex)` scored a palette key. Both
    // helpers take a hex and BOTH have a silent wrong answer for anything else, so the row must
    // reach them only through the resolved optional.
    expect(cardListView).toContain('resolvedAccentHex.map(isNearBlack(hex:)) ?? false');
    expect(cardListView).toContain(
      'resolvedAccentHex.map(shouldUseWhiteText(onBackgroundHex:)) ?? true'
    );

    // `?? ""` is the trap dressed as a fix: an empty string is not six characters, so it scores
    // 0.0 and lands back on "black". The decision is defaulted, never the string.
    expect(cardListView).not.toMatch(/resolvedCardHex\([^)]*\)\s*\?\?\s*""/);

    // And nothing else in the view may score a value directly. Matches only a call that PASSES an
    // argument — `[^)\s]` after the label excludes the bare method references `isNearBlack(hex:)`
    // and `shouldUseWhiteText(onBackgroundHex:)` asserted above, which are the correct shape. The
    // `\s*` after `(` is deliberate: without it a violation wrapped across lines by a formatter
    // slips through, which is a guard that reports clean rather than one that reports nothing.
    const luminanceCalls = [
      ...cardListView.matchAll(
        /(?:isNearBlack|shouldUseWhiteText)\(\s*(?:hex|onBackgroundHex):\s*[^)\s]/g
      )
    ].map((match) => match[0].replace(/\s+/g, ' '));

    expect(luminanceCalls).toEqual([]);
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
      resolvedAccentHex: rowProperty(cardListView, 'private var resolvedAccentHex: String? {'),
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
      // The single resolution. Everything below reads THIS, never `rawColorValue`.
      resolvedAccentHex:
        'private var resolvedAccentHex: String? { resolvedCardHex(rawColorValue) }',
      accentColor:
        'private var accentColor: Color { resolvedAccentHex.map(parseHexColor) ?? .gray }',
      needsNearBlackHairline:
        'private var needsNearBlackHairline: Bool { resolvedAccentHex.map(isNearBlack(hex:)) ?? false }',
      prefersWhiteInitials:
        'private var prefersWhiteInitials: Bool { resolvedAccentHex.map(shouldUseWhiteText(onBackgroundHex:)) ?? true }'
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
    // harness in this repo — the simulator pass in the story's AC8 is what covers that today.
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

    it('defaults an unusable colour to no hairline and white initials', () => {
      // Absent or malformed input must not fabricate a border. White initials on the `.gray`
      // fallback fill matches the complication's `WidgetCardPalette.prefersWhiteForeground`,
      // which also defaults to white for an unknown colour.
      const values = ['<empty>', '<blank>', 'not-a-colour', '#badhex', '#FFF'] as const;
      const row = runHarness(values);

      for (const value of values) {
        expect({ value, fields: row(value) }).toEqual({
          value,
          fields: ['hex=nil', 'hairline=false', 'white=true']
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
