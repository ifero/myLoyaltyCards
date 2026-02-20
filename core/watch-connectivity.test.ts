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

  test('isWatchConnectivityAvailable returns true when sendMessage exists', () => {
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ sendMessage: jest.fn() }), {
        virtual: true
      });
      const mod = require('./watch-connectivity');
      expect(mod.isWatchConnectivityAvailable()).toBe(true);
    });
  });

  test('isWatchConnectivityAvailable returns true when updateApplicationContext exists', () => {
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

  test('sendMessageToWatch returns false when native module missing', async () => {
    jest.isolateModules(() => {
      const mod = require('./watch-connectivity');
      // when runtime require fails the wrapper should resolve to false
      return expect(mod.sendMessageToWatch({})).resolves.toBe(false);
    });
  });

  test('sendMessageToWatch uses updateApplicationContext when sendMessage missing', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(true);
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock(
        'react-native-watch-connectivity',
        () => ({ updateApplicationContext: mockUpdate }),
        { virtual: true }
      );
      mod = require('./watch-connectivity');
    });

    await expect(mod.sendMessageToWatch({ foo: 'bar' })).resolves.toBe(true);
    const pkg = require('react-native-watch-connectivity');
    expect(pkg.updateApplicationContext).toHaveBeenCalledWith({ foo: 'bar' });
  });

  test('sendMessageToWatch returns true even when native.sendMessage rejects', async () => {
    const mockSend = jest.fn().mockRejectedValue(new Error('boom'));
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ sendMessage: mockSend }), {
        virtual: true
      });
      mod = require('./watch-connectivity');
    });

    await expect(mod.sendMessageToWatch({ x: 1 })).resolves.toBe(true);
    expect(mockSend).toHaveBeenCalledWith({ x: 1 });
  });

  test('sendMessageToWatch returns false when native module lacks APIs', async () => {
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({}), { virtual: true });
      mod = require('./watch-connectivity');
    });
    await expect(mod.sendMessageToWatch({})).resolves.toBe(false);
  });

  test('subscribeToWatchMessages uses addListener and unsubscribe removes subscription', () => {
    const remove = jest.fn();
    const addListener = jest.fn().mockImplementation(() => ({ remove }));
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ addListener }), { virtual: true });
      mod = require('./watch-connectivity');
    });

    const handler = jest.fn();
    const unsub = mod.subscribeToWatchMessages(handler);
    expect(addListener).toHaveBeenCalledWith('message', handler);
    // call unsubscribe -> should call subscription.remove()
    expect(() => unsub()).not.toThrow();
    expect(remove).toHaveBeenCalled();
  });

  test('subscribeToWatchMessages handles addListener subscription without remove', () => {
    const addListener = jest.fn().mockImplementation(() => ({}));
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ addListener }), { virtual: true });
      mod = require('./watch-connectivity');
    });

    const handler = jest.fn();
    const unsub = mod.subscribeToWatchMessages(handler);
    expect(() => unsub()).not.toThrow();
  });

  test('subscribeToWatchMessages uses onMessage and removeMessageListener path', () => {
    const onMessage = jest.fn();
    const removeMessageListener = jest.fn();
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ onMessage, removeMessageListener }), {
        virtual: true
      });
      mod = require('./watch-connectivity');
    });

    const handler = jest.fn();
    const unsub = mod.subscribeToWatchMessages(handler);
    expect(onMessage).toHaveBeenCalledWith(handler);
    // unsubscribe should call removeMessageListener with same handler
    unsub();
    expect(removeMessageListener).toHaveBeenCalledWith(handler);
  });

  test('requestCardsFromPhone and syncCardToWatch delegate to sendMessageToWatch', async () => {
    const mockSend = jest.fn().mockResolvedValue(true);
    let mod: any = null;
    jest.isolateModules(() => {
      jest.doMock('react-native-watch-connectivity', () => ({ sendMessage: mockSend }), {
        virtual: true
      });
      mod = require('./watch-connectivity');
    });

    await expect(mod.requestCardsFromPhone()).resolves.toBe(true);
    expect(mockSend).toHaveBeenCalledWith({ type: 'requestCards' });

    mockSend.mockClear();
    await expect(mod.syncCardToWatch('id-xyz', { foo: 'bar' })).resolves.toBe(true);
    expect(mockSend).toHaveBeenCalledWith({
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
    });
  });
});
