import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import boundariesPlugin from 'eslint-plugin-boundaries';
import i18nextPlugin from 'eslint-plugin-i18next';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

// Story 21.6: `local/no-literal-font`, enabled for app code further down. It reads the value
// written into a font property and reports every literal that value can come out as. A rule
// rather than `no-restricted-syntax` selectors because a literal can hide behind any number of
// nodes that pass a value on unchanged, and a selector can only spell out a fixed path to it.
// Whatever computes a value — a call other than `Platform.select`, a getter, arithmetic on a
// name — is not read into, and a name is not followed to its value. Nor is a binding's default
// a style: `({ fontSize = 18 })` may size a monogram, and `monogram(size)` takes a number by
// design.
const FONT_PROPERTIES = new Set(['fontSize', 'fontWeight', 'fontFamily']);

// `Platform.select`'s own keys (`PlatformOSType` plus `default`). The call is known by them
// rather than by the name `Platform`, which an import can rename.
const PLATFORM_KEYS = new Set(['ios', 'android', 'macos', 'windows', 'web', 'native', 'default']);

const staticKeyName = ({ key, computed }) => {
  if (key.type === 'Literal') return String(key.value);
  return !computed && key.type === 'Identifier' ? key.name : undefined;
};

// An object literal's entries, with those it spreads in from other literals.
const objectEntries = (object) =>
  object.properties.flatMap((entry) =>
    entry.type === 'Property'
      ? [entry]
      : possibleValues(entry.argument).flatMap((value) =>
          value.type === 'ObjectExpression' ? objectEntries(value) : []
        )
  );

// The entries of a `select` call keyed by platform, or undefined for any other call.
const platformSelectEntries = ({ callee, arguments: [platforms] }) => {
  const isSelect =
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    callee.property.name === 'select';
  if (!isSelect || platforms?.type !== 'ObjectExpression') return undefined;
  const entries = objectEntries(platforms);
  return entries.some((entry) => PLATFORM_KEYS.has(staticKeyName(entry))) ? entries : undefined;
};

// Every expression a value can come out as, seen through the nodes that hand one on unchanged:
// both branches of a conditional, both sides of `??`, `||` and `&&`, TypeScript's type-only
// wrappers (`as const`, `satisfies`, `!`, `<Type>`) and each platform's entry in a
// `Platform.select`.
const possibleValues = (node) => {
  switch (node.type) {
    case 'ConditionalExpression':
      return [...possibleValues(node.consequent), ...possibleValues(node.alternate)];
    case 'LogicalExpression':
      return [...possibleValues(node.left), ...possibleValues(node.right)];
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
    case 'TSNonNullExpression':
    case 'TSTypeAssertion':
      return possibleValues(node.expression);
    case 'CallExpression': {
      const entries = platformSelectEntries(node);
      return entries ? entries.flatMap((entry) => possibleValues(entry.value)) : [node];
    }
    default:
      return [node];
  }
};

// A value written into the source: a string or a number, a template with no substitutions, or
// arithmetic on nothing else.
const isLiteralValue = (node) =>
  (node.type === 'Literal' && ['string', 'number'].includes(typeof node.value)) ||
  (node.type === 'TemplateLiteral' && node.expressions.length === 0) ||
  (node.type === 'BinaryExpression' && isLiteralValue(node.left) && isLiteralValue(node.right));

const localPlugin = {
  rules: {
    'no-literal-font': {
      meta: {
        type: 'problem',
        docs: { description: 'Require font size, weight and family to come from the type scale' },
        schema: [],
        messages: {
          literal:
            'Take font size, weight and family from a TYPOGRAPHY token (shared/theme/typography.ts), or monogram(size) for container-sized initials. A literal renders in the system face or at an unbundled weight.'
        }
      },
      create: (context) => {
        const check = (node) => {
          if (!node.value || !FONT_PROPERTIES.has(staticKeyName(node))) return;
          for (const value of possibleValues(node.value)) {
            if (isLiteralValue(value)) context.report({ node: value, messageId: 'literal' });
          }
        };
        // A class field is a property with a value too (`class Theme { fontSize = 16 }`).
        return { Property: check, PropertyDefinition: check };
      }
    }
  }
};

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
      boundaries: boundariesPlugin,
      i18next: i18nextPlugin,
      'react-hooks': reactHooksPlugin,
      // Registered for every TypeScript file, enabled only where the block below says, so an
      // `eslint-disable` naming one of its rules resolves anywhere.
      local: localPlugin
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: './tsconfig.json'
        }
      },
      'boundaries/elements': [
        { type: 'app', pattern: 'app/*' },
        { type: 'feature', pattern: 'features/*', capture: ['featureName'] },
        { type: 'shared', pattern: 'shared/*' },
        { type: 'core', pattern: 'core/*' },
        { type: 'catalogue', pattern: 'catalogue/*' }
      ],
      'boundaries/ignore': ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // TypeScript handles undefined variables better than ESLint
      'no-undef': 'off',
      // Story 16.2: ban direct console use — the `logger` wrapper
      // (core/utils/logger.ts) is the single sanctioned logging sink so that
      // production errors are routed to Sentry and dev noise is gated.
      'no-console': 'error',
      // React hook correctness. Until now NEITHER of these ran, so `yarn lint`
      // and CI gave zero assurance about the ~178 dependency-array hook call
      // sites across 66 files.
      //
      // Motivating incident (Story 16.22, card-grid tile overlap): the fix
      // hinged on `renderItem`'s useCallback deps in
      // features/cards/components/CardList.tsx including the derived tile size.
      // A narrowed dep array silently reintroduces the overlap for the whole
      // lifetime of the mounted screen — `useFocusEffect` keeps that screen
      // alive rather than remounting it, so a stale closure never gets flushed.
      // It was caught by manual review plus a hand-written regression test;
      // `exhaustive-deps` flags it mechanically.
      //
      // We register only these two rules rather than spreading the plugin's
      // `recommended` config: v7 bundles ~30 React Compiler lints
      // (set-state-in-effect, purity, immutability, …) that are a separate,
      // much larger migration.
      'react-hooks/rules-of-hooks': 'error',
      // 'error', not 'warn': ESLint exits 0 when only warnings are present, so
      // CI's `lint` step passes and a narrowed dep array merges with nothing but
      // an unread line in the log. The backlog this rule shipped with (three
      // sites) was cleared in Story 16.24, so the rule now blocks rather than
      // advises. Two of those three were NOT fixed the way the rule's autofix
      // suggests — obeying it caused a camera-permission loop in BarcodeScanner
      // and re-ran database initialisation on every language change in
      // app/_layout.tsx. Read the finding before trusting `eslint --fix` here.
      'react-hooks/exhaustive-deps': 'error',
      // Feature boundary enforcement
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            // app can import from any module
            {
              from: 'app',
              allow: ['feature', 'shared', 'core', 'catalogue']
            },
            // features can import from shared, core, catalogue, and same feature
            {
              from: 'feature',
              allow: [
                'shared',
                'core',
                'catalogue',
                ['feature', { featureName: '${from.featureName}' }]
              ]
            },
            // add-card feature depends on cards feature (shared hooks and utils)
            {
              from: [['feature', { featureName: 'add-card' }]],
              allow: [['feature', { featureName: 'cards' }]]
            },
            // Story 16.9 (AD-2): cards feature depends on auth feature. The
            // relocated HomeScreen composes auth's guest-mode + migration
            // banners (GuestModeBanner, MigrationBanner, useGuestMigration).
            // app/ used to own this cross-feature composition; moving the screen
            // into features/cards makes the dependency explicit and bounded,
            // mirroring the add-card → cards exception above.
            {
              from: [['feature', { featureName: 'cards' }]],
              allow: [['feature', { featureName: 'auth' }]]
            },
            // shared can import from core, catalogue, and other shared modules
            {
              from: 'shared',
              allow: ['core', 'catalogue', 'shared']
            },
            // core can import from catalogue and other core modules
            {
              from: 'core',
              allow: ['catalogue', 'core']
            },
            // catalogue is standalone
            {
              from: 'catalogue',
              allow: []
            }
          ]
        }
      ],
      // Import organization
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: '@/core/**',
              group: 'internal',
              position: 'before'
            },
            {
              pattern: '@/shared/**',
              group: 'internal',
              position: 'before'
            },
            {
              pattern: '@/features/**',
              group: 'internal',
              position: 'after'
            },
            {
              pattern: '@/catalogue/**',
              group: 'internal',
              position: 'after'
            }
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true
          }
        }
      ]
    }
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
              'suffixText'
            ]
          }
        }
      ]
    }
  },
  {
    // Story 21.6: every text style takes its face, size and weight from the type scale in
    // shared/theme/typography.ts. React Native has no font inheritance, so a style that
    // spells its own `fontSize` or `fontFamily` renders in the SYSTEM face (SF Pro / Roboto)
    // beside the brand faces — and looks almost right, which is why nothing else catches it.
    // `fontWeight` is here for a sharper reason: only the weights the scale uses are bundled,
    // and any other weight is synthesised or snapped to a neighbour, differently per platform.
    //
    // A literal is the failure mode: typed into a style, however it is wrapped — a
    // conditional's branch, a `??` fallback, `as const`, a `Platform.select` entry, literal
    // arithmetic. Computed sizes stay legal (`fallback.fontSize`, `size * 0.4`): they derive
    // from geometry, not from a second scale. A name is not followed to its value; that is a
    // decision someone made in the open, where review sees it.
    // test/typography-lint-guard.test.ts holds the rule and this wiring to their cases.
    files: ['app/**/*.{ts,tsx}', 'features/**/*.{ts,tsx}', 'shared/**/*.{ts,tsx}'],
    ignores: [
      'shared/theme/typography.ts',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**',
      '**/*.stories.{ts,tsx}'
    ],
    rules: {
      'local/no-literal-font': 'error'
    }
  },
  {
    // Story 16.9 (AD-3): route files must only re-export from features — no
    // hooks/state/business logic. This is the architecture.md-documented rule
    // that was specified but never implemented, letting fat screens accumulate
    // in app/. `_layout.tsx` files legitimately hold routing/provider logic and
    // are exempt; tests are not route files.
    //
    // NOTE (verified): architecture.md's snippet writes
    // `files: ['app/**/*.tsx', '!app/**/_layout.tsx']`, but in ESLint flat config
    // a leading-`!` entry inside `files` is NOT a subtraction from the positive
    // pattern — it is an independent, near-universal matcher OR'd with it. Under
    // the real (multi-block) config this makes the rule match almost the entire
    // repo (`--print-config` confirms it applies even to
    // `features/auth/useGuestMigration.ts`) AND still fails to exempt
    // `app/_layout.tsx`. Block-level `ignores` gives the intended AND-semantics:
    // app route files, minus `_layout.tsx` and tests. (architecture.md:~1300
    // should be corrected to match.)
    files: ['app/**/*.tsx'],
    ignores: ['app/**/_layout.tsx', '**/*.test.tsx', '**/*.spec.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['useState', 'useEffect', 'useCallback', 'useMemo'],
              message: 'Route files should only re-export from features. No hooks allowed.'
            }
          ]
        }
      ]
    }
  },
  {
    // The logging wrapper is the one place direct console use is allowed — it
    // IS the sanctioned sink the no-console rule funnels everything else into.
    files: ['core/utils/logger.ts'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    // Tests legitimately spy on / assert against console; don't ban it there.
    files: ['**/*.test.{ts,tsx,js,jsx}', '**/*.spec.{ts,tsx,js,jsx}', '**/__tests__/**'],
    rules: {
      'no-console': 'off'
    }
  },
  {
    // Node scripts (build/CI tooling): the Node runtime provides process, console,
    // etc. Mirror the TS rule choice and let the runtime/types handle undefined refs.
    files: ['scripts/**/*.{mjs,js}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'off',
      // Build/CI scripts log to stdout/stderr by design; the wrapper is for app code.
      'no-console': 'off'
    }
  },
  {
    // Expo config plugins (Story 21.3). Same situation as `scripts/` above, with one
    // difference that forces the split rather than widening that block's glob: these run
    // inside `expo prebuild`, which loads them with `require`, so they are CommonJS and
    // `sourceType: 'module'` would be wrong for them.
    files: ['plugins/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs'
    },
    rules: {
      'no-undef': 'off',
      'no-console': 'off'
    }
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
      'boundaries/element-types': 'off'
    }
  },
  {
    ignores: [
      'node_modules/**',
      // Nested Claude Code worktrees (gitignored) are full repo copies; linting
      // them errors because their files aren't part of ./tsconfig.json's project.
      '.claude/**',
      // BMAD installer output. `.claude/**` above already covers the Claude Code copy of the
      // skills; `.agents/skills/bmad-*` is the same tree again (Cursor, Copilot), and `_bmad/` is
      // its runtime. Generated third-party code, prettier-ignored for the same reason. TEA 1.27
      // ships the first lintable file in it, `resources/hooks/tea-enforce.cjs`, which uses Node
      // globals this config never declares. The project's own `.agents/skills/*` stay linted.
      '.agents/skills/bmad-*/**',
      '_bmad/**',
      '.expo/**',
      'dist/**',
      'web-build/**',
      'storybook-static/**',
      'android/**',
      'ios/**',
      'watch-android/**',
      // Local Expo modules are tracked source and their `.ts` IS linted, but their Android
      // `build/` holds generated Gradle output (e.g. a test report's `report.js` that references
      // `window`) — the analogue of ignoring `android/**` and `watch-android/**/build`.
      'modules/*/android/build/**',
      'plugins/withMlkitAppleSiliconSimulator.js',
      '*.config.js',
      'targets/**/expo-target.config.js',
      '*.config.mjs',
      'babel.config.js',
      'babel.config.test.js',
      'jest.setup.js',
      'supabase/functions/**'
    ]
  }
];
