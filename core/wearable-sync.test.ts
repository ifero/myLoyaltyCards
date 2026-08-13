/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * The dispatch seam (Story 10-6, AC2).
 *
 * Every test loads the module through {@link loadSeam}, which re-requires it with `Platform.OS`
 * forced. `Platform.OS` is a plain property on the object the `react-native` Jest preset
 * exports, but overwriting it in place leaks across suites; re-mocking the module inside
 * `jest.isolateModules` keeps each case hermetic.
 */

import type { WatchMessage } from './watch-connectivity';
import type { WearInboundHandlers } from './wear-connectivity';

// The subscribe mocks declare their argument tuple through `jest.fn`'s generics rather than
// leaving it to inference. `jest.fn(() => …)` infers an EMPTY tuple, so `mock.calls[0]![0]` is a
// type error under `noUncheckedIndexedAccess` — and capturing the listener the seam registered is
// exactly what the tests below do.
type Unsubscribe = () => void;

const watchTransport = {
  isWatchConnectivityAvailable: jest.fn(() => true),
  pushCardsToWatch: jest.fn().mockResolvedValue(true),
  subscribeToWatchMessages: jest.fn<Unsubscribe, [(message: WatchMessage) => void]>(() =>
    jest.fn()
  ),
  subscribeToWatchUserInfo: jest.fn<Unsubscribe, [(events: unknown[]) => void]>(() => jest.fn())
};

const wearTransport = {
  isWearConnectivityAvailable: jest.fn(() => true),
  pushCardsToWear: jest.fn().mockResolvedValue(true),
  subscribeToWearInbound: jest.fn<Unsubscribe, [WearInboundHandlers]>(() => jest.fn())
};

function loadSeam(os: 'ios' | 'android') {
  let mod!: typeof import('./wearable-sync');
  jest.isolateModules(() => {
    // Only `Platform` is provided. Spreading the real `react-native` export would force-evaluate
    // its lazy getters (FlatList, DevMenu, …) and blow up on missing TurboModules; the seam
    // imports nothing else from it, and both transports below are mocked.
    jest.doMock('react-native', () => ({ Platform: { OS: os } }));
    jest.doMock('./watch-connectivity', () => watchTransport);
    jest.doMock('./wear-connectivity', () => wearTransport);
    mod = require('./wearable-sync');
  });
  return mod;
}

const card = { id: 'c1', name: 'Card' } as any;

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

describe('wearable-sync dispatch seam', () => {
  describe('isWearableSyncAvailable', () => {
    test('asks the Data Layer transport on Android', () => {
      expect(loadSeam('android').isWearableSyncAvailable()).toBe(true);
      expect(wearTransport.isWearConnectivityAvailable).toHaveBeenCalledTimes(1);
      expect(watchTransport.isWatchConnectivityAvailable).not.toHaveBeenCalled();
    });

    test('asks the WatchConnectivity transport on iOS', () => {
      expect(loadSeam('ios').isWearableSyncAvailable()).toBe(true);
      expect(watchTransport.isWatchConnectivityAvailable).toHaveBeenCalledTimes(1);
      expect(wearTransport.isWearConnectivityAvailable).not.toHaveBeenCalled();
    });
  });

  describe('pushCardsToWearable', () => {
    test('routes to the Data Layer on Android', async () => {
      await expect(loadSeam('android').pushCardsToWearable([card])).resolves.toBe(true);
      expect(wearTransport.pushCardsToWear).toHaveBeenCalledWith([card]);
      expect(watchTransport.pushCardsToWatch).not.toHaveBeenCalled();
    });

    // AC2/AC18: the Apple Watch is shipped software. The seam must be a pass-through, not a
    // rewrite — the payload reaching `pushCardsToWatch` is the caller's array, untouched.
    test('routes to WatchConnectivity on iOS with the argument unchanged', async () => {
      await expect(loadSeam('ios').pushCardsToWearable([card])).resolves.toBe(true);
      expect(watchTransport.pushCardsToWatch).toHaveBeenCalledWith([card]);
      expect(wearTransport.pushCardsToWear).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToWearableInbound', () => {
    const handlers = { onMessage: jest.fn(), onUsageEvents: jest.fn() };

    test('uses the single durable-inbox subscription on Android', () => {
      loadSeam('android').subscribeToWearableInbound(handlers);
      expect(wearTransport.subscribeToWearInbound).toHaveBeenCalledWith(handlers);
      expect(watchTransport.subscribeToWatchMessages).not.toHaveBeenCalled();
      expect(watchTransport.subscribeToWatchUserInfo).not.toHaveBeenCalled();
    });

    test('fans the two WCSession channels into the same handlers on iOS', () => {
      loadSeam('ios').subscribeToWearableInbound(handlers);
      expect(watchTransport.subscribeToWatchMessages).toHaveBeenCalledTimes(1);
      expect(watchTransport.subscribeToWatchUserInfo).toHaveBeenCalledTimes(1);
      expect(wearTransport.subscribeToWearInbound).not.toHaveBeenCalled();
    });

    test('iOS control messages reach onMessage', () => {
      const onMessage = jest.fn();
      loadSeam('ios').subscribeToWearableInbound({ onMessage, onUsageEvents: jest.fn() });

      const listener = watchTransport.subscribeToWatchMessages.mock.calls[0]![0] as any;
      listener({ type: 'requestCards' });

      expect(onMessage).toHaveBeenCalledWith({ type: 'requestCards' });
    });

    test('iOS user-info batches reach onUsageEvents', () => {
      const onUsageEvents = jest.fn();
      loadSeam('ios').subscribeToWearableInbound({ onMessage: jest.fn(), onUsageEvents });

      const listener = watchTransport.subscribeToWatchUserInfo.mock.calls[0]![0] as any;
      const batch = [{ version: 1, type: 'CARD_USED', payload: { id: 'c1', usedAt: 'x' } }];
      listener(batch);

      expect(onUsageEvents).toHaveBeenCalledWith(batch);
    });

    // WCSession invokes its callbacks synchronously and discards the returned promise, so a
    // rejecting handler would otherwise surface as a global unhandled rejection.
    test('an async iOS onMessage rejection is contained, not thrown at the transport', async () => {
      const onMessage = jest.fn().mockRejectedValue(new Error('db locked'));
      loadSeam('ios').subscribeToWearableInbound({ onMessage, onUsageEvents: jest.fn() });

      const listener = watchTransport.subscribeToWatchMessages.mock.calls[0]![0] as any;
      expect(() => listener({ type: 'requestCards' })).not.toThrow();
      await new Promise((resolve) => setImmediate(resolve));
    });

    // The user-info channel is structurally identical and matters just as much — a `CARD_USED`
    // batch that rejects synchronously must not escape as an unhandled rejection either. Tested
    // symmetrically so the two catch arms cannot diverge unnoticed.
    test('an async iOS onUsageEvents rejection is contained, not thrown at the transport', async () => {
      const onUsageEvents = jest.fn().mockRejectedValue(new Error('db locked'));
      loadSeam('ios').subscribeToWearableInbound({ onMessage: jest.fn(), onUsageEvents });

      const listener = watchTransport.subscribeToWatchUserInfo.mock.calls[0]![0] as any;
      expect(() =>
        listener([{ version: 1, type: 'CARD_USED', payload: { id: 'c1', usedAt: 'x' } }])
      ).not.toThrow();
      await new Promise((resolve) => setImmediate(resolve));
    });

    /**
     * The pre-seam code in `app/_layout.tsx` wrapped its two `subscribeToWatch*` calls in
     * SEPARATE try/catch blocks. Collapsing them under one guard would mean a native binding that
     * throws while attaching the `message` listener silently costs the app every `CARD_USED`
     * event for the rest of the session — and would orphan the other listener, since the caller
     * would never receive an unsubscribe for it.
     */
    test('a failure attaching the iOS message channel does not prevent the user-info channel', () => {
      watchTransport.subscribeToWatchMessages.mockImplementationOnce(() => {
        throw new Error('native module missing');
      });
      const onUsageEvents = jest.fn();

      const off = loadSeam('ios').subscribeToWearableInbound({
        onMessage: jest.fn(),
        onUsageEvents
      });

      expect(watchTransport.subscribeToWatchUserInfo).toHaveBeenCalledTimes(1);
      const listener = watchTransport.subscribeToWatchUserInfo.mock.calls[0]![0];
      listener([{ version: 1, type: 'CARD_USED', payload: { id: 'c1', usedAt: 'x' } }]);
      expect(onUsageEvents).toHaveBeenCalledTimes(1);

      // The returned unsubscribe must still be safe to call.
      expect(() => off()).not.toThrow();
    });

    test('a failure attaching the iOS user-info channel still releases the message channel', () => {
      const offMessages = jest.fn();
      watchTransport.subscribeToWatchMessages.mockReturnValueOnce(offMessages);
      watchTransport.subscribeToWatchUserInfo.mockImplementationOnce(() => {
        throw new Error('native module missing');
      });

      loadSeam('ios').subscribeToWearableInbound(handlers)();

      // Without per-channel isolation this listener would leak: the seam would have thrown
      // before returning, so nothing could ever unsubscribe it.
      expect(offMessages).toHaveBeenCalledTimes(1);
    });

    test('unsubscribing on iOS releases both channels', () => {
      const offMessages = jest.fn();
      const offUserInfo = jest.fn();
      watchTransport.subscribeToWatchMessages.mockReturnValueOnce(offMessages);
      watchTransport.subscribeToWatchUserInfo.mockReturnValueOnce(offUserInfo);

      loadSeam('ios').subscribeToWearableInbound(handlers)();

      expect(offMessages).toHaveBeenCalledTimes(1);
      expect(offUserInfo).toHaveBeenCalledTimes(1);
    });

    test('unsubscribing on Android releases the inbox subscription', () => {
      const off = jest.fn();
      wearTransport.subscribeToWearInbound.mockReturnValueOnce(off);

      loadSeam('android').subscribeToWearableInbound(handlers)();

      expect(off).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * The handler bodies used to live inline in `app/_layout.tsx`, which the coverage gate
   * excludes — so a broken `'requestCards'` literal or a dropped `await` failed no test. They now
   * live here, injected with the repository functions, and these tests exercise the AC5/AC10
   * decisions directly.
   */
  describe('createWearableInboundHandlers', () => {
    const card = { id: 'c1', name: 'Card' } as any;
    const validEvent = { id: 'c1', usedAt: '2026-08-12T10:00:00.123Z' };

    function makeDeps() {
      return {
        getAllCards: jest.fn<Promise<any[]>, []>().mockResolvedValue([card]),
        parseWatchUsageEvent: jest.fn((raw: unknown) =>
          raw && (raw as any).type === 'CARD_USED' ? validEvent : null
        ),
        applyWatchUsageEvents: jest.fn<Promise<number>, [any[]]>().mockResolvedValue(1)
      };
    }

    // AC5, phone side: a `requestCards` ping is answered by republishing the full snapshot.
    test('onMessage republishes the snapshot for a requestCards ping', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();

      await seam.createWearableInboundHandlers(deps).onMessage({ type: 'requestCards' });

      expect(deps.getAllCards).toHaveBeenCalledTimes(1);
      // pushCardsToWearable → iOS → pushCardsToWatch, with the cards getAllCards returned.
      expect(watchTransport.pushCardsToWatch).toHaveBeenCalledWith([card]);
    });

    test('onMessage ignores any message type other than requestCards', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();

      await seam.createWearableInboundHandlers(deps).onMessage({ type: 'ack' } as any);

      expect(deps.getAllCards).not.toHaveBeenCalled();
      expect(watchTransport.pushCardsToWatch).not.toHaveBeenCalled();
    });

    // AC10: a CARD_USED batch is validated and routed to the EXISTING commutative handler.
    test('onUsageEvents validates then applies through applyWatchUsageEvents', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();

      await seam
        .createWearableInboundHandlers(deps)
        .onUsageEvents([{ type: 'CARD_USED', payload: validEvent }]);

      expect(deps.parseWatchUsageEvent).toHaveBeenCalledTimes(1);
      expect(deps.applyWatchUsageEvents).toHaveBeenCalledWith([validEvent]);
    });

    test('onUsageEvents drops events the validator rejects, and applies nothing if all fail', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();

      await seam
        .createWearableInboundHandlers(deps)
        .onUsageEvents([{ type: 'not-card-used' }, 'garbage', null]);

      expect(deps.applyWatchUsageEvents).not.toHaveBeenCalled();
    });

    test('onUsageEvents forwards only the events that validated', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();

      await seam
        .createWearableInboundHandlers(deps)
        .onUsageEvents([{ type: 'CARD_USED' }, { type: 'other' }]);

      expect(deps.applyWatchUsageEvents).toHaveBeenCalledWith([validEvent]);
    });

    // The retry contract (AC9/AC15 on Android): a handler must NOT swallow — a throw is what
    // leaves the message unacknowledged so the native inbox redelivers it.
    test('a failure in applyWatchUsageEvents propagates rather than being swallowed', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();
      deps.applyWatchUsageEvents.mockRejectedValue(new Error('db locked'));

      await expect(
        seam
          .createWearableInboundHandlers(deps)
          .onUsageEvents([{ type: 'CARD_USED', payload: validEvent }])
      ).rejects.toThrow('db locked');
    });

    test('a failure in the requestCards republish propagates', async () => {
      const seam = loadSeam('ios');
      const deps = makeDeps();
      deps.getAllCards.mockRejectedValue(new Error('no db'));

      await expect(
        seam.createWearableInboundHandlers(deps).onMessage({ type: 'requestCards' })
      ).rejects.toThrow('no db');
    });
  });
});
