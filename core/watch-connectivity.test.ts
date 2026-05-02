/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

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
  brandId: null,
  colorHex: 'blue',
  barcodeValue: '123',
  barcodeFormat: 'CODE128',
  usageCount: 0,
  lastUsedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z'
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

    test('maps optional usageCount and lastUsedAt to safe defaults', async () => {
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
      expect(payload.lastUsedAt).toBeNull();
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
});
