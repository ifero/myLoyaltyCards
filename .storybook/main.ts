import { resolve } from 'node:path';

import type { StorybookConfig } from '@storybook/react-native-web-vite';

const projectRoot = process.cwd();

const config: StorybookConfig = {
  stories: ['../shared/components/ui/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {
      // RN-ecosystem packages that ship untranspiled ESM/Flow and are not web
      // by default — force them through the web transform so the build resolves.
      modulesToTranspile: [
        'react-native-unistyles',
        'react-native-nitro-modules',
        'react-native-edge-to-edge',
        'react-native-safe-area-context',
        '@expo/vector-icons',
        'expo-localization',
        'expo-modules-core',
        'expo-font'
      ],
      pluginReactOptions: {
        jsxRuntime: 'automatic',
        babel: {
          // Reproduce the app's Unistyles transform (see babel.config.js) so
          // `StyleSheet.create((theme) => …)` resolves themed styles on web.
          // `autoProcessImports` covers files outside `root` (our primitives
          // live in shared/, not app/).
          plugins: [
            [
              'react-native-unistyles/plugin',
              { root: 'app', autoProcessImports: ['react-native-unistyles'] }
            ]
          ]
        }
      }
    }
  },
  viteFinal: (viteConfig) => {
    // Isolate Storybook from native storage: the real settings-repository keeps
    // working, but its `expo-sqlite/kv-store` leaf resolves to an in-memory mock
    // (AC1). Also map the TS `@/*` path alias for Vite.
    const extraAlias = [
      {
        find: 'expo-sqlite/kv-store',
        replacement: resolve(projectRoot, '.storybook/mocks/kv-store.ts')
      },
      { find: /^@\/(.*)$/, replacement: `${projectRoot}/$1` }
    ];

    viteConfig.resolve = viteConfig.resolve ?? {};
    const existing = viteConfig.resolve.alias;
    if (Array.isArray(existing)) {
      viteConfig.resolve.alias = [...extraAlias, ...existing];
    } else if (existing && typeof existing === 'object') {
      viteConfig.resolve.alias = [
        ...extraAlias,
        ...Object.entries(existing).map(([find, replacement]) => ({
          find,
          replacement: replacement as string
        }))
      ];
    } else {
      viteConfig.resolve.alias = extraAlias;
    }

    // `expo-modules-core` ships raw TS; its `ts-declarations/*` files are
    // type-only (`export declare class …`) but `global.ts` imports them as
    // VALUES. `build-storybook` tree-shakes those unused type imports away, but
    // the `storybook dev` Rolldown linker does not and crashes on the first
    // story request. `global.ts` has no runtime role (index.ts only
    // `export type *`s it), so stub it — and its type-only imports — to empty.
    const stubExpoTypeDeclarations = {
      name: 'sb-stub-expo-modules-core-type-declarations',
      enforce: 'pre' as const,
      resolveId: (source: string, importer?: string) => {
        const isGlobal = source.endsWith('ts-declarations/global');
        const isDeclFromGlobal =
          !!importer &&
          importer.includes('expo-modules-core') &&
          importer.includes('ts-declarations') &&
          /^\.\/(EventEmitter|NativeModule|SharedObject|SharedRef)$/.test(source);
        return isGlobal || isDeclFromGlobal ? '\0sb-empty-module' : null;
      },
      load: (id: string) => (id === '\0sb-empty-module' ? 'export {};' : null)
    };
    viteConfig.plugins = [stubExpoTypeDeclarations, ...(viteConfig.plugins ?? [])];

    // Keep `expo-modules-core` out of dep pre-bundling so it is served through
    // the transform pipeline where the stub above applies.
    viteConfig.optimizeDeps = viteConfig.optimizeDeps ?? {};
    viteConfig.optimizeDeps.exclude = [
      ...(viteConfig.optimizeDeps.exclude ?? []),
      'expo-modules-core'
    ];

    return viteConfig;
  }
};

export default config;
