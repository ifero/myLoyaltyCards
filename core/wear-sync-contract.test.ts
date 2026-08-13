import { readFileSync } from 'fs';
import { join } from 'path';

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
