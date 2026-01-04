import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import boundariesPlugin from 'eslint-plugin-boundaries';

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
            // shared can import from core and catalogue
            {
              from: 'shared',
              allow: ['core', 'catalogue'],
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
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'android/**',
      'ios/**',
      'watch-ios/**',
      'watch-android/**',
      '*.config.js',
      '*.config.mjs',
      'babel.config.js',
    ],
  },
];
