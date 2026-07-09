/**
 * Web mock for `expo-sqlite/kv-store` (Story 16.5).
 *
 * The real module is a native, SQLite-backed key/value store that cannot run in
 * the browser. Storybook's Vite build aliases `expo-sqlite/kv-store` to this
 * in-memory implementation (see `.storybook/main.ts`) so the REAL
 * `core/settings/settings-repository` — and therefore the real `ThemeProvider`,
 * `shared/theme/unistyles`, and `shared/i18n` stack — render on web without
 * touching native storage (AC1). Only the sync API is used by settings; async
 * variants mirror the real surface for completeness.
 */

const store = new Map<string, string>();

const Storage = {
  getItemSync: (key: string): string | null => store.get(key) ?? null,
  setItemSync: (key: string, value: string): void => {
    store.set(key, value);
  },
  removeItemSync: (key: string): void => {
    store.delete(key);
  },
  clearSync: (): void => {
    store.clear();
  },
  getItem: (key: string): Promise<string | null> => Promise.resolve(store.get(key) ?? null),
  setItem: (key: string, value: string): Promise<void> => {
    store.set(key, value);
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    store.delete(key);
    return Promise.resolve();
  },
  clear: (): Promise<void> => {
    store.clear();
    return Promise.resolve();
  }
};

export default Storage;
