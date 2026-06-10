/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@bwip-js/react-native');

const sampleCard = {
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
  updatedAt: '2026-01-01T00:00:00.000Z'
} as any;

const expectedCardPayload = {
  id: 'c1',
  name: 'Card',
  colorHex: 'blue',
  barcodeValue: '123',
  barcodeFormat: 'CODE128',
  usageCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  isFavorite: false
};

/** Build an EventEmitter-like mock for `watchEvents`. */
function makeEvents() {
  const handlers: Record<string, Array<(payload: any) => void>> = {};
  return {
    addListener: jest.fn((event: string, cb: (payload: any) => void) => {
      handlers[event] = handlers[event] || [];
      handlers[event]!.push(cb);
      return () => {
        handlers[event] = (handlers[event] || []).filter((h) => h !== cb);
      };
    }),
    /** Test helper: synthesize an event from the native side. */
    emit(event: string, payload: any) {
      for (const h of handlers[event] || []) h(payload);
    }
  };
}

describe('watch-connectivity wrapper', () => {
  let consoleWarnSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    const bwip = require('@bwip-js/react-native');
    bwip.__mockReset?.();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('isWatchConnectivityAvailable', () => {
    test('returns false when the native module require throws', () => {
      jest.isolateModules(() => {
        // Don't mock anything — `require('react-native-watch-connectivity')`
        // resolves the real module here (jest-expo provides a polyfill); we
        // just assert the wrapper handles partial APIs gracefully.
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        const mod = require('./watch-connectivity');
        expect(mod.isWatchConnectivityAvailable()).toBe(false);
      });
    });

    test('returns true when sendMessage exists', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ sendMessage: jest.fn() }), {
          virtual: true
        });
        const mod = require('./watch-connectivity');
        expect(mod.isWatchConnectivityAvailable()).toBe(true);
      });
    });

    test('returns true when updateApplicationContext exists', () => {
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext: jest.fn() }),
          { virtual: true }
        );
        const mod = require('./watch-connectivity');
        expect(mod.isWatchConnectivityAvailable()).toBe(true);
      });
    });
  });

  describe('sendMessageToWatch', () => {
    test('returns false when native module missing', async () => {
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        mod = require('./watch-connectivity');
      });
      await expect(mod.sendMessageToWatch({ hi: 'watch' })).resolves.toBe(false);
    });

    test('invokes native.sendMessage synchronously with an error callback', async () => {
      const sendMessage = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ sendMessage }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      await expect(mod.sendMessageToWatch({ hello: 'watch' })).resolves.toBe(true);
      expect(sendMessage).toHaveBeenCalledTimes(1);
      // signature: (message, replyCb, errCb)
      expect(sendMessage.mock.calls[0]![0]).toEqual({ hello: 'watch' });
      expect(typeof sendMessage.mock.calls[0]![2]).toBe('function');
    });

    test('falls back to updateApplicationContext when sendMessage missing', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ updateApplicationContext }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      await expect(mod.sendMessageToWatch({ foo: 'bar' })).resolves.toBe(true);
      expect(updateApplicationContext).toHaveBeenCalledWith({ foo: 'bar' });
    });

    test('catches synchronous throws from native.sendMessage and warns', async () => {
      const sendMessage = jest.fn(() => {
        throw new Error('boom');
      });
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ sendMessage }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      await expect(mod.sendMessageToWatch({ x: 1 })).resolves.toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('removes null fields from nested payloads before sending', async () => {
      const sendMessage = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ sendMessage }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      await expect(
        mod.sendMessageToWatch({
          type: 'syncCard',
          payload: {
            id: 'id-xyz',
            cardData: {
              brandId: null,
              lastUsedAt: null,
              usageCount: 3,
              nested: { ok: 'yes', nope: null }
            }
          }
        })
      ).resolves.toBe(true);

      expect(sendMessage).toHaveBeenCalledWith(
        {
          type: 'syncCard',
          payload: {
            id: 'id-xyz',
            cardData: {
              usageCount: 3,
              nested: { ok: 'yes' }
            }
          }
        },
        undefined,
        expect.any(Function)
      );
    });

    test('returns false when native module exposes neither API', async () => {
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ irrelevant: 1 }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });
      await expect(mod.sendMessageToWatch({})).resolves.toBe(false);
    });
  });

  describe('subscribeToWatchMessages', () => {
    test('no-ops cleanly when native module missing', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        const mod = require('./watch-connectivity');
        const unsubscribe = mod.subscribeToWatchMessages(() => {});
        expect(typeof unsubscribe).toBe('function');
        expect(() => unsubscribe()).not.toThrow();
      });
    });

    test('subscribes to message and application-context channels via watchEvents', () => {
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ watchEvents: events, sendMessage: jest.fn() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      const unsub = mod.subscribeToWatchMessages(handler);
      expect(events.addListener).toHaveBeenCalledWith('message', handler);
      expect(events.addListener).toHaveBeenCalledWith('application-context', handler);

      events.emit('message', { type: 'requestCards' });
      expect(handler).toHaveBeenCalledWith({ type: 'requestCards' });

      unsub();
      handler.mockClear();
      events.emit('message', { type: 'something-else' });
      expect(handler).not.toHaveBeenCalled();
    });

    test('falls back to legacy addListener API on flat mocks', () => {
      const remove = jest.fn();
      const addListener = jest.fn().mockReturnValue({ remove });
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ addListener }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      const unsub = mod.subscribeToWatchMessages(handler);
      expect(addListener).toHaveBeenCalledWith('message', handler);
      unsub();
      expect(remove).toHaveBeenCalled();
    });

    test('falls back to onMessage / removeMessageListener', () => {
      const onMessage = jest.fn();
      const removeMessageListener = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ onMessage, removeMessageListener }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      const unsub = mod.subscribeToWatchMessages(handler);
      expect(onMessage).toHaveBeenCalledWith(handler);
      unsub();
      expect(removeMessageListener).toHaveBeenCalledWith(handler);
    });
  });

  describe('pushCardsToWatch', () => {
    test('returns false when native module missing', async () => {
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        mod = require('./watch-connectivity');
      });
      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(false);
    });

    test('calls updateApplicationContext synchronously with the snapshot envelope', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(true);
      expect(updateApplicationContext).toHaveBeenCalledTimes(1);
      expect(updateApplicationContext).toHaveBeenCalledWith({
        type: 'cards',
        payload: [expectedCardPayload]
      });
    });

    test('falls back to transferUserInfo if updateApplicationContext is missing', async () => {
      const transferUserInfo = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ transferUserInfo, watchEvents: makeEvents(), sendMessage: jest.fn() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(true);
      expect(transferUserInfo).toHaveBeenCalledWith({
        type: 'cards',
        payload: [expectedCardPayload]
      });
    });

    test('skips push when getIsPaired resolves false', async () => {
      const updateApplicationContext = jest.fn();
      const getIsPaired = jest.fn().mockResolvedValue(false);
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({
            updateApplicationContext,
            getIsPaired,
            watchEvents: makeEvents()
          }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(false);
      expect(updateApplicationContext).not.toHaveBeenCalled();
    });

    test('does not pre-render QR images when the watch cannot receive a snapshot', async () => {
      const updateApplicationContext = jest.fn();
      const getIsPaired = jest.fn().mockResolvedValue(false);
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({
            updateApplicationContext,
            getIsPaired,
            watchEvents: makeEvents()
          }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const qrCard = {
        ...sampleCard,
        barcode: '77390007776067105',
        barcodeFormat: 'QR'
      };

      await expect(mod.pushCardsToWatch([qrCard])).resolves.toBe(false);

      const bwip = require('@bwip-js/react-native');
      expect(bwip.toDataURL).not.toHaveBeenCalled();
      expect(updateApplicationContext).not.toHaveBeenCalled();
    });

    test('skips push when getIsWatchAppInstalled resolves false', async () => {
      const updateApplicationContext = jest.fn();
      const getIsPaired = jest.fn().mockResolvedValue(true);
      const getIsWatchAppInstalled = jest.fn().mockResolvedValue(false);
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({
            updateApplicationContext,
            getIsPaired,
            getIsWatchAppInstalled,
            watchEvents: makeEvents()
          }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(false);
      expect(updateApplicationContext).not.toHaveBeenCalled();
    });

    test('catches synchronous throws and warns', async () => {
      const updateApplicationContext = jest.fn(() => {
        throw new Error('boom');
      });
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await expect(mod.pushCardsToWatch([sampleCard])).resolves.toBe(false);
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    test('maps usageCount to a safe default and omits null optionals', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const cardMissingOptionals = { ...sampleCard, usageCount: undefined, lastUsedAt: undefined };
      await mod.pushCardsToWatch([cardMissingOptionals]);
      const payload = updateApplicationContext.mock.calls[0]![0].payload[0];
      expect(payload.usageCount).toBe(0);
      expect(payload).not.toHaveProperty('brandId');
      expect(payload).not.toHaveProperty('lastUsedAt');
    });

    test('forwards the card isFavorite flag into the watch payload', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const favouriteCard = { ...sampleCard, isFavorite: true };
      await mod.pushCardsToWatch([favouriteCard]);
      const payload = updateApplicationContext.mock.calls[0]![0].payload[0];
      expect(payload.isFavorite).toBe(true);
    });

    test('pre-renders QR cards to base64 for the watch payload', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const qrCard = {
        ...sampleCard,
        barcode: '77390007776067105',
        barcodeFormat: 'QR'
      };

      await expect(mod.pushCardsToWatch([qrCard])).resolves.toBe(true);

      const bwip = require('@bwip-js/react-native');
      expect(bwip.toDataURL).toHaveBeenCalledWith(
        expect.objectContaining({
          bcid: 'qrcode',
          text: '77390007776067105',
          includetext: false
        })
      );

      const payload = updateApplicationContext.mock.calls[0]![0].payload[0];
      expect(payload.barcodeImageBase64).toBe('mockImageData');
    });

    test('drops later QR images when embedding them would exceed the snapshot payload budget', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const bwip = require('@bwip-js/react-native');
      bwip.__mockToDataURL.mockResolvedValue({
        uri: `data:image/png;base64,${'x'.repeat(30_000)}`,
        width: 144,
        height: 144
      });

      const qrCards = [
        { ...sampleCard, id: 'qr-1', barcode: '111111', barcodeFormat: 'QR' },
        { ...sampleCard, id: 'qr-2', barcode: '222222', barcodeFormat: 'QR' }
      ];

      await expect(mod.pushCardsToWatch(qrCards)).resolves.toBe(true);

      const payload = updateApplicationContext.mock.calls[0]![0].payload;
      expect(payload[0].barcodeImageBase64).toHaveLength(30_000);
      expect(payload[1]).not.toHaveProperty('barcodeImageBase64');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('dropped QR image from watch snapshot')
      );
    });

    test('skips sending the snapshot when the base payload already exceeds the budget', async () => {
      const updateApplicationContext = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: makeEvents() }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      const oversizedCard = {
        ...sampleCard,
        name: 'N'.repeat(50_000)
      };

      await expect(mod.pushCardsToWatch([oversizedCard])).resolves.toBe(false);

      expect(updateApplicationContext).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('skipped watch snapshot because payload exceeds budget')
      );
    });
  });

  describe('snapshot retry on state transitions', () => {
    test('re-pushes the latest snapshot when reachability flips to true', async () => {
      const updateApplicationContext = jest.fn();
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: events }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      // First push — happens "before activation" so we'll pretend it works
      // but assert the diagnostics listener is wired by emitting reachability.
      await mod.pushCardsToWatch([sampleCard]);
      expect(updateApplicationContext).toHaveBeenCalledTimes(1);

      // The watch becomes reachable later — the wrapper should re-flush.
      events.emit('reachability', true);
      // flushSnapshot is async (it awaits getIsPaired/getIsWatchAppInstalled).
      // No paired/installed APIs are mocked here, so it short-circuits to a
      // synchronous push.
      await new Promise((r) => setImmediate(r));
      expect(updateApplicationContext).toHaveBeenCalledTimes(2);
    });

    test('does not re-push when reachability flips to false', async () => {
      const updateApplicationContext = jest.fn();
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: events }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      await mod.pushCardsToWatch([sampleCard]);
      expect(updateApplicationContext).toHaveBeenCalledTimes(1);

      events.emit('reachability', false);
      await new Promise((r) => setImmediate(r));
      expect(updateApplicationContext).toHaveBeenCalledTimes(1);
    });

    test('logs a warning when application-context-error fires', async () => {
      const updateApplicationContext = jest.fn();
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ updateApplicationContext, watchEvents: events }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      // Trigger ensureDiagnostics() registration.
      await mod.pushCardsToWatch([sampleCard]);

      events.emit('application-context-error', { error: 'payload too large' });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('application-context-error'),
        expect.anything()
      );
    });
  });

  describe('helper exports', () => {
    test('requestCardsFromPhone and syncCardToWatch delegate to sendMessageToWatch', async () => {
      const sendMessage = jest.fn();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ sendMessage }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      await mod.requestCardsFromPhone();
      expect(sendMessage.mock.calls[0]![0]).toEqual({ type: 'requestCards' });

      await mod.syncCardToWatch('id-xyz', { foo: 'bar' });
      expect(sendMessage.mock.calls[1]![0]).toEqual({
        type: 'syncCard',
        payload: { id: 'id-xyz', cardData: { foo: 'bar' } }
      });
    });

    test('default export contains expected functions', () => {
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        const mod = require('./watch-connectivity').default;
        expect(typeof mod.isWatchConnectivityAvailable).toBe('function');
        expect(typeof mod.sendMessageToWatch).toBe('function');
        expect(typeof mod.subscribeToWatchMessages).toBe('function');
        expect(typeof mod.requestCardsFromPhone).toBe('function');
        expect(typeof mod.syncCardToWatch).toBe('function');
        expect(typeof mod.pushCardsToWatch).toBe('function');
      });
    });
  });

  // Story 9.6 (ADR-2026-06-09-001): inbound CARD_USED usage events
  describe('parseWatchUsageEvent', () => {
    const loadModule = () => {
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
        mod = require('./watch-connectivity');
      });
      return mod;
    };

    const validEvent = {
      version: 1,
      type: 'CARD_USED',
      payload: { id: 'card-1', usedAt: '2026-06-09T12:34:56.789Z' }
    };

    test('accepts a conformant v1 CARD_USED event', () => {
      const mod = loadModule();
      expect(mod.parseWatchUsageEvent(validEvent)).toEqual({
        id: 'card-1',
        usedAt: '2026-06-09T12:34:56.789Z'
      });
    });

    test('rejects unknown message types', () => {
      const mod = loadModule();
      expect(mod.parseWatchUsageEvent({ ...validEvent, type: 'CARD_DELETED' })).toBeNull();
      expect(mod.parseWatchUsageEvent({ ...validEvent, type: 'requestCards' })).toBeNull();
    });

    test('rejects unknown versions (graceful forward-compat)', () => {
      const mod = loadModule();
      expect(mod.parseWatchUsageEvent({ ...validEvent, version: 2 })).toBeNull();
      expect(mod.parseWatchUsageEvent({ ...validEvent, version: undefined })).toBeNull();
    });

    test('rejects missing or empty card id', () => {
      const mod = loadModule();
      expect(
        mod.parseWatchUsageEvent({ ...validEvent, payload: { usedAt: validEvent.payload.usedAt } })
      ).toBeNull();
      expect(
        mod.parseWatchUsageEvent({
          ...validEvent,
          payload: { id: '', usedAt: validEvent.payload.usedAt }
        })
      ).toBeNull();
    });

    test('rejects second-precision usedAt (ADR requires milliseconds)', () => {
      const mod = loadModule();
      expect(
        mod.parseWatchUsageEvent({
          ...validEvent,
          payload: { id: 'card-1', usedAt: '2026-06-09T12:34:56Z' }
        })
      ).toBeNull();
    });

    test('rejects non-UTC offsets and non-date strings', () => {
      const mod = loadModule();
      expect(
        mod.parseWatchUsageEvent({
          ...validEvent,
          payload: { id: 'card-1', usedAt: '2026-06-09T12:34:56.789+02:00' }
        })
      ).toBeNull();
      expect(
        mod.parseWatchUsageEvent({
          ...validEvent,
          payload: { id: 'card-1', usedAt: 'not-a-date' }
        })
      ).toBeNull();
    });

    test('rejects calendar-impossible timestamps that pass the shape regex', () => {
      const mod = loadModule();
      expect(
        mod.parseWatchUsageEvent({
          ...validEvent,
          payload: { id: 'card-1', usedAt: '2026-13-45T99:99:99.999Z' }
        })
      ).toBeNull();
    });

    test('rejects non-object payloads', () => {
      const mod = loadModule();
      expect(mod.parseWatchUsageEvent(null)).toBeNull();
      expect(mod.parseWatchUsageEvent(undefined)).toBeNull();
      expect(mod.parseWatchUsageEvent('CARD_USED')).toBeNull();
      expect(mod.parseWatchUsageEvent(42)).toBeNull();
    });
  });

  describe('subscribeToWatchUserInfo', () => {
    test('returns a noop unsubscribe when the native module is missing', () => {
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => {
          throw new Error('native module unavailable');
        });
        mod = require('./watch-connectivity');
      });
      const handler = jest.fn();
      const off = mod.subscribeToWatchUserInfo(handler);
      expect(typeof off).toBe('function');
      expect(() => off()).not.toThrow();
      expect(handler).not.toHaveBeenCalled();
    });

    test('delivers user-info batches to the handler', () => {
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ watchEvents: events }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      mod.subscribeToWatchUserInfo(handler);

      const batch = [
        {
          version: 1,
          type: 'CARD_USED',
          payload: { id: 'c1', usedAt: '2026-06-09T10:00:00.000Z' }
        },
        { version: 1, type: 'CARD_USED', payload: { id: 'c2', usedAt: '2026-06-09T10:00:01.000Z' } }
      ];
      events.emit('user-info', batch);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(batch);
    });

    test('wraps a single (non-array) user-info payload into a batch', () => {
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ watchEvents: events }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      mod.subscribeToWatchUserInfo(handler);

      const single = {
        version: 1,
        type: 'CARD_USED',
        payload: { id: 'c1', usedAt: '2026-06-09T10:00:00.000Z' }
      };
      events.emit('user-info', single);

      expect(handler).toHaveBeenCalledWith([single]);
    });

    test('unsubscribe detaches the user-info listener', () => {
      const events = makeEvents();
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock('react-native-watch-connectivity', () => ({ watchEvents: events }), {
          virtual: true
        });
        mod = require('./watch-connectivity');
      });

      const handler = jest.fn();
      const off = mod.subscribeToWatchUserInfo(handler);
      off();

      events.emit('user-info', [
        { version: 1, type: 'CARD_USED', payload: { id: 'c1', usedAt: '2026-06-09T10:00:00.000Z' } }
      ]);
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
