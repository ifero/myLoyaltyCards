import { expect, test } from '@jest/globals';

import { resetDatabaseSingleton, getDatabase } from './database';

test('resetDatabaseSingleton clears the singleton so getDatabase throws', () => {
  // Ensure we start with a clean state
  resetDatabaseSingleton();

  expect(() => getDatabase()).toThrow(/Database not initialized/);
});
