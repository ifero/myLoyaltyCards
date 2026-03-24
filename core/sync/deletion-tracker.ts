import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_DELETIONS_KEY = 'syncPendingDeletions';

/**
 * Add a card ID to the pending-deletion queue.
 * Persisted in AsyncStorage so it survives app restarts.
 */
export const addPendingDeletion = async (cardId: string): Promise<void> => {
  const existing = await getPendingDeletions();
  if (!existing.includes(cardId)) {
    existing.push(cardId);
    await AsyncStorage.setItem(PENDING_DELETIONS_KEY, JSON.stringify(existing));
  }
};

/**
 * Retrieve all card IDs queued for cloud deletion.
 */
export const getPendingDeletions = async (): Promise<string[]> => {
  const raw = await AsyncStorage.getItem(PENDING_DELETIONS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as string[];
    }
    return [];
  } catch {
    return [];
  }
};

/**
 * Clear the pending-deletion queue after a successful sync.
 */
export const clearPendingDeletions = async (): Promise<void> => {
  await AsyncStorage.removeItem(PENDING_DELETIONS_KEY);
};

export const _PENDING_DELETIONS_KEY = PENDING_DELETIONS_KEY;
