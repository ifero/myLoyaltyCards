/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */

describe('watch-connectivity wrapper (scaffold)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('isWatchConnectivityAvailable() returns false when native module missing', () => {
    // ensure require will throw
    jest.isolateModules(() => {
      // mock an empty native module to simulate 'missing' API surface
      jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
      const mod = require('./watch-connectivity');
      expect(mod.isWatchConnectivityAvailable()).toBe(false);
    });
  });

  test('sendMessageToWatch uses sendMessage when available', async () => {
    const mockSend = jest.fn().mockResolvedValue(true);

    // isolate module loading so the mocked native module is used by the tested module
    // then call the async API outside the isolation block
    let mod: any = null;
    jest.isolateModules(() => {
      // Provide both CommonJS and ES default shapes to be robust in tests
      jest.doMock(
        'react-native-watch-connectivity',
        () => ({ default: { sendMessage: mockSend }, sendMessage: mockSend }),
        { virtual: true }
      );
      mod = require('./watch-connectivity');
    });

    // call the wrapper; ensure it triggers native sendMessage
    await mod.sendMessageToWatch({ hello: 'watch' });
    // verify native function called
    const pkg = require('react-native-watch-connectivity');
    expect(pkg.sendMessage).toHaveBeenCalledWith({ hello: 'watch' });
  });

  test('subscribeToWatchMessages no-ops cleanly when native module missing', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
      const mod = require('./watch-connectivity');
      const unsubscribe = mod.subscribeToWatchMessages(() => {});
      expect(typeof unsubscribe).toBe('function');
      // should not throw when called
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
