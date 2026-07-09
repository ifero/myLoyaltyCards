import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import boundariesPlugin from 'eslint-plugin-boundaries';
import i18nextPlugin from 'eslint-plugin-i18next';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      boundaries: boundariesPlugin,
      i18next: i18nextPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'app/*' },
        { type: 'feature', pattern: 'features/*', capture: ['featureName'] },
        { type: 'shared', pattern: 'shared/*' },
        { type: 'core', pattern: 'core/*' },
        { type: 'catalogue', pattern: 'catalogue/*' },
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // TypeScript handles undefined variables better than ESLint
      'no-undef': 'off',
      // Story 16.2: ban direct console use — the `logger` wrapper
      // (core/utils/logger.ts) is the single sanctioned logging sink so that
      // production errors are routed to Sentry and dev noise is gated.
      'no-console': 'error',
      // Feature boundary enforcement
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app can import from any module
            {
              from: 'app',
              allow: ['feature', 'shared', 'core', 'catalogue'],
            },
            // features can import from shared, core, catalogue, and same feature
            {
              from: 'feature',
              allow: [
                'shared',
                'core',
                'catalogue',
                ['feature', { featureName: '${from.featureName}' }],
              ],
            },
            // add-card feature depends on cards feature (shared hooks and utils)
            {
              from: [['feature', { featureName: 'add-card' }]],
              allow: [
                ['feature', { featureName: 'cards' }],
              ],
            },
            // shared can import from core, catalogue, and other shared modules
            {
              from: 'shared',
              allow: ['core', 'catalogue', 'shared'],
            },
            // core can import from catalogue and other core modules
            {
              from: 'core',
              allow: ['catalogue', 'core'],
            },
            // catalogue is standalone
            {
              from: 'catalogue',
              allow: [],
            },
          ],
        },
      ],
      // Import organization
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
          ],
          pathGroups: [
            {
              pattern: '@/core/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/shared/**',
              group: 'internal',
              position: 'before',
            },
            {
              pattern: '@/features/**',
              group: 'internal',
              position: 'after',
            },
            {
              pattern: '@/catalogue/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
    },
  },
  {
    files: ['**/*.tsx'],
    ignores: ['**/*.test.tsx', '**/*.spec.tsx', '**/__tests__/**'],
    rules: {
      // Prevent hardcoded user-facing copy in JSX markup and text-like props.
      'i18next/no-literal-string': [
        'warn',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            include: [
              'accessibilityLabel',
              'accessibilityHint',
              'placeholder',
              'title',
              'label',
              'subtitle',
              'heading',
              'message',
              'description',
              'actionText',
              'prefixText',
              'suffixText',
            ],
          },
        },
      ],
    },
  },
  {
    // The logging wrapper is the one place direct console use is allowed — it
    // IS the sanctioned sink the no-console rule funnels everything else into.
    files: ['core/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Tests legitimately spy on / assert against console; don't ban it there.
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', '**/__tests__/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Node scripts (build/CI tooling): the Node runtime provides process, console,
    // etc. Mirror the TS rule choice and let the runtime/types handle undefined refs.
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-undef': 'off',
      // Build/CI scripts log to stdout/stderr by design; the wrapper is for app code.
      'no-console': 'off',
    },
  },
  {
    // Story 16.5: Storybook stories + `.storybook` config. Stories intentionally
    // carry literal display copy (they are previews, not shipped UI) and neither
    // stories nor the Storybook config participate in the app's layer graph — so
    // exempt them from the i18n literal rule and the boundaries rule to keep
    // `yarn lint` (a merge gate) green. AC4.
    files: ['**/*.stories.{ts,tsx}', '.storybook/**/*.{ts,tsx}'],
    rules: {
      'i18next/no-literal-string': 'off',
      'boundaries/element-types': 'off',
    },
  },
  {
    ignores: [
      'node_modules/**',
      // Nested Claude Code worktrees (gitignored) are full repo copies; linting
      // them errors because their files aren't part of ./tsconfig.json's project.
      '.claude/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'storybook-static/**',
      'android/**',
      'ios/**',
      'watch-android/**',
      'plugins/withMlkitAppleSiliconSimulator.js',
      '*.config.js',
      'targets/**/expo-target.config.js',
      '*.config.mjs',
      'babel.config.js',
      'babel.config.test.js',
      'jest.setup.js',
      'supabase/functions/**',
    ],
  },
];
