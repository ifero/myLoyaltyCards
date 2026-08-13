/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

// The module re-requires its dependency graph after jest.resetModules(), so a spy on the real
// logger singleton would not survive the reset. A mock closing over this stable object IS
// returned on every (re)require, so assertions hold across resets — the same trick
// `watch-connectivity.test.ts` uses. `notify` matters most here: Open Decision 7 routes every
// Android transport failure through it because `warn` is a no-op in release.
const mockLogger = { info: jest.fn(), warn: jest.fn(), notify: jest.fn(), error: jest.fn() };
jest.mock('@/core/utils/logger', () => ({ logger: mockLogger }));

type InboxEntry = { id: string; path: string; data: string };

interface FakeNative {
  isSupported: jest.Mock;
  getConnectedNodeCount: jest.Mock;
  publishSnapshot: jest.Mock;
  sendMessage: jest.Mock;
  readInboundMessages: jest.Mock;
  acknowledgeInboundMessages: jest.Mock;
  addListener: jest.Mock;
  /** Test helper: fire the native `onInboundMessage` nudge. */
  emitInbound: () => void;
}

function makeNative(overrides: Partial<Record<keyof FakeNative, any>> = {}): FakeNative {
  const listeners: (() => void)[] = [];
  const native: FakeNative = {
    isSupported: jest.fn().mockResolvedValue(true),
    getConnectedNodeCount: jest.fn().mockResolvedValue(1),
    publishSnapshot: jest.fn().mockResolvedValue(true),
    sendMessage: jest.fn().mockResolvedValue(1),
    readInboundMessages: jest.fn().mockResolvedValue([] as InboxEntry[]),
    acknowledgeInboundMessages: jest.fn().mockResolvedValue(0),
    addListener: jest.fn((_event: string, cb: () => void) => {
      listeners.push(cb);
      return {
        remove: () => {
          const index = listeners.indexOf(cb);
          if (index >= 0) listeners.splice(index, 1);
        }
      };
    }),
    emitInbound: () => {
      for (const cb of [...listeners]) cb();
    },
    ...overrides
  };
  return native;
}

/**
 * Load a fresh copy of the module with `modules/wear-data-layer` mocked to `native`, or absent
 * entirely when `native` is null (which is what iOS and a Jest run without the Expo native
 * runtime both look like).
 */
function loadModule(native: FakeNative | null) {
  let mod!: typeof import('./wear-connectivity');
  jest.isolateModules(() => {
    if (native === null) {
      jest.doMock('@/modules/wear-data-layer', () => {
        throw new Error('native module unavailable');
      });
    } else {
      jest.doMock('@/modules/wear-data-layer', () => ({ default: native }));
    }
    mod = require('./wear-connectivity');
  });
  return mod;
}

function makeCard(overrides: Record<string, unknown> = {}): any {
  return {
    id: 'c1',
    name: 'Card',
    barcode: '123',
    barcodeFormat: 'CODE128',
    brandId: null,
    color: 'blue',
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

/** The last envelope handed to `publishSnapshot`, parsed. */
function publishedEnvelope(native: FakeNative): any {
  const call = native.publishSnapshot.mock.calls.at(-1);
  return JSON.parse(call![1] as string);
}

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('wear-connectivity', () => {
  describe('wire contract', () => {
    // These literals are duplicated in `WearDataLayerContract.kt` (phone module) and
    // `WearSyncContract.kt` (Wear APK) because the three build systems share nothing. Pinning
    // them here turns "someone renamed a path on one side" from a silent field failure into a
    // failing test.
    test('paths and version match the Kotlin mirrors', () => {
      const mod = loadModule(makeNative());
      expect(mod.WEAR_SNAPSHOT_PATH).toBe('/myloyaltycards/cards');
      expect(mod.WEAR_MESSAGE_PATH).toBe('/myloyaltycards/msg');
      expect(mod.WEAR_PROTOCOL_VERSION).toBe(1);
    });

    test('the snapshot budget leaves headroom under the Data Layer 100 KB cap', () => {
      const mod = loadModule(makeNative());
      expect(mod.WEAR_SNAPSHOT_MAX_BYTES).toBeLessThan(100_000);
      expect(mod.WEAR_SNAPSHOT_MAX_BYTES).toBeGreaterThan(48_000);
    });
  });

  describe('availability', () => {
    test('reports unavailable when the native module cannot be required', () => {
      const mod = loadModule(null);
      expect(mod.isWearConnectivityAvailable()).toBe(false);
    });

    test('reports available when the native module resolves', () => {
      const mod = loadModule(makeNative());
      expect(mod.isWearConnectivityAvailable()).toBe(true);
    });

    // Each scenario is its OWN test, not three `loadModule` calls in one body. That is
    // load-bearing, not stylistic: `getNativeModule` requires `@/modules/wear-data-layer`
    // lazily, so the require runs *after* `jest.isolateModules` has exited and resolves in the
    // parent registry. The first `loadModule` in a test caches the module there, and a second
    // `loadModule` in the same test silently reuses that first mock — so a combined test would
    // exercise only its first case and pass even if the catch branches regressed. `afterEach`'s
    // `jest.resetModules()` only clears that cache *between* tests. (Confirmed via coverage: the
    // combined form left `isWearTransportSupported`'s catch and `getConnectedWearNodeCount`'s
    // early return uncovered despite tests that named them.)
    test('isWearTransportSupported returns false when the check resolves false', async () => {
      const native = makeNative({ isSupported: jest.fn().mockResolvedValue(false) });
      await expect(loadModule(native).isWearTransportSupported()).resolves.toBe(false);
    });

    test('isWearTransportSupported returns false when the check rejects', async () => {
      const native = makeNative({
        isSupported: jest.fn().mockRejectedValue(new Error('no play services'))
      });
      await expect(loadModule(native).isWearTransportSupported()).resolves.toBe(false);
    });

    test('isWearTransportSupported returns false when the transport is absent', async () => {
      await expect(loadModule(null).isWearTransportSupported()).resolves.toBe(false);
    });

    test('getConnectedWearNodeCount degrades to zero when the call rejects', async () => {
      const native = makeNative({
        getConnectedNodeCount: jest.fn().mockRejectedValue(new Error('boom'))
      });
      await expect(loadModule(native).getConnectedWearNodeCount()).resolves.toBe(0);
    });

    test('getConnectedWearNodeCount returns zero when the transport is absent', async () => {
      await expect(loadModule(null).getConnectedWearNodeCount()).resolves.toBe(0);
    });
  });

  describe('pushCardsToWear', () => {
    test('publishes the versioned snapshot envelope at the snapshot path', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await expect(mod.pushCardsToWear([makeCard()])).resolves.toBe(true);

      expect(native.publishSnapshot).toHaveBeenCalledTimes(1);
      expect(native.publishSnapshot.mock.calls[0]![0]).toBe('/myloyaltycards/cards');
      expect(publishedEnvelope(native)).toEqual({
        version: 1,
        type: 'cards',
        payload: [
          {
            id: 'c1',
            name: 'Card',
            colorHex: 'blue',
            barcodeValue: '123',
            barcodeFormat: 'CODE128',
            usageCount: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            isFavorite: false
          }
        ]
      });
    });

    // AC13. The single most consequential field difference between the two transports.
    test('omits barcodeImageBase64 even for a QR card', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await mod.pushCardsToWear([
        makeCard({ barcodeFormat: 'QR', barcode: 'https://example.com' })
      ]);

      const [card] = publishedEnvelope(native).payload;
      expect(card).not.toHaveProperty('barcodeImageBase64');
      // Nor anywhere else in the serialised body — a nested copy would still cost the bytes.
      expect(native.publishSnapshot.mock.calls[0]![1]).not.toContain('barcodeImageBase64');
    });

    // AC12 — the 5-6a sanitiser, reused rather than reimplemented.
    test('drops null and undefined fields instead of transmitting them', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await mod.pushCardsToWear([makeCard({ brandId: null, lastUsedAt: null })]);

      const [card] = publishedEnvelope(native).payload;
      expect(card).not.toHaveProperty('brandId');
      expect(card).not.toHaveProperty('lastUsedAt');
    });

    test('sends every card in the phone-supplied order', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await mod.pushCardsToWear([
        makeCard({ id: 'a', name: 'Alpha' }),
        makeCard({ id: 'b', name: 'Beta' }),
        makeCard({ id: 'c', name: 'Gamma' })
      ]);

      expect(publishedEnvelope(native).payload.map((c: any) => c.id)).toEqual(['a', 'b', 'c']);
    });

    // An empty snapshot is how a "delete the last card" reaches the watch. If this were skipped
    // as a no-op the watch would keep showing a card the user deleted (AC7).
    test('publishes an empty snapshot when every card is deleted', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await expect(mod.pushCardsToWear([])).resolves.toBe(true);
      expect(publishedEnvelope(native).payload).toEqual([]);
    });

    test('returns false and notifies when the native publish rejects', async () => {
      const native = makeNative({
        publishSnapshot: jest.fn().mockRejectedValue(new Error('data layer down'))
      });
      const mod = loadModule(native);

      await expect(mod.pushCardsToWear([makeCard()])).resolves.toBe(false);
      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS card snapshot publish failed',
        expect.objectContaining({ tags: expect.objectContaining({ surface: 'wear-sync' }) })
      );
    });

    test('returns false without throwing when the transport is absent', async () => {
      const mod = loadModule(null);
      await expect(mod.pushCardsToWear([makeCard()])).resolves.toBe(false);
    });

    // Unlike WCSession, a DataItem is stored locally and synced when a node appears, so gating
    // the publish on connectivity would only lose updates.
    test('publishes even with no wearable connected', async () => {
      const native = makeNative({ getConnectedNodeCount: jest.fn().mockResolvedValue(0) });
      const mod = loadModule(native);

      await expect(mod.pushCardsToWear([makeCard()])).resolves.toBe(true);
      expect(native.publishSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  // AC14 — the over-budget path is defined and tested, not discovered in the field.
  describe('snapshot size limits', () => {
    /** A card whose barcode alone is `padBytes` long, to drive the envelope over budget. */
    function bulkyCard(index: number, padBytes: number, overrides: Record<string, unknown> = {}) {
      return makeCard({
        id: `card-${String(index).padStart(4, '0')}`,
        name: `Card ${String(index).padStart(4, '0')}`,
        barcode: '9'.repeat(padBytes),
        ...overrides
      });
    }

    test('a realistic library fits with the whole list intact', () => {
      const mod = loadModule(makeNative());
      const cards = Array.from({ length: 60 }, (_, i) => bulkyCard(i, 20));

      const selection = mod.selectWearSnapshotCards(cards);
      expect(selection.droppedCount).toBe(0);
      expect(selection.payload).toHaveLength(60);
    });

    test('an oversized library is truncated rather than silently mangled', async () => {
      const native = makeNative();
      const mod = loadModule(native);
      const cards = Array.from({ length: 400 }, (_, i) => bulkyCard(i, 400));

      const selection = mod.selectWearSnapshotCards(cards);
      expect(selection.droppedCount).toBeGreaterThan(0);
      expect(selection.payload.length).toBe(cards.length - selection.droppedCount);

      // Assert against the bytes that ACTUALLY reach the transport, not against a
      // hand-rebuilt envelope. The two differ: the published envelope is sanitised, so
      // `brandId: null` and `lastUsedAt: null` are dropped. Measuring a reconstruction would
      // test a payload the app never sends — and would fail on a shape that is really fine.
      // (`TextEncoder` is undefined in this environment, which is why `utf8ByteLength` has a
      // fallback branch and why `.length` on the JSON string is used here instead.)
      await mod.pushCardsToWear(cards);
      const publishedJson = native.publishSnapshot.mock.calls[0]![1] as string;
      const { utf8ByteLength } = require('./watch-connectivity');
      expect(utf8ByteLength(publishedJson)).toBeLessThanOrEqual(mod.WEAR_SNAPSHOT_MAX_BYTES);
      expect(JSON.parse(publishedJson).payload).toHaveLength(selection.payload.length);
    });

    test('favourites and frequently-used cards survive truncation', () => {
      const mod = loadModule(makeNative());
      const cards = [
        ...Array.from({ length: 400 }, (_, i) => bulkyCard(i, 400)),
        bulkyCard(9998, 400, { id: 'zz-favourite', name: 'Zzz Favourite', isFavorite: true }),
        bulkyCard(9999, 400, { id: 'zz-frequent', name: 'Zzz Frequent', usageCount: 500 })
      ];

      const kept = new Set(mod.selectWearSnapshotCards(cards).payload.map((c) => c.id));
      // Both sort last alphabetically, so a naive tail-truncation would drop exactly these two.
      expect(kept.has('zz-favourite')).toBe(true);
      expect(kept.has('zz-frequent')).toBe(true);
    });

    test('the selection is deterministic across repeated calls', () => {
      const mod = loadModule(makeNative());
      const cards = Array.from({ length: 400 }, (_, i) => bulkyCard(i, 400));

      const first = mod.selectWearSnapshotCards(cards).payload.map((c) => c.id);
      const second = mod.selectWearSnapshotCards([...cards].reverse()).payload.map((c) => c.id);
      expect(new Set(second)).toEqual(new Set(first));
    });

    // The boundary itself: the fast path admits the whole list on `<=` and the loop breaks on
    // `>`, so a single-card payload landing EXACTLY on the budget must be kept, and one byte over
    // must drop. An off-by-one in either comparison flips one of these.
    //
    // A padding of `9`s needs no JSON escaping, so the envelope grows exactly one byte per
    // barcode byte — the size is a closed form, no tuning loop (an earlier loop version measured
    // the self-limited payload, which can never exceed the budget, and span forever).
    test('a single-card snapshot exactly on the byte budget is kept', () => {
      const mod = loadModule(makeNative());
      const { utf8ByteLength } = require('./watch-connectivity');
      const oneCardEnvelope = (pad: number) =>
        JSON.stringify({
          version: 1,
          type: 'cards',
          payload: mod.selectWearSnapshotCards([bulkyCard(0, pad)]).payload
        });

      const baselinePad = 1000;
      const baseline = utf8ByteLength(oneCardEnvelope(baselinePad));
      // 1 barcode byte == 1 envelope byte, so solve for the exact-budget padding directly.
      const exactPad = baselinePad + (mod.WEAR_SNAPSHOT_MAX_BYTES - baseline);

      expect(utf8ByteLength(oneCardEnvelope(exactPad))).toBe(mod.WEAR_SNAPSHOT_MAX_BYTES);
      expect(mod.selectWearSnapshotCards([bulkyCard(0, exactPad)]).droppedCount).toBe(0);
    });

    test('a single-card snapshot one byte over the budget is dropped', () => {
      const mod = loadModule(makeNative());
      const { utf8ByteLength } = require('./watch-connectivity');
      const oneCardEnvelope = (pad: number) =>
        JSON.stringify({
          version: 1,
          type: 'cards',
          payload: [bulkyCard(0, pad)].map((c) => ({
            id: c.id,
            name: c.name,
            colorHex: c.color,
            barcodeValue: c.barcode,
            barcodeFormat: c.barcodeFormat,
            usageCount: c.usageCount,
            createdAt: c.createdAt,
            isFavorite: c.isFavorite
          }))
        });

      const baselinePad = 1000;
      const baseline = utf8ByteLength(oneCardEnvelope(baselinePad));
      // One byte past the budget: the whole list is a single card, so admitting nothing is the
      // only outcome that respects the cap. droppedCount counts it.
      const overPad = baselinePad + (mod.WEAR_SNAPSHOT_MAX_BYTES - baseline) + 1;

      expect(utf8ByteLength(oneCardEnvelope(overPad))).toBe(mod.WEAR_SNAPSHOT_MAX_BYTES + 1);
      expect(mod.selectWearSnapshotCards([bulkyCard(0, overPad)]).droppedCount).toBe(1);
    });

    // The comparator's FINAL tiebreak is `id`. Every other truncation test differentiates cards
    // by name, so this fallback — the thing that makes the selection a *total* order and so keeps
    // the DataItem's bytes stable between pushes — was otherwise never reached.
    test('cards identical in every rank but id break deterministically by id', () => {
      const mod = loadModule(makeNative());
      const identical = { name: 'Same', isFavorite: false, usageCount: 3, lastUsedAt: null };
      const cards = [
        ...Array.from({ length: 400 }, (_, i) => bulkyCard(i, 400)),
        bulkyCard(0, 400, { id: 'id-bbb', ...identical }),
        bulkyCard(0, 400, { id: 'id-aaa', ...identical })
      ];

      const keptA = new Set(mod.selectWearSnapshotCards(cards).payload.map((c) => c.id));
      const keptB = new Set(
        mod.selectWearSnapshotCards([...cards].reverse()).payload.map((c) => c.id)
      );
      // Whatever the budget admits, the two ties resolve the same way regardless of input order.
      expect(keptA.has('id-aaa')).toBe(keptB.has('id-aaa'));
      expect(keptA.has('id-bbb')).toBe(keptB.has('id-bbb'));
      // And the lexicographically-smaller id is never dropped while the larger is kept.
      expect(keptA.has('id-bbb') && !keptA.has('id-aaa')).toBe(false);
    });

    test('truncation is reported through logger.notify, never silently', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await mod.pushCardsToWear(Array.from({ length: 400 }, (_, i) => bulkyCard(i, 400)));

      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS card snapshot exceeded the Data Layer budget',
        expect.objectContaining({
          tags: expect.objectContaining({ outcome: 'snapshot-truncated' })
        })
      );
      // Still publishes what fits: a stale watch is worse than a partial one, and refusing
      // outright would strand deletions forever.
      expect(native.publishSnapshot).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendMessageToWear', () => {
    test('sends the sanitised message to the message path', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      await expect(mod.sendMessageToWear({ type: 'requestCards' })).resolves.toBe(true);
      expect(native.sendMessage).toHaveBeenCalledWith(
        '/myloyaltycards/msg',
        JSON.stringify({ type: 'requestCards' })
      );
    });

    test('resolves false when no node accepted the message', async () => {
      const native = makeNative({ sendMessage: jest.fn().mockResolvedValue(0) });
      await expect(loadModule(native).sendMessageToWear({ type: 'requestCards' })).resolves.toBe(
        false
      );
    });

    test('notifies and resolves false when the send rejects', async () => {
      const native = makeNative({ sendMessage: jest.fn().mockRejectedValue(new Error('nope')) });
      await expect(loadModule(native).sendMessageToWear({ type: 'requestCards' })).resolves.toBe(
        false
      );
      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS message send failed',
        expect.anything()
      );
    });
  });

  describe('subscribeToWearInbound', () => {
    const usageEnvelope = (id: string, usedAt: string) =>
      JSON.stringify({ version: 1, type: 'CARD_USED', payload: { id, usedAt } });

    function makeHandlers() {
      return { onMessage: jest.fn(), onUsageEvents: jest.fn() };
    }

    /** Let the subscribe-time drain (and any nudge-triggered drain) settle. */
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    // The inbound mirror of AC4's start-up read: the listener service persists messages that
    // arrived while JS was dead, and nothing will re-announce them.
    test('reads the durable inbox immediately on subscription', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: '1',
              path: '/myloyaltycards/msg',
              data: usageEnvelope('c1', '2026-01-01T00:00:00.000Z')
            }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(handlers.onUsageEvents).toHaveBeenCalledWith([
        { version: 1, type: 'CARD_USED', payload: { id: 'c1', usedAt: '2026-01-01T00:00:00.000Z' } }
      ]);
      expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(['1']);
    });

    test('routes requestCards to onMessage and CARD_USED to onUsageEvents', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: '1',
              path: '/myloyaltycards/msg',
              data: JSON.stringify({ type: 'requestCards' })
            },
            {
              id: '2',
              path: '/myloyaltycards/msg',
              data: usageEnvelope('c1', '2026-01-01T00:00:00.000Z')
            }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(handlers.onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
      expect(handlers.onUsageEvents).toHaveBeenCalledTimes(1);
      expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['1', '2'])
      );
    });

    test('drains again when the native nudge fires', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([
            { id: '7', path: '/myloyaltycards/msg', data: JSON.stringify({ type: 'requestCards' }) }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();
      expect(handlers.onMessage).not.toHaveBeenCalled();

      native.emitInbound();
      await flush();
      expect(handlers.onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
    });

    test('stops reading after unsubscribe', async () => {
      const native = makeNative();
      const mod = loadModule(native);

      const off = mod.subscribeToWearInbound(makeHandlers());
      await flush();
      const readsBefore = native.readInboundMessages.mock.calls.length;

      off();
      native.emitInbound();
      await flush();

      expect(native.readInboundMessages).toHaveBeenCalledTimes(readsBefore);
    });

    test('returns an inert unsubscribe when the transport is absent', () => {
      const mod = loadModule(null);
      expect(() => mod.subscribeToWearInbound(makeHandlers())()).not.toThrow();
    });

    // ---- AC11: malformed and unknown payloads are ignored gracefully ----

    describe.each([
      ['unparseable JSON', 'not json at all'],
      ['a JSON array', '[1,2,3]'],
      ['a bare string', '"hello"'],
      ['an object with no type', JSON.stringify({ payload: { id: 'c1' } })],
      ['a non-string type', JSON.stringify({ type: 42 })],
      ['an unknown type', JSON.stringify({ type: 'CARD_DELETED', payload: { id: 'c1' } })]
    ])('rejects %s', (_label, data) => {
      test('without invoking a handler, and drops it from the inbox', async () => {
        const native = makeNative({
          readInboundMessages: jest
            .fn()
            .mockResolvedValueOnce([{ id: 'bad', path: '/myloyaltycards/msg', data }])
            .mockResolvedValue([])
        });
        const mod = loadModule(native);
        const handlers = makeHandlers();

        mod.subscribeToWearInbound(handlers);
        await flush();

        expect(handlers.onMessage).not.toHaveBeenCalled();
        expect(handlers.onUsageEvents).not.toHaveBeenCalled();
        // Acknowledged, so a message that can never succeed cannot wedge the queue.
        expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(['bad']);
      });
    });

    // AC8 — the phone does not merely trust that the watch behaves. `syncCard` carries
    // `cardData`, so accepting it would be a watch → phone card-data write path.
    test('refuses a syncCard message even though it is a valid WatchMessage type', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([
            {
              id: 'evil',
              path: '/myloyaltycards/msg',
              data: JSON.stringify({
                type: 'syncCard',
                payload: { id: 'c1', cardData: { name: 'Injected' } }
              })
            }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(handlers.onMessage).not.toHaveBeenCalled();
      expect(handlers.onUsageEvents).not.toHaveBeenCalled();
      expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(['evil']);
    });

    test('one malformed entry does not block a valid one in the same batch', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([
            { id: 'bad', path: '/myloyaltycards/msg', data: '{{{' },
            {
              id: 'good',
              path: '/myloyaltycards/msg',
              data: JSON.stringify({ type: 'requestCards' })
            }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(handlers.onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
      expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(
        expect.arrayContaining(['bad', 'good'])
      );
    });

    // ---- Retry semantics: the difference between "can never work" and "did not work now" ----

    test('leaves usage events unacknowledged when the handler throws, so they are retried', async () => {
      const entry = {
        id: '1',
        path: '/myloyaltycards/msg',
        data: usageEnvelope('c1', '2026-01-01T00:00:00.000Z')
      };
      const native = makeNative({
        readInboundMessages: jest.fn().mockResolvedValueOnce([entry]).mockResolvedValueOnce([entry])
      });
      const mod = loadModule(native);
      const handlers = {
        onMessage: jest.fn(),
        onUsageEvents: jest
          .fn()
          .mockRejectedValueOnce(new Error('db locked'))
          .mockResolvedValue(undefined)
      };

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(native.acknowledgeInboundMessages).not.toHaveBeenCalled();
      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS usage events could not be applied',
        expect.anything()
      );

      // The next nudge retries the same entry, and this time it sticks.
      native.emitInbound();
      await flush();
      expect(native.acknowledgeInboundMessages).toHaveBeenCalledWith(['1']);
    });

    test('leaves a control message unacknowledged when its handler throws', async () => {
      const native = makeNative({
        readInboundMessages: jest
          .fn()
          .mockResolvedValueOnce([
            { id: '1', path: '/myloyaltycards/msg', data: JSON.stringify({ type: 'requestCards' }) }
          ])
          .mockResolvedValue([])
      });
      const mod = loadModule(native);
      const handlers = {
        onMessage: jest.fn().mockRejectedValue(new Error('no db')),
        onUsageEvents: jest.fn()
      };

      mod.subscribeToWearInbound(handlers);
      await flush();

      expect(native.acknowledgeInboundMessages).not.toHaveBeenCalled();
      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS control message could not be handled',
        expect.anything()
      );
    });

    // The two failure branches share a message but carry DIFFERENT `outcome` tags, which is the
    // only thing that tells them apart in Sentry. Asserted on the tag, not on `expect.anything()`,
    // so swapping or dropping a tag is a test failure rather than an invisible loss of signal.
    test('a rejected native read is notified as a drain error', async () => {
      const native = makeNative({
        readInboundMessages: jest.fn().mockRejectedValue(new Error('binder died'))
      });
      const mod = loadModule(native);

      mod.subscribeToWearInbound(makeHandlers());
      await flush();

      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS inbound message drain failed',
        expect.objectContaining({
          tags: expect.objectContaining({ surface: 'wear-sync', outcome: 'drain-error' })
        })
      );
    });

    /**
     * A failed acknowledge leaves the messages in the native inbox, so they are re-read and
     * re-applied later. That is safe — `applyWatchUsageEvents` dedups on `"<cardId>:<usedAt>"` —
     * but it must be reported, and reported distinguishably from a read failure.
     */
    test('a rejected acknowledge is notified separately, and the batch stays applied', async () => {
      const entry = {
        id: '1',
        path: '/myloyaltycards/msg',
        data: JSON.stringify({ type: 'requestCards' })
      };
      const native = makeNative({
        readInboundMessages: jest.fn().mockResolvedValueOnce([entry]).mockResolvedValue([]),
        acknowledgeInboundMessages: jest.fn().mockRejectedValue(new Error('prefs locked'))
      });
      const mod = loadModule(native);
      const handlers = makeHandlers();

      mod.subscribeToWearInbound(handlers);
      await flush();

      // The handler ran — the failure is in the bookkeeping, not the application.
      expect(handlers.onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
      expect(mockLogger.notify).toHaveBeenCalledWith(
        'Wear OS inbound message drain failed',
        expect.objectContaining({
          tags: expect.objectContaining({ outcome: 'acknowledge-error' })
        })
      );
    });

    /**
     * A nudge that arrives while a read is in flight sets `drainAgain`. If that read then
     * REJECTS, the loop must not carry the flag into an immediate retry — an instantly-failing
     * read plus a pending nudge would spin. Nothing is lost by deferring: a failed read
     * acknowledges nothing, so the batch is still in the native inbox for the next nudge.
     */
    test('a nudge arriving during a failing read defers rather than spinning', async () => {
      let readCount = 0;
      const native = makeNative();
      native.readInboundMessages.mockImplementation(() => {
        readCount += 1;
        // Fire a nudge from inside the read, so `drainAgain` is set before it rejects.
        if (readCount === 1) native.emitInbound();
        return Promise.reject(new Error('binder died'));
      });

      const mod = loadModule(native);
      mod.subscribeToWearInbound(makeHandlers());
      await flush();
      await flush();

      // Exactly one read per drain invocation — not an unbounded retry loop.
      expect(readCount).toBeLessThanOrEqual(2);
      expect(native.acknowledgeInboundMessages).not.toHaveBeenCalled();

      // And the inbox is still drainable once the transport recovers.
      native.readInboundMessages.mockResolvedValue([
        { id: '1', path: '/myloyaltycards/msg', data: JSON.stringify({ type: 'requestCards' }) }
      ]);
      const handlers = makeHandlers();
      mod.subscribeToWearInbound(handlers);
      await flush();
      expect(handlers.onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
    });
  });
});
