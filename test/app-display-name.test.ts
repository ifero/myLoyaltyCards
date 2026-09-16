import fs from 'node:fs';
import path from 'node:path';

import appJson from '../app.json';

/**
 * One invariant, across every native surface that shows the product name to a user
 * (Story 21.1).
 *
 * The name lives in seven places across three separate projects — the Expo config, the
 * watchOS app's `Info.plist` and its target config, both watchOS `.lproj` bundles, the
 * complication's `configurationDisplayName`, and the Wear OS launcher label. Nothing tied
 * them together before, so a partial rename left no trace: the phone would say one thing
 * and a watch face another, and the whole suite would stay green.
 *
 * ⚠️ **This deliberately lives in `test/` rather than `targets/watch/__tests__/`.** The watch
 * contract tests are excluded from `yarn test` (see `jest.config.js` `testPathIgnorePatterns`)
 * and run only in the path-filtered watchOS workflow, so a PR touching only
 * `watch-android/` would never trigger them — the same reasoning that keeps
 * `yarn wear:catalogue:check` in the always-on quality-gates job.
 *
 * `app.json` is the source of truth: every other surface is asserted to agree with it, so a
 * rename is still a one-line change here and this test reports whoever failed to follow.
 *
 * Comparison is NFC-normalised on both sides on purpose. `app.config.ts` feeds Expo the
 * decomposed form so the iOS project namer folds the accent instead of deleting it, and a
 * file saved in either normal form renders identically — the invariant is the *name*, not
 * its byte encoding.
 */
const repoRoot = path.resolve(__dirname, '..');
const read = (...segments: string[]): string =>
  fs.readFileSync(path.join(repoRoot, ...segments), 'utf8').normalize('NFC');

const displayName = appJson.expo.name.normalize('NFC');

describe('product display name', () => {
  it('is the name the Cardì design system draws, with a GRAVE accent and never an acute', () => {
    // Story 20.3 shipped all fifty drawn accents as acutes while the spec said grave the
    // whole time, because prose naming it did not prevent it. This asserts it instead.
    expect(displayName).toBe('Cardì'); // U+00EC LATIN SMALL LETTER I WITH GRAVE
    expect(displayName).not.toContain('í'); // U+00ED … WITH ACUTE
  });

  it.each([
    [
      'watchOS app display name',
      ['targets', 'watch', 'Info.plist'],
      (n: string) => `<string>${n}</string>`
    ],
    [
      'watchOS target config displayName',
      ['targets', 'watch', 'expo-target.config.js'],
      (n: string) => `displayName: '${n}'`
    ],
    [
      'watchOS app name (en)',
      ['targets', 'watch', 'en.lproj', 'Localizable.strings'],
      (n: string) => `"watch.app.name" = "${n}";`
    ],
    [
      'watchOS app name (it)',
      ['targets', 'watch', 'it.lproj', 'Localizable.strings'],
      (n: string) => `"watch.app.name" = "${n}";`
    ],
    [
      'complication configurationDisplayName',
      ['targets', 'watch-widget', 'WatchComplicationWidget.swift'],
      (n: string) => `.configurationDisplayName("${n}")`
    ],
    [
      'Wear OS launcher label',
      ['watch-android', 'app', 'src', 'main', 'res', 'values', 'strings.xml'],
      (n: string) => `<string name="app_name" translatable="false">${n}</string>`
    ]
  ])('%s agrees with app.json', (_label, segments, expected) => {
    expect(read(...segments)).toContain(expected(displayName));
  });

  it('no longer carries the pre-rebrand name as COPY on any of those surfaces', () => {
    const surfaces = [
      ['targets', 'watch', 'Info.plist'],
      ['targets', 'watch', 'expo-target.config.js'],
      ['targets', 'watch', 'en.lproj', 'Localizable.strings'],
      ['targets', 'watch', 'it.lproj', 'Localizable.strings'],
      ['watch-android', 'app', 'src', 'main', 'res', 'values', 'strings.xml']
    ];

    for (const segments of surfaces) {
      // The reverse-DNS identifier root is NOT copy and deliberately did not move: the
      // bundle identifier, `CFBundleURLName` and the App Group all still contain
      // `com.iferoporefi.myloyaltycards`, and renaming any of them loses the listing's
      // reviews or orphans the shared container. Drop it first, then assert that what is
      // left holds no trace of the old name.
      const copyOnly = read(...segments).replaceAll('com.iferoporefi.myloyaltycards', '');

      // Case-insensitive: the old name shipped in three casings (`myLoyaltyCards`,
      // `MyLoyaltyCards`, `myloyaltycards`) and a case-sensitive check reported files
      // as clean while every site in them still read the old name.
      expect(copyOnly.toLowerCase()).not.toContain('loyaltycards');
    }
  });
});
