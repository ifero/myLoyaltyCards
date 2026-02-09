/**
 * Jest Setup File
 * Story 2.2: Add Card Manually - Testing Setup
 */

// Built-in matchers are automatically available in @testing-library/react-native v12.4+

// Polyfill for TransformStream (required by expo)
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = class TransformStream {};
}

// Polyfill for setImmediate and clearImmediate (required by React Native StatusBar)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
if (typeof global.clearImmediate === 'undefined') {
  global.clearImmediate = (id) => clearTimeout(id);
}

// Mock crypto.randomUUID (not available in jsdom)
// Set on both global and globalThis for compatibility
const mockUUID = '123e4567-e89b-12d3-a456-426614174000';

// Create a proper crypto mock that works in all environments
const mockCrypto = {
  randomUUID: jest.fn(() => mockUUID),
  getRandomValues: jest.fn((arr) => arr)
};

// Override crypto on both global and globalThis
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true
});

Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true,
  configurable: true
});

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
  SQLiteDatabase: jest.fn()
}));

// Mock expo-sqlite/kv-store (used by features/settings)
const kvStoreData = {};
jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: {
    getItemSync: jest.fn((key) => kvStoreData[key] ?? null),
    setItemSync: jest.fn((key, value) => {
      kvStoreData[key] = value;
    }),
    removeItemSync: jest.fn((key) => {
      delete kvStoreData[key];
    }),
    clearSync: jest.fn(() => {
      Object.keys(kvStoreData).forEach((k) => delete kvStoreData[k]);
    })
  }
}));
// Expose kvStoreData for tests to inspect/reset
global.__kvStoreData = kvStoreData;

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error'
  }
}));

// Mock burnt (toast notifications)
jest.mock('burnt', () => ({
  toast: jest.fn()
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn()
  },
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    replace: jest.fn()
  }),
  useNavigation: () => ({
    addListener: jest.fn(() => jest.fn()),
    dispatch: jest.fn()
  }),
  useFocusEffect: jest.fn((callback) => callback())
}));

// Mock @react-native-picker/picker
jest.mock('@react-native-picker/picker', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const MockPickerItem = ({ label, value }) => {
    return mockReact.createElement(
      mockRN.View,
      { testID: `picker-item-${value}` },
      mockReact.createElement(mockRN.Text, null, label)
    );
  };
  MockPickerItem.displayName = 'Picker.Item';

  const MockPicker = ({ selectedValue, children, testID }) => {
    return mockReact.createElement(
      mockRN.View,
      { testID: testID },
      mockReact.createElement(mockRN.Text, null, selectedValue),
      children
    );
  };
  MockPicker.Item = MockPickerItem;
  MockPicker.displayName = 'Picker';

  return {
    Picker: MockPicker
  };
});

// Mock @shopify/flash-list
// Export state object to allow tests to capture props
global.mockFlashListState = { numColumns: undefined };
jest.mock('@shopify/flash-list', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  return {
    FlashList: (props) => {
      const { data, renderItem, ListEmptyComponent, testID, numColumns } = props;

      // Store numColumns in global state for test assertions
      global.mockFlashListState.numColumns = numColumns;

      if (data.length === 0 && ListEmptyComponent) {
        return mockReact.createElement(ListEmptyComponent);
      }

      return mockReact.createElement(
        mockRN.View,
        { testID },
        data.map((item, index) =>
          mockReact.createElement(mockRN.View, { key: item.id || index }, renderItem({ item }))
        )
      );
    }
  };
});

// Mock uuid (ESM module, needs to be mocked for Jest)
jest.mock('uuid', () => ({
  v4: jest.fn(() => '123e4567-e89b-12d3-a456-426614174000')
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  const AnimatedView = mockReact.forwardRef((props, ref) =>
    mockReact.createElement(mockRN.View, { ...props, ref })
  );
  AnimatedView.displayName = 'Animated.View';

  const Animated = {
    View: AnimatedView,
    Text: mockRN.Text,
    Image: mockRN.Image,
    ScrollView: mockRN.ScrollView,
    FlatList: mockRN.FlatList
  };

  return {
    __esModule: true,
    default: Animated,
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: () => ({}),
    withTiming: (value, _config, callback) => {
      if (callback) callback();
      return value;
    },
    withSpring: (value) => value,
    runOnJS: (fn) => fn
  };
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');

  return {
    GestureHandlerRootView: ({ children, style }) =>
      mockReact.createElement(mockRN.View, { style, testID: 'gesture-root' }, children),
    GestureDetector: ({ children }) =>
      mockReact.createElement(mockRN.View, { testID: 'gesture-detector' }, children),
    Gesture: {
      Pan: () => ({
        onUpdate: function () {
          return this;
        },
        onEnd: function () {
          return this;
        }
      })
    }
  };
});

// Mock NativeWind/CSS interop to prevent issues in tests
jest.mock('nativewind', () => ({
  styled: (component) => component
}));

// Mock react-native-css-interop to prevent displayName access issues
// This completely mocks the runtime to prevent wrap-jsx from processing components
jest.mock('react-native-css-interop', () => ({
  cssInterop: (component) => component,
  remapProps: (component) => component,
  // Mock the internal runtime functions
  __esModule: true
}));

// Mock the wrap-jsx runtime that's causing the displayName issue
jest.mock(
  'react-native-css-interop/src/runtime/wrap-jsx',
  () => ({
    wrapJSX: (element) => element,
    __esModule: true
  }),
  { virtual: true }
);

// Mock the third-party libs file that causes the displayName issue
jest.mock(
  'react-native-css-interop/src/runtime/third-party-libs/react-native-safe-area-context.native',
  () => ({
    maybeHijackSafeAreaProvider: (element) => element,
    __esModule: true
  }),
  { virtual: true }
);

// Mock expo-clipboard to avoid ESM parse issues in Jest
jest.mock('expo-clipboard', () => ({
  __esModule: true,
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue('')
}));

// Mock expo-brightness to avoid ESM parse issues in Jest (some native modules export ESM)
jest.mock('expo-brightness', () => ({
  __esModule: true,
  getBrightnessAsync: jest.fn().mockResolvedValue(1),
  setBrightnessAsync: jest.fn().mockResolvedValue(undefined)
}));

// Clear mock calls after each test to prevent leakage (do not restore spies defined at top-level)
afterEach(() => {
  jest.clearAllMocks();
});

// Silence console warnings in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('NativeWind') ||
      args[0].includes('Animated') ||
      args[0].includes('useNativeDriver'))
  ) {
    return;
  }
  originalWarn(...args);
};
