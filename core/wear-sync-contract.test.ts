import { readFileSync } from 'fs';
import { join } from 'path';

import { CARD_COLORS } from '@/shared/theme/tokens.generated';

import { CARD_COLOR_KEYS, DEFAULT_CARD_COLOR, cardColorSchema } from './schemas/card';
import { parseWatchUsageEvent, toBaseWatchCardPayload } from './watch-connectivity';
import {
  WEAR_MESSAGE_PATH,
  WEAR_PROTOCOL_VERSION,
  WEAR_SNAPSHOT_PATH,
  selectWearSnapshotCards
} from './wear-connectivity';

/**
 * The phone ↔ Wear OS wire contract, pinned across all three artifacts that implement it.
 *
 * Three copies of the same constants exist — TypeScript, the phone's Kotlin Expo module, and the
 * Wear OS APK — because the JS bundle, the prebuilt Android app and the standalone Wear Gradle
 * project share no build system. Nothing links them at compile time, so a rename on one side
 * would ship a build where the phone publishes to a path the watch never reads: sync simply stops,
 * with no crash, no error, and — on Android, where this app has effectively no telemetry — no
 * signal at all.
 *
 * This file is the link. It is a TypeScript test that reads Kotlin **source**, the same technique
 * `targets/watch/__tests__/watch-layout-contract.test.ts` uses to make Swift invariants
 * CI-enforceable. It runs under `yarn test`, which — unlike the Wear OS Gradle job — is not
 * path-filtered, so it fires on every PR regardless of which side was edited.
 */

const REPO_ROOT = join(__dirname, '..');

const PHONE_MODULE_CONTRACT = join(
  REPO_ROOT,
  'modules/wear-data-layer/android/src/main/java/expo/modules/weardatalayer/WearDataLayerContract.kt'
);
const WEAR_APP_CONTRACT = join(
  REPO_ROOT,
  'watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/sync/WearSyncContract.kt'
);
const PHONE_WEAR_XML = join(
  REPO_ROOT,
  'modules/wear-data-layer/android/src/main/res/values/wear.xml'
);
const MANIFEST = join(REPO_ROOT, 'modules/wear-data-layer/android/src/main/AndroidManifest.xml');
const FIXTURE = join(REPO_ROOT, 'test-fixtures/sync-message-v1.json');

/** The three places a card colour KEY is resolved on a watch (Story 21.2a, AC7). */
const WEAR_CARD_VISUALS = join(
  REPO_ROOT,
  'watch-android/app/src/main/kotlin/com/iferoporefi/myloyaltycards/wear/presentation/CardVisuals.kt'
);
const WATCH_COLOR_HELPERS = join(REPO_ROOT, 'targets/watch/ColorHelpers.swift');
const WIDGET_CARD_PALETTE = join(REPO_ROOT, 'targets/watch-widget/WidgetCardPalette.swift');

const read = (path: string): string => readFileSync(path, 'utf8');

/** Extract `const val NAME = "value"` from Kotlin source. */
function kotlinStringConst(source: string, name: string): string | null {
  const match = new RegExp(`const val ${name}\\s*=\\s*"([^"]*)"`).exec(source);
  return match?.[1] ?? null;
}

/** Extract `const val NAME = 123` from Kotlin source. */
function kotlinIntConst(source: string, name: string): number | null {
  const match = new RegExp(`const val ${name}\\s*=\\s*(-?\\d+)`).exec(source);
  return match ? Number(match[1]) : null;
}

/**
 * The text between `open(` and its MATCHING `)`, found by counting parentheses.
 *
 * A regex cannot do this: `[\\s\\S]*?\\)` stops at the first inner `Rgb(...)`, and every
 * cheaper anchor encodes a formatting habit rather than the syntax. Terminating at
 * `,\n` needs the last entry to carry a trailing comma (so reordering the map breaks
 * it); terminating at a `)` in column 0 needs the closing delimiter left un-indented.
 * Both were tried; both moved the fragility rather than removing it. Counting is
 * indifferent to indentation, line breaks, entry order and trailing commas alike.
 */
function balancedParenBody(source: string, open: string): string {
  const start = source.indexOf(open);
  if (start === -1) {
    return '';
  }

  let depth = 0;
  for (let i = start + open.length - 1; i < source.length; i += 1) {
    if (source[i] === '(') {
      depth += 1;
    } else if (source[i] === ')') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start + open.length, i);
      }
    }
  }

  return '';
}

/** `"key" to Rgb(0x.., 0x.., 0x..)` → `{ key: '#RRGGBB' }`, for the Wear palette map. */
function kotlinRgbMap(source: string, name: string): Record<string, string> {
  const declaration = new RegExp(`val ${name}[^=]*=\\s*mapOf\\(`).exec(source);
  const block = declaration ? balancedParenBody(source.slice(declaration.index), 'mapOf(') : '';
  const entries: Record<string, string> = {};

  for (const [, key, r, g, b] of block.matchAll(
    /"([^"]+)"\s*to\s*Rgb\(\s*0x([0-9A-Fa-f]{2})\s*,\s*0x([0-9A-Fa-f]{2})\s*,\s*0x([0-9A-Fa-f]{2})\s*\)/g
  )) {
    if (key && r && g && b) {
      entries[key] = `#${r}${g}${b}`.toUpperCase();
    }
  }

  return entries;
}

/** `"key": "#RRGGBB"` → `{ key: '#RRGGBB' }`, for the Swift widget palette literal. */
function swiftHexMap(source: string, name: string): Record<string, string> {
  const block = new RegExp(`let ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\]`).exec(source);
  const entries: Record<string, string> = {};

  for (const [, key, hex] of (block?.[1] ?? '').matchAll(/"([^"]+)"\s*:\s*"(#[0-9A-Fa-f]{6})"/g)) {
    if (key && hex) {
      entries[key] = hex.toUpperCase();
    }
  }

  return entries;
}

describe('phone ↔ Wear OS wire contract', () => {
  describe('the three copies of the contract agree', () => {
    test('the phone module and the Wear app share one path prefix', () => {
      expect(kotlinStringConst(read(PHONE_MODULE_CONTRACT), 'PATH_PREFIX')).toBe('/myloyaltycards');
      expect(kotlinStringConst(read(WEAR_APP_CONTRACT), 'PATH_PREFIX')).toBe('/myloyaltycards');
    });

    test('the TypeScript paths sit under that prefix', () => {
      const prefix = kotlinStringConst(read(WEAR_APP_CONTRACT), 'PATH_PREFIX')!;
      expect(WEAR_SNAPSHOT_PATH.startsWith(prefix)).toBe(true);
      expect(WEAR_MESSAGE_PATH.startsWith(prefix)).toBe(true);
    });

    test('the Wear app reads the snapshot from the path the phone publishes to', () => {
      // Kotlin builds it by interpolation, so compare the resolved suffix.
      const wearSource = read(WEAR_APP_CONTRACT);
      const snapshotSuffix = /const val SNAPSHOT_PATH\s*=\s*"\$PATH_PREFIX([^"]*)"/.exec(
        wearSource
      );
      const messageSuffix = /const val MESSAGE_PATH\s*=\s*"\$PATH_PREFIX([^"]*)"/.exec(wearSource);

      expect(snapshotSuffix?.[1]).toBeDefined();
      expect(`${'/myloyaltycards'}${snapshotSuffix![1]}`).toBe(WEAR_SNAPSHOT_PATH);
      expect(`${'/myloyaltycards'}${messageSuffix![1]}`).toBe(WEAR_MESSAGE_PATH);
    });

    test('all three agree on the DataMap keys', () => {
      for (const source of [read(PHONE_MODULE_CONTRACT), read(WEAR_APP_CONTRACT)]) {
        expect(kotlinStringConst(source, 'KEY_PAYLOAD')).toBe('payload');
        expect(kotlinStringConst(source, 'KEY_VERSION')).toBe('version');
      }
    });

    test('all three agree on the protocol version', () => {
      expect(kotlinIntConst(read(PHONE_MODULE_CONTRACT), 'PROTOCOL_VERSION')).toBe(
        WEAR_PROTOCOL_VERSION
      );
      expect(kotlinIntConst(read(WEAR_APP_CONTRACT), 'PROTOCOL_VERSION')).toBe(
        WEAR_PROTOCOL_VERSION
      );
    });

    /**
     * The capability is declared in the phone module's `wear.xml` and consumed by name in the
     * Wear APK. Nothing links them, and getting it wrong disables reconnection sync silently —
     * the watch would never learn the phone had come back.
     */
    test('the capability the phone advertises is the one the watch listens for', () => {
      const declared = /<item>([^<]+)<\/item>/.exec(read(PHONE_WEAR_XML))?.[1];
      expect(declared).toBe(kotlinStringConst(read(WEAR_APP_CONTRACT), 'PHONE_CAPABILITY'));
    });

    /**
     * The listener service's intent filter is scoped by path prefix. If it drifted from the
     * prefix the watch sends to, watch → phone messages would never start the phone's process
     * and every `CARD_USED` event would be dropped after the watch had already deleted it.
     */
    test('the listener service intent filter covers the message path', () => {
      const manifest = read(MANIFEST);
      const pathPrefix = /android:pathPrefix="([^"]+)"/.exec(manifest)?.[1];

      expect(pathPrefix).toBe('/myloyaltycards');
      expect(WEAR_MESSAGE_PATH.startsWith(pathPrefix!)).toBe(true);
      expect(manifest).toContain('com.google.android.gms.wearable.MESSAGE_RECEIVED');
      // Required or the system cannot bind the service — see Android's Data Layer guide.
      expect(manifest).toContain('android:exported="true"');
    });
  });

  /**
   * The card colour KEY SET, pinned across the phone and all three watch resolvers
   * (Story 21.2a, AC7) — the first test this contract has ever had.
   *
   * `core/watch-connectivity.ts` sends `colorHex: card.color`: the raw palette key,
   * despite the field's name. `core/wear-connectivity.ts` re-uses the same producer,
   * so ONE function feeds TWO transports and three independent resolvers:
   *
   *   - `targets/watch/ColorHelpers.swift`        `namedCardHex` — the live watchOS card row
   *   - `targets/watch-widget/WidgetCardPalette.swift`  the complication's palette
   *   - `watch-android/…/presentation/CardVisuals.kt`   the Wear OS avatar
   *
   * Nothing linked them. A key added on the phone and missed on a watch renders those
   * cards with the fallback accent, silently — and the Wear APK is versioned and
   * released independently of the phone (app/build.gradle.kts § versionCode bands),
   * so the two can genuinely be out of step. `runtimeVersion.policy` is `appVersion`,
   * so no OTA update can repair a mistake here.
   *
   * ⚠️ Deliberately asserted HERE and not by growing `test-fixtures/sync-message-v1.json`:
   * `SyncFixtureContractTest.kt` pins the fixture at two cards twice over (`:90`
   * `result.cards.size`, `:98` the size of the map read back from the DB), and
   * `wear-os-build.yml` is path-filtered to `watch-android/**` while that fixture sits
   * at the repo root — so
   * a PR that grew the fixture would break Kotlin while running no Kotlin. This file runs
   * in `ci-quality-gates.yml`, which is not path-filtered.
   */
  describe('the card colour key set (Story 21.2a, AC7)', () => {
    const KEYS = [...CARD_COLOR_KEYS];

    test('the frozen key set is exactly these five', () => {
      // ⛔ If this fails you are renaming a persisted, wire-borne identifier. Read the
      // freeze rationale on CARD_COLOR_KEYS in core/schemas/card.ts before changing it.
      expect(KEYS).toEqual(['blue', 'red', 'green', 'orange', 'grey']);
    });

    test('the schema that validates every read accepts exactly the key set', () => {
      // `.options` reads back the enum that actually guards `card.color`, rather than a
      // second copy of the list that could agree with itself while the schema differed.
      expect([...cardColorSchema.options]).toEqual(KEYS);
      expect(cardColorSchema.safeParse('purple').success).toBe(false);
    });

    test('the fallback accent is one of the keys', () => {
      expect(KEYS).toContain(DEFAULT_CARD_COLOR);
    });

    test('the theme palette is keyed by exactly the wire keys', () => {
      expect(Object.keys(CARD_COLORS).sort()).toEqual([...KEYS].sort());
    });

    test("shared/theme/colors.ts's hand-written duplicate union matches the canonical keys", () => {
      // That file keeps its own copy of the union to stay free of a zod dependency.
      const union = /type CardColor = ([^;]+);/.exec(
        read(join(REPO_ROOT, 'shared/theme/colors.ts'))
      )?.[1];
      const members = [...(union ?? '').matchAll(/'([^']+)'/g)].map(([, member]) => member);

      expect(members.sort()).toEqual([...KEYS].sort());
    });

    test('shared/theme/colors.ts falls back to the same key the schema module names', () => {
      const key = /const DEFAULT_CARD_COLOR_KEY: CardColor = '([^']+)';/.exec(
        read(join(REPO_ROOT, 'shared/theme/colors.ts'))
      )?.[1];

      expect(key).toBe(DEFAULT_CARD_COLOR);
    });

    describe("every watch resolver covers every key, at the phone's own hexes", () => {
      test.each([
        [
          'Wear OS CardVisuals.kt',
          () => kotlinRgbMap(read(WEAR_CARD_VISUALS), 'NAMED_CARD_COLORS')
        ],
        [
          // ⚠️ Story 16.41 moved this literal out of `mapColor`'s switch and into a
          // `namedCardHex` table, so that ONE copy serves both the `Color` path and the
          // luminance path that decides the row's hairline and initials colour. Same
          // literal shape as the widget's, so this reuses `swiftHexMap`.
          'watchOS ColorHelpers.swift',
          () => swiftHexMap(read(WATCH_COLOR_HELPERS), 'namedCardHex')
        ],
        [
          'watchOS WidgetCardPalette.swift',
          () => swiftHexMap(read(WIDGET_CARD_PALETTE), 'namedHex')
        ]
      ])('%s resolves all five keys to the token hexes', (_label, extract) => {
        const resolved = extract();

        // A refactor that moved the literal out of the extractor's reach would already
        // fail the per-key loop below (every lookup would be `undefined`). This asserts
        // it first so the failure names the real cause — "the extractor found nothing"
        // — instead of reporting five separate mismatches against `undefined`.
        expect(Object.keys(resolved).length).toBeGreaterThanOrEqual(KEYS.length);

        for (const key of KEYS) {
          expect(resolved[key]).toBe(CARD_COLORS[key].toUpperCase());
        }
      });
    });

    test('the Wear fallback constant is the same accent the phone falls back to', () => {
      const rgb =
        /val DEFAULT_CARD_ACCENT: Rgb = Rgb\(0x([0-9A-Fa-f]{2}), 0x([0-9A-Fa-f]{2}), 0x([0-9A-Fa-f]{2})\)/.exec(
          read(WEAR_CARD_VISUALS)
        );

      expect(rgb).not.toBeNull();
      expect(`#${rgb![1]}${rgb![2]}${rgb![3]}`.toUpperCase()).toBe(
        CARD_COLORS[DEFAULT_CARD_COLOR].toUpperCase()
      );
    });

    test('the watchOS fallback constant is the same accent the phone falls back to', () => {
      // ⚠️ Story 16.42, and the third surface of the same invariant the Wear test above pins.
      // watchOS answered an unresolvable colour with SwiftUI's system `.gray` — a colour the Cardì
      // palette does not contain at all — while the phone and Wear OS both painted the azure, so
      // the watch was the one surface that could put a non-design-system colour on screen.
      //
      // This check belongs HERE rather than in `targets/watch/__tests__/` for the reason the three
      // palette tables above are pinned here: `watchos-tests.yml` is path-filtered to
      // `targets/watch/**` and friends, so a PR that moved only `tokens/color.json` would never run
      // it. Naming the constant in `ColorHelpers.swift` without this test just relocates an
      // untested literal.
      //
      // The pattern is anchored to column 0 so a `///` doc comment quoting the declaration cannot
      // shadow it, and it requires a plain six-digit literal — a computed or `private` constant
      // would fail here rather than drift silently.
      const hex = /^let defaultCardAccentHex = "(#[0-9A-Fa-f]{6})"$/m
        .exec(read(WATCH_COLOR_HELPERS))?.[1]
        ?.toUpperCase();

      // Asserted separately so "the extractor found nothing" reads as itself rather than as a
      // colour mismatch against `undefined`, matching the per-key loop above.
      expect(hex).toBeDefined();
      expect(hex).toBe(CARD_COLORS[DEFAULT_CARD_COLOR].toUpperCase());
    });

    /**
     * The colour a card carries in the canonical fixture must be a key the schema
     * accepts, or the fixture would document a message the phone itself rejects.
     */
    test('every colour in the canonical fixture is a valid key', () => {
      const fixture = JSON.parse(read(FIXTURE)) as {
        cardsSnapshot: { payload: { colorHex?: string }[] };
      };

      expect(fixture.cardsSnapshot.payload.length).toBeGreaterThan(0);

      for (const card of fixture.cardsSnapshot.payload) {
        expect(cardColorSchema.safeParse(card.colorHex).success).toBe(true);
      }
    });
  });

  describe('the canonical fixture (AC16)', () => {
    const fixture = JSON.parse(read(FIXTURE)) as {
      cardsSnapshot: { version: number; type: string; payload: Record<string, unknown>[] };
      cardUsed: unknown;
    };

    test('the snapshot envelope matches what the phone publishes', () => {
      expect(fixture.cardsSnapshot.version).toBe(WEAR_PROTOCOL_VERSION);
      expect(fixture.cardsSnapshot.type).toBe('cards');
      expect(Array.isArray(fixture.cardsSnapshot.payload)).toBe(true);
    });

    /**
     * The fixture's card shape must be exactly what `toBaseWatchCardPayload` produces — no extra
     * keys the watch would ignore, none missing that it needs.
     */
    test('every fixture card uses the payload keys the phone actually emits', () => {
      const emitted = new Set(
        Object.keys(
          toBaseWatchCardPayload({
            id: 'x',
            name: 'x',
            barcode: 'x',
            barcodeFormat: 'EAN13',
            brandId: null,
            color: 'blue',
            isFavorite: false,
            lastUsedAt: null,
            usageCount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        )
      );

      for (const card of fixture.cardsSnapshot.payload) {
        for (const key of Object.keys(card)) {
          expect(emitted.has(key)).toBe(true);
        }
      }
    });

    // AC13 — asserted on the fixture itself, so the contract records the omission too.
    test('no fixture card carries barcodeImageBase64', () => {
      expect(read(FIXTURE)).not.toContain('barcodeImageBase64"');
    });

    test('the CARD_USED message passes the phone validator unchanged', () => {
      expect(parseWatchUsageEvent(fixture.cardUsed)).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        usedAt: '2026-02-14T18:22:05.017Z'
      });
    });

    /** A fixture that blew the budget would be a contract nobody could actually honour. */
    test('the fixture snapshot fits the Data Layer budget', () => {
      const cards = fixture.cardsSnapshot.payload.map((card) => ({
        id: card.id as string,
        name: card.name as string,
        barcode: card.barcodeValue as string,
        barcodeFormat: card.barcodeFormat as string,
        brandId: (card.brandId as string) ?? null,
        color: card.colorHex as string,
        isFavorite: Boolean(card.isFavorite),
        lastUsedAt: (card.lastUsedAt as string) ?? null,
        usageCount: (card.usageCount as number) ?? 0,
        createdAt: card.createdAt as string,
        updatedAt: card.createdAt as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      })) as any[];

      expect(selectWearSnapshotCards(cards).droppedCount).toBe(0);
    });
  });
});
