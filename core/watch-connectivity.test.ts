/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires */


describe('watch-connectivity wrapper (scaffold)', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('isWatchConnectivityAvailable() returns false when native module missing', () => {
    // ensure require will throw
    jest.isolateModules(() => {
      const mod = require('./watch-connectivity');
      expect(mod.isWatchConnectivityAvailable()).toBe(false);
    });
  });

  test('sendMessageToWatch uses sendMessage when available', async () => {
    const mockSend = jest.fn().mockResolvedValue(true);
    jest.doMock('react-native-watch-connectivity', () => ({ sendMessage: mockSend }), { virtual: true });

    // require the module so Jest can use the mocked native implementation
    // (avoids dynamic import issues in the test environment)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./watch-connectivity');
    const ok = await mod.sendMessageToWatch({ hello: 'watch' });
    expect(ok).toBe(true);
    // verify native function called
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('react-native-watch-connectivity');
    expect(pkg.sendMessage).toHaveBeenCalledWith({ hello: 'watch' });
  });

  test('subscribeToWatchMessages no-ops cleanly when native module missing', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('./watch-connectivity');
    const unsubscribe = mod.subscribeToWatchMessages(() => {});
    expect(typeof unsubscribe).toBe('function');
    // should not throw when called
    expect(() => unsubscribe()).not.toThrow();
  });
});
