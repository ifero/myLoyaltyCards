/**
 * Jest Setup File
 * Story 2.2: Add Card Manually - Testing Setup
 */

// Built-in matchers are automatically available in @testing-library/react-native v12.4+

// Polyfill for TransformStream (required by expo)
if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = class TransformStream {};
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

// Mock NativeWind/CSS interop to prevent issues in tests
jest.mock('nativewind', () => ({
  styled: (component) => component
}));

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
