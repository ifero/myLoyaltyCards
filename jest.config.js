/**
 * Jest Configuration
 * Story 2.2: Add Card Manually - Testing Setup
 */

module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-unistyles|react-native-nitro-modules|react-native-edge-to-edge|expo|expo-asset|expo-constants|expo-file-system|expo-font|expo-linking|expo-sqlite|@expo|expo-modules-core|expo-haptics|burnt|zod|@hookform|react-hook-form|@react-native-picker)/)'
  ],
  // ORDER IS SIGNIFICANT. Jest applies only the FIRST pattern that matches a
  // request, so `\.svg$` MUST precede the `^@/` alias. With the alias first, an
  // `@/assets/…foo.svg` import never reached `svgMock.js`: it resolved to the real
  // file and the react-native preset's asset transformer handed back a plain
  // `{ testUri }` OBJECT. That is correct for a `.png` consumed as an `<Image>`
  // source, but wrong for an SVG, which `react-native-svg-transformer` turns into
  // a React COMPONENT at runtime — so tests silently disagreed with the app. It
  // also made `BrandLogo`'s `typeof source === 'function'` discriminator
  // impossible to satisfy from real data, hiding its SVG branch from every test.
  // `.png` still lands on the alias and still yields an asset object, unchanged.
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
    '^@/(.*)$': '<rootDir>/$1',
    '^@bwip-js/react-native$': '<rootDir>/__mocks__/@bwip-js/react-native.js'
  },
  testMatch: ['**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.claude/', 'babel.config.test.js', 'targets/watch/'],
  // Nested Claude Code worktrees (.claude/worktrees/*) are full repo copies; their
  // duplicate package.json/modules otherwise crash Jest with Haste name collisions.
  modulePathIgnorePatterns: ['/.claude/'],
  collectCoverageFrom: [
    'features/**/*.{ts,tsx}',
    'core/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/index.ts',
    // shared/-scoped excludes (Story 16.13) — kept off the global glob so
    // core/features accounting is unchanged:
    '!shared/types/**', // type-only modules; erased at compile (as with !**/*.d.ts)
    '!shared/theme/spacing.ts' // pure re-export of tokens.generated; no logic/branches of its own to cover
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
