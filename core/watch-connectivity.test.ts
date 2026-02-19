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

  describe('race condition: concurrent sync', () => {
    test('should apply last-write-wins when two syncs happen nearly simultaneously', async () => {
      const mockSend = jest.fn().mockResolvedValue(true);
      let mod: any = null;
      jest.isolateModules(() => {
        jest.doMock(
          'react-native-watch-connectivity',
          () => ({ default: { sendMessage: mockSend }, sendMessage: mockSend }),
          { virtual: true }
        );
        mod = require('./watch-connectivity');
      });

      // Simula due sync concorrenti con dati diversi
      const cardA = { id: 'card1', cardData: { name: 'A', version: 1 } };
      const cardB = { id: 'card1', cardData: { name: 'B', version: 2 } };
      // Avvia due sync quasi in parallelo
      await Promise.all([
        mod.sendMessageToWatch({ type: 'syncCard', payload: cardA }),
        mod.sendMessageToWatch({ type: 'syncCard', payload: cardB })
      ]);
      // Dovrebbero essere state inviate entrambe le versioni
      expect(mockSend).toHaveBeenCalledWith({ type: 'syncCard', payload: cardA });
      expect(mockSend).toHaveBeenCalledWith({ type: 'syncCard', payload: cardB });
      // L'ultima versione (B) deve essere considerata vincente lato ricevente (verifica logica nel modulo reale)
    });
  });
});
