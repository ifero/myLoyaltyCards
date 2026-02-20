/**
 * Jest Configuration
 * Story 2.2: Add Card Manually - Testing Setup
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|expo-asset|expo-constants|expo-file-system|expo-font|expo-linking|expo-sqlite|@expo|expo-modules-core|expo-haptics|burnt|zod|@hookform|react-hook-form|@react-native-picker)/)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@bwip-js/react-native$': '<rootDir>/__mocks__/@bwip-js/react-native.js'
  },
  testMatch: ['**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', 'babel.config.test.js', 'watch-ios/'],
  collectCoverageFrom: [
    'features/**/*.{ts,tsx}',
    'core/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { configFile: './babel.config.test.js' }]
  }
};
