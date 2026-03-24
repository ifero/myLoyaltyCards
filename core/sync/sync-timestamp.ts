import AsyncStorage from '@react-native-async-storage/async-storage';

const CLOUD_SYNC_LAST_SYNC_AT_KEY = 'cloudSyncLastSyncAt';

/**
 * Read the last successful sync timestamp from AsyncStorage.
 * Returns null if never synced (first run).
 */
export const getLastSyncAt = async (): Promise<string | null> => {
  const raw = await AsyncStorage.getItem(CLOUD_SYNC_LAST_SYNC_AT_KEY);
  return raw ?? null;
};

/**
 * Persist the last successful sync timestamp.
 * Should be called only after ALL sync operations succeed (atomicity).
 */
export const setLastSyncAt = async (timestamp: string): Promise<void> => {
  await AsyncStorage.setItem(CLOUD_SYNC_LAST_SYNC_AT_KEY, timestamp);
};

/**
 * Clear the last sync timestamp.
 * Called on logout so that the next sign-in triggers a full sync.
 */
export const clearLastSyncAt = async (): Promise<void> => {
  await AsyncStorage.removeItem(CLOUD_SYNC_LAST_SYNC_AT_KEY);
};

export const _CLOUD_SYNC_LAST_SYNC_AT_KEY = CLOUD_SYNC_LAST_SYNC_AT_KEY;
