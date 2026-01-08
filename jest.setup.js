/**
 * Jest Setup File
 * Story 2.2: Add Card Manually - Testing Setup
 */

// Polyfill for TransformStream (needed by expo in jsdom environment)
if (typeof global.TransformStream === 'undefined') {
  // @ts-ignore
  global.TransformStream = class TransformStream {};
}

// Built-in matchers are automatically available in @testing-library/react-native v12.4+

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

  const MockPickerItem = ({ label, value }: any) => {
    return mockReact.createElement(
      'View',
      { 'data-testid': `picker-item-${value}` },
      mockReact.createElement('Text', {}, label)
    );
  };
  MockPickerItem.displayName = 'Picker.Item';

  const MockPicker = ({ selectedValue, children, testID }: any) => {
    return mockReact.createElement(
      'View',
      { 'data-testid': testID },
      mockReact.createElement('Text', {}, selectedValue),
      children
    );
  };
  MockPicker.Item = MockPickerItem;
  MockPicker.displayName = 'Picker';

  return {
    Picker: MockPicker
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
